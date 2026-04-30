import React, { useState } from 'react';

export default function MenuTemaLista({ mesaId, productos, categorias, ordenActiva, carta, fuentes, colorAcento, vistaActiva, setVistaActiva }) {
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');

  const productosFiltrados = productos.filter(plato => {
    if (categoriaActiva === 'Todas') return true;
    const nombreCat = categorias.find(c => String(c.id) === String(plato.categoria))?.nombre || plato.categoria;
    return nombreCat === categoriaActiva;
  });

  return (
    <div className="animate-fadeIn">
      {/* 1. CABECERA (Misma estructura, diseño limpio) */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b p-5 flex justify-between items-center" style={{ background: `rgba(0,0,0,0.85)`, borderColor: '#262626' }}>
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {carta.logoUrl ? (
              <img src={carta.logoUrl} alt="logo" className="w-10 h-10 object-contain rounded-xl shadow-lg border border-white/10" style={{ background: colorAcento + '15' }} />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg border border-white/10" style={{ backgroundColor: colorAcento + '22', color: colorAcento, fontFamily: fuentes.titulos }}>
                {carta.nombreNegocio ? carta.nombreNegocio.charAt(0).toUpperCase() : 'B'}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none" style={{ fontFamily: fuentes.titulos }}>{carta.nombreNegocio || 'Menú'}<span style={{ color: colorAcento }}>.</span></h1>
            <p className="text-[8px] font-bold uppercase tracking-[0.25em] mt-1" style={{ color: colorAcento + 'aa', fontFamily: fuentes.cuerpo }}>{carta.slogan || 'Menú Digital'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-black/60 border border-[#333] px-3 py-1.5 rounded-xl">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorAcento }} />
          <span className="text-[10px] font-black tracking-widest text-white">MESA {mesaId}</span>
        </div>
      </header>

      {/* 2. TABS */}
      <div className="p-5">
        <div className="flex bg-black/40 p-1.5 rounded-xl border border-[#262626] shadow-lg">
          <button onClick={() => setVistaActiva('menu')} className={`flex-1 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all ${vistaActiva === 'menu' ? 'shadow-md scale-[0.98]' : 'text-neutral-500'}`} style={vistaActiva === 'menu' ? { backgroundColor: colorAcento, color: 'white' } : {}}>La Carta</button>
          <button onClick={() => setVistaActiva('cuenta')} className={`flex-1 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest transition-all relative ${vistaActiva === 'cuenta' ? 'shadow-md scale-[0.98]' : 'text-neutral-500'}`} style={vistaActiva === 'cuenta' ? { backgroundColor: colorAcento, color: 'white' } : {}}>
            Mi Cuenta
            {ordenActiva && vistaActiva !== 'cuenta' && <span className="absolute top-2 right-2 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: colorAcento }} /><span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: colorAcento }} /></span>}
          </button>
        </div>
      </div>

      {/* 3. VISTA: MENÚ */}
      {vistaActiva === 'menu' && (
        <div className="animate-fadeIn">
          <div className="flex overflow-x-auto gap-3 px-5 pb-6 pt-2 custom-scrollbar mask-fade-edges">
            <button onClick={() => setCategoriaActiva('Todas')} className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${categoriaActiva === 'Todas' ? 'text-black shadow-lg' : 'bg-[#1a1a1a] text-neutral-400'}`} style={categoriaActiva === 'Todas' ? { backgroundColor: colorAcento } : {}}>Todas</button>
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setCategoriaActiva(cat.nombre)} className={`px-5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${categoriaActiva === cat.nombre ? 'text-black shadow-lg' : 'bg-[#1a1a1a] text-neutral-400'}`} style={categoriaActiva === cat.nombre ? { backgroundColor: colorAcento } : {}}>{cat.nombre}</button>
            ))}
          </div>

          <div className="px-5 space-y-4">
            {productosFiltrados.map(plato => (
              <div key={plato.id} className="bg-[#0d0d0d]/90 backdrop-blur-md border border-white/10 rounded-3xl p-3 flex gap-4 items-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#1a1a1a] rounded-2xl shrink-0 flex items-center justify-center relative overflow-hidden shadow-inner">
                   {plato.imagenUrl ? <img src={plato.imagenUrl} alt={plato.nombre} className="w-full h-full object-cover" /> : <span className="text-4xl opacity-80">🍕</span>}
                </div>
                <div className="flex-1 py-1 pr-2">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-base sm:text-lg text-white leading-tight" style={{ fontFamily: fuentes.titulos }}>{plato.nombre}</h3>
                    {carta.mostrarBadge && plato.es_popular && <span className="text-xl leading-none" title="Top Ventas">🔥</span>}
                  </div>
                  {carta.mostrarDesc && <p className="text-[10px] text-neutral-400 line-clamp-2 mb-2 leading-relaxed" style={{ fontFamily: fuentes.cuerpo }}>{plato.descripcion || 'Perfecto para compartir.'}</p>}
                  <div className="flex items-center justify-between mt-2">
                    {carta.mostrarCalor ? <span className="text-[9px] bg-white/5 px-2 py-1 rounded text-neutral-400 font-mono">{plato.calorias || '350'} kcal</span> : <span />}
                    <span className="font-black text-lg" style={{ color: colorAcento, fontFamily: fuentes.titulos }}>S/ {parseFloat(plato.precio_base).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. VISTA: CUENTA (Misma lógica que TemaGrid) */}
      {vistaActiva === 'cuenta' && (
          <div className="px-5 animate-fadeIn pb-10">
          {!ordenActiva ? (
            <div className="bg-[#0d0d0d]/90 border border-white/10 rounded-3xl p-10 text-center mt-2 shadow-2xl flex flex-col items-center">
              <span className="text-5xl mb-4">🍽️</span>
              <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: fuentes.titulos }}>Sin pedidos activos</h2>
              <p className="text-neutral-500 text-sm" style={{ fontFamily: fuentes.cuerpo }}>Aún no has ordenado nada en esta mesa.</p>
            </div>
          ) : (
            <div className="bg-[#0d0d0d]/90 mt-2 shadow-2xl rounded-3xl overflow-hidden border border-white/10">
              <div className="h-1 w-full" style={{ backgroundColor: colorAcento }} />
              <div className="p-6">
                <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: fuentes.titulos }}>Detalle de Cuenta</h2>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase text-black" style={{ backgroundColor: colorAcento }}>{ordenActiva.estado}</span>
                </div>
                <div className="space-y-4">
                  {ordenActiva.detalles.map((det, i) => (
                    <div key={i} className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-white/10 text-white text-xs font-black w-6 h-6 flex items-center justify-center rounded-full">{det.cantidad}</span>
                        <p className="text-sm text-white" style={{ fontFamily: fuentes.cuerpo }}>{det.producto_nombre || det.producto?.nombre}</p>
                      </div>
                      <p className="text-sm font-bold text-white" style={{ fontFamily: fuentes.titulos }}>S/ {(det.precio_unitario * det.cantidad).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-end mt-6">
                  <p className="text-xs uppercase tracking-widest text-neutral-400 font-bold" style={{ fontFamily: fuentes.cuerpo }}>Total</p>
                  <p className="text-3xl font-black" style={{ color: colorAcento, fontFamily: fuentes.titulos }}>S/ {parseFloat(ordenActiva.total).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}