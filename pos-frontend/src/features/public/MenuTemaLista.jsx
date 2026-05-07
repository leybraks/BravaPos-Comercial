import React, { useState } from 'react';

export default function MenuTemaHero({ mesaId, productos, categorias, ordenActiva, carta, fuentes, colorAcento, vistaActiva, setVistaActiva }) {
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');

  const productosFiltrados = productos.filter(plato => {
    if (categoriaActiva === 'Todas') return true;
    const nombreCat = categorias.find(c => String(c.id) === String(plato.categoria))?.nombre || plato.categoria;
    return nombreCat === categoriaActiva;
  });

  return (
    <div className="animate-fadeIn">
      {/* 1. CABECERA TRANSPARENTE (Hero Style) */}
      <header className="sticky top-0 z-50 p-5 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            {carta.logoUrl ? (
              <img src={carta.logoUrl} alt="logo" className="w-14 h-14 object-contain rounded-full shadow-2xl border-2 border-white/10" style={{ background: colorAcento + '15' }} />
            ) : (
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-3xl shadow-2xl border-2 border-white/10" style={{ backgroundColor: colorAcento + '22', color: colorAcento, fontFamily: fuentes.titulos }}>
                {carta.nombreNegocio ? carta.nombreNegocio.charAt(0).toUpperCase() : 'B'}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none shadow-black drop-shadow-md" style={{ fontFamily: fuentes.titulos }}>{carta.nombreNegocio || 'Menú'}<span style={{ color: colorAcento }}>.</span></h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] mt-1 shadow-black drop-shadow-md" style={{ color: colorAcento + 'dd', fontFamily: fuentes.cuerpo }}>{carta.slogan || 'Menú Digital'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] uppercase tracking-widest text-white/50 font-bold mb-0.5">Mesa</span>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorAcento }} />
            <span className="text-xs font-black text-white">{mesaId}</span>
          </div>
        </div>
      </header>

      {/* 2. TABS */}
      <div className="px-5 mt-2 mb-6">
        <div className="flex bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 shadow-2xl">
          <button onClick={() => setVistaActiva('menu')} className={`flex-1 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all ${vistaActiva === 'menu' ? 'shadow-lg scale-[0.98]' : 'text-neutral-400'}`} style={vistaActiva === 'menu' ? { backgroundColor: colorAcento, color: 'white' } : {}}>Carta</button>
          <button onClick={() => setVistaActiva('cuenta')} className={`flex-1 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all relative ${vistaActiva === 'cuenta' ? 'shadow-lg scale-[0.98]' : 'text-neutral-400'}`} style={vistaActiva === 'cuenta' ? { backgroundColor: colorAcento, color: 'white' } : {}}>
            Cuenta
            {ordenActiva && vistaActiva !== 'cuenta' && <span className="absolute top-2 right-4 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: colorAcento }} /><span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: colorAcento }} /></span>}
          </button>
        </div>
      </div>

      {/* 3. VISTA: MENÚ */}
      {vistaActiva === 'menu' && (
        <div className="animate-fadeIn">
          <div className="flex overflow-x-auto gap-2 px-5 pb-6 pt-2 custom-scrollbar mask-fade-edges">
            <button onClick={() => setCategoriaActiva('Todas')} className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${categoriaActiva === 'Todas' ? 'text-black shadow-lg border-transparent' : 'bg-transparent text-white border-white/20'}`} style={categoriaActiva === 'Todas' ? { backgroundColor: colorAcento } : {}}>Todas</button>
            {categorias.map(cat => (
              <button key={cat.id} onClick={() => setCategoriaActiva(cat.nombre)} className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all border ${categoriaActiva === cat.nombre ? 'text-black shadow-lg border-transparent' : 'bg-transparent text-white border-white/20'}`} style={categoriaActiva === cat.nombre ? { backgroundColor: colorAcento } : {}}>{cat.nombre}</button>
            ))}
          </div>

          <div className="px-5 space-y-8">
            {productosFiltrados.map(plato => (
              <div key={plato.id} className="bg-[#111111]/80 backdrop-blur-lg rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl pb-2">
                <div className="w-full h-52 bg-[#1a1a1a] relative flex items-center justify-center">
                  {plato.imagenUrl ? <img src={plato.imagenUrl} alt={plato.nombre} className="w-full h-full object-cover" /> : <span className="text-7xl opacity-40">🌮</span>}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-black/20 to-transparent" />
                </div>
                
                <div className="p-6 relative -mt-8">
                  <div className="flex justify-between items-end mb-4">
                    <h3 className="font-black text-2xl text-white leading-none tracking-tight shadow-black drop-shadow-lg" style={{ fontFamily: fuentes.titulos }}>{plato.nombre}</h3>
                    <div className="bg-[#111] border border-white/10 px-4 py-2 rounded-2xl shadow-xl">
                      <span className="font-black text-xl" style={{ color: colorAcento, fontFamily: fuentes.titulos }}>
                        {(() => {
                          const base = parseFloat(plato.precio_base ?? 0);
                          const min  = parseFloat(plato.precio_minimo ?? base);
                          const max  = parseFloat(plato.precio_maximo ?? base);
                          const desde = plato.tiene_variaciones && min !== max;
                          return desde
                            ? <><span style={{ fontSize: 12, opacity: 0.7 }}>Desde </span>S/ {min.toFixed(2)}</>
                            : <>S/ {min.toFixed(2)}</>;
                        })()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {plato.destacar_como_promocion && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-white px-2 py-1 rounded-lg" style={{ background: 'linear-gradient(90deg,#e11d48,#f97316)' }}>
                        🔥 Promo
                      </span>
                    )}
                    {carta.mostrarBadge && plato.es_popular && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-black px-2 py-1 rounded-lg" style={{ backgroundColor: colorAcento }}>
                        ⭐ Favorito
                      </span>
                    )}
                    <span className="text-xs text-neutral-400 font-bold px-2 py-1 bg-white/5 rounded-lg border border-white/5">🍽️ {plato.categoria}</span>
                  </div>

                  {carta.mostrarDesc && <p className="text-sm text-neutral-400 leading-relaxed" style={{ fontFamily: fuentes.cuerpo }}>{plato.descripcion || 'Una explosión de sabor con ingredientes frescos y nuestra receta secreta.'}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. VISTA: CUENTA */}
      {vistaActiva === 'cuenta' && (
        <div className="px-5 animate-fadeIn pb-10">
          {!ordenActiva ? (
            <div className="bg-[#111111]/80 backdrop-blur-lg border border-white/10 rounded-[2.5rem] p-10 text-center mt-2 shadow-2xl flex flex-col items-center">
              <span className="text-6xl mb-6 opacity-80">🍹</span>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight" style={{ fontFamily: fuentes.titulos }}>Mesa Libre</h2>
              <p className="text-neutral-400 text-sm leading-relaxed" style={{ fontFamily: fuentes.cuerpo }}>El mesero tomará tu pedido en breve.</p>
            </div>
          ) : (
            <div className="bg-[#111111]/80 backdrop-blur-lg mt-2 shadow-2xl rounded-[2.5rem] overflow-hidden border border-white/10">
              <div className="p-8">
                <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/10">
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight" style={{ fontFamily: fuentes.titulos }}>Tu Ticket</h2>
                    <p className="text-xs text-neutral-500 font-mono mt-1">#ORD-{ordenActiva.id.toString().padStart(4, '0')}</p>
                  </div>
                  <span className="px-4 py-2 rounded-2xl text-xs font-black uppercase text-black" style={{ backgroundColor: colorAcento }}>{ordenActiva.estado}</span>
                </div>
                <div className="space-y-6">
                  {ordenActiva.detalles.map((det, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <span className="bg-white/5 border border-white/10 text-white text-xs font-black w-8 h-8 flex items-center justify-center rounded-xl">{det.cantidad}</span>
                        <p className="text-base text-white font-bold" style={{ fontFamily: fuentes.cuerpo }}>{det.producto_nombre || det.producto?.nombre}</p>
                      </div>
                      <p className="text-base font-black text-white" style={{ fontFamily: fuentes.titulos }}>S/ {(det.precio_unitario * det.cantidad).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-6 border-t-2 border-dashed border-white/10 flex justify-between items-end">
                  <p className="text-sm uppercase tracking-widest text-neutral-400 font-bold" style={{ fontFamily: fuentes.cuerpo }}>Total</p>
                  <p className="text-5xl font-black tracking-tighter" style={{ color: colorAcento, fontFamily: fuentes.titulos }}>S/ {parseFloat(ordenActiva.total).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}