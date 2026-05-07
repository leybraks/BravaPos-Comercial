import React from 'react';

export default function ModalNuevaMesa({ c, colorPrimario, formMesa, setFormMesa, creandoMesa, onCrear, onCerrar }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div
        className="border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        style={{ background: c.surface, borderColor: c.border2 }}
      >
        <div className="p-5 flex justify-between items-center border-b" style={{ borderColor: c.border }}>
          <h3 className="text-base font-black" style={{ color: c.text }}>Añadir Mesa</h3>
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

        <div className="p-6 space-y-5">
          {[
            { label: 'Número o Nombre', field: 'numero', type: 'text',   placeholder: 'Ej. 12 o VIP', autoFocus: true },
            { label: 'Capacidad',       field: 'capacidad', type: 'number', placeholder: '', min: 1 },
          ].map(({ label, field, type, placeholder, autoFocus, min }) => (
            <div key={field}>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: c.muted }}>
                {label}
              </label>
              <input
                type={type}
                min={min}
                value={formMesa[field]}
                onChange={(e) => setFormMesa({ ...formMesa, [field]: e.target.value })}
                className="w-full border rounded-xl px-4 py-3 outline-none text-sm font-bold"
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
            disabled={creandoMesa || !formMesa.numero}
            className="w-full text-white py-3.5 rounded-xl font-black text-sm active:scale-95 disabled:opacity-50 transition-all uppercase tracking-wide"
            style={{ backgroundColor: colorPrimario }}
          >
            {creandoMesa ? 'Creando...' : 'Crear y Colocar'}
          </button>
        </div>
      </div>
    </div>
  );
}