// Datos maestros: establecimientos, productos (con tallas y precios),
// proveedores y materiales.
const { Router } = require('express');
const { query, transaccion } = require('../db');
const { requiereModulo } = require('../lib/auth');
const { noEncontrado, solicitudInvalida } = require('../lib/errores');
const { siguienteCodigo } = require('../lib/registro');
const v = require('../lib/validar');

const router = Router();

// ======================================================
// ESTABLECIMIENTOS
// ======================================================

router.get('/establecimientos', async (req, res) => {
    const { rows } = await query('SELECT * FROM establecimientos ORDER BY codigo');
    res.json(rows);
});

function datosEstablecimiento(b) {
    const tipo = b.tipo || 'Establecimiento';
    return [v.texto(b.nombre, 'nombre'), tipo, v.numero(b.anio_precio, 'anio_precio', { requerido: false, entero: true })];
}

router.post('/establecimientos', requiereModulo('catalogo'), async (req, res) => {
    const creado = await transaccion(async client => {
        const codigo = await siguienteCodigo(client, 'establecimientos', 'EST-', 3);
        const { rows } = await client.query(
            `INSERT INTO establecimientos (codigo, nombre, tipo, anio_precio)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [codigo, ...datosEstablecimiento(req.body)]
        );
        return rows[0];
    });
    res.status(201).json(creado);
});

router.put('/establecimientos/:id', requiereModulo('catalogo'), async (req, res) => {
    const { rows } = await query(
        `UPDATE establecimientos SET nombre = $2, tipo = $3, anio_precio = $4
         WHERE id = $1 RETURNING *`,
        [v.id(req.params.id), ...datosEstablecimiento(req.body)]
    );
    if (!rows[0]) throw noEncontrado('Establecimiento');
    res.json(rows[0]);
});

router.delete('/establecimientos/:id', requiereModulo('catalogo'), async (req, res) => {
    const { rowCount } = await query('DELETE FROM establecimientos WHERE id = $1', [v.id(req.params.id)]);
    if (!rowCount) throw noEncontrado('Establecimiento');
    res.status(204).end();
});

// ======================================================
// PRODUCTOS
// ======================================================
//
// En la API los precios se manejan agrupados, igual que en la lista
// de precios de la tienda:
//   "precios": [ { "grupo": "4-6-8", "precio": 8000 }, ... ]
// En la base se guarda una fila por talla (producto_tallas).

const SELECT_PRODUCTO = `
    SELECT p.*, e.nombre AS establecimiento, tp.nombre AS tipo_prenda, tt.nombre AS tipo_tela,
           coalesce((
               SELECT json_agg(json_build_object('grupo', g.grupo_precio, 'precio', g.precio,
                                                 'tallas', g.tallas) ORDER BY g.orden)
               FROM (
                   SELECT grupo_precio, precio, min(orden) AS orden,
                          json_agg(talla ORDER BY orden) AS tallas
                   FROM producto_tallas WHERE producto_id = p.id
                   GROUP BY grupo_precio, precio
               ) g
           ), '[]') AS precios
    FROM productos p
    JOIN establecimientos e ON e.id = p.establecimiento_id
    LEFT JOIN tipos_prenda tp ON tp.id = p.tipo_prenda_id
    LEFT JOIN tipos_tela tt ON tt.id = p.tipo_tela_id`;

router.get('/productos', async (req, res) => {
    const filtros = ['p.activo'];
    const params = [];
    if (req.query.establecimiento_id) {
        params.push(v.id(req.query.establecimiento_id, 'establecimiento_id'));
        filtros.push(`p.establecimiento_id = $${params.length}`);
    }
    const { rows } = await query(
        `${SELECT_PRODUCTO} WHERE ${filtros.join(' AND ')} ORDER BY e.nombre, tp.orden NULLS LAST, p.nombre`,
        params
    );
    res.json(rows);
});

router.get('/productos/:id', async (req, res) => {
    const { rows } = await query(`${SELECT_PRODUCTO} WHERE p.id = $1`, [v.id(req.params.id)]);
    if (!rows[0]) throw noEncontrado('Producto');
    res.json(rows[0]);
});

// Convierte [{grupo:"4-6-8", precio:8000}] en filas por talla.
function tallasDesdePrecios(precios) {
    const filas = [];
    let orden = 0;
    for (const { grupo, precio } of v.lista(precios, 'precios')) {
        const nombreGrupo = v.texto(grupo, 'grupo');
        const monto = v.numero(precio, 'precio', { min: 0, entero: true });
        for (const talla of nombreGrupo.split('-').map(t => t.trim()).filter(Boolean)) {
            if (filas.some(f => f.talla === talla)) {
                throw solicitudInvalida(`La talla ${talla} aparece en más de un grupo de precio.`);
            }
            filas.push({ talla, grupo: nombreGrupo, precio: monto, orden: ++orden });
        }
    }
    return filas;
}

async function guardarTallas(client, productoId, precios) {
    const filas = tallasDesdePrecios(precios);
    for (const f of filas) {
        await client.query(
            `INSERT INTO producto_tallas (producto_id, talla, grupo_precio, precio, orden)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (producto_id, talla) DO UPDATE
             SET grupo_precio = EXCLUDED.grupo_precio, precio = EXCLUDED.precio, orden = EXCLUDED.orden`,
            [productoId, f.talla, f.grupo, f.precio, f.orden]
        );
    }
    // Las tallas que ya no vienen se eliminan. Si tienen stock, ventas u
    // órdenes asociadas, la base lo impide (error 409).
    await client.query(
        'DELETE FROM producto_tallas WHERE producto_id = $1 AND NOT (talla = ANY($2))',
        [productoId, filas.map(f => f.talla)]
    );
}

function datosProducto(b) {
    return [
        v.id(b.establecimiento_id, 'establecimiento_id'),
        b.tipo_prenda_id ? v.id(b.tipo_prenda_id, 'tipo_prenda_id') : null,
        b.tipo_tela_id ? v.id(b.tipo_tela_id, 'tipo_tela_id') : null,
        v.texto(b.nombre, 'nombre'),
        v.numero(b.anio, 'anio', { requerido: false, entero: true }),
        v.texto(b.tela_principal, 'tela_principal', { requerido: false }),
        v.texto(b.imagen, 'imagen', { requerido: false }),
        v.texto(b.observaciones, 'observaciones', { requerido: false }),
    ];
}

router.post('/productos', requiereModulo('catalogo'), async (req, res) => {
    const id = await transaccion(async client => {
        const codigo = await siguienteCodigo(client, 'productos', 'PR', 3);
        const { rows } = await client.query(
            `INSERT INTO productos (codigo, establecimiento_id, tipo_prenda_id, tipo_tela_id, nombre, anio, tela_principal, imagen, observaciones)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [codigo, ...datosProducto(req.body)]
        );
        await guardarTallas(client, rows[0].id, req.body.precios);
        return rows[0].id;
    });
    const { rows } = await query(`${SELECT_PRODUCTO} WHERE p.id = $1`, [id]);
    res.status(201).json(rows[0]);
});

router.put('/productos/:id', requiereModulo('catalogo'), async (req, res) => {
    const id = v.id(req.params.id);
    await transaccion(async client => {
        const { rowCount } = await client.query(
            `UPDATE productos SET establecimiento_id = $2, tipo_prenda_id = $3, tipo_tela_id = $4, nombre = $5, anio = $6,
                    tela_principal = $7, imagen = $8, observaciones = $9
             WHERE id = $1`,
            [id, ...datosProducto(req.body)]
        );
        if (!rowCount) throw noEncontrado('Producto');
        await guardarTallas(client, id, req.body.precios);
    });
    const { rows } = await query(`${SELECT_PRODUCTO} WHERE p.id = $1`, [id]);
    res.json(rows[0]);
});

// Los productos no se borran (tienen historial de ventas): se desactivan.
router.delete('/productos/:id', requiereModulo('catalogo'), async (req, res) => {
    const { rowCount } = await query('UPDATE productos SET activo = false WHERE id = $1', [v.id(req.params.id)]);
    if (!rowCount) throw noEncontrado('Producto');
    res.status(204).end();
});

// ======================================================
// PROVEEDORES
// ======================================================

router.get('/proveedores', async (req, res) => {
    const { rows } = await query('SELECT * FROM proveedores ORDER BY nombre');
    res.json(rows);
});

function datosProveedor(b) {
    return [
        v.texto(b.nombre, 'nombre'),
        v.texto(b.categoria, 'categoria', { requerido: false }),
        v.texto(b.rut, 'rut', { requerido: false }) || null,
        v.texto(b.telefono, 'telefono', { requerido: false }) || null,
        v.texto(b.email, 'email', { requerido: false }) || null,
    ];
}

router.post('/proveedores', requiereModulo('compras'), async (req, res) => {
    const creado = await transaccion(async client => {
        const codigo = await siguienteCodigo(client, 'proveedores', 'PROV-', 3);
        const { rows } = await client.query(
            `INSERT INTO proveedores (codigo, nombre, categoria, rut, telefono, email)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [codigo, ...datosProveedor(req.body)]
        );
        return rows[0];
    });
    res.status(201).json(creado);
});

router.put('/proveedores/:id', requiereModulo('compras'), async (req, res) => {
    const { rows } = await query(
        `UPDATE proveedores SET nombre = $2, categoria = $3, rut = $4, telefono = $5, email = $6
         WHERE id = $1 RETURNING *`,
        [v.id(req.params.id), ...datosProveedor(req.body)]
    );
    if (!rows[0]) throw noEncontrado('Proveedor');
    res.json(rows[0]);
});

router.delete('/proveedores/:id', requiereModulo('compras'), async (req, res) => {
    const { rowCount } = await query('DELETE FROM proveedores WHERE id = $1', [v.id(req.params.id)]);
    if (!rowCount) throw noEncontrado('Proveedor');
    res.status(204).end();
});

// ======================================================
// MATERIALES
// ======================================================

const SELECT_MATERIAL = `
    SELECT m.*, tm.nombre AS tipo, u.codigo AS unidad, pv.nombre AS proveedor, b.nombre AS bodega
    FROM materiales m
    JOIN tipos_material tm ON tm.id = m.tipo_material_id
    JOIN unidades_medida u ON u.id = m.unidad_id
    LEFT JOIN proveedores pv ON pv.id = m.proveedor_id
    LEFT JOIN bodegas b ON b.id = m.bodega_id`;

router.get('/materiales', async (req, res) => {
    const { rows } = await query(`${SELECT_MATERIAL} WHERE m.activo ORDER BY m.codigo`);
    res.json(rows);
});

router.get('/materiales/:id', async (req, res) => {
    const { rows } = await query(`${SELECT_MATERIAL} WHERE m.id = $1`, [v.id(req.params.id)]);
    if (!rows[0]) throw noEncontrado('Material');
    res.json(rows[0]);
});

// El stock NO se edita aquí: se cambia con compras, producción o
// ajustes de inventario, para que quede registrado en el kárdex.
function datosMaterial(b) {
    return [
        v.id(b.tipo_material_id, 'tipo_material_id'),
        v.texto(b.detalle, 'detalle'),
        b.proveedor_id ? v.id(b.proveedor_id, 'proveedor_id') : null,
        v.id(b.unidad_id, 'unidad_id'),
        v.numero(b.ultimo_precio, 'ultimo_precio', { requerido: false, min: 0 }) ?? 0,
        b.bodega_id ? v.id(b.bodega_id, 'bodega_id') : null,
    ];
}

router.post('/materiales', requiereModulo('inventario'), async (req, res) => {
    const id = await transaccion(async client => {
        const codigo = await siguienteCodigo(client, 'materiales', 'MAT-', 4);
        const { rows } = await client.query(
            `INSERT INTO materiales (codigo, tipo_material_id, detalle, proveedor_id, unidad_id, ultimo_precio, bodega_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [codigo, ...datosMaterial(req.body)]
        );
        return rows[0].id;
    });
    const { rows } = await query(`${SELECT_MATERIAL} WHERE m.id = $1`, [id]);
    res.status(201).json(rows[0]);
});

router.put('/materiales/:id', requiereModulo('inventario'), async (req, res) => {
    const id = v.id(req.params.id);
    const { rowCount } = await query(
        `UPDATE materiales SET tipo_material_id = $2, detalle = $3, proveedor_id = $4,
                unidad_id = $5, ultimo_precio = $6, bodega_id = $7
         WHERE id = $1`,
        [id, ...datosMaterial(req.body)]
    );
    if (!rowCount) throw noEncontrado('Material');
    const { rows } = await query(`${SELECT_MATERIAL} WHERE m.id = $1`, [id]);
    res.json(rows[0]);
});

router.delete('/materiales/:id', requiereModulo('inventario'), async (req, res) => {
    const { rowCount } = await query('UPDATE materiales SET activo = false WHERE id = $1', [v.id(req.params.id)]);
    if (!rowCount) throw noEncontrado('Material');
    res.status(204).end();
});

module.exports = router;
