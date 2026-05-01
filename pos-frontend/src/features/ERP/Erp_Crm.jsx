import React, { useState } from 'react';
import { Percent, BadgeDollarSign, ShoppingBag, X } from 'lucide-react';
import Crm_CombosPromociones from './CRM/Crm_CombosPomociones';
export default function Erp_Crm({ config, sedesReales = [], productosReales = [], categoriasReales = [] }) {
  const isDark = config.temaFondo === 'dark';
  const colorPrimario = config.colorPrimario || '#ff5a1f';

  // Control de pestañas dentro del CRM
  const [tabActiva, setTabActiva] = useState('clientes');
  
  // Selector de Sede para configurar la promo
  const [sedeActivaId, setSedeActivaId] = useState(sedesReales[0]?.id || '');

  // Estado para el Motor Cumpleañero (Cargado de la sede activa)
  const sedeActual = sedesReales.find(s => String(s.id) === String(sedeActivaId)) || {};
  const [promoCumple, setPromoCumple] = useState({
    activo: sedeActual.bot_cumple_activo || false,
    tipo: sedeActual.bot_cumple_tipo || 'porcentaje',
    valor: sedeActual.bot_cumple_valor || '',
    minimo: sedeActual.bot_cumple_minimo || '',
    productos: sedeActual.bot_cumple_productos || []
  });

  // Funciones del armador de combos (Recicladas de tu Bot_Fidelizacion)
  const manejarAgregarProducto = (e) => {
    const prodId = e.target.value;
    if (!prodId || promoCumple.productos.includes(prodId)) return;
    setPromoCumple({ ...promoCumple, productos: [...promoCumple.productos, prodId] });
    e.target.value = '';
  };
  const manejarQuitarProducto = (prodId) => {
    setPromoCumple({ ...promoCumple, productos: promoCumple.productos.filter(id => id !== prodId) });
  };

  const nombresProductosCombo = promoCumple.productos
    .map(id => productosReales.find(p => String(p.id) === String(id))?.nombre)
    .filter(Boolean).join(" + ");

  const guardarPromocionCumple = async () => {
    // Aquí conectarías con tu API (ej: api.patch(`/sedes/${sedeActivaId}/`, { ...promoCumple }))
    alert("¡Promoción de Cumpleaños Guardada Exitosamente!");
  };

  return (
    <div className="animate-fadeIn space-y-6 flex flex-col w-full min-w-0 pb-20">
      
      {/* 🧭 NAVEGACIÓN DEL CRM */}
      <div className={`flex gap-8 border-b overflow-x-auto custom-scrollbar ${isDark ? 'border-[#222]' : 'border-gray-200'}`}>
        {[
          { id: 'clientes', label: 'Base de Datos (CRM)' },
          { id: 'cumpleanos', label: 'Motor de Cumpleaños' },
          { id: 'promociones', label: 'Combos y Promociones' },
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setTabActiva(tab.id)}
            className="pb-4 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap"
            style={tabActiva === tab.id 
              ? { color: colorPrimario, borderBottomColor: colorPrimario } 
              : { color: isDark ? '#737373' : '#9ca3af', borderColor: 'transparent' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================== */}
      {/* 👥 PESTAÑA 1: BASE DE DATOS (Tu código original) */}
      {/* ========================================== */}
      {tabActiva === 'clientes' && (
        <>
          <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center text-center md:text-left shadow-xl w-full gap-4">
            <div className="w-full min-w-0">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-1">Generador de Campañas</h3>
              <p className="text-green-100 text-sm">
                Tienes <strong className="text-white">342</strong> clientes. Lanza una promoción por WhatsApp.
              </p>
            </div>
            <button className="w-full md:w-auto bg-white text-green-600 px-6 py-3 rounded-xl font-black shadow-lg shrink-0 flex items-center justify-center gap-2 hover:bg-green-50 transition-colors">
              <span className="text-xl">📱</span> ENVIAR PROMO
            </button>
          </div>

          <div className={`rounded-3xl flex flex-col w-full min-w-0 relative overflow-hidden border ${isDark ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className={`p-4 border-b flex flex-col sm:flex-row justify-between gap-3 ${isDark ? 'border-[#222]' : 'border-gray-200'}`}>
              <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Directorio</h4>
              <input type="text" placeholder="Buscar por número..." className={`w-full sm:w-64 px-4 py-2 rounded-lg outline-none focus:ring-2 text-sm ${isDark ? 'bg-[#1a1a1a] border-[#333] text-white focus:ring-[#ff5a1f]' : 'bg-gray-100 border-gray-300 text-gray-800 focus:ring-[#ff5a1f]'}`} />
            </div>
            
            <div className="w-full overflow-x-auto min-w-0">
              <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                <thead className={`text-[10px] uppercase tracking-widest ${isDark ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-gray-100 text-gray-500'}`}>
                  <tr>
                    <th className="px-5 py-4 font-black">Cliente</th>
                    <th className="px-5 py-4 font-black">WhatsApp</th>
                    <th className="px-5 py-4 font-black text-center">Visitas</th>
                    <th className="px-5 py-4 font-black">Última Visita</th>
                    <th className="px-5 py-4 font-black text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'text-neutral-300 divide-[#222]' : 'text-gray-700 divide-gray-200'}`}>
                  {[
                    { n: 'Carlos Gutiérrez', w: '987 654 321', v: 12, u: 'Hace 2 días' },
                    { n: 'Ana Mendoza', w: '912 345 678', v: 3, u: 'Hace 45 días' },
                  ].map((c, i) => (
                    <tr key={i} className={`transition-colors ${isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-50'}`}>
                      <td className="px-5 py-4 font-bold flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isDark ? 'bg-[#222] text-[#ff5a1f]' : 'bg-gray-200 text-gray-700'}`}>{c.n.charAt(0)}</div>
                        <span className={isDark ? 'text-white' : 'text-gray-800'}>{c.n}</span>
                      </td>
                      <td className="px-5 py-4 font-mono">{c.w}</td>
                      <td className="px-5 py-4 font-bold text-green-500 text-center">{c.v}</td>
                      <td className="px-5 py-4 text-xs"><span className={c.u.includes('45') ? 'text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded' : ''}>{c.u}</span></td>
                      <td className="px-5 py-4 text-center"><button className="px-4 py-2 rounded-lg font-bold text-xs transition-colors bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white">Chat</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================== */}
      {/* 🎂 PESTAÑA 2: MOTOR CUMPLEAÑERO GLOBAL */}
      {/* ========================================== */}
      {tabActiva === 'cumpleanos' && (
        <div className="max-w-4xl mx-auto w-full">
          {/* Selector de Sede */}
          <div className="flex items-center gap-3 mb-6 justify-end">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Configurando sede:</span>
            <select
              value={sedeActivaId} onChange={(e) => setSedeActivaId(e.target.value)}
              className={`border px-4 py-2 rounded-xl outline-none font-bold text-sm cursor-pointer ${isDark ? 'bg-[#111] text-white border-[#333]' : 'bg-white text-gray-900 border-gray-200'}`}
            >
              {sedesReales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          {/* Tarjeta del Motor */}
          <div className={`rounded-[2rem] p-6 md:p-8 border ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-dashed" style={{ borderColor: isDark ? '#333' : '#e5e7eb' }}>
              <div>
                <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Regla de Cumpleaños</h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Aplica en Salón (Validación DNI) y en el Bot de WhatsApp.</p>
              </div>
              <button 
                onClick={() => setPromoCumple({...promoCumple, activo: !promoCumple.activo})} 
                className={`w-14 h-7 rounded-full transition-colors relative flex items-center shrink-0 ${promoCumple.activo ? 'bg-pink-500' : 'bg-neutral-500'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full absolute transition-transform ${promoCumple.activo ? 'translate-x-8' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className={`space-y-6 transition-all duration-300 ${!promoCumple.activo ? 'opacity-50 pointer-events-none blur-[1px]' : ''}`}>
              {/* Tipo de Beneficio */}
              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3">Tipo de Beneficio</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'porcentaje', icon: Percent, label: 'Dscto %' },
                    { id: 'fijo', icon: BadgeDollarSign, label: 'Monto Fijo' },
                    { id: 'combo', icon: ShoppingBag, label: 'Armar Combo' }
                  ].map(tipo => {
                    const Icon = tipo.icon;
                    const isSelected = promoCumple.tipo === tipo.id;
                    return (
                      <button key={tipo.id} onClick={() => setPromoCumple({...promoCumple, tipo: tipo.id})}
                        className={`py-3 px-2 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                          isSelected ? 'border-pink-500 bg-pink-500/10 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.2)]' : isDark ? 'border-[#333] text-neutral-400 hover:bg-[#222]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <Icon size={20} strokeWidth={isSelected ? 2.5 : 1.5} />
                        <span className="text-xs font-bold">{tipo.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Valores y Combos */}
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex-1">
                  {promoCumple.tipo === 'combo' ? (
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Selecciona Productos</label>
                      <select onChange={manejarAgregarProducto} className={`w-full px-4 py-3 rounded-xl outline-none text-sm border focus:border-pink-500 font-bold ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                        <option value="">+ Añadir a la promoción...</option>
                        {productosReales.map(p => <option key={p.id} value={p.id}>{p.nombre} (S/ {p.precio_base})</option>)}
                      </select>
                      {promoCumple.productos.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {promoCumple.productos.map(id => {
                            const prod = productosReales.find(p => String(p.id) === String(id));
                            return (
                              <div key={id} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border ${isDark ? 'bg-[#1a1a1a] border-[#333] text-neutral-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                                {prod?.nombre || 'Producto'}
                                <button onClick={() => manejarQuitarProducto(id)} className="text-red-500 hover:text-red-400 mt-0.5"><X size={14} strokeWidth={3} /></button>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3">Valor a descontar</label>
                      <input type="number" placeholder={promoCumple.tipo === 'porcentaje' ? 'Ej: 50%' : 'Ej: S/ 20'} value={promoCumple.valor || ''} onChange={(e) => setPromoCumple({...promoCumple, valor: e.target.value})}
                        className={`w-full px-4 py-3 rounded-xl outline-none text-sm border focus:border-pink-500 font-bold ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                    </div>
                  )}
                </div>
                <div className="w-full sm:w-1/3 shrink-0">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3">Min. Compra</label>
                  <input type="number" placeholder="Ej: 50.00" value={promoCumple.minimo || ''} onChange={(e) => setPromoCumple({...promoCumple, minimo: e.target.value})}
                    className={`w-full px-4 py-3 rounded-xl outline-none text-sm border focus:border-pink-500 font-bold sm:text-center ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                </div>
              </div>

              {/* Resumen */}
              <div className={`p-4 rounded-xl text-sm flex gap-3 border leading-relaxed ${isDark ? 'bg-pink-500/5 border-pink-500/10 text-pink-400' : 'bg-pink-50 border-pink-100 text-pink-700'}`}>
                <span className="shrink-0 mt-0.5">💬</span> 
                <p><strong>Lo que verá el cliente:</strong> "¡Feliz cumpleaños! Hoy te regalamos <strong>{promoCumple.tipo === 'porcentaje' ? `${promoCumple.valor || 0}% de descuento` : promoCumple.tipo === 'fijo' ? `S/ ${promoCumple.valor || 0} de descuento` : (nombresProductosCombo || 'tu combo especial')}</strong> en tu pedido igual o mayor a S/ {promoCumple.minimo || 0}."</p>
              </div>

              <button onClick={guardarPromocionCumple} className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all text-white shadow-lg active:scale-95 mt-4" style={{ backgroundColor: colorPrimario }}>
                Guardar Reglas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🚀 PESTAÑA 3: MOTOR DE PROMOCIONES GLOBAL */}
      {/* ========================================== */}
      {tabActiva === 'promociones' && (
        <div className="max-w-4xl mx-auto w-full">
          <Crm_CombosPromociones 
            config={config} 
            productosReales={productosReales} 
            categoriasReales={categoriasReales}
          />
        </div>
      )}

    </div>
  );
}