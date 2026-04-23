import React, { useMemo } from 'react';

export default function TerminalMesasGrid({
  mesas, modoUnir, mesaPrincipal, mesaSeleccionada, manejarClickMesa,
  mostrarPuertaMovil, setMostrarPuertaMovil, tema, colorPrimario, sedeActual
}) {
  const mesasAgrupadas = useMemo(() => {
    return mesas.filter((m) => m.estado !== 'unida').map((padre) => {
      const hijas = mesas.filter((m) => m.unida_a === padre.id);
      return { ...padre, mesasInvolucradas: [padre.numero, ...hijas.map((h) => h.numero)], esGigante: hijas.length > 0, capacidadTotal: padre.capacidad + hijas.reduce((s, h) => s + h.capacidad, 0) };
    });
  }, [mesas]);

  const COLUMNAS_MAPA = sedeActual?.columnas_salon || 3;
  const mapaMesas = {};
  let maxPos = 0;
  mesasAgrupadas.forEach((m) => {
    let pos = m.posicion_x;
    if (pos === undefined || pos === null || mapaMesas[pos]) { pos = 0; while (mapaMesas[pos]) pos++; }
    mapaMesas[pos] = m; if (pos > maxPos) maxPos = pos;
  });
  const baseCasillas = Math.max(maxPos + 1, mesasAgrupadas.length, 12);
  const totalCasillas = Math.ceil(baseCasillas / COLUMNAS_MAPA) * COLUMNAS_MAPA;
  const casillasMovil = Array.from({ length: totalCasillas }, (_, i) => i);
  const mesasPC = [...mesasAgrupadas].sort((a, b) => (a.posicion_x || 0) - (b.posicion_x || 0));

  const getEstilosMesa = (mesa, variant = 'pc') => {
    const esOcupada = mesa.estado === 'ocupada';
    const esTomando = mesa.estado === 'tomando_pedido';
    const esCobrando = mesa.estado === 'cobrando';
    const esPrincipal = modoUnir && mesaPrincipal === mesa.id;
    const esActiva = mesaSeleccionada === mesa.id;

    let cardClass = tema === 'dark' ? `bg-[#161616] border-[#2a2a2a] ${variant === 'pc' ? 'hover:bg-[#1a1a1a]' : 'active:bg-[#1a1a1a]'}` : `bg-white border-gray-200 shadow-sm ${variant === 'pc' ? 'hover:shadow-md' : 'active:bg-gray-50'}`;
    let badgeClass = tema === 'dark' ? 'bg-[#222] text-neutral-400' : 'bg-gray-100 text-gray-500';
    let titleClass = tema === 'dark' ? 'text-white' : 'text-gray-900';
    let inlineStyle = {};
    let icono = null; let labelEstado = mesa.estado;

    if (esActiva && !modoUnir) inlineStyle = { outline: `2px solid ${colorPrimario}`, outlineOffset: '2px' };
    if (esOcupada) { cardClass = ''; inlineStyle = { ...inlineStyle, backgroundColor: tema === 'dark' ? `${colorPrimario}0D` : `${colorPrimario}0A`, borderColor: `${colorPrimario}60`, boxShadow: `0 4px 20px ${colorPrimario}10` }; badgeClass = ''; icono = '🍴'; labelEstado = 'ocupada'; }
    if (esTomando) { cardClass = ''; inlineStyle = { backgroundColor: tema === 'dark' ? '#fbbf2408' : '#fef9c3', borderColor: '#fbbf24aa', boxShadow: '0 4px 20px #fbbf2415' }; badgeClass = 'bg-yellow-400/20 text-yellow-400'; icono = '📝'; labelEstado = 'pidiendo'; }
    if (esCobrando) { cardClass = ''; inlineStyle = { backgroundColor: tema === 'dark' ? '#a855f708' : '#faf5ff', borderColor: '#a855f7aa', boxShadow: '0 4px 20px #a855f715' }; badgeClass = 'bg-purple-400/20 text-purple-400'; icono = '💳'; labelEstado = 'cobrando'; }
    if (esPrincipal) { cardClass = 'scale-105 z-10 text-white'; inlineStyle = { backgroundColor: colorPrimario, borderColor: colorPrimario, boxShadow: `0 10px 30px ${colorPrimario}60` }; badgeClass = 'bg-white/20 text-white'; titleClass = 'text-white'; }

    return { cardClass, badgeClass, titleClass, inlineStyle, icono, labelEstado, esOcupada };
  };

  return (
    <div className="p-4 md:p-5 flex flex-col animate-fadeIn">
      {modoUnir && (
        <div className="p-4 rounded-2xl mb-5 text-sm flex items-center gap-3 animate-pulse border w-full max-w-3xl mx-auto md:max-w-none" style={{ backgroundColor: `${colorPrimario}1A`, borderColor: `${colorPrimario}4D`, color: colorPrimario }}>
          <span className="text-xl">🔗</span>
          <span className="font-bold">{mesaPrincipal ? `Selecciona la mesa que se unirá a Mesa ${mesaPrincipal}...` : 'Paso 1: Selecciona la Mesa Principal...'}</span>
        </div>
      )}

      <div className="flex justify-end mb-4 w-full max-w-3xl mx-auto md:max-w-none lg:hidden">
        <button onClick={() => setMostrarPuertaMovil(!mostrarPuertaMovil)} className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg border transition-all active:scale-95 w-full sm:w-auto shadow-sm" style={mostrarPuertaMovil ? { backgroundColor: colorPrimario, color: 'white', borderColor: colorPrimario } : { backgroundColor: `${colorPrimario}1A`, color: colorPrimario, borderColor: `${colorPrimario}40` }}>
          {mostrarPuertaMovil ? 'Ocultar Orientación' : '📍 Activar Orientación'}
        </button>
      </div>
      {mostrarPuertaMovil && (
        <div className={`w-full max-w-3xl mx-auto md:max-w-none py-3 rounded-xl mb-4 text-[10px] font-black text-center uppercase tracking-[0.2em] shadow-inner border border-dashed ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-500 border-[#333]' : 'bg-gray-100 text-gray-400 border-gray-300'}`}>Entrada Principal 🚪</div>
      )}

      {/* Grid Móvil */}
      <div className="lg:hidden w-full max-w-3xl mx-auto">
        <div className="grid gap-3 pb-10" style={{ gridTemplateColumns: `repeat(${COLUMNAS_MAPA}, minmax(0, 1fr))` }}>
          {casillasMovil.map((i) => {
            const mesa = mapaMesas[i];
            if (!mesa) return <div key={`h-${i}`} className="h-32 rounded-3xl border-2 border-dashed border-transparent pointer-events-none" />;
            const { cardClass, badgeClass, titleClass, inlineStyle, icono, labelEstado, esOcupada } = getEstilosMesa(mesa, 'movil');
            return (
              <button key={`m-${mesa.id}`} onClick={() => manejarClickMesa(mesa)} style={inlineStyle} className={`border-[1.5px] rounded-3xl p-3.5 flex flex-col active:scale-95 text-left h-32 relative transition-all ${cardClass} ${mesa.esGigante ? 'col-span-2' : ''}`}>
                <div className="flex justify-between items-start w-full mb-1">
                  <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${badgeClass}`} style={esOcupada && !modoUnir ? { backgroundColor: `${colorPrimario}20`, color: colorPrimario } : {}}>{mesa.esGigante ? 'GRUPO' : labelEstado}</span>
                  {icono && !modoUnir && <span className="opacity-70 text-sm">{icono}</span>}
                </div>
                <div className="flex-1 flex items-center justify-center w-full">
                  <h3 className={`font-black tracking-tight leading-none ${mesa.esGigante ? 'text-2xl' : 'text-xl'} ${titleClass}`}>{mesa.esGigante ? mesa.mesasInvolucradas.join(' + ') : mesa.numero}</h3>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid PC */}
      <div className="hidden lg:grid gap-6 pb-10 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {mesasPC.map((mesa) => {
          const { cardClass, badgeClass, titleClass, inlineStyle, icono, labelEstado, esOcupada } = getEstilosMesa(mesa, 'pc');
          return (
            <button key={`pc-${mesa.id}`} onClick={() => manejarClickMesa(mesa)} style={inlineStyle} className={`border-[1.5px] rounded-3xl p-4 flex flex-col transition-all active:scale-95 text-left h-40 relative ${cardClass} ${mesa.esGigante ? 'col-span-2' : ''}`}>
              <div className="flex justify-between items-start w-full mb-2">
                <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest ${badgeClass}`} style={esOcupada && !modoUnir ? { backgroundColor: `${colorPrimario}20`, color: colorPrimario } : {}}>{mesa.esGigante ? 'GRUPO' : labelEstado}</span>
                {icono && !modoUnir && <span className="opacity-50 text-sm">{icono}</span>}
              </div>
              <div className="flex-1 flex items-center justify-center w-full">
                <h3 className={`font-black tracking-tight ${mesa.esGigante ? 'text-4xl' : 'text-3xl'} ${titleClass}`}>{mesa.esGigante ? mesa.mesasInvolucradas.join(' + ') : `Mesa ${mesa.numero}`}</h3>
              </div>
              <div className={`w-full flex justify-center items-center gap-1.5 mt-2 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                <span className="text-[11px] font-bold">{mesa.capacidadTotal || mesa.capacidad} pax</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}