-- ======================================================
-- PATYCA ERP - DATOS INICIALES
-- ======================================================
-- Datos maestros reales de PATYCA (antes estaban escritos
-- a mano en js/data.js del front). No incluye usuarios:
-- el primer usuario se crea con "npm run db:init".
-- ======================================================

BEGIN;

-- ======================================================
-- ROLES Y PERMISOS
-- ======================================================
INSERT INTO roles (nombre) VALUES ('Administradora'), ('Bodega');

INSERT INTO rol_permisos (rol_id, modulo)
SELECT r.id, p.modulo FROM roles r JOIN (VALUES
    ('Administradora', 'dashboard'),
    ('Administradora', 'catalogo'),
    ('Administradora', 'ventas'),
    ('Administradora', 'cotizaciones'),
    ('Administradora', 'inventario'),
    ('Administradora', 'produccion'),
    ('Administradora', 'compras'),
    ('Administradora', 'finanzas'),
    ('Administradora', 'reportes'),
    ('Administradora', 'configuracion'),
    ('Administradora', 'fichas'),
    ('Bodega', 'dashboard'),
    ('Bodega', 'catalogo'),
    ('Bodega', 'inventario'),
    ('Bodega', 'produccion'),
    ('Bodega', 'compras')
) AS p(rol, modulo) ON p.rol = r.nombre;

-- ======================================================
-- CONFIGURACIÓN
-- ======================================================
INSERT INTO configuracion (empresa, taller, porcentaje_advertencia_stock, dias_aviso_vencimiento, saldo_inicial, moneda)
VALUES ('PATYCA Confecciones', 'Taller PATYCA', 20, 5, 0, 'CLP');

INSERT INTO bodegas (nombre) VALUES ('Bodega 1'), ('Bodega 2'), ('Bodega 3');

-- ======================================================
-- CATÁLOGOS (antes eran <option> fijos en index.html)
-- ======================================================
INSERT INTO unidades_medida (codigo, nombre) VALUES
    ('kg', 'Kilogramos'), ('g', 'Gramos'), ('metros', 'Metros'), ('cm', 'Centímetros'),
    ('unidades', 'Unidades'), ('rollos', 'Rollos');

INSERT INTO tipos_material (nombre) VALUES
    ('Tela'), ('Hilo'), ('Cierre'), ('Botón'), ('Elástico'), ('Etiqueta'), ('Insumo'), ('Otro');

INSERT INTO medios_pago (nombre) VALUES
    ('Transferencia'), ('Efectivo'), ('Tarjeta'), ('Otro');

INSERT INTO categorias_gasto (nombre) VALUES
    ('Mano de obra'), ('Transporte'), ('Servicios'), ('Mantención'), ('Operacional'), ('Publicidad'), ('Otro');

-- ======================================================
-- ESTABLECIMIENTOS / LÍNEAS
-- ======================================================
INSERT INTO establecimientos (codigo, nombre, tipo, anio_precio) VALUES
    ('EST-001', 'Escuela Numpay', 'Establecimiento', 2026),
    ('EST-002', 'Colegio San Esteban', 'Establecimiento', 2026),
    ('EST-003', 'Liceo Max Colin', 'Establecimiento', 2025),
    ('EST-004', 'Marca Kotting', 'Línea', 2025),
    ('EST-005', 'Colegio Pablo Neruda', 'Establecimiento', NULL),
    ('EST-006', 'Santo Tomás - San Alberto Magno / Mártir', 'Establecimiento', NULL),
    ('EST-007', 'Los Agustinos', 'Establecimiento', NULL),
    ('EST-008', 'Jardín Valle del Maule', 'Establecimiento', NULL),
    ('EST-009', 'Colegio de Nunpar', 'Establecimiento', NULL),
    ('EST-010', 'Liceo María Auxiliadora', 'Establecimiento', NULL),
    ('EST-011', 'Culemar', 'Establecimiento', NULL);

-- ======================================================
-- PROVEEDORES
-- ======================================================
INSERT INTO proveedores (codigo, nombre, categoria) VALUES
    ('PROV-001', 'Textil Circutex S.A.', 'Telas'),
    ('PROV-002', 'Albornoz y Lama', 'Insumos de confección'),
    ('PROV-003', 'Importadora y Distribuidora G y G Limitada', 'Telas'),
    ('PROV-004', 'Textil La Emiliana Ltda.', 'Telas'),
    ('PROV-005', 'Ramón Eduardo Fuentes Cuadros', 'Telas'),
    ('PROV-006', 'Meriggi Telas Limitada', 'Telas'),
    ('PROV-007', 'José Moreno y Compañía Limitada', 'Telas'),
    ('PROV-008', 'Comercial Gosen y Lecaros Limitada', 'Telas'),
    ('PROV-009', 'Comercial Cafratex Limitada', 'Telas'),
    ('PROV-010', 'Comercializadora Ancar SpA', 'Insumos'),
    ('PROV-011', 'Frontera Gráfica SpA', 'Impresión textil'),
    ('PROV-012', 'Nehemias Hilario Zarsuri Calle', 'Bordado'),
    ('PROV-013', 'Liquidadora Lupe SpA', 'Cordonería'),
    ('PROV-014', 'Rodrigo Eduardo Quiñones Lopez', 'Prendas terminadas');

-- ======================================================
-- PRODUCTOS
-- ======================================================
INSERT INTO productos (codigo, establecimiento_id, nombre, anio)
SELECT p.codigo, e.id, p.nombre, p.anio FROM (VALUES
    ('PR001', 'Escuela Numpay', 'Polera Polo M/C', 2026),
    ('PR002', 'Escuela Numpay', 'Polera Polo M/L', 2026),
    ('PR003', 'Escuela Numpay', 'Polera Piqué M/C', 2026),
    ('PR004', 'Escuela Numpay', 'Polera Piqué M/L', 2026),
    ('PR005', 'Escuela Numpay', 'Buzo (Polerón y Pantalón)', 2026),
    ('PR006', 'Escuela Numpay', 'Polerón de Buzo', 2026),
    ('PR007', 'Escuela Numpay', 'Pantalón de Buzo', 2026),
    ('PR008', 'Escuela Numpay', 'Falda', 2026),
    ('PR009', 'Escuela Numpay', 'Polar Micropolar', 2026),
    ('PR010', 'Escuela Numpay', 'Pantalón Colegio Gris Kotting', 2026),
    ('PR011', 'Colegio San Esteban', 'Polera Polo M/C', 2026),
    ('PR012', 'Colegio San Esteban', 'Polera Polo M/L', 2026),
    ('PR013', 'Colegio San Esteban', 'Polera Piqué M/C', 2026),
    ('PR014', 'Colegio San Esteban', 'Polera Piqué M/L', 2026),
    ('PR015', 'Colegio San Esteban', 'Buzo (Polerón y Pantalón)', 2026),
    ('PR016', 'Colegio San Esteban', 'Polerón de Buzo', 2026),
    ('PR017', 'Colegio San Esteban', 'Pantalón de Buzo', 2026),
    ('PR018', 'Colegio San Esteban', 'Calza', 2026),
    ('PR019', 'Colegio San Esteban', 'Polar', 2026),
    ('PR020', 'Colegio San Esteban', 'Sweater', 2026),
    ('PR021', 'Colegio San Esteban', 'Pantalón Gris Kotting', 2026),
    ('PR022', 'Colegio San Esteban', 'Falda', 2026),
    ('PR023', 'Liceo Max Colin', 'Polera Deporte M/C', 2025),
    ('PR024', 'Liceo Max Colin', 'Polera Uniforme M/C', 2025),
    ('PR025', 'Liceo Max Colin', 'Buzo', 2025),
    ('PR026', 'Liceo Max Colin', 'Polar', 2025),
    ('PR027', 'Liceo Max Colin', 'Falda', 2025),
    ('PR028', 'Marca Kotting', 'Camisa / Blusa Colegio M/C', 2025),
    ('PR029', 'Marca Kotting', 'Pantalón', 2025),
    ('PR030', 'Marca Kotting', 'Vestón / Blazer', 2025)
) AS p(codigo, establecimiento, nombre, anio)
JOIN establecimientos e ON e.nombre = p.establecimiento;

-- ======================================================
-- TIPOS DE TELA (parámetros de la planilla "Pesos_uniformes_rendimiento_tela")
-- ======================================================
-- Precio y rollo entregados por PATYCA para la tela de algodón. La planilla
-- usa un solo precio; el de fantasía queda igual hasta confirmarlo.
INSERT INTO tipos_tela (nombre, precio_kg, peso_rollo_kg, merma, observacion) VALUES
    ('Algodón', 6800, 20.4, 0.05, 'Precio sin confirmar si incluye IVA.'),
    ('Fantasía', 6800, 20.4, 0.05, 'Precio por confirmar: se copió el de algodón.');

-- ======================================================
-- TIPOS DE PRENDA (clasificación inicial por nombre; se corrige en Catálogo)
-- ======================================================
INSERT INTO tipos_prenda (nombre, orden) VALUES
    ('Poleras', 1), ('Polerones y abrigo', 2), ('Pantalones y faldas', 3), ('Buzos (conjunto)', 4), ('Otros', 5);

UPDATE productos p SET tipo_prenda_id = t.id
FROM tipos_prenda t
WHERE t.nombre = CASE
    WHEN p.nombre ~* '^buzo' THEN 'Buzos (conjunto)'          -- antes que pantalón: 'Buzo (Polerón y Pantalón)'
    WHEN p.nombre ~* 'pantal|falda|calza|short' THEN 'Pantalones y faldas'
    WHEN p.nombre ~* 'poler[oó]n|polar|sweater|vest[oó]n|chaqueta|parka' THEN 'Polerones y abrigo'
    WHEN p.nombre ~* 'polera|camisa|blusa' THEN 'Poleras'
    ELSE 'Otros'
END;

-- ======================================================
-- TALLAS Y PRECIOS (una fila por talla)
-- ======================================================
INSERT INTO producto_tallas (producto_id, talla, grupo_precio, precio, orden)
SELECT pr.id, t.talla, t.grupo, t.precio, t.orden FROM (VALUES
    ('PR001', '4', '4-6-8', 8000, 1),
    ('PR001', '6', '4-6-8', 8000, 2),
    ('PR001', '8', '4-6-8', 8000, 3),
    ('PR001', '10', '10-12', 9000, 4),
    ('PR001', '12', '10-12', 9000, 5),
    ('PR001', '14', '14-16', 10000, 6),
    ('PR001', '16', '14-16', 10000, 7),
    ('PR001', 'S', 'S-M', 10500, 8),
    ('PR001', 'M', 'S-M', 10500, 9),
    ('PR001', 'L', 'L-XL', 11500, 10),
    ('PR001', 'XL', 'L-XL', 11500, 11),
    ('PR001', 'XXL', 'XXL', 12000, 12),
    ('PR002', '4', '4-6-8', 9000, 1),
    ('PR002', '6', '4-6-8', 9000, 2),
    ('PR002', '8', '4-6-8', 9000, 3),
    ('PR002', '10', '10-12', 10000, 4),
    ('PR002', '12', '10-12', 10000, 5),
    ('PR002', '14', '14-16', 11000, 6),
    ('PR002', '16', '14-16', 11000, 7),
    ('PR002', 'S', 'S-M', 11500, 8),
    ('PR002', 'M', 'S-M', 11500, 9),
    ('PR002', 'L', 'L-XL', 12500, 10),
    ('PR002', 'XL', 'L-XL', 12500, 11),
    ('PR002', 'XXL', 'XXL', 13000, 12),
    ('PR003', '4', '4-6-8', 10000, 1),
    ('PR003', '6', '4-6-8', 10000, 2),
    ('PR003', '8', '4-6-8', 10000, 3),
    ('PR003', '10', '10-12', 11000, 4),
    ('PR003', '12', '10-12', 11000, 5),
    ('PR003', '14', '14-16', 12000, 6),
    ('PR003', '16', '14-16', 12000, 7),
    ('PR003', 'S', 'S-M', 12500, 8),
    ('PR003', 'M', 'S-M', 12500, 9),
    ('PR003', 'L', 'L-XL', 13500, 10),
    ('PR003', 'XL', 'L-XL', 13500, 11),
    ('PR003', 'XXL', 'XXL', 14000, 12),
    ('PR004', '4', '4-6-8', 11000, 1),
    ('PR004', '6', '4-6-8', 11000, 2),
    ('PR004', '8', '4-6-8', 11000, 3),
    ('PR004', '10', '10-12', 12000, 4),
    ('PR004', '12', '10-12', 12000, 5),
    ('PR004', '14', '14-16', 13000, 6),
    ('PR004', '16', '14-16', 13000, 7),
    ('PR004', 'S', 'S-M', 13500, 8),
    ('PR004', 'M', 'S-M', 13500, 9),
    ('PR004', 'L', 'L-XL', 14500, 10),
    ('PR004', 'XL', 'L-XL', 14500, 11),
    ('PR004', 'XXL', 'XXL', 15000, 12),
    ('PR005', '4', '4-6-8', 21000, 1),
    ('PR005', '6', '4-6-8', 21000, 2),
    ('PR005', '8', '4-6-8', 21000, 3),
    ('PR005', '10', '10-12', 22000, 4),
    ('PR005', '12', '10-12', 22000, 5),
    ('PR005', '14', '14-16', 23000, 6),
    ('PR005', '16', '14-16', 23000, 7),
    ('PR005', 'S', 'S-M', 24000, 8),
    ('PR005', 'M', 'S-M', 24000, 9),
    ('PR005', 'L', 'L-XL', 25000, 10),
    ('PR005', 'XL', 'L-XL', 25000, 11),
    ('PR005', 'XXL', 'XXL', 26000, 12),
    ('PR006', '4', '4-6-8', 12000, 1),
    ('PR006', '6', '4-6-8', 12000, 2),
    ('PR006', '8', '4-6-8', 12000, 3),
    ('PR006', '10', '10-12', 13000, 4),
    ('PR006', '12', '10-12', 13000, 5),
    ('PR006', '14', '14-16', 14000, 6),
    ('PR006', '16', '14-16', 14000, 7),
    ('PR006', 'S', 'S-M', 15000, 8),
    ('PR006', 'M', 'S-M', 15000, 9),
    ('PR006', 'L', 'L-XL', 16000, 10),
    ('PR006', 'XL', 'L-XL', 16000, 11),
    ('PR006', 'XXL', 'XXL', 17000, 12),
    ('PR007', '4', '4-6-8', 10000, 1),
    ('PR007', '6', '4-6-8', 10000, 2),
    ('PR007', '8', '4-6-8', 10000, 3),
    ('PR007', '10', '10-12', 11000, 4),
    ('PR007', '12', '10-12', 11000, 5),
    ('PR007', '14', '14-16', 12000, 6),
    ('PR007', '16', '14-16', 12000, 7),
    ('PR007', 'S', 'S-M', 13000, 8),
    ('PR007', 'M', 'S-M', 13000, 9),
    ('PR007', 'L', 'L-XL', 14000, 10),
    ('PR007', 'XL', 'L-XL', 14000, 11),
    ('PR007', 'XXL', 'XXL', 15000, 12),
    ('PR008', '4', '4-6-8', 15000, 1),
    ('PR008', '6', '4-6-8', 15000, 2),
    ('PR008', '8', '4-6-8', 15000, 3),
    ('PR008', '10', '10-12', 16000, 4),
    ('PR008', '12', '10-12', 16000, 5),
    ('PR008', '14', '14-16', 18000, 6),
    ('PR008', '16', '14-16', 18000, 7),
    ('PR008', 'S', 'S-M', 21000, 8),
    ('PR008', 'M', 'S-M', 21000, 9),
    ('PR008', 'L', 'L-XL', 23000, 10),
    ('PR008', 'XL', 'L-XL', 23000, 11),
    ('PR008', 'XXL', 'XXL', 25000, 12),
    ('PR009', '4', '4-6-8', 17000, 1),
    ('PR009', '6', '4-6-8', 17000, 2),
    ('PR009', '8', '4-6-8', 17000, 3),
    ('PR009', '10', '10-12', 18000, 4),
    ('PR009', '12', '10-12', 18000, 5),
    ('PR009', '14', '14-16', 19000, 6),
    ('PR009', '16', '14-16', 19000, 7),
    ('PR009', 'S', 'S-M', 21000, 8),
    ('PR009', 'M', 'S-M', 21000, 9),
    ('PR009', 'L', 'L-XL', 22000, 10),
    ('PR009', 'XL', 'L-XL', 22000, 11),
    ('PR009', 'XXL', 'XXL', 23000, 12),
    ('PR010', '4', '4-6-8', 15000, 1),
    ('PR010', '6', '4-6-8', 15000, 2),
    ('PR010', '8', '4-6-8', 15000, 3),
    ('PR010', '10', '10-12', 16000, 4),
    ('PR010', '12', '10-12', 16000, 5),
    ('PR010', '14', '14-16', 17000, 6),
    ('PR010', '16', '14-16', 17000, 7),
    ('PR010', 'S', 'S-M', 18000, 8),
    ('PR010', 'M', 'S-M', 18000, 9),
    ('PR010', 'L', 'L-XL', 18000, 10),
    ('PR010', 'XL', 'L-XL', 18000, 11),
    ('PR010', 'XXL', 'XXL', 18000, 12),
    ('PR011', '4', '4-6-8', 8000, 1),
    ('PR011', '6', '4-6-8', 8000, 2),
    ('PR011', '8', '4-6-8', 8000, 3),
    ('PR011', '10', '10-12', 9000, 4),
    ('PR011', '12', '10-12', 9000, 5),
    ('PR011', '14', '14-16', 10000, 6),
    ('PR011', '16', '14-16', 10000, 7),
    ('PR011', 'S', 'S-M', 10500, 8),
    ('PR011', 'M', 'S-M', 10500, 9),
    ('PR011', 'L', 'L-XL', 11500, 10),
    ('PR011', 'XL', 'L-XL', 11500, 11),
    ('PR011', 'XXL', 'XXL', 12000, 12),
    ('PR012', '4', '4-6-8', 9000, 1),
    ('PR012', '6', '4-6-8', 9000, 2),
    ('PR012', '8', '4-6-8', 9000, 3),
    ('PR012', '10', '10-12', 10000, 4),
    ('PR012', '12', '10-12', 10000, 5),
    ('PR012', '14', '14-16', 11000, 6),
    ('PR012', '16', '14-16', 11000, 7),
    ('PR012', 'S', 'S-M', 11500, 8),
    ('PR012', 'M', 'S-M', 11500, 9),
    ('PR012', 'L', 'L-XL', 12500, 10),
    ('PR012', 'XL', 'L-XL', 12500, 11),
    ('PR012', 'XXL', 'XXL', 13000, 12),
    ('PR013', '4', '4-6-8', 10000, 1),
    ('PR013', '6', '4-6-8', 10000, 2),
    ('PR013', '8', '4-6-8', 10000, 3),
    ('PR013', '10', '10-12', 11000, 4),
    ('PR013', '12', '10-12', 11000, 5),
    ('PR013', '14', '14-16', 12000, 6),
    ('PR013', '16', '14-16', 12000, 7),
    ('PR013', 'S', 'S-M', 12500, 8),
    ('PR013', 'M', 'S-M', 12500, 9),
    ('PR013', 'L', 'L-XL', 13500, 10),
    ('PR013', 'XL', 'L-XL', 13500, 11),
    ('PR013', 'XXL', 'XXL', 14000, 12),
    ('PR014', '4', '4-6-8', 11000, 1),
    ('PR014', '6', '4-6-8', 11000, 2),
    ('PR014', '8', '4-6-8', 11000, 3),
    ('PR014', '10', '10-12', 12000, 4),
    ('PR014', '12', '10-12', 12000, 5),
    ('PR014', '14', '14-16', 13000, 6),
    ('PR014', '16', '14-16', 13000, 7),
    ('PR014', 'S', 'S-M', 13500, 8),
    ('PR014', 'M', 'S-M', 13500, 9),
    ('PR014', 'L', 'L-XL', 14500, 10),
    ('PR014', 'XL', 'L-XL', 14500, 11),
    ('PR014', 'XXL', 'XXL', 15000, 12),
    ('PR015', '4', '4-6-8', 25000, 1),
    ('PR015', '6', '4-6-8', 25000, 2),
    ('PR015', '8', '4-6-8', 25000, 3),
    ('PR015', '10', '10-12', 27000, 4),
    ('PR015', '12', '10-12', 27000, 5),
    ('PR015', '14', '14-16', 29000, 6),
    ('PR015', '16', '14-16', 29000, 7),
    ('PR015', 'S', 'S-M', 31000, 8),
    ('PR015', 'M', 'S-M', 31000, 9),
    ('PR015', 'L', 'L-XL', 33000, 10),
    ('PR015', 'XL', 'L-XL', 33000, 11),
    ('PR015', 'XXL', 'XXL', 35000, 12),
    ('PR016', '4', '4-6-8', 14000, 1),
    ('PR016', '6', '4-6-8', 14000, 2),
    ('PR016', '8', '4-6-8', 14000, 3),
    ('PR016', '10', '10-12', 15000, 4),
    ('PR016', '12', '10-12', 15000, 5),
    ('PR016', '14', '14-16', 16000, 6),
    ('PR016', '16', '14-16', 16000, 7),
    ('PR016', 'S', 'S-M', 17000, 8),
    ('PR016', 'M', 'S-M', 17000, 9),
    ('PR016', 'L', 'L-XL', 18000, 10),
    ('PR016', 'XL', 'L-XL', 18000, 11),
    ('PR016', 'XXL', 'XXL', 19000, 12),
    ('PR017', '4', '4-6-8', 12000, 1),
    ('PR017', '6', '4-6-8', 12000, 2),
    ('PR017', '8', '4-6-8', 12000, 3),
    ('PR017', '10', '10-12', 13000, 4),
    ('PR017', '12', '10-12', 13000, 5),
    ('PR017', '14', '14-16', 14000, 6),
    ('PR017', '16', '14-16', 14000, 7),
    ('PR017', 'S', 'S-M', 15000, 8),
    ('PR017', 'M', 'S-M', 15000, 9),
    ('PR017', 'L', 'L-XL', 16000, 10),
    ('PR017', 'XL', 'L-XL', 16000, 11),
    ('PR017', 'XXL', 'XXL', 17000, 12),
    ('PR018', '4', '4-6-8', 8500, 1),
    ('PR018', '6', '4-6-8', 8500, 2),
    ('PR018', '8', '4-6-8', 8500, 3),
    ('PR018', '10', '10-12', 8500, 4),
    ('PR018', '12', '10-12', 8500, 5),
    ('PR018', '14', '14-16', 8500, 6),
    ('PR018', '16', '14-16', 8500, 7),
    ('PR018', 'S', 'S-M', 9900, 8),
    ('PR018', 'M', 'S-M', 9900, 9),
    ('PR018', 'L', 'L-XL', 9900, 10),
    ('PR018', 'XL', 'L-XL', 9900, 11),
    ('PR018', 'XXL', 'XXL', 9900, 12),
    ('PR019', '4', '4-6-8', 17000, 1),
    ('PR019', '6', '4-6-8', 17000, 2),
    ('PR019', '8', '4-6-8', 17000, 3),
    ('PR019', '10', '10-12', 19000, 4),
    ('PR019', '12', '10-12', 19000, 5),
    ('PR019', '14', '14-16', 21000, 6),
    ('PR019', '16', '14-16', 21000, 7),
    ('PR019', 'S', 'S-M', 22000, 8),
    ('PR019', 'M', 'S-M', 22000, 9),
    ('PR019', 'L', 'L-XL', 23500, 10),
    ('PR019', 'XL', 'L-XL', 23500, 11),
    ('PR019', 'XXL', 'XXL', 25000, 12),
    ('PR020', '4', '4-6-8', 15500, 1),
    ('PR020', '6', '4-6-8', 15500, 2),
    ('PR020', '8', '4-6-8', 15500, 3),
    ('PR020', '10', '10-12', 16500, 4),
    ('PR020', '12', '10-12', 16500, 5),
    ('PR020', '14', '14-16', 17500, 6),
    ('PR020', '16', '14-16', 17500, 7),
    ('PR020', 'S', 'S-M', 18500, 8),
    ('PR020', 'M', 'S-M', 18500, 9),
    ('PR020', 'L', 'L-XL', 19500, 10),
    ('PR020', 'XL', 'L-XL', 19500, 11),
    ('PR020', 'XXL', 'XXL', 20500, 12),
    ('PR021', '4', '4-6-8', 15000, 1),
    ('PR021', '6', '4-6-8', 15000, 2),
    ('PR021', '8', '4-6-8', 15000, 3),
    ('PR021', '10', '10-12', 16000, 4),
    ('PR021', '12', '10-12', 16000, 5),
    ('PR021', '14', '14-16', 17000, 6),
    ('PR021', '16', '14-16', 17000, 7),
    ('PR021', 'S', 'S-M', 18000, 8),
    ('PR021', 'M', 'S-M', 18000, 9),
    ('PR021', 'L', 'L-XL', 18000, 10),
    ('PR021', 'XL', 'L-XL', 18000, 11),
    ('PR021', 'XXL', 'XXL', 18000, 12),
    ('PR022', '4', '4-6-8', 15000, 1),
    ('PR022', '6', '4-6-8', 15000, 2),
    ('PR022', '8', '4-6-8', 15000, 3),
    ('PR022', '10', '10-12', 16000, 4),
    ('PR022', '12', '10-12', 16000, 5),
    ('PR022', '14', '14-16', 18000, 6),
    ('PR022', '16', '14-16', 18000, 7),
    ('PR022', 'S', 'S-M', 21000, 8),
    ('PR022', 'M', 'S-M', 21000, 9),
    ('PR022', 'L', 'L-XL', 23000, 10),
    ('PR022', 'XL', 'L-XL', 23000, 11),
    ('PR022', 'XXL', 'XXL', 25000, 12),
    ('PR023', '14', '14-16', 9000, 1),
    ('PR023', '16', '14-16', 9000, 2),
    ('PR023', 'S', 'S-M', 10000, 3),
    ('PR023', 'M', 'S-M', 10000, 4),
    ('PR023', 'L', 'L-XL', 11000, 5),
    ('PR023', 'XL', 'L-XL', 11000, 6),
    ('PR023', 'XXL', 'XXL', 12000, 7),
    ('PR024', '14', '14-16', 12000, 1),
    ('PR024', '16', '14-16', 12000, 2),
    ('PR024', 'S', 'S-M', 13000, 3),
    ('PR024', 'M', 'S-M', 13000, 4),
    ('PR024', 'L', 'L-XL', 13500, 5),
    ('PR024', 'XL', 'L-XL', 13500, 6),
    ('PR024', 'XXL', 'XXL', 14000, 7),
    ('PR025', '14', '14-16', 30000, 1),
    ('PR025', '16', '14-16', 30000, 2),
    ('PR025', 'S', 'S-M', 32000, 3),
    ('PR025', 'M', 'S-M', 32000, 4),
    ('PR025', 'L', 'L-XL', 33000, 5),
    ('PR025', 'XL', 'L-XL', 33000, 6),
    ('PR025', 'XXL', 'XXL', 35000, 7),
    ('PR026', '14', '14-16', 18000, 1),
    ('PR026', '16', '14-16', 18000, 2),
    ('PR026', 'S', 'S-M', 20000, 3),
    ('PR026', 'M', 'S-M', 20000, 4),
    ('PR026', 'L', 'L-XL', 22000, 5),
    ('PR026', 'XL', 'L-XL', 22000, 6),
    ('PR026', 'XXL', 'XXL', 23000, 7),
    ('PR027', '14', '14-16', 18000, 1),
    ('PR027', '16', '14-16', 18000, 2),
    ('PR027', 'S', 'S-M', 21000, 3),
    ('PR027', 'M', 'S-M', 21000, 4),
    ('PR027', 'L', 'L-XL', 23000, 5),
    ('PR027', 'XL', 'L-XL', 23000, 6),
    ('PR027', 'XXL', 'XXL', 25000, 7),
    ('PR028', '2', '2-4', 8000, 1),
    ('PR028', '4', '2-4', 8000, 2),
    ('PR028', '6', '6-8', 8000, 3),
    ('PR028', '8', '6-8', 8000, 4),
    ('PR028', '10', '10-12', 8000, 5),
    ('PR028', '12', '10-12', 8000, 6),
    ('PR028', '14', '14-16', 9900, 7),
    ('PR028', '16', '14-16', 9900, 8),
    ('PR028', 'S', 'S-M', 9900, 9),
    ('PR028', 'M', 'S-M', 9900, 10),
    ('PR028', 'L', 'L-XL', 11900, 11),
    ('PR028', 'XL', 'L-XL', 11900, 12),
    ('PR028', 'XXL', 'XXL', 11900, 13),
    ('PR029', '2', '2-4', 15000, 1),
    ('PR029', '4', '2-4', 15000, 2),
    ('PR029', '6', '6-8', 15000, 3),
    ('PR029', '8', '6-8', 15000, 4),
    ('PR029', '10', '10-12', 16000, 5),
    ('PR029', '12', '10-12', 16000, 6),
    ('PR029', '14', '14-16', 16000, 7),
    ('PR029', '16', '14-16', 16000, 8),
    ('PR029', '38', '38-40', 18000, 9),
    ('PR029', '40', '38-40', 18000, 10),
    ('PR029', '42', '42-44-46', 18000, 11),
    ('PR029', '44', '42-44-46', 18000, 12),
    ('PR029', '46', '42-44-46', 18000, 13),
    ('PR029', '48', '48-50', 18000, 14),
    ('PR029', '50', '48-50', 18000, 15),
    ('PR030', '38', '38-40', 38000, 1),
    ('PR030', '40', '38-40', 38000, 2),
    ('PR030', '42', '42-44', 38000, 3),
    ('PR030', '44', '42-44', 38000, 4),
    ('PR030', '46', '46-48', 39900, 5),
    ('PR030', '48', '46-48', 39900, 6),
    ('PR030', '50', '50-52', 39900, 7),
    ('PR030', '52', '50-52', 39900, 8)
) AS t(producto, talla, grupo, precio, orden)
JOIN productos pr ON pr.codigo = t.producto;

-- ======================================================
-- MATERIALES (stock NULL = sin conteo físico todavía)
-- ======================================================
INSERT INTO materiales (codigo, tipo_material_id, detalle, proveedor_id, unidad_id, ultimo_precio)
SELECT m.codigo, tm.id, m.detalle, pv.id, u.id, m.precio FROM (VALUES
    ('MAT-0001', 'Tela', 'Franela Polycotton Azul Rey', 'Textil Circutex S.A.', 'kg', 6500),
    ('MAT-0002', 'Tela', 'Piqué Polycotton Melange', 'Textil Circutex S.A.', 'kg', 5800),
    ('MAT-0003', 'Tela', 'Puño Polycotton 1x1 Azul Rey', 'Textil Circutex S.A.', 'kg', 6500),
    ('MAT-0004', 'Tela', 'Franela de Algodón', 'Importadora y Distribuidora G y G Limitada', 'kg', 7200),
    ('MAT-0005', 'Tela', 'Puño de Algodón', 'Importadora y Distribuidora G y G Limitada', 'kg', 8400),
    ('MAT-0006', 'Tela', 'Bistretch', 'Textil La Emiliana Ltda.', 'metros', 849),
    ('MAT-0007', 'Tela', 'Can Can', 'Comercial Gosen y Lecaros Limitada', 'metros', 790),
    ('MAT-0008', 'Tela', 'Tull Blanco', 'Comercial Cafratex Limitada', 'metros', 1470),
    ('MAT-0009', 'Insumo', 'Sesgo', 'Comercializadora Ancar SpA', 'unidades', 1588)
) AS m(codigo, tipo, detalle, proveedor, unidad, precio)
JOIN tipos_material tm ON tm.nombre = m.tipo
JOIN unidades_medida u ON u.codigo = m.unidad
LEFT JOIN proveedores pv ON pv.nombre = m.proveedor;

-- ======================================================
-- COMPRAS HISTÓRICAS DE REFERENCIA
-- ======================================================
INSERT INTO compras_referencia (proveedor_id, material_id, cantidad, precio_unitario)
SELECT pv.id, m.id, c.cantidad, c.precio FROM (VALUES
    ('Textil Circutex S.A.', 'Franela Polycotton Azul Rey', 172.2, 6500),
    ('Textil Circutex S.A.', 'Puño Polycotton 1x1 Azul Rey', 16.5, 6500),
    ('Textil Circutex S.A.', 'Piqué Polycotton Melange', 42.7, 5800)
) AS c(proveedor, material, cantidad, precio)
JOIN proveedores pv ON pv.nombre = c.proveedor
JOIN materiales m ON m.detalle = c.material;

COMMIT;
