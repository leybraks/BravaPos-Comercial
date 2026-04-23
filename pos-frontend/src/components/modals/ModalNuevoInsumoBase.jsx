import React, { useState } from 'react';
import { crearInsumoBase } from '../../api/api';

export default function ModalNuevoInsumoBase({ isOpen, onClose, onSuccess, config }) {
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('unidades');

  const colorBtn = config?.colorPrimario || '#ff5a1f';

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre) return alert("⚠️ El nombre es obligatorio");

    try {
      await crearInsumoBase({
        nombre: nombre,
        unidad_medida: unidad,
        negocio: localStorage.getItem('negocio_id'),
        activo: true 
      });

      alert("✅ Insumo Maestro creado exitosamente.");
      setNombre('');
      onSuccess(); 
      onClose();
    } catch (error) {
      console.error("Error:", error);
      alert("Hubo un error al registrar el insumo global.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#111] border border-[#222] w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
        
        {/* HEADER */}
        <div className="p-8 border-b border-[#222] flex justify-between items-center bg-[#161616]">
          <div>
            <p className="text-[10px] text-[#ff5a1f] font-black uppercase tracking-widest mb-1">Catálogo Maestro</p>
            <h2 className="text-2xl font-black text-white">Nuevo Insumo</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white text-3xl font-light transition-colors">×</button>
        </div>

        {/* FORMULARIO LIMPIO */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Nombre del Producto</label>
            <input 
              type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Carne de Res, Cajas..." autoFocus
              className="w-full bg-[#0a0a0a] border border-[#333] px-5 py-4 rounded-2xl text-white font-bold focus:border-[#ff5a1f] outline-none transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Unidad de Medida</label>
            <div className="relative">
              <select 
                value={unidad} onChange={(e) => setUnidad(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#333] px-5 py-4 rounded-2xl text-white font-bold focus:border-[#ff5a1f] outline-none appearance-none cursor-pointer"
              >
                <option value="unidades">Unidades (Paquetes, Cajas)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="g">Gramos (g)</option>
                <option value="l">Litros (l)</option>
                <option value="ml">Mililitros (ml)</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">▼</div>
            </div>
          </div>

          <button 
            type="submit" 
            style={{ backgroundColor: colorBtn }}
            className="w-full text-white font-black py-5 rounded-2xl mt-4 active:scale-95 transition-all shadow-xl shadow-orange-900/20 hover:brightness-110 text-lg"
          >
            Guardar en Catálogo 📖
          </button>
        </form>
      </div>
    </div>
  );
}