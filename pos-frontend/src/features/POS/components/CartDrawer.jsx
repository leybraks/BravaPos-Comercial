import React from 'react';

export default function CartDrawer({
  carritoAbierto,
  setCarritoAbierto,
  tema,
  colorPrimario,
  totalMesa,
  cantItemsMesa,
  carrito,
  vaciarStore,
  ordenActiva,
  manejarAnularItem,
  procesando,
  abrirModalParaEditar,
  restarProducto,
  sumarUnidad,
  manejarEnviarCocina,
  setModalCobroAbierto,
  notificarEstadoMesa,
  formatearSoles
}) {
  return (
    <>
      {carritoAbierto && <div className="absolute inset-0 bg-black/60 z-30 transition-opacity backdrop-blur-sm" onClick={() => setCarritoAbierto(false)}></div>}

      <div className={`absolute inset-x-0 bottom-0 z-40 rounded-t-[2rem] border-t flex flex-col transition-transform duration-300 ease-out shadow-[0_-20px_60px_rgba(0,0,0,0.8)] ${carritoAbierto ? 'translate-y-0' : 'translate-y-full'} ${tema === 'dark' ? 'bg-[#0d0d0d] border-[#222]' : 'bg-white border-gray-200'}`} style={{ maxHeight: '100%' }}>
        
        <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer shrink-0" onClick={() => setCarritoAbierto(false)}>
          <div className={`w-14 h-1.5 rounded-full ${tema === 'dark' ? 'bg-[#333]' : 'bg-gray-300'}`}></div>
        </div>

        <div className={`px-6 pb-4 pt-1 flex justify-between items-start border-b shrink-0 ${tema === 'dark' ? 'border-[#222]' : 'border-gray-100'}`}>
          <div>
             <p className={`text-[10px] font-black tracking-widest uppercase mb-1 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>Total de la cuenta</p>
             <p className={`text-4xl sm:text-5xl font-black tracking-tighter leading-none ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatearSoles(totalMesa)}</p>
             <p className={`text-xs font-bold mt-2 ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>{cantItemsMesa} artículos en total</p>
          </div>
          <div className="flex flex-col items-end gap-3">
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

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0 scrollbar-hide">
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
    </>
  );
}