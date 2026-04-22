import React, { useState } from 'react';
import usePosStore from '../store/usePosStore';

export default function Erp_Sidebar({ 
  vistaActiva, 
  manejarCambioVista, 
  menuAbierto, 
  setMenuAbierto, 
  onVolverAlPos,
  isCollapsed, // ✨ Nuevo: controla si está encogido en PC
  setIsCollapsed // ✨ Nuevo
}) {
  const { configuracionGlobal } = usePosStore();
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const modulos = configuracionGlobal?.modulos || {};
  const rolUsuario = localStorage.getItem('rol_usuario'); 
  const esDueño = rolUsuario === 'Dueño';

  const gruposMenu = [
    {
      titulo: "OPERACIONES",
      items: [
        { id: 'dashboard', icono: '📊', nombre: 'Ventas en Vivo', show: true },
        { id: 'menu', icono: '🍔', nombre: 'Editor de Menú', show: true },
        { id: 'diseno_salon', icono: '🗺️', nombre: 'Diseño del Salón', show: true },
      ]
    },
    {
      titulo: "ADMINISTRACIÓN",
      items: [
        { id: 'inventario', icono: '📦', nombre: 'Inventario (Stock)', show: modulos.inventario },
        { id: 'personal', icono: '👥', nombre: 'Personal y Roles', show: true },
      ]
    },
    {
      titulo: "CRECIMIENTO",
      items: [
        { id: 'crm', icono: '💬', nombre: 'Marketing & CRM', show: modulos.clientes },
        { id: 'carta_qr', icono: '📱', nombre: 'Carta QR + Pedidos', show: modulos.cartaQr },
        { id: 'bot_wsp', icono: '🤖', nombre: 'Bot de WhatsApp', show: modulos.botWsp },
      ]
    },
    {
      titulo: "SISTEMA",
      items: [
        { id: 'facturacion', icono: '🧾', nombre: 'Facturación Electrónica', show: modulos.facturacion },
        { id: 'config', icono: '🔧', nombre: 'Configuración', show: esDueño }
      ]
    }
  ];

  const handleCerrarSesion = () => {
    if (window.confirm("¿Estás seguro que deseas cerrar sesión?")) {
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <>
      {/* 🌫️ FONDO BORROSO (MÓVIL): Al hacer clic afuera, se cierra */}
      {menuAbierto && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* 🧭 SIDEBAR PRINCIPAL */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-[#121212] border-r border-[#222] z-50 flex flex-col transition-all duration-300 ease-in-out shadow-2xl
          ${isCollapsed ? 'w-24' : 'w-72'} 
          ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} 
          md:translate-x-0
        `}
      >
        {/* LOGO Y BOTÓN DE OCULTAR */}
        <div className={`p-6 flex items-center shrink-0 h-24 relative ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <h1 className="text-2xl font-black text-white tracking-tight whitespace-nowrap">
              BRAVA <span style={{ color: colorPrimario }}>POS</span>
            </h1>
            <p className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase mt-1">ERP Cloud</p>
          </div>
          
          {/* Inicial de Logo cuando está colapsado */}
          {isCollapsed && (
            <div className="absolute text-2xl font-black text-white bg-[#222] w-12 h-12 rounded-xl flex items-center justify-center border border-[#333]">
              B<span style={{ color: colorPrimario }}>.</span>
            </div>
          )}

          {/* Botón Cerrar (Móvil) / Colapsar (PC) */}
          <button 
            onClick={() => window.innerWidth < 768 ? setMenuAbierto(false) : setIsCollapsed(!isCollapsed)}
            className="w-8 h-8 rounded-full bg-[#1a1a1a] hover:bg-[#222] border border-[#333] flex items-center justify-center text-neutral-400 hover:text-white transition-colors absolute -right-4 top-8 shadow-lg z-10 hidden md:flex"
          >
            {isCollapsed ? '❯' : '❮'}
          </button>
          
          <button 
            onClick={() => setMenuAbierto(false)}
            className="md:hidden text-neutral-400 hover:text-white font-bold text-xl"
          >
            ✕
          </button>
        </div>

        {/* NAVEGACIÓN (Estilo Moderno Flat) */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 space-y-6">
          {gruposMenu.map((grupo, index) => {
            const itemsVisibles = grupo.items.filter(item => item.show);
            if (itemsVisibles.length === 0) return null;

            return (
              <div key={index} className="flex flex-col gap-1.5 relative group">
                {/* Título de Categoría (Se oculta al colapsar o se vuelve una línea) */}
                <h4 className={`text-[10px] font-black text-neutral-600 tracking-widest mb-2 transition-all duration-300 ${isCollapsed ? 'text-center opacity-0 h-0 overflow-hidden' : 'opacity-100 px-4'}`}>
                  {grupo.titulo}
                </h4>

                {itemsVisibles.map(item => {
                  const isActivo = vistaActiva === item.id;
                  return (
                    <button 
                      key={item.id}
                      onClick={() => {
                        manejarCambioVista(item.id);
                        if (window.innerWidth < 768) setMenuAbierto(false); // Autocerrar en móvil
                      }}
                      className={`relative flex items-center rounded-2xl transition-all duration-300 group/btn
                        ${isCollapsed ? 'justify-center p-3 mx-auto w-14 h-14' : 'px-4 py-3.5 gap-4 w-full'}
                        ${!isActivo ? 'text-neutral-400 hover:bg-[#1a1a1a] hover:text-white' : 'font-bold shadow-lg'}
                      `}
                      style={isActivo ? { backgroundColor: colorPrimario, color: '#fff' } : {}}
                      title={isCollapsed ? item.nombre : ''} // Tooltip nativo al pasar el mouse
                    >
                      <span className={`text-xl transition-transform duration-300 ${isActivo ? 'scale-110' : 'opacity-70 group-hover/btn:scale-110'}`}>
                        {item.icono}
                      </span>
                      
                      {!isCollapsed && (
                        <span className="text-sm font-medium tracking-wide whitespace-nowrap">
                          {item.nombre}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className={`p-4 border-t border-[#222] bg-[#0a0a0a] shrink-0 transition-all duration-300 ${isCollapsed ? 'flex flex-col items-center gap-4' : 'space-y-3'}`}>
          <button 
            onClick={onVolverAlPos} 
            className={`text-white rounded-2xl font-black hover:brightness-110 active:scale-95 transition-all flex items-center justify-center shadow-lg
              ${isCollapsed ? 'w-14 h-14 text-2xl' : 'w-full py-3.5 gap-2'}
            `}
            style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 15px ${colorPrimario}40` }}
            title={isCollapsed ? "Ir al POS" : ""}
          >
            {isCollapsed ? '🖥️' : <><span className="text-xl">🖥️</span> Ir al POS</>}
          </button>
          
          <button 
            onClick={handleCerrarSesion} 
            className={`text-neutral-500 hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center justify-center
              ${isCollapsed ? 'w-12 h-12 rounded-full' : 'w-full py-3 rounded-xl gap-2 font-bold text-sm'}
            `}
            title={isCollapsed ? "Cerrar Sesión" : ""}
          >
            {isCollapsed ? '🚪' : <><span className="text-lg">🚪</span> Cerrar Sesión</>}
          </button>
        </div>
      </aside>
    </>
  );
}