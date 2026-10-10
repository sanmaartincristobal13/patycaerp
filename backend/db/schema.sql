-- ======================================================
-- PATYCA ERP - MODELO RELACIONAL (PostgreSQL)
-- ======================================================
--
-- Convenciones:
--   * Tablas y columnas en snake_case, en español.
--   * Toda entidad tiene "id" (identity) como clave primaria.
--   * Los documentos tienen además un "codigo" legible (V-000001)
--     generado por la base a partir del id.
--   * Los montos en CLP se guardan como enteros (numeric(12,0)).
--   * Los saldos y estados de pago NO se guardan: se calculan
--     en las vistas v_ventas y v_compras a partir de los pagos.
--   * Este archivo asume una base vacía. Para recrearla desde cero:
--     npm run db:reset   (BORRA TODOS LOS DATOS)
-- ======================================================


-- ======================================================
-- SEGURIDAD
-- ======================================================

CREATE TABLE roles (
    id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text NOT NULL UNIQUE
);

-- Módulos del sistema a los que un rol tiene acceso.
CREATE TABLE rol_permisos (
    rol_id  integer NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    modulo  text    NOT NULL CHECK (modulo IN (
                'dashboard', 'catalogo', 'ventas', 'cotizaciones',
                'inventario', 'produccion', 'compras', 'finanzas',
                'reportes', 'configuracion', 'fichas')),
    PRIMARY KEY (rol_id, modulo)
);

CREATE TABLE usuarios (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email          text    NOT NULL UNIQUE CHECK (email = lower(email)),
    nombre         text    NOT NULL,
    password_hash  text    NOT NULL,
    rol_id         integer NOT NULL REFERENCES roles(id),
    activo         boolean NOT NULL DEFAULT true,
    creado_en      timestamptz NOT NULL DEFAULT now()
);


-- ======================================================
-- CONFIGURACIÓN Y CATÁLOGOS SIMPLES
-- ======================================================

-- Tabla de una sola fila (id = 1).
CREATE TABLE configuracion (
    id                            smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    empresa                       text     NOT NULL,
    taller                        text     NOT NULL,
    porcentaje_advertencia_stock  integer  NOT NULL DEFAULT 20 CHECK (porcentaje_advertencia_stock BETWEEN 0 AND 100),
    dias_aviso_vencimiento        integer  NOT NULL DEFAULT 5  CHECK (dias_aviso_vencimiento >= 0),
    saldo_inicial                 numeric(12,0) NOT NULL DEFAULT 0,
    fecha_saldo_inicial           date,
    moneda                        text     NOT NULL DEFAULT 'CLP'
);

CREATE TABLE bodegas (
    id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text NOT NULL UNIQUE
);

CREATE TABLE unidades_medida (
    id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo  text NOT NULL UNIQUE,       -- kg, g, metros, cm, unidades, rollos
    nombre  text NOT NULL
);

CREATE TABLE tipos_material (
    id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text NOT NULL UNIQUE
);

CREATE TABLE medios_pago (
    id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text NOT NULL UNIQUE
);

CREATE TABLE categorias_gasto (
    id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text NOT NULL UNIQUE
);


-- ======================================================
-- MAESTROS
-- ======================================================

-- Los establecimientos son líneas comerciales, NO clientes.
CREATE TABLE establecimientos (
    id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo       text    NOT NULL UNIQUE,
    nombre       text    NOT NULL UNIQUE,
    tipo         text    NOT NULL DEFAULT 'Establecimiento' CHECK (tipo IN ('Establecimiento', 'Línea')),
    anio_precio  integer
);

-- Telas con las que se confeccionan las prendas (Algodón, Fantasía).
-- Sus parámetros alimentan el costo y rendimiento de tela por prenda.
CREATE TABLE tipos_tela (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         text    NOT NULL UNIQUE,
    precio_kg      numeric(12,0) NOT NULL CHECK (precio_kg >= 0),
    peso_rollo_kg  numeric(6,2)  NOT NULL CHECK (peso_rollo_kg > 0),
    merma          numeric(5,4)  NOT NULL DEFAULT 0 CHECK (merma >= 0 AND merma < 1),   -- 0.05 = 5 %
    observacion    text    NOT NULL DEFAULT ''
);

-- Agrupa los productos en el punto de venta (Poleras, Pantalones...).
CREATE TABLE tipos_prenda (
    id      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre  text    NOT NULL UNIQUE,
    orden   integer NOT NULL DEFAULT 0
);

CREATE TABLE productos (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo              text    NOT NULL UNIQUE,
    establecimiento_id  integer NOT NULL REFERENCES establecimientos(id),
    tipo_prenda_id      integer REFERENCES tipos_prenda(id),
    tipo_tela_id        integer REFERENCES tipos_tela(id),
    nombre              text    NOT NULL,
    anio                integer,
    tela_principal      text    NOT NULL DEFAULT '',
    imagen              text    NOT NULL DEFAULT '',
    observaciones       text    NOT NULL DEFAULT '',
    activo              boolean NOT NULL DEFAULT true,
    UNIQUE (establecimiento_id, nombre)
);

-- Una fila por talla vendible. "grupo_precio" conserva cómo se
-- publica el precio (ej. "4-6-8") para poder mostrar la lista agrupada.
CREATE TABLE producto_tallas (
    producto_id   integer NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    talla         text    NOT NULL,
    grupo_precio  text    NOT NULL,
    precio        numeric(12,0) NOT NULL CHECK (precio >= 0),
    orden         integer NOT NULL DEFAULT 0,
    PRIMARY KEY (producto_id, talla)
);

CREATE TABLE proveedores (
    id         integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo     text NOT NULL UNIQUE,
    nombre     text NOT NULL UNIQUE,
    categoria  text NOT NULL DEFAULT '',
    rut        text,
    telefono   text,
    email      text
);

-- stock / stock_minimo / stock_objetivo en NULL significa
-- "todavía no se ha hecho conteo físico".
CREATE TABLE materiales (
    id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo            text    NOT NULL UNIQUE,
    tipo_material_id  integer NOT NULL REFERENCES tipos_material(id),
    detalle           text    NOT NULL,
    proveedor_id      integer REFERENCES proveedores(id),
    unidad_id         integer NOT NULL REFERENCES unidades_medida(id),
    ultimo_precio     numeric(12,2) NOT NULL DEFAULT 0 CHECK (ultimo_precio >= 0),
    stock             numeric(12,3),
    stock_minimo      numeric(12,3),
    stock_objetivo    numeric(12,3),
    bodega_id         integer REFERENCES bodegas(id),
    activo            boolean NOT NULL DEFAULT true
);


-- ======================================================
-- INVENTARIO DE PRENDAS TERMINADAS
-- ======================================================

CREATE TABLE stock_prendas (
    producto_id     integer NOT NULL,
    talla           text    NOT NULL,
    stock           integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_minimo    integer,
    stock_objetivo  integer,
    PRIMARY KEY (producto_id, talla),
    -- Sin CASCADE: no se puede borrar una talla que tiene stock registrado.
    FOREIGN KEY (producto_id, talla) REFERENCES producto_tallas(producto_id, talla)
);


-- ======================================================
-- COTIZACIONES
-- ======================================================

CREATE TABLE cotizaciones (
    id                integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo            text GENERATED ALWAYS AS ('COT-' || lpad(id::text, 6, '0')) STORED UNIQUE,
    fecha             date    NOT NULL DEFAULT current_date,
    referencia        text    NOT NULL,           -- cliente / colegio / contacto
    descuento         numeric(12,0) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    estado            text    NOT NULL DEFAULT 'Borrador' CHECK (estado IN ('Borrador', 'Enviada', 'Aceptada', 'Rechazada')),
    observacion       text    NOT NULL DEFAULT '',
    fecha_aceptacion  date,
    usuario_id        integer REFERENCES usuarios(id),
    creado_en         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE cotizacion_items (
    id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cotizacion_id    integer NOT NULL REFERENCES cotizaciones(id) ON DELETE CASCADE,
    producto_id      integer NOT NULL,
    talla            text    NOT NULL,
    cantidad         integer NOT NULL CHECK (cantidad > 0),
    precio_unitario  numeric(12,0) NOT NULL CHECK (precio_unitario >= 0),
    FOREIGN KEY (producto_id, talla) REFERENCES producto_tallas(producto_id, talla)
);


-- ======================================================
-- VENTAS
-- ======================================================

CREATE TABLE ventas (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo         text GENERATED ALWAYS AS ('V-' || lpad(id::text, 6, '0')) STORED UNIQUE,
    fecha          date    NOT NULL DEFAULT current_date,
    descuento      numeric(12,0) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    observacion    text    NOT NULL DEFAULT '',
    cliente_nombre    text NOT NULL DEFAULT '',
    cliente_telefono  text NOT NULL DEFAULT '',
    -- Venta normal: 'Entregada' (descuenta stock al vender).
    -- Encargo: 'Por entregar' (descuenta stock al entregar).
    estado_entrega    text NOT NULL DEFAULT 'Entregada' CHECK (estado_entrega IN ('Entregada', 'Por entregar')),
    fecha_compromiso  date,                -- fecha prometida al cliente (encargos)
    fecha_entrega     date,
    cotizacion_id  integer REFERENCES cotizaciones(id),   -- si se generó desde una cotización
    usuario_id     integer REFERENCES usuarios(id),
    creado_en      timestamptz NOT NULL DEFAULT now(),
    -- Un encargo debe identificar al cliente para poder avisarle y cobrarle.
    CHECK (estado_entrega = 'Entregada' OR cliente_nombre <> '')
);

CREATE TABLE venta_items (
    id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venta_id         integer NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id      integer NOT NULL,
    talla            text    NOT NULL,
    cantidad         integer NOT NULL CHECK (cantidad > 0),
    precio_unitario  numeric(12,0) NOT NULL CHECK (precio_unitario >= 0),
    -- Encargos: prendas ya descontadas del stock y apartadas para el cliente
    -- (al registrar, o cuando el taller termina su orden).
    cantidad_reservada integer NOT NULL DEFAULT 0 CHECK (cantidad_reservada BETWEEN 0 AND cantidad),
    FOREIGN KEY (producto_id, talla) REFERENCES producto_tallas(producto_id, talla)
);

CREATE TABLE pagos_venta (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo         text GENERATED ALWAYS AS ('PV-' || lpad(id::text, 6, '0')) STORED UNIQUE,
    venta_id       integer NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    fecha          date    NOT NULL DEFAULT current_date,
    monto          numeric(12,0) NOT NULL CHECK (monto > 0),
    medio_pago_id  integer NOT NULL REFERENCES medios_pago(id),
    observacion    text    NOT NULL DEFAULT '',
    usuario_id     integer REFERENCES usuarios(id)
);


-- ======================================================
-- COMPRAS
-- ======================================================

CREATE TABLE compras (
    id            integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo        text GENERATED ALWAYS AS ('C-' || lpad(id::text, 6, '0')) STORED UNIQUE,
    fecha         date    NOT NULL DEFAULT current_date,
    proveedor_id  integer NOT NULL REFERENCES proveedores(id),
    documento     text    NOT NULL DEFAULT '',     -- N° factura / boleta
    vencimiento   date,
    usuario_id    integer REFERENCES usuarios(id),
    creado_en     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE compra_items (
    id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    compra_id        integer NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    material_id      integer NOT NULL REFERENCES materiales(id),
    cantidad         numeric(12,3) NOT NULL CHECK (cantidad > 0),
    precio_unitario  numeric(12,2) NOT NULL CHECK (precio_unitario >= 0)
);

CREATE TABLE pagos_compra (
    id             integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo         text GENERATED ALWAYS AS ('PC-' || lpad(id::text, 6, '0')) STORED UNIQUE,
    compra_id      integer NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    fecha          date    NOT NULL DEFAULT current_date,
    monto          numeric(12,0) NOT NULL CHECK (monto > 0),
    medio_pago_id  integer NOT NULL REFERENCES medios_pago(id),
    observacion    text    NOT NULL DEFAULT '',
    usuario_id     integer REFERENCES usuarios(id)
);

-- Precios históricos de referencia (compras previas al sistema, sin fecha).
CREATE TABLE compras_referencia (
    id               integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    proveedor_id     integer NOT NULL REFERENCES proveedores(id),
    material_id      integer NOT NULL REFERENCES materiales(id),
    cantidad         numeric(12,3) NOT NULL,
    precio_unitario  numeric(12,2) NOT NULL
);


-- ======================================================
-- GASTOS
-- ======================================================

CREATE TABLE gastos (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo              text GENERATED ALWAYS AS ('G-' || lpad(id::text, 6, '0')) STORED UNIQUE,
    fecha               date    NOT NULL DEFAULT current_date,
    categoria_gasto_id  integer NOT NULL REFERENCES categorias_gasto(id),
    concepto            text    NOT NULL,
    monto               numeric(12,0) NOT NULL CHECK (monto > 0),
    sin_detalle         boolean NOT NULL DEFAULT false,   -- total del mes anotado como un solo monto
    usuario_id          integer REFERENCES usuarios(id)
);


-- ======================================================
-- PRODUCCIÓN
-- ======================================================

-- Ficha técnica: una por producto y talla.
CREATE TABLE fichas_tecnicas (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id         integer NOT NULL,
    talla               text    NOT NULL,
    peso_unitario_g     numeric(10,2),         -- peso de la prenda terminada
    peso_estimado       boolean NOT NULL DEFAULT false,   -- true = estimación, false = pesaje real
    tipo_tela           text    NOT NULL DEFAULT '',
    color_tela          text    NOT NULL DEFAULT '',
    medida_pecho        numeric(6,1),
    medida_largo        numeric(6,1),
    medida_manga        numeric(6,1),
    medida_cintura      numeric(6,1),
    medida_cadera       numeric(6,1),
    medida_entrepierna  numeric(6,1),
    mano_obra           numeric(12,0) NOT NULL DEFAULT 0,
    otros_costos        numeric(12,0) NOT NULL DEFAULT 0,
    actualizada_en      timestamptz NOT NULL DEFAULT now(),
    actualizada_por     integer REFERENCES usuarios(id),
    UNIQUE (producto_id, talla),
    FOREIGN KEY (producto_id, talla) REFERENCES producto_tallas(producto_id, talla) ON DELETE CASCADE
);

-- Consumo de materiales por prenda, expresado en la unidad del inventario.
CREATE TABLE ficha_materiales (
    ficha_id     integer NOT NULL REFERENCES fichas_tecnicas(id) ON DELETE CASCADE,
    material_id  integer NOT NULL REFERENCES materiales(id),
    cantidad     numeric(12,4) NOT NULL CHECK (cantidad > 0),
    PRIMARY KEY (ficha_id, material_id)
);

CREATE TABLE ordenes_produccion (
    id                      integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo                  text GENERATED ALWAYS AS ('OP-' || lpad(id::text, 6, '0')) STORED UNIQUE,
    fecha                   date    NOT NULL DEFAULT current_date,
    producto_id             integer NOT NULL,
    talla                   text    NOT NULL,
    cantidad                integer NOT NULL CHECK (cantidad > 0),
    estado                  text    NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'En proceso', 'Terminada')),
    observacion             text    NOT NULL DEFAULT '',
    fecha_entrega           date,                -- fecha comprometida (calendario y alertas)
    fecha_finalizacion      date,
    venta_id                integer REFERENCES ventas(id) ON DELETE SET NULL,   -- encargo que la originó
    usuario_id              integer REFERENCES usuarios(id),
    FOREIGN KEY (producto_id, talla) REFERENCES producto_tallas(producto_id, talla)
);

-- ======================================================
-- HISTORIA DE VENTAS (para proyección)
-- ======================================================

-- Ventas registradas solo como total en dinero (sin detalle de prendas),
-- por ejemplo un mes antes de usar el sistema. Se suman a los montos de
-- ventas (Inicio, finanzas, gráfico de proyección), pero no a las unidades.
-- Solo debe registrarse lo que NO está ingresado venta por venta.
CREATE TABLE ventas_resumen (
    id                  integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mes                 date    NOT NULL CHECK (extract(day FROM mes) = 1),
    establecimiento_id  integer REFERENCES establecimientos(id),   -- null = varios / sin separar
    monto               numeric(12,0) NOT NULL CHECK (monto > 0),
    observacion         text    NOT NULL DEFAULT '',
    usuario_id          integer REFERENCES usuarios(id),
    creado_en           timestamptz NOT NULL DEFAULT now()
);


-- Ventas anteriores al sistema, resumidas por mes, producto y talla
-- (se importan desde cuadernos/planillas). La proyección suma esta
-- tabla con las ventas registradas en el sistema.
CREATE TABLE ventas_historicas (
    mes          date    NOT NULL CHECK (extract(day FROM mes) = 1),   -- primer día del mes
    producto_id  integer NOT NULL,
    talla        text    NOT NULL,
    unidades     integer NOT NULL CHECK (unidades >= 0),
    monto        numeric(12,0) NOT NULL CHECK (monto >= 0),
    PRIMARY KEY (mes, producto_id, talla),
    FOREIGN KEY (producto_id, talla) REFERENCES producto_tallas(producto_id, talla)
);


-- ======================================================
-- TRAZABILIDAD
-- ======================================================

-- Kardex: cada entrada/salida de stock de un material o prenda.
CREATE TABLE movimientos_inventario (
    id              integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo          text GENERATED ALWAYS AS ('MOV-' || lpad(id::text, 6, '0')) STORED UNIQUE,
    fecha_hora      timestamptz NOT NULL DEFAULT now(),
    tipo            text NOT NULL CHECK (tipo IN (
                        'Entrada por compra', 'Salida por venta', 'Reverso de venta',
                        'Ajuste manual', 'Consumo producción', 'Ingreso producción',
                        'Reserva de encargo', 'Liberación de reserva')),
    material_id     integer REFERENCES materiales(id),
    producto_id     integer,
    talla           text,
    cantidad        numeric(12,3) NOT NULL,          -- con signo
    stock_anterior  numeric(12,3),
    stock_nuevo     numeric(12,3),
    referencia      text NOT NULL DEFAULT '',       -- código del documento origen
    usuario_id      integer REFERENCES usuarios(id),
    -- Es un material o una prenda, nunca ambos.
    CHECK ((material_id IS NOT NULL AND producto_id IS NULL AND talla IS NULL)
        OR (material_id IS NULL AND producto_id IS NOT NULL AND talla IS NOT NULL)),
    FOREIGN KEY (producto_id, talla) REFERENCES producto_tallas(producto_id, talla)
);

CREATE TABLE actividad (
    id           integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fecha_hora   timestamptz NOT NULL DEFAULT now(),
    usuario_id   integer REFERENCES usuarios(id),
    modulo       text NOT NULL,
    accion       text NOT NULL DEFAULT '',
    descripcion  text NOT NULL,
    referencia   text NOT NULL DEFAULT ''
);

CREATE TABLE notificaciones_leidas (
    usuario_id  integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    clave       text    NOT NULL,           -- ej. "MAT-CRITICO-MAT-0001"
    leida_en    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, clave)
);


-- ======================================================
-- ÍNDICES
-- ======================================================

CREATE INDEX ON productos (establecimiento_id);
CREATE INDEX ON materiales (proveedor_id);
CREATE INDEX ON venta_items (venta_id);
CREATE INDEX ON venta_items (producto_id, talla);
CREATE INDEX ON pagos_venta (venta_id);
CREATE INDEX ON compra_items (compra_id);
CREATE INDEX ON pagos_compra (compra_id);
CREATE INDEX ON cotizacion_items (cotizacion_id);
CREATE INDEX ON ventas (fecha);
CREATE INDEX ON compras (fecha);
CREATE INDEX ON gastos (fecha);
CREATE INDEX ON movimientos_inventario (fecha_hora);
CREATE INDEX ON movimientos_inventario (material_id);
CREATE INDEX ON movimientos_inventario (producto_id, talla);
CREATE INDEX ON actividad (fecha_hora);
CREATE INDEX ON ordenes_produccion (fecha_entrega);


-- ======================================================
-- VISTAS (valores calculados, nunca guardados)
-- ======================================================

CREATE VIEW v_ventas AS
WITH totales AS (
    SELECT venta_id, sum(cantidad * precio_unitario) AS subtotal
    FROM venta_items GROUP BY venta_id
), pagos AS (
    SELECT venta_id, sum(monto) AS pagado
    FROM pagos_venta GROUP BY venta_id
)
SELECT
    v.*,
    coalesce(t.subtotal, 0)                                         AS subtotal,
    greatest(coalesce(t.subtotal, 0) - v.descuento, 0)              AS total,
    coalesce(p.pagado, 0)                                           AS monto_pagado,
    greatest(coalesce(t.subtotal, 0) - v.descuento, 0)
        - coalesce(p.pagado, 0)                                     AS saldo_pendiente,
    CASE
        WHEN coalesce(p.pagado, 0) = 0 THEN 'Pendiente'
        WHEN coalesce(p.pagado, 0) >= greatest(coalesce(t.subtotal, 0) - v.descuento, 0) THEN 'Pagada'
        ELSE 'Parcial'
    END                                                             AS estado_pago
FROM ventas v
LEFT JOIN totales t ON t.venta_id = v.id
LEFT JOIN pagos   p ON p.venta_id = v.id;

CREATE VIEW v_compras AS
WITH totales AS (
    SELECT compra_id, round(sum(cantidad * precio_unitario)) AS total
    FROM compra_items GROUP BY compra_id
), pagos AS (
    SELECT compra_id, sum(monto) AS pagado
    FROM pagos_compra GROUP BY compra_id
)
SELECT
    c.*,
    pr.nombre                                       AS proveedor,
    coalesce(t.total, 0)                            AS total,
    coalesce(p.pagado, 0)                           AS monto_pagado,
    coalesce(t.total, 0) - coalesce(p.pagado, 0)    AS saldo_pendiente,
    CASE
        WHEN coalesce(p.pagado, 0) = 0 THEN 'Pendiente'
        WHEN coalesce(p.pagado, 0) >= coalesce(t.total, 0) THEN 'Pagada'
        ELSE 'Parcial'
    END                                             AS estado_pago
FROM compras c
JOIN proveedores pr ON pr.id = c.proveedor_id
LEFT JOIN totales t ON t.compra_id = c.id
LEFT JOIN pagos   p ON p.compra_id = c.id;

-- Costo y rendimiento de tela por producto y talla (requiere peso y tipo de tela).
-- Igual que la planilla de rendimiento: consumo = peso × (1 + merma).
CREATE VIEW v_rendimiento_tela AS
SELECT
    f.producto_id, f.talla, f.peso_unitario_g, f.peso_estimado,
    p.nombre AS producto, e.id AS establecimiento_id, e.nombre AS establecimiento,
    t.id AS tipo_tela_id, t.nombre AS tipo_tela, t.precio_kg, t.peso_rollo_kg, t.merma,
    pt.precio AS precio_venta, pt.orden,
    round(f.peso_unitario_g * (1 + t.merma), 1)                                    AS consumo_g,
    round(1000 / (f.peso_unitario_g * (1 + t.merma)), 2)                           AS prendas_por_kg,
    floor(t.peso_rollo_kg * 1000 / (f.peso_unitario_g * (1 + t.merma)))::int       AS prendas_por_rollo,
    round(t.peso_rollo_kg - floor(t.peso_rollo_kg * 1000 / (f.peso_unitario_g * (1 + t.merma)))
          * f.peso_unitario_g * (1 + t.merma) / 1000, 2)                           AS sobrante_rollo_kg,
    round(f.peso_unitario_g * (1 + t.merma) / 1000 * t.precio_kg)                  AS costo_tela,
    round(100 * f.peso_unitario_g * (1 + t.merma) / 1000 * t.precio_kg / nullif(pt.precio, 0), 1) AS costo_tela_pct
FROM fichas_tecnicas f
JOIN productos p ON p.id = f.producto_id
JOIN establecimientos e ON e.id = p.establecimiento_id
JOIN tipos_tela t ON t.id = p.tipo_tela_id
JOIN producto_tallas pt ON pt.producto_id = f.producto_id AND pt.talla = f.talla
WHERE f.peso_unitario_g > 0;

CREATE VIEW v_cotizaciones AS
SELECT
    c.*,
    coalesce(sum(i.cantidad * i.precio_unitario), 0)                         AS subtotal,
    greatest(coalesce(sum(i.cantidad * i.precio_unitario), 0) - c.descuento, 0) AS total
FROM cotizaciones c
LEFT JOIN cotizacion_items i ON i.cotizacion_id = c.id
GROUP BY c.id;
