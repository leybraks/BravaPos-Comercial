import React, { useState, useEffect } from 'react';

export default function ModalModificadores({ 
  isOpen, 
  onClose, 
  categorias = [], 
  modificadores = [], 
  onGuardar, 
  tema, 
  colorPrimario,
  onRecargar // ✅ NUEVO: callback para recargar después de guardar
}) {
  const isDark = tema === 'dark';
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({ 
    nombre: '', 
    precio: '', // ✅ CAMBIADO: vacío por defecto en vez de '0.00'
    categorias_aplicables: [] 
  });

  // ✅ Resetear formulario cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setEditando(null);
      setFormData({ nombre: '', precio: '', categorias_aplicables: [] });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const manejarSeleccionCategoria = (catId) => {
    setFormData(prev => ({
      ...prev,
      categorias_aplicables: prev.categorias_aplicables.includes(catId)
        ? prev.categorias_aplicables.filter(id => id !== catId)
        : [...prev.categorias_aplicables, catId]
    }));
  };

  const manejarEditar = (mod) => {
    setEditando(mod);
    setFormData({
      id: mod.id,
      nombre: mod.nombre,
      precio: mod.precio || '', // ✅ Mostrar precio existente o vacío
      categorias_aplicables: Array.isArray(mod.categorias_aplicables) 
        ? mod.categorias_aplicables 
        : []
    });
  };

  const manejarNuevo = () => {
    setEditando(null);
    setFormData({ nombre: '', precio: '', categorias_aplicables: [] });
  };

  const validarYGuardar = async () => {
    // ✅ Validaciones
    if (!formData.nombre.trim()) {
      alert('⚠️ El nombre del modificador es obligatorio');
      return;
    }

    if (formData.categorias_aplicables.length === 0) {
      alert('⚠️ Debes seleccionar al menos una categoría');
      return;
    }

    // ✅ Si el precio está vacío, usar 0.00 por defecto
    const precioParaEnviar = formData.precio.trim() === '' ? '0.00' : formData.precio;
    const precioNum = parseFloat(precioParaEnviar);
    
    if (isNaN(precioNum) || precioNum < 0) {
      alert('⚠️ El precio debe ser un número válido mayor o igual a 0');
      return;
    }

    // ✅ Guardar y esperar a que termine
    await onGuardar({
      ...formData,
      precio: precioNum.toFixed(2)
    });

    // ✅ Resetear formulario después de guardar exitosamente
    setEditando(null);
    setFormData({ nombre: '', precio: '', categorias_aplicables: [] });

    // ✅ NUEVO: Llamar al callback para recargar la lista
    if (onRecargar) {
      onRecargar();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-fadeIn">
      <div className={`w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl border overflow-hidden flex flex-col ${
        isDark ? 'bg-[#0d0d0d] border-[#222]' : 'bg-white border-gray-200'
      }`}>
        
        {/* CABECERA */}
        <div className={`p-8 border-b flex justify-between items-center ${isDark ? 'border-[#222] bg-[#111]' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: `${colorPrimario}15`, color: colorPrimario }}>
              <i className="fi fi-rr-settings-sliders text-2xl mt-1"></i>
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Modificadores Rápidos
              </h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-neutral-500">
                Extras y especificaciones por categoría
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
              isDark ? 'border-[#333] text-neutral-500 hover:text-white hover:bg-[#1a1a1a]' : 'border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <i className="fi fi-rr-cross-small"></i>
          </button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LISTADO IZQUIERDA */}
          <div className={`w-full md:w-1/2 p-6 overflow-y-auto border-r ${isDark ? 'border-[#222]' : 'border-gray-100'}`}>
            <div className="flex justify-between items-center mb-4 px-2">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Modificadores Existentes ({modificadores.length})
              </h4>
              <button 
                onClick={manejarNuevo}
                style={{ backgroundColor: colorPrimario }}
                className="px-3 py-1.5 rounded-lg text-white text-[9px] font-black uppercase tracking-wider shadow-md hover:scale-105 transition-transform"
              >
                + Nuevo
              </button>
            </div>

            {modificadores.length === 0 ? (
              <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-[#141414] border-[#222]' : 'bg-gray-50 border-gray-100'}`}>
                <div className="text-4xl mb-3">🔧</div>
                <p className={`text-sm font-bold ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                  Aún no hay modificadores
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}>
                  Crea el primero usando el botón "+ Nuevo"
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {modificadores.map(mod => (
                  <button 
                    key={mod.id}
                    onClick={() => manejarEditar(mod)}
                    className={`w-full p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${
                      editando?.id === mod.id 
                        ? `shadow-lg` 
                        : isDark ? 'bg-[#141414] border-[#222] hover:border-[#444]' : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                    }`}
                    style={editando?.id === mod.id ? { 
                      borderColor: colorPrimario, 
                      backgroundColor: `${colorPrimario}05` 
                    } : {}}
                  >
                    <div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {mod.nombre}
                      </p>
                      <p className="text-[10px] font-medium text-neutral-500 uppercase mt-0.5">
                        {Array.isArray(mod.categorias_aplicables) ? mod.categorias_aplicables.length : 0} Categorías
                      </p>
                    </div>
                    <span className="font-mono font-black" style={{ color: colorPrimario }}>
                      +S/ {parseFloat(mod.precio || 0).toFixed(2)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* FORMULARIO DERECHA */}
          <div className={`flex-1 p-6 overflow-y-auto ${isDark ? 'bg-black/10' : 'bg-gray-50/50'}`}>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6 px-2">
              {editando ? `Editando: ${editando.nombre}` : 'Nuevo Modificador'}
            </h4>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block px-2">
                  Nombre del Extra *
                </label>
                <input 
                  type="text"
                  value={formData.nombre}
                  onChange={e => setFormData({...formData, nombre: e.target.value})}
                  className={`w-full rounded-2xl py-4 px-5 font-bold outline-none border-2 transition-all ${
                    isDark 
                      ? 'bg-[#161616] border-[#222] text-white focus:border-[#444]' 
                      : 'bg-white border-gray-100 text-gray-900 focus:border-gray-300'
                  }`}
                  placeholder="Ej. Sin Cebolla, Extra Queso..."
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 block px-2">
                  Precio Adicional (S/)
                </label>
                <input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.precio}
                  onChange={e => setFormData({...formData, precio: e.target.value})}
                  placeholder="0.00" // ✅ AHORA ES PLACEHOLDER
                  className="w-full rounded-2xl py-4 px-5 font-black font-mono text-2xl outline-none border-2 bg-emerald-500/5 border-emerald-500/20 text-emerald-500 focus:border-emerald-500/40 transition-all placeholder:text-emerald-500/30"
                />
                <p className="text-[9px] text-neutral-500 mt-2 px-2">
                  💡 Si dejas vacío, se guardará como S/ 0.00 (sin costo adicional)
                </p>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 block px-2">
                  ¿A qué categorías aplica? *
                </label>
                {categorias.length === 0 ? (
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'}`}>
                    <p className="text-xs text-neutral-500">
                      ⚠️ No hay categorías disponibles. Crea categorías primero en el menú.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {categorias.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => manejarSeleccionCategoria(cat.id)}
                        className={`p-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                          formData.categorias_aplicables.includes(cat.id)
                            ? 'bg-blue-500 border-blue-500 text-white shadow-lg scale-105'
                            : isDark 
                              ? 'bg-[#1a1a1a] border-[#333] text-neutral-500 hover:border-[#444]' 
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        {cat.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={validarYGuardar}
                style={{ backgroundColor: colorPrimario }}
                className="w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all mt-4"
              >
                {editando ? '💾 Actualizar Cambios' : '✨ Guardar Modificador'}
              </button>

              {editando && (
                <button 
                  onClick={manejarNuevo}
                  className={`w-full py-4 rounded-2xl font-bold uppercase tracking-wider border transition-all ${
                    isDark 
                      ? 'bg-[#1a1a1a] border-[#333] text-neutral-400 hover:bg-[#222]' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  ✖ Cancelar Edición
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}