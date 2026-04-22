import React from 'react';

export default function Erp_ModalCambios({ isOpen, config, onGuardar, onDescartar, onCancelar }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className={`rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border ${
        config.temaFondo === 'dark' ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b ${
          config.temaFondo === 'dark' ? 'border-[#222]' : 'border-gray-200'
        }`}>
          <h3 className={`text-xl font-black ${
            config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Cambios sin guardar
          </h3>
          <p className={`text-sm mt-1 ${
            config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-gray-500'
          }`}>
            Tienes cambios pendientes en la configuración. ¿Qué deseas hacer?
          </p>
        </div>
        <div className="p-6 flex flex-col gap-3">
          <button 
            onClick={onGuardar}
            style={{ backgroundColor: config.colorPrimario }}
            className="text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all"
          >
            Guardar cambios y salir
          </button>
          <button 
            onClick={onDescartar}
            className={`py-3 rounded-xl font-bold transition-all ${
              config.temaFondo === 'dark'
                ? 'bg-[#1a1a1a] text-neutral-300 hover:bg-[#222] border border-[#333]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
          >
            Descartar cambios
          </button>
          <button 
            onClick={onCancelar}
            className="text-sm font-bold text-neutral-500 hover:text-neutral-400 transition-colors"
          >
            Seguir editando
          </button>
        </div>
      </div>
    </div>
  );
}