import React, { useState, useEffect, useRef } from 'react';
import usePosStore from '../store/usePosStore';
import ModalCobro from '../components/modals/ModalCobro';
import ModalModificadores from '../components/modals/ModalModificadores';
import { crearOrden, actualizarOrden, crearPago, agregarProductosAOrden, anularItemDeOrden } from '../api/api';

// Componentes
import PosHeader from '../features/POS/components/PosHeader';
import ProductGrid from '../features/POS/components/ProductGrid';
import PosFooter from '../features/POS/components/PosFooter';
import CartDrawer from '../features/POS/components/CartDrawer';

// Hooks
import { usePosData } from '../features/POS/hooks/usePosData';
import { usePosSearch } from '../features/POS/hooks/usePosSearch';

export default function PosView({ mesaId, onVolver, esModoTerminal = false }) {
  const { estadoCaja, configuracionGlobal, carrito, agregarProducto, esDueño, sedes, manejarCambioSede, restarProducto, obtenerTotalItems, restarDesdeGrid, obtenerTotalDinero, vaciarCarrito, actualizarItemCompleto, sumarUnidad } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const [wsListo, setWsListo] = useState(false);
  const sedeActualId = localStorage.getItem('sede_id');
  const esParaLlevar = (typeof mesaId === 'object' && mesaId?.id === 'llevar') || mesaId === 'llevar';
  const nombreLlevar = typeof mesaId === 'object' ? mesaId.cliente : 'Cliente (🛍️ Llevar)';
  const [telefonoLlevar] = useState('');

  // 1. DATA HOOK
  const { productosBase, categoriasReales, modificadoresGlobales, ordenActiva, setOrdenActiva, cargando } = usePosData(sedeActualId, mesaId, vaciarCarrito);

  // 2. SEARCH & FILTER HOOK
  const { busqueda, setBusqueda, inputBusquedaActivo, setInputBusquedaActivo, categoriaActiva, setCategoriaActiva, aprenderSeleccion, productosFiltrados } = usePosSearch(productosBase, categoriasReales, modificadoresGlobales);

  // ESTADOS LOCALES DE LA VISTA
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [modalModsAbierto, setModalModsAbierto] = useState(false);
  const [productoParaModificar, setProductoParaModificar] = useState(null);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);

  const formatearSoles = (monto) => `S/ ${parseFloat(monto || 0).toFixed(2)}`;

  // ====================== WEBSOCKET LOGIC ======================
  const wsRef = useRef(null);
  const estadoMesaRef = useRef('libre'); // Soluciona el error de mutación del Linter

  useEffect(() => {
    if (esParaLlevar || !mesaId || !sedeActualId) return;

    let ws = null;
    let unmounted = false;

    const conectar = () => {
      if (unmounted) return;

      const baseUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL.replace('http', 'ws');
      
      // ✨ INYECTAMOS EL TOKEN
      const wsUrl = `${baseUrl}/ws/salon/${sedeActualId}/`;
      
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => {
        setWsListo(true); 
      };
      ws.onclose = () => { 
        setWsListo(false);
        if (!unmounted) setTimeout(conectar, 3000); 
      };
      ws.onerror = () => ws.close();
    };

    conectar();

    return () => {
      unmounted = true;
      // Al salir → restaurar el estado que tenía la mesa usando la ref aislada
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'mesa_estado', mesa_id: mesaId, estado: estadoMesaRef.current, total: 0 }));
      }
      ws?.close();
    };
  }, [mesaId, sedeActualId, esParaLlevar]);

  const notificarEstadoMesa = (estado, total = 0) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && !esParaLlevar) {
      ws.send(JSON.stringify({ type: 'mesa_estado', mesa_id: mesaId, estado, total }));
    }
  };

  // Notificar al Salón apenas termine de cargar la data
  // Notificar al Salón basándose en la carga de datos, el carrito y el WebSocket
  useEffect(() => {
    // 🚨 FRENO DE SEGURIDAD: 
    // Esperamos a que la base de datos cargue Y que el WebSocket esté conectado
    if (cargando || !wsListo) return; 
    
    if (ordenActiva) {
      // 1. La mesa ya tiene un pedido en la base de datos
      estadoMesaRef.current = 'ocupada';
      
      // 2. ¿Hay cosas nuevas en el carrito? 
      // Si carrito.length es 0, solo estamos viendo la cuenta -> 'cobrando'
      // Si es > 0, el mesero está marcando algo nuevo -> 'pidiendo'
      const estadoActual = carrito.length > 0 ? 'pidiendo' : 'cobrando';
      
      notificarEstadoMesa(estadoActual, parseFloat(ordenActiva.total || 0));
    } else {
      // 3. Mesa libre -> El mesero entró a tomar el primer pedido
      estadoMesaRef.current = 'libre';
      notificarEstadoMesa('pidiendo', 0);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargando, ordenActiva, carrito.length, wsListo]); // 👈 Dependencias clave

  // ====================== CÁLCULOS ======================
  const totalOrdenActiva = ordenActiva ? ordenActiva.detalles.reduce((acc, d) => acc + parseFloat(d.precio_unitario || 0) * (d.cantidad || 1), 0) : 0;
  const totalMesa = totalOrdenActiva + obtenerTotalDinero();
  const cantItemsMesa = (ordenActiva ? ordenActiva.detalles.reduce((acc, el) => acc + el.cantidad, 0) : 0) + obtenerTotalItems();

  // ====================== HANDLERS ======================
  const manejarEnviarCocina = async () => {
    if (!sedeActualId) { alert("⚠️ Elige una sede."); return; }
    setProcesando(true);
    try {
      const detallesNuevos = carrito.map(item => ({
        producto: item.id, cantidad: item.cantidad, precio_unitario: item.precio_unitario_calculado || item.precio,
        notas_y_modificadores: item.notas_y_modificadores || "", notas_cocina: item.notas_cocina || "", opciones_seleccionadas: item.opciones_seleccionadas || [] 
      }));

      let response;
      if (ordenActiva) {
        response = await agregarProductosAOrden(ordenActiva.id, { detalles: detallesNuevos });
      } else {
        const payloadOrden = {
          sede: sedeActualId, mesa: esParaLlevar ? null : mesaId, tipo: esParaLlevar ? 'llevar' : 'salon',
          estado: 'preparando', total: obtenerTotalDinero(), cliente_nombre: esParaLlevar ? nombreLlevar : "", 
          cliente_telefono: esParaLlevar ? telefonoLlevar : "", detalles: detallesNuevos
        };
        response = await crearOrden(payloadOrden); 
      }
      
      if (response.data) setOrdenActiva(response.data.orden || response.data);
      
      vaciarCarrito(); 
      setCarritoAbierto(false);
      notificarEstadoMesa('ocupada', totalMesa);
      setMostrarExito(true);    
      setTimeout(() => { setMostrarExito(false); onVolver(); }, 2000);
    } catch (error) { console.error("Error:", error); } 
    finally { setProcesando(false); }
  };

  const manejarAnularItem = async (detalleId, nombrePlato) => {
    const motivo = window.prompt(`¿Motivo de anulación para "${nombrePlato}"?`);
    if (!motivo) return;
    setProcesando(true);
    try {
      const response = await anularItemDeOrden(ordenActiva.id, { detalle_id: detalleId, motivo: motivo, empleado_nombre: localStorage.getItem('empleado_nombre') || 'Admin' });
      const ordenActualizada = response.data?.orden || (response.data?.id ? response.data : null);

      if (ordenActualizada) {
        setOrdenActiva(ordenActualizada);
      } else {
        const detalleAnulado = ordenActiva.detalles.find(d => d.id === detalleId);
        const montoRestado = detalleAnulado ? parseFloat(detalleAnulado.precio_unitario || 0) * (detalleAnulado.cantidad || 1) : 0;
        setOrdenActiva(prev => ({ ...prev, total: (parseFloat(prev.total) - montoRestado).toFixed(2), detalles: prev.detalles.filter(d => d.id !== detalleId) }));
      }
    } catch (error) { alert("Error al anular"); } 
    finally { setProcesando(false); }
  };

  const abrirModalParaNuevo = (producto) => {
    if (ordenActiva) notificarEstadoMesa('pidiendo', totalMesa); // 👈 Corregido
    setProductoParaModificar(producto);
    setModalModsAbierto(true);
  };
  
  const manejarAgregarAlCarritoDesdeModal = (itemCompleto) => {
      const existeItem = carrito.find(i => i.cart_id === itemCompleto.cart_id);
      if (existeItem) { actualizarItemCompleto(itemCompleto); } 
      else { agregarProducto(itemCompleto); }
  };
  
  useEffect(() => {
    if (esDueño && sedes?.length > 0) {
      const hoy = new Date().toLocaleDateString();
      const ultimaFecha = localStorage.getItem('pos_ultima_fecha');
      const ultimaSedeId = localStorage.getItem('sede_id');
      if (ultimaFecha !== hoy) { localStorage.setItem('pos_ultima_fecha', hoy); }
      if (!ultimaSedeId && sedes.length > 0) { manejarCambioSede(sedes[0].id); }
    }
  }, [sedes, esDueño, manejarCambioSede]);
  
  // ✨ Agrega este pequeño efecto justo arriba de tus "return"
  useEffect(() => {
    if (modalCobroAbierto && !esParaLlevar) {
      notificarEstadoMesa('cobrando', totalMesa);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalCobroAbierto]);
  return (
    <div className={`relative h-full flex flex-col overflow-hidden font-sans transition-colors duration-500 ${tema === 'dark' ? 'bg-[#0a0a0a] text-neutral-100' : 'bg-[#f4f4f5] text-gray-900'}`}>
      
      <PosHeader esModoTerminal={esModoTerminal} onVolver={onVolver} tema={tema} colorPrimario={colorPrimario} esParaLlevar={esParaLlevar} nombreLlevar={nombreLlevar} mesaId={mesaId} inputBusquedaActivo={inputBusquedaActivo} setInputBusquedaActivo={setInputBusquedaActivo} busqueda={busqueda} setBusqueda={setBusqueda} categoriaActiva={categoriaActiva} setCategoriaActiva={setCategoriaActiva} categoriasReales={categoriasReales} productosBase={productosBase} />

      {/* Aquí resolvemos el 'cargando' never used: Muestra un loader simple mientras baja data */}
      {cargando ? (
        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${colorPrimario}40`, borderTopColor: colorPrimario }}></div>
            <p className="mt-4 font-bold text-sm tracking-widest uppercase opacity-50">Sincronizando caja...</p>
        </div>
      ) : (
        <ProductGrid productosFiltrados={productosFiltrados} tema={tema} colorPrimario={colorPrimario} carrito={carrito} categoriasReales={categoriasReales} ordenActiva={ordenActiva} totalMesa={totalMesa} busqueda={busqueda} abrirModalParaNuevo={abrirModalParaNuevo} aprenderSeleccion={aprenderSeleccion} agregarProducto={agregarProducto} restarDesdeGrid={restarDesdeGrid} notificarEstadoMesa={notificarEstadoMesa} formatearSoles={formatearSoles} />
      )}

      <PosFooter tema={tema} colorPrimario={colorPrimario} cantItemsMesa={cantItemsMesa} totalMesa={totalMesa} setCarritoAbierto={setCarritoAbierto} manejarEnviarCocina={manejarEnviarCocina} procesando={procesando} carrito={carrito} formatearSoles={formatearSoles} />

      <CartDrawer carritoAbierto={carritoAbierto} setCarritoAbierto={setCarritoAbierto} tema={tema} colorPrimario={colorPrimario} totalMesa={totalMesa} cantItemsMesa={cantItemsMesa} carrito={carrito} vaciarStore={vaciarCarrito} ordenActiva={ordenActiva} manejarAnularItem={manejarAnularItem} procesando={procesando} abrirModalParaEditar={(item) => { setProductoParaModificar(item); setModalModsAbierto(true); }} restarProducto={restarProducto} sumarUnidad={sumarUnidad} manejarEnviarCocina={manejarEnviarCocina} setModalCobroAbierto={setModalCobroAbierto} notificarEstadoMesa={notificarEstadoMesa} formatearSoles={formatearSoles} />

      {/* MODALES */}
      {mostrarExito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#1a1a1a] p-10 rounded-3xl flex flex-col items-center shadow-2xl scale-in-center border" style={{ borderColor: colorPrimario + '4D' }}>
             <div className="w-24 h-24 bg-green-500 rounded-full flex justify-center items-center mb-5 text-white text-5xl font-black shadow-inner shadow-green-900 shadow-xl">✓</div>
             <h2 className="text-3xl font-black text-white uppercase tracking-tight">Pedido Enviado</h2>
             <p className='text-neutral-500 mt-1 font-bold'>La cocina ya está en marcha.</p>
          </div>
        </div>
      )}

      {modalCobroAbierto && (
          <ModalCobro 
            isOpen={modalCobroAbierto} 
            onClose={() => {
              setModalCobroAbierto(false);
              // Si cancelan el cobro, la mesa vuelve a estar en rojo
              notificarEstadoMesa('ocupada', totalMesa); 
            }} 
            total={totalMesa} 
            carrito={ordenActiva ? ordenActiva.detalles : []} 
            onCobroExitoso={async (datosPago) => {
              try {
                for (const pago of datosPago) await crearPago({ orden: ordenActiva.id, metodo: pago.metodo, monto: pago.monto });
                await actualizarOrden(ordenActiva.id, { estado: 'completado', estado_pago: 'pagado', pago_confirmado: true });
                setModalCobroAbierto(false); vaciarCarrito(); setCarritoAbierto(false); 
                // Al volver, el unmount limpiará la mesa
                onVolver();
              } catch (error) { alert("Hubo un error al procesar el pago"); }
            }}
          />
      )}
      
      {estadoCaja === 'cerrado' && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#111] p-10 rounded-3xl border border-red-500/20 shadow-2xl max-w-sm animate-slideUp">
            <span className="text-6xl mb-4 block">🔒</span>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Turno Cerrado</h2>
            <p className="text-neutral-400 mt-3 text-sm font-bold leading-relaxed">El administrador ha finalizado el turno. No se pueden procesar más pedidos.</p>
            <button onClick={onVolver} className="mt-8 w-full bg-[#ff5a1f] text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#e04a15] active:scale-95 transition-all">Volver al Inicio</button>
          </div>
        </div>
      )}
      
      <ModalModificadores isOpen={modalModsAbierto} onClose={() => setModalModsAbierto(false)} producto={productoParaModificar} modificadoresGlobales={modificadoresGlobales} onAgregarAlCarrito={manejarAgregarAlCarritoDesdeModal} />
    </div>
  );
}