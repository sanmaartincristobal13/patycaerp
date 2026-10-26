-- ======================================================
-- PATYCA ERP - DATOS DE PRUEBA PARA INICIO Y PRODUCCIÓN
-- ======================================================
--
-- Carga datos inventados para mostrar el sistema funcionando:
--
--   Inicio
--     * Ventas al mesón del mes actual (algunas con saldo por cobrar).
--     * Encargos con retiro en distintas fechas (atrasado, por vencer,
--       a tiempo, listos para retirar y uno ya entregado).
--     * Compras (una por pagar) y gastos del mes.
--     * Prendas y materiales bajo el stock mínimo.
--
--   Proyección de ventas (y gráfico de Inicio)
--     * 24 meses de historia por producto y talla (si no había historia).
--
--   Producción
--     * Órdenes en los tres estados, con fechas de entrega repartidas
--       en el calendario (atrasadas, por vencer y a tiempo).
--     * Órdenes ligadas a encargos y órdenes de reposición de stock.
--
-- Cómo usarlo:
--   * Supabase: SQL Editor → pegar todo el archivo → Run.
--   * psql:     psql "$DATABASE_URL" -f db/demo-inicio-produccion.sql
--
-- Las fechas son relativas al día en que se ejecuta (hora de Chile).
-- Todo queda marcado con [DEMO] / DEMO- y se borra con demo-borrar.sql.
-- Si algo falla no se guarda nada (todo va en una transacción).
-- NO es para la base real de PATYCA: clientes y montos son inventados.
-- ======================================================

BEGIN;

-- Supabase trabaja en UTC: sin esto, de noche "hoy" ya sería mañana en Chile.
SET LOCAL TimeZone = 'America/Santiago';

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM ventas WHERE observacion LIKE '[DEMO]%') THEN
        RAISE EXCEPTION 'Los datos de prueba ya están cargados. Para volver a cargarlos, ejecute primero demo-borrar.sql.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM usuarios) THEN
        RAISE EXCEPTION 'La base no tiene usuarios. Ejecute primero npm run db:init.';
    END IF;
END $$;


-- ======================================================
-- FUNCIONES AUXILIARES (temporales: desaparecen al cerrar la sesión)
-- ======================================================

CREATE OR REPLACE FUNCTION pg_temp.usuario() RETURNS integer LANGUAGE sql AS
$$ SELECT id FROM usuarios ORDER BY id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION pg_temp.prod(p_codigo text) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE r integer;
BEGIN
    SELECT id INTO r FROM productos WHERE codigo = p_codigo;
    IF r IS NULL THEN RAISE EXCEPTION 'No existe el producto %', p_codigo; END IF;
    RETURN r;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.mat(p_codigo text) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE r integer;
BEGIN
    SELECT id INTO r FROM materiales WHERE codigo = p_codigo;
    IF r IS NULL THEN RAISE EXCEPTION 'No existe el material %', p_codigo; END IF;
    RETURN r;
END $$;

CREATE OR REPLACE FUNCTION pg_temp.medio(p_nombre text) RETURNS integer LANGUAGE sql AS
$$ SELECT id FROM medios_pago WHERE nombre = p_nombre $$;

CREATE OR REPLACE FUNCTION pg_temp.categoria(p_nombre text) RETURNS integer LANGUAGE sql AS
$$ SELECT id FROM categorias_gasto WHERE nombre = p_nombre $$;

-- Mueve stock de una prenda y lo anota en el kárdex.
-- Si no alcanza, primero registra un conteo (ajuste manual) por la diferencia.
CREATE OR REPLACE FUNCTION pg_temp.mover_prenda(p_prod integer, p_talla text, p_delta integer,
                                     p_tipo text, p_ref text, p_fecha date) RETURNS void LANGUAGE plpgsql AS $$
DECLARE s integer;
BEGIN
    INSERT INTO stock_prendas (producto_id, talla, stock) VALUES (p_prod, p_talla, 0) ON CONFLICT DO NOTHING;
    SELECT stock INTO s FROM stock_prendas WHERE producto_id = p_prod AND talla = p_talla FOR UPDATE;
    IF s + p_delta < 0 THEN
        INSERT INTO movimientos_inventario (fecha_hora, tipo, producto_id, talla, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
        VALUES ((p_fecha - 1) + time '09:00', 'Ajuste manual', p_prod, p_talla, -(s + p_delta), s, -p_delta, 'DEMO-CONTEO', pg_temp.usuario());
        s := -p_delta;
    END IF;
    UPDATE stock_prendas SET stock = s + p_delta WHERE producto_id = p_prod AND talla = p_talla;
    INSERT INTO movimientos_inventario (fecha_hora, tipo, producto_id, talla, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
    VALUES (p_fecha + time '10:00', p_tipo, p_prod, p_talla, p_delta, s, s + p_delta, p_ref, pg_temp.usuario());
END $$;

CREATE OR REPLACE FUNCTION pg_temp.mover_material(p_mat integer, p_delta numeric, p_tipo text,
                                       p_ref text, p_fecha date) RETURNS void LANGUAGE plpgsql AS $$
DECLARE s numeric;
BEGIN
    SELECT coalesce(stock, 0) INTO s FROM materiales WHERE id = p_mat FOR UPDATE;
    UPDATE materiales SET stock = s + p_delta WHERE id = p_mat;
    INSERT INTO movimientos_inventario (fecha_hora, tipo, material_id, cantidad, stock_anterior, stock_nuevo, referencia, usuario_id)
    VALUES (p_fecha + time '10:00', p_tipo, p_mat, p_delta, s, s + p_delta, p_ref, pg_temp.usuario());
END $$;

-- Conteo físico inicial de una prenda: solo si esa talla no tenía stock registrado.
CREATE OR REPLACE FUNCTION pg_temp.conteo_prenda(p_codigo text, p_talla text, p_stock integer, p_minimo integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE pid integer := pg_temp.prod(p_codigo);
BEGIN
    IF NOT EXISTS (SELECT 1 FROM stock_prendas WHERE producto_id = pid AND talla = p_talla) AND p_stock > 0 THEN
        PERFORM pg_temp.mover_prenda(pid, p_talla, p_stock, 'Ajuste manual', 'DEMO-CONTEO', current_date - 35);
    END IF;
    INSERT INTO stock_prendas (producto_id, talla, stock) VALUES (pid, p_talla, 0) ON CONFLICT DO NOTHING;
    UPDATE stock_prendas SET stock_minimo = p_minimo
    WHERE producto_id = pid AND talla = p_talla AND stock_minimo IS NULL;
END $$;

-- Conteo de un material: solo si todavía no tenía conteo.
CREATE OR REPLACE FUNCTION pg_temp.conteo_material(p_codigo text, p_stock numeric, p_minimo numeric, p_objetivo numeric)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE mid integer := pg_temp.mat(p_codigo);
BEGIN
    IF (SELECT stock FROM materiales WHERE id = mid) IS NULL THEN
        PERFORM pg_temp.mover_material(mid, p_stock, 'Ajuste manual', 'DEMO-CONTEO', current_date - 35);
    END IF;
    UPDATE materiales SET stock_minimo = coalesce(stock_minimo, p_minimo),
                          stock_objetivo = coalesce(stock_objetivo, p_objetivo)
    WHERE id = mid;
END $$;

-- Venta al mesón o encargo.
--   p_items:    '[["PR001","8",2], ...]'  (producto, talla, cantidad)
--   p_pago:     -1 = paga el total, 0 = sin pago, n = abono de n pesos
--   p_reservar: en encargos, true = había stock y quedó reservado al registrar
CREATE OR REPLACE FUNCTION pg_temp.venta(p_fecha date, p_cliente text, p_telefono text, p_encargo boolean,
                              p_compromiso date, p_items jsonb, p_pago integer, p_medio text,
                              p_reservar boolean DEFAULT false) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
    vid integer; vcod text; e jsonb; pid integer; precio numeric; cant integer; total numeric := 0;
BEGIN
    INSERT INTO ventas (fecha, observacion, cliente_nombre, cliente_telefono, estado_entrega,
                        fecha_compromiso, usuario_id, creado_en)
    VALUES (p_fecha, '[DEMO] dato de prueba', p_cliente, p_telefono,
            CASE WHEN p_encargo THEN 'Por entregar' ELSE 'Entregada' END,
            p_compromiso, pg_temp.usuario(), p_fecha + time '10:00')
    RETURNING id, codigo INTO vid, vcod;

    FOR e IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        pid := pg_temp.prod(e->>0);
        cant := (e->>2)::integer;
        SELECT pt.precio INTO precio FROM producto_tallas pt WHERE pt.producto_id = pid AND pt.talla = e->>1;
        IF precio IS NULL THEN RAISE EXCEPTION 'El producto % no tiene la talla %', e->>0, e->>1; END IF;

        INSERT INTO venta_items (venta_id, producto_id, talla, cantidad, precio_unitario, cantidad_reservada)
        VALUES (vid, pid, e->>1, cant, precio, CASE WHEN p_encargo AND p_reservar THEN cant ELSE 0 END);
        total := total + precio * cant;

        IF NOT p_encargo THEN
            PERFORM pg_temp.mover_prenda(pid, e->>1, -cant, 'Salida por venta', vcod, p_fecha);
        ELSIF p_reservar THEN
            PERFORM pg_temp.mover_prenda(pid, e->>1, -cant, 'Reserva de encargo', vcod, p_fecha);
        END IF;
    END LOOP;

    IF p_pago <> 0 THEN
        INSERT INTO pagos_venta (venta_id, fecha, monto, medio_pago_id, usuario_id)
        VALUES (vid, p_fecha, CASE WHEN p_pago < 0 THEN total ELSE p_pago END, pg_temp.medio(p_medio), pg_temp.usuario());
    END IF;
    RETURN vid;
END $$;

-- Pago posterior de lo que queda por cobrar de una venta.
CREATE OR REPLACE FUNCTION pg_temp.pagar_saldo(p_venta integer, p_fecha date, p_medio text) RETURNS void LANGUAGE sql AS $$
    INSERT INTO pagos_venta (venta_id, fecha, monto, medio_pago_id, usuario_id)
    SELECT id, p_fecha, saldo_pendiente, pg_temp.medio(p_medio), pg_temp.usuario()
    FROM v_ventas WHERE id = p_venta AND saldo_pendiente > 0;
$$;

-- Orden de producción. Si está terminada, las prendas entran al stock
-- y, si es de un encargo, quedan reservadas para el cliente.
CREATE OR REPLACE FUNCTION pg_temp.orden(p_fecha date, p_codigo text, p_talla text, p_cantidad integer, p_estado text,
                              p_entrega date, p_fin date, p_venta integer, p_obs text) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
    v_orden integer; ocod text; pid integer := pg_temp.prod(p_codigo); it record; restante integer; x integer;
BEGIN
    INSERT INTO ordenes_produccion (fecha, producto_id, talla, cantidad, estado, observacion,
                                    fecha_entrega, fecha_finalizacion, venta_id, usuario_id)
    VALUES (p_fecha, pid, p_talla, p_cantidad, p_estado, '[DEMO] ' || p_obs,
            p_entrega, CASE WHEN p_estado = 'Terminada' THEN p_fin END, p_venta, pg_temp.usuario())
    RETURNING id, codigo INTO v_orden, ocod;

    IF p_estado = 'Terminada' THEN
        PERFORM pg_temp.mover_prenda(pid, p_talla, p_cantidad, 'Ingreso producción', ocod, p_fin);
        IF p_venta IS NOT NULL THEN
            restante := p_cantidad;
            FOR it IN SELECT i.id, i.cantidad - i.cantidad_reservada AS falta, v.codigo
                      FROM venta_items i JOIN ventas v ON v.id = i.venta_id
                      WHERE i.venta_id = p_venta AND i.producto_id = pid AND i.talla = p_talla
                        AND i.cantidad_reservada < i.cantidad LOOP
                x := least(restante, it.falta);
                EXIT WHEN x <= 0;
                UPDATE venta_items SET cantidad_reservada = cantidad_reservada + x WHERE id = it.id;
                PERFORM pg_temp.mover_prenda(pid, p_talla, -x, 'Reserva de encargo', it.codigo, p_fin);
                restante := restante - x;
            END LOOP;
        END IF;
    END IF;
    RETURN v_orden;
END $$;

-- Compra de materiales.
--   p_items: '[["MAT-0001",20,6500], ...]'  (material, cantidad, precio unitario)
--   p_pago:  -1 = pagada completa, 0 = por pagar, n = abono de n pesos
CREATE OR REPLACE FUNCTION pg_temp.compra(p_fecha date, p_proveedor text, p_documento text, p_vencimiento date,
                               p_items jsonb, p_pago integer, p_medio text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE cid integer; ccod text; e jsonb; mid integer; total numeric := 0;
BEGIN
    INSERT INTO compras (fecha, proveedor_id, documento, vencimiento, usuario_id, creado_en)
    VALUES (p_fecha, (SELECT id FROM proveedores WHERE nombre = p_proveedor), p_documento, p_vencimiento,
            pg_temp.usuario(), p_fecha + time '10:00')
    RETURNING id, codigo INTO cid, ccod;

    FOR e IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        mid := pg_temp.mat(e->>0);
        INSERT INTO compra_items (compra_id, material_id, cantidad, precio_unitario)
        VALUES (cid, mid, (e->>1)::numeric, (e->>2)::numeric);
        total := total + round((e->>1)::numeric * (e->>2)::numeric);
        PERFORM pg_temp.mover_material(mid, (e->>1)::numeric, 'Entrada por compra', ccod, p_fecha);
        UPDATE materiales SET ultimo_precio = (e->>2)::numeric WHERE id = mid;
    END LOOP;

    IF p_pago <> 0 THEN
        INSERT INTO pagos_compra (compra_id, fecha, monto, medio_pago_id, usuario_id)
        VALUES (cid, p_fecha, CASE WHEN p_pago < 0 THEN total ELSE p_pago END, pg_temp.medio(p_medio), pg_temp.usuario());
    END IF;
END $$;


-- ======================================================
-- CARGA DE DATOS
-- ======================================================

DO $$
DECLARE
    hoy   date := current_date;
    mes0  date := date_trunc('month', current_date)::date;   -- 1° del mes actual
    e_atrasado integer; e_por_vencer integer; e_a_tiempo integer; e_listo integer;
    e_reservado integer; e_curso integer; e_entregado integer;
    v integer;
BEGIN
    -- ---------- Conteo inicial de stock ----------
    -- [producto, talla, stock, mínimo]. Los que quedan en o bajo el mínimo
    -- aparecen en "Stock bajo" de Inicio.
    PERFORM pg_temp.conteo_prenda(c.p, c.t, c.s, c.m) FROM (VALUES
        ('PR001','4',6,3), ('PR001','6',8,3), ('PR001','8',4,4), ('PR001','10',14,4), ('PR001','12',9,4),
        ('PR001','14',5,3), ('PR001','16',2,3), ('PR001','S',4,2),
        ('PR002','10',6,2), ('PR002','12',4,2),
        ('PR005','10',3,2), ('PR005','12',2,2),
        ('PR006','10',6,3), ('PR006','12',1,3), ('PR006','14',2,3),
        ('PR007','10',7,3), ('PR007','12',6,3),
        ('PR008','10',3,2), ('PR008','12',2,2),
        ('PR011','8',8,3), ('PR011','10',10,3), ('PR011','12',3,3), ('PR011','14',4,3),
        ('PR015','10',2,1), ('PR015','12',2,1),
        ('PR016','10',4,2), ('PR016','12',4,2), ('PR016','14',1,2),
        ('PR018','10',9,3), ('PR018','S',5,2),
        ('PR023','M',6,2), ('PR023','L',4,2), ('PR024','M',5,2),
        ('PR028','10',6,2), ('PR028','12',5,2), ('PR029','42',3,1)
    ) AS c(p, t, s, m);

    -- [material, stock, mínimo, objetivo]
    PERFORM pg_temp.conteo_material(c.m, c.s, c.mi, c.o) FROM (VALUES
        ('MAT-0001', 8, 15, 40),     -- Franela Polycotton Azul Rey (kg): bajo mínimo
        ('MAT-0002', 12, 10, 30),
        ('MAT-0003', 2, 2, 8),       -- Puño Polycotton (kg): en el mínimo
        ('MAT-0004', 14, 5, 20),
        ('MAT-0006', 25, 10, 40),
        ('MAT-0007', 10, 5, 20),
        ('MAT-0008', 3, 5, 15),      -- Tull Blanco (m): bajo mínimo
        ('MAT-0009', 150, 100, 300)
    ) AS c(m, s, mi, o);

    -- ---------- Ventas al mesón del mes actual ----------
    -- greatest(mes0, ...) mantiene las fechas dentro del mes aunque se ejecute a comienzos de mes.
    PERFORM pg_temp.venta(greatest(mes0, hoy - 10), '', '', false, NULL, '[["PR001","8",2],["PR007","10",1]]', -1, 'Efectivo');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 10), 'Paola Fuentes', '', false, NULL, '[["PR011","10",2]]', -1, 'Transferencia');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 9), '', '', false, NULL, '[["PR001","10",1],["PR002","10",1]]', -1, 'Tarjeta');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 8), 'Rodrigo Vera', '+56933334444', false, NULL, '[["PR006","10",1],["PR007","12",1]]', -1, 'Transferencia');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 7), '', '', false, NULL, '[["PR018","10",2]]', -1, 'Efectivo');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 6), 'Claudia Reyes', '+56955556666', false, NULL, '[["PR005","10",1],["PR001","12",2]]', 20000, 'Transferencia');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 5), '', '', false, NULL, '[["PR023","M",2]]', -1, 'Efectivo');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 5), 'Felipe Araya', '', false, NULL, '[["PR028","10",2],["PR029","42",1]]', -1, 'Tarjeta');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 4), '', '', false, NULL, '[["PR011","12",1],["PR011","8",1]]', -1, 'Efectivo');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 3), 'Marcela Díaz', '+56977778888', false, NULL, '[["PR002","12",2]]', 10000, 'Efectivo');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 2), '', '', false, NULL, '[["PR001","6",1],["PR016","10",1]]', -1, 'Tarjeta');
    PERFORM pg_temp.venta(greatest(mes0, hoy - 1), 'Tomás Pizarro', '', false, NULL, '[["PR016","12",1],["PR018","S",1]]', -1, 'Transferencia');
    PERFORM pg_temp.venta(hoy, '', '', false, NULL, '[["PR001","4",2],["PR011","14",1]]', -1, 'Efectivo');
    PERFORM pg_temp.venta(hoy, 'Javiera Contreras', '', false, NULL, '[["PR024","M",2]]', 0, 'Efectivo');

    -- ---------- Encargos ----------
    -- Atrasado: debía retirarse hace 2 días y el taller aún no termina.
    e_atrasado := pg_temp.venta(hoy - 9, 'Carolina Muñoz', '+56922223333', true, hoy - 2,
                                '[["PR008","10",2]]', 15000, 'Efectivo');
    -- Por vencer: retira en 3 días, en proceso.
    e_por_vencer := pg_temp.venta(hoy - 5, 'María Soto', '+56911112222', true, hoy + 3,
                                  '[["PR005","14",1]]', 10000, 'Efectivo');
    -- A tiempo: pagado completo, retira en 2 semanas.
    e_a_tiempo := pg_temp.venta(hoy - 3, 'Jorge Rojas', '+56944445555', true, hoy + 14,
                                '[["PR015","10",2]]', -1, 'Transferencia');
    -- Listo para retirar: el taller lo terminó ayer.
    e_listo := pg_temp.venta(hoy - 12, 'Pedro Castillo', '+56987654321', true, hoy + 1,
                             '[["PR006","14",2]]', 10000, 'Efectivo');
    -- Listo para retirar: había stock y quedó reservado al registrarlo.
    e_reservado := pg_temp.venta(hoy - 1, 'Ana Pérez', '+56966667777', true, hoy + 4,
                                 '[["PR001","10",3]]', 0, 'Efectivo', true);
    -- Pedido grande de un curso: dos prendas, retiro en casi un mes.
    e_curso := pg_temp.venta(hoy - 4, 'Directiva 4°B Colegio San Esteban', '+56912341234', true, hoy + 25,
                             '[["PR011","10",12],["PR016","10",12]]', 150000, 'Transferencia');
    -- Ya entregado y pagado.
    e_entregado := pg_temp.venta(hoy - 20, 'Luis Gutiérrez', '+56998765432', true, hoy - 10,
                                 '[["PR002","12",2]]', 8000, 'Efectivo');

    -- ---------- Órdenes de producción ----------
    -- pg_temp.orden(fecha, producto, talla, cantidad, estado, entrega, fecha_fin, encargo, observación)

    -- De encargos
    PERFORM pg_temp.orden(hoy - 9,  'PR008', '10', 2,  'En proceso', hoy - 2,  NULL,    e_atrasado,   'Encargo de Carolina Muñoz');
    PERFORM pg_temp.orden(hoy - 5,  'PR005', '14', 1,  'En proceso', hoy + 2,  NULL,    e_por_vencer, 'Encargo de María Soto');
    PERFORM pg_temp.orden(hoy - 3,  'PR015', '10', 2,  'Pendiente',  hoy + 12, NULL,    e_a_tiempo,   'Encargo de Jorge Rojas');
    PERFORM pg_temp.orden(hoy - 12, 'PR006', '14', 2,  'Terminada',  hoy,      hoy - 1, e_listo,      'Encargo de Pedro Castillo');
    PERFORM pg_temp.orden(hoy - 4,  'PR011', '10', 12, 'En proceso', hoy + 20, NULL,    e_curso,      'Pedido 4°B San Esteban - poleras');
    PERFORM pg_temp.orden(hoy - 4,  'PR016', '10', 12, 'Pendiente',  hoy + 22, NULL,    e_curso,      'Pedido 4°B San Esteban - polerones');
    PERFORM pg_temp.orden(hoy - 19, 'PR002', '12', 2,  'Terminada',  hoy - 11, hoy - 12, e_entregado, 'Encargo de Luis Gutiérrez');

    -- Reposición de stock
    PERFORM pg_temp.orden(hoy - 30, 'PR001', '8',  24, 'Terminada',  hoy - 18, hoy - 18, NULL, 'Reposición de stock');
    PERFORM pg_temp.orden(hoy - 16, 'PR011', '12', 20, 'Terminada',  hoy - 6,  hoy - 6,  NULL, 'Reposición de stock');
    PERFORM pg_temp.orden(hoy - 10, 'PR023', 'M',  15, 'Terminada',  hoy - 2,  hoy - 2,  NULL, 'Reposición de stock');
    PERFORM pg_temp.orden(hoy - 8,  'PR009', '12', 12, 'Pendiente',  hoy - 3,  NULL,     NULL, 'Reposición de stock - temporada invierno');
    PERFORM pg_temp.orden(hoy - 6,  'PR006', '12', 15, 'En proceso', hoy + 5,  NULL,     NULL, 'Reposición de stock');
    PERFORM pg_temp.orden(hoy - 2,  'PR007', '10', 18, 'En proceso', hoy + 9,  NULL,     NULL, 'Reposición de stock');
    PERFORM pg_temp.orden(hoy - 1,  'PR005', '10', 10, 'Pendiente',  hoy + 16, NULL,     NULL, 'Reposición de stock');
    PERFORM pg_temp.orden(hoy,      'PR018', '10', 20, 'Pendiente',  hoy + 30, NULL,     NULL, 'Reposición de stock');
    PERFORM pg_temp.orden(hoy,      'PR025', 'S',  8,  'Pendiente',  hoy + 40, NULL,     NULL, 'Stock para temporada escolar');
    PERFORM pg_temp.orden(hoy,      'PR001', '12', 30, 'Pendiente',  hoy + 55, NULL,     NULL, 'Stock para temporada escolar');

    -- El encargo entregado: se pagó el saldo y se retiró.
    PERFORM pg_temp.pagar_saldo(e_entregado, hoy - 10, 'Transferencia');
    UPDATE ventas SET estado_entrega = 'Entregada', fecha_entrega = hoy - 10 WHERE id = e_entregado;

    -- ---------- Compras ----------
    PERFORM pg_temp.compra(greatest(mes0, hoy - 9), 'Textil Circutex S.A.', 'DEMO-F-10412', NULL,
                           '[["MAT-0001",20,6600],["MAT-0003",4,6500]]', -1, 'Transferencia');
    PERFORM pg_temp.compra(greatest(mes0, hoy - 3), 'Comercializadora Ancar SpA', 'DEMO-B-889', hoy + 4,
                           '[["MAT-0009",100,120]]', 0, 'Transferencia');          -- por pagar
    PERFORM pg_temp.compra((mes0 - interval '1 month')::date + 8, 'Textil Circutex S.A.', 'DEMO-F-10231', NULL,
                           '[["MAT-0001",35,6500],["MAT-0002",20,5800]]', -1, 'Transferencia');
    PERFORM pg_temp.compra((mes0 - interval '1 month')::date + 19, 'Textil La Emiliana Ltda.', 'DEMO-F-5582', NULL,
                           '[["MAT-0006",30,850]]', -1, 'Transferencia');
    PERFORM pg_temp.compra((mes0 - interval '2 months')::date + 12, 'Importadora y Distribuidora G y G Limitada', 'DEMO-F-3310', NULL,
                           '[["MAT-0004",25,7200],["MAT-0005",4,8400]]', -1, 'Transferencia');
    PERFORM pg_temp.compra((mes0 - interval '3 months')::date + 5, 'Textil Circutex S.A.', 'DEMO-F-9870', NULL,
                           '[["MAT-0001",30,6400],["MAT-0002",15,5700]]', -1, 'Transferencia');

    -- ---------- Gastos del mes ----------
    INSERT INTO gastos (fecha, categoria_gasto_id, concepto, monto, usuario_id)
    SELECT greatest(mes0, hoy - g.d), pg_temp.categoria(g.cat), '[DEMO] ' || g.concepto, g.monto, pg_temp.usuario()
    FROM (VALUES
        (10, 'Mano de obra', 'Costurera externa - semana 1', 120000),
        (9,  'Servicios',    'Cuenta de luz taller', 48500),
        (6,  'Transporte',   'Flete retiro de telas', 15000),
        (3,  'Mano de obra', 'Costurera externa - semana 2', 120000),
        (2,  'Mantención',   'Mantención máquina recta', 35000),
        (1,  'Publicidad',   'Avisos redes sociales', 20000)
    ) AS g(d, cat, concepto, monto);
END $$;


-- ======================================================
-- HISTORIA DE 24 MESES PARA LA PROYECCIÓN DE VENTAS
-- ======================================================
-- Unidades vendidas por mes, producto y talla (tabla ventas_historicas),
-- igual que scripts/demo.js. Solo se carga si la tabla está vacía, para
-- no mezclarse con historia real ya importada.
--   * Estacionalidad de uniformes: peak en febrero-marzo, baja en primavera.
--   * Prendas de abrigo venden más en mayo-julio.
--   * El año anterior vendía ~12% menos y con precios más bajos.
--   * Variación "aleatoria" fija (sale igual cada vez que se carga).

INSERT INTO actividad (usuario_id, modulo, accion, descripcion, referencia)
SELECT pg_temp.usuario(), 'Proyección', 'Importar', '[DEMO] Historia de prueba de 24 meses', 'DEMO-HISTORIA'
WHERE NOT EXISTS (SELECT 1 FROM ventas_historicas);

INSERT INTO ventas_historicas (mes, producto_id, talla, unidades, monto)
SELECT mes, producto_id, talla, unidades, round(unidades * precio * CASE WHEN atras > 12 THEN 0.88 ELSE 0.94 END)
FROM (
    SELECT m.mes, m.atras, pt.producto_id, pt.talla, pt.precio,
           round(3
               -- popularidad de la prenda
               * CASE WHEN p.nombre ~ 'Polera Polo M/C|Polera Deporte' THEN 1.0
                      WHEN p.nombre ~ 'Polerón' THEN 0.7
                      WHEN p.nombre ~ 'Polera Polo M/L' THEN 0.6
                      WHEN p.nombre ~ 'Pantalón de Buzo|Buzo' THEN 0.6
                      WHEN p.nombre ~ 'Piqué|Uniforme|Camisa' THEN 0.5
                      WHEN p.nombre ~ 'Polar|Calza' THEN 0.4
                      WHEN p.nombre ~ 'Falda|Pantalón' THEN 0.35
                      WHEN p.nombre ~ 'Sweater' THEN 0.3
                      WHEN p.nombre ~ 'Vestón' THEN 0.1
                      ELSE 0.3 END
               -- tamaño del colegio
               * CASE e.nombre WHEN 'Escuela Numpay' THEN 1.0 WHEN 'Colegio San Esteban' THEN 0.8
                               WHEN 'Marca Kotting' THEN 0.6 WHEN 'Liceo Max Colin' THEN 0.5
                               ELSE 0.4 END
               -- tallas más vendidas
               * CASE pt.talla WHEN '2' THEN 0.3 WHEN '4' THEN 0.6 WHEN '6' THEN 0.8 WHEN '8' THEN 1
                               WHEN '10' THEN 1 WHEN '12' THEN 0.9 WHEN '14' THEN 0.7 WHEN '16' THEN 0.5
                               WHEN 'S' THEN 0.4 WHEN 'M' THEN 0.35 WHEN 'L' THEN 0.25
                               WHEN 'XL' THEN 0.15 WHEN 'XXL' THEN 0.08 ELSE 0.3 END
               -- estacionalidad (ene..dic)
               * (ARRAY[1.3, 2.6, 2.2, 0.9, 0.7, 0.8, 0.9, 0.6, 0.5, 0.5, 0.6, 0.9])[extract(month FROM m.mes)::int]
               -- abrigo en invierno
               * CASE WHEN p.nombre ~ 'Polar|Polerón|Buzo|Sweater|Vestón'
                       AND extract(month FROM m.mes) BETWEEN 5 AND 7 THEN 1.6 ELSE 1 END
               -- el año anterior vendía ~12% menos
               * CASE WHEN m.atras > 12 THEN 1 / 1.12 ELSE 1 END
               -- variación fija entre 0.75 y 1.25
               * (0.75 + 0.5 * (abs(hashtext(m.mes::text || '|' || pt.producto_id || '|' || pt.talla)) % 1000) / 1000.0)
           )::int AS unidades
    FROM (
        SELECT (date_trunc('month', current_date) - make_interval(months => n))::date AS mes, n AS atras
        FROM generate_series(1, 24) n
    ) m
    CROSS JOIN producto_tallas pt
    JOIN productos p ON p.id = pt.producto_id AND p.activo
    JOIN establecimientos e ON e.id = p.establecimiento_id
) h
WHERE unidades > 0
  AND NOT EXISTS (SELECT 1 FROM ventas_historicas);


-- ======================================================
-- TOTALES MENSUALES PARA EL GRÁFICO DE INICIO (últimos 12 meses)
-- ======================================================
-- Respaldo por si ya había historia real con meses vacíos: solo se agrega
-- en los meses que no tienen nada registrado (ni historia ni ventas).
-- Estacionalidad típica de uniformes: peak en febrero-marzo.

INSERT INTO ventas_resumen (mes, monto, observacion, usuario_id)
SELECT m.mes,
       round(1500000
             * (ARRAY[1.3, 2.6, 2.2, 0.9, 0.7, 0.8, 0.9, 0.6, 0.5, 0.5, 0.6, 0.9])[extract(month FROM m.mes)::int]
             * (1 - 0.01 * m.atras)                                   -- leve crecimiento en el año
             * (0.92 + 0.04 * (extract(month FROM m.mes)::int % 5))   -- variación entre meses
             / 1000) * 1000,
       '[DEMO] total del mes (dato de prueba)', pg_temp.usuario()
FROM (
    SELECT (date_trunc('month', current_date) - make_interval(months => n))::date AS mes, n AS atras
    FROM generate_series(1, 12) n
) m
WHERE NOT EXISTS (SELECT 1 FROM ventas_historicas h WHERE h.mes = m.mes)
  AND NOT EXISTS (SELECT 1 FROM ventas_resumen r WHERE r.mes = m.mes)
  AND NOT EXISTS (SELECT 1 FROM ventas v WHERE date_trunc('month', v.fecha) = m.mes
                                         AND v.observacion NOT LIKE '[DEMO]%');

INSERT INTO gastos (fecha, categoria_gasto_id, concepto, monto, sin_detalle, usuario_id)
SELECT m.mes, pg_temp.categoria('Operacional'), '[DEMO] Total de gastos del mes',
       520000 + 30000 * (extract(month FROM m.mes)::int % 4), true, pg_temp.usuario()
FROM (
    SELECT (date_trunc('month', current_date) - make_interval(months => n))::date AS mes
    FROM generate_series(1, 12) n
) m
WHERE NOT EXISTS (SELECT 1 FROM gastos g WHERE date_trunc('month', g.fecha) = m.mes
                                         AND g.concepto NOT LIKE '[DEMO]%');


COMMIT;


-- ======================================================
-- RESUMEN (va al final: el SQL Editor de Supabase muestra el último resultado)
-- ======================================================
SELECT 'Ventas y encargos' AS dato, count(*) AS cantidad FROM ventas WHERE observacion LIKE '[DEMO]%'
UNION ALL SELECT 'Órdenes de producción', count(*) FROM ordenes_produccion WHERE observacion LIKE '[DEMO]%'
UNION ALL SELECT 'Compras', count(*) FROM compras WHERE documento LIKE 'DEMO-%'
UNION ALL SELECT 'Gastos', count(*) FROM gastos WHERE concepto LIKE '[DEMO]%'
UNION ALL SELECT 'Filas de historia (proyección, 24 meses)',
                 CASE WHEN EXISTS (SELECT 1 FROM actividad WHERE referencia = 'DEMO-HISTORIA')
                      THEN (SELECT count(*) FROM ventas_historicas) ELSE 0 END
UNION ALL SELECT 'Meses de totales sin detalle (gráfico)', count(*) FROM ventas_resumen WHERE observacion LIKE '[DEMO]%';
