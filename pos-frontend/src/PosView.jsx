import React, { useState, useEffect, useCallback, useRef } from 'react';
import usePosStore from './store/usePosStore';
import ModalCobro from './ModalCobro';
import ModalModificadores from './ModalModificadores';
import { getProductos, crearOrden, actualizarOrden, getOrdenes, getCategorias, crearPago, agregarProductosAOrden, anularItemDeOrden, getModificadores } from './api/api';

export default function PosView({ mesaId, onVolver }) {
  // ✨ 1. EXTRAEMOS EL TEMA Y COLOR GLOBAL DE ZUSTAND ✨
  const { estadoCaja, configuracionGlobal, carrito, agregarProducto, editarNotaItem, restarProducto, eliminarProducto, obtenerTotalItems, restarDesdeGrid, obtenerTotalDinero, vaciarCarrito, actualizarItemCompleto, sumarUnidad } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';

  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [categoriasExpandidas, setCategoriasExpandidas] = useState(false);
  const [modificadoresGlobales, setModificadoresGlobales] = useState([]);
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  const [categoriasReales, setCategoriasReales] = useState([]);
  const [formLlevar, setFormLlevar] = useState({ nombre: '', telefono: '' });
  const telefonoLlevar = formLlevar.telefono;
  const [modalModsAbierto, setModalModsAbierto] = useState(false);
  const [productoParaModificar, setProductoParaModificar] = useState(null);

  const [productosBase, setProductosBase] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);

  const [ordenActiva, setOrdenActiva] = useState(null);

  const formatearSoles = (monto) => `S/ ${parseFloat(monto || 0).toFixed(2)}`;
  const vaciarStore = vaciarCarrito; 

  const sedeActualId = localStorage.getItem('sede_id');
  const esParaLlevar = (typeof mesaId === 'object' && mesaId?.id === 'llevar') || mesaId === 'llevar';
  const nombreLlevar = typeof mesaId === 'object' ? mesaId.cliente : 'Cliente (🛍️ Llevar)';
  const wsRef = useRef(null);

  // Conecta al WS del salón para notificar estado de la mesa en tiempo real
  useEffect(() => {
    if (esParaLlevar || !mesaId || !sedeActualId) return;

    // El estado al que volver si el mesero sale sin hacer nada
    // Si ya había orden activa → cobrando; si no → libre
    const estadoAnteriorRef = { value: 'libre' };

    const wsUrl = `${import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL.replace('http', 'ws')}/ws/salon/${sedeActualId}/`;
    let ws = null;
    let unmounted = false;

    const conectar = () => {
      if (unmounted) return;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // El estado de entrada lo decide cargarData una vez que sabe si hay orden activa
        // Por eso no enviamos nada aquí todavía
      };

      ws.onclose = () => {
        if (!unmounted) setTimeout(conectar, 3000);
      };
      ws.onerror = () => ws.close();
    };

    conectar();

    // Exponemos una forma de actualizar el estado anterior desde fuera del efecto
    wsRef.estadoAnterior = estadoAnteriorRef;

    return () => {
      unmounted = true;
      // Al salir → restaurar el estado que tenía la mesa antes de entrar
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'mesa_estado', mesa_id: mesaId, estado: estadoAnteriorRef.value, total: 0 }));
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

  const cargarData = useCallback(async () => {
      try {
        // ✨ 1. Añadimos getModificadores al Promise.all para que cargue súper rápido
        const [responseProductos, responseCategorias, responseMods] = await Promise.all([
            getProductos({ sede_id: sedeActualId }), // Mejorado: Filtramos productos por sede
            getCategorias(),
            getModificadores() // <-- Asegúrate de importar esta función desde api.js
        ]);

        const dataFormateada = responseProductos.data.map(p => ({
          ...p,
          id: p.id, 
          nombre: p.nombre, 
          precio: parseFloat(p.precio_base), 
          categoria: p.categoria
        }));
        
        setProductosBase(dataFormateada);
        setCategoriasReales(responseCategorias.data);
        
        // ✨ 2. Guardamos los modificadores en el estado que creamos antes
        setModificadoresGlobales(responseMods.data);

        const responseOrdenes = await getOrdenes({ sede_id: sedeActualId });
        
        // ✨ 3. Blindaje: Convertimos ambos a String por seguridad
        const ordenViva = responseOrdenes.data.find(o => 
            String(o.mesa) === String(mesaId) && 
            o.estado !== 'completado' && 
            o.estado !== 'cancelado' &&
            o.estado_pago !== 'pagado'
        );
        
        if (ordenViva) {
          setOrdenActiva(ordenViva);
          // Había orden → entra como 'cobrando', al salir vuelve a 'ocupada'
          if (wsRef.estadoAnterior) wsRef.estadoAnterior.value = 'ocupada';
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'mesa_estado', mesa_id: mesaId, estado: 'cobrando', total: parseFloat(ordenViva.total || 0) }));
          }
        } else {
          setOrdenActiva(null);
          // Sin orden → entra como 'tomando_pedido', al salir vuelve a 'libre'
          if (wsRef.estadoAnterior) wsRef.estadoAnterior.value = 'libre';
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'mesa_estado', mesa_id: mesaId, estado: 'tomando_pedido', total: 0 }));
          }
        }
        
        vaciarStore(); 
        setCargando(false);
      } catch (error) {
        console.error(error);
        setCargando(false);
      }
  }, [mesaId, vaciarStore, sedeActualId]); // El linter de React es feliz aquí

  useEffect(() => {
    cargarData();
  }, [cargarData]);
  // Total desde detalles activos, no desde ordenActiva.total (que no se actualiza solo)
  // El backend borra el detalle al anular (no hay campo 'anulado'), así que simplemente sumamos todos
  const totalOrdenActiva = ordenActiva
    ? ordenActiva.detalles
        .reduce((acc, d) => acc + parseFloat(d.precio_unitario || 0) * (d.cantidad || 1), 0)
    : 0;
  const totalMesa = totalOrdenActiva + obtenerTotalDinero();
  const cantItemsMesa = (ordenActiva
    ? ordenActiva.detalles.reduce((acc, el) => acc + el.cantidad, 0)
    : 0) + obtenerTotalItems();

  const manejarEnviarCocina = async () => {
    if (!sedeActualId) {
      alert("⚠️ Modo Dueño: Debes seleccionar o asignarte una Sede activa antes de registrar ventas.");
      return; 
    }

    setProcesando(true);
    try {
      const detallesNuevos = carrito.map(item => ({
        producto: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario_calculado || item.precio,
        notas_y_modificadores: item.notas_y_modificadores || "",
        notas_cocina: item.notas_cocina || "",
        opciones_seleccionadas: item.opciones_seleccionadas || [] 
      }));

      // ✨ LA CLAVE: Guardamos la respuesta de la API
      let response;
      if (ordenActiva) {
        response = await agregarProductosAOrden(ordenActiva.id, { detalles: detallesNuevos });
      } else {
        const payloadOrden = {
          sede: sedeActualId, 
          mesa: esParaLlevar ? null : mesaId, 
          tipo: esParaLlevar ? 'llevar' : 'salon',
          estado: 'preparando',
          total: obtenerTotalDinero(),
          cliente_nombre: esParaLlevar ? nombreLlevar : "", 
          cliente_telefono: esParaLlevar ? telefonoLlevar : "",
          detalles: detallesNuevos
        };
        response = await crearOrden(payloadOrden); 
      }
      
      // ✨ ACTUALIZAMOS EL ESTADO LOCAL CON LA ORDEN FRESCA
      if (response.data) {
        // Si el backend devuelve { orden: {...} } o solo el objeto {...}
        const ordenActualizada = response.data.orden || response.data;
        setOrdenActiva(ordenActualizada);
      }
      
      vaciarStore(); 
      setCarritoAbierto(false);
      notificarEstadoMesa('ocupada', totalMesa);
      setMostrarExito(true);    
      
      setTimeout(() => { setMostrarExito(false); onVolver(); }, 2000);
    } catch (error) {
      console.error("🔍 Error:", error.response?.data || error);
    } finally {
      setProcesando(false); 
    }
  };

  const manejarAnularItem = async (detalleId, nombrePlato) => {
    const motivo = window.prompt(`¿Motivo de anulación para "${nombrePlato}"?`);
    if (!motivo) return;

    setProcesando(true);
    try {
      const response = await anularItemDeOrden(ordenActiva.id, {
        detalle_id: detalleId,
        motivo: motivo,
        empleado_nombre: localStorage.getItem('empleado_nombre') || 'Admin'
      });

      // Cubre ambos formatos: { orden: {...} } o directamente el objeto orden
      const ordenActualizada = response.data?.orden || (response.data?.id ? response.data : null);

      if (ordenActualizada) {
        // El backend devolvió la orden actualizada → la usamos directo
        setOrdenActiva(ordenActualizada);
      } else {
        // Fallback: el backend no devolvió la orden → la actualizamos manualmente en el estado local
        const detalleAnulado = ordenActiva.detalles.find(d => d.id === detalleId);
        const montoRestado = detalleAnulado
          ? parseFloat(detalleAnulado.precio_unitario || 0) * (detalleAnulado.cantidad || 1)
          : 0;

        setOrdenActiva(prev => ({
          ...prev,
          total: (parseFloat(prev.total) - montoRestado).toFixed(2),
          detalles: prev.detalles.filter(d => d.id !== detalleId),
        }));
      }
    } catch (error) {
      alert("Error al anular");
    } finally {
      setProcesando(false);
    }
  };

  const abrirModalParaNuevo = (producto) => {
    // Si había orden activa, el mesero está agregando más → cambia a 'pidiendo'
    if (ordenActiva) notificarEstadoMesa('tomando_pedido', totalMesa);
    setProductoParaModificar(producto);
    setModalModsAbierto(true);
  };
  const abrirModalParaEditar = (itemCarrito) => { setProductoParaModificar(itemCarrito); setModalModsAbierto(true); };

  const manejarAgregarAlCarritoDesdeModal = (itemCompleto) => {
      const existeItem = carrito.find(i => i.cart_id === itemCompleto.cart_id);
      if (existeItem) { actualizarItemCompleto(itemCompleto); } 
      else { agregarProducto(itemCompleto); }
  };
  

  
  const productosFiltrados = productosBase.filter(plato => {
    if (categoriaActiva === 'Todas' || categoriaActiva === 'Todos') return true;
    const nombreCatDelPlato = categoriasReales.find(c => String(c.id) === String(plato.categoria))?.nombre || plato.categoria;
    return nombreCatDelPlato === categoriaActiva;
  });
  
  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 ${tema === 'dark' ? 'bg-[#0a0a0a] text-neutral-100' : 'bg-[#f4f4f5] text-gray-900'}`}>
      
      {/* ======================= HEADER TEMATIZADO ======================= */}
      <header className={`p-4 shadow-xl sticky top-0 z-10 border-b transition-colors ${tema === 'dark' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center mb-4 gap-3">
          <div className="flex items-center gap-3">
             <button onClick={onVolver} className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-colors font-black text-xl active:scale-95 ${tema === 'dark' ? 'bg-[#1a1a1a] hover:bg-[#222] border-[#222] text-white' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'}`}>←</button>
             <div>
                <span className={`text-[10px] font-bold tracking-widest uppercase ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                  {esParaLlevar ? 'Cajón delivery' : '🍽️ SALÓN'}
                </span>
                <h1 className={`text-xl font-black uppercase tracking-tight ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {esParaLlevar ? nombreLlevar : `Mesa ${mesaId}`}
                </h1>
             </div>
          </div>
        </div>

        {/* FILTRO DE CATEGORÍAS */}
        <div className="mb-2 relative z-20">
          <button 
            onClick={() => setCategoriasExpandidas(!categoriasExpandidas)} 
            className={`w-full flex justify-between items-center px-4 py-3 h-14 rounded-2xl border transition-colors shadow-sm active:scale-[0.99] ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-200 border-[#2a2a2a] hover:bg-[#222]' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}
          >
            <span className="font-semibold text-sm">
              Categoría: 
              <span className="ml-1 uppercase tracking-widest font-bold text-xs" style={{ color: colorPrimario }}>
                {categoriaActiva === 'Todas' ? 'Todas' : categoriaActiva}
              </span>
            </span>
            <svg className={`w-5 h-5 transform transition-transform duration-200 ${categoriasExpandidas ? 'rotate-180' : ''}`} style={categoriasExpandidas ? { color: colorPrimario } : { color: tema === 'dark' ? '#737373' : '#9ca3af' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          
          {categoriasExpandidas && (
            <div className={`absolute top-full left-0 w-full border rounded-2xl mt-2 p-2 grid grid-cols-2 gap-2 shadow-2xl animate-fadeIn z-50 ${tema === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-100'}`}>
                <button 
                  onClick={() => { setCategoriaActiva('Todas'); setCategoriasExpandidas(false); }} 
                  className={`py-3.5 px-3 rounded-xl text-xs font-black transition-colors border text-center uppercase tracking-wider col-span-2 ${categoriaActiva === 'Todas' ? 'text-white shadow-md' : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#222] hover:bg-[#222] hover:text-white' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-800')}`}
                  style={categoriaActiva === 'Todas' ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : {}}
                >
                    🍔 TODAS
                </button>
                
                {categoriasReales.map((cat, index) => {
                    const nombreMostrar = cat.nombre || cat; 
                    const keyUnica = cat.id || `cat-${index}`; 

                    return (
                        <button 
                          key={keyUnica} 
                          onClick={() => { setCategoriaActiva(nombreMostrar); setCategoriasExpandidas(false); }} 
                          className={`py-3.5 px-3 rounded-xl text-xs font-black transition-colors border text-center uppercase tracking-wider ${categoriaActiva === nombreMostrar ? 'text-white shadow-md' : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#222] hover:bg-[#222] hover:text-white' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100 hover:text-gray-800')}`}
                          style={categoriaActiva === nombreMostrar ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : {}}
                        >
                            {nombreMostrar}
                        </button>
                    )
                })}
            </div>
          )}
        </div>
      </header>

      {/* ==================== CUADRÍCULA DE PRODUCTOS TEMATIZADA ==================== */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 relative z-0 pb-32">
        {productosFiltrados.map((prod) => {
          const totalCantidadProd = carrito.filter(item => item.id === prod.id).reduce((acc, curr) => acc + curr.cantidad, 0);
          const tieneVariantes = carrito.some(item => item.id === prod.id && item.cart_id !== `base_${prod.id}`);
          const nombreCategoriaMuestra = categoriasReales.find(c => String(c.id) === String(prod.categoria))?.nombre || 'Sin categoría';
          
          // TARJETAS CON SELECCIÓN (Variantes obligatorias)
          if (prod.requiere_seleccion) {
              return (
                <button 
                  key={prod.id} 
                  onClick={() => prod.disponible && abrirModalParaNuevo(prod)} 
                  disabled={!prod.disponible}
                  className={`relative p-4 rounded-3xl shadow-lg transition-all flex flex-col justify-between h-40 text-left group ${
                    prod.disponible 
                      ? (tema === 'dark' ? 'bg-[#111] border border-[#222] hover:border-[#444] active:scale-95 cursor-pointer' : 'bg-white border border-gray-200 hover:shadow-xl active:scale-95 cursor-pointer') 
                      : (tema === 'dark' ? 'bg-[#0a0a0a] border border-[#1a1a1a] opacity-50 cursor-not-allowed' : 'bg-gray-50 border border-gray-200 opacity-50 cursor-not-allowed')
                  }`}
                >
                  {!prod.disponible && <div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest z-10 shadow-lg">Agotado</div>}
                  <div>
                    <span className={`font-bold leading-tight text-[15px] ${tema === 'dark' ? 'text-neutral-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black'}`}>{prod.nombre}</span>
                    <p className={`text-[10px] mt-1 uppercase font-black tracking-widest ${tema === 'dark' ? 'text-neutral-600' : 'text-gray-400'}`}>{nombreCategoriaMuestra}</p>
                  </div>
                  <div className="flex justify-between items-end w-full mt-2">
                      <span className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1.5 rounded-lg border ${tema === 'dark' ? 'text-neutral-400 bg-[#1a1a1a] border-[#2a2a2a]' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>Opciones</span>
                      {totalCantidadProd > 0 && (
                          <div className='text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-xl shadow-lg' style={{ backgroundColor: colorPrimario }}>{totalCantidadProd}</div>
                      )}
                  </div>
                </button>
              );
          }

          // TARJETAS NORMALES
          const precioAMostrar = parseFloat(prod.precio_base || prod.precio);
          return (
            <div 
              key={prod.id} 
              onClick={() => { if (prod.disponible) { if (ordenActiva) notificarEstadoMesa('tomando_pedido', totalMesa); agregarProducto(prod); } }} 
              className={`relative p-3 sm:p-4 rounded-3xl shadow-lg transition-all flex flex-col h-full text-left justify-between overflow-hidden ${
                prod.disponible 
                  ? (tema === 'dark' ? 'bg-[#111] border border-[#222] hover:bg-[#151515] cursor-pointer' : 'bg-white border border-gray-200 hover:shadow-xl cursor-pointer hover:bg-gray-50') 
                  : (tema === 'dark' ? 'bg-[#0a0a0a] border border-[#1a1a1a] opacity-50 cursor-not-allowed' : 'bg-gray-50 border border-gray-200 opacity-50 cursor-not-allowed')
              }`}
            >
              {!prod.disponible && <div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest z-10 shadow-lg">Agotado</div>}
              
              <div className='flex-1 mb-3 pointer-events-none'>
                <span className={`font-bold leading-tight text-[13px] sm:text-[15px] line-clamp-2 ${tema === 'dark' ? 'text-neutral-200' : 'text-gray-800'}`}>{prod.nombre}</span>
                <p className={`text-[9px] mt-1 uppercase font-black tracking-widest truncate ${tema === 'dark' ? 'text-neutral-600' : 'text-gray-400'}`}>{nombreCategoriaMuestra}</p>
                <p className="font-mono text-sm font-bold mt-1.5" style={{ color: colorPrimario }}>{formatearSoles(precioAMostrar)}</p>
              </div>
              
              <div className={`flex flex-col gap-2 pt-2 border-t shrink-0 ${!prod.disponible ? 'pointer-events-none' : ''} ${tema === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-100'}`}>
                  {totalCantidadProd > 0 && (
                    <div className='flex items-center justify-between gap-1'>
                      <button onClick={(e) => { e.stopPropagation(); restarDesdeGrid(prod.id); }} disabled={!prod.disponible} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-lg transition-all border bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white disabled:opacity-50">-</button>
                      
                      <span className={`flex-1 h-9 sm:h-10 rounded-xl font-black text-lg flex items-center justify-center border transition-all ${tema === 'dark' ? 'bg-[#1a1a1a] text-white border-[#333]' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
                          {totalCantidadProd}
                          {tieneVariantes && <span className="absolute top-1 right-1 text-[10px]" title="Contiene variantes" style={{ color: colorPrimario }}>⚙️</span>}
                      </span>
                      
                      <button onClick={(e) => { e.stopPropagation(); agregarProducto(prod); }} disabled={!prod.disponible} className='w-9 h-9 sm:w-10 sm:h-10 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-xl flex items-center justify-center font-black text-lg transition-all disabled:opacity-50'>+</button>
                    </div>
                  )}
                  
                  {prod.tiene_variaciones ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); abrirModalParaNuevo(prod); }}
                      disabled={!prod.disponible}
                      className="w-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest py-2.5 rounded-lg border transition-colors disabled:opacity-50 hover:brightness-110"
                      style={{ color: colorPrimario, backgroundColor: colorPrimario + '1A', borderColor: colorPrimario + '4D' }}
                    >
                      ⚙️ Variantes / Opc.
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => { e.stopPropagation(); abrirModalParaNuevo(prod); }}
                      disabled={!prod.disponible}
                      className={`w-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg border transition-colors disabled:opacity-50 ${tema === 'dark' ? 'text-neutral-500 bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#444] hover:text-white' : 'text-gray-500 bg-gray-100 border-gray-200 hover:border-gray-300 hover:text-gray-800'}`}
                    >
                      📝 Agregar Nota
                    </button>
                  )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ==================== FOOTER FLOTANTE ==================== */}
      <div className={`fixed bottom-0 left-0 w-full backdrop-blur-md p-4 border-t z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] transition-colors ${tema === 'dark' ? 'bg-[#0a0a0a]/90 border-[#222]' : 'bg-white/95 border-gray-200'}`}>
        <div className="flex gap-3 h-16">
          <button 
            onClick={() => setCarritoAbierto(true)}
            disabled={cantItemsMesa === 0} 
            className={`flex-1 rounded-2xl py-4 font-bold text-lg flex justify-between px-5 items-center disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg border ${tema === 'dark' ? 'bg-[#111] hover:bg-[#1a1a1a] border-[#2a2a2a] text-white' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-900'}`}
          >
            <div className="flex gap-2.5 items-center">
              <span className="text-white border w-9 h-9 flex items-center justify-center rounded-xl font-black text-xl shadow-inner" style={{ backgroundColor: colorPrimario, borderColor: colorPrimario }}>
                {cantItemsMesa}
              </span>
              <span className='font-black tracking-tight uppercase text-base'>Ver Cuenta</span>
            </div>
            <span className="font-mono text-xl font-bold" style={{ color: colorPrimario }}>
              {formatearSoles(totalMesa)}
            </span>
          </button>

          <button 
            onClick={manejarEnviarCocina}
            disabled={procesando || carrito.length === 0} 
            className="text-white rounded-2xl px-6 py-4 font-black text-lg disabled:opacity-30 disabled:shadow-none disabled:bg-[#333] transition-all flex items-center justify-center min-w-[130px] active:scale-[0.98]"
            style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 20px ${colorPrimario}4D` }}
          >
            {procesando ? <span className="animate-pulse">...</span> : 'ENVIAR 🚀'}
          </button>
        </div>
      </div>

      {/* ==================== CAJÓN (DRAWER) DEL CARRITO ==================== */}
      {carritoAbierto && <div className="fixed inset-0 bg-black/80 z-30 transition-opacity backdrop-blur-sm" onClick={() => setCarritoAbierto(false)}></div>}

      <div className={`fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t flex flex-col transition-transform duration-300 ease-out shadow-[-10px_0_50px_rgba(0,0,0,0.8)] ${carritoAbierto ? 'translate-y-0' : 'translate-y-full'} ${tema === 'dark' ? 'bg-[#0d0d0d] border-[#222]' : 'bg-[#f8f9fa] border-gray-300'}`} style={{ maxHeight: '88vh' }}>
        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setCarritoAbierto(false)}>
          <div className={`w-12 h-1 rounded-full ${tema === 'dark' ? 'bg-[#333]' : 'bg-gray-300'}`}></div>
        </div>

        <div className={`px-6 py-5 flex justify-between items-center border-b ${tema === 'dark' ? 'border-[#222]' : 'border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-2xl border shadow-inner" style={{ backgroundColor: colorPrimario + '1A', color: colorPrimario, borderColor: colorPrimario + '4D' }}>
              {cantItemsMesa}
            </div>
            <div>
              <p className={`text-[10px] font-bold tracking-widest uppercase ${tema === 'dark' ? 'text-neutral-600' : 'text-gray-500'}`}>Total Ticket Mesa</p>
              <p className={`text-3xl font-black tracking-tight ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatearSoles(totalMesa)}</p>
            </div>
          </div>
          {carrito.length > 0 && (
            <button onClick={vaciarStore} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-red-500/30">
              Limpiar Nuevos
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 scrollbar-hide pb-20">
          {ordenActiva && ordenActiva.detalles.length > 0 && (
            <div>
              <p className={`font-bold uppercase tracking-widest text-[10px] mb-2 pl-1 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>En Preparación / Servidos</p>
              <div className="space-y-2.5">
                {ordenActiva.detalles.map((item, index) => (
                  <div key={`db-${index}`} className={`border rounded-2xl p-4 flex justify-between items-center opacity-60 ${tema === 'dark' ? 'bg-[#111] border-[#222]/50' : 'bg-white border-gray-200'}`}>
                    <div>
                      <span className={`font-bold text-[15px] ${tema === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {item.producto_nombre || item.nombre || (item.producto && item.producto.nombre) || "Producto"}
                      </span>
                      {(item.notas_cocina || item.notas_y_modificadores || item.notas) && (
                        <span className="block text-[11px] mt-1 font-mono leading-tight" style={{ color: colorPrimario }}>
                          ↳ {item.notas_cocina || item.notas_y_modificadores || item.notas}
                        </span>
                      )}
                      <p className="font-mono text-sm font-bold mt-1.5" style={{ color: colorPrimario }}>{formatearSoles(item.precio_unitario)} /u</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className={`font-black px-4 py-2 rounded-xl border text-xl ${tema === 'dark' ? 'text-neutral-500 bg-[#1a1a1a] border-[#222]' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>
                        x{item.cantidad}
                      </div>
                      
                      {/* BOTÓN DE ANULAR */}
                      <button 
                        onClick={() => manejarAnularItem(item.id, item.producto_nombre || item.nombre || "Producto")}
                        disabled={procesando}
                        className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-widest flex items-center gap-1 border border-red-500/20 rounded-lg px-3 py-1.5 bg-red-500/10 active:scale-95 transition-all"
                      >
                        🗑️ Anular
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {carrito.length > 0 && (
            <div>
              <p className="font-bold uppercase tracking-widest text-[10px] mb-2 pl-1" style={{ color: colorPrimario }}>Por Enviar a Cocina (Editables)</p>
              <div className="space-y-2.5">
                {carrito.map(item => {
                    const precioAMostrar = item.precio_unitario_calculado || item.precio_base || item.precio || 0;                    
                    return (
                    <div key={item.cart_id || item.id} className={`rounded-2xl p-4 flex flex-col gap-3 shadow-lg border ${tema === 'dark' ? 'bg-[#161616] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                      <div className="flex justify-between items-start">
                          <div>
                            <span className={`font-bold text-[15px] ${tema === 'dark' ? 'text-neutral-300' : 'text-gray-800'}`}>✓ {item.producto_nombre || item.nombre}</span>
                            {(item.notas_cocina || item.notas_y_modificadores || item.notas) && (
                              <span className="block text-[11px] mt-1 italic font-mono" style={{ color: colorPrimario }}>
                                ↳ {item.notas_cocina || item.notas_y_modificadores || item.notas}
                              </span>
                            )}
                            <p className={`font-mono text-xs mt-1.5 font-bold ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>{formatearSoles(precioAMostrar)} c/u</p>
                          </div>
                          
                          <div className={`flex items-center rounded-xl p-1 border ${tema === 'dark' ? 'bg-[#222222] border-[#333]' : 'bg-gray-100 border-gray-300'}`}>
                            <button onClick={() => restarProducto(item.cart_id || item.id)} className='w-9 h-9 flex items-center justify-center text-red-400 font-black text-xl hover:text-red-500'>-</button>
                            <span className={`w-10 text-center font-black text-xl ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.cantidad}</span>
                            <button onClick={() => sumarUnidad(item.cart_id)} className='w-9 h-9 flex items-center justify-center text-green-500 font-black text-xl hover:text-green-600'>+</button>
                          </div>
                      </div>
                      
                      <div className={`flex justify-start pt-1 border-t ${tema === 'dark' ? 'border-[#222]' : 'border-gray-200'}`}>
                          <button 
                            onClick={() => abrirModalParaEditar(item)}
                            className={`text-[10px] px-4 py-2 rounded-lg font-black uppercase tracking-widest transition-all border active:scale-[0.98] ${tema === 'dark' ? 'bg-[#222] text-neutral-400 hover:text-white border-[#333]' : 'bg-gray-100 text-gray-500 hover:text-gray-900 border-gray-200'}`}
                          >
                            ⚙️ Editar / Notas
                          </button>
                      </div>
                    </div>
                )})}
              </div>
            </div>
          )}
        </div>

        <div className={`p-4 border-t flex flex-col gap-3 sticky bottom-0 left-0 w-full z-10 ${tema === 'dark' ? 'border-[#222] bg-[#0d0d0d]' : 'border-gray-200 bg-[#f8f9fa]'}`}>
            {carrito.length > 0 ? (
                <button 
                  onClick={manejarEnviarCocina}
                  disabled={procesando}
                  className="w-full text-white rounded-xl h-16 font-black text-lg flex justify-center items-center transition-all active:scale-[0.98]"
                  style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 20px ${colorPrimario}40` }}
                >
                  {procesando ? 'PROCESANDO...' : 'ENVIAR A COCINA 🚀'}
                </button>
            ) : (
                ordenActiva && (
                    <button 
                      onClick={() => { setModalCobroAbierto(true); notificarEstadoMesa('cobrando', totalMesa); }}
                      className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl h-16 font-black text-lg flex justify-center items-center shadow-lg shadow-green-500/20 transition-all active:scale-[0.98]"
                    >
                      COBRAR TICKET 💵
                    </button>
                )
            )}
        </div>
      </div>

      {/* ==================== MODALES (INTACTOS PERO FORZADOS A DARK POR CONTRASTE) ==================== */}
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
            onClose={() => setModalCobroAbierto(false)} 
            total={totalMesa} 
            carrito={ordenActiva ? ordenActiva.detalles : []} 
            onCobroExitoso={async (datosPago) => {
              try {
                // 1. Guardamos TODOS los pagos parciales en Django
                for (const pago of datosPago) {
                  // Mandamos el método tal cual viene ('yape', 'efectivo', 'tarjeta')
                  await crearPago({ 
                    orden: ordenActiva.id, 
                    metodo: pago.metodo, 
                    monto: pago.monto 
                  });
                }

                // 2. Tomamos el primer método como referencia para la orden general (opcional)
                
                // 3. Cerramos la mesa
                await actualizarOrden(ordenActiva.id, { 
                  estado: 'completado', 
                  estado_pago: 'pagado', 
                  pago_confirmado: true 
                });

                // 4. Limpiamos y volvemos
                setModalCobroAbierto(false);
                vaciarStore();
                setCarritoAbierto(false);
                onVolver();
                
              } catch (error) { 
                console.error("Error en cobro:", error.response?.data || error);
                alert("Hubo un error al procesar el pago"); 
              }
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
      
      <ModalModificadores 
        isOpen={modalModsAbierto}
        onClose={() => setModalModsAbierto(false)}
        producto={productoParaModificar}
        modificadoresGlobales={["Sin cebolla", "Sin ají", "Para llevar", "Poco arroz", "Salsas aparte"]}
        onAgregarAlCarrito={manejarAgregarAlCarritoDesdeModal}
      />
    </div>
  );
}