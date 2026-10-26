-- ======================================================
-- PATYCA ERP - MIGRACIÓN: MÓDULO DE COTIZACIONES CON PDF
-- ======================================================
-- Prepara una base existente para el módulo de cotizaciones:
--
--   * Ítems de texto libre: producto, característica (tela, estampado
--     DTF, logos...), cantidad y precio unitario NETO. Ya no es
--     obligatorio que el ítem sea un producto del catálogo.
--   * Totales con IVA: NETO, IVA (19 %) y TOTAL en la vista v_cotizaciones.
--   * Datos del emisor, textos y firma para el PDF (tabla configuracion).
--
-- No borra datos. Se puede ejecutar más de una vez sin problema.
--   * Supabase: SQL Editor → pegar todo el archivo → Run.
-- Las instalaciones nuevas (npm run db:init) ya traen estos cambios en schema.sql.
-- ======================================================

BEGIN;

-- ---------- Ítems de texto libre ----------
ALTER TABLE cotizacion_items ALTER COLUMN producto_id DROP NOT NULL;
ALTER TABLE cotizacion_items ALTER COLUMN talla DROP NOT NULL;
ALTER TABLE cotizacion_items ADD COLUMN IF NOT EXISTS descripcion    text NOT NULL DEFAULT '';
ALTER TABLE cotizacion_items ADD COLUMN IF NOT EXISTS caracteristica text NOT NULL DEFAULT '';
ALTER TABLE cotizacion_items DROP CONSTRAINT IF EXISTS cotizacion_items_producto_o_descripcion;
ALTER TABLE cotizacion_items ADD CONSTRAINT cotizacion_items_producto_o_descripcion
    CHECK (producto_id IS NOT NULL OR descripcion <> '');

-- ---------- Datos del emisor y del PDF ----------
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS emisor_nombre     text NOT NULL DEFAULT 'PATRICIA ISABEL NORAMBUENA NORAMBUENA';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS emisor_rut        text NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS emisor_giro       text NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS emisor_direccion  text NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS emisor_telefonos  text NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS emisor_correo     text NOT NULL DEFAULT '';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS cotizacion_lema   text NOT NULL
    DEFAULT 'Somos una empresa familiar de confecciones de Uniformes Escolares e Institucionales.';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS cotizacion_cierre text NOT NULL
    DEFAULT 'Agradecemos su preferencia y quedamos atentos a cualquier consulta.';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS firma_nombre      text NOT NULL DEFAULT 'PATRICIA NORAMBUENA';
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS firma_imagen      text NOT NULL DEFAULT '';   -- PNG/JPG en base64 (data URL)

-- ---------- Totales con IVA ----------
-- Los precios de la cotización son NETOS: TOTAL = NETO + IVA 19 %.
DROP VIEW IF EXISTS v_cotizaciones;
CREATE VIEW v_cotizaciones AS
WITH sumas AS (
    SELECT c.id,
           coalesce(sum(i.cantidad * i.precio_unitario), 0) AS subtotal
    FROM cotizaciones c
    LEFT JOIN cotizacion_items i ON i.cotizacion_id = c.id
    GROUP BY c.id
)
SELECT
    c.*,
    s.subtotal,
    greatest(s.subtotal - c.descuento, 0)                                   AS neto,
    round(greatest(s.subtotal - c.descuento, 0) * 0.19)                     AS iva,
    greatest(s.subtotal - c.descuento, 0)
        + round(greatest(s.subtotal - c.descuento, 0) * 0.19)               AS total
FROM cotizaciones c
JOIN sumas s ON s.id = c.id;

COMMIT;

SELECT column_name AS columna_nueva FROM information_schema.columns
WHERE table_name = 'configuracion' AND column_name IN ('emisor_nombre', 'firma_imagen')
UNION ALL
SELECT column_name FROM information_schema.columns
WHERE table_name = 'cotizacion_items' AND column_name IN ('descripcion', 'caracteristica');
