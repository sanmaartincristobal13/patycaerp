// Fichas técnicas y órdenes de producción.
const { Router } = require('express');
const { query, transaccion } = require('../db');
const { requiereModulo } = require('../lib/auth');
const { noEncontrado, solicitudInvalida, HttpError } = require('../lib/errores');
const { moverStockMaterial, moverStockPrenda, registrarActividad } = require('../lib/registro');
const { reservarEnEncargo } = require('./ventas');
const v = require('../lib/validar');

const router = Router();

// ======================================================
// FICHAS TÉCNICAS
// ======================================================

const SELECT_FICHA = `
    SELECT f.*, p.nombre AS producto, u.nombre AS actualizada_por_nombre,
           coalesce((
               SELECT json_agg(json_build_object(
                   'material_id', fm.material_id, 'material_codigo', m.codigo,
                   'material', m.detalle, 'cantidad', fm.cantidad, 'unidad', um.codigo,
                   'costo', round(fm.cantidad * m.ultimo_precio)
               ) ORDER BY m.codigo)
               FROM ficha_materiales fm
               JOIN materiales m ON m.id = fm.material_id
               JOIN unidades_medida um ON um.id = m.unidad_id
               WHERE fm.ficha_id = f.id
           ), '[]') AS materiales
    FROM fichas_tecnicas f
    JOIN productos p ON p.id = f.producto_id
    LEFT JOIN usuarios u ON u.id = f.actualizada_por`;

router.get('/fichas', async (req, res) => {
    const params = [];
    let filtro = '';
    if (req.query.producto_id) {
        params.push(v.id(req.query.producto_id, 'producto_id'));
        filtro = 'WHERE f.producto_id = $1';
    }
    const { rows } = await query(`${SELECT_FICHA} ${filtro} ORDER BY p.nombre, f.talla`, params);
    res.json(rows);
});

router.get('/fichas/:productoId/:talla', async (req, res) => {
    const { rows } = await query(
        `${SELECT_FICHA} WHERE f.producto_id = $1 AND f.talla = $2`,
        [v.id(req.params.productoId, 'productoId'), req.params.talla]
    );
    if (!rows[0]) throw noEncontrado('Ficha técnica');
    res.json(rows[0]);
});

// PATCH /api/produccion/fichas/:productoId/:talla/peso  { peso_unitario_g, peso_estimado }
// Solo el peso (crea la ficha si no existe y no toca sus materiales).
router.patch('/fichas/:productoId/:talla/peso', requiereModulo('fichas'), async (req, res) => {
    const productoId = v.id(req.params.productoId, 'productoId');
    const talla = req.params.talla;
    const peso = v.numero(req.body.peso_unitario_g, 'peso_unitario_g', { requerido: false, min: 1 });
    await query(
        `INSERT INTO fichas_tecnicas (producto_id, talla, peso_unitario_g, peso_estimado, actualizada_por)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (producto_id, talla) DO UPDATE SET
             peso_unitario_g = EXCLUDED.peso_unitario_g, peso_estimado = EXCLUDED.peso_estimado,
             actualizada_por = EXCLUDED.actualizada_por, actualizada_en = now()`,
        [productoId, talla, peso, req.body.peso_estimado === true, req.usuario.id]
    );
    res.status(204).end();
});

// GET /api/produccion/rendimiento-tela?establecimiento_id=
// Costo y rendimiento de tela por producto y talla (vista v_rendimiento_tela).
router.get('/rendimiento-tela', async (req, res) => {
    const est = req.query.establecimiento_id ? v.id(req.query.establecimiento_id, 'establecimiento_id') : null;
    const { rows } = await query(
        `SELECT * FROM v_rendimiento_tela
         WHERE $1::int IS NULL OR establecimiento_id = $1
         ORDER BY establecimiento, producto, orden`,
        [est]
    );
    res.json(rows);
});

// PUT /api/produccion/fichas/:productoId/:talla  (crea o reemplaza)
// { peso_unitario_g, tipo_tela, color_tela, medida_pecho, ..., mano_obra, otros_costos,
//   materiales: [{material_id, cantidad}] }   (cantidad en la unidad del inventario)
const MEDIDAS = ['medida_pecho', 'medida_largo', 'medida_manga', 'medida_cintura', 'medida_cadera', 'medida_entrepierna'];

router.put('/fichas/:productoId/:talla', requiereModulo('fichas'), async (req, res) => {
    const productoId = v.id(req.params.productoId, 'productoId');
    const talla = req.params.talla;
    const b = req.body;
    const materiales = (b.materiales || []).map(m => ({
        material_id: v.id(m.material_id, 'material_id'),
        cantidad: v.numero(m.cantidad, 'cantidad', { min: 0.0001 }),
    }));

    const ficha = await transaccion(async client => {
        const { rows } = await client.query(
            `INSERT INTO fichas_tecnicas (producto_id, talla, peso_unitario_g, tipo_tela, color_tela,
                 ${MEDIDAS.join(', ')}, mano_obra, otros_costos, actualizada_por, peso_estimado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             ON CONFLICT (producto_id, talla) DO UPDATE SET
                 peso_unitario_g = EXCLUDED.peso_unitario_g, peso_estimado = EXCLUDED.peso_estimado, tipo_tela = EXCLUDED.tipo_tela,
                 color_tela = EXCLUDED.color_tela,
                 ${MEDIDAS.map(m => `${m} = EXCLUDED.${m}`).join(', ')},
                 mano_obra = EXCLUDED.mano_obra, otros_costos = EXCLUDED.otros_costos,
                 actualizada_por = EXCLUDED.actualizada_por, actualizada_en = now()
             RETURNING id`,
            [
                productoId, talla,
                v.numero(b.peso_unitario_g, 'peso_unitario_g', { requerido: false, min: 0 }),
                v.texto(b.tipo_tela, 'tipo_tela', { requerido: false }),
                v.texto(b.color_tela, 'color_tela', { requerido: false }),
                ...MEDIDAS.map(m => v.numero(b[m], m, { requerido: false, min: 0 })),
                v.numero(b.mano_obra, 'mano_obra', { requerido: false, min: 0 }) ?? 0,
                v.numero(b.otros_costos, 'otros_costos', { requerido: false, min: 0 }) ?? 0,
                req.usuario.id,
                b.peso_estimado === true,
            ]
        );
        const fichaId = rows[0].id;
        await client.query('DELETE FROM ficha_materiales WHERE ficha_id = $1', [fichaId]);
        for (const m of materiales) {
            await client.query(
                'INSERT INTO ficha_materiales (ficha_id, material_id, cantidad) VALUES ($1, $2, $3)',
                [fichaId, m.material_id, m.cantidad]
            );
        }
        await registrarActividad(client, req.usuario.id, 'Ficha técnica', 'Guardar',
            `Ficha técnica de producto ${productoId} talla ${talla} actualizada`);
        const { rows: completa } = await client.query(`${SELECT_FICHA} WHERE f.id = $1`, [fichaId]);
        return completa[0];
    });
    res.json(ficha);
});

// ======================================================
// ÓRDENES DE PRODUCCIÓN
// ======================================================

const ESTADOS_ORDEN = ['Pendiente', 'En proceso', 'Terminada'];

const SELECT_ORDEN = `
    SELECT o.*, p.nombre AS producto, e.nombre AS establecimiento, u.nombre AS usuario,
           ve.codigo AS venta_codigo, ve.cliente_nombre,
           o.fecha_entrega - current_date AS dias_restantes,
           -- Urgencia para el calendario. El margen de aviso viene de Configuración.
           CASE
               WHEN o.estado = 'Terminada' THEN 'Terminada'
               WHEN o.fecha_entrega IS NULL THEN 'Sin fecha'
               WHEN o.fecha_entrega < current_date THEN 'Atrasada'
               WHEN o.fecha_entrega - current_date <= cfg.dias_aviso_vencimiento THEN 'Por vencer'
               ELSE 'A tiempo'
           END AS alerta
    FROM ordenes_produccion o
    CROSS JOIN configuracion cfg
    LEFT JOIN ventas ve ON ve.id = o.venta_id
    JOIN productos p ON p.id = o.producto_id
    JOIN establecimientos e ON e.id = p.establecimiento_id
    LEFT JOIN usuarios u ON u.id = o.usuario_id`;

router.get('/ordenes', async (req, res) => {
    const params = [];
    let filtro = '';
    if (req.query.estado) {
        params.push(req.query.estado);
        filtro = 'WHERE o.estado = $1';
    }
    const { rows } = await query(`${SELECT_ORDEN} ${filtro} ORDER BY o.fecha_entrega NULLS LAST, o.id DESC`, params);
    res.json(rows);
});

// Materiales que necesita una orden según la ficha técnica, con el stock disponible.
async function materialesRequeridos(client, orden) {
    const { rows } = await client.query(
        `SELECT fm.material_id, m.detalle AS material, um.codigo AS unidad, m.stock,
                fm.cantidad AS cantidad_unitaria, fm.cantidad * $3 AS cantidad_total
         FROM fichas_tecnicas f
         JOIN ficha_materiales fm ON fm.ficha_id = f.id
         JOIN materiales m ON m.id = fm.material_id
         JOIN unidades_medida um ON um.id = m.unidad_id
         WHERE f.producto_id = $1 AND f.talla = $2`,
        [orden.producto_id, orden.talla, orden.cantidad]
    );
    return rows;
}

router.get('/ordenes/:id', async (req, res) => {
    const { rows } = await query(`${SELECT_ORDEN} WHERE o.id = $1`, [v.id(req.params.id)]);
    if (!rows[0]) throw noEncontrado('Orden de producción');
    // Tela que necesita la orden según el peso de la ficha (si existe).
    const { rows: tela } = await query(
        `SELECT tipo_tela, peso_rollo_kg, peso_estimado,
                round(consumo_g * $3 / 1000, 2) AS kg,
                round(consumo_g * $3 / 1000 / peso_rollo_kg, 2) AS rollos,
                round(costo_tela * $3) AS costo
         FROM v_rendimiento_tela WHERE producto_id = $1 AND talla = $2`,
        [rows[0].producto_id, rows[0].talla, rows[0].cantidad]
    );
    res.json({ ...rows[0], materiales_requeridos: await materialesRequeridos({ query }, rows[0]), tela_necesaria: tela[0] || null });
});

// POST /api/produccion/ordenes
// { fecha?, producto_id, talla, cantidad, observacion?, venta_id?, fecha_entrega? }
// venta_id: encargo que origina la orden (opcional). Si no se indica
// fecha_entrega, se usa la fecha de retiro comprometida en el encargo.
router.post('/ordenes', async (req, res) => {
    const b = req.body;
    const orden = await transaccion(async client => {
        if (b.venta_id) {
            const { rows: abierta } = await client.query(
                `SELECT codigo FROM ordenes_produccion
                 WHERE venta_id = $1 AND producto_id = $2 AND talla = $3 AND estado <> 'Terminada'`,
                [b.venta_id, b.producto_id, String(b.talla ?? '')]
            );
            if (abierta[0]) throw new HttpError(409, `Esta prenda del encargo ya está en el taller (${abierta[0].codigo}).`);
        }
        const { rows } = await client.query(
            `INSERT INTO ordenes_produccion (fecha, producto_id, talla, cantidad, observacion, venta_id, fecha_entrega, usuario_id)
             VALUES (coalesce($1::date, current_date), $2, $3, $4, $5, $6,
                     coalesce($7::date, (SELECT fecha_compromiso FROM ventas WHERE id = $6)), $8)
             RETURNING id, codigo`,
            [
                v.fecha(b.fecha),
                v.id(b.producto_id, 'producto_id'),
                v.texto(String(b.talla ?? ''), 'talla'),
                v.numero(b.cantidad, 'cantidad', { min: 1, entero: true }),
                v.texto(b.observacion, 'observacion', { requerido: false }),
                b.venta_id ? v.id(b.venta_id, 'venta_id') : null,
                v.fecha(b.fecha_entrega, 'fecha_entrega'),
                req.usuario.id,
            ]
        );
        await registrarActividad(client, req.usuario.id, 'Producción', 'Crear', `Orden ${rows[0].codigo} creada`, rows[0].codigo);
        const { rows: completa } = await client.query(`${SELECT_ORDEN} WHERE o.id = $1`, [rows[0].id]);
        return completa[0];
    });
    res.status(201).json(orden);
});

// PATCH /api/produccion/ordenes/:id/fecha  { fecha_entrega }  (reprogramar)
router.patch('/ordenes/:id/fecha', async (req, res) => {
    const id = v.id(req.params.id);
    const { rowCount } = await query(
        `UPDATE ordenes_produccion SET fecha_entrega = $2 WHERE id = $1 AND estado <> 'Terminada'`,
        [id, v.fecha(req.body.fecha_entrega, 'fecha_entrega')]
    );
    if (!rowCount) throw new HttpError(409, 'La orden no existe o ya está terminada.');
    const { rows } = await query(`${SELECT_ORDEN} WHERE o.id = $1`, [id]);
    res.json(rows[0]);
});

// PATCH /api/produccion/ordenes/:id/estado  { estado }
// Al pasar a "Terminada": descuenta los materiales de la ficha técnica
// e ingresa las prendas terminadas al stock. Es irreversible.
router.patch('/ordenes/:id/estado', async (req, res) => {
    const id = v.id(req.params.id);
    const estado = req.body.estado;
    if (!ESTADOS_ORDEN.includes(estado)) throw solicitudInvalida(`Estado inválido. Use: ${ESTADOS_ORDEN.join(', ')}.`);

    const orden = await transaccion(async client => {
        const { rows } = await client.query('SELECT * FROM ordenes_produccion WHERE id = $1 FOR UPDATE', [id]);
        const actual = rows[0];
        if (!actual) throw noEncontrado('Orden de producción');
        if (actual.estado === 'Terminada') throw new HttpError(409, `La orden ${actual.codigo} ya está terminada.`);

        if (estado === 'Terminada') {
            for (const m of await materialesRequeridos(client, actual)) {
                await moverStockMaterial(client, {
                    materialId: m.material_id, delta: -m.cantidad_total,
                    tipo: 'Consumo producción', referencia: actual.codigo, usuarioId: req.usuario.id,
                });
            }
            await moverStockPrenda(client, {
                productoId: actual.producto_id, talla: actual.talla, delta: actual.cantidad,
                tipo: 'Ingreso producción', referencia: actual.codigo, usuarioId: req.usuario.id,
            });
            // Si la orden es de un encargo pendiente, las prendas quedan reservadas para el cliente.
            if (actual.venta_id) {
                const { rows: items } = await client.query(
                    `SELECT i.id FROM venta_items i JOIN ventas v ON v.id = i.venta_id
                     WHERE i.venta_id = $1 AND i.producto_id = $2 AND i.talla = $3
                       AND v.estado_entrega = 'Por entregar' AND i.cantidad_reservada < i.cantidad`,
                    [actual.venta_id, actual.producto_id, actual.talla]
                );
                let restante = actual.cantidad;
                for (const it of items) {
                    restante -= await reservarEnEncargo(client, req.usuario.id, { itemId: it.id, maximo: restante });
                }
            }
        }

        await client.query(
            `UPDATE ordenes_produccion SET estado = $2,
                    fecha_finalizacion = CASE WHEN $2 = 'Terminada' THEN current_date END
             WHERE id = $1`,
            [id, estado]
        );
        await registrarActividad(client, req.usuario.id, 'Producción', 'Estado',
            `Orden ${actual.codigo}: ${actual.estado} → ${estado}`, actual.codigo);
        const { rows: completa } = await client.query(`${SELECT_ORDEN} WHERE o.id = $1`, [id]);
        return completa[0];
    });
    res.json(orden);
});

router.delete('/ordenes/:id', async (req, res) => {
    await transaccion(async client => {
        const { rows } = await client.query(
            `DELETE FROM ordenes_produccion WHERE id = $1 AND estado <> 'Terminada' RETURNING codigo`,
            [v.id(req.params.id)]
        );
        if (!rows[0]) throw new HttpError(409, 'La orden no existe o ya está terminada (no se puede eliminar).');
        await registrarActividad(client, req.usuario.id, 'Producción', 'Eliminar', `Orden ${rows[0].codigo} eliminada`, rows[0].codigo);
    });
    res.status(204).end();
});

module.exports = router;
