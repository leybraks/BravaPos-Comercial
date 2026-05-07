import React from 'react';
import { Check, Timer, Loader2 } from 'lucide-react';

export default function Bot_QrModal({ 
  qrModal, 
  isDark, 
  qrEscaneado, 
  tiempoQr, 
  manejarCancelarVinculacion, 
  loadingAction 
}) {
  
  // Si el modal no está abierto, no renderizamos nada (código más limpio)
  if (!qrModal.open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fadeIn">
      <div className={`border rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl ${
        isDark ? 'bg-[#111] border-[#333]' : 'bg-white border-gray-200'
      }`}>
        
        {qrEscaneado ? (
          <div className="py-8 animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 text-green-500 animate-bounce">
              <Check size={40} strokeWidth={3} />
            </div>
            <h3 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>¡Conectado!</h3>
            <p className={isDark ? 'text-neutral-400' : 'text-gray-500'}>El Bot de WhatsApp está listo para trabajar.</p>
          </div>
        ) : (
          <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Vincular {qrModal.sedeNombre}</h3>
              <div className={`px-3 py-1 rounded-md font-mono text-xs font-bold flex items-center gap-2 border ${
                isDark ? 'bg-[#222] border-[#333] text-white' : 'bg-gray-100 border-gray-200 text-gray-800'
              }`}>
                <Timer size={14} /> 00:{tiempoQr.toString().padStart(2, '0')}
              </div>
            </div>
            
            <p className={`text-xs mb-6 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              Abre WhatsApp, ve a <strong className={isDark ? 'text-white' : 'text-gray-900'}>Dispositivos vinculados</strong> y escanea este código.
            </p>
            
            <div className="bg-white p-4 rounded-2xl mb-8 inline-block shadow-[0_0_30px_rgba(255,255,255,0.1)] relative">
              {qrModal.qrBase64 ? (
                <img src={qrModal.qrBase64} alt="QR WhatsApp" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex flex-col items-center justify-center text-black font-bold gap-3">
                  <Loader2 className="animate-spin text-neutral-400" size={32} />
                  <span className="text-sm text-neutral-500">Cargando código...</span>
                </div>
              )}
              {/* Animación de escaneo */}
              <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 shadow-[0_0_10px_#22c55e] animate-scan"></div>
            </div>

            <button 
              onClick={manejarCancelarVinculacion}
              disabled={loadingAction?.includes('desvincular')}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors border disabled:opacity-50 ${
                isDark ? 'bg-[#222] hover:bg-[#333] text-white border-[#333]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
              }`}
            >
              {loadingAction?.includes('desvincular') ? 'Limpiando...' : 'Cancelar Vinculación'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}   