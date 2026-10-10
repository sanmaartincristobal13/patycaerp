// Registro de actividad (auditoría), movimientos de inventario (kárdex)
// y códigos correlativos de los maestros.
const { HttpError } = require('./errores');

function registrarActividad(client, usuarioId, modulo, accion, descripcion, referencia = '') {
    return client.query(
        `INSERT INTO actividad (usuario_id, modulo, accion, descripcion, referencia)
         VALUES ($1, $2, $3, $4, $5)`,
        [usuarioId, modulo, accion, descripcion, referencia]
    );
}

// Suma "delta" (positivo o negativo) al stock de un material y lo registra.
async function moverStockMaterial(client, { materialId, delta, tipo, referencia, usuarioId }) {
    const { rows } = await client.query(
        'SELECT detalle, stock FROM materiales WHERE id = $1 FOR UPDATE',
        [materialId]
    );
    if (!rows[0]) throw new HttpError(404, `Material ${materialId} no encontrado.`);

    const anterior = rows[0].stock;
    const nuevo = Number(anterior || 0) + delta;
    if (nuevo < 0) {
        throw new HttpError(409, `Stock insuficiente de "${rows[0].detalle}". Disponible: ${anterior ?? 0}, requerido: ${-delta}.`);
    }

    await client.query('UPDATE materiales SET stock = $1 WHERE id = $2', [nuevo, materialId]);
    await client.query(
        `INSERT INTO movimientos_inventario (tipo, material_id, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tipo, materialId, delta, anterior, nuevo, referencia, usuarioId]
    );
}

// Suma "delta" al stock de una prenda (producto + talla) y lo registra.
// Si la prenda nunca tuvo conteo, solo se permite sumar (no restar).
async function moverStockPrenda(client, { productoId, talla, delta, tipo, referencia, usuarioId }) {
    const { rows } = await client.query(
        `SELECT sp.stock, p.nombre
         FROM producto_tallas pt
         JOIN productos p ON p.id = pt.producto_id
         LEFT JOIN stock_prendas sp ON sp.producto_id = pt.producto_id AND sp.talla = pt.talla
         WHERE pt.producto_id = $1 AND pt.talla = $2
         FOR UPDATE OF pt`,
        [productoId, talla]
    );
    if (!rows[0]) throw new HttpError(404, `El producto ${productoId} no tiene la talla ${talla}.`);

    const { nombre, stock: anterior } = rows[0];
    if (anterior === null && delta < 0) {
        throw new HttpError(409, `No existe conteo de stock para ${nombre} talla ${talla}.`);
    }
    const nuevo = Number(anterior || 0) + delta;
    if (nuevo < 0) {
        throw new HttpError(409, `Stock insuficiente de ${nombre} talla ${talla}. Disponible: ${anterior}, solicitado: ${-delta}.`);
    }

    await client.query(
        `INSERT INTO stock_prendas (producto_id, talla, stock) VALUES ($1, $2, $3)
         ON CONFLICT (producto_id, talla) DO UPDATE SET stock = EXCLUDED.stock`,
        [productoId, talla, nuevo]
    );
    await client.query(
        `INSERT INTO movimientos_inventario (tipo, producto_id, talla, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [tipo, productoId, talla, delta, anterior, nuevo, referencia, usuarioId]
    );
}

// Siguiente código correlativo de un maestro, ej. ("materiales", "MAT-", 4) -> "MAT-0010".
// "tabla" viene siempre del código, nunca del usuario.
async function siguienteCodigo(client, tabla, prefijo, digitos) {
    const { rows } = await client.query(
        `SELECT coalesce(max(substring(codigo FROM $1::int)::int), 0) + 1 AS n
         FROM ${tabla} WHERE codigo ~ $2`,
        [prefijo.length + 1, `^${prefijo}[0-9]+$`]
    );
    return prefijo + String(rows[0].n).padStart(digitos, '0');
}

module.exports = { registrarActividad, moverStockMaterial, moverStockPrenda, siguienteCodigo };
