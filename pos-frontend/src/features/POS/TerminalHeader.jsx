import React from 'react';

export default function TerminalHeader({
  colorPrimario,
  vistaLocal,
  esDueño,
  sedes,
  sedeActualId,
  manejarCambioSede,
  modoUnir,
  setModoUnir,
  setMesaPrincipal,
  modSalonActivo,
  modLlevarActivo,
  setVistaLocal,
  ordenesLlevar,
  setDrawerVentaRapidaAbierto,
  rolUsuario,
  onIrAErp,
  setModalMovimientosAbierto,
  manejarCierreCajaSeguro
}) {
  
  // Calculamos cuántos pedidos para llevar están pendientes (no pagados)
  const llevarPendientes = ordenesLlevar?.filter(o => o.estado_pago !== 'pagado').length || 0;

  return (
    <header className="bg-[#0f0f0f] border-b border-[#222] px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 shadow-lg relative z-20">
      
      {/* 🔴 LADO IZQUIERDO: Branding y Selector de Sede */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-lg"
            style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 15px ${colorPrimario}40` }}
          >
            B.
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-white tracking-tighter leading-none">BRAVA<span style={{ color: colorPrimario }}>POS</span></h1>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5">Terminal Operativa</p>
          </div>
        </div>

        <div className="h-8 w-px bg-[#222] hidden md:block"></div>

        {/* Selector de Sucursal (Solo para dueños o admins) */}
        <select
          value={sedeActualId}
          onChange={(e) => manejarCambioSede(e.target.value)}
          disabled={!esDueño}
          className="bg-[#1a1a1a] border border-[#333] text-white text-sm font-bold rounded-lg px-4 py-2 focus:outline-none focus:border-neutral-500 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {sedes.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {/* 🟡 CENTRO: Pestañas de Navegación (Salón vs Para Llevar) */}
      <div className="flex bg-[#1a1a1a] p-1.5 rounded-xl border border-[#333] shadow-inner">
        {modSalonActivo && (
          <button
            onClick={() => setVistaLocal('salon')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
              vistaLocal === 'salon' 
                ? 'bg-[#2a2a2a] text-white shadow-md' 
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            🍽️ Salón
          </button>
        )}
        
        {modLlevarActivo && (
          <button
            onClick={() => setVistaLocal('llevar')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
              vistaLocal === 'llevar' 
                ? 'bg-[#2a2a2a] text-white shadow-md' 
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            🛍️ Llevar / Delivery
            {llevarPendientes > 0 && (
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full text-white font-black"
                style={{ backgroundColor: colorPrimario }}
              >
                {llevarPendientes}
              </span>
            )}
          </button>
        )}
      </div>

      {/* 🟢 LADO DERECHO: Acciones Rápidas y Usuario */}
      <div className="flex items-center gap-3">
        
        {/* Herramientas del Salón (Solo visibles si estás en Salón) */}
        {vistaLocal === 'salon' && (
          <button
            onClick={() => { setModoUnir(!modoUnir); setMesaPrincipal(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
              modoUnir 
                ? 'bg-blue-500/20 text-blue-400 border-blue-500' 
                : 'bg-[#1a1a1a] text-neutral-400 border-[#333] hover:bg-[#222] hover:text-white'
            }`}
          >
            {modoUnir ? 'Cancelar Unión' : '🔗 Unir Mesas'}
          </button>
        )}

        {/* Venta Rápida */}
        <button
          onClick={() => setDrawerVentaRapidaAbierto(true)}
          className="px-4 py-2 rounded-lg text-sm font-bold bg-[#1a1a1a] text-neutral-400 border border-[#333] hover:bg-[#222] hover:text-white transition-all hidden lg:block"
        >
          ⚡ Venta Rápida
        </button>

        <div className="h-8 w-px bg-[#222] mx-2 hidden md:block"></div>

        {/* Menú de Usuario / Caja */}
        <div className="flex flex-col items-end mr-3">
          <span className="text-xs font-bold text-white uppercase tracking-wider">{rolUsuario}</span>
          <span className="text-[10px] text-green-500 font-mono">🟢 Caja Abierta</span>
        </div>

        {/* Opciones del Sistema */}
        <div className="flex gap-2">
          {esDueño && (
            <button
              onClick={onIrAErp}
              className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#333] hover:border-neutral-500 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
              title="Panel de Control (ERP)"
            >
              ⚙️
            </button>
          )}
          <button
            onClick={() => setModalMovimientosAbierto(true)}
            className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#333] hover:border-neutral-500 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
            title="Movimientos de Caja Chica"
          >
            💵
          </button>
          <button
            onClick={manejarCierreCajaSeguro}
            className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-500 flex items-center justify-center transition-all"
            title="Cerrar Turno / Caja"
          >
            🚪
          </button>
        </div>
      </div>
    </header>
  );
}