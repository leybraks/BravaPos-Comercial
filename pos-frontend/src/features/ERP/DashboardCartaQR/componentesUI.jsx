import React from 'react';

// ============================================================
// COMPONENTE: SECCIÓN (Wrapper para los inputs del editor)
// ============================================================
export function Seccion({ titulo, icon, labelCls, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <i className={`fi ${icon} text-sm opacity-60`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${labelCls}`}>{titulo}</span>
      </div>
      {children}
    </div>
  );
}

// ============================================================
// COMPONENTE: TOGGLE (Interruptor de encendido/apagado)
// ============================================================
export function Toggle({ activo, onChange, color, isDark }) {
  return (
    <button
      onClick={() => onChange(!activo)}
      className="relative w-12 h-6 rounded-full transition-all shrink-0"
      style={{ background: activo ? color : isDark ? '#2a2a2a' : '#d1d5db' }}
    >
      <div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: activo ? '28px' : '4px' }}
      />
    </button>
  );
}

// ============================================================
// COMPONENTE: PREVIEW TARJETA (Platos mockeados para la vista previa)
// ============================================================
export function PreviewTarjeta({ plato, estilo, fuenteTit, fuenteBody, acento, mostrarDesc, mostrarBadge, mostrarImagen, esquinas }) {
  const r = esquinas ? 'rounded-2xl' : 'rounded-lg';
  const estilosMap = {
    minimal: 'bg-white/5 border border-white/10',
    gourmet: 'bg-black/40 border border-white/15',
    bistro:  'bg-white/5 border border-white/10 border-l-2',
    moderno: 'bg-white/10',
  };
  
  return (
    <div
      className={`p-4 ${r} ${estilosMap[estilo] || estilosMap.minimal}`}
      style={estilo === 'bistro' ? { borderLeftColor: acento } : {}}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-white text-sm font-bold leading-snug" style={{ fontFamily: fuenteTit }}>
              {plato.nombre}
            </span>
            {mostrarBadge && plato.popular && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase shrink-0 text-white" style={{ background: acento }}>
                ⭐ Popular
              </span>
            )}
          </div>
          {mostrarDesc && (
            <p className="text-white/50 text-xs leading-relaxed" style={{ fontFamily: fuenteBody }}>
              {plato.desc}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-sm font-black" style={{ fontFamily: fuenteTit, color: acento }}>
            <span className="text-[10px] opacity-75 mr-0.5">S/</span>{plato.precio}
          </span>
          {mostrarImagen && (
            <div className={`w-12 h-12 ${esquinas ? 'rounded-xl' : 'rounded-md'} bg-white/10 flex items-center justify-center text-xl`}>
              🍝
            </div>
          )}
        </div>
      </div>
    </div>
  );
}