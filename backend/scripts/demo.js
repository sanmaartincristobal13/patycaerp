// Carga datos de PRUEBA para ver el sistema funcionando.
//
//   npm run db:demo      (con el servidor corriendo: npm run dev)
//
// Usa la API como lo haría un usuario, así los datos pasan por las
// mismas reglas (stock, kárdex, pagos). Las fechas son relativas a hoy.
// NO usar en la base real de PATYCA: son clientes y ventas inventados.

// API_URL permite cargar los datos en el sistema publicado (ej. https://patyca.vercel.app/api).
const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}/api`;
let token = '';

async function api(metodo, ruta, cuerpo) {
    const r = await fetch(BASE + ruta, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = r.status === 204 ? null : await r.json();
    if (!r.ok) throw new Error(`${metodo} ${ruta}: ${datos?.error}`);
    return datos;
}

// Fecha "YYYY-MM-DD" a n días de hoy (negativo = pasado).
function dia(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

// ======================================================
// HISTORIA DE 24 MESES (para la proyección de ventas)
// ======================================================
// Estacionalidad típica de uniformes escolares en Chile: peak en
// febrero-marzo (inicio de clases), alza de prendas de abrigo en
// invierno, baja en primavera. Crecimiento ~12% anual y algo de ruido.

const ESTACIONALIDAD = [1.3, 2.6, 2.2, 0.9, 0.7, 0.8, 0.9, 0.6, 0.5, 0.5, 0.6, 0.9];   // ene..dic
const ABRIGO = /Polar|Polerón|Buzo|Sweater|Vestón/;

const POPULARIDAD = [
    [/Polera Polo M\/C|Polera Deporte/, 1.0], [/Polerón/, 0.7], [/Polera Polo M\/L/, 0.6],
    [/Pantalón de Buzo|Buzo/, 0.6], [/Piqué|Uniforme|Camisa/, 0.5], [/Polar|Calza/, 0.4],
    [/Falda|Pantalón/, 0.35], [/Sweater/, 0.3], [/Vestón/, 0.1],
];
const PESO_COLEGIO = { 'Escuela Numpay': 1.0, 'Colegio San Esteban': 0.8, 'Marca Kotting': 0.6, 'Liceo Max Colin': 0.5 };
const PESO_TALLA = { 2: 0.3, 4: 0.6, 6: 0.8, 8: 1, 10: 1, 12: 0.9, 14: 0.7, 16: 0.5, S: 0.4, M: 0.35, L: 0.25, XL: 0.15, XXL: 0.08 };

// Generador pseudoaleatorio con semilla fija: la demo sale igual cada vez.
function azar(semilla) {
    return () => {
        semilla = (semilla * 1664525 + 1013904223) % 4294967296;
        return semilla / 4294967296;
    };
}

async function cargarHistoria(productos) {
    const aleatorio = azar(2026);
    const hoyMes = new Date();
    const filas = [];

    for (let atras = 24; atras >= 1; atras--) {
        const d = new Date(Date.UTC(hoyMes.getFullYear(), hoyMes.getMonth() - atras, 1));
        const mes = d.toISOString().slice(0, 10);
        const mesDelAnio = d.getUTCMonth();
        const nivelAnio = atras > 12 ? 1 / 1.12 : 1;        // el año anterior vendía ~12% menos
        const precioAnio = atras > 12 ? 0.88 : 0.94;        // y con precios más bajos

        for (const p of productos) {
            const popularidad = POPULARIDAD.find(([re]) => re.test(p.nombre))?.[1] ?? 0.3;
            const colegio = PESO_COLEGIO[p.establecimiento] ?? 0.4;   // colegios más chicos
            const invierno = ABRIGO.test(p.nombre) && mesDelAnio >= 4 && mesDelAnio <= 6 ? 1.6 : 1;

            for (const g of p.precios) {
                for (const talla of g.tallas) {
                    const pesoTalla = PESO_TALLA[talla] ?? 0.3;
                    const ruido = 0.75 + aleatorio() * 0.5;
                    const unidades = Math.round(3 * popularidad * colegio * pesoTalla
                        * ESTACIONALIDAD[mesDelAnio] * invierno * nivelAnio * ruido);
                    if (unidades > 0) {
                        filas.push({ mes, producto_id: p.id, talla, unidades, monto: Math.round(unidades * g.precio * precioAnio) });
                    }
                }
            }
        }
    }

    for (let i = 0; i < filas.length; i += 500) {
        await api('POST', '/proyeccion/historicas', { filas: filas.slice(i, i + 500) });
    }
    return filas.length;
}

// ======================================================
// CATÁLOGO DE PRUEBA para los colegios sin lista de precios
// ======================================================
// El data.js original solo traía productos de 4 establecimientos.
// A los demás se les crea una línea básica con precios de REFERENCIA,
// marcados como "precio de prueba" para reemplazarlos por los reales.

const LINEA_BASICA = [
    // [nombre, tipo, grupos de precio]
    ['Polera Polo M/C', 'Poleras', { '4-6-8': 8000, '10-12': 9000, '14-16': 10000, 'S-M': 10500, 'L-XL': 11500 }],
    ['Polerón de Buzo', 'Polerones y abrigo', { '4-6-8': 12000, '10-12': 13000, '14-16': 14000, 'S-M': 15000, 'L-XL': 16000 }],
    ['Pantalón de Buzo', 'Pantalones y faldas', { '4-6-8': 10000, '10-12': 11000, '14-16': 12000, 'S-M': 13000, 'L-XL': 14000 }],
    ['Buzo (Polerón y Pantalón)', 'Buzos (conjunto)', { '4-6-8': 21000, '10-12': 22000, '14-16': 23000, 'S-M': 24000, 'L-XL': 25000 }],
];
const LINEA_JARDIN = [
    ['Polera Polo M/C', 'Poleras', { '2-4': 7500, '6': 8000 }],
    ['Polerón de Buzo', 'Polerones y abrigo', { '2-4': 11000, '6': 12000 }],
    ['Pantalón de Buzo', 'Pantalones y faldas', { '2-4': 9000, '6': 10000 }],
    ['Delantal / Cotona', 'Otros', { '2-4': 9500, '6': 10500 }],
];

async function cargarCatalogoDemo() {
    const [establecimientos, productos, { tiposPrenda }] = await Promise.all([
        api('GET', '/establecimientos'), api('GET', '/productos'), api('GET', '/catalogos'),
    ]);
    const tipo = nombre => tiposPrenda.find(t => t.nombre === nombre)?.id ?? null;
    let creados = 0;
    for (const e of establecimientos) {
        if (productos.some(p => p.establecimiento_id === e.id)) continue;
        const linea = /jard[ií]n/i.test(e.nombre) ? LINEA_JARDIN : LINEA_BASICA;
        for (const [nombre, tipoNombre, precios] of linea) {
            await api('POST', '/productos', {
                establecimiento_id: e.id, tipo_prenda_id: tipo(tipoNombre), nombre, anio: new Date().getFullYear(),
                observaciones: 'Precio de prueba: reemplazar por la lista real',
                precios: Object.entries(precios).map(([grupo, precio]) => ({ grupo, precio })),
            });
            creados++;
        }
    }
    return creados;
}

async function main() {
    const login = await api('POST', '/auth/login', {
        email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
    });
    token = login.token;

    if (process.argv.includes('--solo-catalogo')) {
        console.log(`· ${await cargarCatalogoDemo()} productos de prueba para colegios sin lista de precios`);
        console.log(`· ${await cargarHistoria(await api('GET', '/productos'))} filas de historia mensual (24 meses)`);
        return;
    }

    if (process.argv.includes('--solo-historia')) {
        const n = await cargarHistoria(await api('GET', '/productos'));
        console.log(`· ${n} filas de historia mensual (24 meses)\n\nHistoria cargada.`);
        return;
    }

    const ventasPrevias = await api('GET', '/ventas');
    if (ventasPrevias.length && !process.argv.includes('--igual')) {
        throw new Error('La base ya tiene ventas. Para cargar la demo de todas formas: npm run db:demo -- --igual');
    }

    const paso = texto => console.log('· ' + texto);
    paso(`${await cargarCatalogoDemo()} productos de prueba para colegios sin lista de precios`);

    // ---------- Búsquedas por código / nombre ----------
    const [productos, materiales, proveedores, catalogos] = await Promise.all([
        api('GET', '/productos'), api('GET', '/materiales'), api('GET', '/proveedores'), api('GET', '/catalogos'),
    ]);
    const P = codigo => productos.find(p => p.codigo === codigo).id;
    const M = codigo => materiales.find(m => m.codigo === codigo).id;
    const PROV = nombre => proveedores.find(p => p.nombre === nombre).id;
    const MEDIO = nombre => catalogos.mediosPago.find(m => m.nombre === nombre).id;
    const CAT = nombre => catalogos.categoriasGasto.find(c => c.nombre === nombre).id;

    // ---------- Inventario inicial (conteo físico) ----------
    const conteoPrendas = [
        // [producto, talla, stock, mínimo]
        ['PR001', '4', 6, 3], ['PR001', '6', 8, 3], ['PR001', '8', 10, 4], ['PR001', '10', 12, 4],
        ['PR001', '12', 9, 4], ['PR001', '14', 5, 3], ['PR001', '16', 2, 3], ['PR001', 'S', 4, 2], ['PR001', 'M', 3, 2],
        ['PR002', '8', 5, 2], ['PR002', '10', 6, 2], ['PR002', '12', 4, 2],
        ['PR005', '8', 3, 2], ['PR005', '10', 4, 2], ['PR005', '12', 2, 2],
        ['PR006', '10', 6, 3], ['PR006', '12', 5, 3], ['PR006', '14', 1, 3],
        ['PR007', '10', 7, 3], ['PR007', '12', 6, 3],
        ['PR008', '8', 3, 2], ['PR008', '12', 2, 2],
        ['PR011', '8', 8, 3], ['PR011', '10', 10, 3], ['PR011', '12', 7, 3], ['PR011', '14', 4, 3],
        ['PR015', '10', 2, 1], ['PR015', '14', 1, 1],
        ['PR016', '12', 4, 2], ['PR018', '10', 9, 3], ['PR018', 'S', 5, 2],
        ['PR023', 'M', 6, 2], ['PR023', 'L', 4, 2], ['PR024', 'M', 5, 2],
        ['PR028', '10', 6, 2], ['PR028', '12', 5, 2], ['PR029', '42', 3, 1], ['PR029', '44', 2, 1],
    ];
    for (const [codigo, talla, stock, minimo] of conteoPrendas) {
        await api('PUT', `/inventario/prendas/${P(codigo)}/${encodeURIComponent(talla)}`, { stock, stock_minimo: minimo });
    }
    paso(`${conteoPrendas.length} conteos de prendas`);

    const conteoMateriales = [
        // [material, stock, mínimo, objetivo]
        ['MAT-0001', 8, 15, 40],    // Franela Polycotton Azul Rey (kg) - bajo mínimo
        ['MAT-0002', 6, 10, 30],    // Piqué Polycotton Melange (kg)
        ['MAT-0003', 2, 2, 8],      // Puño Polycotton (kg)
        ['MAT-0004', 12, 5, 20],    // Franela de Algodón (kg)
        ['MAT-0006', 15, 10, 40],   // Bistretch (m)
        ['MAT-0007', 10, 5, 20],    // Can Can (m)
        ['MAT-0008', 4, 5, 15],     // Tull Blanco (m) - bajo mínimo
        ['MAT-0009', 150, 100, 300] // Sesgo (unidades)
        // MAT-0005 Puño de Algodón queda "sin conteo" a propósito
    ];
    for (const [codigo, stock, minimo, objetivo] of conteoMateriales) {
        await api('PUT', `/inventario/materiales/${M(codigo)}`, { stock, stock_minimo: minimo, stock_objetivo: objetivo });
    }
    paso(`${conteoMateriales.length} conteos de materiales`);

    // ---------- Fichas de materiales (consumo por prenda) ----------
    const fichas = [
        ...['8', '10', '12', '14'].map(t => ['PR001', t, [['MAT-0002', 0.2], ['MAT-0009', 1]]]),
        ...['10', '12', '14'].map(t => ['PR006', t, [['MAT-0001', 0.45], ['MAT-0003', 0.05]]]),
        ...['10', '12', '14'].map(t => ['PR005', t, [['MAT-0001', 0.8], ['MAT-0003', 0.08]]]),
        ['PR008', '10', [['MAT-0006', 0.9]]],
        ['PR015', '12', [['MAT-0004', 0.85], ['MAT-0003', 0.08]]],
    ];
    for (const [codigo, talla, mats] of fichas) {
        await api('PUT', `/produccion/fichas/${P(codigo)}/${encodeURIComponent(talla)}`, {
            materiales: mats.map(([m, cantidad]) => ({ material_id: M(m), cantidad })),
        });
    }
    paso(`${fichas.length} fichas de materiales`);

    // ---------- Compras ----------
    const compras = [
        { fecha: dia(-26), proveedor: 'Textil Circutex S.A.', documento: 'F-10231', items: [['MAT-0001', 35, 6500], ['MAT-0002', 20, 5800]], pago: 'total', medio: 'Transferencia' },
        { fecha: dia(-19), proveedor: 'Textil La Emiliana Ltda.', documento: 'F-5582', items: [['MAT-0006', 30, 3200]], pago: 'total', medio: 'Transferencia' },
        { fecha: dia(-11), proveedor: 'Textil Circutex S.A.', documento: 'F-10412', vencimiento: dia(3), items: [['MAT-0003', 6, 6500], ['MAT-0001', 10, 6600]], pago: 40000, medio: 'Transferencia' },
        { fecha: dia(-4), proveedor: 'Comercializadora Ancar SpA', documento: 'B-889', vencimiento: dia(12), items: [['MAT-0009', 100, 120]] },
    ];
    for (const c of compras) {
        const total = c.items.reduce((s, [, cant, precio]) => s + Math.round(cant * precio), 0);
        await api('POST', '/compras', {
            fecha: c.fecha, proveedor_id: PROV(c.proveedor), documento: c.documento, vencimiento: c.vencimiento || null,
            items: c.items.map(([m, cantidad, precio_unitario]) => ({ material_id: M(m), cantidad, precio_unitario })),
            pago_inicial: c.pago ? { monto: c.pago === 'total' ? total : c.pago, medio_pago_id: MEDIO(c.medio) } : null,
        });
    }
    paso(`${compras.length} compras (una con pago parcial y otra pendiente)`);

    // ---------- Ventas al mesón (pasadas) ----------
    const ventas = [
        // [días atrás, cliente, [[producto, talla, cant]], pago ('total' | monto | 0), medio]
        [-27, '', [['PR001', '8', 2], ['PR007', '10', 1]], 'total', 'Efectivo'],
        [-24, 'Paola Fuentes', [['PR011', '10', 2]], 'total', 'Transferencia'],
        [-21, '', [['PR001', '10', 1]], 'total', 'Tarjeta'],
        [-18, 'Rodrigo Vera', [['PR006', '12', 1], ['PR007', '12', 1]], 'total', 'Transferencia'],
        [-15, '', [['PR018', '10', 2]], 'total', 'Efectivo'],
        [-12, 'Claudia Reyes', [['PR005', '10', 1], ['PR001', '12', 2]], 20000, 'Transferencia'],
        [-9, '', [['PR023', 'M', 2]], 'total', 'Efectivo'],
        [-7, 'Felipe Araya', [['PR028', '10', 2], ['PR029', '42', 1]], 'total', 'Tarjeta'],
        [-5, '', [['PR011', '12', 1], ['PR011', '8', 1]], 'total', 'Efectivo'],
        [-3, 'Marcela Díaz', [['PR002', '10', 2]], 10000, 'Efectivo'],
        [-2, '', [['PR001', '6', 1]], 'total', 'Efectivo'],
        [-1, 'Tomás Pizarro', [['PR016', '12', 1], ['PR018', 'S', 1]], 'total', 'Transferencia'],
        [0, '', [['PR001', '4', 2]], 'total', 'Tarjeta'],
    ];
    for (const [d, cliente, items, pago, medio] of ventas) {
        const lineas = items.map(([codigo, talla, cantidad]) => ({ producto_id: P(codigo), talla, cantidad }));
        const total = items.reduce((s, [codigo, talla, cant]) =>
            s + cant * productos.find(p => p.codigo === codigo).precios.find(g => g.tallas.includes(talla)).precio, 0);
        await api('POST', '/ventas', {
            fecha: dia(d), cliente_nombre: cliente, items: lineas,
            pago_inicial: pago ? { monto: pago === 'total' ? total : pago, medio_pago_id: MEDIO(medio) } : null,
        });
    }
    paso(`${ventas.length} ventas al mesón (dos con saldo por cobrar)`);

    // ---------- Encargos + órdenes de producción ----------
    const encargo = (fecha, cliente, telefono, retiro, items, abono) => api('POST', '/ventas', {
        encargo: true, fecha, cliente_nombre: cliente, cliente_telefono: telefono, fecha_compromiso: retiro,
        items: items.map(([codigo, talla, cantidad]) => ({ producto_id: P(codigo), talla, cantidad })),
        pago_inicial: abono ? { monto: abono, medio_pago_id: MEDIO('Efectivo') } : null,
    });
    const ordenDe = (venta, estado) => api('POST', '/produccion/ordenes', {
        producto_id: venta.items[0].producto_id, talla: venta.items[0].talla, cantidad: venta.items[0].cantidad,
        venta_id: venta.id, observacion: `Encargo de ${venta.cliente_nombre}`,
    }).then(async o => {
        if (estado !== 'Pendiente') await api('PATCH', `/produccion/ordenes/${o.id}/estado`, { estado: 'En proceso' });
        if (estado === 'Terminada') await api('PATCH', `/produccion/ordenes/${o.id}/estado`, { estado: 'Terminada' });
        return o;
    });

    // Encargo completo: confeccionado, terminado y ya retirado.
    const e1 = await encargo(dia(-16), 'Pedro Castillo', '+56987654321', dia(-6), [['PR006', '14', 2]], 14000);
    await ordenDe(e1, 'Terminada');
    await api('POST', `/ventas/${e1.id}/pagos`, { monto: e1.total - 14000, medio_pago_id: MEDIO('Transferencia') });
    await api('PATCH', `/ventas/${e1.id}/entregar`);

    // Atrasado: el retiro era ayer y la orden sigue pendiente.
    const e2 = await encargo(dia(-8), 'Carolina Muñoz', '+56922223333', dia(-1), [['PR008', '10', 2]], 15000);
    await ordenDe(e2, 'Pendiente');

    // Por vencer: en proceso, retira en 3 días.
    const e3 = await encargo(dia(-6), 'María Soto', '+56911112222', dia(3), [['PR005', '14', 1]], 10000);
    await ordenDe(e3, 'En proceso');

    // A tiempo: pagado completo, retira en 12 días.
    const e4 = await encargo(dia(-2), 'Jorge Rojas', '+56944445555', dia(12), [['PR015', '12', 1]], 27000);
    await ordenDe(e4, 'Pendiente');

    // Recién tomado, todavía sin orden (para probar "Enviar al taller").
    await encargo(dia(0), 'Ana Pérez', '+56966667777', dia(6), [['PR001', '16', 3]], 0);
    paso('5 encargos (uno entregado, uno atrasado, uno por vencer, uno a tiempo y uno sin orden)');

    // ---------- Órdenes para reponer stock ----------
    const ordenStock = async (codigo, talla, cantidad, entrega, estado) => {
        const o = await api('POST', '/produccion/ordenes', {
            producto_id: P(codigo), talla, cantidad, fecha_entrega: entrega, observacion: 'Reposición de stock',
        });
        if (estado !== 'Pendiente') await api('PATCH', `/produccion/ordenes/${o.id}/estado`, { estado: 'En proceso' });
        if (estado === 'Terminada') await api('PATCH', `/produccion/ordenes/${o.id}/estado`, { estado: 'Terminada' });
    };
    await ordenStock('PR006', '10', 10, dia(-10), 'Terminada');
    await ordenStock('PR001', '10', 30, dia(8), 'En proceso');
    await ordenStock('PR006', '12', 20, dia(15), 'Pendiente');
    await ordenStock('PR005', '12', 8, dia(22), 'Pendiente');
    paso('4 órdenes de reposición de stock (una terminada)');

    // ---------- Gastos ----------
    const gastos = [
        [-28, 'Mano de obra', 'Costurera externa - semana 1', 120000],
        [-21, 'Mano de obra', 'Costurera externa - semana 2', 120000],
        [-20, 'Servicios', 'Cuenta de luz taller', 48500],
        [-14, 'Mano de obra', 'Costurera externa - semana 3', 120000],
        [-10, 'Transporte', 'Flete retiro de telas', 15000],
        [-7, 'Mano de obra', 'Costurera externa - semana 4', 120000],
        [-4, 'Mantención', 'Mantención máquina recta', 35000],
        [-1, 'Publicidad', 'Avisos redes sociales temporada', 20000],
    ];
    for (const [d, categoria, concepto, monto] of gastos) {
        await api('POST', '/finanzas/gastos', { fecha: dia(d), categoria_gasto_id: CAT(categoria), concepto, monto });
    }
    paso(`${gastos.length} gastos`);

    // ---------- Historia para la proyección ----------
    paso(`${await cargarHistoria(productos)} filas de historia mensual (24 meses)`);

    // ---------- Usuario de bodega ----------
    const usuarios = await api('GET', '/usuarios');
    if (!usuarios.some(u => u.email === 'bodega@patyca.cl')) {
        await api('POST', '/usuarios', {
            email: 'bodega@patyca.cl', nombre: 'Usuario Bodega', password: 'bodega1234',
            rol_id: catalogos.roles.find(r => r.nombre === 'Bodega').id,
        });
        paso('usuario bodega@patyca.cl (clave: bodega1234)');
    }

    console.log('\nDatos de prueba cargados.');
}

main().catch(error => {
    console.error(`Error: ${error.message}`);
    if (error.cause?.code === 'ECONNREFUSED') console.error('¿Está corriendo el servidor? Ejecute "npm run dev" en otra terminal.');
    process.exitCode = 1;
});
