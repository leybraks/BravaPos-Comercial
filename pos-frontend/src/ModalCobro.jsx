import React, { useState, useEffect } from 'react';
import usePosStore from './store/usePosStore';

export default function ModalCobro({ isOpen, onClose, total, onCobroExitoso, carrito = [], esVentaRapida = false }) {
  const { configuracionGlobal } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';

  const [paso, setPaso] = useState('cobro');
  const [pagosAcumulados, setPagosAcumulados] = useState([]);
  const [itemsPagados, setItemsPagados] = useState({});
  const [metodo, setMetodo] = useState('efectivo');
  const [montoIngresado, setMontoIngresado] = useState('');
  const [dividirEntre, setDividirEntre] = useState(1);
  const [cantidadesAPagar, setCantidadesAPagar] = useState({});
  const [telefonoTicket, setTelefonoTicket] = useState('');

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

  const carritoFiltrado = carrito.map(item => {
    const nombreReal = item.producto?.nombre || item.producto_nombre || item.nombre || `Producto #${item.producto || item.id}`;
    const precioReal = parseFloat(item.precio_unitario || item.precio || 0);
    const cantidadTotal = item.cantidad || 1;
    const cantidadDisponible = cantidadTotal - (itemsPagados[item.id] || 0);
    return { ...item, nombreReal, precioReal, cantidadTotal, cantidadDisponible };
  }).filter(item => item.cantidadDisponible > 0);

  const totalPagado = pagosAcumulados.reduce((sum, p) => sum + p.monto, 0);
  const restanteGlobal = total - totalPagado;
  const isCobroPorPlatos = Object.values(cantidadesAPagar).some(q => q > 0);
  let totalCalculado = restanteGlobal;
  if (isCobroPorPlatos) {
    totalCalculado = carritoFiltrado.reduce((sum, item) => sum + ((cantidadesAPagar[item.id] || 0) * item.precioReal), 0);
  } else if (dividirEntre > 1) {
    totalCalculado = restanteGlobal / dividirEntre;
  }

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
      else delete copy[id];
      return copy;
    });
  };

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
    setPagosAcumulados([...pagosAcumulados, { metodo, monto: montoAporte }]);
    if (isCobroPorPlatos) {
      const nuevosPagados = { ...itemsPagados };
      for (const [id, qty] of Object.entries(cantidadesAPagar)) {
        nuevosPagados[id] = (nuevosPagados[id] || 0) + qty;
      }
      setItemsPagados(nuevosPagados);
    }
    const nuevoTotalPagado = totalPagado + montoAporte;
    if (nuevoTotalPagado >= total - 0.01) {
      setPaso('exito');
    } else {
      alert(`✅ Pago parcial registrado. Falta cobrar S/ ${(total - nuevoTotalPagado).toFixed(2)}`);
      setMontoIngresado('');
      setDividirEntre(1);
      setCantidadesAPagar({});
    }
  };

  const finalizarTodo = () => {
    const pagosFinales = pagosAcumulados.map(p => ({ ...p, telefono: telefonoTicket }));
    onCobroExitoso(pagosFinales);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end md:items-center justify-center z-50 animate-fadeIn">
      <div className={`w-full max-w-lg md:rounded-3xl shadow-2xl flex flex-col transition-colors ${
        paso === 'cobro' ? 'h-[95vh] md:h-[90vh]' : 'rounded-t-3xl'
      } border ${
        tema === 'dark' ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-gray-200'
      } overflow-hidden`}>
        
        {paso === 'cobro' && (
          <>
            <div className="pt-6 pb-4 px-6 flex justify-between items-start">
              <div className="w-full text-center relative">
                <p className={`font-bold tracking-widest uppercase text-xs mb-1 ${
                  tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                }`}>
                  {restanteGlobal < total ? `Restante: S/ ${restanteGlobal.toFixed(2)} | Cobrando ahora:` : 'Total a Cobrar'}
                </p>
                <h2 className="text-6xl font-black tracking-tighter">
                  <span className={`text-2xl mr-1 font-mono ${
                    tema === 'dark' ? 'text-neutral-400' : 'text-gray-400'
                  }`}>S/</span>
                  <span className={tema === 'dark' ? 'text-white' : 'text-gray-900'}>
                    {parseFloat(totalCalculado || 0).toFixed(2)}
                  </span>
                </h2>
              </div>
              <button onClick={onClose} className={`absolute right-6 top-6 w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 transition-colors ${
                tema === 'dark' ? 'bg-[#222] text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-800'
              }`}>X</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 scrollbar-hide">
              
              {!esVentaRapida && (
                <div className={`border rounded-2xl p-4 ${
                  tema === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className={`flex justify-between items-center mb-4 pb-4 border-b ${
                    tema === 'dark' ? 'border-[#2a2a2a]' : 'border-gray-200'
                  }`}>
                    <span className={`font-bold text-sm ${
                      tema === 'dark' ? 'text-neutral-300' : 'text-gray-700'
                    }`}>Dividir entre:</span>
                    <div className={`flex items-center gap-3 rounded-xl p-1 border ${
                      tema === 'dark' ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-200'
                    }`}>
                      <button onClick={() => setDividirEntre(Math.max(1, dividirEntre - 1))} className={`w-8 h-8 rounded-lg font-bold ${
                        tema === 'dark' ? 'bg-[#222] text-white' : 'bg-gray-200 text-gray-800'
                      }`}>-</button>
                      <span className={`w-6 text-center font-bold ${
                        tema === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>{dividirEntre}</span>
                      <button onClick={() => setDividirEntre(dividirEntre + 1)} className={`w-8 h-8 rounded-lg font-bold ${
                        tema === 'dark' ? 'bg-[#222] text-white' : 'bg-gray-200 text-gray-800'
                      }`}>+</button>
                    </div>
                  </div>

                  <div>
                    <p className={`font-bold uppercase tracking-widest text-[10px] mb-3 ${
                      tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                    }`}>O cobrar por platos:</p>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {carritoFiltrado.map(item => {
                        const maxQty = item.cantidadDisponible;
                        const currentSelected = cantidadesAPagar[item.id] || 0;
                        return (
                          <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${
                            currentSelected > 0 
                              ? `border-[${colorPrimario}] bg-[${colorPrimario}]/5` 
                              : (tema === 'dark' ? 'border-[#333] hover:bg-[#222]' : 'border-gray-200 hover:bg-gray-100')
                          }`}>
                            <div>
                              <p className={`font-bold text-sm ${
                                tema === 'dark' ? 'text-neutral-200' : 'text-gray-800'
                              }`}>{item.nombreReal}</p>
                              <p className={`text-xs ${
                                tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                              }`}>S/ {item.precioReal.toFixed(2)} c/u {maxQty > 1 ? `(Disp: ${maxQty})` : ''}</p>
                            </div>
                            {maxQty === 1 ? (
                              <button 
                                onClick={() => handleToggleUnico(item.id)}
                                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                  currentSelected 
                                    ? `bg-[${colorPrimario}] border-[${colorPrimario}]` 
                                    : (tema === 'dark' ? 'border-neutral-600' : 'border-gray-300')
                                }`}
                              >
                                {currentSelected > 0 && <span className="text-white text-sm font-black">✓</span>}
                              </button>
                            ) : (
                              <div className={`flex items-center gap-3 rounded-lg p-1 border ${
                                tema === 'dark' ? 'bg-[#121212] border-[#444]' : 'bg-white border-gray-200'
                              }`}>
                                <button onClick={() => handleSub(item.id)} className={`w-8 h-8 rounded-md font-bold transition-colors ${
                                  tema === 'dark' ? 'bg-[#222] hover:bg-[#333] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                }`}>-</button>
                                <span className={`w-4 text-center font-bold text-sm ${
                                  tema === 'dark' ? 'text-white' : 'text-gray-800'
                                }`}>{currentSelected}</span>
                                <button onClick={() => handleAdd(item.id, maxQty)} className={`w-8 h-8 rounded-md font-bold transition-colors ${
                                  tema === 'dark' ? 'bg-[#222] hover:bg-[#333] text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                                }`}>+</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {carritoFiltrado.length === 0 && (
                        <p className="text-green-500 font-bold text-sm text-center py-2">✨ ¡Todos los platos han sido pagados!</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setMetodo('efectivo')} className={`py-4 rounded-xl flex justify-center items-center transition-all ${
                  metodo === 'efectivo' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : (tema === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-gray-100 border border-gray-200')
                }`}><span className="text-2xl">💵</span></button>
                <button onClick={() => setMetodo('yape')} className={`py-4 rounded-xl flex justify-center items-center transition-all ${
                  metodo === 'yape' ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : (tema === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-gray-100 border border-gray-200')
                }`}><span className="text-2xl">📱</span></button>
                <button onClick={() => setMetodo('tarjeta')} className={`py-4 rounded-xl flex justify-center items-center transition-all ${
                  metodo === 'tarjeta' ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : (tema === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a]' : 'bg-gray-100 border border-gray-200')
                }`}><span className="text-2xl">💳</span></button>
              </div>

              <div className={`border p-4 rounded-2xl text-center ${
                tema === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-gray-50 border-gray-200'
              }`}>
                <p className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${
                  tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                }`}>Ingresando a {metodo.toUpperCase()}</p>
                <p className={`text-4xl font-mono font-bold ${
                  montoIngresado 
                    ? (tema === 'dark' ? 'text-white' : 'text-gray-900') 
                    : (tema === 'dark' ? 'text-neutral-600' : 'text-gray-400')
                }`}>S/ {montoIngresado || '0.00'}</p>
              </div>

              {metodo === 'efectivo' && (
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => seleccionarMontoRapido('exacto')} className={`font-bold py-3 rounded-xl transition-colors ${
                    tema === 'dark' 
                      ? 'bg-[#ff5a1f]/20 border border-[#ff5a1f]/50 text-[#ff5a1f] hover:bg-[#ff5a1f]/30' 
                      : 'bg-orange-100 border border-orange-300 text-orange-700 hover:bg-orange-200'
                  }`}>Exacto</button>
                  <button onClick={() => seleccionarMontoRapido(20)} className={`font-bold py-3 rounded-xl transition-colors ${
                    tema === 'dark' ? 'bg-[#222] border border-[#333] text-neutral-300 hover:bg-[#2a2a2a]' : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
                  }`}>S/ 20</button>
                  <button onClick={() => seleccionarMontoRapido(50)} className={`font-bold py-3 rounded-xl transition-colors ${
                    tema === 'dark' ? 'bg-[#222] border border-[#333] text-neutral-300 hover:bg-[#2a2a2a]' : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
                  }`}>S/ 50</button>
                  <button onClick={() => seleccionarMontoRapido(100)} className={`font-bold py-3 rounded-xl transition-colors ${
                    tema === 'dark' ? 'bg-[#222] border border-[#333] text-neutral-300 hover:bg-[#2a2a2a]' : 'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200'
                  }`}>S/ 100</button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','0','.','⌫'].map(tecla => (
                  <button key={tecla} onClick={() => presionarTecla(tecla)} className={`active:scale-95 border font-bold text-2xl py-4 rounded-xl transition-colors flex items-center justify-center ${
                    tema === 'dark' 
                      ? 'bg-[#1a1a1a] border-[#2a2a2a] text-white active:bg-[#2a2a2a]' 
                      : 'bg-gray-100 border-gray-200 text-gray-800 active:bg-gray-200'
                  }`}>{tecla}</button>
                ))}
              </div>
            </div>

            <div className={`p-4 border-t ${
              tema === 'dark' ? 'border-[#2a2a2a] bg-[#121212]' : 'border-gray-200 bg-white'
            }`}>
              <button 
                onClick={manejarCobro} 
                style={{ backgroundColor: colorPrimario }}
                className="w-full text-white rounded-2xl py-5 font-black text-xl shadow-lg active:scale-95 transition-all uppercase tracking-wider hover:brightness-110"
              >
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
                 <h3 className={`font-bold text-lg leading-none mb-1 ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>¡Éxito!</h3>
                 <p className="text-green-400 text-sm font-medium">¡Pago registrado! 💰</p>
               </div>
            </div>

            <div className={`w-full rounded-3xl p-6 shadow-2xl relative ${
              tema === 'dark' ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'
            }`}>
               <button onClick={finalizarTodo} className={`absolute right-4 top-4 font-bold ${
                 tema === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-800'
               }`}>X</button>
               <div className="flex justify-center mb-4">
                 <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl border ${
                   tema === 'dark' ? 'bg-[#222] border-[#333]' : 'bg-gray-100 border-gray-200'
                 }`}>💬</div>
               </div>
               
               <h2 className={`text-2xl font-black text-center mb-2 ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>Enviar Ticket Digital</h2>
               <p className={`text-center text-sm mb-6 px-4 ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
                 Ingresa el celular para enviar la boleta y <span className={`font-bold ${tema === 'dark' ? 'text-white' : 'text-gray-800'}`}>sumar puntos</span>.
               </p>

               <div className={`border rounded-2xl flex items-center p-2 mb-4 focus-within:border-green-500 transition-colors shadow-inner ${
                 tema === 'dark' ? 'bg-[#121212] border-green-500/50' : 'bg-gray-50 border-green-300'
               }`}>
                 <div className={`flex items-center gap-2 pl-3 pr-4 border-r ${
                   tema === 'dark' ? 'border-[#333]' : 'border-gray-200'
                 }`}><span className="text-xl">🇵🇪</span><span className={`font-bold ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>+51</span></div>
                 <input 
                   type="tel" 
                   value={telefonoTicket} 
                   onChange={(e) => setTelefonoTicket(e.target.value)} 
                   className={`bg-transparent w-full px-4 py-3 font-bold text-lg tracking-widest focus:outline-none placeholder:${
                     tema === 'dark' ? 'text-neutral-600' : 'text-gray-400'
                   } ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`} 
                   placeholder="999 000 000" 
                 />
               </div>

               <button onClick={finalizarTodo} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl mb-3 shadow-[0_4px_15px_rgba(34,197,94,0.3)] active:scale-95 transition-all">➤ ENVIAR AHORA</button>
               <button onClick={finalizarTodo} className={`w-full font-bold py-4 rounded-xl transition-colors ${
                 tema === 'dark' ? 'bg-[#222] hover:bg-[#333] text-neutral-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
               }`}>No, gracias (Cerrar mesa)</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}