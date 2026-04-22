import React, { useState, useEffect, useRef } from 'react';
import {
  getMesas, crearOrden, getOrdenes, getNegocio, validarPinEmpleado,
  actualizarMesa, actualizarOrden, crearPago, registrarMovimientoCaja, getSedes
} from './api/api';
import ModalCobro from './ModalCobro';
import ModalCierreCaja from './ModalCierreCaja';
import usePosStore from './store/usePosStore';
import DrawerVentaRapida from './DrawerVentaRapida';
import ModalMovimientoCaja from './ModalMovimientoCaja';
import PosView from './PosView';

export default function PosTerminal({ onIrAErp }) {
  const { estadoCaja, configuracionGlobal, setConfiguracionGlobal } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const modSalonActivo = configuracionGlobal?.modulos?.salon;
  const modLlevarActivo = configuracionGlobal?.modulos?.delivery;

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [sedes, setSedes] = useState([]);
  const [sedeActualId, setSedeActualId] = useState(localStorage.getItem('sede_id') || '');
  const rolUsuario = localStorage.getItem('rol_usuario') || '';
  const esDueño = ['dueño', 'admin'].includes(rolUsuario.trim().toLowerCase());

  const [vistaLocal, setVistaLocal] = useState('salon');
  const [mesas, setMesas] = useState([]);
  const [ordenesLlevar, setOrdenesLlevar] = useState([]);
  const [todasLasOrdenesActivas, setTodasLasOrdenesActivas] = useState([]);
  const [triggerRecarga, setTriggerRecarga] = useState(false);
  const [mostrarPuertaMovil, setMostrarPuertaMovil] = useState(false);
  const [modoUnir, setModoUnir] = useState(false);
  const [mesaPrincipal, setMesaPrincipal] = useState(null);

  // Mesa seleccionada → abre el drawer POS
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);

  // Modales y drawers
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);
  const [drawerVentaRapidaAbierto, setDrawerVentaRapidaAbierto] = useState(false);
  const [modalMovimientosAbierto, setModalMovimientosAbierto] = useState(false);
  const [ordenACobrar, setOrdenACobrar] = useState(null);

  const wsRef = useRef(null);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const manejarCambioSede = (nuevaSedeId) => {
    if (!nuevaSedeId) return;
    localStorage.setItem('sede_id', nuevaSedeId);
    setSedeActualId(nuevaSedeId);
  };

  // ── Carga inicial de configuración ──────────────────────────────────────────
  useEffect(() => {
    const arrancar = async () => {
      try {
        const negocioId = localStorage.getItem('negocio_id') || 1;
        const { data } = await getNegocio(negocioId);
        if (setConfiguracionGlobal) {
          setConfiguracionGlobal({
            colorPrimario: data.color_primario || '#ff5a1f',
            temaFondo: data.tema_fondo || 'dark',
            modulos: {
              salon: data.mod_salon_activo !== false,
              delivery: data.mod_delivery_activo !== false,
              cocina: data.mod_cocina_activo !== false,
            },
          });
          if (data.mod_salon_activo !== false) setVistaLocal('salon');
          else if (data.mod_delivery_activo !== false) setVistaLocal('llevar');
          else setVistaLocal('fastfood');
        }
      } catch {
        setVistaLocal('salon');
      }
    };
    arrancar();
  }, []);

  useEffect(() => {
    if (configuracionGlobal?.modulos) {
      if (!modSalonActivo && modLlevarActivo) setVistaLocal('llevar');
      else if (modSalonActivo) setVistaLocal('salon');
    }
  }, [modSalonActivo, modLlevarActivo]);

  // ── Carga de mesas y órdenes ─────────────────────────────────────────────────
  useEffect(() => {
    const cargarSalon = async () => {
      try {
        const [resMesas, resOrdenes, resSedes] = await Promise.all([
          getMesas({ sede_id: sedeActualId }),
          getOrdenes({ sede_id: sedeActualId }),
          getSedes(),
        ]);
        setSedes(resSedes.data);

        const ordenesVivas = resOrdenes.data.filter(
          (o) => o.estado !== 'completado' && o.estado !== 'cancelado' && o.estado_pago !== 'pagado'
        );
        setTodasLasOrdenesActivas(ordenesVivas);
        setOrdenesLlevar(
          resOrdenes.data
            .filter((o) => o.tipo === 'llevar' && o.estado !== 'completado' && o.estado !== 'cancelado')
            .reverse()
            .slice(0, 10)
        );

        setMesas(
          resMesas.data.map((m) => {
            const orden = ordenesVivas.find(
              (o) => o.mesa !== null && (o.mesa === m.id || o.mesa === m.mesa_principal)
            );
            return {
              id: m.id,
              numero: m.numero_o_nombre || m.id,
              estado: m.mesa_principal ? 'unida' : orden ? 'ocupada' : 'libre',
              unida_a: m.mesa_principal || null,
              capacidad: m.capacidad || 4,
              totalConsumido: orden ? parseFloat(orden.total) : 0,
              posicion_x: m.posicion_x,
              posicion_y: m.posicion_y,
            };
          })
        );
      } catch (e) {
        console.error('Error cargando el salón:', e);
      }
    };
    cargarSalon();
  }, [triggerRecarga, sedeActualId]);

  // ── WebSocket ────────────────────────────────────────────────────────────────
  // ── WebSocket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sedeActualId) return;
    let ws = null;
    let reconnectTimeout = null;
    let unmounted = false;

    const conectar = () => {
      if (unmounted) return;
      
      // Armamos la URL limpia usando tu .env.development
      const baseUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000';
      const wsUrl = `${baseUrl}/ws/salon/${sedeActualId}/`;
      
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'mesa_actualizada') {
          setMesas((prev) =>
            prev.map((m) =>
              m.id === data.mesa_id ? { ...m, estado: data.estado, totalConsumido: data.total ?? m.totalConsumido } : m
            )
          );
        }
        if (data.type === 'orden_llevar_actualizada') {
          const orden = data.orden;
          if (data.accion === 'nueva') setOrdenesLlevar((prev) => [orden, ...prev].slice(0, 10));
          else if (data.accion === 'completada') setOrdenesLlevar((prev) => prev.filter((o) => o.id !== orden.id));
          else if (data.accion === 'actualizada') setOrdenesLlevar((prev) => prev.map((o) => (o.id === orden.id ? orden : o)));
        }
      };

      ws.onclose = () => { 
        if (!unmounted) {
          reconnectTimeout = setTimeout(conectar, 3000); 
        }
      };
      
      // ✨ CAMBIO: Ya no forzamos el ws.close() aquí, dejamos que onclose haga su trabajo
      ws.onerror = (err) => { 
        console.warn("⚠️ Pestañeo en el WebSocket, intentando reconectar..."); 
      };
    };

    conectar();

    return () => { 
      unmounted = true; 
      clearTimeout(reconnectTimeout); 
      
      if (ws) {
        // ✨ TRUCO ANTI-STRICT MODE: Si sigue conectando, esperamos a que abra para cerrarlo en paz
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws.close();
        } else {
          ws.close();
        }
      }
    };
  }, [sedeActualId]);

  // ── Mesas agrupadas ──────────────────────────────────────────────────────────
  const mesasAgrupadas = mesas
    .filter((m) => m.estado !== 'unida')
    .map((padre) => {
      const hijas = mesas.filter((m) => m.unida_a === padre.id);
      return {
        ...padre,
        mesasInvolucradas: [padre.numero, ...hijas.map((h) => h.numero)],
        esGigante: hijas.length > 0,
        capacidadTotal: padre.capacidad + hijas.reduce((s, h) => s + h.capacidad, 0),
      };
    });

  const manejarClickMesa = async (mesa) => {
    if (modoUnir) {
      if (!mesaPrincipal) {
        setMesaPrincipal(mesa.id);
      } else if (mesa.id !== mesaPrincipal) {
        try {
          await actualizarMesa(mesa.id, { mesa_principal: mesaPrincipal });
          setModoUnir(false); setMesaPrincipal(null);
          setTriggerRecarga((p) => !p);
        } catch { alert('No se pudo unir las mesas.'); }
      }
    } else {
      setMesaSeleccionada(mesa.id);
    }
  };

  const iniciarOrdenDelivery = () => {
    if (!nombreCliente.trim()) { alert('Por favor, ingresa el nombre del cliente.'); return; }
    setModalClienteAbierto(false);
    setMesaSeleccionada({ id: 'llevar', cliente: nombreCliente, telefono: telefonoCliente });
    setNombreCliente(''); setTelefonoCliente('');
  };

  const entregarOrdenLlevar = async (id) => {
    try { await actualizarOrden(id, { estado: 'pagado' }); setTriggerRecarga((p) => !p); }
    catch { alert('Error al entregar el pedido.'); }
  };

  const manejarCancelacion = async (id) => {
    const motivo = window.prompt('¿Por qué se cancela el pedido?');
    if (motivo) {
      try { await actualizarOrden(id, { estado: 'cancelado', cancelado: true, motivo_cancelacion: motivo }); setTriggerRecarga((p) => !p); }
      catch { console.error('Error al cancelar'); }
    }
  };

  const manejarCierreCajaSeguro = async () => {
    const hayOcupadas = mesas.some((m) => m.estado === 'ocupada' || m.orden_activa);
    const hayLlevar = ordenesLlevar.some((o) => o.estado_pago !== 'pagado');
    if (hayOcupadas || hayLlevar) { alert('⚠️ No puedes cerrar el turno. Hay mesas ocupadas o pedidos pendientes.'); return; }
    const pin = window.prompt('Ingrese PIN autorizado para cerrar caja:');
    if (!pin) return;
    try {
      const { data } = await validarPinEmpleado({ pin, accion: 'entrar' });
      if (['Cajero', 'Administrador', 'Admin'].includes(data.rol_nombre)) setModalCierreAbierto(true);
      else alert('🚫 Tu rol no tiene permisos para cerrar la caja.');
    } catch { alert('❌ PIN incorrecto o empleado inactivo.'); }
  };

  // ── Estilos de tarjeta de mesa ───────────────────────────────────────────────
  const getEstilosMesa = (mesa, variant = 'pc') => {
    const esOcupada = mesa.estado === 'ocupada';
    const esTomando = mesa.estado === 'tomando_pedido';
    const esCobrando = mesa.estado === 'cobrando';
    const esPrincipal = modoUnir && mesaPrincipal === mesa.id;
    const esActiva = mesaSeleccionada === mesa.id;

    let cardClass = tema === 'dark'
      ? `bg-[#161616] border-[#2a2a2a] ${variant === 'pc' ? 'hover:bg-[#1a1a1a]' : 'active:bg-[#1a1a1a]'}`
      : `bg-white border-gray-200 shadow-sm ${variant === 'pc' ? 'hover:shadow-md' : 'active:bg-gray-50'}`;
    let badgeClass = tema === 'dark' ? 'bg-[#222] text-neutral-400' : 'bg-gray-100 text-gray-500';
    let titleClass = tema === 'dark' ? 'text-white' : 'text-gray-900';
    let inlineStyle = {};
    let icono = null;
    let labelEstado = mesa.estado;

    if (esActiva && !modoUnir) {
      inlineStyle = { outline: `2px solid ${colorPrimario}`, outlineOffset: '2px' };
    }
    if (esOcupada) {
      cardClass = '';
      inlineStyle = { ...inlineStyle, backgroundColor: tema === 'dark' ? `${colorPrimario}0D` : `${colorPrimario}0A`, borderColor: `${colorPrimario}60`, boxShadow: `0 4px 20px ${colorPrimario}10` };
      badgeClass = ''; icono = '🍴'; labelEstado = 'ocupada';
    }
    if (esTomando) {
      cardClass = '';
      inlineStyle = { backgroundColor: tema === 'dark' ? '#fbbf2408' : '#fef9c3', borderColor: '#fbbf24aa', boxShadow: '0 4px 20px #fbbf2415' };
      badgeClass = 'bg-yellow-400/20 text-yellow-400'; icono = '📝'; labelEstado = 'pidiendo';
    }
    if (esCobrando) {
      cardClass = '';
      inlineStyle = { backgroundColor: tema === 'dark' ? '#a855f708' : '#faf5ff', borderColor: '#a855f7aa', boxShadow: '0 4px 20px #a855f715' };
      badgeClass = 'bg-purple-400/20 text-purple-400'; icono = '💳'; labelEstado = 'cobrando';
    }
    if (esPrincipal) {
      cardClass = 'scale-105 z-10 text-white';
      inlineStyle = { backgroundColor: colorPrimario, borderColor: colorPrimario, boxShadow: `0 10px 30px ${colorPrimario}60` };
      badgeClass = 'bg-white/20 text-white'; titleClass = 'text-white';
    }

    return { cardClass, badgeClass, titleClass, inlineStyle, icono, labelEstado, esOcupada, esPrincipal };
  };

  // ── Pantalla de carga ────────────────────────────────────────────────────────
  if (vistaLocal === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${tema === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f4f4f5]'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: colorPrimario, borderTopColor: 'transparent' }} />
          <p className="font-black tracking-widest uppercase text-xs text-neutral-500">Conectando...</p>
        </div>
      </div>
    );
  }

  // ── Fast Food ────────────────────────────────────────────────────────────────
  if (modSalonActivo === false && modLlevarActivo === false) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center text-center p-6 ${tema === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f0f0f0] text-gray-900'}`}>
        <span className="text-6xl mb-4">🍔</span>
        <h1 className="text-3xl font-black mb-2 uppercase">Modo Fast Food Activo</h1>
        <p className="text-neutral-500 mb-8 max-w-md">El salón y delivery están desactivados. Usa la Venta Rápida.</p>
        <button onClick={() => setDrawerVentaRapidaAbierto(true)} style={{ backgroundColor: colorPrimario }} className="px-8 py-4 rounded-2xl text-white font-black text-xl shadow-lg active:scale-95">
          ⚡ INICIAR VENTA RÁPIDA
        </button>
        <DrawerVentaRapida isOpen={drawerVentaRapidaAbierto} onClose={() => setDrawerVentaRapidaAbierto(false)} onProcederPago={(carrito, total) => { setOrdenACobrar({ id: 'venta_rapida', es_venta_rapida: true, total, detalles: carrito.map((c) => ({ producto: c.id, nombre: c.nombre, precio_unitario: c.precio, cantidad: c.cantidad })) }); setDrawerVentaRapidaAbierto(false); }} />
        <ModalCobro isOpen={!!ordenACobrar} onClose={() => setOrdenACobrar(null)} total={ordenACobrar ? parseFloat(ordenACobrar.total) : 0} carrito={ordenACobrar?.detalles?.map((d) => ({ id: d.producto, nombre: d.nombre, precio: parseFloat(d.precio_unitario), cantidad: d.cantidad || 1 })) || []} esVentaRapida={true} onCobroExitoso={async (pagos) => { try { const { data: nueva } = await crearOrden({ tipo: 'llevar', estado: 'completado', estado_pago: 'pagado', sede: sedeActualId, detalles: ordenACobrar.detalles || [] }); for (const p of pagos) await crearPago({ orden: nueva.id, monto: p.monto, metodo: p.metodo }); setOrdenACobrar(null); alert('¡Cobro exitoso! 💵'); } catch { alert('Error al guardar el pago.'); } }} />
      </div>
    );
  }

  // ── Datos para el grid ───────────────────────────────────────────────────────
  const sedeActual = sedes.find((s) => String(s.id) === String(sedeActualId));
  const COLUMNAS_MAPA = sedeActual?.columnas_salon || 3;
  const mapaMesas = {};
  let maxPos = 0;
  mesasAgrupadas.forEach((m) => {
    let pos = m.posicion_x;
    if (pos === undefined || pos === null || mapaMesas[pos]) { pos = 0; while (mapaMesas[pos]) pos++; }
    mapaMesas[pos] = m; if (pos > maxPos) maxPos = pos;
  });
  const baseCasillas = Math.max(maxPos + 1, mesasAgrupadas.length, 12);
  const totalCasillas = Math.ceil(baseCasillas / COLUMNAS_MAPA) * COLUMNAS_MAPA;
  const casillasMovil = Array.from({ length: totalCasillas }, (_, i) => i);
  const mesasPC = [...mesasAgrupadas].sort((a, b) => (a.posicion_x || 0) - (b.posicion_x || 0));

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden font-sans transition-colors duration-500 ${tema === 'dark' ? 'bg-[#0a0a0a] text-neutral-100' : 'bg-[#f4f4f5] text-gray-900'}`}>

      {/* CABECERA (HEADER) - ESTRUCTURA LIMPIA Y RESPONSIVA */}
      <header className={`px-4 py-3 md:px-5 md:py-4 sticky top-0 z-10 border-b bg-[#0a0a0a]/95 border-[#222] backdrop-blur-md shadow-xl transition-all
        ${mesaSeleccionada ? 'hidden lg:block' : 'block'}
      `}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          
          {/* 1. TÍTULO Y ESTADO */}
          <div className="flex justify-between items-center w-full sm:w-auto shrink-0">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-none">
                {vistaLocal === 'salon' ? (
                  <><span className="text-white">Salón</span> <span style={{ color: colorPrimario }}>Principal</span></>
                ) : (
                  <><span className="text-white">Para</span> <span style={{ color: colorPrimario }}>Llevar</span></>
                )}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">En vivo</span>
              </div>
            </div>

            {/* Select Sede (Solo visible en Móvil si es Dueño) */}
            {esDueño && sedes?.length > 1 &&(
                <select 
                  value={sedeActualId || ''} 
                  onChange={(e) => manejarCambioSede(e.target.value)}
                  className="sm:hidden text-[10px] font-bold px-2 py-1.5 rounded-lg border outline-none bg-[#1a1a1a] text-white border-[#333]"
                  style={{ color: colorPrimario }}
                >
                  <option value="" disabled>Sede...</option>
                  {sedes?.map(sede => <option key={sede.id} value={sede.id}>📍 {sede.nombre}</option>)}
                </select>
            )}
          </div>
          
          {/* 2. BOTONERA (Scrollable horizontalmente en móvil) */}
          {/* ✨ Se agregó pt-2 y pb-2 para darle espacio al contador flotante de no ser cortado */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto py-2 sm:px-1 scrollbar-hide">
            
            {/* Select Sede (Solo visible en PC si es Dueño) */}
            {esDueño && sedes?.length > 1 &&(
              <div className="hidden sm:flex items-center gap-2 mr-2 shrink-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Modo Dueño:</span>
                <select 
                  value={sedeActualId || ''} 
                  onChange={(e) => manejarCambioSede(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border outline-none bg-[#1a1a1a] text-white border-[#333] hover:border-[#ff5a1f]"
                  style={{ color: colorPrimario }}
                >
                  <option value="" disabled>Seleccionar...</option>
                  {sedes?.map(sede => <option key={sede.id} value={sede.id}>📍 {sede.nombre}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              {/* BOTÓN UNIR MESAS - ✨ shrink-0 evita que se aplaste */}
              {vistaLocal === 'salon' && (
                <button onClick={() => { setModoUnir(!modoUnir); setMesaPrincipal(null); }} className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border transition-all ${!modoUnir && 'bg-[#1a1a1a] border-[#333] text-neutral-400 hover:text-white hover:bg-[#222]'}`} style={modoUnir ? { backgroundColor: colorPrimario, borderColor: colorPrimario, color: '#fff', boxShadow: `0 0 15px ${colorPrimario}60` } : {}} title="Unir Mesas">
                  <span className="text-lg">🔗</span>
                </button>
              )}

              {/* BOTÓN LLEVAR - ✨ shrink-0 */}
              {modSalonActivo && modLlevarActivo && (
                <button onClick={() => { if (vistaLocal === 'salon') { setVistaLocal('llevar'); setModoUnir(false); } else { setVistaLocal('salon'); } }} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border relative border-[#333] bg-[#1a1a1a] text-neutral-400 hover:text-white hover:bg-[#222]">
                  {vistaLocal === 'salon' ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                      {/* ✨ z-10 y -top-2 para que se vea claro sobre el botón */}
                      <span className="absolute -top-2 -right-1.5 w-4 h-4 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-[#0a0a0a] z-10" style={{ backgroundColor: colorPrimario }}>{ordenesLlevar?.length || 0}</span>
                    </>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                  )}
                </button>
              )}

              {/* BOTÓN VENTA RÁPIDA - ✨ shrink-0 */}
              <button onClick={() => setDrawerVentaRapidaAbierto(true)} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border hover:brightness-125" style={{ backgroundColor: `${colorPrimario}1A`, borderColor: `${colorPrimario}4D`, color: colorPrimario }}>
                <span className="text-lg">⚡</span>
              </button>

              {/* ADMIN - ✨ shrink-0 en todos */}
              {['administrador', 'admin', 'cajero', 'dueño'].includes(rolUsuario?.toLowerCase()) && (
                <>
                  {['administrador', 'admin', 'dueño'].includes(rolUsuario?.toLowerCase()) && (
                    <button onClick={onIrAErp} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white"><span className="text-lg">⚙️</span></button>
                  )}
                  <button onClick={() => setModalMovimientosAbierto(true)} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"><span className="text-lg">💸</span></button>
                  <button onClick={manejarCierreCajaSeguro} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"><span className="text-lg">🔒</span></button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════ CUERPO PANTALLA DIVIDIDA ═══════════════════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── PANEL IZQUIERDO: MESAS (60% en PC) ── */}
        <div 
          className={`
            h-full overflow-y-auto transition-all duration-300
            ${tema === 'dark' ? 'border-[#222]' : 'border-gray-200'} border-r
            ${mesaSeleccionada ? 'hidden lg:block lg:w-[60%]' : 'w-full lg:w-[60%]'}
          `}
          onClick={(e) => {
            // ✨ MAGIA AQUÍ: Si el usuario hace clic en el fondo vacío (cualquier cosa que NO sea un botón)
            if (!e.target.closest('button')) {
              setMesaSeleccionada(null);
            }
          }}
        >

          {/* VISTA SALÓN */}
          {vistaLocal === 'salon' && modSalonActivo && (
            <div className="p-4 md:p-5 flex flex-col animate-fadeIn">

              {modoUnir && (
                <div className="p-4 rounded-2xl mb-5 text-sm flex items-center gap-3 animate-pulse border w-full max-w-3xl mx-auto md:max-w-none" style={{ backgroundColor: `${colorPrimario}1A`, borderColor: `${colorPrimario}4D`, color: colorPrimario }}>
                  <span className="text-xl">🔗</span>
                  <span className="font-bold">{mesaPrincipal ? `Selecciona la mesa que se unirá a Mesa ${mesaPrincipal}...` : 'Paso 1: Selecciona la Mesa Principal...'}</span>
                </div>
              )}

              <div className="flex justify-end mb-4 w-full max-w-3xl mx-auto md:max-w-none lg:hidden">
                <button onClick={() => setMostrarPuertaMovil(!mostrarPuertaMovil)}
                  className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg border transition-all active:scale-95 w-full sm:w-auto shadow-sm"
                  style={mostrarPuertaMovil ? { backgroundColor: colorPrimario, color: 'white', borderColor: colorPrimario } : { backgroundColor: `${colorPrimario}1A`, color: colorPrimario, borderColor: `${colorPrimario}40` }}>
                  {mostrarPuertaMovil ? 'Ocultar Orientación' : '📍 Activar Orientación'}
                </button>
              </div>
              {mostrarPuertaMovil && (
                <div className={`w-full max-w-3xl mx-auto md:max-w-none py-3 rounded-xl mb-4 text-[10px] font-black text-center uppercase tracking-[0.2em] shadow-inner border border-dashed ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-500 border-[#333]' : 'bg-gray-100 text-gray-400 border-gray-300'}`}>
                  Entrada Principal 🚪
                </div>
              )}

              {/* 📱 Grid Móvil */}
              <div className="lg:hidden w-full max-w-3xl mx-auto">
                <div className="grid gap-3 pb-10" style={{ gridTemplateColumns: `repeat(${COLUMNAS_MAPA}, minmax(0, 1fr))` }}>
                  {casillasMovil.map((i) => {
                    const mesa = mapaMesas[i];
                    if (!mesa) return <div key={`h-${i}`} className="h-32 rounded-3xl border-2 border-dashed border-transparent pointer-events-none" />;
                    const { cardClass, badgeClass, titleClass, inlineStyle, icono, labelEstado, esOcupada } = getEstilosMesa(mesa, 'movil');
                    return (
                      <button key={`m-${mesa.id}`} onClick={() => manejarClickMesa(mesa)} style={inlineStyle}
                        className={`border-[1.5px] rounded-3xl p-3.5 flex flex-col active:scale-95 text-left h-32 relative transition-all ${cardClass} ${mesa.esGigante ? 'col-span-2' : ''}`}>
                        <div className="flex justify-between items-start w-full mb-1">
                          <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${badgeClass}`} style={esOcupada && !modoUnir ? { backgroundColor: `${colorPrimario}20`, color: colorPrimario } : {}}>
                            {mesa.esGigante ? 'GRUPO' : labelEstado}
                          </span>
                          {icono && !modoUnir && <span className="opacity-70 text-sm">{icono}</span>}
                        </div>
                        <div className="flex-1 flex items-center justify-center w-full">
                          <h3 className={`font-black tracking-tight leading-none ${mesa.esGigante ? 'text-2xl' : 'text-xl'} ${titleClass}`}>
                            {mesa.esGigante ? mesa.mesasInvolucradas.join(' + ') : mesa.numero}
                          </h3>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 💻 Grid PC — auto-fill para aprovechar TODO el ancho disponible */}
              <div className="hidden lg:grid gap-6 pb-10 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                {mesasPC.map((mesa) => {
                  const { cardClass, badgeClass, titleClass, inlineStyle, icono, labelEstado, esOcupada, esPrincipal } = getEstilosMesa(mesa, 'pc');
                  return (
                    <button key={`pc-${mesa.id}`} onClick={() => manejarClickMesa(mesa)} style={inlineStyle}
                      className={`border-[1.5px] rounded-3xl p-4 flex flex-col transition-all active:scale-95 text-left h-40 relative ${cardClass} ${mesa.esGigante ? 'col-span-2' : ''}`}>
                      <div className="flex justify-between items-start w-full mb-2">
                        <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest ${badgeClass}`} style={esOcupada && !modoUnir ? { backgroundColor: `${colorPrimario}20`, color: colorPrimario } : {}}>
                          {mesa.esGigante ? 'GRUPO' : labelEstado}
                        </span>
                        {icono && !modoUnir && <span className="opacity-50 text-sm">{icono}</span>}
                      </div>
                      <div className="flex-1 flex items-center justify-center w-full">
                        <h3 className={`font-black tracking-tight ${mesa.esGigante ? 'text-4xl' : 'text-3xl'} ${titleClass}`}>
                          {mesa.esGigante ? mesa.mesasInvolucradas.join(' + ') : `Mesa ${mesa.numero}`}
                        </h3>
                      </div>
                      <div className={`w-full flex justify-center items-center gap-1.5 mt-2 ${esPrincipal ? 'text-white/80' : tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                        <span className="text-[11px] font-bold">{mesa.capacidadTotal || mesa.capacidad} pax</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* VISTA PARA LLEVAR */}
          {vistaLocal === 'llevar' && modLlevarActivo && (
            <div className="p-5 flex flex-col animate-fadeIn">
              <button onClick={() => setModalClienteAbierto(true)}
                style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 20px ${colorPrimario}4D` }}
                className="w-full text-white font-black uppercase tracking-widest py-5 rounded-3xl mb-8 flex justify-center items-center gap-3 text-sm md:text-lg transition-all active:scale-95">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Nueva Orden Para Llevar
              </button>

              <h2 className={`font-bold mb-4 uppercase text-xs tracking-widest ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>Órdenes Activas</h2>
              <div className="space-y-4">
                {ordenesLlevar.length === 0 && (
                  <div className={`text-center py-10 border border-dashed rounded-3xl ${tema === 'dark' ? 'border-[#333]' : 'border-gray-300'}`}>
                    <p className={`font-bold ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>No hay órdenes activas para llevar 🛵</p>
                  </div>
                )}
                {ordenesLlevar.map((orden) => {
                  const estaListo = orden.estado === 'listo';
                  const estaPagado = orden.pago_confirmado;
                  return (
                    <div key={orden.id} className={`p-5 rounded-3xl flex justify-between items-center relative overflow-hidden transition-all ${tema === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222]' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${estaPagado ? 'bg-blue-500' : 'bg-red-500'}`} />
                      <div className="flex-1 pl-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className={`font-black text-lg ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>Orden #{orden.id}</h3>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${estaPagado ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{estaPagado ? 'PAGADO' : 'FALTA PAGAR'}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${estaListo ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'border'}`} style={!estaListo ? { backgroundColor: `${colorPrimario}1A`, color: colorPrimario, borderColor: `${colorPrimario}33` } : {}}>{estaListo ? 'LISTO' : 'EN COCINA'}</span>
                        </div>
                        <p className={`text-sm font-bold ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>👤 {orden.cliente_nombre}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!estaPagado && (
                          <button onClick={() => manejarCancelacion(orden.id)} className={`p-3 rounded-2xl transition-colors ${tema === 'dark' ? 'bg-[#222] text-neutral-500 hover:bg-red-900/20 hover:text-red-500' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                        {!estaPagado
                          ? <button onClick={() => setOrdenACobrar(orden)} style={{ backgroundColor: colorPrimario }} className="text-white px-4 py-2 rounded-2xl font-black text-xs md:text-sm shadow-md active:scale-95">COBRAR</button>
                          : estaListo && <button onClick={() => entregarOrdenLlevar(orden.id)} className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-2xl shadow-lg active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></button>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>


        {/* ── PANEL DERECHO: POS o RESUMEN (40% en PC) ── */}
        <div className={`
          h-full flex flex-col transition-all duration-300
          ${tema === 'dark' ? 'bg-[#0d0d0d]' : 'bg-[#fcfcfc]'}
          ${mesaSeleccionada ? 'w-full lg:w-[40%]' : 'hidden lg:flex lg:w-[40%]'}
        `}>
          
          {mesaSeleccionada ? (
            // Si hay mesa seleccionada, mostramos el PosView
            <PosView
              mesaId={mesaSeleccionada}
              onVolver={() => {
                setMesaSeleccionada(null);
                setTriggerRecarga(p => !p); // Esto fuerza la actualización instantánea de las mesas
              }}
            />
          ) : (
            // Si NO hay mesa seleccionada, mostramos el resumen de tickets
            <div className="p-8 animate-fadeIn h-full overflow-y-auto">
              <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
                Órdenes en curso 🚀
              </h3>
              
              <div className="space-y-4">
                {todasLasOrdenesActivas?.length > 0 ? todasLasOrdenesActivas.map(ticket => (
                  <button 
                    key={ticket.id} 
                    onClick={() => {
                      if(ticket.tipo === 'llevar') setVistaLocal('llevar');
                      else setMesaSeleccionada(ticket.mesa);
                    }}
                    className={`w-full p-5 rounded-2xl border text-left flex justify-between items-center transition-all hover:scale-[1.02] ${
                      tema === 'dark' ? 'bg-[#161616] border-[#222] hover:border-[#444]' : 'bg-white border-gray-200 shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${ticket.tipo === 'llevar' ? 'bg-blue-500/10 text-blue-500' : 'bg-[#ff5a1f]/10 text-[#ff5a1f]'}`}>
                          {ticket.tipo === 'llevar' ? 'Para Llevar' : 'Salón'}
                        </span>
                      </div>
                      <p className={`font-black text-lg ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {ticket.tipo === 'llevar' ? ticket.cliente_nombre : `Mesa ${mesas.find(m => m.id === ticket.mesa)?.numero || ticket.mesa}`}
                      </p>
                      <p className={`text-[10px] uppercase font-bold ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
                        Ticket #{ticket.id}
                      </p>
                    </div>
                    
                    <span className="font-mono font-bold text-xl" style={{ color: colorPrimario }}>
                      S/ {parseFloat(ticket.total).toFixed(2)}
                    </span>
                  </button>
                )) : (
                  <div className="flex flex-col items-center justify-center opacity-30 mt-20">
                    <span className="text-6xl mb-4">💤</span>
                    <p className={`font-bold uppercase tracking-widest text-xs ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>No hay pedidos activos</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ══════════════════ MODALES ══════════════════ */}

      {modalClienteAbierto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#2a2a2a] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white">Datos del Cliente</h2>
                <p className="text-neutral-500 text-sm mt-1">Identifica el pedido para llevar</p>
              </div>
              <button onClick={() => setModalClienteAbierto(false)} className="w-8 h-8 bg-[#222] rounded-full flex items-center justify-center text-neutral-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><span>👤</span> Nombre (Obligatorio)</label>
                <input type="text" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} placeholder="Ej. Carlos Gutiérrez"
                  className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-4 text-white focus:outline-none focus:border-[#ff5a1f] transition-colors" />
              </div>
              <div>
                <label className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><span>📱</span> WhatsApp (Opcional)</label>
                <input type="tel" value={telefonoCliente} onChange={(e) => setTelefonoCliente(e.target.value)} placeholder="Ej. 999 999 999"
                  className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-4 text-white focus:outline-none focus:border-[#ff5a1f] transition-colors" />
                <p className="text-neutral-500 text-[11px] mt-2">Ingresa el número para enviarle un SMS automático cuando su pedido esté listo.</p>
              </div>
              <button onClick={iniciarOrdenDelivery} className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white font-black py-4 rounded-xl active:scale-95 transition-all shadow-[0_4px_15px_rgba(255,90,31,0.3)]">
                IR AL MENÚ ➔
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalCobro
        isOpen={!!ordenACobrar}
        onClose={() => setOrdenACobrar(null)}
        total={ordenACobrar ? parseFloat(ordenACobrar.total) : 0}
        carrito={ordenACobrar ? ordenACobrar.detalles.map((d) => ({ id: d.producto, nombre: d.nombre, precio: parseFloat(d.precio_unitario), cantidad: d.cantidad || 1 })) : []}
        esVentaRapida={ordenACobrar?.es_venta_rapida || false}
        onCobroExitoso={async (pagos) => {
          try {
            let idOrden = ordenACobrar.id;
            if (idOrden === 'venta_rapida') {
              const { data } = await crearOrden({ tipo: 'llevar', estado: 'completado', estado_pago: 'pagado', sede: sedeActualId, detalles: ordenACobrar.detalles || [] });
              idOrden = data.id;
            } else {
              await actualizarOrden(idOrden, { estado_pago: 'pagado', estado: 'completado' });
            }
            for (const p of pagos) await crearPago({ orden: idOrden, monto: p.monto, metodo: p.metodo });
            setOrdenACobrar(null);
            setTriggerRecarga((p) => !p);
            alert('¡Cobro realizado con éxito! 💵✨');
          } catch { alert('Hubo un error al guardar el pago.'); }
        }}
      />

      <DrawerVentaRapida
        isOpen={drawerVentaRapidaAbierto}
        onClose={() => setDrawerVentaRapidaAbierto(false)}
        onProcederPago={(carrito, total) => {
          setOrdenACobrar({ id: 'venta_rapida', es_venta_rapida: true, total, detalles: carrito.map((c) => ({ producto: c.id, nombre: c.nombre, precio_unitario: c.precio, cantidad: c.cantidad })) });
          setDrawerVentaRapidaAbierto(false);
        }}
      />

      <ModalCierreCaja
        isOpen={modalCierreAbierto}
        onClose={() => setModalCierreAbierto(false)}
        onCierreExitoso={(resumen) => {
          setModalCierreAbierto(false);
          const dif = resumen?.diferencia || 0;
          const msg = dif === 0 ? '✅ ¡Cuadre perfecto!' : dif > 0 ? `⚠️ Sobrante de S/ ${dif.toFixed(2)}` : `🚨 Faltante de S/ ${Math.abs(dif).toFixed(2)}`;
          alert(`${msg}\n\nCerrando sesión...`);
          window.location.reload();
        }}
      />

      <ModalMovimientoCaja
        isOpen={modalMovimientosAbierto}
        onClose={() => setModalMovimientosAbierto(false)}
        onGuardar={async (datos) => {
          try {
            const sesionId = estadoCaja?.id || localStorage.getItem('sesion_caja_id');
            if (!sesionId) { alert('⚠️ No hay sesión de caja activa.'); return; }
            await registrarMovimientoCaja({ tipo: datos.tipo, monto: datos.monto, concepto: datos.concepto, sesion_caja_id: sesionId, empleado_id: localStorage.getItem('empleado_id') });
            alert(`💸 ¡Listo! Se registró el ${datos.tipo} de S/ ${datos.monto} exitosamente.`);
          } catch { alert('❌ Error al guardar el movimiento.'); }
        }}
      />

    </div>
  );
}