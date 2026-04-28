import React, { useState } from 'react';

export default function Erp_Configuracion({ config, setConfig, manejarGuardarConfig, guardandoConfig }) {
  const isDark = config.temaFondo === 'dark';
  const colorPrimario = config.colorPrimario || '#ff5a1f';

  // Navegación interna
  const [tabActiva, setTabActiva] = useState('perfil');

  // Datos dinámicos del plan (vienen del backend a través de config)
  const planActual = config.permisosPlan?.nombre || "Plan Base";
  const sedesUsadas = config.sedesActuales || 0;
  const maxSedes = config.permisosPlan?.max_sedes || 1;
  const porcentajeSedes = Math.min((sedesUsadas / maxSedes) * 100, 100);

  // Mapeo dinámico de módulos disponibles según los permisos del plan
  const modulosSistemas = [
    // Módulos base (Siempre visibles)
    { key: 'modSalon', title: 'Gestión de Salón', desc: 'Mapa interactivo de mesas y cuentas.', badge: null, show: true },
    { key: 'modClientes', title: 'Directorio (CRM)', desc: 'Guarda clientes para fidelización.', badge: null, show: true },
    { key: 'modFacturacion', title: 'Facturación Electrónica', desc: 'Emite comprobantes válidos.', badge: null, show: true },
    // Módulos condicionales (Dependen de config.permisosPlan)
    { key: 'modCocina', title: 'Pantalla KDS', desc: 'Despacho en tiempo real para cocineros.', badge: 'PRO', show: config.permisosPlan?.modulo_kds },
    { key: 'modDelivery', title: 'Módulo Delivery', desc: 'Gestión de despachos externos.', badge: 'PRO', show: config.permisosPlan?.modulo_delivery },
    { key: 'modInventario', title: 'Control de Inventario', desc: 'Descuenta insumos y alertas de stock.', badge: 'PRO', show: config.permisosPlan?.modulo_inventario },
    { key: 'modCartaQr', title: 'Menú Digital QR', desc: 'Carta digital escaneable en mesas.', badge: 'PREMIUM', badgeColor: 'text-blue-500 bg-blue-500/20 border-blue-500/30', show: config.permisosPlan?.modulo_carta_qr },
    { key: 'modBotWsp', title: 'Bot WhatsApp', desc: 'Recibe pedidos automáticamente.', badge: 'BETA', badgeColor: 'text-green-500 bg-green-500/20 border-green-500/30', show: config.permisosPlan?.modulo_bot_wsp },
    { key: 'modMl', title: 'Predicciones IA', desc: 'Anticípate a la demanda de ventas.', badge: 'ENTERPRISE', badgeColor: 'text-purple-500 bg-purple-500/20 border-purple-500/30', show: config.permisosPlan?.modulo_ml },
  ].filter(mod => mod.show); // Filtramos para renderizar solo los permitidos

  return (
    <div className="animate-fadeIn max-w-6xl mx-auto space-y-6 pb-24">
      
      {/* ========== 🏢 CABECERA DEL MÓDULO ========== */}
      <div className={`p-6 md:p-8 rounded-3xl border flex items-center gap-5 shadow-sm transition-colors ${
        isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'
      }`}>
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
          style={{ backgroundColor: colorPrimario + '15', color: colorPrimario }}
        >
          <i className="fi fi-rr-briefcase mt-1"></i>
        </div>
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Mi Negocio y <span style={{ color: colorPrimario }}>Suscripción</span>
          </h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
            Administra la identidad de tu marca, tu plan de facturación y módulos activos.
          </p>
        </div>
      </div>

      {/* ========== 🔘 NAVEGACIÓN DE PESTAÑAS ========== */}
      <div className={`flex gap-8 border-b overflow-x-auto custom-scrollbar ${isDark ? 'border-[#222]' : 'border-gray-200'}`}>
        {[
          { id: 'perfil', label: 'Perfil y Cobros', icon: 'fi-rr-id-badge' },
          { id: 'plan', label: 'Plan SaaS y Límites', icon: 'fi-rr-rocket-lunch' },
          { id: 'modulos', label: 'Módulos y Apariencia', icon: 'fi-rr-apps' },
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className="pb-4 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap"
            style={
              tabActiva === tab.id 
              ? { color: colorPrimario, borderBottomColor: colorPrimario } 
              : { color: isDark ? '#737373' : '#9ca3af', borderColor: 'transparent' }
            }
          >
            <i className={`fi ${tab.icon} mt-0.5`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================== */}
      {/* 🏢 PESTAÑA 1: PERFIL Y COBROS */}
      {/* ========================================== */}
      {tabActiva === 'perfil' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Identidad de la Marca */}
          <div className={`lg:col-span-2 p-8 rounded-3xl border shadow-sm ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-black mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Identidad Legal Comercial</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Razón Social / Propietario</label>
                <input 
                  type="text" value={config.razonSocial || ''} onChange={(e) => setConfig({...config, razonSocial: e.target.value})}
                  className="w-full border px-4 py-3 rounded-xl outline-none font-medium text-sm transition-colors focus:border-current"
                  style={{ background: isDark ? '#1a1a1a' : '#f9fafb', borderColor: isDark ? '#333' : '#e5e7eb', color: isDark ? '#fff' : '#000', '--tw-ring-color': colorPrimario }}
                  placeholder="Ej. Inversiones Brava S.A.C."
                />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>RUC / NIT / DNI</label>
                <input 
                  type="text" value={config.ruc || ''} onChange={(e) => setConfig({...config, ruc: e.target.value})}
                  className="w-full border px-4 py-3 rounded-xl outline-none font-medium text-sm transition-colors focus:border-current"
                  style={{ background: isDark ? '#1a1a1a' : '#f9fafb', borderColor: isDark ? '#333' : '#e5e7eb', color: isDark ? '#fff' : '#000', '--tw-ring-color': colorPrimario }}
                  placeholder="20123456789"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Logo del Restaurante</label>
              <div className={`border-2 border-dashed rounded-2xl p-6 flex items-center gap-6 ${isDark ? 'border-[#333] bg-[#1a1a1a]' : 'border-gray-300 bg-gray-50'}`}>
                <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center text-2xl overflow-hidden shrink-0 ${isDark ? 'border-[#444] bg-[#222]' : 'border-gray-200 bg-white'}`}>
                  {config.logoPreview ? <img src={config.logoPreview} className="w-full h-full object-cover" alt="Logo" /> : '🍔'}
                </div>
                <div>
                  <label className="px-4 py-2 rounded-xl text-xs font-bold border transition-all mb-2 cursor-pointer inline-block" style={{ backgroundColor: isDark ? '#222' : '#fff', borderColor: isDark ? '#444' : '#d1d5db', color: isDark ? '#fff' : '#000' }}>
                    Subir nuevo logo
                    <input 
                      type="file" accept="image/*" className="hidden" 
                      onChange={(e) => {
                        if(e.target.files[0]) {
                          setConfig({...config, logoFile: e.target.files[0], logoPreview: URL.createObjectURL(e.target.files[0])});
                        }
                      }}
                    />
                  </label>
                  <p className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Formatos: JPG, PNG. Max 2MB.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Billeteras Digitales (Yape/Plin) */}
          <div className={`p-8 rounded-3xl border shadow-sm flex flex-col ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-500 flex items-center justify-center"><i className="fi fi-rr-mobile-button"></i></div>
              <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Billeteras Digitales</h3>
            </div>
            
            <div className="space-y-4 flex-1">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Número Asociado</label>
                <input 
                  type="text" value={config.numeroYape || ''} onChange={(e) => setConfig({...config, numeroYape: e.target.value})}
                  className="w-full border px-4 py-3 rounded-xl outline-none font-bold text-sm transition-colors focus:border-current"
                  style={{ background: isDark ? '#1a1a1a' : '#f9fafb', borderColor: isDark ? '#333' : '#e5e7eb', color: isDark ? '#fff' : '#000', '--tw-ring-color': colorPrimario }}
                  placeholder="+51 987 654 321"
                />
              </div>

              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Código QR de Cobro</label>
                <label className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative overflow-hidden h-32 ${isDark ? 'border-[#333] hover:border-[#ff5a1f] bg-[#1a1a1a]' : 'border-gray-300 hover:border-[#ff5a1f] bg-gray-50'}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    if(e.target.files[0]) setConfig({...config, qrFile: e.target.files[0], qrPreview: URL.createObjectURL(e.target.files[0])});
                  }}/>
                  {config.qrPreview ? (
                    <img src={config.qrPreview} alt="QR" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <>
                      <i className="fi fi-rr-qrcode text-2xl mb-1 opacity-50"></i>
                      <p className={`font-bold text-xs ${isDark ? 'text-white' : 'text-gray-800'}`}>Subir QR</p>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🚀 PESTAÑA 2: PLAN SAAS Y LÍMITES */}
      {/* ========================================== */}
      {tabActiva === 'plan' && (
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
                <div className="flex items-center gap-3">
                  <i className="fi fi-rr-check-circle" style={{ color: colorPrimario }}></i>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>Facturación electrónica ilimitada</span>
                </div>
                <div className="flex items-center gap-3">
                  <i className="fi fi-rr-check-circle" style={{ color: colorPrimario }}></i>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>Soporte Técnico y Actualizaciones</span>
                </div>
                <div className="flex items-center gap-3">
                  <i className="fi fi-rr-check-circle" style={{ color: colorPrimario }}></i>
                  <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-700'}`}>Reportes estadísticos básicos</span>
                </div>
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
            
            <div className={`p-5 rounded-2xl border mb-6 ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between items-end mb-2">
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Locales / Sedes Creadas</p>
                  <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{sedesUsadas} <span className="text-lg text-neutral-500 font-bold">/ {maxSedes}</span></p>
                </div>
                <i className="fi fi-rr-shop text-2xl opacity-50"></i>
              </div>
              
              {/* Barra de progreso */}
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

            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Almacenamiento de Recetas</p>
              <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Ilimitado <span className="text-sm font-bold text-green-500 ml-2">✓</span></p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🎨 PESTAÑA 3: MÓDULOS Y APARIENCIA */}
      {/* ========================================== */}
      {tabActiva === 'modulos' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Apariencia */}
          <div className={`p-8 rounded-3xl border shadow-sm ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-black mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Personalización del Sistema</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Tema Base</label>
                <div className="flex gap-4">
                  <button onClick={() => setConfig({...config, temaFondo: 'dark'})} className={`flex-1 py-4 rounded-xl border-2 font-black transition-all text-xs flex items-center justify-center gap-2 ${config.temaFondo === 'dark' ? 'bg-[#1a1a1a] text-white' : 'border-gray-200 text-gray-500'}`} style={config.temaFondo === 'dark' ? { borderColor: colorPrimario } : {}}>
                    🌙 Oscuro
                  </button>
                  <button onClick={() => setConfig({...config, temaFondo: 'light'})} className={`flex-1 py-4 rounded-xl border-2 font-black transition-all text-xs flex items-center justify-center gap-2 ${config.temaFondo === 'light' ? 'bg-white text-black shadow-sm' : isDark ? 'border-[#333] text-neutral-500' : 'border-gray-200 text-gray-500'}`} style={config.temaFondo === 'light' ? { borderColor: colorPrimario } : {}}>
                    ☀️ Claro
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-3 block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Color Principal (Acentos)</label>
                <div className="flex flex-wrap gap-3">
                  {['#ff5a1f', '#3b82f6', '#10b981', '#eab308', '#8b5cf6', '#ec4899'].map(hex => (
                    <button
                      key={hex} onClick={() => setConfig({...config, colorPrimario: hex})}
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

          {/* Módulos Activos (Renderizados Dinámicamente) */}
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
                      <input type="checkbox" className="sr-only peer" checked={isActive || false} onChange={() => setConfig({...config, [mod.key]: !isActive})} />
                      <div className={`w-11 h-6 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all ${isDark ? 'bg-[#333]' : 'bg-gray-300'}`} style={isActive ? {backgroundColor: colorPrimario} : {}}></div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========== BOTÓN GUARDAR FLOTANTE ========== */}
      <div className="fixed bottom-8 right-8 z-40">
        <button 
          onClick={manejarGuardarConfig}
          disabled={guardandoConfig}
          style={{ backgroundColor: colorPrimario, boxShadow: `0 10px 25px ${colorPrimario}66` }}
          className="text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center gap-3"
        >
          {guardandoConfig ? <i className="fi fi-rr-spinner animate-spin"></i> : <i className="fi fi-rr-disk"></i>}
          {guardandoConfig ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}
        </button>
      </div>

    </div>
  );
}