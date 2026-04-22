import React, { useState, useEffect, useCallback, useRef } from 'react';
import usePosStore from './store/usePosStore';
import ModalCobro from './ModalCobro';
import ModalModificadores from './ModalModificadores';
import { getProductos, crearOrden, actualizarOrden, getOrdenes, getCategorias, crearPago, agregarProductosAOrden, anularItemDeOrden, getModificadores } from './api/api';

export default function PosView({ mesaId, onVolver, esModoTerminal = false }) {
  // ✨ 1. EXTRAEMOS EL TEMA Y COLOR GLOBAL DE ZUSTAND ✨
  const { estadoCaja, configuracionGlobal, carrito, agregarProducto,esDueño,sedes,manejarCambioSede, editarNotaItem, restarProducto, eliminarProducto, obtenerTotalItems, restarDesdeGrid, obtenerTotalDinero, vaciarCarrito, actualizarItemCompleto, sumarUnidad } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  // ✨ ESTADOS PARA EL BUSCADOR INTELIGENTE
  const [busqueda, setBusqueda] = useState('');
  const [inputBusquedaActivo, setInputBusquedaActivo] = useState(false);
  
  // El "Cerebro" que recuerda qué escoge la gente según lo que escribe
  const [cerebroBusqueda, setCerebroBusqueda] = useState(() => {
    const memoria = localStorage.getItem('pos_cerebro');
    return memoria ? JSON.parse(memoria) : {};
  });

  // Función que "aprende" silenciosamente cuando el mesero toca un producto
  const aprenderSeleccion = (productoId, termino) => {
    if (!termino || termino.trim().length < 2) return; // Solo aprende si escribieron al menos 2 letras
    const terminoLower = termino.trim().toLowerCase();

    setCerebroBusqueda(prev => {
      const nuevoCerebro = { ...prev };
      if (!nuevoCerebro[terminoLower]) nuevoCerebro[terminoLower] = {};
      
      // Suma 1 punto de "frecuencia" a este producto para esta palabra exacta
      nuevoCerebro[terminoLower][productoId] = (nuevoCerebro[terminoLower][productoId] || 0) + 1;
      
      localStorage.setItem('pos_cerebro', JSON.stringify(nuevoCerebro));
      return nuevoCerebro;
    });
  };
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
    // ✨ Cambiamos la lógica para que solo intente enviar si está listo
    if (ws && ws.readyState === WebSocket.OPEN && !esParaLlevar) {
      ws.send(JSON.stringify({ type: 'mesa_estado', mesa_id: mesaId, estado, total }));
    } else {
      console.warn("⚠️ WebSocket no está listo. Reintentando en el próximo evento.");
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
      alert("⚠️ No has seleccionado una sede. Por favor, elige una en la parte superior antes de continuar.");
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
  

  
  // ✨ FILTRO Y ORDENAMIENTO INTELIGENTE
  // ✨ FILTRO, BÚSQUEDA POR VARIACIONES Y ORDENAMIENTO INTELIGENTE
  // ✨ FILTRO, BÚSQUEDA POR VARIACIONES Y ORDENAMIENTO INTELIGENTE
  const productosFiltrados = productosBase
    .filter(plato => {
      // 1. Filtro de Categoría
      const nombreCatDelPlato = categoriasReales.find(c => String(c.id) === String(plato.categoria))?.nombre || plato.categoria;
      const pasaCategoria = (categoriaActiva === 'Todas' || categoriaActiva === 'Todos') || nombreCatDelPlato === categoriaActiva;
      
      const termino = busqueda.trim().toLowerCase();

      // 2. Filtro del Buscador (Por Nombre)
      const pasaNombre = busqueda === '' || plato.nombre.toLowerCase().includes(termino);
      
      // 3. Filtro por Variaciones (Extras específicos del producto)
      // Buscamos si este plato tiene alguna variación que coincida con lo que el mesero escribe
      const modificadoresDelPlato = modificadoresGlobales.filter(m => String(m.producto_id) === String(plato.id) || String(m.producto) === String(plato.id));
      const variacionCoincidente = modificadoresDelPlato.find(m => m.nombre.toLowerCase().includes(termino));
      
      const pasaVariacion = busqueda !== '' && !!variacionCoincidente;

      // Guardamos la coincidencia en el objeto del plato para mostrarlo en la tarjeta
      if (pasaVariacion && !pasaNombre) {
        plato._coincidenciaVariacion = variacionCoincidente.nombre;
      } else {
        plato._coincidenciaVariacion = null;
      }

      return pasaCategoria && (pasaNombre || pasaVariacion);
    })
    .sort((a, b) => {
      // 4. El "Cerebro Local" ordena: Los más tocados para esta palabra van primero
      if (busqueda.trim().length >= 2) {
        const termino = busqueda.trim().toLowerCase();
        const scoreA = cerebroBusqueda[termino]?.[a.id] || 0;
        const scoreB = cerebroBusqueda[termino]?.[b.id] || 0;
        if (scoreA !== scoreB) return scoreB - scoreA; 
      }
      return 0; 
    });
  
  useEffect(() => {
    // 🛡️ Solo actuamos si es Dueño y hay sedes cargadas
    if (esDueño && sedes?.length > 0) {
      const hoy = new Date().toLocaleDateString();
      const ultimaFecha = localStorage.getItem('pos_ultima_fecha');
      const ultimaSedeId = localStorage.getItem('sede_id');

      // 1. ¿Es la primera vez que entra hoy?
      if (ultimaFecha !== hoy) {
        localStorage.setItem('pos_ultima_fecha', hoy);

        // 2. Si ya tenía una sede guardada, le avisamos para evitar errores
        if (ultimaSedeId) {
          const sedeEncontrada = sedes.find(s => String(s.id) === String(ultimaSedeId));
          if (sedeEncontrada) {
            // Usamos un alert o podrías usar un componente de notificación más bonito
            alert(`✅ Bienvenido de nuevo. Estás operando en: ${sedeEncontrada.nombre}.\n\nSi necesitas cambiar de local, usa el menú superior.`);
          }
        }
      }

      // 3. Si por alguna razón no hay sede seleccionada (ej. borró caché), 
      // autoseleccionamos la primera pero le pedimos confirmación silenciosa
      if (!ultimaSedeId && sedes.length > 0) {
        manejarCambioSede(sedes[0].id);
      }
    }
  }, [sedes, esDueño, manejarCambioSede]);
  
  return (
    <div className={`relative h-full flex flex-col overflow-hidden font-sans transition-colors duration-500 ${tema === 'dark' ? 'bg-[#0a0a0a] text-neutral-100' : 'bg-[#f4f4f5] text-gray-900'}`}>
      
      {/* ======================= HEADER TEMATIZADO (MÓVIL) ======================= */}
      {!esModoTerminal && <header className={`p-4 shadow-sm sticky top-0 z-10 border-b transition-colors ${tema === 'dark' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center mb-3 gap-3">
          <div className="flex items-center gap-3 flex-1">
             <button onClick={onVolver} className={`shrink-0 w-10 h-10 border rounded-xl flex items-center justify-center transition-colors font-black text-xl active:scale-95 ${tema === 'dark' ? 'bg-[#1a1a1a] hover:bg-[#222] border-[#222] text-white' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'}`}>←</button>
             
             {/* ✨ HEADER MUTANTE: Título o Buscador Ninja */}
             {inputBusquedaActivo ? (
                <div className="flex-1 flex items-center gap-2">
                  <input 
                    autoFocus
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar plato..."
                    className={`w-full h-10 px-4 rounded-xl font-bold text-sm border focus:outline-none focus:border-[#ff5a1f] ${tema === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    style={{ borderColor: busqueda ? colorPrimario : '' }}
                  />
                  <button onClick={() => { setInputBusquedaActivo(false); setBusqueda(''); }} className={`text-xl px-2 font-black active:scale-90 ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>✕</button>
                </div>
             ) : (
               <div className="flex-1 flex justify-between items-center">
                 <div className="min-w-0">
                    <span className={`text-[10px] font-bold tracking-widest uppercase truncate block ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                      {esParaLlevar ? 'Cajón delivery' : '🍽️ SALÓN'}
                    </span>
                    <h1 className={`text-xl font-black uppercase tracking-tight truncate ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {esParaLlevar ? nombreLlevar : `Mesa ${mesaId}`}
                    </h1>
                 </div>
                 {/* LUPA PARA ACTIVAR BUSCADOR */}
                 <button onClick={() => setInputBusquedaActivo(true)} className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg active:scale-95 transition-colors ${tema === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-300' : 'bg-gray-100 border border-gray-200 text-gray-600'}`}>
                   🔍
                 </button>
               </div>
             )}
          </div>
        </div>

        {/* ✨ BARRIDO DE CATEGORÍAS (1 FILA TIPO PÍLDORA + FILTRO INTELIGENTE) */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
          <button 
            onClick={() => setCategoriaActiva('Todas')}
            className={`snap-start shrink-0 px-5 py-2.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 border ${
              categoriaActiva === 'Todas' 
                ? `text-white shadow-md border-transparent` 
                : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#333]' : 'bg-gray-100 text-gray-500 border-gray-200')
            }`}
            style={categoriaActiva === 'Todas' ? { backgroundColor: colorPrimario } : {}}
          >
            TODAS
          </button>
          
          {categoriasReales
            .filter(cat => productosBase.some(prod => String(prod.categoria) === String(cat.id) || prod.categoria === cat.nombre || prod.categoria === cat))
            .map((cat, index) => {
            const nombreMostrar = cat.nombre || cat;
            const keyUnica = cat.id || `cat-${index}`;
            return (
              <button 
                key={keyUnica} 
                onClick={() => setCategoriaActiva(nombreMostrar)}
                className={`snap-start shrink-0 px-5 py-2.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 border ${
                  categoriaActiva === nombreMostrar
                    ? `text-white shadow-md border-transparent` 
                    : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#333]' : 'bg-gray-100 text-gray-500 border-gray-200')
                }`}
                style={categoriaActiva === nombreMostrar ? { backgroundColor: colorPrimario } : {}}
              >
                {nombreMostrar}
              </button>
            )
          })}
        </div>
      </header>}

      {/* ======================= HEADER MODO TERMINAL (PC PANTALLA DIVIDIDA) ======================= */}
      {esModoTerminal && (
        <div className={`px-4 sm:px-6 pt-4 pb-2 sticky top-0 z-10 border-b transition-colors shadow-sm ${tema === 'dark' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white border-gray-200'}`}>
           
           {/* ✨ HEADER MUTANTE PC: Buscador Ninja superior */}
           <div className="mb-4">
             {inputBusquedaActivo ? (
                <div className="flex items-center gap-2">
                  <input 
                    autoFocus
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar plato rápidamente..."
                    className={`w-full h-12 px-5 rounded-2xl font-black text-sm border focus:outline-none transition-colors ${tema === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    style={{ borderColor: busqueda ? colorPrimario : '', boxShadow: busqueda ? `0 0 0 2px ${colorPrimario}33` : '' }}
                  />
                  <button onClick={() => { setInputBusquedaActivo(false); setBusqueda(''); }} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black active:scale-95 ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border border-[#333]' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>✕</button>
                </div>
             ) : (
                <button 
                  onClick={() => setInputBusquedaActivo(true)} 
                  className={`w-full h-12 px-5 rounded-2xl font-bold text-sm border flex items-center justify-between transition-colors active:scale-[0.99] ${tema === 'dark' ? 'bg-[#111] border-[#333] text-neutral-400 hover:bg-[#1a1a1a]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                >
                  <span>🔍 Buscar por nombre o atajo...</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded border ${tema === 'dark' ? 'bg-[#222] border-[#444]' : 'bg-white border-gray-300'}`}>Ctrl + K</span>
                </button>
             )}
           </div>

           {/* ✨ BARRIDO DE CATEGORÍAS */}
           <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
              <button 
                onClick={() => setCategoriaActiva('Todas')}
                className={`snap-start shrink-0 px-5 py-2.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 border ${
                  categoriaActiva === 'Todas' 
                    ? `text-white shadow-md border-transparent` 
                    : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#333]' : 'bg-gray-100 text-gray-500 border-gray-200')
                }`}
                style={categoriaActiva === 'Todas' ? { backgroundColor: colorPrimario } : {}}
              >
                TODAS
              </button>

              {categoriasReales
                .filter(cat => productosBase.some(prod => String(prod.categoria) === String(cat.id) || prod.categoria === cat.nombre || prod.categoria === cat))
                .map((cat, index) => {
                const nombreMostrar = cat.nombre || cat;
                const keyUnica = cat.id || `cat-${index}`;
                return (
                  <button 
                    key={keyUnica} 
                    onClick={() => setCategoriaActiva(nombreMostrar)}
                    className={`snap-start shrink-0 px-5 py-2.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 border ${
                      categoriaActiva === nombreMostrar
                        ? `text-white shadow-md border-transparent` 
                        : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#333]' : 'bg-gray-100 text-gray-500 border-gray-200')
                    }`}
                    style={categoriaActiva === nombreMostrar ? { backgroundColor: colorPrimario } : {}}
                  >
                    {nombreMostrar}
                  </button>
                )
              })}
           </div>
        </div>
      )}

      {/* ==================== CUADRÍCULA DE PRODUCTOS TEMATIZADA ==================== */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4 min-h-0">
        <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 relative z-0 pb-4">
          {productosFiltrados.map((prod) => {
            const totalCantidadProd = carrito.filter(item => item.id === prod.id).reduce((acc, curr) => acc + curr.cantidad, 0);
            const tieneVariantes = carrito.some(item => item.id === prod.id && item.cart_id !== `base_${prod.id}`);
            const nombreCategoriaMuestra = categoriasReales.find(c => String(c.id) === String(prod.categoria))?.nombre || 'Sin categoría';
            
            // ================== TARJETAS CON SELECCIÓN ==================
            if (prod.requiere_seleccion) {
                return (
                  <button 
                    key={prod.id} 
                    onClick={() => {
                        if (prod.disponible) {
                            abrirModalParaNuevo(prod);
                            aprenderSeleccion(prod.id, busqueda); // 🧠 Enseña al cerebro
                        }
                    }} 
                    disabled={!prod.disponible}
                    className={`relative p-3 sm:p-4 rounded-3xl shadow-lg transition-all flex flex-col justify-between h-36 sm:h-44 text-left group ${
                      prod.disponible 
                        ? (tema === 'dark' ? 'bg-[#111] border border-[#222] hover:border-[#444] active:scale-95 cursor-pointer' : 'bg-white border border-gray-200 hover:shadow-xl active:scale-95 cursor-pointer') 
                        : (tema === 'dark' ? 'bg-[#0a0a0a] border border-[#1a1a1a] opacity-50 cursor-not-allowed' : 'bg-gray-50 border border-gray-200 opacity-50 cursor-not-allowed')
                    }`}
                  >
                    {!prod.disponible && <div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest z-10 shadow-lg">Agotado</div>}
                    
                    <div className="flex-1 pointer-events-none flex flex-col">
                      <span className={`font-bold leading-tight text-[14px] sm:text-[16px] line-clamp-2 ${tema === 'dark' ? 'text-neutral-200 group-hover:text-white' : 'text-gray-800 group-hover:text-black'}`}>{prod.nombre}</span>
                      
                      {/* ✨ ETIQUETA MÁGICA DE COINCIDENCIA */}
                      {prod._coincidenciaVariacion && (
                        <span className="text-[10px] font-black uppercase mt-0.5 animate-pulse" style={{ color: colorPrimario }}>
                          ↳ {prod._coincidenciaVariacion}
                        </span>
                      )}

                      <p className={`text-[9px] sm:text-[10px] mt-0.5 uppercase font-black tracking-widest truncate ${tema === 'dark' ? 'text-neutral-600' : 'text-gray-400'}`}>{nombreCategoriaMuestra}</p>
                    </div>
                    
                    <div className="flex justify-between items-end w-full mt-1 shrink-0">
                        <span className={`text-[9px] sm:text-[10px] uppercase font-black tracking-widest px-2.5 py-1.5 rounded-lg border ${tema === 'dark' ? 'text-neutral-400 bg-[#1a1a1a] border-[#2a2a2a]' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>Opciones</span>
                        {totalCantidadProd > 0 && (
                            <div className='text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-sm sm:text-base shadow-lg' style={{ backgroundColor: colorPrimario }}>{totalCantidadProd}</div>
                        )}
                    </div>
                  </button>
                );
            }

            // ================== TARJETAS NORMALES ==================
            const precioAMostrar = parseFloat(prod.precio_base || prod.precio);
            return (
              <div 
                key={prod.id} 
                onClick={() => { 
                  if (prod.disponible) { 
                    if (ordenActiva) notificarEstadoMesa('tomando_pedido', totalMesa); 
                    agregarProducto(prod); 
                    aprenderSeleccion(prod.id, busqueda); // 🧠 Enseña al cerebro
                  } 
                }}
                className={`relative p-2.5 sm:p-4 rounded-3xl shadow-lg transition-all flex flex-col text-left justify-between overflow-hidden h-36 sm:h-44 ${
                  prod.disponible 
                    ? (tema === 'dark' ? 'bg-[#111] border border-[#222] hover:bg-[#151515] cursor-pointer' : 'bg-white border border-gray-200 hover:shadow-xl cursor-pointer hover:bg-gray-50') 
                    : (tema === 'dark' ? 'bg-[#0a0a0a] border border-[#1a1a1a] opacity-50 cursor-not-allowed' : 'bg-gray-50 border border-gray-200 opacity-50 cursor-not-allowed')
                }`}
              >
                {!prod.disponible && <div className="absolute top-3 right-3 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest z-10 shadow-lg">Agotado</div>}
                
                <div className='flex-1 mb-1 pointer-events-none flex flex-col'>
                  <span className={`font-bold leading-tight text-[14px] sm:text-[16px] line-clamp-2 ${tema === 'dark' ? 'text-neutral-200' : 'text-gray-800'}`}>{prod.nombre}</span>
                  
                  {/* ✨ ETIQUETA MÁGICA DE COINCIDENCIA */}
                  {prod._coincidenciaVariacion && (
                    <span className="text-[10px] font-black uppercase mt-0.5 animate-pulse" style={{ color: colorPrimario }}>
                      ↳ {prod._coincidenciaVariacion}
                    </span>
                  )}

                  <p className={`text-[9px] mt-0.5 uppercase font-black tracking-widest truncate ${tema === 'dark' ? 'text-neutral-600' : 'text-gray-400'}`}>{nombreCategoriaMuestra}</p>
                  <p className="font-mono text-xs sm:text-sm font-bold mt-auto pb-1" style={{ color: colorPrimario }}>{formatearSoles(precioAMostrar)}</p>
                </div>
                
                <div className={`flex flex-row items-center justify-between gap-1.5 pt-1.5 border-t shrink-0 ${!prod.disponible ? 'pointer-events-none' : ''} ${tema === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-100'}`}>
                    
                    {totalCantidadProd > 0 && (
                      <div className='flex-1 flex items-center justify-between gap-1'>
                        <button onClick={(e) => { e.stopPropagation(); restarDesdeGrid(prod.id); }} disabled={!prod.disponible} className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-black text-lg transition-all border bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white disabled:opacity-50">-</button>
                        <span className={`flex-1 h-8 sm:h-10 rounded-lg font-black text-sm sm:text-base flex items-center justify-center border transition-all ${tema === 'dark' ? 'bg-[#1a1a1a] text-white border-[#333]' : 'bg-gray-100 text-gray-900 border-gray-300'}`}>
                            {totalCantidadProd}
                            {tieneVariantes && <span className="absolute top-0.5 right-1 text-[8px]" style={{ color: colorPrimario }}>⚙️</span>}
                        </span>
                        <button onClick={(e) => { e.stopPropagation(); agregarProducto(prod); }} disabled={!prod.disponible} className='w-8 h-8 sm:w-10 sm:h-10 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-lg flex items-center justify-center font-black text-lg transition-all disabled:opacity-50'>+</button>
                      </div>
                    )}
                    
                    {prod.tiene_variaciones ? (
                      totalCantidadProd > 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); abrirModalParaNuevo(prod); }} disabled={!prod.disponible} className="shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg border transition-colors flex items-center justify-center hover:brightness-110" style={{ color: colorPrimario, backgroundColor: colorPrimario + '1A', borderColor: colorPrimario + '4D' }}>
                          ⚙️
                        </button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); abrirModalParaNuevo(prod); }} disabled={!prod.disponible} className="w-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest py-2 sm:py-2.5 rounded-lg border transition-colors hover:brightness-110" style={{ color: colorPrimario, backgroundColor: colorPrimario + '1A', borderColor: colorPrimario + '4D' }}>
                          ⚙️ Variantes / Opc.
                        </button>
                      )
                    ) : (
                      totalCantidadProd > 0 ? (
                        <button onClick={(e) => { e.stopPropagation(); abrirModalParaNuevo(prod); }} disabled={!prod.disponible} className={`shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg border transition-colors flex items-center justify-center disabled:opacity-50 ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#444]' : 'bg-gray-100 border-gray-200 hover:border-gray-300'}`} title="Agregar Nota">
                          📝
                        </button>
                      ) : (
                        <div className="w-full flex justify-end">
                          <button onClick={(e) => { e.stopPropagation(); abrirModalParaNuevo(prod); }} disabled={!prod.disponible} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border transition-colors flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest disabled:opacity-50 ${tema === 'dark' ? 'text-neutral-500 bg-[#1a1a1a] border-[#2a2a2a] hover:text-white' : 'text-gray-500 bg-gray-100 border-gray-200 hover:text-gray-800'}`}>
                            📝 <span className="hidden sm:inline">Nota</span>
                          </button>
                        </div>
                      )
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
{/* ==================== FOOTER FLOTANTE (VER CUENTA) ==================== */}
      {/* ✨ SE CAMBIÓ 'absolute' POR 'shrink-0' PARA QUE NO TAPE LA LISTA */}
      <div className={`shrink-0 w-full p-4 sm:px-6 border-t z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] transition-colors ${tema === 'dark' ? 'bg-[#0d0d0d] border-[#222]' : 'bg-white border-gray-200'}`}>
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
      {/* Overlay oscuro para cerrar al hacer clic afuera */}
      {carritoAbierto && <div className="absolute inset-0 bg-black/60 z-30 transition-opacity backdrop-blur-sm" onClick={() => setCarritoAbierto(false)}></div>}

      <div className={`absolute inset-x-0 bottom-0 z-40 rounded-t-[2rem] border-t flex flex-col transition-transform duration-300 ease-out shadow-[0_-20px_60px_rgba(0,0,0,0.8)] ${carritoAbierto ? 'translate-y-0' : 'translate-y-full'} ${tema === 'dark' ? 'bg-[#0d0d0d] border-[#222]' : 'bg-white border-gray-200'}`} style={{ maxHeight: '100%' }}>
        
        {/* Agarradera (Handle) superior */}
        <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer shrink-0" onClick={() => setCarritoAbierto(false)}>
          <div className={`w-14 h-1.5 rounded-full ${tema === 'dark' ? 'bg-[#333]' : 'bg-gray-300'}`}></div>
        </div>

        {/* HEADER DEL CARRITO */}
        <div className={`px-6 pb-4 pt-1 flex justify-between items-start border-b shrink-0 ${tema === 'dark' ? 'border-[#222]' : 'border-gray-100'}`}>
          <div>
             <p className={`text-[10px] font-black tracking-widest uppercase mb-1 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>Total de la cuenta</p>
             <p className={`text-4xl sm:text-5xl font-black tracking-tighter leading-none ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatearSoles(totalMesa)}</p>
             <p className={`text-xs font-bold mt-2 ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>{cantItemsMesa} artículos en total</p>
          </div>
          <div className="flex flex-col items-end gap-3">
             {/* ✨ NUEVO BOTÓN EXPLICITO PARA CERRAR EL CAJÓN EN PC */}
             <button onClick={() => setCarritoAbierto(false)} className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl transition-colors active:scale-95 ${tema === 'dark' ? 'bg-[#222] text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
               ✕
             </button>
             {carrito.length > 0 && (
               <button onClick={vaciarStore} className="text-red-500 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-colors font-bold text-xs active:scale-95 border border-red-500/20">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 Limpiar
               </button>
             )}
          </div>
        </div>

        {/* ÁREA SCROLLABLE DE PRODUCTOS (CARRITO) */}
        {/* ✨ SE ELIMINÓ EL pb-32. AHORA CHOCA PERFECTO CON EL FOOTER */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0 scrollbar-hide">
          {/* --- SECCIÓN 1: YA EN COCINA --- */}
          {ordenActiva && ordenActiva.detalles.length > 0 && (
            <div className="space-y-3">
               <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>Ya en cocina</span>
                  <div className={`flex-1 h-px ${tema === 'dark' ? 'bg-[#222]' : 'bg-gray-200'}`}></div>
               </div>

               {ordenActiva.detalles.map((item, index) => (
                  <div key={`db-${index}`} className={`p-4 rounded-2xl border flex gap-4 items-center opacity-70 ${tema === 'dark' ? 'bg-[#141414] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
                     <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-black text-xl ${tema === 'dark' ? 'bg-[#222] text-neutral-400' : 'bg-gray-200 text-gray-600'}`}>
                        {item.cantidad}
                     </div>
                     <div className="flex-1 min-w-0">
                        <p className={`font-bold text-base sm:text-lg truncate leading-tight ${tema === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>{item.producto_nombre || item.nombre}</p>
                        {(item.notas_cocina || item.notas_y_modificadores || item.notas) && (
                          <p className="text-xs mt-1 leading-tight font-medium truncate" style={{ color: colorPrimario }}>↳ {item.notas_cocina || item.notas_y_modificadores || item.notas}</p>
                        )}
                        <p className={`text-xs font-bold mt-1.5 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>{formatearSoles(item.precio_unitario)} c/u</p>
                     </div>
                     <button onClick={() => manejarAnularItem(item.id, item.producto_nombre || item.nombre)} disabled={procesando} className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors active:scale-95 border border-red-500/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                  </div>
               ))}
            </div>
          )}

          {/* --- SECCIÓN 2: NUEVOS PEDIDOS --- */}
          {carrito.length > 0 && (
            <div className="space-y-3">
               <div className="flex items-center gap-3 mb-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: colorPrimario }}>Nuevos Pedidos</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: `${colorPrimario}40` }}></div>
               </div>

               {carrito.map(item => {
                  const precioAMostrar = item.precio_unitario_calculado || item.precio_base || item.precio || 0;
                  return (
                    <div key={item.cart_id || item.id} className={`p-4 sm:p-5 rounded-3xl border shadow-sm flex flex-col gap-4 ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}>
                       
                       <div className="flex justify-between items-start gap-3">
                          <div className="flex-1 min-w-0">
                             <p className={`font-black text-lg sm:text-xl leading-tight ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.producto_nombre || item.nombre}</p>
                             {(item.notas_cocina || item.notas_y_modificadores || item.notas) && (
                               <p className="text-xs sm:text-sm mt-1.5 leading-tight font-medium" style={{ color: colorPrimario }}>↳ {item.notas_cocina || item.notas_y_modificadores || item.notas}</p>
                             )}
                             <p className={`text-sm font-bold mt-1.5 ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>{formatearSoles(precioAMostrar)} c/u</p>
                          </div>
                          <p className={`font-black text-xl sm:text-2xl shrink-0 ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatearSoles(precioAMostrar * item.cantidad)}</p>
                       </div>

                       <div className={`pt-4 border-t flex justify-between items-center gap-2 ${tema === 'dark' ? 'border-[#333]' : 'border-gray-100'}`}>
                          <button onClick={() => abrirModalParaEditar(item)} className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors active:scale-95 flex items-center gap-2 ${tema === 'dark' ? 'bg-[#2a2a2a] text-neutral-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                             📝 Notas
                          </button>

                          <div className={`flex items-center rounded-xl p-1.5 border ${tema === 'dark' ? 'bg-[#111] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                             <button onClick={() => restarProducto(item.cart_id || item.id)} className="w-12 h-10 sm:w-14 sm:h-12 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 font-black text-2xl hover:bg-red-500 hover:text-white transition-colors active:scale-90 border border-red-500/20">-</button>
                             <span className={`w-14 sm:w-16 text-center font-black text-xl sm:text-2xl ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.cantidad}</span>
                             <button onClick={() => sumarUnidad(item.cart_id)} className="w-12 h-10 sm:w-14 sm:h-12 flex items-center justify-center rounded-lg bg-green-500/10 text-green-500 font-black text-2xl hover:bg-green-500 hover:text-white transition-colors active:scale-90 border border-green-500/20">+</button>
                          </div>
                       </div>
                    </div>
                  )
               })}
            </div>
          )}
        </div>

        {/* BOTONERA INFERIOR DEL CAJÓN (ENVIAR / COBRAR) */}
        {/* ✨ SE ELIMINÓ EL 'absolute'. AHORA ES UN ELEMENTO NORMAL (shrink-0) AL FINAL DEL CAJÓN */}
        <div className={`p-4 sm:p-6 border-t flex flex-col gap-3 shrink-0 ${tema === 'dark' ? 'border-[#222] bg-[#0d0d0d]' : 'border-gray-200 bg-white'}`}>
           {carrito.length > 0 ? (
               <button onClick={manejarEnviarCocina} disabled={procesando} className="w-full text-white rounded-2xl h-16 sm:h-20 font-black text-xl sm:text-2xl flex justify-center items-center transition-all active:scale-[0.98]" style={{ backgroundColor: colorPrimario, boxShadow: `0 8px 25px ${colorPrimario}50` }}>
                 {procesando ? 'PROCESANDO...' : 'ENVIAR A COCINA 🚀'}
               </button>
           ) : (
               ordenActiva && (
                   <button onClick={() => { setModalCobroAbierto(true); notificarEstadoMesa('cobrando', totalMesa); }} className="w-full bg-green-500 hover:bg-green-600 text-white rounded-2xl h-16 sm:h-20 font-black text-xl sm:text-2xl flex justify-center items-center shadow-[0_8px_25px_rgba(34,197,94,0.4)] transition-all active:scale-[0.98]">
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
        modificadoresGlobales={modificadoresGlobales} // 🌟 Le pasamos la variable de estado que descargaste en cargarData()
        onAgregarAlCarrito={manejarAgregarAlCarritoDesdeModal}
      />
    </div>
  );
}