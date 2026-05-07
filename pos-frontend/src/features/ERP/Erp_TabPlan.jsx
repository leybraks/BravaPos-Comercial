import React from 'react';

export default function Tab_Plan({ config, isDark, colorPrimario }) {
  const planActual = config.permisosPlan?.nombre || "Plan Base";
  const sedesUsadas = config.sedesActuales || 0;
  const maxSedes = config.permisosPlan?.max_sedes || 1;
  const porcentajeSedes = Math.min((sedesUsadas / maxSedes) * 100, 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">

      {/* Card del Plan Actual */}
      <div className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden flex flex-col justify-between ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl rounded-full" style={{ backgroundColor: colorPrimario }}></div>

        <div className="relative z-10">
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isDark ? 'bg-[#222] border-[#333] text-white' : 'bg-gray-100 border-gray-200 text-gray-800'}`}>
            Plan Actual Activo
          </span>
          <h3 className={`text-4xl font-black mt-4 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{planActual}</h3>
          <p className={`text-sm font-medium ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Facturación mensual de suscripción.</p>

          <div className="mt-8 space-y-4">
            {[
              'Facturación electrónica ilimitada',
              'Soporte Técnico y Actualizaciones',
              'Reportes estadísticos básicos',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <i className="fi fi-rr-check-circle" style={{ color: colorPrimario }}></i>
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          className="w-full mt-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest text-white shadow-lg transition-transform hover:brightness-110 active:scale-95"
          style={{ backgroundColor: colorPrimario, boxShadow: `0 8px 20px ${colorPrimario}40` }}
        >
          Mejorar Mi Plan (Upgrade)
        </button>
      </div>

      {/* Consumo y Límites */}
      <div className={`p-8 rounded-3xl border shadow-sm ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-black mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Uso de la Cuenta</h3>

        {/* Sedes */}
        <div className={`p-5 rounded-2xl border mb-6 ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Locales / Sedes Creadas</p>
              <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {sedesUsadas} <span className="text-lg text-neutral-500 font-bold">/ {maxSedes}</span>
              </p>
            </div>
            <i className="fi fi-rr-shop text-2xl opacity-50"></i>
          </div>

          <div className={`w-full h-2.5 rounded-full overflow-hidden mt-3 ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${porcentajeSedes}%`, backgroundColor: porcentajeSedes >= 100 ? '#ef4444' : colorPrimario }}
            ></div>
          </div>
          {porcentajeSedes >= 100 && (
            <p className="text-[10px] font-bold text-red-500 mt-2 uppercase tracking-widest">Has alcanzado el límite de sedes de tu plan.</p>
          )}
        </div>

        {/* Almacenamiento */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Almacenamiento de Recetas</p>
          <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Ilimitado <span className="text-sm font-bold text-green-500 ml-2">✓</span>
          </p>
        </div>
      </div>

    </div>
  );
}