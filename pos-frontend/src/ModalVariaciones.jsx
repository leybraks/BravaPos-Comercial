import React, { useState, useEffect } from 'react';
import usePosStore from './store/usePosStore';
import { getCatalogoGlobal, actualizarVariacionesProducto } from './api/api';

export default function ModalVariaciones({ isOpen, onClose, producto }) {
  // ✨ EXTRAEMOS EL COLOR GLOBAL DE ZUSTAND ✨
  const { configuracionGlobal } = usePosStore();
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';

  const [catalogo, setCatalogo] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (isOpen && producto) {
      getCatalogoGlobal().then(res => setCatalogo(res.data));
      // Clonamos las variaciones que ya trae el producto desde la base de datos
      setGrupos(producto.grupos_variacion ? JSON.parse(JSON.stringify(producto.grupos_variacion)) : []);
    }
  }, [isOpen, producto]);

  // ================= ACCIONES DE OPCIONES =================
  const handleAgregarOpcion = (gIndex) => {
    const nuevosGrupos = [...grupos];
    // Agregamos con precio 0 por defecto (el precio real se maneja en el catálogo)
    nuevosGrupos[gIndex].opciones.push({ nombre: '', precio_adicional: 0, ingredientes: [] });
    setGrupos(nuevosGrupos);
  };

  const handleEliminarOpcion = (gIndex, oIndex) => {
    const nuevosGrupos = [...grupos];
    nuevosGrupos[gIndex].opciones.splice(oIndex, 1);
    setGrupos(nuevosGrupos);
  };

  // ================= ACCIONES DE RECETAS =================
  const handleAgregarIngrediente = (gIndex, oIndex, insumoId, cantidad) => {
    if (!insumoId || !cantidad) return;
    const insumoCompleto = catalogo.find(i => i.id.toString() === insumoId.toString());
    
    const nuevosGrupos = [...grupos];
    nuevosGrupos[gIndex].opciones[oIndex].ingredientes.push({
      insumo: insumoCompleto.id, 
      nombre_insumo: insumoCompleto.nombre, 
      unidad_medida: insumoCompleto.unidad_medida, 
      cantidad_necesaria: parseFloat(cantidad)
    });
    setGrupos(nuevosGrupos);
  };

  const handleEliminarIngrediente = (gIndex, oIndex, iIndex) => {
    const nuevosGrupos = [...grupos];
    nuevosGrupos[gIndex].opciones[oIndex].ingredientes.splice(iIndex, 1);
    setGrupos(nuevosGrupos);
  };

  // ================= GUARDAR TODO =================
  const handleGuardarTodo = async () => {
    setCargando(true);
    try {
      await actualizarVariacionesProducto(producto.id, grupos);
      alert("✅ Recetas de variaciones guardadas con éxito.");
      onClose();
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar las variaciones.");
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen || !producto) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-[#111] border border-[#222] w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 sm:p-8 border-b border-[#222] bg-[#161616] flex justify-between items-start shrink-0">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: colorPrimario }}>
              Ingeniería de Menú
            </p>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">Variaciones: {producto.nombre}</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-[#0a0a0a] rounded-full text-neutral-500 hover:bg-[#222] hover:text-white transition-colors">×</button>
        </div>

        {/* CUERPO SCROLLEABLE */}
        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {grupos.length === 0 && (
            <div className="text-center py-10 opacity-50 border border-dashed border-[#333] rounded-[2rem]">
              <span className="text-4xl block mb-2">🏷️</span>
              <p className="font-bold text-neutral-400">No hay grupos de variación.</p>
              <p className="text-sm text-neutral-500">Añade los grupos desde el módulo de Catálogo.</p>
            </div>
          )}

          {/* RENDERIZADO DE GRUPOS */}
          {grupos.map((grupo, gIndex) => (
            <div key={gIndex} className="bg-[#161616] border border-[#2a2a2a] rounded-[2rem] p-6">
              
              {/* CABECERA DEL GRUPO */}
              <div className="mb-6 pb-4 border-b border-[#222]">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">Grupo de Variación</p>
                <h3 className="text-lg font-black uppercase tracking-tight" style={{ color: colorPrimario }}>
                  {grupo.nombre}
                </h3>
              </div>

              {/* RENDERIZADO DE OPCIONES DENTRO DEL GRUPO */}
              <div className="space-y-4 pl-4 border-l-2 border-[#222]">
                {grupo.opciones.map((opcion, oIndex) => (
                  <div key={oIndex} className="bg-[#0a0a0a] border border-[#333] p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-white font-bold text-sm uppercase tracking-wide">
                        ● {opcion.nombre}
                      </span>
                      <button onClick={() => handleEliminarOpcion(gIndex, oIndex)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-xs">🗑️</button>
                    </div>

                    {/* SECCIÓN DE RECETA */}
                    <div className="pt-4 border-t border-[#222]/50">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">🍳 Insumos que consume esta variante</p>
                      
                      <div className="space-y-2 mb-3">
                        {opcion.ingredientes?.map((ing, iIndex) => (
                          <div key={iIndex} className="flex justify-between items-center bg-[#111] px-4 py-2 rounded-lg border border-[#222]">
                            <span className="text-xs font-bold text-neutral-300">{ing.nombre_insumo}</span>
                            <div className="flex items-center gap-4">
                              <span className="font-mono font-bold text-xs" style={{ color: colorPrimario }}>
                                {ing.cantidad_necesaria} <span className="text-neutral-500">{ing.unidad_medida}</span>
                              </span>
                              <button onClick={() => handleEliminarIngrediente(gIndex, oIndex, iIndex)} className="text-red-500 hover:text-red-400 font-bold">×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Formulario para añadir insumos */}
                      <div className="flex gap-2">
                        <select id={`insumo-${gIndex}-${oIndex}`} className="flex-1 bg-[#111] border border-[#333] px-3 py-2 rounded-lg text-white text-xs outline-none focus:border-neutral-500 transition-colors">
                          <option value="">Añadir insumo...</option>
                          {catalogo.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)}
                        </select>
                        <input id={`cant-${gIndex}-${oIndex}`} type="number" placeholder="Cant." className="w-16 bg-[#111] border border-[#333] px-3 py-2 rounded-lg text-white font-mono text-xs outline-none focus:border-neutral-500 transition-colors" />
                        <button 
                          onClick={() => {
                            const sel = document.getElementById(`insumo-${gIndex}-${oIndex}`);
                            const can = document.getElementById(`cant-${gIndex}-${oIndex}`);
                            handleAgregarIngrediente(gIndex, oIndex, sel.value, can.value);
                            sel.value = ''; can.value = '';
                          }}
                          className="bg-[#222] text-white px-3 rounded-lg text-xs font-bold hover:bg-[#333] transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button onClick={() => handleAgregarOpcion(gIndex)} className="text-[10px] font-bold text-neutral-500 hover:text-white flex items-center gap-2 mt-4 transition-colors uppercase tracking-widest">
                  <span className="w-5 h-5 flex items-center justify-center bg-[#222] rounded-full">+</span> Añadir Opción
                </button>
              </div>
            </div>
          ))}
          
        </div>

        {/* FOOTER */}
        <div className="p-6 sm:p-8 border-t border-[#222] bg-[#161616] flex flex-col-reverse sm:flex-row gap-4 shrink-0">
          <button onClick={onClose} className="w-full sm:w-1/3 bg-[#111] text-neutral-400 font-bold py-4 rounded-2xl text-base hover:bg-[#222] transition-all border border-[#333]">Cancelar</button>
          <button 
            onClick={handleGuardarTodo} 
            disabled={cargando} 
            style={{ backgroundColor: colorPrimario }} 
            className={`w-full sm:w-2/3 text-white font-black py-4 rounded-2xl text-base transition-all shadow-xl ${cargando ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'}`}
          >
            {cargando ? 'Guardando...' : 'Guardar Recetas 💾'}
          </button>
        </div>

      </div>
    </div>
  );
}