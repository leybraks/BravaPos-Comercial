import React from 'react';

export default function PosFooter({
  tema,
  colorPrimario,
  cantItemsMesa,
  totalMesa,
  totalAjustado,         // 👈
  hayDescuentos = false, // 👈
  setCarritoAbierto,
  manejarEnviarCocina,
  procesando,
  carrito,
  formatearSoles
}) {
  const isDark = tema === 'dark';
  const totalMostrar = totalAjustado ?? totalMesa;

  return (
    <div className={`shrink-0 w-full p-4 sm:px-6 border-t z-20 transition-colors ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
      <div className="flex gap-3 h-16">
        
        <button 
          onClick={() => setCarritoAbierto(true)}
          disabled={cantItemsMesa === 0} 
          className={`flex-1 rounded-2xl py-4 font-bold flex justify-between px-5 items-center disabled:opacity-40 transition-all active:scale-[0.98] border ${
            isDark 
              ? 'bg-[#141414] hover:bg-[#1a1a1a] border-[#222] hover:border-[#333] text-white' 
              : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-900 hover:border-gray-300'
          }`}
        >
          <div className="flex gap-3 items-center">
            <span 
              className="text-white w-9 h-9 flex items-center justify-center rounded-xl font-black text-lg" 
              style={{ backgroundColor: colorPrimario }}
            >
              {cantItemsMesa}
            </span>
            <div className="flex flex-col">
              <span className="font-black tracking-tight uppercase text-sm md:text-base">
                Ver Cuenta
              </span>
              {/* Badge promo activa */}
              {hayDescuentos && (
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>
                  <i className="fi fi-rr-tag mr-0.5" /> Promo activa
                </span>
              )}
            </div>
          </div>
          
          {/* Precio — con tachado si hay descuento */}
          <div className="flex flex-col items-end">
            {hayDescuentos && (
              <span className={`text-xs line-through leading-none mb-0.5 ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}>
                {formatearSoles(totalMesa)}
              </span>
            )}
            <span className="font-black text-xl leading-none" style={{ color: hayDescuentos ? '#f59e0b' : colorPrimario }}>
              {formatearSoles(totalMostrar)}
            </span>
          </div>
        </button>

        <button 
          onClick={manejarEnviarCocina}
          disabled={procesando || carrito.length === 0} 
          className={`text-white rounded-2xl px-6 py-4 font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center min-w-[140px] active:scale-95 gap-2 ${
            (procesando || carrito.length === 0) 
              ? (isDark ? 'bg-[#222] text-neutral-500' : 'bg-gray-200 text-gray-500') 
              : ''
          }`}
          style={!(procesando || carrito.length === 0) ? { backgroundColor: colorPrimario } : {}}
        >
          {procesando ? (
            <span className="animate-pulse">Enviando...</span>
          ) : (
            <>ENVIAR <i className="fi fi-rr-paper-plane mt-0.5 text-lg"></i></>
          )}
        </button>
        
      </div>
    </div>
  );
}