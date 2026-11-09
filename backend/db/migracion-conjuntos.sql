-- ======================================================
-- PATYCA ERP - MIGRACIÓN: PRODUCTOS CONJUNTO (BUZO)
-- ======================================================
-- El Buzo (Polerón y Pantalón) pasa a ser un conjunto de dos partes:
--
--   * Al vender un buzo se descuenta 1 polerón y 1 pantalón de buzo
--     de la misma talla. El buzo no tiene stock propio.
--   * Stock disponible del buzo = el menor entre sus partes, así se
--     puede vender aunque nunca se haya contado "buzo completo".
--   * Si había stock contado de buzos completos, se suma a cada parte
--     (cada buzo completo es 1 polerón + 1 pantalón) y queda en 0.
--
-- No borra datos. Se puede ejecutar más de una vez sin problema.
--   * Supabase: SQL Editor → pegar todo el archivo → Run.
-- Las instalaciones nuevas (npm run db:init) ya traen estos cambios.
-- ======================================================

BEGIN;

CREATE TABLE IF NOT EXISTS producto_componentes (
    producto_id    integer NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    componente_id  integer NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    PRIMARY KEY (producto_id, componente_id),
    CHECK (producto_id <> componente_id)
);

CREATE OR REPLACE VIEW v_stock_prendas AS
SELECT pt.producto_id, pt.talla,
       CASE WHEN c.partes > 0 THEN c.stock ELSE sp.stock END AS stock,
       sp.stock_minimo, sp.stock_objetivo,
       c.partes > 0 AS es_conjunto
FROM producto_tallas pt
LEFT JOIN stock_prendas sp ON sp.producto_id = pt.producto_id AND sp.talla = pt.talla
CROSS JOIN LATERAL (
    SELECT count(*) AS partes,
           CASE WHEN count(cs.stock) = count(*) THEN min(cs.stock) END AS stock
    FROM producto_componentes pc
    LEFT JOIN stock_prendas cs ON cs.producto_id = pc.componente_id AND cs.talla = pt.talla
    WHERE pc.producto_id = pt.producto_id
) c;

-- Buzo de cada establecimiento = su Polerón de Buzo + Pantalón de Buzo.
INSERT INTO producto_componentes (producto_id, componente_id)
SELECT b.id, c.id
FROM productos b
JOIN productos c ON c.establecimiento_id = b.establecimiento_id
                AND c.nombre IN ('Polerón de Buzo', 'Pantalón de Buzo')
WHERE b.nombre ~* '^buzo'
ON CONFLICT DO NOTHING;

-- Buzos completos ya contados: se suman a cada parte (con registro en el kárdex).
CREATE TEMP TABLE traspaso ON COMMIT DROP AS
SELECT pc.componente_id, sp.talla, sp.stock, sp.producto_id AS conjunto_id
FROM stock_prendas sp
JOIN producto_componentes pc ON pc.producto_id = sp.producto_id
JOIN producto_tallas pt ON pt.producto_id = pc.componente_id AND pt.talla = sp.talla
WHERE sp.stock > 0;

INSERT INTO stock_prendas (producto_id, talla, stock)
SELECT componente_id, talla, 0 FROM traspaso
ON CONFLICT DO NOTHING;

INSERT INTO movimientos_inventario (tipo, producto_id, talla, cantidad, stock_anterior, stock_nuevo, referencia)
SELECT 'Ajuste manual', t.componente_id, t.talla, t.stock, sp.stock, sp.stock + t.stock, 'Buzo completo pasa a sus partes'
FROM traspaso t
JOIN stock_prendas sp ON sp.producto_id = t.componente_id AND sp.talla = t.talla;

UPDATE stock_prendas sp SET stock = sp.stock + t.stock
FROM traspaso t
WHERE sp.producto_id = t.componente_id AND sp.talla = t.talla;

INSERT INTO movimientos_inventario (tipo, producto_id, talla, cantidad, stock_anterior, stock_nuevo, referencia)
SELECT DISTINCT 'Ajuste manual', t.conjunto_id, t.talla, -t.stock, t.stock, 0, 'Buzo completo pasa a sus partes'
FROM traspaso t;

UPDATE stock_prendas sp SET stock = 0
FROM traspaso t
WHERE sp.producto_id = t.conjunto_id AND sp.talla = t.talla;

COMMIT;
