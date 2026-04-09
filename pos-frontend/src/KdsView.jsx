import React, { useState, useEffect, useRef } from 'react';
import { actualizarOrden, getOrdenes } from './api/api';

export default function KdsView({ onVolver }) {
  const [estacionActiva, setEstacionActiva] = useState('TODO');
  const [estacionesExpandidas, setEstacionesExpandidas] = useState(false);
  const [verConsolidado, setVerConsolidado] = useState(false);
  const [historial, setHistorial] = useState([]); 
  const estaciones = ['TODO', 'COCINA', 'BAR', 'PARRILLA'];

  const [ordenes, setOrdenes] = useState([]);
  const ws = useRef(null);

  // ✨ EXTRAEMOS LA SEDE ACTIVA DE LA MEMORIA ✨
  const sedeActualId = localStorage.getItem('sede_id');

  // 1. LA MAGIA: CONEXIÓN WEBSOCKET MULTI-SEDE
  useEffect(() => {
    // Nos conectamos al túnel específico de ESTA sede
    ws.current = new WebSocket(`ws://127.0.0.1:8000/ws/cocina/${sedeActualId}/`);

    ws.current.onopen = () => console.log(`🔥 KDS Conectado a la Cocina (Sede ${sedeActualId}) en Tiempo Real`);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'nueva_orden') {
        
        // 1. Formateamos los platos que acaban de llegar de Django
        const nuevosItems = data.orden.detalles.map(d => ({
          id: d.id,
          // ✨ ARREGLO DE CANTIDAD: Atrapamos la cantidad exacta que manda Django
          cant: d.cantidad !== undefined ? d.cantidad : 1, 
          nombre: d.producto_nombre || d.nombre,
          listo: false,
          notas: d.notas_cocina 
        }));

        setOrdenes(prev => {
          const ticketViejo = prev.find(o => o.id === data.orden.id);
          
          if (ticketViejo) {
            // ✨ LA FUSIÓN: Si el ticket ya existía en pantalla, no lo borramos.
            // Filtramos por si acaso Django nos manda platos repetidos, y solo agregamos los verdaderamente nuevos.
            const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const itemsRealmenteNuevos = nuevosItems
              .filter(nuevo => !ticketViejo.items.some(viejo => viejo.id === nuevo.id))
              .map(item => ({ 
                  ...item, 
                  agregado_reciente: true, // 👈 Le ponemos una bandera
                  hora_agregado: horaActual // 👈 Guardamos a qué hora entró
              }));

            const ticketActualizado = {
              ...ticketViejo,
              // Juntamos los platos viejos con los nuevos
              items: [...ticketViejo.items, ...itemsRealmenteNuevos], 
            };

            // Ponemos el ticket actualizado al principio de la fila para que el cocinero vea que hubo un agregado
            return [ticketActualizado, ...prev.filter(o => o.id !== data.orden.id)];
          }

          // ✨ SI ES UN TICKET NUEVO (Nadie lo había pedido antes)
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

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [sedeActualId]); // Re-conecta si por alguna razón cambia la sede

  // --- NUEVO: MEMORIA A LARGO PLAZO FILTRADA POR SEDE ---
  useEffect(() => {
    async function recuperarMemoria() {
      try {
        // ✨ PEDIMOS SOLO LAS ÓRDENES DE ESTA SEDE ✨
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
              id: d.id, 
              cant: d.cantidad,
              nombre: d.producto_nombre || d.nombre, 
              listo: false,
              notas: d.notas_cocina 
            }))
          };
        });

        setOrdenes(ordenesFormateadas);

      } catch (error) {
        console.error("Error recuperando memoria de la cocina:", error);
      }
    }

    recuperarMemoria();
  }, [sedeActualId]);

  // 2. Simula el reloj
  useEffect(() => {
    const intervalo = setInterval(() => {
      setOrdenes(prev => prev.map(o => ({ ...o, minutos: o.minutos + 1 })));
    }, 60000);
    return () => clearInterval(intervalo);
  }, []);

  const tacharItem = (kdsId, itemId) => {
    setOrdenes(prev => prev.map(o => {
      if (o.kds_id === kdsId) { // ✨ Buscamos por el ticket visual
        return { ...o, items: o.items.map(i => i.id === itemId ? { ...i, listo: !i.listo } : i) };
      }
      return o;
    }));
  };

  const despacharOrden = async (orden) => {
    try {
      await actualizarOrden(orden.real_id || orden.id, { estado: 'listo' });
      
      setHistorial([orden, ...historial].slice(0, 5)); 
      // ✨ LA MAGIA: Solo borramos el ticket exacto que despachaste
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
    ordenes
      .filter(o => estacionActiva === 'TODO' || o.estacion === estacionActiva)
      .forEach(o => {
        o.items.forEach(i => {
          if (!i.listo) {
            resumen[i.nombre] = (resumen[i.nombre] || 0) + i.cant;
          }
        });
      });
    return Object.entries(resumen);
  };

  const ordenesFiltradas = ordenes.filter(o => estacionActiva === 'TODO' || o.estacion === estacionActiva);

  return (
    <div className="bg-[#0a0a0a] min-h-screen font-sans text-white flex flex-col">
      <header className="bg-[#111] border-b border-[#222] p-4 flex flex-col gap-4 shadow-md sticky top-0 z-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-widest text-[#ff5a1f] uppercase leading-none">
                Cocina<br className="hidden sm:block md:hidden"/> Viva
              </h1>
            </div>
            <div className="bg-[#222] px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] sm:text-xs font-bold text-neutral-400">EN LÍNEA</span>
            </div>
          </div>
          <div className="text-neutral-400 font-mono text-sm sm:text-lg font-bold bg-[#1a1a1a] px-4 py-3 md:py-2 rounded-xl border border-[#333] w-full md:w-auto text-center">
            <span className="text-white">{ordenesFiltradas.length}</span> PEDIDOS PENDIENTES
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 z-30">
          <div className="relative flex-1">
            <button 
              onClick={() => setEstacionesExpandidas(!estacionesExpandidas)}
              className="w-full flex justify-between items-center bg-[#1a1a1a] text-neutral-200 px-4 py-3 rounded-xl border border-[#333] hover:bg-[#222] transition-colors shadow-sm"
            >
              <span className="font-semibold text-sm">
                Estación: <span className="text-[#ff5a1f] ml-1">{estacionActiva}</span>
              </span>
              <svg className={`w-5 h-5 transform transition-transform duration-200 ${estacionesExpandidas ? 'rotate-180 text-[#ff5a1f]' : 'text-neutral-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {estacionesExpandidas && (
              <div className="absolute top-full left-0 w-full bg-[#1a1a1a] border border-[#333] rounded-xl mt-2 p-2 grid grid-cols-2 gap-2 shadow-2xl animate-fadeIn z-50">
                  {estaciones.map(est => (
                      <button 
                        key={est} 
                        onClick={() => { setEstacionActiva(est); setEstacionesExpandidas(false); }} 
                        className={`py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors border text-center ${estacionActiva === est ? 'bg-[#ff5a1f] text-white border-[#ff5a1f]' : 'bg-[#222] text-neutral-400 border-[#333] hover:bg-[#2a2a2a]'}`}
                      >
                          {est}
                      </button>
                  ))}
              </div>
            )}
          </div>
          <button 
            onClick={() => setVerConsolidado(!verConsolidado)}
            className={`px-6 py-3 rounded-xl font-bold border transition-all sm:w-auto w-full flex justify-center items-center gap-2
              ${verConsolidado ? 'bg-[#ff5a1f] border-[#ff5a1f] text-white shadow-[0_0_15px_rgba(255,90,31,0.3)]' : 'bg-[#1a1a1a] border-[#333] text-neutral-400 hover:text-white hover:bg-[#222]'}`}
          >
            {verConsolidado ? <><span className="text-xl">📋</span> Ver Tickets</> : <><span className="text-xl">📊</span> Ver Consolidado</>}
          </button>
        </div>
      </header>

      <div className="p-4 flex-1 overflow-y-auto">
        {verConsolidado ? (
          <div className="w-full max-w-2xl mx-auto bg-[#111] rounded-3xl p-6 md:p-8 border border-[#222] animate-fadeIn">
            <h2 className="text-neutral-500 font-bold mb-6 uppercase tracking-widest text-center text-sm">Resumen de Producción: {estacionActiva}</h2>
            <div className="space-y-3">
              {obtenerConsolidado().length > 0 ? (
                obtenerConsolidado().map(([nombre, cant]) => (
                  <div key={nombre} className="flex justify-between items-center bg-[#1a1a1a] p-4 md:p-6 rounded-2xl border border-[#222]">
                    <span className="text-lg md:text-2xl font-bold">{nombre}</span>
                    <span className="text-3xl md:text-4xl font-black text-[#ff5a1f]">x{cant}</span>
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
              let colorHeader = 'bg-[#1a1a1a] border-[#333]';
              let colorTiempo = 'text-green-400';
              let textoTiempo = 'A tiempo';
              
              if (orden.minutos >= 10 && orden.minutos < 20) {
                colorHeader = 'bg-yellow-500/10 border-yellow-500/30';
                colorTiempo = 'text-yellow-400';
                textoTiempo = 'Demorado';
              } else if (orden.minutos >= 20) {
                colorHeader = 'bg-red-500/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse-slow';
                colorTiempo = 'text-red-400 font-black';
                textoTiempo = '¡URGENTE!';
              }

              const todosListos = orden.items.every(i => i.listo);

              return (
                <div key={orden.kds_id} className="w-full bg-[#121212] border border-[#2a2a2a] rounded-2xl overflow-hidden flex flex-col shadow-xl animate-fadeIn">
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
                        className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors active:scale-[0.98] ${item.listo ? 'bg-[#1a1a1a] opacity-50' : 'bg-[#222] hover:bg-[#2a2a2a]'}`}
                      >
                        <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-black text-lg border ${item.listo ? 'bg-green-500/20 border-green-500/50 text-green-500' : 'bg-[#111] border-[#444] text-[#ff5a1f]'}`}>
                          {item.cant}
                        </div>
                        
                        <div className="flex-1 pt-0.5">
                          
                          {/* ✨ LA FUSIÓN VISUAL: Agrupamos el nombre y la etiqueta */}
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-bold text-[15px] sm:text-[17px] leading-tight ${item.listo ? 'line-through text-neutral-500' : 'text-neutral-100'}`}>
                              {item.nombre}
                            </p>
                            
                            {/* ✨ LA ETIQUETA DE ALERTA: Solo sale si es un plato nuevo agregado al ticket */}
                            {item.agregado_reciente && !item.listo && (
                              <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                🔔 Agregado {item.hora_agregado}
                              </span>
                            )}
                          </div>

                          {/* Las notas (Sin cebolla, etc) intactas */}
                          {item.notas && !item.listo && (
                            <p className="text-yellow-400 text-xs mt-1 font-semibold flex gap-1 items-center">
                              <span className="text-[10px]">⚠️</span> {item.notas}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="p-3 bg-[#111] border-t border-[#222]">
                    <button 
                      onClick={() => despacharOrden(orden)}
                      className={`w-full py-4 rounded-xl font-black text-lg sm:text-xl tracking-widest transition-all active:scale-95 ${todosListos ? 'bg-green-500 hover:bg-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-[#ff5a1f] hover:bg-[#e04a15] text-white'}`}
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

      {historial.length > 0 && (
        <footer className="p-4 bg-[#111] border-t border-[#222] flex gap-3 items-center overflow-x-auto scrollbar-hide">
          <span className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Recién Despachados:</span>
          {historial.map(h => (
            <button 
              key={h.kds_id}
              onClick={() => recuperarOrden(h)} 
              className="bg-[#1a1a1a] px-4 py-2.5 rounded-xl text-xs font-bold border border-[#333] hover:border-red-500 hover:text-red-400 transition-colors whitespace-nowrap flex items-center gap-2"
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