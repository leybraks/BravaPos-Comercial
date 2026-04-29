// pos-frontend/src/components/modals/ModalAlertaBot.jsx
import React, { useState } from 'react';

export default function ModalAlertaBot({ solicitud, onResolver }) {
  const [procesando, setProcesando] = useState(false);

  // Si no hay solicitud en cola, no renderizamos nada
  if (!solicitud) return null;

  const manejarClick = async (decision) => {
    setProcesando(true);
    await onResolver(solicitud.solicitud_id, solicitud.orden_id, decision);
    setProcesando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#1a1a1a] border-2 border-[#ff5a1f] rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(255,90,31,0.2)] animate-slideUp">
        
        {/* HEADER DE ALERTA */}
        <div className="flex items-center gap-4 mb-6 border-b border-[#333] pb-4">
          <div className="w-14 h-14 bg-red-500/20 text-red-500 rounded-2xl flex items-center justify-center text-3xl animate-pulse">
            ⚠️
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">¡Alerta del Bot!</h2>
            <p className="text-neutral-400 text-sm font-bold">Orden #{solicitud.orden_id} - {solicitud.mesa}</p>
          </div>
        </div>

        {/* DETALLE DEL CAMBIO */}
        <div className="bg-[#111] border border-[#333] rounded-2xl p-5 mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#ff5a1f] mb-1 block">
            Solicitud: {solicitud.accion}
          </span>
          <p className="text-white text-lg font-medium leading-relaxed">
            {solicitud.descripcion}
          </p>
        </div>

        {/* BOTONES DE DECISIÓN */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            disabled={procesando}
            onClick={() => manejarClick('rechazar')}
            className="bg-[#222] hover:bg-red-500 hover:text-white text-neutral-300 py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all border border-[#333] hover:border-red-500 disabled:opacity-50"
          >
            {procesando ? '...' : 'Rechazar (En Fuego)'}
          </button>
          <button 
            disabled={procesando}
            onClick={() => manejarClick('aprobar')}
            className="bg-[#ff5a1f] hover:bg-[#e04a15] text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all disabled:opacity-50"
          >
            {procesando ? '...' : 'Aprobar Cambio'}
          </button>
        </div>

      </div>
    </div>
  );
}