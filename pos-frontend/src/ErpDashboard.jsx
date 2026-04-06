import React, { useState } from 'react';

export default function ErpDashboard({ onVolverAlPos }) {
  const [vistaActiva, setVistaActiva] = useState('dashboard');
  const [sedeFiltro, setSedeFiltro] = useState('Todas');
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalEmpleado, setModalEmpleado] = useState(false);
  // Estados simulados para Configuración
  const [config, setConfig] = useState({
    numeroYape: '999 888 777',
    modCocina: true,
    modDelivery: false,
    modInventario: false
  });
  const [empleados, setEmpleados] = useState([
    { id: 1, nombre: 'Admin Master', rol: 'Administrador', pin: '1234', sede: 'Todas', estado: 'Activo' },
    { id: 2, nombre: 'Carlos Mesero', rol: 'Mesero', pin: '4321', sede: 'Local Principal', estado: 'Activo' },
    { id: 3, nombre: 'Ana Cajera', rol: 'Cajero', pin: '0000', sede: 'Sede Surco', estado: 'Activo' },
    { id: 4, nombre: 'Roberto Chef', rol: 'Cocinero', pin: '8888', sede: 'Local Principal', estado: 'Activo' },
  ]);
  const sedes = ['Todas', 'Local Principal', 'Sede Surco'];
  const rolesDisponibles = ['Administrador', 'Cajero', 'Mesero', 'Cocinero'];
  // Ventas simuladas en vivo
  const metricas = {
    'Todas': { ventas: 1450.50, ordenes: 42, ticketPromedio: 34.50 },
    'Local Principal': { ventas: 950.00, ordenes: 25, ticketPromedio: 38.00 },
    'Sede Surco': { ventas: 500.50, ordenes: 17, ticketPromedio: 29.40 },
  };

  const currentMetricas = metricas[sedeFiltro];

  // Componente de Menú Lateral (Sidebar)
  const Sidebar = () => (
    <div className={`fixed inset-y-0 left-0 w-64 bg-[#111] border-r border-[#222] transform ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 z-50 flex flex-col`}>
      <div className="p-6">
        <h1 className="text-xl font-black text-white">CAÑA <span className="text-[#ff5a1f]">BRAVA</span></h1>
        <p className="text-xs text-neutral-500 tracking-widest uppercase mt-1">ERP Cloud</p>
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {[
          { id: 'dashboard', icono: '📊', nombre: 'Ventas en Vivo' },
          { id: 'personal', icono: '👥', nombre: 'Personal y Roles' },
          { id: 'crm', icono: '💬', nombre: 'Marketing & CRM' }, // <-- NUEVO
          { id: 'inventario', icono: '📦', nombre: 'Inventario (Stock)' }, // <-- NUEVO
          { id: 'menu', icono: '🍔', nombre: 'Editor de Menú' },
          { id: 'config', icono: '⚙️', nombre: 'Configuraciones' },
        ].map(item => (
          <button 
            key={item.id}
            onClick={() => { setVistaActiva(item.id); setMenuAbierto(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all
              ${vistaActiva === item.id ? 'bg-[#ff5a1f]/10 text-[#ff5a1f] border border-[#ff5a1f]/20' : 'text-neutral-400 hover:bg-[#222] hover:text-white'}`}
          >
            <span className="text-xl">{item.icono}</span>
            {item.nombre}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-[#222]">
        <button onClick={onVolverAlPos} className="w-full bg-[#222] text-white py-3 rounded-xl font-bold hover:bg-[#333] transition-colors">
          🖥️ Ir al POS
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-[#0a0a0a] min-h-screen font-sans text-neutral-100 flex">
      
      <Sidebar />

      {/* Overlay para móvil cuando el menú está abierto */}
      {menuAbierto && <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setMenuAbierto(false)}></div>}

      {/* ÁREA PRINCIPAL */}
      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0">
        
        {/* HEADER */}
        {/* HEADER COMPLETO Y ELEGANTE */}
        <header className="bg-[#111] border-b border-[#222] p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setMenuAbierto(true)} className="md:hidden bg-[#222] p-2 rounded-lg text-white">
              ☰
            </button>
            <h2 className="text-xl font-black capitalize tracking-tight text-white">
              {vistaActiva === 'dashboard' ? 'Ventas en Vivo' : 
               vistaActiva === 'personal' ? 'Gestión de Personal' : 
               vistaActiva === 'crm' ? 'Clientes y Marketing' : 
               vistaActiva === 'inventario' ? 'Control de Almacén' : 
               vistaActiva === 'config' ? 'Configuraciones' : 
               vistaActiva === 'menu' ? 'Editor de Menú' : vistaActiva}
            </h2>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden sm:flex items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-[#333]">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-xs font-bold text-neutral-400">ONLINE</span>
             </div>
             <div className="w-10 h-10 bg-[#ff5a1f] rounded-full flex items-center justify-center font-bold text-white border-2 border-[#222] shadow-[0_0_15px_rgba(255,90,31,0.2)] cursor-pointer hover:scale-105 transition-transform">
               CB
             </div>
          </div>
        </header>

        {/* CONTENIDO DINÁMICO */}
        <main className="p-4 md:p-8 flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          
          {/* ======================= VISTA: DASHBOARD EN VIVO ======================= */}
          {vistaActiva === 'dashboard' && (
            <div className="animate-fadeIn space-y-6">
              
              {/* Filtro Multi-Sede Elegante */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111] p-2 rounded-2xl border border-[#222]">
                <div className="flex w-full sm:w-auto bg-[#1a1a1a] rounded-xl p-1 overflow-x-auto">
                  {sedes.map(sede => (
                    <button 
                      key={sede} onClick={() => setSedeFiltro(sede)}
                      className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all
                        ${sedeFiltro === sede ? 'bg-[#ff5a1f] text-white shadow-md' : 'text-neutral-500 hover:text-white'}`}
                    >
                      {sede}
                    </button>
                  ))}
                </div>
                <div className="px-4 text-neutral-400 text-sm font-semibold flex items-center gap-2">
                  <span>📅</span> Hoy: 02 Abr 2026
                </div>
              </div>

              {/* Tarjetas de Métricas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#121212] p-6 rounded-3xl border border-[#222] relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-bl-full"></div>
                  <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs mb-2">Ingresos Totales</p>
                  <h3 className="text-4xl font-black text-white">S/ {currentMetricas.ventas.toFixed(2)}</h3>
                  <p className="text-green-400 text-sm font-bold mt-2 flex items-center gap-1">↑ 12% vs ayer</p>
                </div>
                <div className="bg-[#121212] p-6 rounded-3xl border border-[#222]">
                  <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs mb-2">Órdenes Pagadas</p>
                  <h3 className="text-4xl font-black text-white">{currentMetricas.ordenes}</h3>
                  <p className="text-neutral-400 text-sm font-bold mt-2">En {sedeFiltro}</p>
                </div>
                <div className="bg-[#121212] p-6 rounded-3xl border border-[#222]">
                  <p className="text-neutral-500 font-bold uppercase tracking-widest text-xs mb-2">Ticket Promedio</p>
                  <h3 className="text-4xl font-black text-white">S/ {currentMetricas.ticketPromedio.toFixed(2)}</h3>
                </div>
              </div>

              {/* Gráfico de Ventas Simuladas (UI) */}
              <div className="bg-[#121212] border border-[#222] rounded-3xl p-6">
                 <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                   <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                   Actividad Reciente
                 </h3>
                 <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex justify-between items-center bg-[#1a1a1a] p-4 rounded-xl border border-[#2a2a2a]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-[#ff5a1f]/20 text-[#ff5a1f] rounded-full flex items-center justify-center font-bold">✓</div>
                          <div>
                            <p className="text-white font-bold">Orden #104{i}</p>
                            <p className="text-neutral-500 text-xs">Mesa {i + 1} • {sedeFiltro === 'Todas' ? (i%2===0?'Sede Surco':'Local Principal') : sedeFiltro}</p>
                          </div>
                        </div>
                        <div className="text-right">
                           <p className="text-white font-black">S/ {(15.5 * i).toFixed(2)}</p>
                           <p className="text-neutral-500 text-[10px] uppercase font-bold">Pagado</p>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {/* ======================= VISTA: CONFIGURACIONES ======================= */}
          {vistaActiva === 'config' && (
            <div className="animate-fadeIn max-w-4xl mx-auto space-y-6">
              
              {/* Sección Pagos Digitales */}
              <div className="bg-[#121212] border border-[#222] rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-[#222] bg-[#1a1a1a]">
                  <h3 className="text-xl font-black text-white">Billeteras Digitales</h3>
                  <p className="text-neutral-400 text-sm mt-1">Configura Yape y Plin para el cobro rápido en POS.</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-2 block">Número Asociado</label>
                    <input 
                      type="text" 
                      value={config.numeroYape}
                      onChange={(e) => setConfig({...config, numeroYape: e.target.value})}
                      className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff5a1f] text-lg font-mono" 
                    />
                    <p className="text-neutral-500 text-xs mt-2">Este número se mostrará al cliente si pide el dato manual.</p>
                  </div>
                  
                  <div>
                    <label className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-2 block">Código QR (Opcional)</label>
                    <div className="border-2 border-dashed border-[#333] hover:border-[#ff5a1f] bg-[#1a1a1a] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📱</span>
                      <p className="text-white font-bold text-sm">Sube tu imagen QR</p>
                      <p className="text-neutral-500 text-xs mt-1">PNG o JPG max 2MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección Módulos SaaS */}
              <div className="bg-[#121212] border border-[#222] rounded-3xl overflow-hidden">
                <div className="p-6 border-b border-[#222] bg-[#1a1a1a]">
                  <h3 className="text-xl font-black text-white">Módulos del Sistema</h3>
                  <p className="text-neutral-400 text-sm mt-1">Activa o desactiva las herramientas que tu restaurante necesita.</p>
                </div>
                <div className="p-6 space-y-4">
                  
                  {/* Toggle KDS */}
                  <div className="flex items-center justify-between bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a]">
                    <div>
                      <h4 className="text-white font-bold text-lg">Pantalla de Cocina (KDS)</h4>
                      <p className="text-neutral-500 text-sm">Permite a los cocineros ver y despachar órdenes en tiempo real.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={config.modCocina} onChange={() => setConfig({...config, modCocina: !config.modCocina})} />
                      <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff5a1f]"></div>
                    </label>
                  </div>

                  {/* Toggle Delivery */}
                  <div className="flex items-center justify-between bg-[#1a1a1a] p-4 rounded-2xl border border-[#2a2a2a]">
                    <div>
                      <h4 className="text-white font-bold text-lg">Módulo Delivery</h4>
                      <p className="text-neutral-500 text-sm">Habilita registro de clientes, números de WhatsApp y recolección.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={config.modDelivery} onChange={() => setConfig({...config, modDelivery: !config.modDelivery})} />
                      <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff5a1f]"></div>
                    </label>
                  </div>

                </div>
              </div>

              {/* Botón Guardar */}
              <div className="flex justify-end">
                 <button className="bg-[#ff5a1f] hover:bg-[#e04a15] text-white px-8 py-4 rounded-xl font-black tracking-widest shadow-[0_4px_15px_rgba(255,90,31,0.3)] transition-all active:scale-95">
                   GUARDAR CAMBIOS
                 </button>
              </div>

            </div>
          )}

          {/* ======================= VISTA: EDITOR DE MENÚ ======================= */}
          {vistaActiva === 'menu' && (
            <div className="animate-fadeIn space-y-6 max-w-6xl mx-auto min-w-0">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#111] border border-[#222] p-6 rounded-3xl">
                <div>
                  <h3 className="text-2xl font-black text-white">Editor de Carta Digital</h3>
                  <p className="text-neutral-500 text-sm mt-1">Crea tus categorías, platos y ajusta los precios en tiempo real.</p>
                </div>
                <button className="w-full md:w-auto bg-[#ff5a1f] text-white px-8 py-4 rounded-xl font-black shadow-[0_0_20px_rgba(255,90,31,0.2)] active:scale-95 transition-all flex justify-center items-center gap-2">
                  <span className="text-xl">🍔</span> NUEVO PLATO
                </button>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Columna Izquierda: Categorías */}
                <div className="lg:w-1/4 space-y-2">
                  <h4 className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-4 px-2">Categorías del Menú</h4>
                  {[
                    { n: '🔥 Promociones', a: false },
                    { n: '🍔 Hamburguesas', a: true },
                    { n: '🍗 Brasas y Pollos', a: false },
                    { n: '🥤 Bebidas', a: false },
                    { n: '🍰 Postres', a: false }
                  ].map((cat, i) => (
                    <button key={i} className={`w-full text-left px-5 py-4 rounded-2xl font-bold transition-all flex justify-between items-center group
                      ${cat.a ? 'bg-[#ff5a1f] text-white shadow-md' : 'bg-[#1a1a1a] text-neutral-400 hover:bg-[#222] border border-[#333]'}`}>
                      {cat.n}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm">⋮</span>
                    </button>
                  ))}
                  <button className="w-full text-center px-4 py-4 border-2 border-dashed border-[#333] rounded-2xl text-neutral-500 font-bold hover:border-[#ff5a1f] hover:text-[#ff5a1f] transition-all mt-4">
                    + Añadir Categoría
                  </button>
                </div>

                {/* Columna Derecha: Cuadrícula de Platos */}
                <div className="lg:w-3/4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                     {[
                       { n: 'Burger Clásica', p: '15.00', st: true, img: '🍔', desc: 'Carne de res 150g, queso, lechuga y tomate.' },
                       { n: 'Burger Royal', p: '18.50', st: true, img: '🍔', desc: 'Huevo frito, tocino ahumado, queso y salsas.' },
                       { n: 'Burger Extrema Doble', p: '24.00', st: false, img: '🍔', desc: 'Doble carne, aros de cebolla y queso cheddar.' },
                       { n: 'Salchipapa Simple', p: '12.00', st: true, img: '🍟', desc: 'Papas nativas con hot dog frankfurt.' },
                     ].map((plato, i) => (
                       <div key={i} className="bg-[#111] border border-[#222] rounded-3xl p-5 group hover:border-[#ff5a1f]/50 transition-colors flex flex-col relative overflow-hidden">
                         
                         {/* Indicador de Stock */}
                         <div className="absolute top-4 right-4 flex items-center gap-2 bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-[#333]">
                           <span className={`w-2 h-2 rounded-full ${plato.st ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
                           <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{plato.st ? 'Disponible' : 'Agotado'}</span>
                         </div>

                         <div className="w-full h-32 bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#222] rounded-2xl flex items-center justify-center text-6xl mb-4 group-hover:scale-105 transition-transform shadow-inner">
                           {plato.img}
                         </div>
                         
                         <h5 className="text-white font-black text-xl leading-tight mb-1">{plato.n}</h5>
                         <p className="text-neutral-500 text-xs mb-4 line-clamp-2">{plato.desc}</p>
                         
                         <div className="mt-auto flex items-center justify-between">
                            <p className="text-[#ff5a1f] font-black text-2xl">S/ {plato.p}</p>
                            <div className="flex gap-2">
                              <button className="w-10 h-10 bg-[#1a1a1a] hover:bg-[#222] text-white flex items-center justify-center rounded-xl transition-colors border border-[#333]">✏️</button>
                            </div>
                         </div>
                       </div>
                     ))}
                  </div>
                </div>

              </div>
            </div>
          )}
          {/* ======================= VISTA: PERSONAL Y ROLES ======================= */}
          {vistaActiva === 'personal' && (
            <div className="animate-fadeIn space-y-6">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-2xl font-black text-white">Equipo de Trabajo</h3>
                  <p className="text-neutral-500 text-sm">Controla quién accede a cada módulo y sus códigos PIN.</p>
                </div>
                <button 
                  onClick={() => setModalEmpleado(true)}
                  className="bg-[#ff5a1f] text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-[#ff5a1f]/20 active:scale-95 transition-all"
                >
                  + NUEVO EMPLEADO
                </button>
              </div>

              {/* LISTADO DE EMPLEADOS (Responsive) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {empleados.map(emp => (
                  <div key={emp.id} className="bg-[#121212] border border-[#222] p-5 rounded-3xl flex items-center justify-between group hover:border-[#ff5a1f]/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#222] rounded-full flex items-center justify-center text-xl border border-[#333]">
                        {emp.rol === 'Administrador' ? '👑' : emp.rol === 'Cajero' ? '💰' : emp.rol === 'Mesero' ? '🏃' : '👨‍🍳'}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-lg">{emp.nombre}</h4>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] font-black bg-[#1a1a1a] text-[#ff5a1f] px-2 py-0.5 rounded border border-[#ff5a1f]/20 uppercase">{emp.rol}</span>
                          <span className="text-[10px] font-black bg-[#1a1a1a] text-neutral-500 px-2 py-0.5 rounded border border-[#333] uppercase">{emp.sede}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1">PIN de Acceso</p>
                      <p className="font-mono text-white font-bold tracking-[4px]">****</p>
                      <button className="text-[#ff5a1f] text-xs font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Editar</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* TABLA DE EXPLICACIÓN DE ROLES (ERP) */}
              <div className="bg-[#111] border border-[#222] rounded-3xl p-6 mt-8">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                   <span className="text-xl">🛡️</span> Matriz de Permisos
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-neutral-500 border-b border-[#222]">
                        <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Módulo</th>
                        <th className="pb-4 text-center">Admin</th>
                        <th className="pb-4 text-center">Cajero</th>
                        <th className="pb-4 text-center">Mesero</th>
                        <th className="pb-4 text-center">Chef</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-300">
                      {[
                        { mod: 'Ventas y Dashboard', p: ['✅','✅','❌','❌'] },
                        { mod: 'Apertura/Cierre Caja', p: ['✅','✅','❌','❌'] },
                        { mod: 'Toma de Pedidos (POS)', p: ['✅','✅','✅','❌'] },
                        { mod: 'Pantalla Cocina (KDS)', p: ['✅','❌','✅','✅'] },
                        { mod: 'Editar Precios/Menú', p: ['✅','❌','❌','❌'] },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-[#1a1a1a]">
                          <td className="py-4 font-semibold">{row.mod}</td>
                          {row.p.map((perm, idx) => (
                            <td key={idx} className="py-4 text-center">{perm}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* ======================= VISTA: CRM Y MARKETING (WHATSAPP) ======================= */}
          {vistaActiva === 'crm' && (
            <div className="animate-fadeIn space-y-6 flex flex-col w-full min-w-0">
              
              {/* BANNER (Blindado con min-w-0 y w-full) */}
              <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center text-center md:text-left shadow-xl w-full gap-4">
                <div className="w-full min-w-0">
                  <h3 className="text-2xl md:text-3xl font-black text-white mb-1">Generador de Campañas</h3>
                  <p className="text-green-100 text-sm">
                    Tienes <strong className="text-white">342</strong> clientes. Lanza una promoción por WhatsApp.
                  </p>
                </div>
                <button className="w-full md:w-auto bg-white text-green-600 px-6 py-3 rounded-xl font-black shadow-lg shrink-0 flex items-center justify-center gap-2">
                  <span className="text-xl">📱</span> ENVIAR PROMO
                </button>
              </div>

              {/* CONTENEDOR DE LA TABLA (Blindado) */}
              <div className="bg-[#111] border border-[#222] rounded-3xl flex flex-col w-full min-w-0 relative overflow-hidden">
                
                <div className="p-4 border-b border-[#222] flex flex-col sm:flex-row justify-between gap-3">
                  <h4 className="font-bold text-white text-lg">Base de Datos</h4>
                  <input type="text" placeholder="Buscar por número..." className="w-full sm:w-64 bg-[#1a1a1a] border border-[#333] px-4 py-2 rounded-lg focus:outline-none focus:border-green-500 text-sm" />
                </div>
                
                {/* LA MAGIA: w-full, overflow-x-auto y min-w-0 aísla el scroll de la tabla */}
                <div className="w-full overflow-x-auto min-w-0">
                  {/* min-w-max obliga a la tabla a no aplastarse jamás */}
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                    <thead className="bg-[#1a1a1a] text-neutral-500 text-[10px] uppercase tracking-widest">
                      <tr>
                        <th className="px-5 py-4 font-black">Cliente</th>
                        <th className="px-5 py-4 font-black">WhatsApp</th>
                        <th className="px-5 py-4 font-black text-center">Visitas</th>
                        <th className="px-5 py-4 font-black">Última Visita</th>
                        <th className="px-5 py-4 font-black text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-300 divide-y divide-[#222]">
                      {[
                        { n: 'Carlos Gutiérrez', w: '987 654 321', v: 12, u: 'Hace 2 días' },
                        { n: 'Ana Mendoza', w: '912 345 678', v: 3, u: 'Hace 45 días' },
                        { n: 'Luis Fernández', w: '999 888 777', v: 28, u: 'Hoy' },
                      ].map((c, i) => (
                        <tr key={i} className="hover:bg-[#1a1a1a] transition-colors">
                          <td className="px-5 py-4 font-bold text-white flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#222] flex items-center justify-center text-xs font-bold text-[#ff5a1f] shrink-0">{c.n.charAt(0)}</div>
                            {c.n}
                          </td>
                          <td className="px-5 py-4 font-mono">{c.w}</td>
                          <td className="px-5 py-4 font-bold text-green-400 text-center">{c.v}</td>
                          <td className="px-5 py-4 text-xs">
                            <span className={c.u.includes('45') ? 'text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded' : ''}>
                              {c.u}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button className="bg-green-500/10 text-green-500 px-4 py-2 rounded-lg font-bold hover:bg-green-500 hover:text-white transition-colors text-xs">
                              Chat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ======================= VISTA: INVENTARIO ======================= */}
          {vistaActiva === 'inventario' && (
            <div className="animate-fadeIn space-y-6 max-w-5xl mx-auto">
              
              <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-2xl font-black text-white">Insumos y Stock</h3>
                  <p className="text-neutral-500 text-sm">Controla las mermas y asegura que no falte mercancía.</p>
                </div>
                <button className="bg-[#2463EB] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-500 transition-colors">
                  + Ingresar Compra (Factura)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { n: 'Pan de Hamburguesa', q: '12 Unidades', st: 'Bajo', c: 'border-red-500/50 bg-red-500/5' },
                  { n: 'Carne Molida (Res)', q: '15.5 Kg', st: 'Óptimo', c: 'border-[#333] bg-[#121212]' },
                  { n: 'Cerveza Pilsen', q: '4 Cajas', st: 'Alerta', c: 'border-yellow-500/50 bg-yellow-500/5' },
                ].map((ins, i) => (
                  <div key={i} className={`p-6 rounded-3xl border ${ins.c} relative overflow-hidden`}>
                    <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">{ins.st}</p>
                    <h4 className="text-xl font-black text-white">{ins.n}</h4>
                    <p className="text-3xl font-mono text-white mt-3 font-bold">{ins.q}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#111] border border-[#222] rounded-3xl p-6 flex items-start gap-4">
                <span className="text-4xl">💡</span>
                <div>
                  <h4 className="font-bold text-white text-lg">¿Cómo funciona el escandallo automático?</h4>
                  <p className="text-neutral-400 text-sm mt-1 leading-relaxed">
                    Cuando vincules una receta a un plato, el sistema hará el trabajo por ti. Si vendes una "Hamburguesa Simple", el sistema descontará automáticamente <strong>1 Pan</strong> y <strong>0.15 Kg de Carne</strong> de tu stock sin que el mesero tenga que hacer nada.
                  </p>
                  <button className="mt-4 px-4 py-2 border border-[#333] rounded-lg text-sm font-bold text-white hover:bg-[#222] transition-colors">
                    Configurar Recetas →
                  </button>
                </div>
              </div>
            </div>
          )}


        </main>
      </div>
      {/* MODAL PARA AGREGAR EMPLEADO */}
      {modalEmpleado && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#333] rounded-3xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="p-6 border-b border-[#222] bg-[#1a1a1a] flex justify-between items-center">
              <h3 className="text-xl font-black text-white">Nuevo Empleado</h3>
              <button onClick={() => setModalEmpleado(false)} className="text-neutral-500 font-bold">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Nombre Completo</label>
                <input type="text" className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none" placeholder="Ej. Juan Pérez" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Rol</label>
                  <select className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none">
                    {rolesDisponibles.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">PIN (4 Dígitos)</label>
                  <input type="password" maxLength="4" className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white text-center font-mono text-xl tracking-[10px] focus:border-[#ff5a1f] outline-none" placeholder="0000" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Sede Asignada</label>
                <select className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none">
                  {sedes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button className="w-full bg-[#ff5a1f] text-white py-4 rounded-xl font-black mt-4 shadow-lg active:scale-95 transition-all">
                CREAR ACCESO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}