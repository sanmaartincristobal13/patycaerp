-- ======================================================
-- PATYCA ERP - DEJAR EL SISTEMA EN BLANCO (CONSERVA EL CATÁLOGO)
-- ======================================================
-- Borra TODOS los movimientos del negocio, sean de prueba o reales,
-- para empezar a usar el sistema desde cero. NO SE PUEDE DESHACER:
-- si hay algo que importe, respalde la base antes (Supabase → Database → Backups).
--
-- SE BORRA:
--   * Ventas, encargos y sus pagos.
--   * Cotizaciones.
--   * Compras y sus pagos.
--   * Gastos.
--   * Órdenes de producción.
--   * Historia de ventas (proyección) y totales sin detalle.
--   * Stock de prendas y de materiales (quedan "sin conteo"), y el kárdex.
--   * Registro de actividad y notificaciones leídas.
--   Los códigos vuelven a partir de 1 (V-000001, C-000001, OP-000001...).
--
-- SE CONSERVA:
--   * Catálogo: colegios, productos, tallas y precios, tipos de prenda y de tela.
--   * Fichas técnicas (pesos y materiales por prenda).
--   * Materiales (con su último precio), proveedores y precios de referencia.
--   * Usuarios, roles, configuración, medios de pago y categorías de gasto.
--
--   * Supabase: SQL Editor → pegar todo el archivo → Run.
-- ======================================================

BEGIN;

TRUNCATE
    actividad, notificaciones_leidas, movimientos_inventario,
    pagos_venta, venta_items, ordenes_produccion, ventas,
    cotizacion_items, cotizaciones,
    pagos_compra, compra_items, compras,
    gastos, ventas_resumen, ventas_historicas, stock_prendas
RESTART IDENTITY;

UPDATE materiales SET stock = NULL, stock_minimo = NULL, stock_objetivo = NULL;

COMMIT;

SELECT 'Productos (catálogo)' AS dato, count(*) AS cantidad FROM productos
UNION ALL SELECT 'Tallas con precio', count(*) FROM producto_tallas
UNION ALL SELECT 'Colegios', count(*) FROM establecimientos
UNION ALL SELECT 'Fichas técnicas', count(*) FROM fichas_tecnicas
UNION ALL SELECT 'Materiales', count(*) FROM materiales
UNION ALL SELECT 'Usuarios', count(*) FROM usuarios
UNION ALL SELECT 'Ventas (debe ser 0)', count(*) FROM ventas
UNION ALL SELECT 'Órdenes (debe ser 0)', count(*) FROM ordenes_produccion
UNION ALL SELECT 'Compras (debe ser 0)', count(*) FROM compras;
