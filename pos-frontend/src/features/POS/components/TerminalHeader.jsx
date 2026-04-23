import React from 'react';

export default function TerminalHeader({
  colorPrimario, vistaLocal, mesaSeleccionada, esDueño, // ✨ Eliminamos 'tema' de aquí
  sedes, sedeActualId, manejarCambioSede, modoUnir, setModoUnir,
  setMesaPrincipal, modSalonActivo, modLlevarActivo, setVistaLocal,
  ordenesLlevar, setDrawerVentaRapidaAbierto, rolUsuario, onIrAErp,
  setModalMovimientosAbierto, manejarCierreCajaSeguro
}) {
  return (
    <header className={`px-4 py-3 md:px-5 md:py-4 sticky top-0 z-10 border-b bg-[#0a0a0a]/95 border-[#222] backdrop-blur-md shadow-xl transition-all ${mesaSeleccionada ? 'hidden lg:block' : 'block'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex justify-between items-center w-full sm:w-auto shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-none">
              {vistaLocal === 'salon' ? (
                <><span className="text-white">Salón</span> <span style={{ color: colorPrimario }}>Principal</span></>
              ) : (
                <><span className="text-white">Para</span> <span style={{ color: colorPrimario }}>Llevar</span></>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">En vivo</span>
            </div>
          </div>

          {esDueño && sedes?.length > 1 &&(
            <select value={sedeActualId || ''} onChange={(e) => manejarCambioSede(e.target.value)} className="sm:hidden text-[10px] font-bold px-2 py-1.5 rounded-lg border outline-none bg-[#1a1a1a] text-white border-[#333]" style={{ color: colorPrimario }}>
              <option value="" disabled>Sede...</option>
              {sedes?.map(sede => <option key={sede.id} value={sede.id}>📍 {sede.nombre}</option>)}
            </select>
          )}
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto py-2 sm:px-1 scrollbar-hide">
          {esDueño && sedes?.length > 1 &&(
            <div className="hidden sm:flex items-center gap-2 mr-2 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">Modo Dueño:</span>
              <select value={sedeActualId || ''} onChange={(e) => manejarCambioSede(e.target.value)} className="text-xs font-bold px-3 py-1.5 rounded-lg border outline-none bg-[#1a1a1a] text-white border-[#333] hover:border-[#ff5a1f]" style={{ color: colorPrimario }}>
                <option value="" disabled>Seleccionar...</option>
                {sedes?.map(sede => <option key={sede.id} value={sede.id}>📍 {sede.nombre}</option>)}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {vistaLocal === 'salon' && (
              <button onClick={() => { setModoUnir(!modoUnir); setMesaPrincipal(null); }} className={`shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border transition-all ${!modoUnir && 'bg-[#1a1a1a] border-[#333] text-neutral-400 hover:text-white hover:bg-[#222]'}`} style={modoUnir ? { backgroundColor: colorPrimario, borderColor: colorPrimario, color: '#fff', boxShadow: `0 0 15px ${colorPrimario}60` } : {}} title="Unir Mesas"><span className="text-lg">🔗</span></button>
            )}

            {modSalonActivo && modLlevarActivo && (
              <button onClick={() => { if (vistaLocal === 'salon') { setVistaLocal('llevar'); setModoUnir(false); } else { setVistaLocal('salon'); } }} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border relative border-[#333] bg-[#1a1a1a] text-neutral-400 hover:text-white hover:bg-[#222]">
                {vistaLocal === 'salon' ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                    <span className="absolute -top-2 -right-1.5 w-4 h-4 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-[#0a0a0a] z-10" style={{ backgroundColor: colorPrimario }}>{ordenesLlevar?.length || 0}</span>
                  </>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                )}
              </button>
            )}

            <button onClick={() => setDrawerVentaRapidaAbierto(true)} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border hover:brightness-125" style={{ backgroundColor: `${colorPrimario}1A`, borderColor: `${colorPrimario}4D`, color: colorPrimario }}><span className="text-lg">⚡</span></button>

            {['administrador', 'admin', 'cajero', 'dueño'].includes(rolUsuario?.toLowerCase()) && (
              <>
                {['administrador', 'admin', 'dueño'].includes(rolUsuario?.toLowerCase()) && (
                  <button onClick={onIrAErp} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white"><span className="text-lg">⚙️</span></button>
                )}
                <button onClick={() => setModalMovimientosAbierto(true)} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"><span className="text-lg">💸</span></button>
                <button onClick={manejarCierreCajaSeguro} className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"><span className="text-lg">🔒</span></button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}