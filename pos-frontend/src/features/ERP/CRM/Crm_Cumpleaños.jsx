import React from 'react';
import { Percent, BadgeDollarSign, ShoppingBag, X } from 'lucide-react';

export default function Crm_Cumpleanos({
  isDark,
  colorPrimario,
  sedeActivaId,
  setSedeActivaId,
  sedesReales,
  productosReales,
  promoCumple,
  setPromoCumple,
  guardarPromocionCumple
}) {

  // --- Manejadores Locales ---
  const manejarAgregarProducto = (e) => {
    const id = e.target.value;
    if (id && !promoCumple.productos.includes(id)) {
      setPromoCumple({ ...promoCumple, productos: [...promoCumple.productos, id] });
    }
    e.target.value = ''; // Resetear el select
  };

  const manejarQuitarProducto = (id) => {
    setPromoCumple({ ...promoCumple, productos: promoCumple.productos.filter(pId => pId !== id) });
  };

  // Helper para generar el texto de los productos del combo en el mensaje
  const nombresProductosCombo = promoCumple.productos
    .map(id => productosReales.find(p => String(p.id) === String(id))?.nombre)
    .filter(Boolean)
    .join(' + ');

  return (
    <div className="w-full animate-fadeIn">
      
      {/* Selector de Sede */}
      <div className="flex items-center gap-3 mb-6 justify-end">
        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
          Configurando sede:
        </span>
        <select
          value={sedeActivaId} 
          onChange={(e) => setSedeActivaId(e.target.value)}
          className={`border px-4 py-2 rounded-xl outline-none font-bold text-sm cursor-pointer ${isDark ? 'bg-[#111] text-white border-[#333]' : 'bg-white text-gray-900 border-gray-200'}`}
        >
          {sedesReales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>

      {/* Tarjeta del Motor */}
      <div className={`rounded-[2rem] p-6 md:p-8 border ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
        
        {/* Cabecera de la Tarjeta */}
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

        {/* Cuerpo del Formulario */}
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
                  <button 
                    key={tipo.id} 
                    onClick={() => setPromoCumple({...promoCumple, tipo: tipo.id})}
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
                  <input 
                    type="number" 
                    placeholder={promoCumple.tipo === 'porcentaje' ? 'Ej: 50%' : 'Ej: S/ 20'} 
                    value={promoCumple.valor || ''} 
                    onChange={(e) => setPromoCumple({...promoCumple, valor: e.target.value})}
                    className={`w-full px-4 py-3 rounded-xl outline-none text-sm border focus:border-pink-500 font-bold ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
                  />
                </div>
              )}
            </div>
            
            <div className="w-full sm:w-1/3 shrink-0">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3">Min. Compra</label>
              <input 
                type="number" 
                placeholder="Ej: 50.00" 
                value={promoCumple.minimo || ''} 
                onChange={(e) => setPromoCumple({...promoCumple, minimo: e.target.value})}
                className={`w-full px-4 py-3 rounded-xl outline-none text-sm border focus:border-pink-500 font-bold sm:text-center ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`} 
              />
            </div>
          </div>

          {/* Resumen Final */}
          <div className={`p-4 rounded-xl text-sm flex gap-3 border leading-relaxed ${isDark ? 'bg-pink-500/5 border-pink-500/10 text-pink-400' : 'bg-pink-50 border-pink-100 text-pink-700'}`}>
            <span className="shrink-0 mt-0.5">💬</span> 
            <p>
              <strong>Lo que verá el cliente:</strong> "¡Feliz cumpleaños! Hoy te regalamos <strong>
                {promoCumple.tipo === 'porcentaje' ? `${promoCumple.valor || 0}% de descuento` : 
                 promoCumple.tipo === 'fijo' ? `S/ ${promoCumple.valor || 0} de descuento` : 
                 (nombresProductosCombo || 'tu combo especial')}
              </strong> en tu pedido igual o mayor a S/ {promoCumple.minimo || 0}."
            </p>
          </div>

          {/* Botón Guardar */}
          <button 
            type="button"
            onClick={guardarPromocionCumple} 
            className="w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all text-white shadow-lg active:scale-95 mt-4" 
            style={{ backgroundColor: colorPrimario }}
          >
            Guardar Reglas
          </button>
        </div>
      </div>
    </div>
  );
}