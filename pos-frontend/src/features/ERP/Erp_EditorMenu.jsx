import React, { useState } from 'react';
import usePosStore from '../../store/usePosStore';

export default function EditorMenu({ 
  categorias, 
  productosReales, 
  onOpenCategorias, 
  onOpenPlatoNuevo, 
  onEditPlato, 
  onToggleDisponibilidad,
  onOpenReceta,
  onOpenVariaciones,
  onOpenModificadores
}) {
  const { configuracionGlobal } = usePosStore();
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const temaFondo = configuracionGlobal?.temaFondo || 'dark';
  const isDark = temaFondo === 'dark';

  // ==========================================
  // 🛡️ SEGURIDAD DE ROLES
  // ==========================================
  const rolUsuario = localStorage.getItem('usuario_rol')?.toLowerCase() || '';
  const esDueño = ['dueño', 'admin', 'administrador'].includes(rolUsuario.trim());

  // Estado local para el filtro
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  
  return (
    <div className="animate-fadeIn space-y-8 max-w-7xl mx-auto min-w-0 pb-24 h-full flex flex-col">
      
      {/* ========== 🏗️ 1. CABECERA INTEGRADA ========== */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 pt-2 pb-6 border-b" style={{ borderColor: isDark ? '#222' : '#e5e7eb' }}>
        <div className="flex items-center gap-5">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{ backgroundColor: colorPrimario + '15', color: colorPrimario }}
          >
            {/* ✨ Ícono clásico y seguro que siempre carga */}
            <i className="fi fi-rr-restaurant mt-1"></i> 
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Ingeniería de <span style={{ color: colorPrimario }}>Menú</span>
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              {esDueño ? 'Estructura tu catálogo, recetas maestras y variaciones.' : 'Gestión rápida de disponibilidad de platos.'}
            </p>
          </div>
        </div>

        {/* ✨ CONTROLES DE DUEÑO */}
        {esDueño && (
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {/* ✨ NUEVO BOTÓN DE MODIFICADORES */}
            <button 
              onClick={onOpenModificadores} // Asegúrate de pasar esta prop
              className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                isDark ? 'bg-[#1a1a1a] hover:bg-[#222] text-neutral-300 border-[#333]' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              <i className="fi fi-rr-settings-sliders text-sm"></i> Modificadores
            </button>

            <button 
              onClick={onOpenCategorias}
              className={`px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                isDark ? 'bg-[#1a1a1a] hover:bg-[#222] text-neutral-300 border-[#333]' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
              }`}
            >
              <i className="fi fi-rr-folder text-sm"></i> Categorías
            </button>
            
            <button 
              onClick={onOpenPlatoNuevo}
              style={{ backgroundColor: colorPrimario }}
              className="px-6 py-3 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fi fi-rr-add text-sm"></i> Nuevo Plato
            </button>
          </div>
        )}
      </div>

      {/* ========== 🧩 2. CUERPO: CATEGORÍAS + PLATOS ========== */}
      <div className="flex flex-col lg:flex-row gap-8 items-start flex-1 min-h-0">
        
        {/* 📁 COLUMNA IZQUIERDA: CATEGORÍAS (Sidebar Minimalista) */}
        <div className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24 h-auto">
          <h4 className={`text-[10px] font-black uppercase tracking-widest mb-4 px-2 hidden lg:block ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
            Filtro de Catálogo
          </h4>
          
          {/* Menú de categorías */}
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible custom-scrollbar pb-2 lg:pb-0">
            <button 
              onClick={() => setCategoriaSeleccionada('Todos')}
              className={`whitespace-nowrap lg:whitespace-normal text-left px-5 py-3 rounded-xl font-black transition-all text-sm flex items-center gap-3 border border-transparent ${
                categoriaSeleccionada === 'Todos' 
                ? 'text-white shadow-md' 
                : isDark ? 'text-neutral-400 hover:bg-[#1a1a1a] hover:border-[#333]' : 'text-gray-600 hover:bg-gray-100 hover:border-gray-200'
              }`}
              style={categoriaSeleccionada === 'Todos' ? { backgroundColor: colorPrimario } : {}}
            >
              <i className="fi fi-rr-apps text-base opacity-70"></i> Todo el Catálogo
            </button>

            {categorias.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setCategoriaSeleccionada(cat.nombre)}
                className={`whitespace-nowrap lg:whitespace-normal text-left px-5 py-3 rounded-xl font-bold transition-all text-sm flex items-center gap-3 border border-transparent ${
                  categoriaSeleccionada === cat.nombre 
                  ? 'text-white shadow-md' 
                  : isDark ? 'text-neutral-400 hover:bg-[#1a1a1a] hover:border-[#333]' : 'text-gray-600 hover:bg-gray-100 hover:border-gray-200'
                }`}
                style={categoriaSeleccionada === cat.nombre ? { backgroundColor: colorPrimario } : {}}
              >
                <i className="fi fi-rr-angle-small-right text-base opacity-50"></i> {cat.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* 🍔 COLUMNA DERECHA: CUADRÍCULA DE PLATOS */}
        <div className="flex-1 w-full min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            
            {productosReales
              .filter(plato => {
                if (categoriaSeleccionada === 'Todos') return true;
                const nombreCatDelPlato = categorias.find(c => c.id === plato.categoria)?.nombre || plato.categoria;
                return nombreCatDelPlato === categoriaSeleccionada;
              })
              .map((plato) => {
                const nombreCategoriaMuestra = categorias.find(c => c.id === plato.categoria)?.nombre || plato.categoria || 'Sin categoría';
                const esVariable = parseFloat(plato.precio_base) <= 0;

                return (
                  <div 
                    key={plato.id} 
                    onClick={() => { if(esDueño) onEditPlato(plato) }} 
                    className={`rounded-3xl p-6 flex flex-col relative transition-all duration-200 border ${esDueño ? 'cursor-pointer hover:-translate-y-1' : 'cursor-default'} ${
                      isDark 
                        ? `bg-[#141414] border-[#222] ${esDueño ? 'hover:border-neutral-500 hover:shadow-lg' : ''}` 
                        : `bg-white border-gray-200 shadow-sm ${esDueño ? 'hover:border-gray-300 hover:shadow-lg' : ''}`
                    }`}
                  >
                    
                    {/* Placeholder Imagen */}
                    <div className={`w-full h-36 rounded-2xl flex items-center justify-center text-5xl mb-5 ${
                      isDark ? 'bg-[#0a0a0a] border border-[#222]' : 'bg-gray-50 border border-gray-100 shadow-inner'
                    }`}>
                      🍲
                    </div>
                    
                    {/* Textos de Producto */}
                    <div className="flex-1">
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-1 truncate ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                        {nombreCategoriaMuestra}
                      </p>
                      <h5 className={`font-black text-lg leading-snug mb-5 ${isDark ? 'text-white' : 'text-gray-900'}`} style={{
                          display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden'
                      }}>
                        {plato.nombre}
                      </h5>
                    </div>
                    
                    {/* ========== 🦾 3. PIE DE TARJETA REDISEÑADO ========== */}
                    <div className={`mt-auto flex items-end justify-between pt-5 border-t ${isDark ? 'border-[#222]' : 'border-gray-100'}`}>
                      
                      {/* Precio */}
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                          Precio Base
                        </p>
                        {!esVariable ? (
                          <p className={`font-black text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            <span className="text-xs mr-0.5 opacity-80" style={{color: colorPrimario}}>S/</span>{parseFloat(plato.precio_base).toFixed(2)}
                          </p>
                        ) : (
                          <div className="px-2 py-1 rounded border inline-block" style={{ backgroundColor: colorPrimario + '10', borderColor: colorPrimario + '30' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: colorPrimario }}>Variable</span>
                          </div>
                        )}
                      </div>
                      
                      {/* ACCIONES */}
                      <div className="flex gap-2.5 shrink-0 z-10">
                        
                        {/* ✨ INTERRUPTOR (Toggle Switch) */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); onToggleDisponibilidad(plato); }}
                          className={`w-14 h-8 rounded-full border p-1 flex items-center transition-all ${
                            plato.disponible 
                              ? `bg-green-500/10 border-green-500/30 justify-end shadow-inner` 
                              : `justify-start shadow-inner ${isDark ? 'bg-[#222] border-[#333]' : 'bg-gray-100 border-gray-200'}`
                          }`}
                          title={`Click para marcar como ${plato.disponible ? 'Agotado' : 'Disponible'}`}
                        >
                          <div 
                            className={`w-6 h-6 rounded-full transition-all shadow-md ${
                              plato.disponible 
                                ? 'bg-green-500' 
                                : ` ${isDark ? 'bg-neutral-600' : 'bg-gray-300'}`
                            }`}
                          />
                        </button>

                        {/* ✨ ÍCONO DE RECETA/VARIACIÓN (Cambiado para no parecer un tacho) */}
                        {esDueño && (
                          esVariable ? (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onOpenVariaciones(plato); }}
                              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors border text-sm ${
                                isDark ? 'bg-[#1a1a1a] border-[#333] text-neutral-400 hover:text-white hover:bg-[#333]' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              title="Configurar Variaciones"
                            >
                              <i className="fi fi-rr-list mt-0.5"></i>
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onOpenReceta(plato); }}
                              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors border text-sm ${
                                isDark ? 'bg-[#1a1a1a] border-[#333] text-neutral-400 hover:text-white hover:bg-[#333]' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                              }`}
                              title="Receta del Plato"
                            >
                              {/* Libro de Recetas (Nada de basureros) */}
                              <i className="fi fi-rr-book-alt mt-0.5"></i> 
                            </button>
                          )
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