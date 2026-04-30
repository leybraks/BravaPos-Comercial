import React from 'react';

export default function Tab_Modulos({ config, setConfig, isDark, colorPrimario }) {
  const modulosSistemas = [
    // Módulos base (siempre visibles)
    { key: 'modSalon',      title: 'Gestión de Salón',         desc: 'Mapa interactivo de mesas y cuentas.',       badge: null,         show: true },
    { key: 'modClientes',   title: 'Directorio (CRM)',          desc: 'Guarda clientes para fidelización.',         badge: null,         show: true },
    { key: 'modFacturacion',title: 'Facturación Electrónica',   desc: 'Emite comprobantes válidos.',                badge: null,         show: true },
    // Módulos condicionales (dependen de config.permisosPlan)
    { key: 'modCocina',     title: 'Pantalla KDS',              desc: 'Despacho en tiempo real para cocineros.',    badge: 'PRO',        show: config.permisosPlan?.modulo_kds },
    { key: 'modDelivery',   title: 'Módulo Delivery',           desc: 'Gestión de despachos externos.',             badge: 'PRO',        show: config.permisosPlan?.modulo_delivery },
    { key: 'modInventario', title: 'Control de Inventario',     desc: 'Descuenta insumos y alertas de stock.',      badge: 'PRO',        show: config.permisosPlan?.modulo_inventario },
    { key: 'modCartaQr',    title: 'Menú Digital QR',           desc: 'Carta digital escaneable en mesas.',         badge: 'PREMIUM',    badgeColor: 'text-blue-500 bg-blue-500/20 border-blue-500/30',   show: config.permisosPlan?.modulo_carta_qr },
    { key: 'modBotWsp',     title: 'Bot WhatsApp',              desc: 'Recibe pedidos automáticamente.',            badge: 'BETA',       badgeColor: 'text-green-500 bg-green-500/20 border-green-500/30', show: config.permisosPlan?.modulo_bot_wsp },
    { key: 'modMl',         title: 'Predicciones IA',           desc: 'Anticípate a la demanda de ventas.',         badge: 'ENTERPRISE', badgeColor: 'text-purple-500 bg-purple-500/20 border-purple-500/30', show: config.permisosPlan?.modulo_ml },
  ].filter(mod => mod.show);

  return (
    <div className="space-y-6 animate-fadeIn">

      {/* Apariencia */}
      <div className={`p-8 rounded-3xl border shadow-sm ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-black mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Personalización del Sistema</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tema */}
          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Tema Base</label>
            <div className="flex gap-4">
              <button
                onClick={() => setConfig({ ...config, temaFondo: 'dark' })}
                className={`flex-1 py-4 rounded-xl border-2 font-black transition-all text-xs flex items-center justify-center gap-2 ${config.temaFondo === 'dark' ? 'bg-[#1a1a1a] text-white' : 'border-gray-200 text-gray-500'}`}
                style={config.temaFondo === 'dark' ? { borderColor: colorPrimario } : {}}
              >
                🌙 Oscuro
              </button>
              <button
                onClick={() => setConfig({ ...config, temaFondo: 'light' })}
                className={`flex-1 py-4 rounded-xl border-2 font-black transition-all text-xs flex items-center justify-center gap-2 ${config.temaFondo === 'light' ? 'bg-white text-black shadow-sm' : isDark ? 'border-[#333] text-neutral-500' : 'border-gray-200 text-gray-500'}`}
                style={config.temaFondo === 'light' ? { borderColor: colorPrimario } : {}}
              >
                ☀️ Claro
              </button>
            </div>
          </div>

          {/* Color principal */}
          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Color Principal (Acentos)</label>
            <div className="flex flex-wrap gap-3">
              {['#ff5a1f', '#3b82f6', '#10b981', '#eab308', '#8b5cf6', '#ec4899'].map(hex => (
                <button
                  key={hex}
                  onClick={() => setConfig({ ...config, colorPrimario: hex })}
                  className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center shadow-sm ${config.colorPrimario === hex ? 'scale-110 border-white' : 'border-transparent opacity-80 hover:opacity-100'}`}
                  style={{ backgroundColor: hex }}
                >
                  {config.colorPrimario === hex && <i className="fi fi-rr-check text-white text-xs drop-shadow-md"></i>}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Módulos Activos */}
      <div className={`p-8 rounded-3xl border shadow-sm ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
        <h3 className={`text-lg font-black mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Motores y Módulos</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modulosSistemas.map(mod => {
            const isActive = config[mod.key];
            return (
              <div key={mod.key} className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{mod.title}</h4>
                    {mod.badge && (
                      <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest border ${mod.badgeColor || 'bg-purple-500/20 text-purple-500 border-transparent'}`}>
                        {mod.badge}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{mod.desc}</p>
                </div>

                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={isActive || false}
                    onChange={() => setConfig({ ...config, [mod.key]: !isActive })}
                  />
                  <div
                    className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isDark ? 'bg-[#333]' : 'bg-gray-300'}`}
                    style={isActive ? { backgroundColor: colorPrimario } : {}}
                  ></div>
                </label>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}