import { useState, useEffect } from 'react';
import { getProductos, getCategorias, getModificadores, getOrdenes } from '../../../api/api';
import api from '../../../api/api';

// ── Helper: evalúa si un combo promocional está activo hoy ──
function comboActivoHoy(combo) {
  if (!combo.rangos_fechas || combo.rangos_fechas.length === 0) return false;
  const hoy = new Date().toISOString().split('T')[0];
  return combo.rangos_fechas.some(r => r.inicio <= hoy && hoy <= r.fin);
}

// ── Helper: evalúa si un happy hour está activo ahora ────────
export function happyHourActivaAhora(hh) {
  const ahora = new Date();
  const diaHoy = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1; // 0=Lun…6=Dom
  const horaStr = ahora.toTimeString().slice(0, 5); // "HH:MM"
  const fechaStr = ahora.toISOString().split('T')[0];

  // Verificar días permitidos
  if (hh.dias_permitidos && hh.dias_permitidos.length > 0) {
    if (!hh.dias_permitidos.includes(diaHoy)) return false;
  }

  // Verificar rango horario
  if (hh.hora_inicio && hh.hora_fin) {
    if (horaStr < hh.hora_inicio || horaStr > hh.hora_fin) return false;
  } else if (hh.hora_inicio && horaStr < hh.hora_inicio) {
    return false;
  } else if (hh.hora_fin && horaStr > hh.hora_fin) {
    return false;
  }

  // Verificar rangos de fechas (si no se repite semanalmente)
  if (!hh.se_repite_semanalmente && hh.rangos_fechas && hh.rangos_fechas.length > 0) {
    return hh.rangos_fechas.some(r => r.inicio <= fechaStr && fechaStr <= r.fin);
  }

  return true;
}

// ── Helper: calcula las líneas de descuento de HH para el carrito ──
export function calcularLineasHappyHour(happyHoursActivas, carrito, productosBase) {
  console.log('HH activas para calcular:', happyHoursActivas);
  console.log('Carrito para calcular:', carrito);
  console.log('ProductosBase disponibles:', productosBase?.length);
  const lineas = [];

  for (const hh of happyHoursActivas) {
    if (hh.tipo_promo === 'visibilidad') continue;

    for (const item of carrito) {
      if (item._es_combo) continue; // No aplicar HH a combos

      const producto = productosBase.find(p => String(p.id) === String(item.id));
      if (!producto) continue;

      // ¿Aplica a este producto o categoría?
      const aplicaProducto = hh.producto && String(hh.producto) === String(item.id);
      const aplicaCategoria = hh.categoria && String(hh.categoria) === String(producto.categoria);
      if (!aplicaProducto && !aplicaCategoria) continue;

      const precioUnit = parseFloat(item.precio_unitario_calculado ?? item.precio ?? 0);
      const cantidad = item.cantidad;

      if (hh.tipo_promo === 'precio_especial' && hh.precio_especial) {
        const precioNuevo = parseFloat(hh.precio_especial);
        const ahorro = (precioUnit - precioNuevo) * cantidad;
        if (ahorro > 0) {
          lineas.push({
            cart_id: item.cart_id,
            label: `${hh.nombre} → ${item.nombre || item.producto_nombre}`,
            tipo: 'descuento',
            monto: ahorro,
            precio_nuevo: precioNuevo,
          });
        }
      } else if (hh.tipo_promo === 'porcentaje' && hh.porcentaje_descuento) {
        const ahorro = precioUnit * cantidad * (parseFloat(hh.porcentaje_descuento) / 100);
        lineas.push({
          cart_id: item.cart_id,
          label: `${hh.nombre} (-${hh.porcentaje_descuento}%) → ${item.nombre || item.producto_nombre}`,
          tipo: 'descuento',
          monto: ahorro,
        });
      } else if (hh.tipo_promo === 'nx_y') {
        const compraX = hh.compra_x;
        const llevaY = hh.lleva_y;
        if (cantidad >= compraX) {
          const grupos = Math.floor(cantidad / compraX);
          const unidadesGratis = grupos * llevaY;
          const ahorro = precioUnit * unidadesGratis;
          lineas.push({
            cart_id: item.cart_id,
            label: `${hh.nombre} (${compraX}x${compraX - llevaY}) → ${item.nombre || item.producto_nombre}`,
            tipo: 'descuento',
            monto: ahorro,
            unidades_gratis: unidadesGratis,
          });
        }
      }
    }
  }

  return lineas;
}

// ── Helper: evalúa las reglas de negocio en tiempo real ──────
export function calcularLineasReglas(reglasActivas, carrito, tipoOrden, metodoPago) {
  const lineas = [];
  const subtotal = carrito.reduce((sum, item) => {
    const precio = parseFloat(item.precio_unitario_calculado ?? item.precio ?? 0);
    return sum + precio * item.cantidad;
  }, 0);

  const ahora = new Date();
  const diaHoy = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1;
  const horaStr = ahora.toTimeString().slice(0, 5);
  const horaNum = ahora.getHours();
  const metodoLower = (metodoPago || '').toLowerCase();

  for (const regla of reglasActivas) {
    if (!regla.activa) continue;
    if (subtotal < parseFloat(regla.monto_minimo_orden || 0)) continue;

    // Validar condiciones nuevas
    if (regla.condicion_tipo_orden && regla.condicion_tipo_orden !== 'cualquiera') {
      if (tipoOrden !== regla.condicion_tipo_orden) continue;
    }
    if (regla.condicion_metodo_pago && regla.condicion_metodo_pago !== 'cualquiera') {
      if (!metodoLower.includes(regla.condicion_metodo_pago)) continue;
    }
    if (regla.condicion_hora_inicio && regla.condicion_hora_fin) {
      if (horaStr < regla.condicion_hora_inicio || horaStr > regla.condicion_hora_fin) continue;
    }
    if (regla.dia_semana !== null && regla.dia_semana !== undefined && regla.dia_semana !== '') {
      if (parseInt(regla.dia_semana) !== diaHoy) continue;
    }

    const valor = parseFloat(regla.valor || 0);
    const monto = regla.es_porcentaje ? subtotal * valor / 100 : valor;
    const esDescuento = regla.accion_es_descuento;

    // Tipos predefinidos
    if (regla.tipo === 'recargo_llevar' && tipoOrden === 'llevar') {
      lineas.push({ label: `Recargo por llevar`, tipo: 'recargo', monto });
    } else if (regla.tipo === 'descuento_dia') {
      lineas.push({ label: `Descuento ${['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][diaHoy]}`, tipo: 'descuento', monto });
    } else if (regla.tipo === 'descuento_yape_efectivo') {
      if (['yape','efectivo','plin'].some(m => metodoLower.includes(m))) {
        lineas.push({ label: `Descuento ${metodoPago}`, tipo: 'descuento', monto });
      }
    } else if (regla.tipo === 'recargo_nocturno') {
      if (horaNum >= 22 || horaNum < 6) {
        lineas.push({ label: `Tarifa nocturna`, tipo: 'recargo', monto });
      }
    } else if (regla.tipo === 'servicio_grupo_grande') {
      lineas.push({ label: `Servicio mesa grande`, tipo: 'recargo', monto });
    } else if (regla.tipo === 'personalizada') {
      lineas.push({
        label: regla.nombre || 'Regla personalizada',
        tipo: esDescuento ? 'descuento' : 'recargo',
        monto,
      });
    }
  }

  return lineas;
}

export const usePosData = (sedeActualId, mesaId, vaciarStore) => {
  const [productosBase, setProductosBase] = useState([]);
  const [categoriasReales, setCategoriasReales] = useState([]);
  const [modificadoresGlobales, setModificadoresGlobales] = useState([]);
  const [ordenActiva, setOrdenActiva] = useState(null);
  const [combosPromocionalesHoy, setCombosPromocionalesHoy] = useState([]);
  const [happyHours, setHappyHours] = useState([]);
  const [reglasNegocio, setReglasNegocio] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!sedeActualId) {
        if (isMounted) setCargando(false);
        return;
      }
      if (isMounted) setCargando(true);

      try {
        const [
          responseProductos,
          responseCategorias,
          responseMods,
          responseOrdenes,
          responseCombos,
          responseHH,
          responseReglas,
        ] = await Promise.all([
          getProductos({ sede_id: sedeActualId }),
          getCategorias(),
          getModificadores(),
          getOrdenes({ sede_id: sedeActualId }),
          api.get('/combos-promocionales/'),
          api.get('/happy-hours/'),
          api.get('/reglas-negocio-v2/'),
        ]);

        if (!isMounted) return;

        // Productos
        const dataFormateada = responseProductos.data.map(p => ({
          ...p,
          id: p.id,
          nombre: p.nombre,
          precio: parseFloat(p.precio_base),
          categoria: p.categoria,
        }));
        setProductosBase(dataFormateada);
        setCategoriasReales(responseCategorias.data);
        setModificadoresGlobales(responseMods.data);

        // Orden activa
        const ordenViva = responseOrdenes.data.find(o =>
          String(o.mesa) === String(mesaId) &&
          o.estado !== 'completado' &&
          o.estado !== 'cancelado' &&
          o.estado_pago !== 'pagado'
        );
        setOrdenActiva(ordenViva || null);
        vaciarStore();

        // Combos promocionales activos hoy
        const combosHoy = (responseCombos.data || []).filter(comboActivoHoy);
        setCombosPromocionalesHoy(combosHoy);

        // Happy Hours activas ahora
        const hhActivas = (responseHH.data || []).filter(hh => hh.activa);
        setHappyHours(hhActivas);

        // Reglas de negocio activas
        const reglas = (responseReglas.data || []).filter(r => r.activa);
        setReglasNegocio(reglas);

      } catch (error) {
        console.error("Error al cargar datos del POS:", error);
      } finally {
        if (isMounted) setCargando(false);
      }
    };

    fetchData();

    return () => { isMounted = false; };
  }, [sedeActualId, mesaId, vaciarStore]);

  return {
    productosBase,
    categoriasReales,
    modificadoresGlobales,
    ordenActiva,
    setOrdenActiva,
    combosPromocionalesHoy,
    happyHours,
    reglasNegocio,
    cargando,
  };
};