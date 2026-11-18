-- ======================================================
-- PATYCA ERP - MIGRACIÓN: COTIZACIONES CON PRECIOS CON IVA
-- ======================================================
-- Antes la cotización guardaba precios NETOS y sumaba el IVA encima,
-- así un producto de $8.000 en el catálogo salía a $6.723.
-- Ahora usa el mismo precio del catálogo (con IVA) y separa abajo:
--   TOTAL = suma de los ítems; NETO = TOTAL / 1,19; IVA = TOTAL - NETO.
--
--   * Las cotizaciones ya guardadas se convierten (precio neto × 1,19),
--     así su total con IVA queda igual (puede variar en $1 por redondeo).
--   * No borra datos. Se puede ejecutar más de una vez: la conversión
--     se hace una sola vez (marca en el comentario de la columna).
--   * Supabase: SQL Editor → pegar todo el archivo → Run.
-- Las instalaciones nuevas (npm run db:init) ya traen estos cambios.
-- ======================================================

BEGIN;

-- ---------- Precios guardados: de neto a con IVA (solo una vez) ----------
DO $$
BEGIN
    IF col_description('cotizacion_items'::regclass,
           (SELECT attnum FROM pg_attribute
            WHERE attrelid = 'cotizacion_items'::regclass AND attname = 'precio_unitario'))
       IS DISTINCT FROM 'Con IVA' THEN
        UPDATE cotizacion_items SET precio_unitario = round(precio_unitario * 1.19);
        UPDATE cotizaciones SET descuento = round(descuento * 1.19) WHERE descuento <> 0;
    END IF;
END $$;

COMMENT ON COLUMN cotizacion_items.precio_unitario IS 'Con IVA';

-- ---------- Totales (igual a schema.sql) ----------
CREATE OR REPLACE VIEW v_cotizaciones AS
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
    round(greatest(s.subtotal - c.descuento, 0) / 1.19)                     AS neto,
    greatest(s.subtotal - c.descuento, 0)
        - round(greatest(s.subtotal - c.descuento, 0) / 1.19)               AS iva,
    greatest(s.subtotal - c.descuento, 0)                                   AS total
FROM cotizaciones c
JOIN sumas s ON s.id = c.id;

COMMIT;
