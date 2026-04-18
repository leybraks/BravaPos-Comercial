import React, { useState, useEffect, useRef } from 'react';
// ✨ 1. Importamos la nueva función getNegocio
import { actualizarOrden, getOrdenes, getNegocio } from './api/api'; 
import usePosStore from './store/usePosStore'; 

export default function KdsView({ onVolver }) {
  const { configuracionGlobal } = usePosStore();
  const setConfiguracionGlobal = usePosStore((state) => state.setConfiguracionGlobal);

  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  // 🛡️ 2. ESTADOS DE SEGURIDAD EXCLUSIVOS DEL KDS
  const [verificandoAcceso, setVerificandoAcceso] = useState(true);
  const [accesoPermitido, setAccesoPermitido] = useState(false);

  const wsUrl = import.meta.env.VITE_WS_URL;
  const [estacionActiva, setEstacionActiva] = useState('TODO');
  const [estacionesExpandidas, setEstacionesExpandidas] = useState(false);
  const [verConsolidado, setVerConsolidado] = useState(false);
  const [historial, setHistorial] = useState([]); 
  const estaciones = ['TODO', 'COCINA', 'BAR', 'PARRILLA'];

  const [ordenes, setOrdenes] = useState([]);
  const ws = useRef(null);

  const sedeActualId = localStorage.getItem('sede_id');
  const negocioId = localStorage.getItem('negocio_id') || 1;

  // 🛡️ 3. EL KDS PREGUNTA A LA BASE DE DATOS DIRECTAMENTE
  // 🛡️ EL KDS PREGUNTA A LA BASE DE DATOS DIRECTAMENTE
  useEffect(() => {
    const verificarPermisos = async () => {
      try {
        const response = await getNegocio(negocioId);
        const datosBD = response.data; // Guardamos todo el JSON que llega

        setAccesoPermitido(datosBD.mod_cocina_activo);

        // ✨ 2. LA MAGIA DE LOS COLORES: Sincronizamos Zustand
        if (setConfiguracionGlobal) {
          setConfiguracionGlobal({
            colorPrimario: datosBD.color_primario || '#ff5a1f',
            temaFondo: datosBD.tema_fondo || 'dark',
            // Por si acaso, también actualizamos el estado del módulo
            modulos: {
              ...(configuracionGlobal?.modulos || {}),
              cocina: datosBD.mod_cocina_activo
            }
          });
        }

      } catch (error) {
        console.error("Error verificando permiso del KDS:", error);
        setAccesoPermitido(false); // Ante la duda, bloqueamos
      } finally {
        setVerificandoAcceso(false); // Terminamos de cargar
      }
    };
    verificarPermisos();
  }, [negocioId]); // Dependencias del useEffect

  // --- LÓGICA DE WEBSOCKET (Ahora depende de accesoPermitido) ---
  useEffect(() => {
    if (!accesoPermitido) return; // Si no hay permiso, cortamos aquí

    ws.current = new WebSocket(`${wsUrl}/ws/cocina/${sedeActualId}/`);
    ws.current.onopen = () => console.log(`🔥 KDS Conectado a la Cocina (Sede ${sedeActualId})`);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'nueva_orden') {
        const nuevosItems = data.orden.detalles.map(d => ({
          id: d.id,
          cant: d.cantidad !== undefined ? d.cantidad : 1, 
          nombre: d.producto_nombre || d.nombre,
          listo: false,
          notas: d.notas_cocina 
        }));

        setOrdenes(prev => {
          const ticketViejo = prev.find(o => o.id === data.orden.id);
          if (ticketViejo) {
            const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const itemsRealmenteNuevos = nuevosItems
              .filter(nuevo => !ticketViejo.items.some(viejo => viejo.id === nuevo.id))
              .map(item => ({ ...item, agregado_reciente: true, hora_agregado: horaActual }));

            const ticketActualizado = { ...ticketViejo, items: [...ticketViejo.items, ...itemsRealmenteNuevos] };
            return [ticketActualizado, ...prev.filter(o => o.id !== data.orden.id)];
          }

          const nuevaOrden = {
            kds_id: `ws_${data.orden.id}_${Date.now()}`,
            id: data.orden.id,
            real_id: data.orden.real_id || data.orden.id,
            origen: data.orden.mesa ? `Mesa ${data.orden.mesa}` : `🛍️ LLEVAR - ${data.orden.cliente_nombre || 'Cliente'}`, 
            minutos: 0, 
            estacion: 'COCINA', 
            items: nuevosItems
          };
          return [nuevaOrden, ...prev];
        });
      }
    };
    ws.current.onclose = () => console.log("KDS Desconectado");
    return () => { if (ws.current) ws.current.close(); };
  }, [sedeActualId, wsUrl, accesoPermitido]);

  useEffect(() => {
    if (!accesoPermitido) return; // Bloqueo de memoria

    async function recuperarMemoria() {
      try {
        const respuesta = await getOrdenes({ sede_id: sedeActualId });
        const pendientes = respuesta.data.filter(o => o.estado === 'preparando');
        const ordenesFormateadas = pendientes.map(o => {
          const fechaCreacion = new Date(o.creado_en || new Date()); 
          const minutosTranscurridos = Math.floor((new Date() - fechaCreacion) / 60000);
          return {
            kds_id: `mem_${o.id}_${Math.random()}`,
            id: o.id,
            origen: o.mesa ? `Mesa ${o.mesa}` : `🛍️ LLEVAR - ${o.cliente_nombre || 'Cliente'}`,
            minutos: isNaN(minutosTranscurridos) ? 0 : minutosTranscurridos, 
            estacion: 'COCINA', 
            items: o.detalles.map(d => ({
              id: d.id, cant: d.cantidad, nombre: d.producto_nombre || d.nombre, listo: false, notas: d.notas_cocina 
            }))
          };
        });
        setOrdenes(ordenesFormateadas);
      } catch (error) {
        console.error("Error recuperando memoria de la cocina:", error);
      }
    }
    recuperarMemoria();
  }, [sedeActualId, accesoPermitido]);

  useEffect(() => {
    if (!accesoPermitido) return;
    const intervalo = setInterval(() => {
      setOrdenes(prev => prev.map(o => ({ ...o, minutos: o.minutos + 1 })));
    }, 60000);
    return () => clearInterval(intervalo);
  }, [accesoPermitido]);

  const tacharItem = (kdsId, itemId) => {
    setOrdenes(prev => prev.map(o => {
      if (o.kds_id === kdsId) return { ...o, items: o.items.map(i => i.id === itemId ? { ...i, listo: !i.listo } : i) };
      return o;
    }));
  };

  const despacharOrden = async (orden) => {
    try {
      await actualizarOrden(orden.real_id || orden.id, { estado: 'listo' });
      setHistorial([orden, ...historial].slice(0, 5)); 
      setOrdenes(ordenes.filter(o => o.kds_id !== orden.kds_id)); 
    } catch (error) {
      console.error("Error al despachar la orden:", error);
      alert("La base de datos se rebeló. Revisa la consola.");
    }
  };

  const recuperarOrden = (orden) => {
    setOrdenes([...ordenes, orden]);
    setHistorial(historial.filter(h => h.id !== orden.id));
  };

  const obtenerConsolidado = () => {
    const resumen = {};
    ordenes.filter(o => estacionActiva === 'TODO' || o.estacion === estacionActiva).forEach(o => {
        o.items.forEach(i => { if (!i.listo) resumen[i.nombre] = (resumen[i.nombre] || 0) + i.cant; });
      });
    return Object.entries(resumen);
  };

  const ordenesFiltradas = ordenes.filter(o => estacionActiva === 'TODO' || o.estacion === estacionActiva);

  // 🛡️ 4. PANTALLAS DE BLOQUEO TEMATIZADAS

  if (verificandoAcceso) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-bold tracking-widest animate-pulse transition-colors duration-500 ${tema === 'dark' ? 'bg-[#0a0a0a] text-neutral-500' : 'bg-[#f0f0f0] text-gray-400'}`}>
        VERIFICANDO PERMISOS DE COCINA...
      </div>
    );
  }

  if (!accesoPermitido) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 text-center animate-fadeIn transition-colors duration-500 ${tema === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f0f0f0]'}`}>
        <div className={`max-w-md p-10 rounded-3xl border shadow-2xl ${tema === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
          <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🚫</span>
          </div>
          <h1 className={`text-2xl font-black mb-2 uppercase tracking-tight ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Módulo Desactivado
          </h1>
          <p className={`mb-8 leading-relaxed ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
            La Pantalla de Cocina (KDS) no está habilitada para este negocio. 
            Por favor, actívala en las configuraciones del sistema o contacta con soporte.
          </p>
          <button 
            onClick={onVolver} 
            className={`w-full py-4 rounded-2xl font-black transition-all active:scale-95 ${tema === 'dark' ? 'bg-white text-black hover:bg-neutral-200' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
          >
            VOLVER AL PANEL
          </button>
        </div>
      </div>
    );
  }

  // --- 5. RENDERIZADO DEL KDS NORMAL (Si tiene permiso) ---
  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-500 ${tema === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f0f0f0] text-gray-900'}`}>
      {/* HEADER */}
      <header className={`p-4 flex flex-col gap-4 shadow-md sticky top-0 z-20 transition-colors ${tema === 'dark' ? 'bg-[#111] border-b border-[#222]' : 'bg-white border-b border-gray-200'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-widest uppercase leading-none" style={{ color: colorPrimario }}>
                Cocina<br className="hidden sm:block md:hidden"/> Viva
              </h1>
            </div>
            <div className={`px-3 py-1.5 rounded-lg flex items-center gap-2 ${tema === 'dark' ? 'bg-[#222]' : 'bg-gray-100 border border-gray-200'}`}>
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className={`text-[10px] sm:text-xs font-bold ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>EN LÍNEA</span>
            </div>
          </div>
          <div className={`font-mono text-sm sm:text-lg font-bold px-4 py-3 md:py-2 rounded-xl border w-full md:w-auto text-center ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-neutral-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
            <span className={tema === 'dark' ? 'text-white' : 'text-gray-900'}>{ordenesFiltradas.length}</span> PEDIDOS PENDIENTES
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 z-30">
          <div className="relative flex-1">
            <button 
              onClick={() => setEstacionesExpandidas(!estacionesExpandidas)}
              className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border transition-colors shadow-sm ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-200 border-[#333] hover:bg-[#222]' : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'}`}
            >
              <span className="font-semibold text-sm">
                Estación: <span className="ml-1" style={{ color: colorPrimario }}>{estacionActiva}</span>
              </span>
              <svg className={`w-5 h-5 transform transition-transform duration-200 ${estacionesExpandidas ? 'rotate-180' : 'text-neutral-500'}`} style={estacionesExpandidas ? { color: colorPrimario } : {}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {estacionesExpandidas && (
              <div className={`absolute top-full left-0 w-full border rounded-xl mt-2 p-2 grid grid-cols-2 gap-2 shadow-2xl animate-fadeIn z-50 ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}>
                  {estaciones.map(est => {
                    const isActivo = estacionActiva === est;
                    return (
                      <button 
                        key={est} 
                        onClick={() => { setEstacionActiva(est); setEstacionesExpandidas(false); }} 
                        className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors border text-center ${!isActivo ? (tema === 'dark' ? 'bg-[#222] text-neutral-400 border-[#333] hover:bg-[#2a2a2a]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100') : ''}`}
                        style={isActivo ? { backgroundColor: colorPrimario, borderColor: colorPrimario, color: '#fff' } : {}}
                      >
                          {est}
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
          <button 
            onClick={() => setVerConsolidado(!verConsolidado)}
            className={`px-6 py-3 rounded-xl font-bold border transition-all sm:w-auto w-full flex justify-center items-center gap-2 ${!verConsolidado ? (tema === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-neutral-400 hover:text-white hover:bg-[#222]' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50') : ''}`}
            style={verConsolidado ? { backgroundColor: colorPrimario, borderColor: colorPrimario, color: '#fff', boxShadow: `0 0 15px ${colorPrimario}40` } : {}}
          >
            {verConsolidado ? <><span className="text-xl">📋</span> Ver Tickets</> : <><span className="text-xl">📊</span> Ver Consolidado</>}
          </button>
        </div>
      </header>

      {/* ÁREA DE TICKETS */}
      <div className="p-4 flex-1 overflow-y-auto">
        {verConsolidado ? (
          <div className={`w-full max-w-2xl mx-auto rounded-3xl p-6 md:p-8 border animate-fadeIn ${tema === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200 shadow-md'}`}>
            <h2 className="text-neutral-500 font-bold mb-6 uppercase tracking-widest text-center text-sm">Resumen de Producción: {estacionActiva}</h2>
            <div className="space-y-3">
              {obtenerConsolidado().length > 0 ? (
                obtenerConsolidado().map(([nombre, cant]) => (
                  <div key={nombre} className={`flex justify-between items-center p-4 md:p-6 rounded-2xl border ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
                    <span className="text-lg md:text-2xl font-bold">{nombre}</span>
                    <span className="text-3xl md:text-4xl font-black" style={{ color: colorPrimario }}>x{cant}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-neutral-600 py-10 font-bold">No hay platos pendientes.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start content-start">
            {ordenesFiltradas.length === 0 && (
              <div className="col-span-full text-center py-20 text-neutral-500 font-bold text-xl">
                Esperando comandas... 👨‍🍳
              </div>
            )}
            {ordenesFiltradas.map(orden => {
              let colorHeader = tema === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200';
              let colorTiempo = tema === 'dark' ? 'text-green-400' : 'text-green-600';
              let textoTiempo = 'A tiempo';
              
              if (orden.minutos >= 10 && orden.minutos < 20) {
                colorHeader = tema === 'dark' ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-300';
                colorTiempo = tema === 'dark' ? 'text-yellow-400' : 'text-yellow-600';
                textoTiempo = 'Demorado';
              } else if (orden.minutos >= 20) {
                colorHeader = tema === 'dark' ? 'bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse-slow' : 'bg-red-50 border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse-slow';
                colorTiempo = tema === 'dark' ? 'text-red-400 font-black' : 'text-red-600 font-black';
                textoTiempo = '¡URGENTE!';
              }

              const todosListos = orden.items.every(i => i.listo);

              return (
                <div key={orden.kds_id} className={`w-full border rounded-2xl overflow-hidden flex flex-col shadow-xl animate-fadeIn ${tema === 'dark' ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-gray-200'}`}>
                  <div className={`p-4 border-b flex justify-between items-center ${colorHeader}`}>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate max-w-[150px] sm:max-w-[180px]">{orden.origen}</h2>
                      <p className="text-neutral-400 text-xs mt-1"># {orden.id}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl sm:text-3xl font-mono font-bold ${colorTiempo}`}>{orden.minutos}'</p>
                      <p className={`text-[9px] sm:text-[10px] uppercase tracking-widest ${colorTiempo}`}>{textoTiempo}</p>
                    </div>
                  </div>

                  <div className="p-2 flex-1 space-y-1">
                    {orden.items.map(item => (
                      <button 
                        key={item.id}
                        onClick={() => tacharItem(orden.kds_id, item.id)}
                        className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors active:scale-[0.98] ${item.listo ? (tema === 'dark' ? 'bg-[#1a1a1a] opacity-50' : 'bg-gray-50 opacity-60') : (tema === 'dark' ? 'bg-[#222] hover:bg-[#2a2a2a]' : 'bg-white border border-gray-100 shadow-sm hover:bg-gray-50')}`}
                      >
                        <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-lg border ${item.listo ? 'bg-green-500/20 border-green-500/50 text-green-500' : (tema === 'dark' ? 'bg-[#111] border-[#444]' : 'bg-white border-gray-300')}`} style={!item.listo ? { color: colorPrimario } : {}}>
                          {item.cant}
                        </div>
                        
                        <div className="flex-1 pt-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-bold text-[15px] sm:text-[17px] leading-tight ${item.listo ? 'line-through text-neutral-500' : (tema === 'dark' ? 'text-neutral-100' : 'text-gray-900')}`}>
                              {item.nombre}
                            </p>
                            {item.agregado_reciente && !item.listo && (
                              <span className="bg-blue-500/20 text-blue-500 border border-blue-500/30 text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                🔔 Agregado {item.hora_agregado}
                              </span>
                            )}
                          </div>
                          {item.notas && !item.listo && (
                            <p className={`text-xs mt-1 font-semibold flex gap-1 items-center ${tema === 'dark' ? 'text-yellow-400' : 'text-orange-500'}`}>
                              <span className="text-[10px]">⚠️</span> {item.notas}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className={`p-3 border-t ${tema === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
                    <button 
                      onClick={() => despacharOrden(orden)}
                      className={`w-full py-4 rounded-xl font-black text-lg sm:text-xl tracking-widest transition-all active:scale-95 text-white ${todosListos ? 'bg-green-500 hover:bg-green-400 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'hover:brightness-110'}`}
                      style={!todosListos ? { backgroundColor: colorPrimario } : {}}
                    >
                      {todosListos ? '¡DESPACHAR!' : 'MARCAR LISTO ✓'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* HISTORIAL */}
      {historial.length > 0 && (
        <footer className={`p-4 border-t flex gap-3 items-center overflow-x-auto scrollbar-hide ${tema === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200 shadow-inner'}`}>
          <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>Recién Despachados:</span>
          {historial.map(h => (
            <button 
              key={h.kds_id}
              onClick={() => recuperarOrden(h)} 
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap flex items-center gap-2 hover:border-red-500 hover:text-red-500 ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
            >
              <span className="text-red-500 text-lg leading-none">↩</span> 
              Recuperar {h.origen}
            </button>
          ))}
        </footer>
      )}
    </div>
  );
}