// Importa los pesos por talla de la planilla "Pesos_uniformes_rendimiento_tela.xlsx"
// (extraídos a db/datos/pesos_uniformes.json) y asigna el tipo de tela.
//
//   npm run db:pesos     (con el servidor corriendo)
//
// Cada peso queda marcado como real o estimado (celdas amarillas de la planilla).
// El peso del Buzo (conjunto) se calcula como polerón + pantalón.

const fs = require('fs');
const path = require('path');

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

// Nombre en la planilla -> producto del catálogo, por colegio.
// "crear" = no existía en el catálogo; se crea con precio de prueba.
const EQUIVALENCIAS = {
    'Colegio Pablo Neruda': {
        'Polera': { producto: 'Polera Polo M/C' },
        'Pantalón': { producto: 'Pantalón de Buzo' },
        'Polerón': { producto: 'Polerón de Buzo' },
        'Polar prestina con gorro': { producto: 'Polar con gorro (prestina)', crear: { '4-6-8': 19000, '10-12': 20000, '14-16': 21000, 'S-M': 23000, 'L-XL': 24000 } },
        'Polar sin gorro': { producto: 'Polar sin gorro', crear: { '4-6-8': 17000, '10-12': 18000, '14-16': 19000, 'S-M': 21000, 'L-XL': 22000 } },
    },
    'Escuela Numpay': {
        'Polera piqué': { producto: 'Polera Piqué M/C' },
        'Pantalón': { producto: 'Pantalón de Buzo' },
        'Polerón': { producto: 'Polerón de Buzo' },
    },
};

async function main() {
    token = (await api('POST', '/auth/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD })).token;
    const datos = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'db', 'datos', 'pesos_uniformes.json'), 'utf8'));
    const [establecimientos, { tiposTela, tiposPrenda }] = await Promise.all([api('GET', '/establecimientos'), api('GET', '/catalogos')]);
    let productos = await api('GET', '/productos');

    const cuerpoProducto = (p, cambios) => ({
        establecimiento_id: p.establecimiento_id, tipo_prenda_id: p.tipo_prenda_id, tipo_tela_id: p.tipo_tela_id,
        nombre: p.nombre, anio: p.anio, tela_principal: p.tela_principal, imagen: p.imagen, observaciones: p.observaciones,
        precios: p.precios.map(g => ({ grupo: g.grupo, precio: g.precio })),
        ...cambios,
    });

    for (const colegio of datos.colegios) {
        const est = establecimientos.find(e => e.nombre === colegio.establecimiento);
        if (!est) { console.log(`! No existe el establecimiento ${colegio.establecimiento}`); continue; }
        const tela = tiposTela.find(t => t.nombre === colegio.tela);
        const pesosPorProducto = {};

        for (const prenda of colegio.prendas) {
            const eq = EQUIVALENCIAS[colegio.establecimiento]?.[prenda.excel];
            if (!eq) { console.log(`! Sin equivalencia: ${colegio.establecimiento} / ${prenda.excel}`); continue; }

            let producto = productos.find(p => p.establecimiento_id === est.id && p.nombre === eq.producto);
            if (!producto && eq.crear) {
                producto = await api('POST', '/productos', {
                    establecimiento_id: est.id, nombre: eq.producto, anio: new Date().getFullYear(),
                    tipo_prenda_id: tiposPrenda.find(t => t.nombre === prenda.tipo)?.id, tipo_tela_id: tela.id,
                    observaciones: 'Precio de prueba: reemplazar por la lista real',
                    precios: Object.entries(eq.crear).map(([grupo, precio]) => ({ grupo, precio })),
                });
                productos.push(producto);
                console.log(`+ Producto creado: ${est.nombre} · ${producto.nombre} (${producto.codigo})`);
            }
            if (!producto) { console.log(`! No está en el catálogo: ${est.nombre} / ${eq.producto}`); continue; }

            if (producto.tipo_tela_id !== tela.id) {
                await api('PUT', `/productos/${producto.id}`, cuerpoProducto(producto, { tipo_tela_id: tela.id }));
            }
            const tallas = new Set(producto.precios.flatMap(g => g.tallas));
            let cargados = 0;
            for (const [talla, { g, estimado }] of Object.entries(prenda.pesos)) {
                if (!tallas.has(talla)) continue;
                await api('PATCH', `/produccion/fichas/${producto.id}/${encodeURIComponent(talla)}/peso`, { peso_unitario_g: g, peso_estimado: estimado });
                cargados++;
            }
            pesosPorProducto[prenda.excel] = prenda.pesos;
            console.log(`· ${est.nombre} · ${producto.nombre}: ${cargados} tallas (${colegio.tela})`);
        }

        // Buzo (conjunto) = polerón + pantalón del mismo colegio.
        const buzo = productos.find(p => p.establecimiento_id === est.id && /^buzo/i.test(p.nombre));
        const poleron = pesosPorProducto['Polerón'];
        const pantalon = pesosPorProducto['Pantalón'];
        if (buzo && poleron && pantalon) {
            if (buzo.tipo_tela_id !== tela.id) {
                await api('PUT', `/productos/${buzo.id}`, cuerpoProducto(buzo, { tipo_tela_id: tela.id }));
            }
            let cargados = 0;
            for (const talla of buzo.precios.flatMap(g => g.tallas)) {
                if (!poleron[talla] || !pantalon[talla]) continue;
                await api('PATCH', `/produccion/fichas/${buzo.id}/${encodeURIComponent(talla)}/peso`, {
                    peso_unitario_g: poleron[talla].g + pantalon[talla].g,
                    peso_estimado: poleron[talla].estimado || pantalon[talla].estimado,
                });
                cargados++;
            }
            console.log(`· ${est.nombre} · ${buzo.nombre}: ${cargados} tallas (polerón + pantalón)`);
        }
    }
    console.log('\nPesos importados.');
}

main().catch(error => {
    console.error(`Error: ${error.message}`);
    if (error.cause?.code === 'ECONNREFUSED') console.error('¿Está corriendo el servidor? Ejecute "npm run dev" en otra terminal.');
    process.exitCode = 1;
});
