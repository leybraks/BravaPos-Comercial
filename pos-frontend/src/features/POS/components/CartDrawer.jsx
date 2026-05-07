import React, { useMemo } from 'react';
import { Package, Tag } from 'lucide-react';
import { calcularLineasHappyHour, calcularLineasReglas, happyHourActivaAhora } from '../hooks/usePosData';

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
  manejarAnulacionCompleta,
  // Nuevos
  happyHours = [],
  reglasNegocio = [],
  tipoOrden = 'salon',
  productosBase = [],
}) {
  const isDark = tema === 'dark';

  // Calcular happy hours activas ahora
  const hhActivas = useMemo(() =>
    happyHours.filter(happyHourActivaAhora),
    [happyHours]
  );

  // Calcular líneas de promoción en tiempo real
  // En CartDrawer.jsx, cambia el useMemo de lineasHH:
  const lineasHH = useMemo(() => {
    // Combinar carrito local + detalles de la orden activa
    const itemsOrden = (ordenActiva?.detalles || []).map(d => ({
      cart_id: `db_${d.id}`,
      id: d.producto,
      nombre: d.producto_nombre,
      categoria: productosBase.find(p => String(p.id) === String(d.producto))?.categoria,
      cantidad: d.cantidad,
      precio_unitario_calculado: parseFloat(d.precio_unitario),
      precio: parseFloat(d.precio_unitario),
    }));
    const todosLosItems = [...carrito, ...itemsOrden];
    return calcularLineasHappyHour(hhActivas, todosLosItems, productosBase);
  }, [hhActivas, carrito, ordenActiva, productosBase]);

  const lineasReglas = useMemo(() =>
    calcularLineasReglas(reglasNegocio, carrito, tipoOrden, ''),
    [reglasNegocio, carrito, tipoOrden]
  );

  const totalDescuentos = lineasHH.reduce((s, l) => s + (l.tipo === 'descuento' ? l.monto : 0), 0)
    + lineasReglas.reduce((s, l) => s + (l.tipo === 'descuento' ? l.monto : 0), 0);
  const totalRecargos = lineasReglas.reduce((s, l) => s + (l.tipo === 'recargo' ? l.monto : 0), 0);
  const totalAjustado = totalMesa - totalDescuentos + totalRecargos;

  const hayLineas = lineasHH.length > 0 || lineasReglas.length > 0;

  const contenedorClasses = esDesktop
    ? `relative w-full h-full flex flex-col ${isDark ? 'bg-[#0d0d0d]' : 'bg-[#fcfcfc]'}`
    : `absolute inset-x-0 bottom-0 z-40 rounded-t-[2rem] border-t flex flex-col transition-transform duration-300 ease-out shadow-[0_-20px_60px_rgba(0,0,0,0.8)] ${carritoAbierto ? 'translate-y-0' : 'translate-y-full'} ${isDark ? 'bg-[#0d0d0d] border-[#222]' : 'bg-white border-gray-200'}`;
  return (
    <>
      {!esDesktop && carritoAbierto && (
        <div
          className="absolute inset-0 bg-black/60 z-30 transition-opacity backdrop-blur-sm"
          onClick={() => setCarritoAbierto(false)}
        />
      )}

      <div className={contenedorClasses} style={{ maxHeight: '100%' }}>

        {!esDesktop && (
          <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer shrink-0"
            onClick={() => setCarritoAbierto(false)}>
            <div className={`w-14 h-1.5 rounded-full ${isDark ? 'bg-[#333]' : 'bg-gray-300'}`} />
          </div>
        )}

        {/* Header */}
        <div className={`px-6 pb-5 flex justify-between items-start border-b shrink-0 ${esDesktop ? 'pt-6' : 'pt-1'} ${isDark ? 'border-[#222]' : 'border-gray-200'}`}>
          <div>
            <p className={`text-[10px] font-black tracking-widest uppercase mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
              Total de la cuenta
            </p>
            <p className={`text-4xl sm:text-5xl font-black tracking-tighter leading-none ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {formatearSoles(hayLineas ? totalAjustado : totalMesa)}
            </p>
            {hayLineas && totalMesa !== totalAjustado && (
              <p className={`text-xs line-through mt-0.5 ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}>
                {formatearSoles(totalMesa)}
              </p>
            )}
            <p className={`text-xs font-bold mt-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              <i className="fi fi-rr-shopping-cart-check mr-1.5 text-[10px]" />
              {cantItemsMesa} artículos en total
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {!esDesktop && (
              <button onClick={() => setCarritoAbierto(false)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors ${isDark ? 'bg-[#222] text-neutral-400 hover:text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900'}`}>
                <i className="fi fi-rr-cross mt-0.5" />
              </button>
            )}
            {ordenActiva && (
              <button onClick={manejarAnulacionCompleta}
                className="text-red-500 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all font-bold text-[10px] uppercase tracking-wider border border-red-500/20 active:scale-95">
                <i className="fi fi-rr-trash mt-0.5" /> Anular Pedido
              </button>
            )}
            {carrito.length > 0 && !ordenActiva && (
              <button onClick={vaciarStore}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider border active:scale-95 ${isDark ? 'text-neutral-400 bg-[#1a1a1a] hover:bg-[#222] border-[#333]' : 'text-gray-500 bg-gray-50 hover:bg-gray-100 border-gray-200'}`}>
                <i className="fi fi-rr-broom mt-0.5" /> Vaciar Carrito
              </button>
            )}
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0 scrollbar-hide">

          {/* Items en cocina */}
          {ordenActiva && ordenActiva.detalles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-6 h-6 rounded flex items-center justify-center ${isDark ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-gray-100 text-gray-400'}`}>
                  <i className="fi fi-rr-fire text-[10px] mt-0.5" />
                </div>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Ya en cocina</span>
                <div className={`flex-1 h-px ${isDark ? 'bg-[#222]' : 'bg-gray-200'}`} />
              </div>
              {ordenActiva.detalles.map((item, index) => {
                const notaSegura = item.notas_cocina || item.notas ||
                  (typeof item.notas_y_modificadores === 'object' ? item.notas_y_modificadores?.nota_libre : item.notas_y_modificadores);
                return (
                  <div key={`db-${index}`} className={`p-4 rounded-2xl border flex gap-4 items-center opacity-80 hover:opacity-100 ${isDark ? 'bg-[#141414] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-black text-xl ${isDark ? 'bg-[#222] text-neutral-400' : 'bg-gray-200 text-gray-600'}`}>
                      {item.cantidad}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-base truncate ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>{item.producto_nombre || item.nombre}</p>
                      {notaSegura && (
                        <p className="text-xs mt-1 font-medium truncate flex items-start gap-1" style={{ color: colorPrimario }}>
                          <i className="fi fi-rr-comment-alt text-[10px] mt-0.5" /> {notaSegura}
                        </p>
                      )}
                      <p className={`text-[11px] font-bold mt-1 uppercase ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{formatearSoles(item.precio_unitario)} c/u</p>
                    </div>
                    <button onClick={() => manejarAnularItem(item.id, item.producto_nombre || item.nombre)}
                      disabled={procesando}
                      className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors border border-red-500/20">
                      <i className="fi fi-rr-trash mt-0.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nuevos pedidos */}
          {carrito.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 mb-4 mt-2">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: `${colorPrimario}15`, color: colorPrimario }}>
                  <i className="fi fi-rr-shopping-bag text-[10px] mt-0.5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: colorPrimario }}>Nuevos Pedidos</span>
                <div className="flex-1 h-px" style={{ backgroundColor: `${colorPrimario}40` }} />
              </div>

              {carrito.map(item => {
                const precioAMostrar = item.precio_unitario_calculado || item.precio_base || item.precio || 0;
                const notaSegura = item.notas_cocina || item.notas ||
                  (typeof item.notas_y_modificadores === 'object' ? item.notas_y_modificadores?.nota_libre : item.notas_y_modificadores);

                // ── Render especial para combos ─────────────────────
                if (item._es_combo) {
                  return (
                    <div key={item.cart_id} className={`group p-4 sm:p-5 rounded-3xl border transition-all flex flex-col gap-3 ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}
                      style={{ borderColor: colorPrimario + '30' }}>

                      {/* Header combo */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded text-white"
                              style={{ backgroundColor: colorPrimario }}>
                              Combo
                            </span>
                            <p className={`font-black text-base truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.nombre}</p>
                          </div>
                          <p className={`text-xs font-bold ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>{formatearSoles(precioAMostrar)} c/u</p>
                        </div>
                        <p className={`font-black text-xl shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {formatearSoles(precioAMostrar * item.cantidad)}
                        </p>
                      </div>

                      {/* Productos del combo */}
                      {item._items_combo && item._items_combo.length > 0 && (
                        <div className={`pl-3 border-l-2 space-y-1`} style={{ borderColor: colorPrimario + '40' }}>
                          {item._items_combo.map((prod, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Package size={10} className="opacity-40" />
                                <p className={`text-xs font-bold ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                                  {prod.cantidad}x {prod.nombre}{prod.opcion ? ` ${prod.opcion}` : ''}
                                </p>
                              </div>
                              {/* Botón modificadores del producto interno */}
                              <button
                                className={`text-[9px] font-bold px-2 py-0.5 rounded transition-colors ${isDark ? 'text-neutral-500 hover:text-white bg-[#222] hover:bg-[#333]' : 'text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200'}`}>
                                Notas
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Controles del combo (solo +/-) */}
                      <div className={`pt-3 border-t flex justify-end ${isDark ? 'border-[#333]' : 'border-gray-100'}`}>
                        <div className={`flex items-center rounded-xl p-1.5 border ${isDark ? 'bg-[#111] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                          <button onClick={() => restarProducto(item.cart_id)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 font-black text-2xl hover:bg-red-500 hover:text-white transition-colors border border-red-500/20">
                            -
                          </button>
                          <span className={`w-12 text-center font-black text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.cantidad}</span>
                          <button onClick={() => sumarUnidad(item.cart_id)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-green-500/10 text-green-500 font-black text-2xl hover:bg-green-500 hover:text-white transition-colors border border-green-500/20">
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ── Render normal ───────────────────────────────────
                // Buscar si hay HH aplicando a este item
                const lineaHH = lineasHH.find(l => l.cart_id === item.cart_id);

                return (
                  <div key={item.cart_id || item.id} className={`group p-4 sm:p-5 rounded-3xl border transition-all flex flex-col gap-4 ${isDark ? 'bg-[#1a1a1a] border-[#333] hover:border-[#444]' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`font-black text-lg sm:text-xl leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {item.producto_nombre || item.nombre}
                        </p>
                        {notaSegura && (
                          <p className="text-xs sm:text-sm mt-1.5 font-medium flex items-start gap-1" style={{ color: colorPrimario }}>
                            <i className="fi fi-rr-comment-alt text-[10px] mt-0.5 shrink-0" />
                            <span className="truncate">{notaSegura}</span>
                          </p>
                        )}
                        {/* Badge HH */}
                        {lineaHH && (
                          <div className="flex items-center gap-1 mt-1">
                            <Tag size={10} className="text-green-400" />
                            <span className="text-[9px] font-black text-green-400 uppercase tracking-wide">{lineaHH.label}</span>
                          </div>
                        )}
                        <p className={`text-xs font-bold mt-2 uppercase ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                          {lineaHH?.precio_nuevo
                            ? <><span className="line-through opacity-50 mr-1">{formatearSoles(precioAMostrar)}</span>{formatearSoles(lineaHH.precio_nuevo)}</>
                            : formatearSoles(precioAMostrar)
                          } c/u
                        </p>
                      </div>
                      <p className={`font-black text-xl sm:text-2xl shrink-0 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {formatearSoles(precioAMostrar * item.cantidad - (lineaHH?.monto ?? 0))}
                      </p>
                    </div>

                    <div className={`pt-4 border-t flex justify-between items-center gap-2 ${isDark ? 'border-[#333]' : 'border-gray-100'}`}>
                      <button onClick={() => abrirModalParaEditar(item)}
                        className={`px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5 ${isDark ? 'bg-[#2a2a2a] text-neutral-300 hover:bg-[#333]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <i className="fi fi-rr-edit mt-0.5" /> Notas
                      </button>
                      <div className={`flex items-center rounded-xl p-1.5 border ${isDark ? 'bg-[#111] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                        <button onClick={() => restarProducto(item.cart_id || item.id)}
                          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 font-black text-2xl hover:bg-red-500 hover:text-white transition-colors border border-red-500/20">-</button>
                        <span className={`w-12 sm:w-14 text-center font-black text-xl sm:text-2xl ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.cantidad}</span>
                        <button onClick={() => sumarUnidad(item.cart_id)}
                          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-lg bg-green-500/10 text-green-500 font-black text-2xl hover:bg-green-500 hover:text-white transition-colors border border-green-500/20">+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Líneas de descuentos/recargos */}
          {hayLineas && (
            <div className={`rounded-2xl border p-4 space-y-2 ${isDark ? 'bg-[#111] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                Ajustes aplicados
              </p>
              {[...lineasHH, ...lineasReglas].map((linea, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Tag size={10} className={linea.tipo === 'descuento' ? 'text-green-400' : 'text-orange-400'} />
                    <span className={`text-xs font-bold ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>{linea.label}</span>
                  </div>
                  <span className={`text-xs font-black ${linea.tipo === 'descuento' ? 'text-green-400' : 'text-orange-400'}`}>
                    {linea.tipo === 'descuento' ? '−' : '+'} {formatearSoles(linea.monto)}
                  </span>
                </div>
              ))}
              <div className={`flex justify-between pt-2 border-t ${isDark ? 'border-[#222]' : 'border-gray-200'}`}>
                <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Total ajustado</span>
                <span className="text-xs font-black" style={{ color: colorPrimario }}>{formatearSoles(totalAjustado)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 sm:p-6 border-t flex flex-col gap-3 shrink-0 ${isDark ? 'border-[#222] bg-[#0d0d0d]' : 'border-gray-200 bg-[#fcfcfc]'}`}>
          {carrito.length > 0 ? (
            <button onClick={manejarEnviarCocina} disabled={procesando}
              className="w-full text-white rounded-2xl h-16 sm:h-20 font-black text-lg sm:text-xl tracking-wide flex justify-center items-center gap-3 transition-all active:scale-[0.98]"
              style={{ backgroundColor: colorPrimario, boxShadow: `0 8px 25px ${colorPrimario}40` }}>
              {procesando ? 'PROCESANDO...' : <>ENVIAR A COCINA <i className="fi fi-rr-room-service mt-1 text-2xl" /></>}
            </button>
          ) : (
            ordenActiva && (
              <>
                {totalMesa > 0 ? (
                  <button onClick={() => { setModalCobroAbierto(true); notificarEstadoMesa('cobrando', totalMesa); }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-16 sm:h-20 font-black text-lg sm:text-xl tracking-wide flex justify-center items-center gap-3 shadow-[0_8px_25px_rgba(16,185,129,0.3)] transition-all active:scale-[0.98]">
                    COBRAR TICKET <i className="fi fi-rr-sack-dollar mt-1 text-2xl" />
                  </button>
                ) : (
                  <button onClick={manejarAnulacionCompleta}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-2xl h-16 sm:h-20 font-black text-lg sm:text-xl tracking-wide flex justify-center items-center gap-3 shadow-[0_8px_25px_rgba(244,63,94,0.3)] transition-all active:scale-[0.98]">
                    LIBERAR MESA <i className="fi fi-rr-broom mt-1 text-2xl" />
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