import React, { useState } from 'react';
import { Percent, BadgeDollarSign, ShoppingBag, X } from 'lucide-react';
import Crm_CombosPromociones from './CRM/Crm_CombosPomociones';
import Crm_Cumpleanos from './CRM/Crm_Cumpleaños'; // Ajusta la ruta si es necesario
import api from '../../api/api'; // Asegúrate de tener tu instancia de Axios configurada
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
    try {
      // Reemplaza 'api' por el nombre de tu cliente axios si es distinto
      await api.patch(`/api/sedes/${sedeActivaId}/`, {
        bot_cumple_activo: promoCumple.activo,
        bot_cumple_tipo: promoCumple.tipo,
        bot_cumple_valor: promoCumple.valor || null,
        bot_cumple_minimo: promoCumple.minimo || null,
        bot_cumple_productos: promoCumple.productos // Tu backend ya acepta IDs en array gracias al M2M
      });
      
      alert("¡Reglas de cumpleaños guardadas con éxito! 🎂");
      
    } catch (error) {
      console.error("Error al guardar cumpleaños:", error);
      alert("Ups, hubo un error al guardar las reglas.");
    }
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
        <Crm_Cumpleanos 
          isDark={isDark}
          colorPrimario={colorPrimario}
          sedeActivaId={sedeActivaId}
          setSedeActivaId={setSedeActivaId}
          sedesReales={sedesReales}
          productosReales={productosReales}
          promoCumple={promoCumple}
          setPromoCumple={setPromoCumple}
          guardarPromocionCumple={guardarPromocionCumple}
        />
      )}
      {/* ========================================== */}
      {/* 🚀 PESTAÑA 3: MOTOR DE PROMOCIONES GLOBAL */}
      {/* ========================================== */}
      {tabActiva === 'promociones' && (
        <div className="w-full">
          <Crm_CombosPromociones 
            config={config} 
            productosReales={productosReales} 
            categoriasReales={categoriasReales}
            sedesReales={sedesReales} 
          />
        </div>
      )}

    </div>
  );
}