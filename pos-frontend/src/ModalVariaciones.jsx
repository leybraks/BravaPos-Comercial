import React, { useState, useEffect } from 'react';
import { getCatalogoGlobal, actualizarVariacionesProducto } from './api/api';

export default function ModalVariaciones({ isOpen, onClose, producto, config }) {
  const [catalogo, setCatalogo] = useState([]);
  
  // Nuestro estado maestro (El Inception)
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(false);

  const colorBtn = config?.colorPrimario || '#ff5a1f';

  useEffect(() => {
    if (isOpen && producto) {
      getCatalogoGlobal().then(res => setCatalogo(res.data));
      // Clonamos las variaciones que ya trae el producto desde la base de datos
      setGrupos(producto.grupos_variacion ? JSON.parse(JSON.stringify(producto.grupos_variacion)) : []);
    }
  }, [isOpen, producto]);

  // ================= ACCIONES DE GRUPOS =================
  const handleAgregarGrupo = () => {
    setGrupos([...grupos, { nombre: '', obligatorio: true, seleccion_multiple: false, opciones: [] }]);
  };

  const handleEliminarGrupo = (gIndex) => {
    const nuevosGrupos = [...grupos];
    nuevosGrupos.splice(gIndex, 1);
    setGrupos(nuevosGrupos);
  };

  // ================= ACCIONES DE OPCIONES =================
  const handleAgregarOpcion = (gIndex) => {
    const nuevosGrupos = [...grupos];
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
      insumo: insumoCompleto.id, // ID para Django
      nombre_insumo: insumoCompleto.nombre, // Solo para la vista
      unidad_medida: insumoCompleto.unidad_medida, // Solo para la vista
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
      // 🚀 Mandamos el bloque completo de grupos al backend mediante un PATCH
      await actualizarVariacionesProducto(producto.id, grupos);
      alert("✅ Variaciones configuradas con éxito.");
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
            <p className="text-[10px] text-[#ff5a1f] font-black uppercase tracking-widest mb-1">Ingeniería de Menú</p>
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
              <p className="text-sm text-neutral-500">Ej: "Elige tu Tamaño", "Elige tu Carne"</p>
            </div>
          )}

          {/* RENDERIZADO DE GRUPOS */}
          {grupos.map((grupo, gIndex) => (
            <div key={gIndex} className="bg-[#161616] border border-[#2a2a2a] rounded-[2rem] p-6 relative">
              <button onClick={() => handleEliminarGrupo(gIndex)} className="absolute top-6 right-6 text-red-500 hover:text-red-400 font-bold text-sm bg-red-500/10 px-3 py-1 rounded-lg">Eliminar Grupo</button>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pr-24">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Nombre del Grupo</label>
                  <input 
                    type="text" value={grupo.nombre} placeholder="Ej: Tamaños" onChange={(e) => { const n = [...grupos]; n[gIndex].nombre = e.target.value; setGrupos(n); }}
                    className="w-full bg-[#0a0a0a] border border-[#333] px-4 py-3 rounded-xl text-white font-bold outline-none focus:border-[#ff5a1f]"
                  />
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <input type="checkbox" checked={grupo.obligatorio} onChange={(e) => { const n = [...grupos]; n[gIndex].obligatorio = e.target.checked; setGrupos(n); }} className="w-5 h-5 accent-[#ff5a1f]" />
                  <label className="text-sm font-bold text-neutral-300">Obligatorio</label>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <input type="checkbox" checked={grupo.seleccion_multiple} onChange={(e) => { const n = [...grupos]; n[gIndex].seleccion_multiple = e.target.checked; setGrupos(n); }} className="w-5 h-5 accent-[#ff5a1f]" />
                  <label className="text-sm font-bold text-neutral-300">Permitir Múltiples</label>
                </div>
              </div>

              {/* RENDERIZADO DE OPCIONES DENTRO DEL GRUPO */}
              <div className="space-y-4 pl-4 border-l-2 border-[#222]">
                {grupo.opciones.map((opcion, oIndex) => (
                  <div key={oIndex} className="bg-[#0a0a0a] border border-[#333] p-4 rounded-2xl">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                      <input 
                        type="text" value={opcion.nombre} placeholder="Ej: Familiar / Extra Rachi" onChange={(e) => { const n = [...grupos]; n[gIndex].opciones[oIndex].nombre = e.target.value; setGrupos(n); }}
                        className="flex-1 bg-[#111] border border-[#222] px-4 py-3 rounded-xl text-white font-bold outline-none focus:border-[#ff5a1f]"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 font-bold">+ S/</span>
                        <input 
                          type="number" value={opcion.precio_adicional} onChange={(e) => { const n = [...grupos]; n[gIndex].opciones[oIndex].precio_adicional = e.target.value; setGrupos(n); }}
                          className="w-24 bg-[#111] border border-[#222] px-4 py-3 rounded-xl text-white font-mono outline-none focus:border-[#ff5a1f]"
                        />
                        <button onClick={() => handleEliminarOpcion(gIndex, oIndex)} className="w-10 h-10 flex items-center justify-center bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors">🗑️</button>
                      </div>
                    </div>

                    {/* RENDERIZADO DE LA RECETA DE LA OPCIÓN */}
                    <div className="mt-4 pt-4 border-t border-[#222]">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-3">🍳 Receta de esta variante</p>
                      <div className="space-y-2 mb-3">
                        {opcion.ingredientes?.map((ing, iIndex) => (
                          <div key={iIndex} className="flex justify-between items-center bg-[#111] px-4 py-2 rounded-lg border border-[#222]">
                            <span className="text-sm font-bold text-neutral-300">{ing.nombre_insumo || "Insumo Seleccionado"}</span>
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-[#ff5a1f] font-bold text-sm">{ing.cantidad_necesaria} <span className="text-neutral-500 text-xs">{ing.unidad_medida || 'und'}</span></span>
                              <button onClick={() => handleEliminarIngrediente(gIndex, oIndex, iIndex)} className="text-red-500 hover:text-red-400">×</button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Mini-formulario para agregar a la receta */}
                      <div className="flex gap-2">
                        <select id={`insumo-${gIndex}-${oIndex}`} className="flex-1 bg-[#111] border border-[#333] px-3 py-2 rounded-lg text-white text-sm outline-none">
                          <option value="">Añadir insumo...</option>
                          {catalogo.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad_medida})</option>)}
                        </select>
                        <input id={`cant-${gIndex}-${oIndex}`} type="number" placeholder="Cant." className="w-20 bg-[#111] border border-[#333] px-3 py-2 rounded-lg text-white font-mono text-sm outline-none" />
                        <button 
                          onClick={() => {
                            const sel = document.getElementById(`insumo-${gIndex}-${oIndex}`);
                            const can = document.getElementById(`cant-${gIndex}-${oIndex}`);
                            handleAgregarIngrediente(gIndex, oIndex, sel.value, can.value);
                            sel.value = ''; can.value = '';
                          }}
                          className="bg-[#222] text-white px-4 rounded-lg font-bold hover:bg-[#333]"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button onClick={() => handleAgregarOpcion(gIndex)} className="text-sm font-bold text-neutral-400 hover:text-white flex items-center gap-2 mt-4">
                  <span className="w-6 h-6 flex items-center justify-center bg-[#222] rounded-full">+</span> Añadir Opción
                </button>
              </div>
            </div>
          ))}

          <button onClick={handleAgregarGrupo} className="w-full py-5 border-2 border-dashed border-[#333] hover:border-[#ff5a1f] rounded-[2rem] text-neutral-400 hover:text-[#ff5a1f] font-black transition-colors flex items-center justify-center gap-2">
            <span className="text-2xl">+</span> AÑADIR GRUPO DE VARIACIÓN
          </button>
        </div>

        {/* FOOTER */}
        <div className="p-6 sm:p-8 border-t border-[#222] bg-[#161616] flex flex-col-reverse sm:flex-row gap-4 shrink-0">
          <button onClick={onClose} className="w-full sm:w-1/3 bg-[#111] text-neutral-400 font-bold py-4 rounded-2xl text-base hover:bg-[#222] transition-all border border-[#333]">Cancelar</button>
          <button onClick={handleGuardarTodo} disabled={cargando} style={{ backgroundColor: colorBtn }} className={`w-full sm:w-2/3 text-white font-black py-4 rounded-2xl text-base transition-all shadow-xl ${cargando ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-95'}`}>
            {cargando ? 'Guardando...' : 'Guardar Todo el Menú 💾'}
          </button>
        </div>

      </div>
    </div>
  );
}