import React from 'react';
import { Settings, ShieldCheck, Clock, MessageSquare, ExternalLink, Flame } from 'lucide-react';

export default function Bot_Operaciones({ 
  operaciones, 
  setOperaciones, 
  manejarGuardarOperaciones, 
  loadingAction,
  isDark, 
  colorPrimario 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
      
      {/* 🛠️ COLUMNA 1: OPERACIONES BÁSICAS */}
      <div className={`rounded-[2rem] p-6 border ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl" style={{ backgroundColor: colorPrimario + '20', color: colorPrimario }}>
            <Settings size={24} />
          </div>
          <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Operaciones Básicas</h3>
        </div>

        <div className="space-y-6">
          
          {/* ℹ️ INFO: Horario de Atención (Solo lectura) */}
          <div className={`p-5 rounded-2xl border flex gap-4 items-start ${isDark ? 'bg-[#161616] border-[#333]' : 'bg-blue-50 border-blue-100'}`}>
            <Clock size={20} className={isDark ? 'text-neutral-400 mt-0.5' : 'text-blue-500 mt-0.5'} shrink-0="true" />
            <div>
              <h4 className={`font-bold text-sm mb-1 ${isDark ? 'text-white' : 'text-blue-900'}`}>Horario de Atención Sincronizado</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-blue-700'}`}>
                El bot ahora respeta automáticamente los días y horas de apertura que configuraste en tu local físico. 
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neutral-500">
                <ExternalLink size={12} />
                <span>Edítalo en: Gestión de Sedes {'>'} Información General</span>
              </div>
            </div>
          </div>

          {/* Aprobación de Pedidos */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-[#161616] border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className={isDark ? 'text-neutral-400' : 'text-gray-500'} />
                <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ingreso Automático</h4>
              </div>
              <p className="text-xs text-neutral-500">¿Los pedidos del bot pasan a cocina sin revisión humana?</p>
            </div>
            {/* Toggle Switch */}
            <button 
              onClick={() => setOperaciones({...operaciones, ingresoAutomatico: !operaciones.ingresoAutomatico})} 
              className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${operaciones.ingresoAutomatico ? 'bg-green-500' : 'bg-neutral-500'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${operaciones.ingresoAutomatico ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
            {/* 🔥 Modo Cocina Colapsada (Límite de Pedidos) */}
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#161616] border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} className="text-orange-500" />
              <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Límite de Cocina (Anti-Colapso)</h4>
            </div>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              Define cuántos pedidos <strong className={isDark ? 'text-neutral-300' : 'text-gray-700'}>"En Preparación"</strong> aguanta la sede. Si se supera este número, el bot avisará a los nuevos clientes sobre posibles demoras antes de cobrarles.
            </p>
            <div className="flex items-center gap-4">
              <input 
                type="number" 
                min="1"
                value={operaciones.maxPedidos || 20} 
                onChange={(e) => setOperaciones({...operaciones, maxPedidos: parseInt(e.target.value) || 0})} 
                className={`w-24 px-4 py-2.5 rounded-xl outline-none font-mono text-center font-black text-sm border focus:border-orange-500 transition-colors ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
              />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                Pedidos simultáneos máximos
              </span>
            </div>
          </div>
          {/* 🌟 MÓDULO: SISTEMA DE PUNTOS */}
            <div className={`rounded-[2rem] p-6 border ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-yellow-500/20 text-yellow-500">
                    {/* Usa el icono Star de lucide-react si lo tienes */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    </div>
                    <div>
                    <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Mención de Puntos</h3>
                    <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>¿El bot avisa sobre el saldo de puntos?</p>
                    </div>
                </div>
                <button 
                    onClick={() => setOperaciones({...operaciones, puntosActivos: !operaciones.puntosActivos})} 
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${operaciones.puntosActivos ? 'bg-yellow-500' : 'bg-neutral-500'}`}
                >
                    <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${operaciones.puntosActivos ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
                </div>
            </div>
          {/* Botón de Guardar */}
          <button 
            onClick={manejarGuardarOperaciones}
            disabled={loadingAction === 'guardar_operaciones'}
            className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all text-white shadow-lg active:scale-95 mt-4 disabled:opacity-50"
            style={{ backgroundColor: colorPrimario }}
          >
            {loadingAction === 'guardar_operaciones' ? 'Guardando...' : 'Guardar Operaciones'}
          </button>
        </div>
      </div>

      {/* 🎨 COLUMNA 2: PERSONALIZACIÓN DEL BOT */}
      <div className={`rounded-[2rem] p-6 border flex flex-col items-center justify-center text-center ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
        <MessageSquare size={48} className={isDark ? 'text-[#333]' : 'text-gray-200'} strokeWidth={1} />
        <h3 className={`text-xl font-black mt-4 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Personalización</h3>
        <p className={`text-sm max-w-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
          Próximamente: Aquí podrás configurar el tono del bot (formal o amigable), agregar respuestas automáticas (FAQs) y detalles de personalidad.
        </p>
      </div>

    </div>
  );
}