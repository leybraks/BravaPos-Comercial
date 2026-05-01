import React, { useEffect } from 'react';

export default function Notificacion({ mensaje, tipo = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const estilos = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white'
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] animate-bounce-in">
      <div className={`${estilos[tipo]} px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm border border-white/20`}>
        <i className={`fi ${tipo === 'success' ? 'fi-rr-check' : 'fi-rr-info'} text-lg`} />
        {mensaje}
      </div>
    </div>
  );
}