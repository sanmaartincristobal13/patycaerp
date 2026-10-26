-- ======================================================
-- PATYCA ERP - BORRAR SOLO LAS VENTAS SIMULADAS
-- ======================================================
-- Elimina las ventas de prueba que cargó demo-inicio-produccion.sql
-- y deja el resto de los datos de prueba (órdenes terminadas, compras,
-- gastos, stock). Para borrar TODO lo de prueba, use demo-borrar.sql.
--
-- Borra:
--   * Ventas y encargos marcados [DEMO], con sus prendas y pagos.
--     El stock que descontaron o reservaron vuelve a su lugar.
--   * Órdenes de taller pendientes o en proceso de esos encargos
--     (sin el encargo ya no tienen para quién hacerse).
--   * Totales sin detalle [DEMO] y la historia de 24 meses de prueba
--     (gráfico de Inicio y proyección).
--
-- Las ventas de npm run db:demo no tienen marca: esas se eliminan desde
-- el sistema (Ventas → Por mes → "Eliminar ventas").
--
--   * Supabase: SQL Editor → pegar todo el archivo → Run.
-- ======================================================

BEGIN;

CREATE TEMP TABLE ventas_demo ON COMMIT DROP AS
    SELECT id, codigo FROM ventas WHERE observacion LIKE '[DEMO]%';

-- Devuelve el stock: deshace los movimientos de esas ventas en el kárdex
-- (salidas por venta y reservas de encargo).
UPDATE stock_prendas s SET stock = greatest(s.stock - m.total, 0)
FROM (
    SELECT producto_id, talla, sum(cantidad)::integer AS total
    FROM movimientos_inventario
    WHERE producto_id IS NOT NULL AND referencia IN (SELECT codigo FROM ventas_demo)
    GROUP BY producto_id, talla
) m
WHERE s.producto_id = m.producto_id AND s.talla = m.talla;

DELETE FROM movimientos_inventario WHERE referencia IN (SELECT codigo FROM ventas_demo);

DELETE FROM ordenes_produccion
WHERE venta_id IN (SELECT id FROM ventas_demo) AND estado <> 'Terminada';

DELETE FROM ventas WHERE id IN (SELECT id FROM ventas_demo);   -- borra también sus prendas y pagos
DELETE FROM ventas_resumen WHERE observacion LIKE '[DEMO]%';

DELETE FROM ventas_historicas h
USING actividad a
WHERE a.referencia = 'DEMO-HISTORIA'
  AND h.mes >= date_trunc('month', a.fecha_hora) - interval '24 months'
  AND h.mes <  date_trunc('month', a.fecha_hora);
DELETE FROM actividad WHERE referencia = 'DEMO-HISTORIA';

COMMIT;

SELECT 'Ventas de prueba que quedan' AS dato, count(*) AS cantidad FROM ventas WHERE observacion LIKE '[DEMO]%'
UNION ALL SELECT 'Ventas en total', count(*) FROM ventas
UNION ALL SELECT 'Filas de historia', count(*) FROM ventas_historicas;
