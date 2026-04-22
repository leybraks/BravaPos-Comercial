import React, { useState, useEffect } from 'react';
import { getCatalogoGlobal, guardarReceta, getReceta} from '../api/api';

export default function ModalConfigurarReceta({ isOpen, onClose, producto, config }) {
  const [catalogo, setCatalogo] = useState([]);
  const [ingredientes, setIngredientes] = useState([]); 
  
  // Controles del formulario
  const [insumoSeleccionado, setInsumoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState('');

  const colorBtn = config?.colorPrimario || '#ff5a1f';

  // ⚠️ No olvides importar getReceta arriba: import { getCatalogoGlobal, guardarReceta, getReceta } from './api/api';

  useEffect(() => {
    if (isOpen && producto) {
      // Pedimos ambas cosas a la vez para que sea súper rápido
      Promise.all([
        getCatalogoGlobal(),
        getReceta(producto.id)
      ]).then(([resCatalogo, resReceta]) => {
        setCatalogo(resCatalogo.data);
        setIngredientes(resReceta.data); // ¡Magia! La olla se llena con lo que guardaste.
        setInsumoSeleccionado('');
        setCantidad('');
      }).catch(err => {
        console.error("Error cargando datos:", err);
      });
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

  // 🔥 NUEVO: Función para quitar ingredientes si te equivocas
  const handleQuitarIngrediente = (indexParaBorrar) => {
    const nuevosIngredientes = [...ingredientes];
    nuevosIngredientes.splice(indexParaBorrar, 1);
    setIngredientes(nuevosIngredientes);
  };

  const handleGuardarReceta = async () => {
    try {
      await guardarReceta(producto.id, { ingredientes });
      alert("✅ Receta maestra guardada.");
      onClose();
    } catch (err) {
      console.error("Error del servidor al guardar receta:", err);
      alert("Error al guardar la receta.");
    }
  };

  if (!isOpen || !producto) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      {/* 🚀 Ajustamos la altura máxima y le decimos que se estructure en columnas */}
      <div className="bg-[#111] border border-[#222] w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER (No se encoge) */}
        <div className="p-6 sm:p-8 border-b border-[#222] bg-[#161616] flex justify-between items-start shrink-0">
          <div>
            <p className="text-[10px] text-[#ff5a1f] font-black uppercase tracking-widest mb-1">Ingeniería de Menú</p>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">Receta: {producto.nombre}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-neutral-500 hover:text-white text-3xl font-light transition-colors leading-none w-10 h-10 flex items-center justify-center bg-[#0a0a0a] rounded-full hover:bg-[#222]"
          >
            ×
          </button>
        </div>

        {/* CUERPO CON SCROLL (Para celulares y recetas largas) */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-8 flex-1">
          
          {/* SECCIÓN DE AGREGAR: Responsive (Apilado en móvil, Fila en PC) */}
          <div className="bg-[#161616] p-5 sm:p-6 rounded-[2rem] border border-[#2a2a2a] relative">
             <span className="absolute -top-3 left-6 bg-[#0a0a0a] px-3 text-[10px] font-black text-neutral-400 uppercase tracking-widest border border-[#2a2a2a] rounded-full">
              Añadir Insumo
            </span>
            <div className="flex flex-col sm:flex-row gap-4 mt-2">
              <select 
                value={insumoSeleccionado} onChange={e => setInsumoSeleccionado(e.target.value)}
                className="flex-1 bg-[#0a0a0a] border border-[#333] px-5 py-4 rounded-2xl text-white font-bold outline-none focus:border-[#ff5a1f] appearance-none cursor-pointer"
              >
                <option value="">Buscar en Catálogo...</option>
                {catalogo.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)}
              </select>
              
              <div className="flex gap-4 sm:w-auto">
                <input 
                  type="number" min="0" placeholder="0.00" value={cantidad} onChange={e => setCantidad(e.target.value)}
                  className="flex-1 sm:w-28 bg-[#0a0a0a] border border-[#333] px-4 py-4 rounded-2xl text-white font-mono text-center outline-none focus:border-[#ff5a1f]"
                />
                <button 
                  onClick={handleAgregarALaOlla} 
                  className="w-16 sm:w-auto bg-[#222] hover:bg-[#ff5a1f] text-neutral-400 hover:text-white font-black px-5 rounded-2xl transition-all flex items-center justify-center text-xl"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* LA OLLA (LA RECETA) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-widest px-2">Composición del Plato</h3>
            
            <div className="bg-[#0a0a0a] p-2 sm:p-4 rounded-[2rem] border border-[#222] min-h-[150px] flex flex-col justify-center">
              {ingredientes.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <span className="text-4xl block mb-2">🥘</span>
                  <p className="text-sm font-bold text-neutral-500">Aún no hay ingredientes.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {ingredientes.map((ing, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-[#111] p-4 rounded-2xl border border-[#2a2a2a] hover:border-[#444] transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-xl opacity-50">🥩</span>
                        <span className="font-bold text-white text-sm sm:text-base">{ing.nombre}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-[#ff5a1f] font-black text-lg">
                          {ing.cantidad_necesaria} <span className="text-xs font-sans text-neutral-500">{ing.unidad}</span>
                        </span>
                        {/* BOTÓN ELIMINAR (Solo aparece al pasar el mouse en PC, o siempre visible en móvil) */}
                        <button 
                          onClick={() => handleQuitarIngrediente(idx)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
        </div>

        {/* FOOTER (No se encoge, apilado en móvil) */}
        <div className="p-6 sm:p-8 border-t border-[#222] bg-[#161616] flex flex-col-reverse sm:flex-row gap-4 shrink-0">
          <button 
            onClick={onClose} 
            className="w-full sm:w-1/3 bg-[#111] text-neutral-400 font-bold py-4 rounded-2xl text-base sm:text-lg hover:bg-[#222] hover:text-white transition-all border border-[#333]"
          >
            Cancelar
          </button>
          <button 
            onClick={handleGuardarReceta}
            style={{ backgroundColor: colorBtn }} 
            className="w-full sm:w-2/3 text-white font-black py-4 rounded-2xl text-base sm:text-lg hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-orange-900/20"
          >
            Sellar Receta 🍳
          </button>
        </div>
      </div>
    </div>
  );
}