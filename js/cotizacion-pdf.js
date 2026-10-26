// ======================================================
// COTIZACIÓN EN PDF
// ======================================================
// Arma el PDF de una cotización con jsPDF (js/vendor/, se carga
// solo la primera vez que se pide un PDF). Bloques:
//   1. Encabezado: título, lema y datos del emisor (Configuración).
//   2. Cliente: SEÑORES.
//   3. Detalle: Producto | Cantidad | Característica | P. Unitario | Total $.
//   4. Totales: NETO, IVA (19 %) y TOTAL.
//   5. Cierre, firma (imagen) y nombre del responsable.
// ======================================================

const cotizacionPdf = (() => {

    const NAVY = [22, 32, 51];
    const GOLD = [198, 155, 71];
    const GRIS = [102, 112, 133];
    const FONDO = [247, 240, 226];

    let cargando = null;

    function cargarScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error('No se pudo cargar el generador de PDF.'));
            document.head.appendChild(s);
        });
    }

    // jsPDF primero; el plugin de tablas se engancha a él.
    function cargarLibreria() {
        cargando ??= cargarScript('js/vendor/jspdf.umd.min.js')
            .then(() => cargarScript('js/vendor/jspdf.plugin.autotable.min.js'))
            .catch(e => { cargando = null; throw e; });
        return cargando;
    }

    // $1.234.567 (sin decimales, formato chileno)
    const pesos = n => fmtCLP(n);

    // Escribe un texto ajustado al ancho y devuelve la nueva posición vertical.
    function parrafo(doc, texto, x, y, ancho, alto = 4.6) {
        const lineas = doc.splitTextToSize(texto, ancho);
        doc.text(lineas, x, y);
        return y + lineas.length * alto;
    }

    function generar(cot, config) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const ancho = doc.internal.pageSize.getWidth();
        const alto = doc.internal.pageSize.getHeight();
        const m = 16;                      // margen
        const util = ancho - 2 * m;

        // ---------- 1. Encabezado institucional ----------
        doc.setFillColor(...NAVY);
        doc.rect(0, 0, ancho, 5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(...NAVY);
        doc.text('COTIZACIÓN', m, 22);

        // Recuadro con número y fecha
        const caja = { w: 58, h: 18 };
        const cx = ancho - m - caja.w;
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(0.5);
        doc.roundedRect(cx, 12, caja.w, caja.h, 2, 2);
        doc.setFontSize(9);
        doc.setTextColor(...GRIS);
        doc.setFont('helvetica', 'normal');
        doc.text('N°', cx + 4, 19);
        doc.text('Fecha', cx + 4, 26);
        doc.setTextColor(...NAVY);
        doc.setFont('helvetica', 'bold');
        doc.text(cot.codigo, cx + caja.w - 4, 19, { align: 'right' });
        doc.text(fmtFecha(cot.fecha), cx + caja.w - 4, 26, { align: 'right' });

        let y = 30;
        if (config.cotizacion_lema) {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.setTextColor(...GRIS);
            y = parrafo(doc, config.cotizacion_lema, m, y, util - caja.w - 6, 4.6);
        }

        // Datos del emisor
        y = Math.max(y, 34) + 3;
        doc.setDrawColor(...GOLD);
        doc.setLineWidth(0.3);
        doc.line(m, y, ancho - m, y);
        y += 6;
        doc.setTextColor(...NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(config.emisor_nombre || '', m, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const datosEmisor = [
            ['RUT', config.emisor_rut],
            ['Giro', config.emisor_giro],
            ['Dirección', config.emisor_direccion],
            ['Teléfonos', config.emisor_telefonos],
            ['Correo', config.emisor_correo],
        ].filter(([, valor]) => valor);
        // Dos columnas para que el encabezado no ocupe media hoja.
        const mitad = Math.ceil(datosEmisor.length / 2);
        datosEmisor.forEach(([etiqueta, valor], i) => {
            const columna = i < mitad ? 0 : 1;
            const fila = i < mitad ? i : i - mitad;
            const x = m + columna * (util / 2);
            doc.setFont('helvetica', 'bold');
            doc.text(`${etiqueta}:`, x, y + fila * 4.8);
            doc.setFont('helvetica', 'normal');
            doc.text(doc.splitTextToSize(valor, util / 2 - 22)[0], x + 19, y + fila * 4.8);
        });
        y += mitad * 4.8 + 4;

        // ---------- 2. Cliente receptor ----------
        doc.setFillColor(...FONDO);
        doc.roundedRect(m, y, util, 12, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...GRIS);
        doc.text('SEÑORES:', m + 5, y + 7.6);
        doc.setFontSize(12);
        doc.setTextColor(...NAVY);
        doc.text(doc.splitTextToSize(cot.referencia, util - 35)[0], m + 28, y + 7.8);
        y += 18;

        // ---------- 3. Detalle y valores ----------
        globalThis.autoTable(doc, {
            startY: y,
            margin: { left: m, right: m },
            head: [['Producto', 'Cantidad', 'Característica', 'P. Unitario', 'Total $']],
            body: cot.items.map(i => [
                i.producto, fmtNumero(i.cantidad), i.caracteristica || '',
                pesos(i.precio_unitario), pesos(i.total),
            ]),
            styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.4, textColor: [40, 40, 40], lineColor: [227, 231, 236], lineWidth: 0.2 },
            headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', halign: 'center' },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: {
                0: { cellWidth: 52 },
                1: { cellWidth: 20, halign: 'center' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 26, halign: 'right' },
                4: { cellWidth: 28, halign: 'right' },
            },
        });
        y = doc.lastAutoTable.finalY + 4;

        // ---------- 4. Totales ----------
        const filasTotales = [
            ...(Number(cot.descuento) ? [['DESCUENTO', `-${pesos(cot.descuento)}`]] : []),
            ['NETO', pesos(cot.neto)],
            ['IVA (19%)', pesos(cot.iva)],
            ['TOTAL', pesos(cot.total)],
        ];
        const bloque = 80;
        if (y + filasTotales.length * 8 > alto - 20) { doc.addPage(); y = 20; }
        filasTotales.forEach(([etiqueta, valor], i) => {
            const esTotal = etiqueta === 'TOTAL';
            const fy = y + i * 8;
            if (esTotal) {
                doc.setFillColor(...NAVY);
                doc.rect(ancho - m - bloque, fy, bloque, 8, 'F');
                doc.setTextColor(255, 255, 255);
            } else {
                doc.setDrawColor(227, 231, 236);
                doc.rect(ancho - m - bloque, fy, bloque, 8);
                doc.setTextColor(...NAVY);
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(esTotal ? 11 : 9.5);
            doc.text(etiqueta, ancho - m - bloque + 4, fy + 5.4);
            doc.text(valor, ancho - m - 4, fy + 5.4, { align: 'right' });
        });
        y += filasTotales.length * 8 + 10;

        // Observaciones de esta cotización (plazos, condiciones...)
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(9.5);
        if (cot.observacion) {
            if (y > alto - 30) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'bold');
            doc.text('Observaciones', m, y);
            doc.setFont('helvetica', 'normal');
            y = parrafo(doc, cot.observacion, m, y + 5, util) + 4;
        }

        // ---------- 5. Cierre, firma y validación ----------
        // El cierre y la firma van siempre juntos en la misma hoja.
        const altoFirma = 22;
        doc.setFont('helvetica', 'normal');
        const lineasCierre = config.cotizacion_cierre ? doc.splitTextToSize(config.cotizacion_cierre, util).length : 0;
        if (y + lineasCierre * 4.6 + 4 + altoFirma + 22 > alto - 12) { doc.addPage(); y = 20; }
        if (config.cotizacion_cierre) {
            y = parrafo(doc, config.cotizacion_cierre, m, y, util) + 4;
        }
        const centro = ancho / 2;
        y += 4;
        if (config.firma_imagen) {
            try {
                const props = doc.getImageProperties(config.firma_imagen);
                const w = Math.min(60, altoFirma * props.width / props.height);
                doc.addImage(config.firma_imagen, centro - w / 2, y, w, w * props.height / props.width);
            } catch {
                // Imagen dañada: se deja solo la línea para firmar a mano.
            }
        }
        y += altoFirma + 2;
        doc.setDrawColor(...NAVY);
        doc.setLineWidth(0.4);
        doc.line(centro - 35, y, centro + 35, y);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...NAVY);
        doc.text(config.firma_nombre || '', centro, y + 5, { align: 'center' });
        if (config.emisor_rut) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...GRIS);
            doc.text(`RUT ${config.emisor_rut}`, centro, y + 9.5, { align: 'center' });
        }

        // Pie con número de página
        const paginas = doc.getNumberOfPages();
        for (let p = 1; p <= paginas; p++) {
            doc.setPage(p);
            doc.setFillColor(...GOLD);
            doc.rect(0, alto - 4, ancho, 4, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...GRIS);
            doc.text(`${cot.codigo} · Página ${p} de ${paginas}`, ancho - m, alto - 7, { align: 'right' });
        }
        return doc;
    }

    // Nombre del archivo: "Cotizacion COT-000003 - Corporacion de Deportes Maule.pdf"
    function nombreArchivo(cot) {
        const cliente = cot.referencia.normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^A-Za-z0-9 .-]/g, '').trim().slice(0, 60);
        return `Cotizacion ${cot.codigo}${cliente ? ' - ' + cliente : ''}.pdf`;
    }

    return {
        // Muestra la vista previa del PDF con un botón para descargarlo.
        async abrir(cotizacionId) {
            await cargarLibreria();
            const [cot, config] = await Promise.all([
                api.get(`/cotizaciones/${cotizacionId}`),
                api.get('/configuracion'),
            ]);
            const doc = generar(cot, config);
            const url = doc.output('bloburl');
            const caja = modal.abrir(`${cot.codigo} · ${cot.referencia}`, `
                <iframe class="pdf-vista" src="${url}" title="Vista previa de la cotización"></iframe>
                ${config.firma_imagen ? '' : '<p class="helper-text">Sin firma digital: puede subir la imagen de la firma en Configuración.</p>'}
                <div class="modal-actions">
                    <button type="button" class="btn" data-cerrar>Cerrar</button>
                    <button type="button" class="btn btn-primary" data-descargar>Descargar PDF</button>
                </div>`, { ancho: true });
            caja.querySelector('[data-descargar]').addEventListener('click', () => doc.save(nombreArchivo(cot)));
            document.addEventListener('modal-cerrado', () => URL.revokeObjectURL(url), { once: true });
        },
    };
})();
