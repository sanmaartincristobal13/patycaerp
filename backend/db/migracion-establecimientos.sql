-- ======================================================
-- PATYCA ERP - MIGRACIÓN: ELIMINAR / ARCHIVAR ESTABLECIMIENTOS
-- ======================================================
-- Agrega la columna "activo" a establecimientos. Un establecimiento con
-- historial (ventas, órdenes, historia...) no se borra: se archiva, deja de
-- aparecer en el catálogo y en el punto de venta, y sus ventas pasadas
-- siguen en los reportes.
--
-- No borra datos. Se puede ejecutar más de una vez.
-- Ejecutar ANTES de publicar el código nuevo en Vercel.
--   * Supabase: SQL Editor → pegar todo el archivo → Run.
-- ======================================================

ALTER TABLE establecimientos ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true;

SELECT codigo, nombre, activo FROM establecimientos ORDER BY codigo;
