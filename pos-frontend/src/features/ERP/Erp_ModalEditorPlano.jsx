import React from 'react';

export default function ModalEditorPlano({
  c, colorPrimario,
  sedeActualNombre,
  mesas, columnas, casillasArray,
  mesaArrastradaId, setMesaArrastradaId,
  guardando,
  onCambioColumnas,
  onDrop,
  onGuardar,
  onAbrirNuevaMesa,
  onCerrar,
}) {
  return (
    <div
      className="absolute inset-0 z-[90] flex flex-col animate-fadeIn rounded-2xl overflow-hidden"
      style={{ background: c.bg }}
    >
      {/* ── Header ─────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: c.border, background: c.surface }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onCerrar}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors border"
            style={{ borderColor: c.border2, color: c.muted, background: c.surface2 }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 11L11 1M1 1l10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="w-px h-5" style={{ background: c.border }} />

          <div>
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: c.muted }}>Editor de plano</p>
            <p className="font-black text-sm" style={{ color: c.text }}>{sedeActualNombre}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Segmented control columnas */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: c.surface2 }}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                onClick={() => onCambioColumnas(n)}
                className="px-3 py-1.5 rounded-lg text-xs font-black transition-all"
                style={columnas === n ? { backgroundColor: colorPrimario, color: '#fff' } : { color: c.muted }}
              >
                {n}×
              </button>
            ))}
            <span className="pl-1 pr-2 text-[10px] uppercase tracking-widest font-black" style={{ color: c.faint }}>
              cols
            </span>
          </div>

          <div className="w-px h-5" style={{ background: c.border }} />

          <span className="text-xs font-bold" style={{ color: c.muted }}>{mesas.length} mesas</span>

          <button
            onClick={onAbrirNuevaMesa}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
            style={{ borderColor: c.border2, color: c.text, background: 'transparent' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Nueva mesa
          </button>

          <button
            onClick={onGuardar}
            disabled={guardando}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-black uppercase tracking-wide transition-all active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: colorPrimario }}
          >
            {guardando ? (
              <>
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5"/>
                  <path d="M10.5 6A4.5 4.5 0 0 0 6 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Guardando
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6.5L4.5 9l5.5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Guardar plano
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Lienzo ─────────────────────────────── */}
      <div
        className="flex-1 overflow-auto custom-scrollbar"
        style={{
          background: c.canvas,
          backgroundImage: `radial-gradient(circle, ${c.dot} 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
          padding: '24px',
        }}
      >
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${columnas}, 140px)`,
            gridAutoRows: '140px',
            width: 'fit-content',
            margin: '0 auto',
          }}
        >
          {casillasArray.map((casillaIndex) => {
            const mesaEnCasilla = mesas.find(m => m.posicion_x === casillaIndex);
            const esDragTarget  = mesaArrastradaId !== null && !mesaEnCasilla;

            return (
              <div
                key={casillaIndex}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(casillaIndex)}
                className="relative flex items-center justify-center transition-all"
              >
                {/* Casilla vacía */}
                {!mesaEnCasilla && (
                  <div
                    className="w-full h-full rounded-2xl border border-dashed flex items-center justify-center transition-all"
                    style={
                      esDragTarget
                        ? { borderColor: colorPrimario, backgroundColor: colorPrimario + '12', transform: 'scale(1.04)' }
                        : { borderColor: c.border }
                    }
                  >
                    {esDragTarget && (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="8" stroke={colorPrimario} strokeWidth="1.5" strokeDasharray="3 2"/>
                        <path d="M10 6v8M6 10h8" stroke={colorPrimario} strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                )}

                {/* Tarjeta de mesa */}
                {mesaEnCasilla && (
                  <div
                    draggable
                    onDragStart={() => setMesaArrastradaId(mesaEnCasilla.id)}
                    onDragEnd={() => setMesaArrastradaId(null)}
                    className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing group"
                    style={{
                      background: c.surface,
                      border: `1.5px solid ${colorPrimario}35`,
                      boxShadow: `0 0 0 1px ${colorPrimario}15`,
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div
                      className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full opacity-80"
                      style={{ backgroundColor: colorPrimario }}
                    />

                    <div
                      className="mb-2 w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: colorPrimario + '20' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <rect x="2" y="5" width="14" height="8" rx="2" stroke={colorPrimario} strokeWidth="1.4"/>
                        <path d="M5 5V3.5M13 5V3.5M5 13v1.5M13 13v1.5" stroke={colorPrimario} strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </div>

                    <span className="text-lg font-black leading-none" style={{ color: c.text }}>
                      {mesaEnCasilla.numero_o_nombre || mesaEnCasilla.id}
                    </span>

                    {mesaEnCasilla.capacidad && (
                      <span className="mt-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: colorPrimario + 'bb' }}>
                        {mesaEnCasilla.capacidad} personas
                      </span>
                    )}

                    <div className="absolute bottom-2 flex gap-0.5 opacity-0 group-hover:opacity-25 transition-opacity">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-0.5 h-2.5 rounded-full" style={{ background: c.text }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}