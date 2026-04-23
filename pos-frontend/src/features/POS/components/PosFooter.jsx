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
  return (
    <div className={`shrink-0 w-full p-4 sm:px-6 border-t z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] transition-colors ${tema === 'dark' ? 'bg-[#0d0d0d] border-[#222]' : 'bg-white border-gray-200'}`}>
      <div className="flex gap-3 h-16">
        <button 
          onClick={() => setCarritoAbierto(true)}
          disabled={cantItemsMesa === 0} 
          className={`flex-1 rounded-2xl py-4 font-bold text-lg flex justify-between px-5 items-center disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg border ${tema === 'dark' ? 'bg-[#111] hover:bg-[#1a1a1a] border-[#2a2a2a] text-white' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-900'}`}
        >
          <div className="flex gap-2.5 items-center">
            <span className="text-white border w-9 h-9 flex items-center justify-center rounded-xl font-black text-xl shadow-inner" style={{ backgroundColor: colorPrimario, borderColor: colorPrimario }}>
              {cantItemsMesa}
            </span>
            <span className='font-black tracking-tight uppercase text-base'>Ver Cuenta</span>
          </div>
          <span className="font-mono text-xl font-bold" style={{ color: colorPrimario }}>
            {formatearSoles(totalMesa)}
          </span>
        </button>

        <button 
          onClick={manejarEnviarCocina}
          disabled={procesando || carrito.length === 0} 
          className="text-white rounded-2xl px-6 py-4 font-black text-lg disabled:opacity-30 disabled:shadow-none disabled:bg-[#333] transition-all flex items-center justify-center min-w-[130px] active:scale-[0.98]"
          style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 20px ${colorPrimario}4D` }}
        >
          {procesando ? <span className="animate-pulse">...</span> : 'ENVIAR 🚀'}
        </button>
      </div>
    </div>
  );
}