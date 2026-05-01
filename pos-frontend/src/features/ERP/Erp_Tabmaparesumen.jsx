import React from 'react';

export default function TabMapaResumen({ c, colorPrimario, sedes, mesasPorSede, cargando, onAbrirEditor }) {
  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20 animate-fadeIn">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: colorPrimario, borderTopColor: 'transparent' }} />
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: c.muted }}>Cargando planos...</p>
        </div>
      </div>
    );
  }

  if (!sedes || sedes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 animate-fadeIn">
        <p className="text-sm font-bold" style={{ color: c.muted }}>No hay sedes registradas.</p>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {sedes.map(sede => {
          const mesas   = mesasPorSede[sede.id] || [];
          const columnas = parseInt(sede.columnas_salon) || 3;
          const celdas  = Math.min(columnas * 2, 8);

          return (
            <div
              key={sede.id}
              className="rounded-2xl border p-5 flex flex-col gap-4 shadow-sm transition-all"
              style={{ background: c.surface, borderColor: c.border }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-black text-sm leading-tight" style={{ color: c.text }}>{sede.nombre}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: c.muted }}>
                    {mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'} · {columnas} col.
                  </p>
                </div>
                {mesas.length === 0 && (
                  <span
                    className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ background: c.surface2, color: c.muted }}
                  >
                    Sin plano
                  </span>
                )}
              </div>

              {/* Miniatura del plano */}
              {(() => {
                // Ordenar por posicion_x y mapear a posiciones relativas (0..N-1)
                // para que mesas en posiciones altas sigan apareciendo en la miniatura
                const posicionesOcupadas = new Set(
                  [...mesas]
                    .sort((a, b) => a.posicion_x - b.posicion_x)
                    .slice(0, celdas)
                    .map((_, idx) => idx)
                );
                return (
                  <div
                    className="rounded-xl p-2 grid gap-1"
                    style={{
                      background: c.surface2,
                      gridTemplateColumns: `repeat(${Math.min(columnas, 4)}, 1fr)`,
                      minHeight: '40px',
                    }}
                  >
                    {Array.from({ length: celdas }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded"
                        style={{
                          background: posicionesOcupadas.has(i) ? colorPrimario + 'cc' : c.faint,
                          minHeight: '10px',
                        }}
                      />
                    ))}
                  </div>
                );
              })()}

              {/* Nombres de mesas (máx 5) */}
              {mesas.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {mesas.slice(0, 5).map(m => (
                    <span
                      key={m.id}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                      style={{ background: colorPrimario + '22', color: colorPrimario }}
                    >
                      {m.numero_o_nombre || m.id}
                    </span>
                  ))}
                  {mesas.length > 5 && (
                    <span className="text-[10px] font-bold" style={{ color: c.muted }}>
                      +{mesas.length - 5} más
                    </span>
                  )}
                </div>
              )}

              {/* Botón editar */}
              <button
                onClick={() => onAbrirEditor(sede.id)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-black text-xs text-white uppercase tracking-wide transition-all active:scale-95 mt-auto"
                style={{ backgroundColor: colorPrimario }}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M9.5 1.5L12.5 4.5L5 12H2V9L9.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                  <path d="M8 3l3 3" stroke="currentColor" strokeWidth="1.3"/>
                </svg>
                Editar plano
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-2 text-center" style={{ color: c.faint }}>
        Arrastra las mesas para reorganizar el salón dentro del editor
      </p>
    </div>
  );
}