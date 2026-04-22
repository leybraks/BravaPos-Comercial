import React from 'react';

export default function Erp_ModalEmpleado({ 
  isOpen, 
  config, 
  formEmpleado, 
  setFormEmpleado, 
  rolesFiltrados, 
  sedesReales, 
  onClose, 
  onGuardar 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className={`border rounded-3xl w-full max-w-md overflow-hidden animate-fadeIn shadow-2xl ${
        config.temaFondo === 'dark' ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-200'
      }`}>
        <div className={`p-6 border-b flex justify-between items-center ${
          config.temaFondo === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'
        }`}>
          <h3 className={`text-xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {formEmpleado.id ? '✏️ Editar Empleado' : '✨ Nuevo Empleado'}
          </h3>
          <button onClick={onClose} className="text-neutral-500 font-bold hover:text-red-500 transition-colors">✕</button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
              Nombre Completo
            </label>
            <input 
              type="text" 
              value={formEmpleado.nombre}
              onChange={(e) => setFormEmpleado({...formEmpleado, nombre: e.target.value})}
              className={`w-full border rounded-xl px-4 py-3 outline-none transition-colors ${
                config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
              } ${!formEmpleado.nombre ? 'border-red-500/50 focus:border-red-500' : 'focus:border-[#ff5a1f]'}`}
              style={{ '--tw-ring-color': config.colorPrimario }}
              placeholder="Ej. Juan Pérez" 
            />
            {!formEmpleado.nombre && (
              <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-wider">⚠️ El nombre es obligatorio</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                Rol Asignado
              </label>
              <select 
                value={formEmpleado.rol}
                onChange={(e) => setFormEmpleado({...formEmpleado, rol: e.target.value})}
                className={`w-full border rounded-xl px-4 py-3 outline-none transition-colors ${
                  config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-[#ff5a1f]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#ff5a1f]'
                }`}
              >
                {rolesFiltrados.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                {formEmpleado.id ? 'NUEVO PIN (Opcional)' : 'PIN (4 Dígitos)'}
              </label>
              <input 
                type="password" 
                maxLength="4" 
                value={formEmpleado.pin}
                onChange={(e) => setFormEmpleado({...formEmpleado, pin: e.target.value.replace(/\D/g, '')})} 
                className={`w-full border rounded-xl px-4 py-3 text-center font-mono text-xl tracking-[10px] outline-none transition-colors ${
                  config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                } ${
                  (!formEmpleado.id && formEmpleado.pin.length !== 4) || (formEmpleado.id && formEmpleado.pin.length > 0 && formEmpleado.pin.length < 4) 
                  ? 'border-red-500/50 focus:border-red-500' 
                  : 'focus:border-[#ff5a1f]'
                }`}
                placeholder={formEmpleado.id ? "****" : "0000"} 
              />
              {/* ✨ VALIDACIÓN DEL PIN EN TIEMPO REAL */}
              {!formEmpleado.id && formEmpleado.pin.length < 4 && (
                <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-wider text-center">⚠️ Ingresa 4 dígitos</p>
              )}
              {formEmpleado.id && formEmpleado.pin.length > 0 && formEmpleado.pin.length < 4 && (
                <p className="text-red-500 text-[10px] font-bold mt-1 uppercase tracking-wider text-center">⚠️ Faltan {4 - formEmpleado.pin.length} dígitos</p>
              )}
            </div>
          </div>

          <div>
            <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
              Sede Autorizada
            </label>
            <select 
              value={formEmpleado.sede}
              onChange={(e) => setFormEmpleado({...formEmpleado, sede: e.target.value})}
              className={`w-full border rounded-xl px-4 py-3 outline-none transition-colors ${
                config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-[#ff5a1f]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#ff5a1f]'
              }`}
            >
              <option value="">Aplica a todas las sedes (Matriz)</option>
              {sedesReales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>

          <button 
            onClick={onGuardar}
            // ✨ Si no pasa la prueba, el botón se bloquea visualmente
            disabled={!formEmpleado.nombre || (!formEmpleado.id && formEmpleado.pin.length !== 4) || (formEmpleado.id && formEmpleado.pin.length > 0 && formEmpleado.pin.length < 4)}
            style={{ backgroundColor: config.colorPrimario }}
            className="w-full text-white py-4 rounded-xl font-black mt-4 shadow-lg active:scale-95 transition-all hover:brightness-110 disabled:opacity-50 disabled:grayscale"
          >
            {formEmpleado.id ? 'GUARDAR CAMBIOS' : 'CREAR ACCESO'}
          </button>
        </div>
      </div>
    </div>
  );
}