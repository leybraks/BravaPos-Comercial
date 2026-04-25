import React from 'react';

export default function Erp_Personal({
  config,
  empleadosReales,
  sedesReales,
  onNuevoEmpleado,
  sedeFiltroId, 
  onCambiarSedeFiltro,
  onEditarEmpleado,
  onToggleActivo
}) {

  // ==========================================
  // 🛡️ SEGURIDAD DE ROLES (FRONTEND)
  // ==========================================
  const rolUsuario = localStorage.getItem('usuario_rol')?.toLowerCase() || '';
  const esDueño = rolUsuario === 'dueño'; 
  const sedeActualId = localStorage.getItem('sede_id');

  // ==========================================
  // 🧠 MOTOR DE FILTRADO INTELIGENTE
  // ==========================================
  const empleadosFiltrados = empleadosReales.filter(emp => {
    if (!esDueño) {
      // 🔒 REGLA ADMIN: Solo pasa si el empleado pertenece a la sede actual del Admin
      return String(emp.sede) === String(sedeActualId);
    } else {
      // 🌍 REGLA DUEÑO: Pasan los del filtro seleccionado, o todos si no hay filtro
      return sedeFiltroId ? String(emp.sede) === String(sedeFiltroId) : true;
    }
  });

  return (
    <div className="animate-fadeIn space-y-6 pb-20">
      
      {/* ========== CABECERA ========== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className={`text-2xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Equipo de Trabajo
          </h3>
          <p className={`text-sm mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
            {esDueño ? 'Gestiona accesos, edita perfiles y mide el rendimiento global.' : 'Consulta el equipo asignado a tu sede.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* ✨ SELECTOR DE SEDE (Solo Dueño) o ETIQUETA FIJA (Administrador) */}
          {esDueño ? (
            sedesReales.length > 1 && (
              <div className={`flex items-center gap-2 px-3 py-3 rounded-xl border flex-1 md:flex-none ${
                config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'
              }`}>
                <span className="text-xl">📍</span>
                <select 
                  value={sedeFiltroId || ''}
                  onChange={(e) => onCambiarSedeFiltro(e.target.value)}
                  className={`bg-transparent outline-none font-bold text-sm w-full cursor-pointer ${
                    config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  <option value="" className={config.temaFondo === 'dark' ? 'bg-[#111]' : ''}>Todas las Sedes</option>
                  {sedesReales.map(s => <option key={s.id} value={s.id} className={config.temaFondo === 'dark' ? 'bg-[#111]' : ''}>{s.nombre}</option>)}
                </select>
              </div>
            )
          ) : (
            <div className={`flex items-center px-6 py-3 rounded-2xl shrink-0 ${
              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-gray-50 border border-gray-200'
            }`}>
              <span className="text-xl mr-2">📍</span>
              <span className={`text-sm font-bold uppercase tracking-wider ${config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
                Sede Activa: 
                <span className={`ml-2 font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {localStorage.getItem('sede_nombre') || 'Local Principal'}
                </span>
              </span>
            </div>
          )}

          {/* ✨ BOTÓN NUEVO EMPLEADO (Solo Dueño) */}
          {esDueño && (
            <button 
              onClick={onNuevoEmpleado}
              style={{ backgroundColor: config.colorPrimario, boxShadow: `0 4px 15px ${config.colorPrimario}40` }}
              className="text-white px-6 py-3 rounded-xl font-black transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span className="text-xl">+</span> EMPLEADO
            </button>
          )}
        </div>
      </div>

      {/* ========== LISTADO DE EMPLEADOS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {empleadosFiltrados.length === 0 && (
          <div className={`col-span-full py-10 text-center font-bold border-2 border-dashed rounded-3xl ${config.temaFondo === 'dark' ? 'text-neutral-600 border-[#222]' : 'text-gray-400 border-gray-200'}`}>
            Aún no hay empleados registrados en esta sede.
          </div>
        )}
        
        {/* ✨ USAMOS empleadosFiltrados */}
        {empleadosFiltrados.map(emp => (
          <div 
            key={emp.id} 
            className={`p-5 rounded-3xl flex items-center justify-between group transition-all ${
              config.temaFondo === 'dark'
                ? 'bg-[#121212] border border-[#222] hover:border-[#444]'
                : 'bg-white border border-gray-200 shadow-sm hover:border-gray-300'
            } ${!emp.activo ? 'opacity-60 grayscale' : ''}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border shadow-sm ${
                config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'
              }`}>
                {emp.rol_nombre?.includes('Admin') ? '👑' : 
                 emp.rol_nombre?.includes('Cajer') ? '💰' : 
                 emp.rol_nombre?.includes('Mesero') ? '🏃' : '👨‍🍳'}
              </div>
              <div>
                <h4 className={`font-bold text-lg leading-tight ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'} ${!emp.activo ? 'line-through' : ''}`}>
                  {emp.nombre}
                </h4>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                    config.temaFondo === 'dark' ? 'bg-[#1a1a1a] text-neutral-300 border-[#333]' : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {emp.rol_nombre || 'Sin Rol'}
                  </span>
                  
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                    emp.activo 
                      ? (config.temaFondo === 'dark' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-green-600 border-green-200 bg-green-50')
                      : (config.temaFondo === 'dark' ? 'text-red-500 border-red-500/20 bg-red-500/10' : 'text-red-600 border-red-200 bg-red-50')
                  }`}>
                    {emp.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>

                  {sedesReales.length > 1 && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${
                      config.temaFondo === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-200'
                    }`}>
                      📍 {sedesReales.find(s => String(s.id) === String(emp.sede))?.nombre || 'Todas (Matriz)'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end">
              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                PIN de Acceso
              </p>
              {/* ✨ SOLO DUEÑO VE EL PIN */}
              <p className={`font-mono font-bold tracking-[4px] mb-2 ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {esDueño ? (emp.activo ? '****' : '----') : '****'}
              </p>
              
              {/* ✨ ACCIONES (Solo Dueño) */}
              {esDueño && (
                <div className="flex gap-3">
                  <button 
                    onClick={() => onEditarEmpleado(emp)}
                    className="text-xs font-bold transition-colors hover:scale-105"
                    style={{ color: config.colorPrimario }}
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => onToggleActivo(emp)}
                    className={`text-xs font-bold transition-colors hover:scale-105 ${emp.activo ? 'text-red-500 hover:text-red-400' : 'text-green-500 hover:text-green-400'}`}
                  >
                    {emp.activo ? 'Desactivar' : 'Reactivar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ========== TABLA DE RENDIMIENTO ========== */}
      <div className={`rounded-3xl p-6 mt-8 border transition-all ${
        config.temaFondo === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <h4 className={`font-black flex items-center gap-2 text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            <span className="text-2xl">🏆</span> Rendimiento del Equipo (Este Mes)
          </h4>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${config.temaFondo === 'dark' ? 'bg-[#222] text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
            Datos Simulados
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={`border-b ${config.temaFondo === 'dark' ? 'text-neutral-500 border-[#222]' : 'text-gray-500 border-gray-200'}`}>
                <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Empleado</th>
                <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-center">Rol</th>
                <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-center">Órdenes Atendidas</th>
                <th className="pb-4 font-black uppercase tracking-widest text-[10px] text-right">Total Vendido</th>
              </tr>
            </thead>
            <tbody className={config.temaFondo === 'dark' ? 'text-neutral-300' : 'text-gray-700'}>
              {[
                { nom: 'Carlos M.', rol: 'Mesero', ord: 142, total: 'S/ 3,450.00' },
                { nom: 'Ana V.', rol: 'Cajera', ord: 320, total: 'S/ 8,200.00' },
                { nom: 'Luis R.', rol: 'Cocinero', ord: 280, total: '-' },
              ].map((row, i) => (
                <tr key={i} className={`border-b hover:bg-black/5 transition-colors ${config.temaFondo === 'dark' ? 'border-[#1a1a1a] hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'}`}>
                  <td className="py-4 font-bold flex items-center gap-2">
                    {i === 0 && <span className="text-yellow-500 text-xs">⭐</span>}
                    {row.nom}
                  </td>
                  <td className="py-4 text-center">
                    <span className={`text-[10px] px-2 py-1 rounded uppercase font-bold ${config.temaFondo === 'dark' ? 'bg-[#222] text-neutral-400' : 'bg-gray-100 text-gray-500'}`}>
                      {row.rol}
                    </span>
                  </td>
                  <td className="py-4 text-center font-mono">{row.ord}</td>
                  <td className="py-4 text-right font-bold text-green-500">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}