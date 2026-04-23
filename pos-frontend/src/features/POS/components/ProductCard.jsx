import React from 'react';

export default function ProductCard({
  prod,
  tema,
  colorPrimario,
  carrito,
  categoriasReales,
  ordenActiva,
  totalMesa,
  busqueda,
  abrirModalParaNuevo,
  aprenderSeleccion,
  agregarProducto,
  restarDesdeGrid,
  notificarEstadoMesa,
  formatearSoles
}) {
  const totalCantidadProd = carrito.filter(item => item.id === prod.id).reduce((acc, curr) => acc + curr.cantidad, 0);
  const tieneVariantes = carrito.some(item => item.id === prod.id && item.cart_id !== `base_${prod.id}`);
  const nombreCategoriaMuestra = categoriasReales.find(c => String(c.id) === String(prod.categoria))?.nombre || 'Sin categoría';

  if (prod.requiere_seleccion) {
    return (
      <button 
        onClick={() => {
            if (prod.disponible) {
                abrirModalParaNuevo(prod);
                aprenderSeleccion(prod.id, busqueda); 
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

  const precioAMostrar = parseFloat(prod.precio_base || prod.precio);
  return (
    <div 
      onClick={() => { 
        if (prod.disponible) { 
          if (ordenActiva) notificarEstadoMesa('tomando_pedido', totalMesa); 
          agregarProducto(prod); 
          aprenderSeleccion(prod.id, busqueda); 
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
}