import React from 'react';

export default function CartDrawer({
  esDesktop = false,
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
  formatearSoles,
  manejarCancelarOrden,
  manejarAnulacionCompleta
}) {
  const contenedorClasses = esDesktop
    ? `relative w-full h-full flex flex-col ${tema === 'dark' ? 'bg-[#0d0d0d]' : 'bg-[#fcfcfc]'}`
    : `absolute inset-x-0 bottom-0 z-40 rounded-t-[2rem] border-t flex flex-col transition-transform duration-300 ease-out shadow-[0_-20px_60px_rgba(0,0,0,0.8)] ${carritoAbierto ? 'translate-y-0' : 'translate-y-full'} ${tema === 'dark' ? 'bg-[#0d0d0d] border-[#222]' : 'bg-white border-gray-200'}`;

  return (
    <>
      {/* Fondo oscuro SOLO en móvil */}
      {!esDesktop && carritoAbierto && (
        <div
          className="absolute inset-0 bg-black/60 z-30 transition-opacity backdrop-blur-sm"
          onClick={() => setCarritoAbierto(false)}
        ></div>
      )}

      {/* Contenedor principal con clases inteligentes */}
      <div className={contenedorClasses} style={{ maxHeight: '100%' }}>

        {/* Barrita de arrastrar SOLO en móvil */}
        {!esDesktop && (
          <div
            className="w-full flex justify-center pt-3 pb-2 cursor-pointer shrink-0"
            onClick={() => setCarritoAbierto(false)}
          >
            <div className={`w-14 h-1.5 rounded-full ${tema === 'dark' ? 'bg-[#333]' : 'bg-gray-300'}`}></div>
          </div>
        )}

        <div className={`px-6 pb-5 flex justify-between items-start border-b shrink-0 ${esDesktop ? 'pt-6' : 'pt-1'} ${tema === 'dark' ? 'border-[#222]' : 'border-gray-200'}`}>
          <div>
            <p className={`text-[10px] font-black tracking-widest uppercase mb-1 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>Total de la cuenta</p>
            <p className={`text-4xl sm:text-5xl font-black tracking-tighter leading-none ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatearSoles(totalMesa)}</p>
            <p className={`text-xs font-bold mt-2 ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
              <i className="fi fi-rr-shopping-cart-check mr-1.5 text-[10px]"></i>
              {cantItemsMesa} artículos en total
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Botón X SOLO en móvil */}
            {!esDesktop && (
              <button
                onClick={() => setCarritoAbierto(false)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors active:scale-95 ${tema === 'dark' ? 'bg-[#222] text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}
              >
                <i className="fi fi-rr-cross mt-0.5"></i>
              </button>
            )}

            {/* Botón para órdenes ya enviadas (DATABASE) */}
            {ordenActiva && (
              <button 
                onClick={manejarAnulacionCompleta}
                className="text-red-500 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all font-bold text-[10px] uppercase tracking-wider border border-red-500/20 active:scale-95"
              >
                <i className="fi fi-rr-trash mt-0.5"></i>
                Anular Pedido
              </button>
            )}

            {/* Botón para lo que está en el carrito (LOCAL) */}
            {carrito.length > 0 && !ordenActiva && (
              <button onClick={vaciarStore} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider border active:scale-95 ${tema === 'dark' ? 'text-neutral-400 bg-[#1a1a1a] hover:bg-[#222] border-[#333]' : 'text-gray-500 bg-gray-50 hover:bg-gray-100 border-gray-200'}`}>
                <i className="fi fi-rr-broom mt-0.5"></i>
                Vaciar Carrito
              </button>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0 scrollbar-hide">
          {ordenActiva && ordenActiva.detalles.length > 0 && (
            <div className="space-y-3">
              {/* Divisor Premium: Ya en cocina */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-gray-100 text-gray-400'}`}>
                  <i className="fi fi-rr-fire text-[10px] mt-0.5"></i>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>Ya en cocina</span>
                <div className={`flex-1 h-px ${tema === 'dark' ? 'bg-[#222]' : 'bg-gray-200'}`}></div>
              </div>

              {ordenActiva.detalles.map((item, index) => {
                // 🛡️ ESCUDO ANTI-OBJETOS
                const notaSegura = item.notas_cocina || item.notas || (typeof item.notas_y_modificadores === 'object' ? item.notas_y_modificadores?.nota_libre : item.notas_y_modificadores);

                return (
                <div key={`db-${index}`} className={`p-4 rounded-2xl border flex gap-4 items-center opacity-80 transition-opacity hover:opacity-100 ${tema === 'dark' ? 'bg-[#141414] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-black text-xl ${tema === 'dark' ? 'bg-[#222] text-neutral-400' : 'bg-gray-200 text-gray-600'}`}>
                    {item.cantidad}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-base sm:text-lg truncate leading-tight ${tema === 'dark' ? 'text-neutral-300' : 'text-gray-700'}`}>{item.producto_nombre || item.nombre}</p>
                    
                    {/* 👇 SE IMPRIME LA NOTA SEGURA */}
                    {notaSegura && (
                      <p className="text-xs mt-1.5 leading-tight font-medium truncate flex items-start gap-1" style={{ color: colorPrimario }}>
                        <i className="fi fi-rr-comment-alt text-[10px] mt-0.5"></i> {notaSegura}
                      </p>
                    )}

                    <p className={`text-[11px] font-bold mt-1.5 tracking-wider uppercase ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>{formatearSoles(item.precio_unitario)} c/u</p>
                  </div>
                  <button
                    onClick={() => manejarAnularItem(item.id, item.producto_nombre || item.nombre)}
                    disabled={procesando}
                    className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors active:scale-95 border border-red-500/20"
                    title="Anular Item"
                  >
                    <i className="fi fi-rr-trash mt-0.5"></i>
                  </button>
                </div>
              )})}
            </div>
          )}

          {carrito.length > 0 && (
            <div className="space-y-3">
              {/* Divisor Premium: Nuevos Pedidos */}
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${colorPrimario}15`, color: colorPrimario }}>
                  <i className="fi fi-rr-shopping-bag text-[10px] mt-0.5"></i>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: colorPrimario }}>Nuevos Pedidos</span>
                <div className="flex-1 h-px" style={{ backgroundColor: `${colorPrimario}40` }}></div>
              </div>

              {carrito.map(item => {
                const precioAMostrar = item.precio_unitario_calculado || item.precio_base || item.precio || 0;
                
                // 🛡️ ESCUDO ANTI-OBJETOS
                const notaSegura = item.notas_cocina || item.notas || (typeof item.notas_y_modificadores === 'object' ? item.notas_y_modificadores?.nota_libre : item.notas_y_modificadores);

                return (
                  <div key={item.cart_id || item.id} className={`group p-4 sm:p-5 rounded-3xl border transition-all duration-300 hover:shadow-md flex flex-col gap-4 ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#333] hover:border-[#444]' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-lg sm:text-xl leading-tight ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.producto_nombre || item.nombre}</p>
                        
                        {/* 👇 SE IMPRIME LA NOTA SEGURA */}
                        {notaSegura && (
                          <p className="text-xs sm:text-sm mt-1.5 leading-tight font-medium flex items-start gap-1" style={{ color: colorPrimario }}>
                            <i className="fi fi-rr-comment-alt text-[10px] mt-0.5 shrink-0"></i> 
                            <span className="truncate">{notaSegura}</span>
                          </p>
                        )}
                        
                        <p className={`text-xs font-bold mt-2 tracking-wider uppercase ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>{formatearSoles(precioAMostrar)} c/u</p>
                      </div>
                      <p className={`font-black text-xl sm:text-2xl shrink-0 ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{formatearSoles(precioAMostrar * item.cantidad)}</p>
                    </div>

                    <div className={`pt-4 border-t flex justify-between items-center gap-2 ${tema === 'dark' ? 'border-[#333]' : 'border-gray-100'}`}>
                      <button
                        onClick={() => abrirModalParaEditar(item)}
                        className={`px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors active:scale-95 flex items-center gap-1.5 ${tema === 'dark' ? 'bg-[#2a2a2a] text-neutral-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        <i className="fi fi-rr-edit mt-0.5"></i> Notas
                      </button>

                      <div className={`flex items-center rounded-xl p-1.5 border ${tema === 'dark' ? 'bg-[#111] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                        <button onClick={() => restarProducto(item.cart_id || item.id)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 font-black text-2xl hover:bg-red-500 hover:text-white transition-colors active:scale-90 border border-red-500/20">-</button>
                        <span className={`w-12 sm:w-14 text-center font-black text-xl sm:text-2xl ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.cantidad}</span>
                        <button onClick={() => sumarUnidad(item.cart_id)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-green-500/10 text-green-500 font-black text-2xl hover:bg-green-500 hover:text-white transition-colors active:scale-90 border border-green-500/20">+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={`p-4 sm:p-6 border-t flex flex-col gap-3 shrink-0 ${tema === 'dark' ? 'border-[#222] bg-[#0d0d0d]' : 'border-gray-200 bg-[#fcfcfc]'}`}>
          {carrito.length > 0 ? (
            <button
              onClick={manejarEnviarCocina}
              disabled={procesando}
              className="w-full text-white rounded-2xl h-16 sm:h-20 font-black text-lg sm:text-xl tracking-wide flex justify-center items-center gap-3 transition-all active:scale-[0.98]"
              style={{ backgroundColor: colorPrimario, boxShadow: `0 8px 25px ${colorPrimario}40` }}
            >
              {procesando ? (
                <>PROCESANDO...</>
              ) : (
                <>
                  ENVIAR A COCINA <i className="fi fi-rr-room-service mt-1 text-2xl"></i>
                </>
              )}
            </button>
          ) : (
            ordenActiva && (
              <>
                {/* 🧐 LÓGICA: Si hay dinero por cobrar, muestra COBRAR */}
                {totalMesa > 0 ? (
                  <button
                    onClick={() => { setModalCobroAbierto(true); notificarEstadoMesa('cobrando', totalMesa); }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-16 sm:h-20 font-black text-lg sm:text-xl tracking-wide flex justify-center items-center gap-3 shadow-[0_8px_25px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98]"
                  >
                    COBRAR TICKET <i className="fi fi-rr-sack-dollar mt-1 text-2xl"></i>
                  </button>
                ) : (
                  <button
                    onClick={manejarAnulacionCompleta} 
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-16 sm:h-20 font-black text-lg sm:text-xl tracking-wide flex justify-center items-center gap-3 shadow-[0_8px_25px_rgba(244,63,94,0.3)] transition-all active:scale-[0.98]"
                  >
                    LIBERAR MESA <i className="fi fi-rr-broom mt-1 text-2xl"></i>
                  </button>
                )}
              </>
            )
          )}
        </div>
      </div>
    </>
  );
}