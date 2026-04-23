import React, { useState, useEffect } from 'react';
import { getCatalogoGlobal, registrarIngresoMasivo } from '../../api/api';

export default function ModalIngresoMercaderia({ isOpen, onClose, sedes, onSuccess, config }) {
  const [catalogo, setCatalogo] = useState([]);
  const [insumoSeleccionado, setInsumoSeleccionado] = useState('');
  const [ingresoGlobal, setIngresoGlobal] = useState(''); 
  const [reparticion, setReparticion] = useState({}); 

  const colorBtn = config?.colorPrimario || '#ff5a1f';

  useEffect(() => {
    if (isOpen) {
      getCatalogoGlobal().then(res => setCatalogo(res.data));
      setReparticion({});
      setIngresoGlobal('');
      setInsumoSeleccionado('');
    }
  }, [isOpen]);

  const handleInputChange = (sedeId, valor) => {
    setReparticion({ ...reparticion, [sedeId]: parseFloat(valor) || 0 });
  };

  const item = catalogo.find(i => i.id.toString() === insumoSeleccionado.toString());
  const stockGlobalActual = item ? parseFloat(item.stock_general || 0) : 0;
  
  const totalRepartir = Object.values(reparticion).reduce((a, b) => a + b, 0);
  const nuevoStockGlobal = stockGlobalActual + (parseFloat(ingresoGlobal) || 0) - totalRepartir;

  const handleGuardar = async () => {
    if (!insumoSeleccionado) return alert("⚠️ Selecciona un insumo");
    if (nuevoStockGlobal < 0) return alert("⚠️ No puedes repartir más de lo que tienes en el Almacén Central");
    
    try {
      await registrarIngresoMasivo({
        insumo_base_id: insumoSeleccionado,
        ingreso_global: parseFloat(ingresoGlobal) || 0,
        distribucion: reparticion 
      });
      alert("✅ Operación logística completada.");
      onSuccess();
      onClose();
    } catch (err) {
      alert("Error al procesar la distribución.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 md:p-6 animate-fadeIn">
      <div className="bg-[#111] border border-[#222] w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-8 border-b border-[#222] flex justify-between items-center bg-[#161616] shrink-0">
          <div>
             <p className="text-[10px] text-[#ff5a1f] font-black uppercase tracking-widest mb-1">Logística Multi-Sede</p>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Distribución Masiva</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white text-4xl font-light transition-colors">×</button>
        </div>

        {/* CONTENIDO */}
        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
          
          {/* PASO 1 */}
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-[2rem] p-6 relative">
            <span className="absolute -top-3 left-6 bg-[#0a0a0a] px-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest border border-[#2a2a2a] rounded-full">
              Paso 1: Almacén Central
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">Seleccionar Insumo</label>
                <div className="relative">
                  <select 
                    value={insumoSeleccionado} onChange={(e) => setInsumoSeleccionado(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-[#333] px-5 py-4 rounded-2xl text-white font-bold focus:border-[#ff5a1f] outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Buscar en catálogo...</option>
                    {catalogo.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">▼</div>
                </div>
                {item && (
                  <p className="text-xs text-neutral-500 pl-2">
                    En Matriz: <strong className="text-white">{stockGlobalActual} {item.unidad_medida}</strong>
                  </p>
                )}
              </div>

              <div className={`space-y-2 transition-opacity ${item ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest block">Comprar Nuevo Stock</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" min="0" placeholder="0.00" value={ingresoGlobal} onChange={e => setIngresoGlobal(e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-[#333] px-5 py-4 rounded-2xl text-white font-mono text-xl focus:border-[#ff5a1f] outline-none text-right"
                  />
                  <span className="text-neutral-500 font-bold whitespace-nowrap">
                    {item?.unidad_medida || 'und'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PASO 2 */}
          <div className={`bg-[#161616] border border-[#2a2a2a] rounded-[2rem] p-6 relative transition-opacity ${item ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
             <span className="absolute -top-3 left-6 bg-[#0a0a0a] px-4 text-[10px] font-black text-neutral-400 uppercase tracking-widest border border-[#2a2a2a] rounded-full">
              Paso 2: Enviar a Locales
            </span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {sedes.map(sede => (
                <div key={sede.id} className="bg-[#0a0a0a] p-5 rounded-2xl border border-[#222] hover:border-[#333] transition-colors">
                  <p className="font-bold text-white mb-3">{sede.nombre}</p>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" min="0" placeholder="0.00" value={reparticion[sede.id] || ''} onChange={(e) => handleInputChange(sede.id, e.target.value)}
                      className="flex-1 bg-[#111] border border-[#333] p-3 rounded-xl text-right font-mono text-lg text-white focus:border-[#ff5a1f] outline-none"
                    />
                    <span className="text-sm font-bold text-neutral-500 whitespace-nowrap">
                    {item?.unidad_medida || 'und'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-[#222] bg-[#161616] shrink-0 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Quedará en Matriz</p>
              <p className={`text-3xl font-black font-mono ${nuevoStockGlobal < 0 ? 'text-red-500' : 'text-white'}`}>
                {nuevoStockGlobal || 0} <span className="text-sm font-sans text-neutral-500">{item?.unidad_medida}</span>
              </p>
            </div>
            {nuevoStockGlobal < 0 && (
              <span className="text-[10px] text-red-500 font-black uppercase bg-red-500/10 px-3 py-2 rounded-lg">Falta stock central</span>
            )}
          </div>

          <button 
            onClick={handleGuardar}
            style={{ backgroundColor: colorBtn }}
            disabled={!insumoSeleccionado || nuevoStockGlobal < 0}
            className={`w-full md:w-auto px-10 py-5 rounded-2xl font-black text-lg shadow-xl transition-all ${
              !insumoSeleccionado || nuevoStockGlobal < 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:scale-[1.02] active:scale-95 text-white hover:brightness-110'
            }`}
          >
            Confirmar Despacho 🚚
          </button>
        </div>

      </div>
    </div>
  );
}