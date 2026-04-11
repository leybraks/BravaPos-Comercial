import React, { useState, useEffect } from 'react';

// 👇 1. Agregamos esVentaRapida = false a los props
export default function ModalCobro({ isOpen, onClose, total, onCobroExitoso, carrito = [], esVentaRapida = false }) {
  const [paso, setPaso] = useState('cobro');
  
  // Memorias de la calculadora
  const [pagosAcumulados, setPagosAcumulados] = useState([]);
  const [itemsPagados, setItemsPagados] = useState({}); // { id_detalle: cantidad_ya_pagada }
  
  // Estados de Cobro
  const [metodo, setMetodo] = useState('efectivo');
  const [montoIngresado, setMontoIngresado] = useState('');
  const [dividirEntre, setDividirEntre] = useState(1);
  const [cantidadesAPagar, setCantidadesAPagar] = useState({}); // { id_detalle: cantidad_a_pagar_ahora }
  const [telefonoTicket, setTelefonoTicket] = useState('');

  // Limpiar estados al abrir
  useEffect(() => {
    if (isOpen) {
      setPaso('cobro');
      setMetodo('efectivo');
      setMontoIngresado('');
      setDividirEntre(1);
      setCantidadesAPagar({});
      setTelefonoTicket('');
      setPagosAcumulados([]);
      setItemsPagados({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. PREPARAR LOS PLATOS (Buscamos nombres y calculamos stock)
  const carritoFiltrado = carrito.map(item => {
    // Rastreador agresivo de nombres (cubre múltiples formas en las que Django manda datos)
    const nombreReal = item.producto?.nombre || item.producto_nombre || item.nombre || `Producto #${item.producto || item.id}`;
    const precioReal = parseFloat(item.precio_unitario || item.precio || 0);
    const cantidadTotal = item.cantidad || 1;
    const cantidadDisponible = cantidadTotal - (itemsPagados[item.id] || 0);

    return { ...item, nombreReal, precioReal, cantidadTotal, cantidadDisponible };
  }).filter(item => item.cantidadDisponible > 0); // Ocultamos los que ya se pagaron completos

  // 2. CÁLCULOS MAESTROS 🧮
  const totalPagado = pagosAcumulados.reduce((sum, p) => sum + p.monto, 0);
  const restanteGlobal = total - totalPagado;

  const isCobroPorPlatos = Object.values(cantidadesAPagar).some(q => q > 0);
  let totalCalculado = restanteGlobal;
  
  if (isCobroPorPlatos) {
    totalCalculado = carritoFiltrado.reduce((sum, item) => {
      return sum + ((cantidadesAPagar[item.id] || 0) * item.precioReal);
    }, 0);
  } else if (dividirEntre > 1) {
    totalCalculado = restanteGlobal / dividirEntre;
  }

  // CONTROLES DE BOTONES
  const presionarTecla = (tecla) => {
    if (tecla === '⌫') setMontoIngresado(prev => prev.slice(0, -1));
    else if (tecla === '.') {
      if (!montoIngresado.includes('.')) setMontoIngresado(prev => prev + tecla);
    } else setMontoIngresado(prev => prev + tecla);
  };

  const seleccionarMontoRapido = (monto) => {
    if (monto === 'exacto') setMontoIngresado(parseFloat(totalCalculado || 0).toFixed(2));
    else setMontoIngresado(monto.toString());
  };

  // LÓGICA DE LOS BOTONES + Y -
  const handleToggleUnico = (id) => {
    setCantidadesAPagar(prev => ({ ...prev, [id]: prev[id] ? 0 : 1 }));
    setDividirEntre(1);
  };

  const handleAdd = (id, max) => {
    setCantidadesAPagar(prev => ({ ...prev, [id]: Math.min((prev[id] || 0) + 1, max) }));
    setDividirEntre(1);
  };

  const handleSub = (id) => {
    setCantidadesAPagar(prev => {
      const copy = { ...prev };
      if (copy[id] > 1) copy[id] -= 1;
      else delete copy[id]; // Si llega a 0, lo quitamos de la lista a pagar
      return copy;
    });
  };

  // PROCESAR EL PAGO
  const manejarCobro = () => {
    const pagadoIngresado = parseFloat(montoIngresado);
    if (isNaN(pagadoIngresado) || pagadoIngresado <= 0) return;

    if (pagadoIngresado < totalCalculado && metodo === 'efectivo') {
      alert("El monto ingresado es menor al total a cobrar de esta parte.");
      return;
    }

    const montoAporte = Math.min(pagadoIngresado, totalCalculado);
    let vuelto = 0;
    if (pagadoIngresado > totalCalculado && metodo === 'efectivo') {
      vuelto = pagadoIngresado - totalCalculado;
    }

    if (vuelto > 0) alert(`💰 Vuelto a entregar: S/ ${vuelto.toFixed(2)}`);

    // 1. Guardar dinero en memoria
    setPagosAcumulados([...pagosAcumulados, { metodo, monto: montoAporte }]);

    // 2. Si pagó platos específicos, los tachamos de la lista
    if (isCobroPorPlatos) {
      const nuevosPagados = { ...itemsPagados };
      for (const [id, qty] of Object.entries(cantidadesAPagar)) {
        nuevosPagados[id] = (nuevosPagados[id] || 0) + qty;
      }
      setItemsPagados(nuevosPagados);
    }

    const nuevoTotalPagado = totalPagado + montoAporte;

    // 3. Evaluar si la mesa ya está saldada
    if (nuevoTotalPagado >= total - 0.01) {
      setPaso('exito');
    } else {
      alert(`✅ Pago parcial registrado. Falta cobrar S/ ${(total - nuevoTotalPagado).toFixed(2)}`);
      setMontoIngresado('');
      setDividirEntre(1);
      setCantidadesAPagar({}); // Reseteamos la selección para el siguiente cliente
    }
  };

  const finalizarTodo = () => {
    const pagosFinales = pagosAcumulados.map(p => ({ ...p, telefono: telefonoTicket }));
    onCobroExitoso(pagosFinales);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end md:items-center justify-center z-50 animate-fadeIn">
      <div className={`bg-[#121212] w-full max-w-lg md:rounded-3xl shadow-2xl flex flex-col ${paso === 'cobro' ? 'h-[95vh] md:h-[90vh]' : 'rounded-t-3xl'} border border-[#2a2a2a] overflow-hidden`}>
        
        {paso === 'cobro' && (
          <>
            <div className="pt-6 pb-4 px-6 flex justify-between items-start">
              <div className="w-full text-center relative">
                <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs mb-1">
                  {restanteGlobal < total ? `Restante: S/ ${restanteGlobal.toFixed(2)} | Cobrando ahora:` : 'Total a Cobrar'}
                </p>
                <h2 className="text-6xl font-black text-white tracking-tighter">
                  <span className="text-2xl text-neutral-400 mr-1 font-mono">S/</span>
                  {parseFloat(totalCalculado || 0).toFixed(2)}
                </h2>
              </div>
              <button onClick={onClose} className="absolute right-6 top-6 w-10 h-10 bg-[#222] rounded-full flex items-center justify-center text-neutral-400 hover:text-white font-bold z-10 transition-colors">X</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 scrollbar-hide">
              
              {/* 👇 2. LA MAGIA: Ocultamos esta caja si es Venta Rápida 👇 */}
              {!esVentaRapida && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4">
                  <div className="flex justify-between items-center mb-4 border-b border-[#2a2a2a] pb-4">
                    <span className="text-neutral-300 font-bold text-sm">Dividir entre:</span>
                    <div className="flex items-center gap-3 bg-[#121212] rounded-xl p-1 border border-[#333]">
                      <button onClick={() => setDividirEntre(Math.max(1, dividirEntre - 1))} className="w-8 h-8 rounded-lg bg-[#222] text-white font-bold">-</button>
                      <span className="w-6 text-center font-bold text-white">{dividirEntre}</span>
                      <button onClick={() => setDividirEntre(dividirEntre + 1)} className="w-8 h-8 rounded-lg bg-[#222] text-white font-bold">+</button>
                    </div>
                  </div>

                  <div>
                    <p className="text-neutral-500 font-bold uppercase tracking-widest text-[10px] mb-3">O cobrar por platos:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      
                      {carritoFiltrado.map(item => {
                        const maxQty = item.cantidadDisponible;
                        const currentSelected = cantidadesAPagar[item.id] || 0;

                        return (
                          <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${currentSelected > 0 ? 'border-[#ff5a1f] bg-[#ff5a1f]/5' : 'border-[#333] hover:bg-[#222]'}`}>
                            <div>
                              <p className="text-neutral-200 font-bold text-sm">{item.nombreReal}</p>
                              <p className="text-neutral-500 text-xs">S/ {item.precioReal.toFixed(2)} c/u {maxQty > 1 ? `(Disp: ${maxQty})` : ''}</p>
                            </div>
                            
                            {/* SI HAY 1 SOLO PLATO: Muestra un Checkbox gigante */}
                            {maxQty === 1 ? (
                              <button 
                                onClick={() => handleToggleUnico(item.id)}
                                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${currentSelected ? 'bg-[#ff5a1f] border-[#ff5a1f]' : 'border-neutral-600'}`}
                              >
                                {currentSelected > 0 && <span className="text-white text-sm font-black">✓</span>}
                              </button>
                            ) : (
                              /* SI HAY VARIOS: Muestra contador + y - */
                              <div className="flex items-center gap-3 bg-[#121212] rounded-lg p-1 border border-[#444]">
                                <button onClick={() => handleSub(item.id)} className="w-8 h-8 rounded-md bg-[#222] hover:bg-[#333] text-white font-bold transition-colors">-</button>
                                <span className="w-4 text-center font-bold text-white text-sm">{currentSelected}</span>
                                <button onClick={() => handleAdd(item.id, maxQty)} className="w-8 h-8 rounded-md bg-[#222] hover:bg-[#333] text-white font-bold transition-colors">+</button>
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {carritoFiltrado.length === 0 && <p className="text-green-500 font-bold text-sm text-center py-2">✨ ¡Todos los platos han sido pagados!</p>}
                    </div>
                  </div>
                </div>
              )}
              {/* 👆 FIN DEL BLOQUE OCULTO 👆 */}

              {/* MÉTODOS DE PAGO Y TECLADO (Siempre visibles) */}
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setMetodo('efectivo')} className={`py-4 rounded-xl flex justify-center items-center transition-all ${metodo === 'efectivo' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-[#1a1a1a] border border-[#2a2a2a]'}`}><span className="text-2xl">💵</span></button>
                <button onClick={() => setMetodo('yape')} className={`py-4 rounded-xl flex justify-center items-center transition-all ${metodo === 'yape' ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-[#1a1a1a] border border-[#2a2a2a]'}`}><span className="text-2xl">📱</span></button>
                <button onClick={() => setMetodo('tarjeta')} className={`py-4 rounded-xl flex justify-center items-center transition-all ${metodo === 'tarjeta' ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#1a1a1a] border border-[#2a2a2a]'}`}><span className="text-2xl">💳</span></button>
              </div>

              <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-2xl text-center">
                <p className="text-neutral-500 text-[10px] font-bold tracking-widest uppercase mb-1">Ingresando a {metodo.toUpperCase()}</p>
                <p className={`text-4xl font-mono font-bold ${montoIngresado ? 'text-white' : 'text-neutral-600'}`}>S/ {montoIngresado || '0.00'}</p>
              </div>

              {metodo === 'efectivo' && (
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => seleccionarMontoRapido('exacto')} className="bg-[#ff5a1f]/20 border border-[#ff5a1f]/50 text-[#ff5a1f] font-bold py-3 rounded-xl hover:bg-[#ff5a1f]/30 transition-colors">Exacto</button>
                  <button onClick={() => seleccionarMontoRapido(20)} className="bg-[#222] border border-[#333] text-neutral-300 font-bold py-3 rounded-xl hover:bg-[#2a2a2a]">S/ 20</button>
                  <button onClick={() => seleccionarMontoRapido(50)} className="bg-[#222] border border-[#333] text-neutral-300 font-bold py-3 rounded-xl hover:bg-[#2a2a2a]">S/ 50</button>
                  <button onClick={() => seleccionarMontoRapido(100)} className="bg-[#222] border border-[#333] text-neutral-300 font-bold py-3 rounded-xl hover:bg-[#2a2a2a]">S/ 100</button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','0','.','⌫'].map(tecla => (
                  <button key={tecla} onClick={() => presionarTecla(tecla)} className="bg-[#1a1a1a] active:bg-[#2a2a2a] border border-[#2a2a2a] text-white font-bold text-2xl py-4 rounded-xl transition-colors flex items-center justify-center">{tecla}</button>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-[#2a2a2a] bg-[#121212]">
              <button onClick={manejarCobro} className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white rounded-2xl py-5 font-black text-xl shadow-[0_4px_20px_rgba(255,90,31,0.3)] active:scale-95 transition-all uppercase tracking-wider">
                Cobrar S/ {montoIngresado || '0.00'}
              </button>
            </div>
          </>
        )}

        {paso === 'exito' && (
          <div className="p-6 md:p-10 flex flex-col items-center justify-center animate-fadeIn">
            <div className="bg-green-500/10 border border-green-500/30 px-6 py-3 rounded-2xl flex items-center gap-4 mb-10 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
               <div className="w-10 h-10 bg-green-500 rounded-full flex justify-center items-center text-white text-xl font-black">✓</div>
               <div>
                 <h3 className="text-white font-bold text-lg leading-none mb-1">¡Éxito!</h3>
                 <p className="text-green-400 text-sm font-medium">¡Pago registrado! 💰</p>
               </div>
            </div>

            <div className="bg-[#1a1a1a] border border-[#333] w-full rounded-3xl p-6 shadow-2xl relative">
               <button onClick={finalizarTodo} className="absolute right-4 top-4 text-neutral-500 hover:text-white font-bold">X</button>
               <div className="flex justify-center mb-4">
                 <div className="w-16 h-16 bg-[#222] rounded-full flex items-center justify-center text-2xl border border-[#333]">💬</div>
               </div>
               
               <h2 className="text-2xl font-black text-white text-center mb-2">Enviar Ticket Digital</h2>
               <p className="text-neutral-400 text-center text-sm mb-6 px-4">Ingresa el celular para enviar la boleta y <span className="font-bold text-white">sumar puntos</span>.</p>

               <div className="bg-[#121212] border border-green-500/50 rounded-2xl flex items-center p-2 mb-4 focus-within:border-green-500 transition-colors shadow-inner">
                 <div className="flex items-center gap-2 pl-3 pr-4 border-r border-[#333]"><span className="text-xl">🇵🇪</span><span className="text-neutral-400 font-bold">+51</span></div>
                 <input type="tel" value={telefonoTicket} onChange={(e) => setTelefonoTicket(e.target.value)} className="bg-transparent w-full px-4 py-3 text-white font-bold text-lg tracking-widest focus:outline-none placeholder:text-neutral-600" placeholder="999 000 000" />
               </div>

               <button onClick={finalizarTodo} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl mb-3 shadow-[0_4px_15px_rgba(34,197,94,0.3)] active:scale-95 transition-all">➤ ENVIAR AHORA</button>
               <button onClick={finalizarTodo} className="w-full bg-[#222] hover:bg-[#333] text-neutral-400 font-bold py-4 rounded-xl transition-colors">No, gracias (Cerrar mesa)</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}