-- ======================================================
-- PATYCA ERP - BORRAR LOS DATOS DE PRUEBA
-- ======================================================
-- Elimina lo que cargó demo-inicio-produccion.sql (todo lo marcado
-- con [DEMO] / DEMO-) y devuelve el stock a como estaba.
--
--   * Supabase: SQL Editor → pegar todo el archivo → Run.
--   * psql:     psql "$DATABASE_URL" -f db/demo-borrar.sql
--
-- No se revierten: los mínimos/objetivos de stock que se definieron
-- donde estaban vacíos, ni el "último precio" de los materiales comprados.
-- ======================================================

BEGIN;

CREATE TEMP TABLE demo_refs ON COMMIT DROP AS
    SELECT codigo FROM ventas WHERE observacion LIKE '[DEMO]%'
    UNION SELECT codigo FROM ordenes_produccion WHERE observacion LIKE '[DEMO]%'
    UNION SELECT codigo FROM compras WHERE documento LIKE 'DEMO-%'
    UNION SELECT 'DEMO-CONTEO';

-- Deshace los movimientos de stock de los documentos de prueba.
UPDATE stock_prendas s SET stock = greatest(s.stock - m.total, 0)
FROM (
    SELECT producto_id, talla, sum(cantidad)::integer AS total
    FROM movimientos_inventario
    WHERE producto_id IS NOT NULL AND referencia IN (SELECT codigo FROM demo_refs)
    GROUP BY producto_id, talla
) m
WHERE s.producto_id = m.producto_id AND s.talla = m.talla;

UPDATE materiales mt SET stock = CASE
        -- Si el material no tenía conteo antes de la demo, vuelve a "sin conteo".
        WHEN NOT EXISTS (SELECT 1 FROM movimientos_inventario o
                         WHERE o.material_id = mt.id AND o.referencia NOT IN (SELECT codigo FROM demo_refs))
             AND m.total = mt.stock THEN NULL
        ELSE greatest(mt.stock - m.total, 0) END
FROM (
    SELECT material_id, sum(cantidad) AS total
    FROM movimientos_inventario
    WHERE material_id IS NOT NULL AND referencia IN (SELECT codigo FROM demo_refs)
    GROUP BY material_id
) m
WHERE mt.id = m.material_id;

DELETE FROM movimientos_inventario WHERE referencia IN (SELECT codigo FROM demo_refs);
DELETE FROM ordenes_produccion WHERE observacion LIKE '[DEMO]%';
DELETE FROM ventas WHERE observacion LIKE '[DEMO]%';        -- borra también sus prendas y pagos
DELETE FROM compras WHERE documento LIKE 'DEMO-%';          -- borra también sus ítems y pagos
DELETE FROM gastos WHERE concepto LIKE '[DEMO]%';
DELETE FROM ventas_resumen WHERE observacion LIKE '[DEMO]%';

-- Historia de la proyección: solo si la cargó el script de prueba
-- (lo deja anotado en actividad), en los 24 meses previos a esa carga.
DELETE FROM ventas_historicas h
USING actividad a
WHERE a.referencia = 'DEMO-HISTORIA'
  AND h.mes >= date_trunc('month', a.fecha_hora) - interval '24 months'
  AND h.mes <  date_trunc('month', a.fecha_hora);
DELETE FROM actividad WHERE referencia = 'DEMO-HISTORIA';

COMMIT;
