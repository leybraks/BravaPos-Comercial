import React from 'react';

export default function ModalNuevaSede({ c, colorPrimario, formNuevaSede, setFormNuevaSede, creandoSede, onCrear, onCerrar }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        style={{ background: c.surface, borderColor: c.border2 }}
      >
        <div className="p-5 flex justify-between items-center border-b" style={{ borderColor: c.border }}>
          <h3 className="text-base font-black" style={{ color: c.text }}>Crear Nueva Sede</h3>
          <button
            onClick={onCerrar}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: c.muted, background: c.surface2 }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 9L9 1M1 1l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {[
            { label: 'Nombre del Local', field: 'nombre',   placeholder: 'Ej. Brava San Miguel', autoFocus: true },
            { label: 'Plus Code (Opcional)', field: 'direccion', placeholder: 'Ej. 6MC5+QQ' },
          ].map(({ label, field, placeholder, autoFocus }) => (
            <div key={field}>
              <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: c.muted }}>
                {label}
              </label>
              <input
                type="text"
                value={formNuevaSede[field]}
                onChange={(e) => setFormNuevaSede({ ...formNuevaSede, [field]: e.target.value })}
                className="w-full border rounded-xl px-4 py-2.5 outline-none text-sm font-bold"
                style={{ background: c.surface2, borderColor: c.border2, color: c.text }}
                onFocus={(e) => e.target.style.borderColor = colorPrimario}
                onBlur={(e)  => e.target.style.borderColor = c.border2}
                placeholder={placeholder}
                autoFocus={autoFocus}
              />
            </div>
          ))}

          <button
            onClick={onCrear}
            disabled={creandoSede || !formNuevaSede.nombre.trim()}
            className="w-full text-white py-3 rounded-xl font-bold text-sm mt-2 disabled:opacity-50 transition-all uppercase tracking-wide active:scale-95"
            style={{ backgroundColor: colorPrimario }}
          >
            {creandoSede ? 'Creando...' : 'Crear Sede'}
          </button>
        </div>
      </div>
    </div>
  );
}