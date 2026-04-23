import React from 'react';
import PosView from '../../../views/View_Pos';

export default function TerminalSidebar({
  mesaSeleccionada, setMesaSeleccionada, setTriggerRecarga, 
  todasLasOrdenesActivas, setVistaLocal, mesas, tema, colorPrimario
}) {
  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${tema === 'dark' ? 'bg-[#0d0d0d]' : 'bg-[#fcfcfc]'} ${mesaSeleccionada ? 'w-full lg:w-[40%]' : 'hidden lg:flex lg:w-[40%]'}`}>
      {mesaSeleccionada ? (
        <PosView
          mesaId={mesaSeleccionada}
          onVolver={() => {
            setMesaSeleccionada(null);
            setTriggerRecarga(p => !p); 
          }}
        />
      ) : (
        <div className="p-8 animate-fadeIn h-full overflow-y-auto">
          <h3 className={`text-xs font-black uppercase tracking-[0.2em] mb-6 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
            Órdenes en curso 🚀
          </h3>
          
          <div className="space-y-4">
            {todasLasOrdenesActivas?.length > 0 ? todasLasOrdenesActivas.map(ticket => (
              <button 
                key={ticket.id} 
                onClick={() => {
                  if(ticket.tipo === 'llevar') setVistaLocal('llevar');
                  else setMesaSeleccionada(ticket.mesa);
                }}
                className={`w-full p-5 rounded-2xl border text-left flex justify-between items-center transition-all hover:scale-[1.02] ${tema === 'dark' ? 'bg-[#161616] border-[#222] hover:border-[#444]' : 'bg-white border-gray-200 shadow-sm'}`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${ticket.tipo === 'llevar' ? 'bg-blue-500/10 text-blue-500' : 'bg-[#ff5a1f]/10 text-[#ff5a1f]'}`}>
                      {ticket.tipo === 'llevar' ? 'Para Llevar' : 'Salón'}
                    </span>
                  </div>
                  <p className={`font-black text-lg ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {ticket.tipo === 'llevar' ? ticket.cliente_nombre : `Mesa ${mesas.find(m => m.id === ticket.mesa)?.numero || ticket.mesa}`}
                  </p>
                  <p className={`text-[10px] uppercase font-bold ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
                    Ticket #{ticket.id}
                  </p>
                </div>
                
                <span className="font-mono font-bold text-xl" style={{ color: colorPrimario }}>
                  S/ {parseFloat(ticket.total).toFixed(2)}
                </span>
              </button>
            )) : (
              <div className="flex flex-col items-center justify-center opacity-30 mt-20">
                <span className="text-6xl mb-4">💤</span>
                <p className={`font-bold uppercase tracking-widest text-xs ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>No hay pedidos activos</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}