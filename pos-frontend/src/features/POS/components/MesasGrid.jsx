import React, { useMemo } from 'react';

export default function MesasGrid({
  mesas, modoUnir, mesaPrincipal, mesaActivaId, manejarClickMesa,
  mostrarPuertaMovil, setMostrarPuertaMovil, tema, colorPrimario, sedeActualId, sedes
}) {
  const mesasAgrupadas = useMemo(() => {
    return mesas.filter(m => m.estado !== 'unida').map(mesaPadre => {
      const hijas = mesas.filter(m => m.unida_a === mesaPadre.id);
      return {
        ...mesaPadre,
        mesasInvolucradas: [mesaPadre.numero, ...hijas.map(h => h.numero)],
        esGigante: hijas.length > 0,
        capacidadTotal: mesaPadre.capacidad + hijas.reduce((sum, h) => sum + h.capacidad, 0)
      };
    });
  }, [mesas]);

  const sedeActual = sedes.find(s => String(s.id) === String(sedeActualId));
  const COLUMNAS_MAPA = sedeActual?.columnas_salon || 3; 

  let maxPos = 0;
  const mapaMesas = {};
  mesasAgrupadas.forEach((mesa) => {
    let pos = mesa.posicion_x;
    if (pos === undefined || pos === null || mapaMesas[pos]) {
        pos = 0;
        while(mapaMesas[pos]) pos++; 
    }
    mapaMesas[pos] = mesa;
    if (pos > maxPos) maxPos = pos;
  });

  const baseCasillas = Math.max(maxPos + 1, mesasAgrupadas.length, 12);
  const totalCasillas = Math.ceil(baseCasillas / COLUMNAS_MAPA) * COLUMNAS_MAPA; 
  const casillasArrayMovil = Array.from({ length: totalCasillas }, (_, i) => i);
  const mesasOrdenadasPC = [...mesasAgrupadas].sort((a, b) => (a.posicion_x || 0) - (b.posicion_x || 0));

  const getCardStyle = (mesa) => {
    const estado = mesa.estado?.toLowerCase() || 'libre';
    const esOcupada = estado === 'ocupada';
    // ✨ AQUÍ ESTABA EL BUG: Ahora busca 'pidiendo'
    const esPidiendo = estado === 'pidiendo'; 
    const esCobrando = estado === 'cobrando';
    const esLaMesaActiva = mesaActivaId === mesa.id;

    let cardStyle = tema === 'dark' ? "bg-[#161616] border-[#2a2a2a] hover:bg-[#1a1a1a] active:bg-[#1a1a1a]" : "bg-white border-gray-200 shadow-sm hover:shadow-md active:bg-gray-50"; 
    let badgeStyle = tema === 'dark' ? "bg-[#222222] text-neutral-400" : "bg-gray-100 text-gray-500";
    let titleStyle = tema === 'dark' ? "text-white" : "text-gray-900";
    let inlineCardStyle = {};
    let icono = null;
    let labelEstado = estado;

    if (esLaMesaActiva) {
      cardStyle = "scale-105 z-10 border-white ring-2 ring-white";
      inlineCardStyle = { ...inlineCardStyle, filter: 'brightness(1.2)' };
    }
    if (esOcupada) {
      cardStyle = ""; inlineCardStyle = { backgroundColor: tema === 'dark' ? `${colorPrimario}0D` : `${colorPrimario}0A`, borderColor: `${colorPrimario}60`, boxShadow: `0 4px 20px ${colorPrimario}10` }; badgeStyle = ""; icono = '🍴'; labelEstado = 'ocupada';
    }
    if (esPidiendo) {
      cardStyle = ""; inlineCardStyle = { backgroundColor: tema === 'dark' ? '#fbbf2408' : '#fef9c3', borderColor: '#fbbf24aa', boxShadow: '0 4px 20px #fbbf2415' }; badgeStyle = "bg-yellow-400/20 text-yellow-400"; icono = '📝'; labelEstado = 'pidiendo';
    }
    if (esCobrando) {
      // ✨ CAMBIO: Pasamos el Cobrando a color Naranja en vez de morado
      cardStyle = ""; inlineCardStyle = { backgroundColor: tema === 'dark' ? '#f9731608' : '#fff7ed', borderColor: '#f97316aa', boxShadow: '0 4px 20px #f9731615' }; badgeStyle = "bg-orange-400/20 text-orange-400"; icono = '💳'; labelEstado = 'cobrando';
    }
    if (modoUnir && mesaPrincipal === mesa.id) {
      cardStyle = "text-white scale-[1.02] z-10"; inlineCardStyle = { backgroundColor: colorPrimario, borderColor: colorPrimario, boxShadow: `0 4px 15px ${colorPrimario}4D` }; badgeStyle = "bg-white/20 text-white"; titleStyle = "text-white";
    }

    return { cardStyle, badgeStyle, titleStyle, inlineCardStyle, icono, labelEstado, esOcupada };
  };

  return (
    <div className="p-4 md:p-5 flex-1 flex flex-col animate-fadeIn">
      {modoUnir && (
        <div className="p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 animate-pulse border shadow-md w-full max-w-3xl mx-auto md:max-w-none" style={{ backgroundColor: `${colorPrimario}1A`, borderColor: `${colorPrimario}4D`, color: colorPrimario }}>
          <span className="text-xl">🔗</span>
          <span className="font-bold">{mesaPrincipal ? `Selecciona la mesa que se unirá a la Mesa ${mesaPrincipal}...` : 'Paso 1: Selecciona la Mesa Principal (la que recibirá la cuenta)...'}</span>
        </div>
      )}

      <div className="flex justify-end items-center mb-5 w-full max-w-3xl mx-auto md:max-w-none md:justify-end">
        <button onClick={() => setMostrarPuertaMovil(!mostrarPuertaMovil)} className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg border transition-all active:scale-95 w-full sm:w-auto shadow-sm" style={mostrarPuertaMovil ? { backgroundColor: colorPrimario, color: 'white', borderColor: colorPrimario } : { backgroundColor: `${colorPrimario}1A`, color: colorPrimario, borderColor: `${colorPrimario}40` }}>
          {mostrarPuertaMovil ? 'Ocultar Orientación' : '📍 Activar Orientación'}
        </button>
      </div>

      {mostrarPuertaMovil && (
        <div className={`w-full max-w-3xl mx-auto md:max-w-none py-3 rounded-xl mb-4 text-[10px] font-black text-center uppercase tracking-[0.2em] shadow-inner border border-dashed ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-500 border-[#333]' : 'bg-gray-100 text-gray-400 border-gray-300'}`}>Entrada Principal 🚪</div>
      )}

      {/* GRID MÓVIL */}
      <div className="md:hidden w-full max-w-3xl mx-auto">
        <div className="grid gap-3 pb-10" style={{ gridTemplateColumns: `repeat(${COLUMNAS_MAPA}, minmax(0, 1fr))` }}>
          {casillasArrayMovil.map((i) => {
            const mesa = mapaMesas[i];
            if (!mesa) return <div key={`hueco-movil-${i}`} className="h-32 rounded-3xl border-2 border-dashed border-transparent pointer-events-none"></div>;
            const { cardStyle, badgeStyle, titleStyle, inlineCardStyle, icono, labelEstado, esOcupada } = getCardStyle(mesa);

            return (
              <button key={`movil-${mesa.id}`} onClick={() => manejarClickMesa(mesa)} style={inlineCardStyle} className={`border-[1.5px] rounded-3xl p-3.5 flex flex-col active:scale-95 text-left h-32 relative transition-all ${cardStyle} ${mesa.esGigante ? 'col-span-2' : ''}`}>
                <div className="flex justify-between items-start w-full mb-1">
                  <div className="flex gap-1.5 flex-wrap"><span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${badgeStyle}`} style={esOcupada && !modoUnir ? { backgroundColor: `${colorPrimario}20`, color: colorPrimario } : {}}>{mesa.esGigante ? 'GRUPO' : labelEstado}</span></div>
                  {icono && !modoUnir && <span className="opacity-70 text-sm">{icono}</span>}
                </div>
                <div className="flex-1 flex items-center justify-center w-full"><h3 className={`font-black tracking-tight leading-none ${mesa.esGigante ? 'text-2xl' : 'text-xl'} ${titleStyle}`}>{mesa.esGigante ? mesa.mesasInvolucradas.join(' + ') : mesa.numero}</h3></div>
              </button>
            );
          })}
        </div>
      </div>

      {/* GRID PC */}
      <div className="hidden md:grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-10 w-full">
        {mesasOrdenadasPC.map((mesa) => {
          const { cardStyle, badgeStyle, titleStyle, inlineCardStyle, icono, labelEstado, esOcupada } = getCardStyle(mesa);
          return (
            <button key={`pc-${mesa.id}`} onClick={() => manejarClickMesa(mesa)} style={inlineCardStyle} className={`border-[1.5px] rounded-3xl p-4 flex flex-col transition-all active:scale-95 text-left h-40 relative ${cardStyle} ${mesa.esGigante ? 'col-span-2' : ''}`}>
              <div className="flex justify-between items-start w-full mb-2">
                <div className="flex gap-2 flex-wrap"><span className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest ${badgeStyle}`} style={esOcupada && !modoUnir ? { backgroundColor: `${colorPrimario}20`, color: colorPrimario } : {}}>{mesa.esGigante ? 'GRUPO' : labelEstado}</span></div>
                {icono && !modoUnir && <span className="opacity-50 text-sm">{icono}</span>}
              </div>
              <div className="flex-1 flex items-center justify-center w-full"><h3 className={`font-black tracking-tight ${mesa.esGigante ? 'text-4xl' : 'text-3xl'} ${titleStyle}`}>{mesa.esGigante ? mesa.mesasInvolucradas.join(' + ') : `Mesa ${mesa.numero}`}</h3></div>
              <div className={`w-full flex justify-center items-center gap-1.5 mt-2 ${modoUnir && mesaPrincipal === mesa.id ? 'text-white/80' : (tema === 'dark' ? 'text-neutral-500' : 'text-gray-400')}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                <span className="text-[11px] font-bold">{mesa.capacidadTotal || mesa.capacidad} pax</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}