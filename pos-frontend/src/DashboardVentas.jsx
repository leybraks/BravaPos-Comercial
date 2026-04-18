import React from 'react';

export default function DashboardVentas({ 
  config, 
  sedeFiltro, 
  cambiarSedeFiltro, 
  sedesReales, 
  metricas,
  ordenesReales
}) {

  // ✨ LA MAGIA DE LA EXPORTACIÓN (Nivel Power BI)
  // ⚠️ Asegúrate de recibir 'ordenesReales' en las props de este componente
  const descargarReporteCSV = () => {
    if (!ordenesReales || ordenesReales.length === 0) {
      alert("No hay ventas para exportar en este momento.");
      return;
    }

    // 1. Cabeceras analíticas para Power BI
    // Agregamos Fecha, Tipo de Venta, Estado de Pago y el detalle de los Platos
    let contenidoCSV = "ID Orden,Fecha,Hora,Tipo de Venta,Origen,Estado Pago,Platos Servidos,Total (S/)\n";

    // 2. Recorremos TODAS las órdenes reales que llegaron de Django
    ordenesReales.forEach(orden => {
      
      // Formateamos la fecha y hora desde el 'creado_en' de Django
      const fechaObj = new Date(orden.creado_en);
      const fecha = fechaObj.toLocaleDateString('es-PE');
      const hora = fechaObj.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });

      // Limpiamos los textos (quitamos comas que puedan romper el Excel)
      const origenLimpio = (orden.mesa_nombre || orden.cliente_nombre || orden.origen || 'Desconocido').replace(/,/g, '');
      const tipoVenta = orden.tipo ? orden.tipo.toUpperCase() : 'SALON';
      const estadoPago = orden.estado_pago ? orden.estado_pago.toUpperCase() : 'PENDIENTE';

      // 🍔 MAGIA: Juntamos todos los platos en un solo bloque de texto
      // Quedará así: "1x Mixto Anticuchero | 2x Gaseosa Personal"
      const stringPlatos = orden.detalles && orden.detalles.length > 0
        ? orden.detalles.map(d => `${d.cantidad}x ${d.producto_nombre}`).join(' | ')
        : 'Sin detalles';

      // 3. Armamos la fila. 
      // OJO: Ponemos stringPlatos entre comillas dobles para que Excel no lo divida si hay textos raros.
      const fila = `${orden.id},${fecha},${hora},${tipoVenta},${origenLimpio},${estadoPago},"${stringPlatos}",${orden.total}`;
      contenidoCSV += fila + "\n";
    });

    // 4. Forzamos la descarga con BOM para que Excel lea las tildes (Ej: "Salón")
    const blob = new Blob(["\uFEFF" + contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const fechaHoy = new Date().toLocaleDateString().replace(/\//g, '-');
    link.setAttribute("download", `Data_PowerBI_BravaPOS_${sedeFiltro}_${fechaHoy}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fadeIn space-y-6">
      
      {/* ========== CABECERA: FILTROS Y EXPORTACIÓN ========== */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 p-2 rounded-2xl border transition-colors ${
        config.temaFondo === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-gray-100 border-gray-300'
      }`}>
        
        {/* Filtro Multi-Sede */}
        <div className={`flex w-full md:w-auto rounded-xl p-1 overflow-x-auto transition-colors custom-scrollbar ${
          config.temaFondo === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-200'
        }`}>
          <button 
            onClick={() => cambiarSedeFiltro('Todas')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all shrink-0 ${
              sedeFiltro === 'Todas' 
                ? 'text-white shadow-md' 
                : config.temaFondo === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
            style={sedeFiltro === 'Todas' ? { backgroundColor: config.colorPrimario } : {}}
          >
            Todas
          </button>
          {sedesReales.map(s => (
            <button 
              key={s.id} 
              onClick={() => cambiarSedeFiltro(s.nombre)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all shrink-0 ${
                sedeFiltro === s.nombre 
                  ? 'text-white shadow-md' 
                  : config.temaFondo === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
              style={sedeFiltro === s.nombre ? { backgroundColor: config.colorPrimario } : {}}
            >
              {s.nombre}
            </button>
          ))}
        </div>

        {/* ✨ NUEVO: Botón de Exportar */}
        <button 
          onClick={descargarReporteCSV}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm text-white transition-all hover:brightness-110 active:scale-95 shadow-lg shrink-0"
          style={{ backgroundColor: '#107c41' }} // Color verde clásico de Excel
          title="Descargar datos para Power BI o Excel"
        >
          <span>📊</span> Exportar CSV
        </button>
      </div>

      {/* ========== TARJETAS DE MÉTRICAS ========== */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className={`col-span-2 md:col-span-1 p-6 rounded-3xl border transition-all ${
          config.temaFondo === 'dark' ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <p className={`font-bold uppercase tracking-widest text-[10px] mb-2 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
            Ingresos Totales
          </p>
          <h3 className={`text-3xl md:text-4xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            S/ {metricas.ventas.toFixed(2)}
          </h3>
        </div>

        <div className={`col-span-1 p-5 md:p-6 rounded-3xl border transition-all ${
          config.temaFondo === 'dark' ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <p className={`font-bold uppercase tracking-widest text-[10px] mb-2 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
            Órdenes
          </p>
          <h3 className={`text-2xl md:text-4xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {metricas.ordenes}
          </h3>
        </div>

        <div className={`col-span-1 p-5 md:p-6 rounded-3xl border transition-all ${
          config.temaFondo === 'dark' ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          <p className={`font-bold uppercase tracking-widest text-[10px] mb-2 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
            Ticket Promedio
          </p>
          <h3 className={`text-2xl md:text-4xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            S/ {metricas.ticketPromedio.toFixed(2)}
          </h3>
        </div>
      </div>

      {/* ========== ACTIVIDAD RECIENTE ========== */}
      <div className={`rounded-3xl p-6 border transition-all ${
        config.temaFondo === 'dark' ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Actividad Reciente
        </h3>
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {metricas.actividadReciente.length === 0 ? (
            <p className={`text-sm text-center py-4 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
              Sin ventas el día de hoy.
            </p>
          ) : (
            metricas.actividadReciente.map(orden => (
              <div key={orden.id} className={`flex justify-between items-center p-4 rounded-xl border transition-all ${
                config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}>
                <div>
                  <p className={`font-bold ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Orden #{orden.id}
                  </p>
                  <p className={`text-xs mt-0.5 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                    {orden.origen} • {orden.hora}
                  </p>
                </div>
                <p className={`font-black text-right ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  S/ {orden.total.toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}