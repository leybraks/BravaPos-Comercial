import React from 'react';

export default function PosHeader({
  esModoTerminal,
  onVolver,
  tema,
  colorPrimario,
  esParaLlevar,
  nombreLlevar,
  mesaId,
  inputBusquedaActivo,
  setInputBusquedaActivo,
  busqueda,
  setBusqueda,
  categoriaActiva,
  setCategoriaActiva,
  categoriasReales,
  productosBase
}) {
  return (
    <>
      {/* ======================= HEADER TEMATIZADO (MÓVIL) ======================= */}
      {!esModoTerminal && (
        <header className={`p-4 shadow-sm sticky top-0 z-10 border-b transition-colors ${tema === 'dark' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between items-center mb-3 gap-3">
            <div className="flex items-center gap-3 flex-1">
              <button onClick={onVolver} className={`shrink-0 w-10 h-10 border rounded-xl flex items-center justify-center transition-colors font-black text-xl active:scale-95 ${tema === 'dark' ? 'bg-[#1a1a1a] hover:bg-[#222] border-[#222] text-white' : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-800'}`}>←</button>
              
              {inputBusquedaActivo ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input 
                      autoFocus
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar plato..."
                      className={`w-full h-10 px-4 rounded-xl font-bold text-sm border focus:outline-none focus:border-[#ff5a1f] ${tema === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      style={{ borderColor: busqueda ? colorPrimario : '' }}
                    />
                    <button onClick={() => { setInputBusquedaActivo(false); setBusqueda(''); }} className={`text-xl px-2 font-black active:scale-90 ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>✕</button>
                  </div>
              ) : (
                <div className="flex-1 flex justify-between items-center">
                  <div className="min-w-0">
                      <span className={`text-[10px] font-bold tracking-widest uppercase truncate block ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                        {esParaLlevar ? 'Cajón delivery' : '🍽️ SALÓN'}
                      </span>
                      <h1 className={`text-xl font-black uppercase tracking-tight truncate ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {esParaLlevar ? nombreLlevar : `Mesa ${mesaId}`}
                      </h1>
                  </div>
                  <button onClick={() => setInputBusquedaActivo(true)} className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg active:scale-95 transition-colors ${tema === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-300' : 'bg-gray-100 border border-gray-200 text-gray-600'}`}>
                    🔍
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
            <button 
              onClick={() => setCategoriaActiva('Todas')}
              className={`snap-start shrink-0 px-5 py-2.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 border ${
                categoriaActiva === 'Todas' 
                  ? `text-white shadow-md border-transparent` 
                  : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#333]' : 'bg-gray-100 text-gray-500 border-gray-200')
              }`}
              style={categoriaActiva === 'Todas' ? { backgroundColor: colorPrimario } : {}}
            >
              TODAS
            </button>
            
            {categoriasReales
              .filter(cat => productosBase.some(prod => String(prod.categoria) === String(cat.id) || prod.categoria === cat.nombre || prod.categoria === cat))
              .map((cat, index) => {
              const nombreMostrar = cat.nombre || cat;
              const keyUnica = cat.id || `cat-${index}`;
              return (
                <button 
                  key={keyUnica} 
                  onClick={() => setCategoriaActiva(nombreMostrar)}
                  className={`snap-start shrink-0 px-5 py-2.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 border ${
                    categoriaActiva === nombreMostrar
                      ? `text-white shadow-md border-transparent` 
                      : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#333]' : 'bg-gray-100 text-gray-500 border-gray-200')
                  }`}
                  style={categoriaActiva === nombreMostrar ? { backgroundColor: colorPrimario } : {}}
                >
                  {nombreMostrar}
                </button>
              )
            })}
          </div>
        </header>
      )}

      {/* ======================= HEADER MODO TERMINAL (PC PANTALLA DIVIDIDA) ======================= */}
      {esModoTerminal && (
        <div className={`px-4 sm:px-6 pt-4 pb-2 sticky top-0 z-10 border-b transition-colors shadow-sm ${tema === 'dark' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-white border-gray-200'}`}>
           <div className="mb-4">
             {inputBusquedaActivo ? (
                <div className="flex items-center gap-2">
                  <input 
                    autoFocus
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar plato rápidamente..."
                    className={`w-full h-12 px-5 rounded-2xl font-black text-sm border focus:outline-none transition-colors ${tema === 'dark' ? 'bg-[#111] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                    style={{ borderColor: busqueda ? colorPrimario : '', boxShadow: busqueda ? `0 0 0 2px ${colorPrimario}33` : '' }}
                  />
                  <button onClick={() => { setInputBusquedaActivo(false); setBusqueda(''); }} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black active:scale-95 ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border border-[#333]' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>✕</button>
                </div>
             ) : (
                <button 
                  onClick={() => setInputBusquedaActivo(true)} 
                  className={`w-full h-12 px-5 rounded-2xl font-bold text-sm border flex items-center justify-between transition-colors active:scale-[0.99] ${tema === 'dark' ? 'bg-[#111] border-[#333] text-neutral-400 hover:bg-[#1a1a1a]' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'}`}
                >
                  <span>🔍 Buscar por nombre o atajo...</span>
                  <span className={`text-[10px] font-black px-2 py-1 rounded border ${tema === 'dark' ? 'bg-[#222] border-[#444]' : 'bg-white border-gray-300'}`}>Ctrl + K</span>
                </button>
             )}
           </div>

           <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide snap-x">
              <button 
                onClick={() => setCategoriaActiva('Todas')}
                className={`snap-start shrink-0 px-5 py-2.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 border ${
                  categoriaActiva === 'Todas' 
                    ? `text-white shadow-md border-transparent` 
                    : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#333]' : 'bg-gray-100 text-gray-500 border-gray-200')
                }`}
                style={categoriaActiva === 'Todas' ? { backgroundColor: colorPrimario } : {}}
              >
                TODAS
              </button>

              {categoriasReales
                .filter(cat => productosBase.some(prod => String(prod.categoria) === String(cat.id) || prod.categoria === cat.nombre || prod.categoria === cat))
                .map((cat, index) => {
                const nombreMostrar = cat.nombre || cat;
                const keyUnica = cat.id || `cat-${index}`;
                return (
                  <button 
                    key={keyUnica} 
                    onClick={() => setCategoriaActiva(nombreMostrar)}
                    className={`snap-start shrink-0 px-5 py-2.5 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all active:scale-95 border ${
                      categoriaActiva === nombreMostrar
                        ? `text-white shadow-md border-transparent` 
                        : (tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-400 border-[#333]' : 'bg-gray-100 text-gray-500 border-gray-200')
                    }`}
                    style={categoriaActiva === nombreMostrar ? { backgroundColor: colorPrimario } : {}}
                  >
                    {nombreMostrar}
                  </button>
                )
              })}
           </div>
        </div>
      )}
    </>
  );
}