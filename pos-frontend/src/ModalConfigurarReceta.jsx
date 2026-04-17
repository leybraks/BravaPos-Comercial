import React, { useState, useEffect } from 'react';
import { getCatalogoGlobal, guardarReceta } from './api/api';

export default function ModalConfigurarReceta({ isOpen, onClose, producto, config }) {
  const [catalogo, setCatalogo] = useState([]);
  const [ingredientes, setIngredientes] = useState([]); // Lo que vamos añadiendo a la olla
  
  // Controles del formulario
  const [insumoSeleccionado, setInsumoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState('');

  useEffect(() => {
    if (isOpen) {
      getCatalogoGlobal().then(res => setCatalogo(res.data));
      setIngredientes([]); // Aquí cargaríamos los ingredientes existentes si editamos
    }
  }, [isOpen, producto]);

  const handleAgregarALaOlla = () => {
    if (!insumoSeleccionado || !cantidad) return;
    const insumoCompleto = catalogo.find(i => i.id.toString() === insumoSeleccionado);
    
    setIngredientes([...ingredientes, {
      insumo_id: insumoCompleto.id,
      nombre: insumoCompleto.nombre,
      unidad: insumoCompleto.unidad_medida,
      cantidad_necesaria: parseFloat(cantidad)
    }]);
    
    setInsumoSeleccionado('');
    setCantidad('');
  };

  const handleGuardarReceta = async () => {
    try {
      // 🚀 Enviamos la lista entera de ingredientes de este producto a Django
      await guardarReceta(producto.id, { ingredientes });
      alert("✅ Receta guardada maestra guardada.");
      onClose();
    } catch (err) {
      alert("Error al guardar la receta.");
    }
  };

  if (!isOpen || !producto) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-[#222] w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl">
        
        <div className="p-8 border-b border-[#222] bg-[#161616]">
          <p className="text-[10px] text-[#ff5a1f] font-black uppercase tracking-widest">Ingeniería de Menú</p>
          <h2 className="text-2xl font-black text-white">Receta: {producto.nombre}</h2>
        </div>

        <div className="p-8 space-y-6">
          {/* BUSCADOR DE INSUMOS */}
          <div className="flex gap-4">
            <select 
              value={insumoSeleccionado} onChange={e => setInsumoSeleccionado(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-[#333] px-5 py-4 rounded-2xl text-white font-bold outline-none focus:border-[#ff5a1f]"
            >
              <option value="">Selecciona insumo del Catálogo...</option>
              {catalogo.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)}
            </select>
            
            <input 
              type="number" min="0" placeholder="Cant." value={cantidad} onChange={e => setCantidad(e.target.value)}
              className="w-32 bg-[#0a0a0a] border border-[#333] px-5 py-4 rounded-2xl text-white font-mono outline-none focus:border-[#ff5a1f]"
            />
            
            <button onClick={handleAgregarALaOlla} className="bg-[#222] hover:bg-white hover:text-black text-white font-black px-6 rounded-2xl transition-all">
              +
            </button>
          </div>

          {/* LA OLLA (LA RECETA) */}
          <div className="bg-[#0a0a0a] p-6 rounded-[2rem] border border-[#222] min-h-[200px]">
            <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-4">Ingredientes del Plato</p>
            {ingredientes.length === 0 ? (
              <p className="text-neutral-600 text-center py-8">Aún no hay ingredientes.</p>
            ) : (
              <div className="space-y-3">
                {ingredientes.map((ing, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-[#111] p-4 rounded-xl border border-[#333]">
                    <span className="font-bold text-white">{ing.nombre}</span>
                    <span className="font-mono text-[#ff5a1f] font-black">{ing.cantidad_necesaria} <span className="text-sm font-sans text-neutral-500">{ing.unidad}</span></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleGuardarReceta} className="w-full bg-[#ff5a1f] text-white font-black py-5 rounded-2xl text-lg hover:brightness-110 active:scale-95 transition-all shadow-xl">
            Sellar Receta 🍳
          </button>
        </div>
      </div>
    </div>
  );
}