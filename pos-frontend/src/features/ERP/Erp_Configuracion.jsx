import React, { useState } from 'react';
import Tab_Perfil   from './Erp_TabPerfil';
import Tab_Plan     from './Erp_TabPlan';
import Tab_Modulos  from './Erp_TabModulos';

const TABS = [
  { id: 'perfil',   label: 'Perfil y Cobros',      icon: 'fi-rr-id-badge'      },
  { id: 'plan',     label: 'Plan SaaS y Límites',   icon: 'fi-rr-rocket-lunch'  },
  { id: 'modulos',  label: 'Módulos y Apariencia',  icon: 'fi-rr-apps'          },
];

export default function Erp_Configuracion({ config, setConfig, manejarGuardarConfig, guardandoConfig }) {
  const isDark        = config.temaFondo === 'dark';
  const colorPrimario = config.colorPrimario || '#ff5a1f';

  const [tabActiva, setTabActiva] = useState('perfil');

  const tabProps = { config, setConfig, isDark, colorPrimario };

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
        {TABS.map(tab => (
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

      {/* ========== CONTENIDO DE PESTAÑAS ========== */}
      {tabActiva === 'perfil'  && <Tab_Perfil  {...tabProps} />}
      {tabActiva === 'plan'    && <Tab_Plan    {...tabProps} />}
      {tabActiva === 'modulos' && <Tab_Modulos {...tabProps} />}

      {/* ========== BOTÓN GUARDAR FLOTANTE ========== */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={manejarGuardarConfig}
          disabled={guardandoConfig}
          style={{ backgroundColor: colorPrimario, boxShadow: `0 10px 25px ${colorPrimario}66` }}
          className="text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center gap-3"
        >
          {guardandoConfig
            ? <i className="fi fi-rr-spinner animate-spin"></i>
            : <i className="fi fi-rr-disk"></i>
          }
          {guardandoConfig ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}
        </button>
      </div>

    </div>
  );
}