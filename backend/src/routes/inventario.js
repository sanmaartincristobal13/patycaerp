// Stock de prendas terminadas, conteos/ajustes y kárdex.
const { Router } = require('express');
const { query, transaccion } = require('../db');
const { requiereModulo } = require('../lib/auth');
const { noEncontrado } = require('../lib/errores');
const { moverStockMaterial, moverStockPrenda, registrarActividad } = require('../lib/registro');
const v = require('../lib/validar');

const router = Router();

// GET /api/inventario/prendas -> stock de cada producto/talla (null = sin conteo)
router.get('/prendas', async (req, res) => {
    const { rows } = await query(
        `SELECT pt.producto_id, p.codigo AS producto_codigo, p.nombre AS producto,
                e.nombre AS establecimiento, pt.talla, pt.precio,
                sp.stock, sp.stock_minimo, sp.stock_objetivo
         FROM producto_tallas pt
         JOIN productos p ON p.id = pt.producto_id
         JOIN establecimientos e ON e.id = p.establecimiento_id
         LEFT JOIN stock_prendas sp ON sp.producto_id = pt.producto_id AND sp.talla = pt.talla
         WHERE p.activo
         ORDER BY e.nombre, p.nombre, pt.orden`
    );
    res.json(rows);
});

// PUT /api/inventario/prendas/:productoId/:talla
// Conteo físico: { stock, stock_minimo, stock_objetivo }
router.put('/prendas/:productoId/:talla', requiereModulo('inventario'), async (req, res) => {
    const productoId = v.id(req.params.productoId, 'productoId');
    const talla = req.params.talla;
    const stock = v.numero(req.body.stock, 'stock', { min: 0, entero: true });

    await transaccion(async client => {
        const { rows } = await client.query(
            'SELECT stock FROM stock_prendas WHERE producto_id = $1 AND talla = $2',
            [productoId, talla]
        );
        const delta = stock - Number(rows[0]?.stock || 0);
        if (delta !== 0 || !rows[0]) {
            await moverStockPrenda(client, {
                productoId, talla, delta, tipo: 'Ajuste manual',
                referencia: 'Conteo / ajuste', usuarioId: req.usuario.id,
            });
        }
        await client.query(
            'UPDATE stock_prendas SET stock_minimo = $3, stock_objetivo = $4 WHERE producto_id = $1 AND talla = $2',
            [
                productoId, talla,
                v.numero(req.body.stock_minimo, 'stock_minimo', { requerido: false, min: 0, entero: true }),
                v.numero(req.body.stock_objetivo, 'stock_objetivo', { requerido: false, min: 0, entero: true }),
            ]
        );
        await registrarActividad(client, req.usuario.id, 'Inventario', 'Ajuste',
            `Conteo de prenda ${productoId} talla ${talla}: ${stock} unidades`);
    });
    res.status(204).end();
});

// PUT /api/inventario/materiales/:id
// Conteo físico: { stock, stock_minimo, stock_objetivo }
router.put('/materiales/:id', requiereModulo('inventario'), async (req, res) => {
    const id = v.id(req.params.id);
    const stock = v.numero(req.body.stock, 'stock', { min: 0 });

    await transaccion(async client => {
        const { rows } = await client.query('SELECT stock, detalle FROM materiales WHERE id = $1', [id]);
        if (!rows[0]) throw noEncontrado('Material');
        const delta = stock - Number(rows[0].stock || 0);
        if (delta !== 0 || rows[0].stock === null) {
            await moverStockMaterial(client, {
                materialId: id, delta, tipo: 'Ajuste manual',
                referencia: 'Conteo / ajuste', usuarioId: req.usuario.id,
            });
        }
        await client.query(
            'UPDATE materiales SET stock_minimo = $2, stock_objetivo = $3 WHERE id = $1',
            [
                id,
                v.numero(req.body.stock_minimo, 'stock_minimo', { requerido: false, min: 0 }),
                v.numero(req.body.stock_objetivo, 'stock_objetivo', { requerido: false, min: 0 }),
            ]
        );
        await registrarActividad(client, req.usuario.id, 'Inventario', 'Ajuste',
            `Conteo de material ${rows[0].detalle}: ${stock}`);
    });
    res.status(204).end();
});

// GET /api/inventario/reposicion
// Sugerencia de compra de materiales (no modifica nada).
//   demanda   = lo que piden las órdenes abiertas según su ficha de materiales
//   nivel     = stock objetivo, o si no hay, stock mínimo, o si no, 0
//   sugerido  = nivel + demanda - stock   (si es negativo, 0)
//   estado    = 'Crítico'    -> el stock no alcanza ni para las órdenes abiertas
//               'Comprar'    -> alcanza para las órdenes pero queda bajo el nivel
//               'Cubierto'   -> hay demanda y el stock la cubre
//               'Sin conteo' -> no se puede calcular sin conteo físico
//               'OK'
router.get('/reposicion', async (req, res) => {
    const { rows } = await query(
        `WITH demanda AS (
             SELECT fm.material_id,
                    sum(fm.cantidad * o.cantidad) AS demanda,
                    string_agg(DISTINCT o.codigo, ', ') AS ordenes
             FROM ordenes_produccion o
             JOIN fichas_tecnicas f ON f.producto_id = o.producto_id AND f.talla = o.talla
             JOIN ficha_materiales fm ON fm.ficha_id = f.id
             WHERE o.estado <> 'Terminada'
             GROUP BY fm.material_id
         ), calculo AS (
             SELECT m.id, m.codigo, m.detalle, m.stock, m.stock_minimo, m.stock_objetivo,
                    m.ultimo_precio, m.proveedor_id, pv.nombre AS proveedor, u.codigo AS unidad,
                    coalesce(d.demanda, 0) AS demanda, coalesce(d.ordenes, '') AS ordenes,
                    coalesce(m.stock_objetivo, m.stock_minimo, 0) AS nivel,
                    CASE WHEN m.stock_objetivo IS NOT NULL THEN 'Stock objetivo'
                         WHEN m.stock_minimo IS NOT NULL THEN 'Stock mínimo'
                         ELSE 'Solo demanda' END AS criterio
             FROM materiales m
             JOIN unidades_medida u ON u.id = m.unidad_id
             LEFT JOIN proveedores pv ON pv.id = m.proveedor_id
             LEFT JOIN demanda d ON d.material_id = m.id
             WHERE m.activo
         )
         SELECT c.*,
                c.stock - c.demanda AS proyectado,
                CASE WHEN c.stock IS NULL THEN NULL
                     ELSE greatest(c.nivel + c.demanda - c.stock, 0) END AS sugerido,
                CASE WHEN c.stock IS NULL THEN NULL
                     ELSE round(greatest(c.nivel + c.demanda - c.stock, 0) * c.ultimo_precio) END AS costo_estimado,
                CASE WHEN c.stock IS NULL THEN 'Sin conteo'
                     WHEN c.stock - c.demanda < 0 THEN 'Crítico'
                     WHEN c.nivel + c.demanda - c.stock > 0 THEN 'Comprar'
                     WHEN c.demanda > 0 THEN 'Cubierto'
                     ELSE 'OK' END AS estado
         FROM calculo c
         ORDER BY CASE
                      WHEN c.stock IS NOT NULL AND c.stock - c.demanda < 0 THEN 0
                      WHEN c.stock IS NOT NULL AND c.nivel + c.demanda - c.stock > 0 THEN 1
                      WHEN c.stock IS NULL THEN 2
                      WHEN c.demanda > 0 THEN 3
                      ELSE 4
                  END, c.detalle`
    );
    res.json(rows);
});

// GET /api/inventario/movimientos?desde=&hasta=&material_id=&producto_id=
router.get('/movimientos', async (req, res) => {
    const filtros = [];
    const params = [];
    const agregar = (condicion, valor) => {
        params.push(valor);
        filtros.push(condicion.replace('?', `$${params.length}`));
    };
    if (req.query.desde) agregar('m.fecha_hora >= ?::date', v.fecha(req.query.desde, 'desde'));
    if (req.query.hasta) agregar("m.fecha_hora < ?::date + 1", v.fecha(req.query.hasta, 'hasta'));
    if (req.query.material_id) agregar('m.material_id = ?', v.id(req.query.material_id, 'material_id'));
    if (req.query.producto_id) agregar('m.producto_id = ?', v.id(req.query.producto_id, 'producto_id'));

    const { rows } = await query(
        `SELECT m.*,
                CASE WHEN m.material_id IS NOT NULL THEN 'Material' ELSE 'Prenda terminada' END AS categoria,
                coalesce(mat.detalle, p.nombre || ' · Talla ' || m.talla) AS item,
                u.nombre AS usuario
         FROM movimientos_inventario m
         LEFT JOIN materiales mat ON mat.id = m.material_id
         LEFT JOIN productos p ON p.id = m.producto_id
         LEFT JOIN usuarios u ON u.id = m.usuario_id
         ${filtros.length ? 'WHERE ' + filtros.join(' AND ') : ''}
         ORDER BY m.fecha_hora DESC, m.id DESC
         LIMIT 500`,
        params
    );
    res.json(rows);
});

module.exports = router;
