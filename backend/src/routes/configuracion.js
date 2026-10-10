// Configuración general, catálogos simples, usuarios y roles.
const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db');
const { requiereModulo } = require('../lib/auth');
const { noEncontrado, solicitudInvalida } = require('../lib/errores');
const v = require('../lib/validar');

const router = Router();
const soloAdmin = requiereModulo('configuracion');

// ------------------------------------------------------
// CONFIGURACIÓN GENERAL
// ------------------------------------------------------

router.get('/configuracion', async (req, res) => {
    const { rows } = await query('SELECT * FROM configuracion WHERE id = 1');
    res.json(rows[0]);
});

router.put('/configuracion', soloAdmin, async (req, res) => {
    const b = req.body;
    const { rows } = await query(
        `UPDATE configuracion SET
            empresa = $1, taller = $2, porcentaje_advertencia_stock = $3,
            dias_aviso_vencimiento = $4, saldo_inicial = $5, fecha_saldo_inicial = $6
         WHERE id = 1 RETURNING *`,
        [
            v.texto(b.empresa, 'empresa'),
            v.texto(b.taller, 'taller'),
            v.numero(b.porcentaje_advertencia_stock, 'porcentaje_advertencia_stock', { min: 0, entero: true }),
            v.numero(b.dias_aviso_vencimiento, 'dias_aviso_vencimiento', { min: 0, entero: true }),
            v.numero(b.saldo_inicial, 'saldo_inicial'),
            v.fecha(b.fecha_saldo_inicial, 'fecha_saldo_inicial'),
        ]
    );
    res.json(rows[0]);
});

// ------------------------------------------------------
// CATÁLOGOS SIMPLES (listas para los <select> del front)
// ------------------------------------------------------

// Nombre en la URL -> tabla. Solo estas tablas son editables por esta vía.
const CATALOGOS = {
    'bodegas': 'bodegas',
    'tipos-material': 'tipos_material',
    'medios-pago': 'medios_pago',
    'categorias-gasto': 'categorias_gasto',
    'tipos-prenda': 'tipos_prenda',
};

function tablaCatalogo(nombre) {
    const tabla = CATALOGOS[nombre];
    if (!tabla) throw noEncontrado('Catálogo');
    return tabla;
}

// GET /api/catalogos -> todas las listas en una sola llamada
router.get('/catalogos', async (req, res) => {
    const [bodegas, tipos, medios, categorias, unidades, roles, tiposPrenda, tiposTela] = await Promise.all([
        query('SELECT id, nombre FROM bodegas ORDER BY nombre'),
        query('SELECT id, nombre FROM tipos_material ORDER BY nombre'),
        query('SELECT id, nombre FROM medios_pago ORDER BY id'),
        query('SELECT id, nombre FROM categorias_gasto ORDER BY id'),
        query('SELECT id, codigo, nombre FROM unidades_medida ORDER BY id'),
        query('SELECT id, nombre FROM roles ORDER BY id'),
        query('SELECT id, nombre FROM tipos_prenda ORDER BY orden, nombre'),
        query('SELECT * FROM tipos_tela ORDER BY id'),
    ]);
    res.json({
        bodegas: bodegas.rows,
        tiposMaterial: tipos.rows,
        mediosPago: medios.rows,
        categoriasGasto: categorias.rows,
        unidades: unidades.rows,
        roles: roles.rows,
        tiposPrenda: tiposPrenda.rows,
        tiposTela: tiposTela.rows,
    });
});

router.post('/catalogos/:catalogo', soloAdmin, async (req, res) => {
    const tabla = tablaCatalogo(req.params.catalogo);
    const { rows } = await query(
        `INSERT INTO ${tabla} (nombre) VALUES ($1) RETURNING id, nombre`,
        [v.texto(req.body.nombre, 'nombre')]
    );
    res.status(201).json(rows[0]);
});

router.delete('/catalogos/:catalogo/:id', soloAdmin, async (req, res) => {
    const tabla = tablaCatalogo(req.params.catalogo);
    const { rowCount } = await query(`DELETE FROM ${tabla} WHERE id = $1`, [v.id(req.params.id)]);
    if (!rowCount) throw noEncontrado();
    res.status(204).end();
});

// ------------------------------------------------------
// TIPOS DE TELA: precio por kg, peso del rollo y merma
// ------------------------------------------------------

// PUT /api/tipos-tela/:id  { precio_kg, peso_rollo_kg, merma (0.05 = 5 %), observacion }
router.put('/tipos-tela/:id', requiereModulo('fichas'), async (req, res) => {
    const b = req.body;
    const merma = v.numero(b.merma, 'merma', { min: 0 });
    if (merma >= 1) throw solicitudInvalida('La merma se indica como fracción: 0.05 = 5 %.');
    const { rows } = await query(
        `UPDATE tipos_tela SET precio_kg = $2, peso_rollo_kg = $3, merma = $4, observacion = $5
         WHERE id = $1 RETURNING *`,
        [
            v.id(req.params.id),
            v.numero(b.precio_kg, 'precio_kg', { min: 0 }),
            v.numero(b.peso_rollo_kg, 'peso_rollo_kg', { min: 0.1 }),
            merma,
            v.texto(b.observacion, 'observacion', { requerido: false }),
        ]
    );
    if (!rows[0]) throw noEncontrado('Tipo de tela');
    res.json(rows[0]);
});

// ------------------------------------------------------
// USUARIOS
// ------------------------------------------------------

const SELECT_USUARIO = `
    SELECT u.id, u.email, u.nombre, u.activo, u.creado_en, u.rol_id, r.nombre AS rol
    FROM usuarios u JOIN roles r ON r.id = u.rol_id`;

router.get('/usuarios', soloAdmin, async (req, res) => {
    const { rows } = await query(`${SELECT_USUARIO} ORDER BY u.nombre`);
    res.json(rows);
});

router.post('/usuarios', soloAdmin, async (req, res) => {
    const b = req.body;
    const password = v.texto(b.password, 'password');
    if (password.length < 8) throw solicitudInvalida('La contraseña debe tener al menos 8 caracteres.');

    const { rows } = await query(
        `INSERT INTO usuarios (email, nombre, password_hash, rol_id)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
            v.texto(b.email, 'email').toLowerCase(),
            v.texto(b.nombre, 'nombre'),
            await bcrypt.hash(password, 10),
            v.id(b.rol_id, 'rol_id'),
        ]
    );
    const creado = await query(`${SELECT_USUARIO} WHERE u.id = $1`, [rows[0].id]);
    res.status(201).json(creado.rows[0]);
});

// Actualiza nombre, rol, estado y (opcionalmente) contraseña.
router.put('/usuarios/:id', soloAdmin, async (req, res) => {
    const id = v.id(req.params.id);
    const b = req.body;

    let hash = null;
    if (b.password) {
        if (b.password.length < 8) throw solicitudInvalida('La contraseña debe tener al menos 8 caracteres.');
        hash = await bcrypt.hash(b.password, 10);
    }
    if (id === req.usuario.id && b.activo === false) {
        throw solicitudInvalida('No puede desactivar su propio usuario.');
    }

    const { rowCount } = await query(
        `UPDATE usuarios SET
            nombre = $2, rol_id = $3, activo = $4,
            password_hash = coalesce($5, password_hash)
         WHERE id = $1`,
        [id, v.texto(b.nombre, 'nombre'), v.id(b.rol_id, 'rol_id'), b.activo !== false, hash]
    );
    if (!rowCount) throw noEncontrado('Usuario');
    const actualizado = await query(`${SELECT_USUARIO} WHERE u.id = $1`, [id]);
    res.json(actualizado.rows[0]);
});

// ------------------------------------------------------
// ROLES Y PERMISOS
// ------------------------------------------------------

router.get('/roles', soloAdmin, async (req, res) => {
    const { rows } = await query(
        `SELECT r.id, r.nombre,
                coalesce(array_agg(rp.modulo ORDER BY rp.modulo) FILTER (WHERE rp.modulo IS NOT NULL), '{}') AS modulos
         FROM roles r LEFT JOIN rol_permisos rp ON rp.rol_id = r.id
         GROUP BY r.id ORDER BY r.id`
    );
    res.json(rows);
});

module.exports = router;
