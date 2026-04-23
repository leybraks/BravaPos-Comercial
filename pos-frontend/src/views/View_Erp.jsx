import React from 'react';
import { useErpDashboard } from '../features/ERP/useErpDashboard'; // 👈 Importamos nuestro Hook

// ==========================================
// 📦 IMPORTACIÓN DE COMPONENTES MODULARIZADOS
// ==========================================
import Erp_DashboardVentas from '../features/ERP/Erp_DashboardVentas';
import Erp_DashboardCartaQR from '../features/ERP/Erp_DashboardCartaQR';
import Erp_EditorMenu from '../features/ERP/Erp_EditorMenu';
import Erp_EditorPlanos from '../features/ERP/Erp_EditorPlanos';
import Erp_Inventario from '../features/ERP/Erp_Inventario';
import Erp_Personal from '../features/ERP/Erp_Personal';
import Erp_Crm from '../features/ERP/Erp_Crm';
import Erp_Configuracion from '../features/ERP/Erp_Configuracion';

// 🧩 MODALES MODULARIZADOS
import Erp_ModalCambios from '../features/ERP/Erp_ModalCambios';
import Erp_ModalCategorias from '../features/ERP/Erp_ModalCategorias';
import Erp_ModalEmpleado from '../features/ERP/Erp_ModalEmpleado';
import Erp_ModalPlato from '../features/ERP/Erp_ModalPlato';
import Erp_ModalReceta from '../features/ERP/Erp_ModalReceta';
import Erp_ModalVariaciones from '../features/ERP/Erp_ModalVariaciones';
import Erp_Sidebar from '../features/ERP/Erp_Sidebar';

export default function ErpDashboard({ onVolverAlPos }) {
  // ✨ LA MAGIA: Extraemos todo el estado y funciones desde nuestro custom hook en una sola línea
  const {
    tema, colorPrimario, config, setConfig, vistaActiva, 
    sedeFiltro, cambiarSedeFiltro, sedeFiltroId, setSedeFiltroId, 
    menuAbierto, setMenuAbierto,isCollapsed, setIsCollapsed, modalEmpleado, setModalEmpleado, 
    modalVariacionesOpen, setModalVariacionesOpen, productoParaVariaciones, setProductoParaVariaciones, 
    categorias, guardandoConfig, productosReales, 
    modalPlato, setModalPlato, pasoModal, setPasoModal, formPlato, setFormPlato,
    empleadosReales, sedesReales, formEmpleado, setFormEmpleado, metricas, 
    modalCategorias, setModalCategorias, nombreNuevaCat, setNombreNuevaCat, 
    modalRecetaOpen, setModalRecetaOpen, productoParaReceta, setProductoParaReceta, 
    modalCambiosPendientes, rolesFiltrados, ordenesReales,
    
    // Funciones
    manejarCambioVista, descartarCambios, guardarYCambiarVista,
    cancelarCambioVista, manejarGuardarConfig, abrirModalEdicion, toggleActivo,
    manejarGuardarEmpleado, manejarGuardarPlato, manejarCrearCategoria,
    eliminarCategoriaLocal, toggleDisponibilidad, abrirModalEditar, cerrarModalPlato
  } = useErpDashboard();

  return (
    <div className={`min-h-screen font-sans flex transition-colors duration-500 ${tema === 'dark' ? 'bg-[#0a0a0a] text-neutral-100' : 'bg-[#f0f0f0] text-neutral-900'}`}>
      
      {/* 🧭 BARRA LATERAL */}
      <Erp_Sidebar 
        vistaActiva={vistaActiva} 
        manejarCambioVista={manejarCambioVista} 
        menuAbierto={menuAbierto} 
        setMenuAbierto={setMenuAbierto} 
        onVolverAlPos={onVolverAlPos} 
        isCollapsed={isCollapsed}       
        setIsCollapsed={setIsCollapsed} 
      />

      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'md:ml-24' : 'md:ml-72'}`}>
        
        {/* 🏷️ CABECERA MÓVIL Y TÍTULO */}
        <header className="bg-[#111] border-b border-[#222] p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setMenuAbierto(true)} className="md:hidden bg-[#222] p-2 rounded-lg text-white">☰</button>
            <h2 className="text-xl font-black capitalize tracking-tight text-white">{vistaActiva.replace('_', ' ')}</h2>
          </div>
        </header>

        {/* 🖥️ ÁREA PRINCIPAL DE RENDERIZADO */}
        <main className="p-4 md:p-8 flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          
          {vistaActiva === 'dashboard' && (
            <Erp_DashboardVentas config={config} sedeFiltro={sedeFiltro} cambiarSedeFiltro={cambiarSedeFiltro} sedesReales={sedesReales} metricas={metricas} ordenesReales={ordenesReales} />
          )}

          {vistaActiva === 'config' && (
            <Erp_Configuracion config={config} setConfig={setConfig} manejarGuardarConfig={manejarGuardarConfig} guardandoConfig={guardandoConfig} />
          )}

          {vistaActiva === 'menu' && (
            <Erp_EditorMenu categorias={categorias} productosReales={productosReales} onOpenCategorias={() => setModalCategorias(true)} onOpenPlatoNuevo={() => { cerrarModalPlato(); setModalPlato(true); }} onEditPlato={abrirModalEditar} onToggleDisponibilidad={toggleDisponibilidad} onOpenReceta={(plato) => { setProductoParaReceta(plato); setModalRecetaOpen(true); }} onOpenVariaciones={(plato) => { setProductoParaVariaciones(plato); setModalVariacionesOpen(true); }} />
          )}

          {vistaActiva === 'personal' && (
            <Erp_Personal config={config} empleadosReales={empleadosReales} sedesReales={sedesReales} sedeFiltroId={sedeFiltroId} onCambiarSedeFiltro={(id) => setSedeFiltroId(id || null)} onNuevoEmpleado={() => setModalEmpleado(true)} onEditarEmpleado={abrirModalEdicion} onToggleActivo={toggleActivo} />
          )}

          {vistaActiva === 'crm' && (
            <Erp_Crm config={config} />
          )}

          {vistaActiva === 'inventario' && (
            <Erp_Inventario />
          )}

          {vistaActiva === 'carta_qr' && (
            <Erp_DashboardCartaQR config={config} />
          )}

          {vistaActiva === 'diseno_salon' && (
            <Erp_EditorPlanos />
          )}

          {/* Vistas en construcción */}
          {['bot_wsp', 'facturacion'].includes(vistaActiva) && (
            <div className="animate-fadeIn max-w-4xl mx-auto space-y-6">
              <div className={`rounded-3xl p-8 text-center border ${tema === 'dark' ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-200 shadow-sm'}`}>
                <div className="text-7xl mb-4">{vistaActiva === 'bot_wsp' ? '🤖' : '🧾'}</div>
                <h2 className={`text-2xl font-black mb-2 ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {vistaActiva === 'bot_wsp' ? 'Bot de Pedidos por WhatsApp' : 'Facturación Electrónica'}
                </h2>
                <p className={`mb-6 ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-600'}`}>Módulo en desarrollo. Próximamente disponible.</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff5a1f]/10 text-[#ff5a1f] text-sm font-bold">🚧 Próximamente</div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ========================================== */}
      {/* 🧩 ZONA DE MODALES (Invisibles hasta usarse) */}
      {/* ========================================== */}
      
      <Erp_ModalEmpleado isOpen={modalEmpleado} config={config} formEmpleado={formEmpleado} setFormEmpleado={setFormEmpleado} rolesFiltrados={rolesFiltrados} sedesReales={sedesReales} onGuardar={manejarGuardarEmpleado} onClose={() => { setModalEmpleado(false); setFormEmpleado({ id: null, nombre: '', pin: '', rol: rolesFiltrados[0]?.id || '', sede: sedesReales[0]?.id || '' }); }} />
      
      <Erp_ModalPlato isOpen={modalPlato} onClose={cerrarModalPlato} formPlato={formPlato} setFormPlato={setFormPlato} pasoModal={pasoModal} setPasoModal={setPasoModal} categorias={categorias} manejarGuardarPlato={manejarGuardarPlato} />
      
      <Erp_ModalCategorias isOpen={modalCategorias} onClose={() => setModalCategorias(false)} tema={tema} colorPrimario={colorPrimario} nombreNuevaCat={nombreNuevaCat} setNombreNuevaCat={setNombreNuevaCat} manejarCrearCategoria={manejarCrearCategoria} categorias={categorias} eliminarCategoriaLocal={eliminarCategoriaLocal} />
      
      <Erp_ModalCambios isOpen={modalCambiosPendientes} config={config} onGuardar={guardarYCambiarVista} onDescartar={descartarCambios} onCancelar={cancelarCambioVista} />
      
      <Erp_ModalReceta isOpen={modalRecetaOpen} onClose={() => setModalRecetaOpen(false)} producto={productoParaReceta} config={config} />
      
      <Erp_ModalVariaciones isOpen={modalVariacionesOpen} onClose={() => setModalVariacionesOpen(false)} producto={productoParaVariaciones} config={config} />

    </div>
  );
}