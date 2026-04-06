import React, { useState, useEffect } from 'react';

export default function ModalCobro({ isOpen, onClose, total, onCobroExitoso, carrito = [] }) {
  // Estados de navegación del modal
  const [paso, setPaso] = useState('cobro'); // 'cobro' | 'exito'
  
  // Estados de Cobro
  const [metodo, setMetodo] = useState('efectivo');
  const [montoIngresado, setMontoIngresado] = useState('');
  
  // Estados de División de Cuenta
  const [dividirEntre, setDividirEntre] = useState(1);
  const [itemsSeleccionados, setItemsSeleccionados] = useState([]);

  // Estado para el Ticket Digital
  const [telefonoTicket, setTelefonoTicket] = useState('');

  // Limpiar estados al abrir/cerrar
  useEffect(() => {
    if (isOpen) {
      setPaso('cobro');
      setMetodo('efectivo');
      setMontoIngresado('');
      setDividirEntre(1);
      setItemsSeleccionados([]);
      setTelefonoTicket('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // CÁLCULOS DINÁMICOS DE DIVISIÓN
  let totalCalculado = total;
  
  // Si seleccionó platos específicos, ignoramos la división por partes iguales
  if (itemsSeleccionados.length > 0) {
    totalCalculado = carrito
      .filter(item => itemsSeleccionados.includes(item.id))
      .reduce((sum, item) => sum + item.precio, 0); // Ojo: asumiendo 1 unidad para el ejemplo visual
  } else if (dividirEntre > 1) {
    totalCalculado = total / dividirEntre;
  }

  // MANEJO DEL TECLADO NUMÉRICO
  const presionarTecla = (tecla) => {
    if (tecla === '⌫') {
      setMontoIngresado(prev => prev.slice(0, -1));
    } else if (tecla === '.') {
      if (!montoIngresado.includes('.')) setMontoIngresado(prev => prev + tecla);
    } else {
      setMontoIngresado(prev => prev + tecla);
    }
  };

  const seleccionarMontoRapido = (monto) => {
    if (monto === 'exacto') {
      setMontoIngresado(totalCalculado.toFixed(2));
    } else {
      setMontoIngresado(monto.toString());
    }
  };

  const toggleItem = (id) => {
    setItemsSeleccionados(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
    setDividirEntre(1); // Si cobra por platos, resetea la división equitativa
  };

  // PROCESAR EL PAGO
  const manejarCobro = () => {
    const pagado = parseFloat(montoIngresado);
    if (isNaN(pagado) || pagado <= 0) return;

    if (pagado < totalCalculado && metodo === 'efectivo') {
      alert("El monto ingresado es menor al total a cobrar de esta parte.");
      return;
    }

    let vuelto = 0;
    if (pagado > totalCalculado && metodo === 'efectivo') vuelto = pagado - totalCalculado;

    if (vuelto > 0) {
      alert(`💰 Vuelto a entregar: S/ ${vuelto.toFixed(2)}`);
    }

    // Pasamos a la pantalla de Éxito (Ticket Digital)
    setPaso('exito');
  };

  const finalizarTodo = () => {
    // Si llenó el número, lo podríamos enviar a una API de WhatsApp aquí
    onCobroExitoso([{ metodo, monto: totalCalculado, telefono: telefonoTicket }]);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end md:items-center justify-center z-50 animate-fadeIn">
      
      <div className={`bg-[#121212] w-full max-w-lg md:rounded-3xl shadow-2xl flex flex-col ${paso === 'cobro' ? 'h-[95vh] md:h-[90vh]' : 'rounded-t-3xl'} border border-[#2a2a2a] overflow-hidden`}>
        
        {/* ======================= PANTALLA 1: COBRO ======================= */}
        {paso === 'cobro' && (
          <>
            {/* CABECERA */}
            <div className="pt-6 pb-4 px-6 flex justify-between items-start">
              <div className="w-full text-center relative">
                <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs mb-1">Total a Cobrar</p>
                <h2 className="text-6xl font-black text-white tracking-tighter">
                  <span className="text-2xl text-neutral-400 mr-1 font-mono">S/</span>
                  {totalCalculado.toFixed(2)}
                </h2>
              </div>
              <button onClick={onClose} className="absolute right-6 top-6 w-10 h-10 bg-[#222] rounded-full flex items-center justify-center text-neutral-400 hover:text-white font-bold z-10 transition-colors">
                X
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 scrollbar-hide">
              
              {/* DIVISIÓN DE CUENTA */}
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
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                    {carrito.map(item => (
                      <div key={item.id} onClick={() => toggleItem(item.id)} className="flex justify-between items-center p-3 rounded-xl border border-[#333] hover:bg-[#222] cursor-pointer transition-colors">
                        <div>
                          <p className="text-neutral-200 font-bold text-sm">{item.nombre}</p>
                          <p className="text-neutral-500 text-xs">S/ {item.precio.toFixed(2)} c/u</p>
                        </div>
                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${itemsSeleccionados.includes(item.id) ? 'bg-[#ff5a1f] border-[#ff5a1f]' : 'border-neutral-600'}`}>
                          {itemsSeleccionados.includes(item.id) && <span className="text-white text-xs font-black">✓</span>}
                        </div>
                      </div>
                    ))}
                    {carrito.length === 0 && <p className="text-neutral-600 text-sm italic">No hay productos en la orden.</p>}
                  </div>
                </div>
              </div>

              {/* MÉTODOS DE PAGO (Tabs) */}
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setMetodo('efectivo')} className={`py-4 rounded-xl flex justify-center items-center transition-all ${metodo === 'efectivo' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-[#1a1a1a] border border-[#2a2a2a]'}`}>
                  <span className="text-2xl">💵</span>
                </button>
                <button onClick={() => setMetodo('yape')} className={`py-4 rounded-xl flex justify-center items-center transition-all ${metodo === 'yape' ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'bg-[#1a1a1a] border border-[#2a2a2a]'}`}>
                  <span className="text-2xl">📱</span>
                </button>
                <button onClick={() => setMetodo('tarjeta')} className={`py-4 rounded-xl flex justify-center items-center transition-all ${metodo === 'tarjeta' ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-[#1a1a1a] border border-[#2a2a2a]'}`}>
                  <span className="text-2xl">💳</span>
                </button>
              </div>

              {/* DISPLAY DEL INGRESO */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-4 rounded-2xl text-center">
                <p className="text-neutral-500 text-[10px] font-bold tracking-widest uppercase mb-1">
                  Ingresando a {metodo.toUpperCase()}
                </p>
                <p className={`text-4xl font-mono font-bold ${montoIngresado ? 'text-white' : 'text-neutral-600'}`}>
                  S/ {montoIngresado || '0.00'}
                </p>
              </div>

              {/* BOTONES RÁPIDOS */}
              {metodo === 'efectivo' && (
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => seleccionarMontoRapido('exacto')} className="bg-[#ff5a1f]/20 border border-[#ff5a1f]/50 text-[#ff5a1f] font-bold py-3 rounded-xl hover:bg-[#ff5a1f]/30 transition-colors">Exacto</button>
                  <button onClick={() => seleccionarMontoRapido(20)} className="bg-[#222] border border-[#333] text-neutral-300 font-bold py-3 rounded-xl hover:bg-[#2a2a2a]">S/ 20</button>
                  <button onClick={() => seleccionarMontoRapido(50)} className="bg-[#222] border border-[#333] text-neutral-300 font-bold py-3 rounded-xl hover:bg-[#2a2a2a]">S/ 50</button>
                  <button onClick={() => seleccionarMontoRapido(100)} className="bg-[#222] border border-[#333] text-neutral-300 font-bold py-3 rounded-xl hover:bg-[#2a2a2a]">S/ 100</button>
                </div>
              )}

              {/* TECLADO NUMÉRICO */}
              <div className="grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','0','.','⌫'].map(tecla => (
                  <button 
                    key={tecla} 
                    onClick={() => presionarTecla(tecla)}
                    className="bg-[#1a1a1a] active:bg-[#2a2a2a] border border-[#2a2a2a] text-white font-bold text-2xl py-4 rounded-xl transition-colors flex items-center justify-center"
                  >
                    {tecla}
                  </button>
                ))}
              </div>

            </div>

            {/* BOTÓN DE COBRO FINAL */}
            <div className="p-4 border-t border-[#2a2a2a] bg-[#121212]">
              <button 
                onClick={manejarCobro}
                className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white rounded-2xl py-5 font-black text-xl shadow-[0_4px_20px_rgba(255,90,31,0.3)] active:scale-95 transition-all uppercase tracking-wider"
              >
                Cobrar S/ {montoIngresado || '0.00'}
              </button>
            </div>
          </>
        )}

        {/* ======================= PANTALLA 2: ÉXITO Y TICKET DIGITAL ======================= */}
        {paso === 'exito' && (
          <div className="p-6 md:p-10 flex flex-col items-center justify-center animate-fadeIn">
            
            {/* Badge de Éxito Superior */}
            <div className="bg-green-500/10 border border-green-500/30 px-6 py-3 rounded-2xl flex items-center gap-4 mb-10 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
               <div className="w-10 h-10 bg-green-500 rounded-full flex justify-center items-center text-white text-xl font-black">✓</div>
               <div>
                 <h3 className="text-white font-bold text-lg leading-none mb-1">¡Éxito!</h3>
                 <p className="text-green-400 text-sm font-medium">¡Pago registrado! 💰</p>
               </div>
            </div>

            {/* Tarjeta de Ticket Digital */}
            <div className="bg-[#1a1a1a] border border-[#333] w-full rounded-3xl p-6 shadow-2xl relative">
               <button onClick={finalizarTodo} className="absolute right-4 top-4 text-neutral-500 hover:text-white font-bold">X</button>
               
               <div className="flex justify-center mb-4">
                 <div className="w-16 h-16 bg-[#222] rounded-full flex items-center justify-center text-2xl border border-[#333]">
                   💬
                 </div>
               </div>
               
               <h2 className="text-2xl font-black text-white text-center mb-2">Enviar Ticket Digital</h2>
               <p className="text-neutral-400 text-center text-sm mb-6 px-4">
                 Ingresa el celular para enviar la boleta y <span className="font-bold text-white">sumar puntos</span>.
               </p>

               <div className="bg-[#121212] border border-green-500/50 rounded-2xl flex items-center p-2 mb-4 focus-within:border-green-500 transition-colors shadow-inner">
                 <div className="flex items-center gap-2 pl-3 pr-4 border-r border-[#333]">
                    <span className="text-xl">🇵🇪</span>
                    <span className="text-neutral-400 font-bold">+51</span>
                 </div>
                 <input 
                   type="tel" 
                   value={telefonoTicket}
                   onChange={(e) => setTelefonoTicket(e.target.value)}
                   className="bg-transparent w-full px-4 py-3 text-white font-bold text-lg tracking-widest focus:outline-none placeholder:text-neutral-600"
                   placeholder="999 000 000"
                 />
               </div>

               <button onClick={finalizarTodo} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-xl mb-3 shadow-[0_4px_15px_rgba(34,197,94,0.3)] active:scale-95 transition-all">
                 ➤ ENVIAR AHORA
               </button>
               
               <button onClick={finalizarTodo} className="w-full bg-[#222] hover:bg-[#333] text-neutral-400 font-bold py-4 rounded-xl transition-colors">
                 No, gracias (Cerrar mesa)
               </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}