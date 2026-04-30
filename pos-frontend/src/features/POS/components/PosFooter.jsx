import React from 'react';

export default function PosFooter({
  tema,
  colorPrimario,
  cantItemsMesa,
  totalMesa,
  setCarritoAbierto,
  manejarEnviarCocina,
  procesando,
  carrito,
  formatearSoles
}) {
  const isDark = tema === 'dark';

  return (
    // Estilo ERP: Borde superior sutil, sin sombra flotante
    <div className={`shrink-0 w-full p-4 sm:px-6 border-t z-20 transition-colors ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
      <div className="flex gap-3 h-16">
        
        {/* Botón Ver Cuenta: Plano, oscuro, elegante */}
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
            {/* Badge de cantidad: Sin bordes dobles ni sombras internas */}
            <span 
              className="text-white w-9 h-9 flex items-center justify-center rounded-xl font-black text-lg" 
              style={{ backgroundColor: colorPrimario }}
            >
              {cantItemsMesa}
            </span>
            <span className="font-black tracking-tight uppercase text-sm md:text-base">
              Ver Cuenta
            </span>
          </div>
          
          <span className="font-black text-xl" style={{ color: colorPrimario }}>
            {formatearSoles(totalMesa)}
          </span>
        </button>

        {/* Botón Enviar a Cocina: Sólido, tipografía espaciada, ícono en lugar de emoji */}
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
            <>
              ENVIAR <i className="fi fi-rr-paper-plane mt-0.5 text-lg"></i>
            </>
          )}
        </button>
        
      </div>
    </div>
  );
}