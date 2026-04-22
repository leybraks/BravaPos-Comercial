import React, { useState } from 'react';
import usePosStore from '../store/usePosStore';

export default function EditorMenu({ 
  categorias, 
  productosReales, 
  onOpenCategorias, 
  onOpenPlatoNuevo, 
  onEditPlato, 
  onToggleDisponibilidad,
  onOpenReceta,
  onOpenVariaciones
}) {
  const { configuracionGlobal } = usePosStore();
  const config = configuracionGlobal || { temaFondo: 'dark', colorPrimario: '#ff5a1f' };

  // Estados que solo le importan a esta vista
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);

  return (
    <div className="animate-fadeIn space-y-6 max-w-6xl mx-auto min-w-0 pb-24">
      
      {/* ========== CABECERA DEL EDITOR DE MENÚ ========== */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-5 p-8 rounded-[2rem] border shadow-xl relative overflow-hidden transition-colors ${
        config.temaFondo === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200'
      }`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff5a1f] opacity-5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="z-10">
          <h2 className={`text-3xl font-black tracking-tight ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Ingeniería de <span style={{ color: config.colorPrimario }}>Menú</span>
          </h2>
          <p className={`text-sm mt-1 font-medium ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
            Crea platos, categorías y configura las recetas maestras.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 shrink-0 z-10">
          <button 
            onClick={onOpenCategorias}
            className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all w-full sm:w-auto text-sm ${
              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] hover:bg-[#222] text-neutral-300 border border-[#333]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
            }`}
          >
            📁 Categorías
          </button>
          
          <button 
            onClick={onOpenPlatoNuevo}
            style={{ backgroundColor: config.colorPrimario }}
            className="flex items-center justify-center gap-2 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-orange-900/20 transition-all w-full sm:w-auto text-sm hover:scale-[1.02] active:scale-95"
          >
            🍔 NUEVO PLATO
          </button>
        </div>
      </div>

      {/* ========== CUERPO: CATEGORÍAS + PLATOS ========== */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Columna Izquierda: Categorías */}
        <div className="w-full lg:w-1/4 shrink-0 mb-4 lg:mb-0">
          <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 px-2 hidden lg:block ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
            Categorías
          </h4>
          
          {/* VERSIÓN MÓVIL (Dropdown) */}
          <div className="block lg:hidden relative z-40">
            <button
              onClick={() => setDropdownAbierto(!dropdownAbierto)}
              className={`w-full flex items-center justify-between font-bold px-5 py-4 rounded-2xl shadow-lg transition-all ${
                config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-gray-100 border-gray-300 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{categoriaSeleccionada === 'Todos' ? '🍔' : '📌'}</span>
                <span>{categoriaSeleccionada === 'Todos' ? 'Todas las Categorías' : categoriaSeleccionada}</span>
              </div>
              <span className={`transition-transform duration-300 ${dropdownAbierto ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {dropdownAbierto && (
              <div className={`absolute mt-2 w-full rounded-2xl shadow-2xl overflow-hidden animate-fadeIn ${
                config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'
              }`}>
                <button
                  onClick={() => { setCategoriaSeleccionada('Todos'); setDropdownAbierto(false); }}
                  className={`w-full text-left px-5 py-4 font-bold transition-all border-b flex items-center gap-3 ${
                    config.temaFondo === 'dark' ? 'border-[#222] text-neutral-300' : 'border-gray-100 text-gray-700'
                  } ${categoriaSeleccionada === 'Todos' ? (config.temaFondo === 'dark' ? 'bg-[#ff5a1f]/10 text-[#ff5a1f]' : 'bg-gray-100 text-gray-900') : ''}`}
                >
                  <span className="text-xl">🍔</span> Todas las Categorías
                </button>
                <div className="max-h-60 overflow-y-auto">
                  {categorias.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoriaSeleccionada(cat.nombre); setDropdownAbierto(false); }}
                      className={`w-full text-left px-5 py-4 font-bold transition-all border-b flex items-center gap-3 ${
                        config.temaFondo === 'dark' ? 'border-[#222] text-neutral-300' : 'border-gray-100 text-gray-700'
                      } ${categoriaSeleccionada === cat.nombre ? (config.temaFondo === 'dark' ? 'bg-[#ff5a1f]/10 text-[#ff5a1f]' : 'bg-gray-100 text-gray-900') : ''}`}
                    >
                      <span className="text-xl opacity-50">📌</span> {cat.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* VERSIÓN PC (Botones laterales) */}
          <div className="hidden lg:flex flex-col space-y-2">
            <button 
              onClick={() => setCategoriaSeleccionada('Todos')}
              className={`w-full text-left px-5 py-4 rounded-2xl font-bold transition-all flex justify-between items-center ${
                categoriaSeleccionada === 'Todos' ? 'text-white shadow-lg' : config.temaFondo === 'dark' ? 'bg-[#161616] text-neutral-400 hover:bg-[#222] border border-[#2a2a2a]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={categoriaSeleccionada === 'Todos' ? { backgroundColor: config.colorPrimario } : {}}
            >
              Todos
            </button>
            {categorias.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setCategoriaSeleccionada(cat.nombre)}
                className={`w-full text-left px-5 py-4 rounded-2xl font-bold transition-all flex justify-between items-center ${
                  categoriaSeleccionada === cat.nombre ? 'text-white shadow-lg' : config.temaFondo === 'dark' ? 'bg-[#161616] text-neutral-400 hover:bg-[#222] border border-[#2a2a2a]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={categoriaSeleccionada === cat.nombre ? { backgroundColor: config.colorPrimario } : {}}
              >
                {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* Columna Derecha: Cuadrícula de Platos */}
        <div className="lg:w-3/4 z-0">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {productosReales
              .filter(plato => {
                if (categoriaSeleccionada === 'Todos') return true;
                const nombreCatDelPlato = categorias.find(c => c.id === plato.categoria)?.nombre || plato.categoria;
                return nombreCatDelPlato === categoriaSeleccionada;
              })
              .map((plato) => {
                const nombreCategoriaMuestra = categorias.find(c => c.id === plato.categoria)?.nombre || plato.categoria || 'Sin categoría';
                // Definimos si el plato es variable basándonos en si su precio es 0
                const esVariable = parseFloat(plato.precio_base) <= 0;

                return (
                  <div 
                    key={plato.id} 
                    // ✨ 1. HACEMOS QUE TODA LA TARJETA ABRA EL MODO EDICIÓN
                    onClick={() => onEditPlato(plato)} 
                    className={`cursor-pointer rounded-[2rem] p-6 flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${!plato.disponible ? 'opacity-60 grayscale' : ''} ${
                      config.temaFondo === 'dark' ? 'bg-[#161616] border border-[#2a2a2a] group hover:border-[#ff5a1f]/50' : 'bg-white border border-gray-200 shadow-sm group hover:border-[#ff5a1f]/50'
                    }`}
                  >
                    {/* Indicador de Disponibilidad */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onToggleDisponibilidad(plato); }}
                      className={`absolute top-5 right-5 flex items-center gap-2 px-3 py-1.5 rounded-full border z-10 transition-all hover:scale-105 ${
                        config.temaFondo === 'dark' ? 'bg-[#111] border-[#333]' : 'bg-gray-100 border-gray-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${plato.disponible ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
                        {plato.disponible ? 'Activo' : 'Agotado'}
                      </span>
                    </button>

                    {/* Imagen placeholder */}
                    <div className={`w-full h-36 rounded-2xl flex items-center justify-center text-6xl mb-6 shadow-inner transition-transform group-hover:scale-105 ${
                      config.temaFondo === 'dark' ? 'bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#222]' : 'bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200'
                    }`}>
                      🍽️
                    </div>
                    
                    <h5 className={`font-black text-xl leading-tight mb-1 truncate ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {plato.nombre}
                    </h5>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-6 line-clamp-1 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                      {nombreCategoriaMuestra}
                    </p>
                    
                    <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                      {/* ✨ 2. ETIQUETA O PRECIO (Limpiamos el código) */}
                      {!esVariable ? (
                        <p className="font-black text-2xl sm:text-3xl tracking-tighter truncate" style={{ color: config.colorPrimario }}>
                          <span className="text-sm mr-1">S/</span>{parseFloat(plato.precio_base).toFixed(2)}
                        </p>
                      ) : (
                        <div 
                          className="flex items-center px-4 py-1.5 rounded-xl border"
                          style={{ backgroundColor: `${config.colorPrimario}15`, borderColor: `${config.colorPrimario}40` }}
                        >
                          <span className="text-xs font-black uppercase tracking-widest" style={{ color: config.colorPrimario }}>
                            Variable
                          </span>
                        </div>
                      )}
                      
                      {/* ✨ 3. CONDICIONAL DE BOTONES: O Variaciones, O Receta */}
                      <div className="flex shrink-0 z-10">
                        {esVariable ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onOpenVariaciones(plato); }}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-md ${
                              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] hover:bg-[#ff5a1f] text-neutral-400 hover:text-white border border-[#333] hover:border-[#ff5a1f]' : 'bg-gray-100 hover:bg-[#ff5a1f] hover:text-white border border-gray-200'
                            }`}
                            title="Configurar Variaciones"
                          >
                            🏷️
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); onOpenReceta(plato); }}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-md ${
                              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] hover:bg-[#ff5a1f] text-neutral-400 hover:text-white border border-[#333] hover:border-[#ff5a1f]' : 'bg-gray-100 hover:bg-[#ff5a1f] hover:text-white border border-gray-200'
                            }`}
                            title="Configurar Receta Base"
                          >
                            🍳
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}