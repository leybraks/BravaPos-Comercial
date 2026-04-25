import React, { useMemo, useState } from 'react';

export default function Erp_DashboardVentas({ 
  config, 
  sedeFiltro, 
  cambiarSedeFiltro, 
  sedesReales = [], 
  ordenesReales = [] 
}) {
  const isDark = config.temaFondo === 'dark';
  const [ordenDetalleId, setOrdenDetalleId] = useState(null);

  // ==========================================
  // 🛡️ 0. SEGURIDAD DE ROLES
  // ==========================================
  const rolUsuario = localStorage.getItem('usuario_rol')?.toLowerCase() || '';
  const esDueño = rolUsuario === 'dueño'; // Solo el Dueño puede ver múltiples sedes

  // ==========================================
  // 🕒 1. ESTADOS DE FILTRO DE TIEMPO
  // ==========================================
  const [tipoFiltroTiempo, setTipoFiltroTiempo] = useState('hoy');
  const [dropdownAbierto, setDropdownAbierto] = useState(false); 
  
  const hoyStr = new Date().toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);

  const opcionesTiempo = [
    { id: 'hoy', label: 'Hoy', icon: '📅' },
    { id: 'ayer', label: 'Ayer', icon: '⏳' },
    { id: 'semana', label: 'Esta Semana', icon: '📊' },
    { id: 'mes', label: 'Este Mes', icon: '📆' },
    { id: 'rango', label: 'Rango Específico...', icon: '⚙️' }
  ];

  const opcionActual = opcionesTiempo.find(opt => opt.id === tipoFiltroTiempo);

  // ==========================================
  // 🧠 2. MOTOR DE FILTRADO
  // ==========================================
  const ordenesFiltradas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    return ordenesReales.filter(orden => {
      const fechaOrden = new Date(orden.creado_en);
      fechaOrden.setHours(0, 0, 0, 0);

      if (tipoFiltroTiempo === 'hoy') return fechaOrden.getTime() === hoy.getTime();
      if (tipoFiltroTiempo === 'ayer') return fechaOrden.getTime() === ayer.getTime();
      if (tipoFiltroTiempo === 'semana') return fechaOrden >= inicioSemana;
      if (tipoFiltroTiempo === 'mes') return fechaOrden >= inicioMes;
      if (tipoFiltroTiempo === 'rango') {
        const inicio = new Date(fechaInicio + 'T00:00:00');
        const fin = new Date(fechaFin + 'T23:59:59');
        return fechaOrden >= inicio && fechaOrden <= fin;
      }
      return true;
    });
  }, [ordenesReales, tipoFiltroTiempo, fechaInicio, fechaFin]);

  // ==========================================
  // 📊 3. CÁLCULO DINÁMICO DE MÉTRICAS
  // ==========================================
  const metricasDinamicas = useMemo(() => {
    let ingresosTotales = 0;
    ordenesFiltradas.forEach(o => ingresosTotales += parseFloat(o.total || 0));
    const totalOrdenes = ordenesFiltradas.length;
    const ticketPromedio = totalOrdenes > 0 ? ingresosTotales / totalOrdenes : 0;
    return { ingresosTotales, totalOrdenes, ticketPromedio };
  }, [ordenesFiltradas]);

  // ==========================================
  // 📈 4. GRÁFICO DINÁMICO
  // ==========================================
  const datosGrafico = useMemo(() => {
    const agrupadito = {};
    ordenesFiltradas.forEach(o => {
      const fecha = new Date(o.creado_en);
      const diaStr = fecha.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' });
      agrupadito[diaStr] = (agrupadito[diaStr] || 0) + parseFloat(o.total || 0);
    });

    const dias = Object.keys(agrupadito);
    if (dias.length === 0) return [];
    const maxValor = Math.max(...Object.values(agrupadito), 1); 

    return dias.map(dia => ({
      dia,
      valor: agrupadito[dia].toFixed(2),
      alto: `${Math.round((agrupadito[dia] / maxValor) * 100)}%`
    })).slice(-7); 
  }, [ordenesFiltradas]);

  // ==========================================
  // 🍰 5. DISTRIBUCIÓN DE CANALES
  // ==========================================
  const distribucionVentas = useMemo(() => {
    let salon = 0, delivery = 0, llevar = 0;
    ordenesFiltradas.forEach(ord => {
      const origen = (ord.origen || ord.tipo || '').toLowerCase();
      if (origen.includes('delivery')) delivery++;
      else if (origen.includes('llevar')) llevar++;
      else salon++; 
    });
    const total = salon + delivery + llevar || 1; 
    return {
      salon, pSalon: Math.round((salon / total) * 100),
      delivery, pDelivery: Math.round((delivery / total) * 100),
      llevar, pLlevar: Math.round((llevar / total) * 100)
    };
  }, [ordenesFiltradas]);

  // ==========================================
  // 📥 6. EXPORTACIÓN INTELIGENTE
  // ==========================================
  const descargarReporteCSV = () => {
    if (ordenesFiltradas.length === 0) return alert("No hay ventas en este rango para exportar.");
    let contenidoCSV = "ID Orden,Fecha,Hora,Tipo de Venta,Origen,Estado Pago,Platos Servidos,Total (S/)\n";
    ordenesFiltradas.forEach(orden => {
      const fechaObj = new Date(orden.creado_en);
      const fecha = fechaObj.toLocaleDateString('es-PE');
      const hora = fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
      const origenLimpio = (orden.mesa_nombre || orden.cliente_nombre || orden.origen || 'Desconocido').replace(/,/g, '');
      const stringPlatos = orden.detalles?.map(d => `${d.cantidad}x ${d.producto_nombre}`).join(' | ') || 'Sin detalles';
      contenidoCSV += `${orden.id},${fecha},${hora},${orden.tipo?.toUpperCase() || 'SALON'},${origenLimpio},${orden.estado_pago?.toUpperCase() || 'PENDIENTE'},"${stringPlatos}",${orden.total}\n`;
    });
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_${sedeFiltro}_${tipoFiltroTiempo}.csv`;
    link.click();
  };

  return (
    <div className="animate-fadeIn pb-10 space-y-6">
      
      {/* ========== CABECERA SUPERIOR ========== */}
      <div className={`flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 p-3 rounded-3xl transition-all ${
        isDark ? 'bg-[#121212] border border-[#222]' : 'bg-white shadow-sm border border-gray-100'
      }`}>
        
        {/* ✨ FILTRO MULTI-SEDE (Condicional por Rol) */}
        {esDueño ? (
          <div className={`flex w-full xl:w-auto rounded-2xl p-1.5 overflow-x-auto custom-scrollbar shrink-0 ${
            isDark ? 'bg-[#0a0a0a] border border-[#1a1a1a]' : 'bg-gray-100/80 border border-gray-200/50'
          }`}>
            <button 
              onClick={() => cambiarSedeFiltro('Todas')}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
                sedeFiltro === 'Todas' ? 'text-white shadow-md' : isDark ? 'text-neutral-500 hover:text-white hover:bg-[#1a1a1a]' : 'text-gray-500 hover:text-gray-900 hover:bg-white'
              }`}
              style={sedeFiltro === 'Todas' ? { backgroundColor: config.colorPrimario } : {}}
            >
              General
            </button>
            {sedesReales?.map(s => (
              <button 
                key={s.id} 
                onClick={() => cambiarSedeFiltro(s.nombre)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
                  sedeFiltro === s.nombre ? 'text-white shadow-md' : isDark ? 'text-neutral-500 hover:text-white hover:bg-[#1a1a1a]' : 'text-gray-500 hover:text-gray-900 hover:bg-white'
                }`}
                style={sedeFiltro === s.nombre ? { backgroundColor: config.colorPrimario } : {}}
              >
                {s.nombre}
              </button>
            ))}
          </div>
        ) : (
          /* ✨ VISTA ADMINISTRADOR: Etiqueta fija de su sede */
          <div className={`flex items-center px-6 py-3 rounded-2xl shrink-0 ${
            isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-gray-50 border border-gray-200'
          }`}>
            <span className="text-xl mr-2">📍</span>
            <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              Sede Activa: 
              <span className={`ml-2 font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {localStorage.getItem('sede_nombre') || 'Local Principal'}
              </span>
            </span>
          </div>
        )}

        {/* Filtros de Tiempo y Exportar */}
        <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3 relative z-20">
          
          {/* DROPDOWN CUSTOMIZADO */}
          <div className="relative">
            <button 
              onClick={() => setDropdownAbierto(!dropdownAbierto)}
              className={`flex items-center justify-between min-w-[200px] px-5 py-3 rounded-2xl text-sm font-bold transition-colors w-full ${
                isDark ? 'bg-[#1a1a1a] border border-[#333] hover:border-[#555] text-white' : 'bg-white border border-gray-200 hover:border-gray-300 text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{opcionActual?.icon}</span> {opcionActual?.label}
              </span>
              <span className="text-xs opacity-50">▼</span>
            </button>

            {/* Menú Desplegable */}
            {dropdownAbierto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownAbierto(false)}></div>
                <div className={`absolute top-full mt-2 w-full rounded-2xl shadow-2xl z-20 overflow-hidden border animate-fadeIn ${
                  isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'
                }`}>
                  {opcionesTiempo.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setTipoFiltroTiempo(opt.id); setDropdownAbierto(false); }}
                      className={`flex items-center gap-3 w-full px-5 py-3.5 text-sm font-bold transition-colors text-left ${
                        tipoFiltroTiempo === opt.id 
                          ? (isDark ? 'bg-[#222] text-white' : 'bg-gray-100 text-gray-900') 
                          : (isDark ? 'text-neutral-400 hover:bg-[#222] hover:text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                      }`}
                    >
                      <span className="text-lg">{opt.icon}</span> {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* RANGOS DE FECHA CUSTOMIZADOS */}
          {tipoFiltroTiempo === 'rango' && (
            <div className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="relative flex items-center">
                <span className="absolute left-0 text-sm pointer-events-none opacity-50">🗓️</span>
                <input 
                  type="date" 
                  value={fechaInicio} 
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className={`bg-transparent outline-none pl-6 text-sm font-bold cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full ${isDark ? 'text-white' : 'text-gray-900'}`}
                />
              </div>
              <span className={`font-black ${isDark ? 'text-neutral-600' : 'text-gray-300'}`}>/</span>
              <div className="relative flex items-center">
                <span className="absolute left-0 text-sm pointer-events-none opacity-50">🗓️</span>
                <input 
                  type="date" 
                  value={fechaFin} 
                  onChange={(e) => setFechaFin(e.target.value)}
                  className={`bg-transparent outline-none pl-6 text-sm font-bold cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full ${isDark ? 'text-white' : 'text-gray-900'}`}
                />
              </div>
            </div>
          )}

          <button 
            onClick={descargarReporteCSV}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm text-white transition-all hover:brightness-110 active:scale-95 bg-[#107c41] shadow-lg shadow-[#107c41]/30 shrink-0"
            title="Exportar ventas del rango seleccionado"
          >
            <span className="text-lg">📊</span> <span className="sm:hidden xl:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* ========== ESTRUCTURA PC: 2 COLUMNAS ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TARJETAS DE MÉTRICAS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-center ${isDark ? 'bg-[#121212] border-[#222]' : 'bg-white shadow-sm border-gray-100'}`}>
              <p className={`font-bold uppercase tracking-widest text-[10px] mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Ingresos Netos</p>
              <h3 className={`text-3xl lg:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}><span className="text-xl text-neutral-500 mr-1">S/</span>{metricasDinamicas.ingresosTotales.toFixed(2)}</h3>
            </div>
            <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-center ${isDark ? 'bg-[#121212] border-[#222]' : 'bg-white shadow-sm border-gray-100'}`}>
              <p className={`font-bold uppercase tracking-widest text-[10px] mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Total Órdenes</p>
              <h3 className={`text-3xl lg:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{metricasDinamicas.totalOrdenes}</h3>
            </div>
            <div className={`p-6 rounded-3xl border transition-all flex flex-col justify-center ${isDark ? 'bg-[#121212] border-[#222]' : 'bg-white shadow-sm border-gray-100'}`}>
              <p className={`font-bold uppercase tracking-widest text-[10px] mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Ticket Promedio</p>
              <h3 className={`text-3xl lg:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}><span className="text-xl text-neutral-500 mr-1">S/</span>{metricasDinamicas.ticketPromedio.toFixed(2)}</h3>
            </div>
          </div>

          {/* GRÁFICO DINÁMICO */}
          <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex justify-between items-end mb-8">
              <div>
                <h3 className={`font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Evolución de Ventas</h3>
                <p className={`text-sm mt-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Basado en el filtro actual</p>
              </div>
              <h3 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span className="text-xl text-neutral-500 mr-1">S/</span>{metricasDinamicas.ingresosTotales.toFixed(2)}
              </h3>
            </div>

            <div className="flex items-end justify-between h-48 gap-2 mt-4 relative border-b border-dashed border-neutral-700/30 dark:border-neutral-700/50 pb-2">
              {datosGrafico.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center">
                  <p className={`text-sm font-bold ${isDark ? 'text-neutral-600' : 'text-gray-400'}`}>No hay ventas para graficar</p>
                </div>
              ) : (
                datosGrafico.map((d, i) => (
                  <div key={i} className="flex flex-col items-end justify-end gap-1 h-full w-full group relative">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-[#1a1a1a] text-white px-2 py-1 rounded shadow-lg z-10 pointer-events-none whitespace-nowrap">
                      S/ {d.valor}
                    </span>
                    <div
                      style={{ height: d.alto, backgroundColor: config.colorPrimario }}
                      className="w-full rounded-t-xl transition-all duration-700 group-hover:brightness-125"
                    ></div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
                      {d.dia}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DISTRIBUCIÓN DE CANALES */}
          <div className={`p-8 rounded-3xl border transition-all ${isDark ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-100 shadow-sm'}`}>
            <h3 className={`font-black text-lg tracking-tight mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Canales de Venta</h3>
            
            {metricasDinamicas.totalOrdenes === 0 ? (
              <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>Esperando datos de ventas...</p>
            ) : (
              <div className="space-y-6">
                <div className="flex h-4 rounded-full overflow-hidden w-full bg-gray-200 dark:bg-[#222]">
                  <div style={{ width: `${distribucionVentas.pSalon}%`, backgroundColor: config.colorPrimario }} className="h-full transition-all duration-1000" title={`Salón: ${distribucionVentas.pSalon}%`}></div>
                  <div style={{ width: `${distribucionVentas.pDelivery}%` }} className="h-full bg-blue-500 transition-all duration-1000" title={`Delivery: ${distribucionVentas.pDelivery}%`}></div>
                  <div style={{ width: `${distribucionVentas.pLlevar}%` }} className="h-full bg-purple-500 transition-all duration-1000" title={`Para Llevar: ${distribucionVentas.pLlevar}%`}></div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colorPrimario }}></span><span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Salón</span></div>
                    <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{distribucionVentas.pSalon}% <span className="text-sm font-normal opacity-50">({distribucionVentas.salon})</span></p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span><span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Delivery</span></div>
                    <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{distribucionVentas.pDelivery}% <span className="text-sm font-normal opacity-50">({distribucionVentas.delivery})</span></p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-purple-500"></span><span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Llevar</span></div>
                    <p className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{distribucionVentas.pLlevar}% <span className="text-sm font-normal opacity-50">({distribucionVentas.llevar})</span></p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* FEED CON ALTURA INTELIGENTE */}
        <div className={`lg:col-span-1 rounded-3xl p-6 border flex flex-col transition-all ${
          isDark ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-100 shadow-sm'
        }`} 
        style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}>
          
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h3 className={`font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Detalle de Órdenes
            </h3>
            {tipoFiltroTiempo === 'hoy' && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            )}
          </div>
          
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {ordenesFiltradas.length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-full text-center rounded-2xl border border-dashed ${isDark ? 'border-[#333] text-neutral-500' : 'border-gray-200 text-gray-400'}`}>
                <span className="text-4xl mb-3 opacity-50">🛒</span>
                <p className="font-bold">Sin resultados.</p>
              </div>
            ) : (
              ordenesFiltradas.map(orden => {
                const isSelected = ordenDetalleId === orden.id;
                const icon = orden.origen?.toLowerCase().includes('delivery') ? '🛵' : orden.origen?.toLowerCase().includes('llevar') ? '🛍️' : '🍽️';
                
                return (
                  <div 
                    key={orden.id} 
                    className={`flex flex-col p-3 rounded-2xl transition-all border ${
                      isSelected 
                        ? (isDark ? 'bg-[#1a1a1a] border-[#444]' : 'bg-gray-50 border-gray-300 shadow-inner') 
                        : (isDark ? 'bg-transparent border-transparent hover:bg-[#1a1a1a]' : 'bg-transparent border-transparent hover:bg-gray-50')
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${isDark ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-200'}`}>
                          {icon}
                        </div>
                        <div>
                          <p className={`font-bold text-sm mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{orden.origen}</p>
                          <p className={`text-[10px] font-bold font-mono ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                            #{orden.id} • {new Date(orden.creado_en).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <p className={`font-black text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          S/{parseFloat(orden.total).toFixed(2)}
                        </p>
                        <button 
                          onClick={() => setOrdenDetalleId(isSelected ? null : orden.id)}
                          className={`text-[10px] font-black uppercase tracking-widest mt-1 transition-colors ${
                            isSelected ? 'text-[#ff5a1f]' : 'text-neutral-500 hover:text-[#ff5a1f]'
                          }`}
                        >
                          {isSelected ? 'Ocultar ▲' : 'Ver Platos ▼'}
                        </button>
                      </div>
                    </div>

                    {isSelected && (
                      <div className={`mt-4 pt-3 border-t border-dashed animate-slideDown ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
                        <div className="space-y-2">
                          {orden.detalles?.map((det, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <p className={`text-xs ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
                                <span className="font-black text-[#ff5a1f] mr-2">{det.cantidad}x</span>
                                {det.producto_nombre}
                              </p>
                              <p className={`text-xs font-mono ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                                S/{(det.cantidad * det.precio_unitario).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>
                        {orden.notas && (
                          <div className="mt-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <p className="text-[10px] text-yellow-600 font-bold uppercase">Nota:</p>
                            <p className="text-[11px] text-yellow-700 italic">{orden.notas}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}