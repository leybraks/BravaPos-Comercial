import React, { useState, useEffect } from 'react';
import { 
  obtenerMetricasDashboard, 
  getEmpleados, 
  getRoles, 
  getSedes, 
  getOrdenes,
  crearEmpleado,
  getProductos,
  crearProducto,
  actualizarProducto,
  parchearProducto,
  getCategorias,
  crearCategoria,
  actualizarNegocio,
  actualizarEmpleado,
  parchearCategoria,
  
} from './api/api';
import api from './api/api';
import usePosStore from './store/usePosStore';
import EditorPlanos from './EditorPlanos';
import InventarioView from './InventarioView';
import EditorMenu from './EditorMenu';
import ModalConfigurarReceta from './ModalConfigurarReceta';
import ModalVariaciones from './ModalVariaciones';
import DashboardVentas from './DashboardVentas';
import DashboardCartaQR from './DashboardCartaQR';
import ModalFormularioPlato from './ModalFormularioPlato';
export default function ErpDashboard({ onVolverAlPos }) {
  const { configuracionGlobal } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const setConfiguracionGlobal = usePosStore((state) => state.setConfiguracionGlobal);
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const [ordenesReales, setOrdenesReales] = useState([]);
  const [vistaActiva, setVistaActiva] = useState('dashboard');
  const [sedeFiltro, setSedeFiltro] = useState('Todas');
  const [sedeFiltroId, setSedeFiltroId] = useState(null); // ✨ Nuevo: ID real de la sede
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalEmpleado, setModalEmpleado] = useState(false);
  const [modalVariacionesOpen, setModalVariacionesOpen] = useState(false);
  const [productoParaVariaciones, setProductoParaVariaciones] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [config, setConfig] = useState({
    numeroYape: '',
    modSalon: true, 
    modCocina: false,
    modDelivery: false,
    modInventario: false,
    modClientes: false,
    modFacturacion: false,
    colorPrimario: '#ff5a1f', 
    temaFondo: 'dark',
    qrPreview: null, // ✨ Agregado
    qrFile: null,     // ✨ Agregado
    permisosPlan: {}
  });
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [productosReales, setProductosReales] = useState([]);
  const [modalPlato, setModalPlato] = useState(false);
  const [pasoModal, setPasoModal] = useState(1);
  const [formPlato, setFormPlato] = useState({ 
    id: null, 
    nombre: '', 
    precio_base: '', 
    categoria_id: '', 
    es_venta_rapida: true,
    requiere_seleccion: false, 
    tiene_variaciones: false, 
    disponible: true,
    grupos_variacion: []
  });
  const [empleadosReales, setEmpleadosReales] = useState([]);
  const [rolesReales, setRolesReales] = useState([]);
  const [sedesReales, setSedesReales] = useState([]);
  
  const [formEmpleado, setFormEmpleado] = useState({
    id: null,
    nombre: '',
    pin: '',
    rol: '', 
    sede: '' 
  });

  const [metricas, setMetricas] = useState({
    ventas: 0, 
    ordenes: 0, 
    ticketPromedio: 0,
    actividadReciente: []
  });

  const [modalCategorias, setModalCategorias] = useState(false);
  const [nombreNuevaCat, setNombreNuevaCat] = useState('');
  // 🔥 Estados para la Ingeniería de Menú (Recetas)
  const [modalRecetaOpen, setModalRecetaOpen] = useState(false);
  const [productoParaReceta, setProductoParaReceta] = useState(null);
  // Estados para el modal de cambios pendientes
  const [configOriginal, setConfigOriginal] = useState(null); // Copia de la config al entrar
  const [hayCambiosPendientes, setHayCambiosPendientes] = useState(false);
  const [modalCambiosPendientes, setModalCambiosPendientes] = useState(false);
  const [vistaPendiente, setVistaPendiente] = useState(null); // guarda a qué vista quería ir
  // Reiniciar la copia original cada vez que entramos a la pantalla de configuración
  useEffect(() => {
    if (vistaActiva === 'config' && config) {
      // Guardamos una copia exacta del estado actual de config
      setConfigOriginal(JSON.parse(JSON.stringify(config)));
      // Aseguramos que no haya cambios pendientes al entrar
      setHayCambiosPendientes(false);
    }
  }, [config,vistaActiva]); // Solo depende de que se active la vista 'config'
  // ==========================================
  // 📊 EFECTO 1: MÉTRICAS DINÁMICAS
  // ==========================================
  useEffect(() => {
    if (vistaActiva === 'dashboard') {
      const cargarDatos = async () => {
        try {
          // ✨ Pedimos a Django las métricas y la lista completa de órdenes a la vez
          const [resMetricas, resOrdenes] = await Promise.all([
            obtenerMetricasDashboard({ sede_id: sedeFiltroId }),
            getOrdenes({ sede_id: sedeFiltroId }) 
          ]);
          
          setMetricas(resMetricas.data);
          setOrdenesReales(resOrdenes.data); // ✨ Guardamos la data cruda para Power BI

        } catch (error) {
          console.error("Error al cargar métricas u órdenes:", error);
        }
      };
      
      cargarDatos();
      const intervalo = setInterval(cargarDatos, 10000);
      return () => clearInterval(intervalo);
    }
  }, [vistaActiva, sedeFiltroId]);

  // ==========================================
  // 👥 EFECTO 2: GESTIÓN DE PERSONAL
  // ==========================================
  useEffect(() => {
    if (vistaActiva === 'personal') {
      const cargarDatosPersonal = async () => {
        try {
          const negocioId = localStorage.getItem('negocio_id') || 1; // ✨ Sacamos el ID de la tablet

          const [resEmpleados, resRoles, resSedes] = await Promise.all([
            getEmpleados({ sede_id: sedeFiltroId }), 
            getRoles(), 
            // ✨ LA MAGIA: Hacemos la petición manual para pasarle el negocio_id
            api.get(`/sedes/?negocio_id=${negocioId}`) 
          ]);

          setEmpleadosReales(resEmpleados.data);
          setRolesReales(resRoles.data);
          setSedesReales(resSedes.data);
          
          if (resRoles.data.length > 0) setFormEmpleado(prev => ({ ...prev, rol: resRoles.data[0].id }));
          if (resSedes.data.length > 0) setFormEmpleado(prev => ({ ...prev, sede: resSedes.data[0].id }));
        } catch (error) {
          console.error("Error cargando personal:", error);
        }
      };
      cargarDatosPersonal();
    }
  }, [vistaActiva, sedeFiltroId]);

  // ==========================================
  // 🍔 EFECTO 3: EDITOR DE MENÚ
  // ==========================================
  useEffect(() => {
    if (vistaActiva === 'menu') {
      const cargarMenu = async () => {
        try {
          // ✨ Traemos los productos y las categorías al mismo tiempo
          const [resProductos, resCategorias] = await Promise.all([
            getProductos({ sede_id: sedeFiltroId }),
            getCategorias()
          ]);
          
          setProductosReales(resProductos.data);
          setCategorias(resCategorias.data); // 👈 ¡Llenamos la variable misteriosa!
          
        } catch (error) {
          console.error("Error cargando menú y categorías:", error);
        }
      };
      cargarMenu();
    }
  }, [vistaActiva, sedeFiltroId]);

  // ==========================================
  // ⚙️ EFECTO 4: CARGA GLOBAL DE CONFIGURACIÓN
  // ==========================================
  useEffect(() => {
    const cargarConfiguracionGlobal = async () => {
      try {
        const negocioId = localStorage.getItem('negocio_id') || 1;
        const response = await api.get(`/negocios/${negocioId}/`);
        const datosBD = response.data;
        
        // 1. Guardamos para el formulario local (como ya lo tenías)
        setConfig({
          numeroYape: datosBD.numero_yape || '',
          modSalon: datosBD.mod_salon_activo ?? true,
          modCocina: datosBD.mod_cocina_activo ?? false,
          modInventario: datosBD.mod_inventario_activo ?? false,
          modDelivery: datosBD.mod_delivery_activo ?? false,
          modClientes: datosBD.mod_clientes_activo ?? false,
          modFacturacion: datosBD.mod_facturacion_activo ?? false,
          modCartaQr: datosBD.mod_carta_qr_activo ?? false,
          modBotWsp: datosBD.mod_bot_wsp_activo ?? false,
          modMl: datosBD.mod_ml_activo ?? false,
          colorPrimario: datosBD.color_primario || '#ff5a1f',
          temaFondo: datosBD.tema_fondo || 'dark',
          permisosPlan: datosBD.plan_detalles || {},
          qrPreview: null,
          qrFile: null
        });
        setConfigOriginal(JSON.parse(JSON.stringify({
          numeroYape: datosBD.numero_yape || '',
          modSalon: datosBD.mod_salon_activo ?? true,
          modCocina: datosBD.mod_cocina_activo ?? false,
          modInventario: datosBD.mod_inventario_activo ?? false,
          modDelivery: datosBD.mod_delivery_activo ?? false,
          modClientes: datosBD.mod_clientes_activo ?? false,
          modFacturacion: datosBD.mod_facturacion_activo ?? false,
          modCartaQr: datosBD.mod_carta_qr_activo ?? false,
          modBotWsp: datosBD.mod_bot_wsp_activo ?? false,
          modMl: datosBD.mod_ml_activo ?? false,
          colorPrimario: datosBD.color_primario || '#ff5a1f',
          temaFondo: datosBD.tema_fondo || 'dark',
          permisosPlan: datosBD.plan_detalles || {},
          qrPreview: null,
          qrFile: null
        }))); // Guardamos una copia para comparar cambios
        // ✨ 2. ¡LA MAGIA! Disparamos los datos al estado global para que TODO el POS los escuche
        setConfiguracionGlobal({
          colorPrimario: datosBD.color_primario || '#ff5a1f',
          temaFondo: datosBD.tema_fondo || 'dark',
          numeroYape: datosBD.numero_yape || '',
          modulos: {
            salon: datosBD.mod_salon_activo ?? true,
            cocina: datosBD.mod_cocina_activo ?? false,
            delivery: datosBD.mod_delivery_activo ?? false,
            inventario: datosBD.mod_inventario_activo ?? false,
            clientes: datosBD.mod_clientes_activo ?? false,
            facturacion: datosBD.mod_facturacion_activo ?? false,
            cartaQr: datosBD.mod_carta_qr_activo ?? false,
            botWsp: datosBD.mod_bot_wsp_activo ?? false,
            machineLearning: datosBD.mod_ml_activo ?? false
          }
        });

      } catch (error) {
        console.error("Error cargando configuración inicial:", error);
      }
    };

    cargarConfiguracionGlobal();
  }, [setConfiguracionGlobal]);

  // Detectar cambios pendientes en la configuración
  useEffect(() => {
    if (configOriginal && vistaActiva === 'config') {
      const hayCambios = 
        config.numeroYape !== configOriginal.numeroYape ||
        config.modSalon !== configOriginal.modSalon ||
        config.modCocina !== configOriginal.modCocina ||
        config.modDelivery !== configOriginal.modDelivery ||
        config.modInventario !== configOriginal.modInventario ||
        config.modClientes !== configOriginal.modClientes ||
        config.modFacturacion !== configOriginal.modFacturacion ||
        config.modCartaQr !== configOriginal.modCartaQr ||
        config.modBotWsp !== configOriginal.modBotWsp ||
        config.modMl !== configOriginal.modMl ||
        config.colorPrimario !== configOriginal.colorPrimario ||
        config.temaFondo !== configOriginal.temaFondo;
      
      setHayCambiosPendientes(hayCambios);
    } else {
      setHayCambiosPendientes(false);
    }
  }, [config, configOriginal, vistaActiva]);
  
  // Advertir al recargar la página si hay cambios pendientes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (vistaActiva === 'config' && hayCambiosPendientes) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Seguro que quieres salir?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [vistaActiva, hayCambiosPendientes]);

  // Reiniciar la copia original cada vez que entramos a la pantalla de configuración
  useEffect(() => {
    if (vistaActiva === 'config' && config) {
      setConfigOriginal(JSON.parse(JSON.stringify(config)));
      setHayCambiosPendientes(false);
    }
  }, [config ,vistaActiva]);
  // Manejador de cambio de sede ✨
  const cambiarSedeFiltro = (sede) => {
    if (sede === 'Todas') {
      setSedeFiltro('Todas');
      setSedeFiltroId(null);
    } else {
      setSedeFiltro(sede.nombre);
      setSedeFiltroId(sede.id);
    }
  };
  const manejarCambioVista = (nuevaVista) => {
    if (vistaActiva === 'config' && hayCambiosPendientes) {
      setVistaPendiente(nuevaVista);
      setModalCambiosPendientes(true);
    } else {
      setVistaActiva(nuevaVista);
      setMenuAbierto(false);
    }
  };

  //MEJORAR FUNCIONAMIENTO 
  
  const Sidebar = () => {
    const { configuracionGlobal } = usePosStore();
    const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
    const modulos = configuracionGlobal?.modulos || {};
    const rolUsuario = localStorage.getItem('rol_usuario'); 
    const esDueño = rolUsuario === 'Dueño';

    // ✨ NUEVO: Estado para saber qué grupo está abierto. (Por defecto abrimos "Operaciones")
    const [grupoExpandido, setGrupoExpandido] = useState("Operaciones");

    const gruposMenu = [
      {
        titulo: "Operaciones",
        iconoGrupo: "⚡",
        items: [
          { id: 'dashboard', icono: '📊', nombre: 'Ventas en Vivo', show: true },
          { id: 'menu', icono: '🍔', nombre: 'Editor de Menú', show: true },
          { id: 'diseno_salon', icono: '🗺️', nombre: 'Diseño del Salón', show: true },
        ]
      },
      {
        titulo: "Administración",
        iconoGrupo: "🏢",
        items: [
          { id: 'inventario', icono: '📦', nombre: 'Inventario (Stock)', show: modulos.inventario },
          { id: 'personal', icono: '👥', nombre: 'Personal y Roles', show: true },
        ]
      },
      {
        titulo: "Crecimiento",
        iconoGrupo: "🚀",
        items: [
          { id: 'crm', icono: '💬', nombre: 'Marketing & CRM', show: modulos.clientes },
          { id: 'carta_qr', icono: '📱', nombre: 'Carta QR + Cuenta', show: modulos.cartaQr },
          { id: 'bot_wsp', icono: '🤖', nombre: 'Bot de WhatsApp', show: modulos.botWsp },
        ]
      },
      {
        titulo: "Sistema",
        iconoGrupo: "⚙️",
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
      <div className={`fixed inset-y-0 left-0 w-64 bg-[#111] border-r border-[#222] transform ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 z-50 flex flex-col`}>
        
        {/* LOGO */}
        <div className="p-6 shrink-0 border-b border-[#222] mb-4">
          <h1 className="text-2xl font-black text-white tracking-tight">
            BRAVA <span style={{ color: colorPrimario }}>POS</span>
          </h1>
          <p className="text-[10px] text-neutral-500 font-bold tracking-widest uppercase mt-1">ERP Cloud</p>
        </div>

        {/* NAVEGACIÓN DESPLEGABLE */}
        <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar pb-6 space-y-2">
          {gruposMenu.map((grupo, index) => {
            const itemsVisibles = grupo.items.filter(item => item.show);
            if (itemsVisibles.length === 0) return null;

            const isOpen = grupoExpandido === grupo.titulo;

            return (
              <div key={index} className="overflow-hidden rounded-2xl transition-all duration-300">
                {/* BOTÓN CABECERA DEL GRUPO */}
                <button 
                  onClick={() => setGrupoExpandido(isOpen ? null : grupo.titulo)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 font-bold transition-all ${
                    isOpen ? 'bg-[#1a1a1a] text-white' : 'text-neutral-400 hover:bg-[#161616] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg opacity-80">{grupo.iconoGrupo}</span>
                    <span className="text-sm tracking-wide">{grupo.titulo}</span>
                  </div>
                  <span className={`text-xs opacity-50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {/* LOS HIJOS (SUB-MENÚ) */}
                <div 
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100 mt-1 mb-2' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="space-y-1 px-2 border-l-2 border-[#222] ml-6 mr-2">
                    {itemsVisibles.map(item => {
                      const isActivo = vistaActiva === item.id;
                      
                      return (
                        <button 
                          key={item.id}
                          onClick={() => { manejarCambioVista(item.id); setMenuAbierto(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm
                            ${!isActivo ? 'text-neutral-500 hover:bg-[#1a1a1a] hover:text-white' : ''}`}
                          style={isActivo ? { 
                            backgroundColor: `${colorPrimario}15`, 
                            color: colorPrimario,
                            border: `1px solid ${colorPrimario}30` 
                          } : { border: '1px solid transparent' }}
                        >
                          <span className="text-base opacity-70">{item.icono}</span>
                          {item.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-[#222] bg-[#0a0a0a] space-y-3 shrink-0">
          <button 
            onClick={onVolverAlPos} 
            className="w-full text-white py-3.5 rounded-xl font-black hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
            style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 15px ${colorPrimario}40` }}
          >
            <span className="text-xl">🖥️</span> Ir al POS
          </button>

          <button 
            onClick={handleCerrarSesion} 
            className="w-full text-neutral-500 hover:text-red-500 hover:bg-red-500/10 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">🚪</span> Cerrar Sesión
          </button>
        </div>
      </div>
    );
  };



  // ==========================================
  // ⚙️ FUNCIONES DE CONTROL (RESTAURADAS)
  // ==========================================
  const guardarYCambiarVista = async () => {
    await manejarGuardarConfig(); // tu función existente
    setModalCambiosPendientes(false);
    if (vistaPendiente) {
      setVistaActiva(vistaPendiente);
      setVistaPendiente(null);
    }
    setMenuAbierto(false);
  };

  const descartarCambios = () => {
    // Restaurar la configuración original
    setConfig(JSON.parse(JSON.stringify(configOriginal)));
    setHayCambiosPendientes(false);
    setModalCambiosPendientes(false);
    if (vistaPendiente) {
      setVistaActiva(vistaPendiente);
      setVistaPendiente(null);
    }
    setMenuAbierto(false);
  };

  const cancelarCambioVista = () => {
    setModalCambiosPendientes(false);
    setVistaPendiente(null);
  };
  // 1. Guardar Configuración General
  const manejarGuardarConfig = async () => {
    setGuardandoConfig(true);
    try {
      // 1. Mapeamos TODO (incluyendo los nuevos módulos premium)
      const payload = {
        numero_yape: config.numeroYape,
        mod_salon_activo: config.modSalon,
        mod_cocina_activo: config.modCocina,
        mod_inventario_activo: config.modInventario,
        mod_delivery_activo: config.modDelivery,
        mod_clientes_activo: config.modClientes,
        mod_facturacion_activo: config.modFacturacion,
        mod_carta_qr_activo: config.modCartaQr,  // ✨ NUEVO
        mod_bot_wsp_activo: config.modBotWsp,    // ✨ NUEVO
        mod_ml_activo: config.modMl,             // ✨ NUEVO
        color_primario: config.colorPrimario,
        tema_fondo: config.temaFondo
      };

      const negocioId = localStorage.getItem('negocio_id'); 
      if (!negocioId) {
        alert("⚠️ No se encontró el ID del negocio en la tablet.");
        setGuardandoConfig(false);
        return;
      }

      // 2. Guardamos en Django
      await actualizarNegocio(negocioId, payload);
      
      // ✨ 3. ¡EL TOQUE MAESTRO! Le pasamos los datos frescos a Zustand
      setConfiguracionGlobal({
        colorPrimario: config.colorPrimario,
        temaFondo: config.temaFondo,
        numeroYape: config.numeroYape,
        modulos: {
          salon: config.modSalon,
          cocina: config.modCocina,
          delivery: config.modDelivery,
          inventario: config.modInventario,
          clientes: config.modClientes, // 👈 Al actualizar esto, el Sidebar lo esconde al instante
          facturacion: config.modFacturacion,
          cartaQr: config.modCartaQr,
          botWsp: config.modBotWsp,
          machineLearning: config.modMl

        }
      });
      setConfigOriginal(JSON.parse(JSON.stringify(config)));
      setHayCambiosPendientes(false);
      alert("✅ ¡Configuración guardada y aplicada al instante!");
      
    } catch (error) {
      console.error("Error guardando config:", error);
      alert("❌ Hubo un error al guardar los cambios en la base de datos.");
    } finally {
      setGuardandoConfig(false);
    }
  };

  // 2. Crear Nuevo Empleado
  const moduloKdsActivo = configuracionGlobal?.modulos?.cocina;
  const rolesFiltrados = rolesReales.filter(rol => {
    // Si el KDS está apagado y el rol dice 'Cocin' o 'Chef', lo ocultamos
    if (!moduloKdsActivo && (rol.nombre.toLowerCase().includes('cocin') || rol.nombre.toLowerCase().includes('chef'))) {
      return false;
    }
    return true; 
  });

  // ✏️ FUNCIÓN: Abrir modal para editar
  const abrirModalEdicion = (emp) => {
    setFormEmpleado({
      id: emp.id,
      nombre: emp.nombre,
      pin: '', // Dejamos el PIN vacío por seguridad, a menos que el usuario lo quiera cambiar
      rol: emp.rol, // Asegúrate de que tu backend manda el ID del rol aquí (ej. emp.rol_id o emp.rol)
      sede: emp.sede
    });
    setModalEmpleado(true);
  };

  // 🔴/🟢 FUNCIÓN: Desactivar / Reactivar
  const toggleActivo = async (emp) => {
    if (!window.confirm(`¿Seguro que deseas ${emp.activo ? 'desactivar' : 'reactivar'} a ${emp.nombre}?`)) return;
    
    try {
      await actualizarEmpleado(emp.id, { activo: !emp.activo });
      // Actualizamos el estado visual sin recargar la página
      setEmpleadosReales(prev => prev.map(e => e.id === emp.id ? { ...e, activo: !emp.activo } : e));
    } catch (error) {
      console.error("Error cambiando estado:", error);
      alert("Hubo un error de conexión con la base de datos.");
    }
  };

  // 💾 FUNCIÓN: Guardar (Sirve para Crear y para Editar)
  const manejarGuardarEmpleado = async () => {
    // Validación de PIN: Si estamos creando, es obligatorio. Si estamos editando, puede ser opcional (solo si lo quiere cambiar).
    const esCreacion = !formEmpleado.id;
    if (!formEmpleado.nombre || (esCreacion && formEmpleado.pin.length !== 4)) {
      alert("Por favor ingresa un nombre y un PIN de 4 dígitos válido.");
      return;
    }

    try {
      // ✨ PREPARAMOS EL PAQUETE A PRUEBA DE FALLOS PARA DJANGO
      const payload = { 
        nombre: formEmpleado.nombre,
        // Mandamos ambos formatos por si acaso (Django REST agarrará el que necesite)
        rol: formEmpleado.rol,
        rol_id: formEmpleado.rol,
        sede: formEmpleado.sede,
        sede_id: formEmpleado.sede
      };

      if (!esCreacion && formEmpleado.pin) {
        payload.pin = formEmpleado.pin; // Solo mandamos el pin si escribieron uno nuevo
      } else if (esCreacion) {
        payload.pin = formEmpleado.pin; // Obligatorio al crear
        payload.activo = true;
      }

      if (esCreacion) {
        await crearEmpleado(payload);
        alert("¡Empleado creado con éxito! 🎉");
      } else {
        await actualizarEmpleado(formEmpleado.id, payload);
        alert("¡Empleado actualizado correctamente!");
      }
      
      // Limpiamos y recargamos
      setModalEmpleado(false);
      setFormEmpleado({ id: null, nombre: '', pin: '', rol: rolesReales[0]?.id || '', sede: sedesReales[0]?.id || '' });
      
      const resEmpleados = await getEmpleados({ sede_id: sedeFiltroId });
      setEmpleadosReales(resEmpleados.data);
    } catch (error) {
      console.error("Error guardando empleado:", error);
      alert("Hubo un error al guardar los datos.");
    }
  };

  // 3. Guardar/Editar Plato del Menú
  const manejarGuardarPlato = async () => {
    if (!formPlato.nombre) return alert("El nombre del plato es obligatorio.");
    if (!formPlato.requiere_seleccion && !formPlato.precio_base) return alert("Debes ingresar un precio base.");

    // 👇 1. EL SALVAVIDAS: Si el localStorage está vacío, usamos el negocio 1 por defecto
    const negocioId = localStorage.getItem('negocio_id') || 1;

    const gruposLimpios = formPlato.grupos_variacion.map(grupo => ({
      ...grupo,
      opciones: grupo.opciones.map(op => ({
        ...op,
        precio_adicional: op.precio_adicional === '' ? "0.00" : op.precio_adicional 
      }))
    }));

    // 👇 2. Agregamos el 'negocio' directamente al paquete principal
    const payload = {
      negocio: negocioId, // 👈 ¡ESTA ES LA LÍNEA CLAVE!
      nombre: formPlato.nombre,
      precio_base: formPlato.precio_base === '' ? "0.00" : formPlato.precio_base,
      es_venta_rapida: formPlato.es_venta_rapida,
      requiere_seleccion: formPlato.requiere_seleccion,
      tiene_variaciones: formPlato.tiene_variaciones,
      disponible: formPlato.disponible,
      categoria: formPlato.categoria_id === '' ? null : formPlato.categoria_id, 
      grupos_variacion: gruposLimpios
    };

    try {
      if (formPlato.id) {
        await actualizarProducto(formPlato.id, payload);
      } else {
        // 👇 3. Como el payload ya tiene el negocio adentro, lo enviamos directo
        await crearProducto(payload); 
      }
      
      setModalPlato(false);
      setPasoModal(1);
      
      const res = await getProductos({ sede_id: sedeFiltroId });
      setProductosReales(res.data);
      alert("¡Plato guardado con éxito! 🎉");

    } catch (error) {
      console.error("Error al guardar plato:", error);
      
      // 2. EL CHISMOSO: Esto atrapará el error 400 y te dirá qué campo falló
      if (error.response && error.response.data) {
        console.error("💥 QUEJA EXACTA DE DJANGO:", error.response.data);
        
        // Formateamos el error para que sea legible en el alert
        const detallesError = Object.entries(error.response.data)
          .map(([campo, mensaje]) => `${campo.toUpperCase()}: ${mensaje}`)
          .join('\n');
          
        alert(`Django rechazó los datos:\n\n${detallesError}`);
      } else {
        alert("Hubo un error al guardar. Revisa la consola.");
      }
    }
  };

  // 📁 CREAR NUEVA CATEGORÍA RÁPIDA
  const manejarCrearCategoria = async () => {
    if (!nombreNuevaCat.trim()) return;

    try {
      const negocioId = localStorage.getItem('negocio_id') || 1; // El salvavidas de siempre
      
      const payload = {
        nombre: nombreNuevaCat,
        negocio: negocioId,
        orden: 0,
        activo: true
      };

      const res = await crearCategoria(payload);
      
      // Actualizamos la lista de categorías en pantalla al instante
      setCategorias([...categorias, res.data]);
      setNombreNuevaCat(''); // Limpiamos el input
      
    } catch (error) {
      console.error("Error al crear categoría:", error);
      alert("Hubo un error al crear la categoría.");
    }
  };

  // 🗑️ DESACTIVAR CATEGORÍA (Soft Delete)
  const eliminarCategoriaLocal = async (id) => {
    if(!window.confirm("¿Seguro que quieres ocultar esta categoría?")) return;
    try {
      await parchearCategoria(id, { activo: false });
      setCategorias(categorias.filter(c => c.id !== id));
    } catch (error) {
      console.error("Error eliminando categoría:", error);
    }
  };

  // 4. Cambiar disponibilidad (Agotado/Disponible)
  const toggleDisponibilidad = async (plato) => {
    try {
      // Usamos la nueva función PATCH que solo requiere el campo a cambiar
      await parchearProducto(plato.id, { disponible: !plato.disponible });
      
      // Actualizamos la pantalla de React
      setProductosReales(prev => prev.map(p => p.id === plato.id ? { ...p, disponible: !p.disponible } : p));
      
    } catch (error) {
      console.error("Error cambiando disponibilidad:", error);
      
      // El chismoso por si algo falla
      if (error.response && error.response.data) {
        alert(`Error al cambiar estado:\n${JSON.stringify(error.response.data)}`);
      }
    }
  };

  // 5. Abrir Modal para editar plato
  const abrirModalEditar = (plato) => {
    // Tomamos los grupos tal cual vienen de Django, y nos aseguramos de que
    // las opciones existan y usen el nombre correcto para el precio.
    const gruposFormateados = plato.grupos_variacion ? plato.grupos_variacion.map(grupo => ({
      ...grupo,
      opciones: grupo.opciones ? grupo.opciones.map(op => ({
        id: op.id, // Importante para editar después
        nombre: op.nombre,
        precio_adicional: op.precio_adicional // Usamos el nombre real de tu DB
      })) : []
    })) : [];

    setFormPlato({ 
      id: plato.id, 
      nombre: plato.nombre, 
      precio_base: plato.precio_base, 
      categoria_id: plato.categoria || '', 
      es_venta_rapida: plato.es_venta_rapida || false,
      requiere_seleccion: plato.requiere_seleccion || false,
      tiene_variaciones: plato.tiene_variaciones || false,
      disponible: plato.disponible,
      grupos_variacion: gruposFormateados // 👈 Solo usamos esto
    });
    setPasoModal(1);
    setModalPlato(true);
  };

  const cerrarModalPlato = () => {
    setModalPlato(false); // Oculta el modal
    setPasoModal(1);      // 👈 ¡Soluciona el problema de la segunda pantalla!
    
    // 👇 ¡Soluciona el problema de los cambios guardados sin querer!
    // Reseteamos el formulario a su estado original, totalmente en blanco
    setFormPlato({ 
      id: null, 
      nombre: '', 
      precio_base: '', 
      categoria_id: '', 
      es_venta_rapida: false,
      requiere_seleccion: false,
      tiene_variaciones: false,
      disponible: true,
      grupos_variacion: [] 
    });
  };
  
  function SedeSelector({ alCambiarSede }) {
    const [sedes, setSedes] = useState([]);
    const [sedeActual, setSedeActual] = useState(localStorage.getItem('sede_id') || '');

    useEffect(() => {
      async function cargarSedes() {
        const res = await getSedes();
        setSedes(res.data);
        if (!localStorage.getItem('sede_id') && res.data.length > 0) {
          alCambiarSede(res.data[0].id);
        }
      }
      cargarSedes();
    }, [alCambiarSede]);

    const cambiarSede = (id) => {
      localStorage.setItem('sede_id', id);
      setSedeActual(id);
      if (alCambiarSede) alCambiarSede(id);
      window.location.reload(); 
    };

    return (
      <div className="flex items-center gap-3 bg-[#111] p-2 rounded-2xl border border-[#222]">
        <span className="text-xs font-black text-neutral-500 uppercase ml-2">Sede:</span>
        <select 
          value={sedeActual} 
          onChange={(e) => cambiarSede(e.target.value)}
          className="bg-transparent text-white font-bold text-sm focus:outline-none cursor-pointer"
        >
          {sedes.map(s => (
            <option key={s.id} value={s.id} className="bg-[#111]">{s.nombre}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    
    <div className={`min-h-screen font-sans flex transition-colors duration-500 ${config.temaFondo === 'dark' ? 'bg-[#0a0a0a] text-neutral-100' : 'bg-[#f0f0f0] text-neutral-900'}`}>
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0">
        <header className="bg-[#111] border-b border-[#222] p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setMenuAbierto(true)} className="md:hidden bg-[#222] p-2 rounded-lg text-white">☰</button>
            <h2 className="text-xl font-black capitalize tracking-tight text-white">{vistaActiva}</h2>
          </div>
        </header>

        <main className="p-4 md:p-8 flex-1 overflow-y-auto overflow-x-hidden min-w-0 w-full">
          {/* ======================= VISTA: DASHBOARD ======================= */}
          {vistaActiva === 'dashboard' && (
          <DashboardVentas 
            config={config} 
            sedeFiltro={sedeFiltro} 
            cambiarSedeFiltro={cambiarSedeFiltro} 
            sedesReales={sedesReales} 
            metricas={metricas} 
            ordenesReales={ordenesReales} 
          />
        )}

          {/* ======================= VISTA: CONFIGURACIONES ======================= */}
          {vistaActiva === 'config' && (
            <div className="animate-fadeIn max-w-4xl mx-auto space-y-6 pb-20">
              
              {/* ================= SECCIÓN PAGOS DIGITALES ================= */}
              <div className={`rounded-3xl overflow-hidden shadow-lg transition-colors ${
                config.temaFondo === 'dark' ? 'bg-[#121212] border border-[#222]' : 'bg-white border border-neutral-200'
              }`}>
                <div className={`p-6 border-b transition-colors ${
                  config.temaFondo === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-neutral-200 bg-neutral-50'
                }`}>
                  <h3 className={`text-xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Billeteras Digitales
                  </h3>
                  <p className={`text-sm mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Configura Yape y Plin para el cobro rápido en POS.
                  </p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-widest mb-2 block ${
                      config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
                    }`}>
                      Número Asociado
                    </label>
                    <input 
                      type="text" 
                      value={config.numeroYape}
                      onChange={(e) => setConfig({...config, numeroYape: e.target.value})}
                      className={`w-full rounded-xl px-4 py-3 text-lg font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-[${config.colorPrimario}] ${
                        config.temaFondo === 'dark' 
                          ? 'bg-[#1a1a1a] border border-[#333] text-white focus:border-transparent' 
                          : 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-transparent'
                      }`}
                      placeholder="Ej. 987654321"
                    />
                    <p className={`text-xs mt-2 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                      Este número se mostrará al cliente si pide el dato manual.
                    </p>
                  </div>
                  
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-widest mb-2 block ${
                      config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
                    }`}>
                      Código QR (Opcional)
                    </label>
                    <label className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group relative overflow-hidden min-h-[140px] ${
                      config.temaFondo === 'dark' 
                        ? 'border-[#333] hover:border-[#ff5a1f] bg-[#1a1a1a]' 
                        : 'border-gray-300 hover:border-[#ff5a1f] bg-gray-50'
                    }`}>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg"
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if(file) {
                            const imagenTemporal = URL.createObjectURL(file);
                            setConfig({...config, qrFile: file, qrPreview: imagenTemporal});
                          }
                        }}
                      />
                      {config.qrPreview ? (
                        <div className="absolute inset-0 p-2">
                          <img src={config.qrPreview} alt="QR Yape Preview" className="w-full h-full object-contain rounded-lg" />
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-white font-bold text-sm bg-black/80 px-3 py-1 rounded-full">Cambiar Imagen</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📱</span>
                          <p className={`font-bold text-sm ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                            Sube tu imagen QR
                          </p>
                          <p className={`text-xs mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                            PNG o JPG max 2MB
                          </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* ================= SECCIÓN MÓDULOS DEL SISTEMA ================= */}
              <div className={`rounded-3xl overflow-hidden shadow-lg transition-colors ${
                config.temaFondo === 'dark' ? 'bg-[#121212] border border-[#222]' : 'bg-white border border-neutral-200'
              }`}>
                <div className={`p-6 border-b transition-colors ${
                  config.temaFondo === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-neutral-200 bg-neutral-50'
                }`}>
                  <h3 className={`text-xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Módulos del Sistema
                  </h3>
                  <p className={`text-sm mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Activa o desactiva las herramientas según la operación de este local y tu plan actual.
                  </p>
                </div>
                <div className="p-6 space-y-4">
                  
                  {/* Módulo Salón (Siempre visible) */}
                  <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                    config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}>
                    <div>
                      <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Gestión de Salón (Mesas)
                      </h4>
                      <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        Habilita el mapa interactivo de mesas y la opción de unir cuentas.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={config.modSalon} onChange={() => setConfig({...config, modSalon: !config.modSalon})} />
                      <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all" 
                          style={config.modSalon ? {backgroundColor: config.colorPrimario} : {}}>
                      </div>
                    </label>
                  </div>

                  {/* Módulo CRM (Siempre visible) */}
                  <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                    config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}>
                    <div>
                      <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Directorio de Clientes (CRM)
                      </h4>
                      <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        Guarda DNI/RUC, nombres y teléfonos para fidelización.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={config.modClientes} onChange={() => setConfig({...config, modClientes: !config.modClientes})} />
                      <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                          style={config.modClientes ? {backgroundColor: config.colorPrimario} : {}}>
                      </div>
                    </label>
                  </div>

                  {/* Módulo Facturación (Siempre visible) */}
                  <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                    config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}>
                    <div>
                      <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Facturación Electrónica
                      </h4>
                      <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                        Emite Boletas y Facturas válidas (Requiere configuración externa).
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={config.modFacturacion} onChange={() => setConfig({...config, modFacturacion: !config.modFacturacion})} />
                      <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                          style={config.modFacturacion ? {backgroundColor: config.colorPrimario} : {}}>
                      </div>
                    </label>
                  </div>

                  {/* ================= MÓDULOS CONDICIONALES (Según Plan) ================= */}
                  
                  {config.permisosPlan?.modulo_kds && (
                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                      config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}>
                      <div>
                        <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                          Pantalla de Cocina (KDS) <span className="text-xs bg-[#ff5a1f]/20 text-[#ff5a1f] px-2 py-1 rounded ml-2">PRO</span>
                        </h4>
                        <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                          Permite a los cocineros ver y despachar órdenes en tiempo real.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.modCocina} onChange={() => setConfig({...config, modCocina: !config.modCocina})} />
                        <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                            style={config.modCocina ? {backgroundColor: config.colorPrimario} : {}}>
                        </div>
                      </label>
                    </div>
                  )}

                  {config.permisosPlan?.modulo_delivery && (
                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                      config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}>
                      <div>
                        <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                          Módulo Delivery y Para Llevar
                        </h4>
                        <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                          Habilita una pestaña dedicada para despachos externos.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.modDelivery} onChange={() => setConfig({...config, modDelivery: !config.modDelivery})} />
                        <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                            style={config.modDelivery ? {backgroundColor: config.colorPrimario} : {}}>
                        </div>
                      </label>
                    </div>
                  )}

                  {config.permisosPlan?.modulo_inventario && (
                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                      config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}>
                      <div>
                        <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                          Control de Inventario
                        </h4>
                        <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                          Descuenta insumos y alerta sobre stock crítico en tiempo real.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.modInventario} onChange={() => setConfig({...config, modInventario: !config.modInventario})} />
                        <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                            style={config.modInventario ? {backgroundColor: config.colorPrimario} : {}}>
                        </div>
                      </label>
                    </div>
                  )}

                  {config.permisosPlan?.modulo_carta_qr && (
                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                      config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>Menú Digital QR</h4>
                          <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full font-black border border-blue-500/30 uppercase">Premium</span>
                        </div>
                        <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                          Genera QRs para las mesas y permite que vean la carta desde el celular.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.modCartaQr} onChange={() => setConfig({...config, modCartaQr: !config.modCartaQr})} />
                        <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                            style={config.modCartaQr ? {backgroundColor: config.colorPrimario} : {}}>
                        </div>
                      </label>
                    </div>
                  )}

                  {config.permisosPlan?.modulo_bot_wsp && (
                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                      config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>Bot de Pedidos (WSP)</h4>
                          <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full font-black border border-green-500/30 uppercase">Beta</span>
                        </div>
                        <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                          Recibe pedidos automáticamente desde WhatsApp directo a tu cocina.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.modBotWsp} onChange={() => setConfig({...config, modBotWsp: !config.modBotWsp})} />
                        <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                            style={config.modBotWsp ? {backgroundColor: config.colorPrimario} : {}}>
                        </div>
                      </label>
                    </div>
                  )}

                  {config.permisosPlan?.modulo_ml && (
                    <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                      config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>Predicciones con IA</h4>
                          <span className="text-[10px] bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full font-black border border-purple-500/30 uppercase">Enterprise</span>
                        </div>
                        <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                          Anticípate a la demanda de mañana usando los datos históricos de tus ventas.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.modMl} onChange={() => setConfig({...config, modMl: !config.modMl})} />
                        <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                            style={config.modMl ? {backgroundColor: config.colorPrimario} : {}}>
                        </div>
                      </label>
                    </div>
                  )}
                  
                </div>
              </div>

              {/* ================= SECCIÓN APARIENCIA ================= */}
              <div className={`border rounded-3xl overflow-hidden shadow-lg transition-colors duration-300 mt-6 ${
                config.temaFondo === 'dark' ? 'bg-[#121212] border-[#222]' : 'bg-white border-neutral-200'
              }`}>
                <div className={`p-6 border-b transition-colors ${
                  config.temaFondo === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-neutral-200 bg-neutral-50'
                }`}>
                  <h3 className={`text-xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Apariencia del Sistema
                  </h3>
                  <p className={`text-sm mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    Personaliza los colores para que combinen con la identidad de tu marca.
                  </p>
                </div>
                <div className="p-6 space-y-8">
                  
                  {/* Selector Tema */}
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ${
                      config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
                    }`}>
                      Tema Base
                    </label>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setConfig({...config, temaFondo: 'dark'})}
                        className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all shadow-md ${
                          config.temaFondo === 'dark' 
                            ? 'bg-[#1a1a1a] text-white border-transparent' 
                            : 'border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                        style={config.temaFondo === 'dark' ? { borderColor: config.colorPrimario } : {}}
                      >
                        🌙 Oscuro (Recomendado)
                      </button>
                      <button 
                        onClick={() => setConfig({...config, temaFondo: 'light'})}
                        className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all shadow-md ${
                          config.temaFondo === 'light' 
                            ? 'bg-white text-black border-transparent' 
                            : 'border-gray-300 text-gray-600 hover:border-gray-400'
                        }`}
                        style={config.temaFondo === 'light' ? { borderColor: config.colorPrimario } : {}}
                      >
                        ☀️ Claro
                      </button>
                    </div>
                  </div>

                  {/* Paleta de colores */}
                  <div>
                    <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ${
                      config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
                    }`}>
                      Color Principal (Botones y Acentos)
                    </label>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { hex: '#ff5a1f', nombre: 'Naranja Brava' },
                        { hex: '#3b82f6', nombre: 'Azul Tech' },
                        { hex: '#10b981', nombre: 'Verde Fresh' },
                        { hex: '#eab308', nombre: 'Amarillo Mostaza' },
                        { hex: '#8b5cf6', nombre: 'Morado Neón' },
                        { hex: '#ec4899', nombre: 'Rosa Flamingo' }
                      ].map((color) => (
                        <button
                          key={color.hex}
                          onClick={() => setConfig({...config, colorPrimario: color.hex})}
                          className={`w-14 h-14 rounded-full border-4 transition-all active:scale-95 flex items-center justify-center ${
                            config.colorPrimario === color.hex 
                              ? 'border-white scale-110 shadow-lg' 
                              : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.nombre}
                        >
                          {config.colorPrimario === color.hex && (
                            <span className="text-white text-xl drop-shadow-md">✓</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ================= VISTA PREVIA DEL COLOR ================= */}
                  <div className={`mt-6 flex items-center justify-between p-4 rounded-2xl border transition-colors ${
                    config.temaFondo === 'dark' 
                      ? 'bg-[#1a1a1a] border-[#2a2a2a]' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div>
                      <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        Vista Previa del Color
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: config.colorPrimario }}></div>
                        <span className={`font-mono text-xs font-bold uppercase tracking-widest ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                          {config.colorPrimario}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      style={{ 
                        backgroundColor: config.colorPrimario, 
                        boxShadow: `0 4px 15px ${config.colorPrimario}40` 
                      }}
                      className="px-6 py-2.5 rounded-xl text-white font-bold transition-transform hover:brightness-110 active:scale-95 flex items-center gap-2"
                    >
                      <span>✓</span> Botón de Prueba
                    </button>
                  </div>

                </div>
              </div>

              {/* Botón Guardar */}
              <div className="flex justify-end pt-4">
                <button 
                  onClick={manejarGuardarConfig}
                  disabled={guardandoConfig}
                  style={{ backgroundColor: config.colorPrimario, boxShadow: `0 4px 20px ${config.colorPrimario}66` }}
                  className="text-white px-10 py-5 rounded-2xl font-black text-lg tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  {guardandoConfig ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                </button>
              </div>

            </div>
          )}

          {/* ======================= VISTA: EDITOR DE MENÚ ======================= */}
          {vistaActiva === 'menu' && (
            <EditorMenu 
              categorias={categorias}
              productosReales={productosReales}
              onOpenCategorias={() => setModalCategorias(true)}
              onOpenPlatoNuevo={() => { cerrarModalPlato(); setModalPlato(true); }}
              onEditPlato={(plato) => abrirModalEditar(plato)}
              onToggleDisponibilidad={toggleDisponibilidad}
              onOpenReceta={(plato) => {
                // 🚀 Aquí abriremos el ModalConfigurarReceta que te pasé antes
                setProductoParaReceta(plato);
                setModalRecetaOpen(true);
              }}
              onOpenVariaciones={(plato) => {
                setProductoParaVariaciones(plato);
                setModalVariacionesOpen(true);
              }}
            />
          )}
          {/* ======================= VISTA: PERSONAL Y ROLES ======================= */}
          {vistaActiva === 'personal' && (
            <div className="animate-fadeIn space-y-6 pb-20">
              
              {/* ========== CABECERA ========== */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className={`text-2xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Equipo de Trabajo
                  </h3>
                  <p className={`text-sm mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                    Gestiona accesos, edita perfiles y mide el rendimiento de tu personal.
                  </p>
                </div>
                <button 
                  onClick={() => setModalEmpleado(true)}
                  style={{ backgroundColor: config.colorPrimario, boxShadow: `0 4px 15px ${config.colorPrimario}40` }}
                  className="text-white px-6 py-3 rounded-xl font-black transition-all hover:brightness-110 active:scale-95 flex items-center gap-2"
                >
                  <span className="text-xl">+</span> NUEVO EMPLEADO
                </button>
              </div>

              {/* ========== LISTADO DE EMPLEADOS ========== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {empleadosReales.length === 0 && (
                  <div className={`col-span-full py-10 text-center font-bold border-2 border-dashed rounded-3xl ${config.temaFondo === 'dark' ? 'text-neutral-600 border-[#222]' : 'text-gray-400 border-gray-200'}`}>
                    Aún no hay empleados registrados en esta sede.
                  </div>
                )}
                
                {empleadosReales.map(emp => (
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
                          {/* Etiqueta del Rol */}
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                            config.temaFondo === 'dark' ? 'bg-[#1a1a1a] text-neutral-300 border-[#333]' : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {emp.rol_nombre || 'Sin Rol'}
                          </span>
                          
                          {/* Etiqueta de Activo/Inactivo */}
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                            emp.activo 
                              ? (config.temaFondo === 'dark' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-green-600 border-green-200 bg-green-50')
                              : (config.temaFondo === 'dark' ? 'text-red-500 border-red-500/20 bg-red-500/10' : 'text-red-600 border-red-200 bg-red-50')
                          }`}>
                            {emp.activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>

                          {/* ✨ NUEVO: Etiqueta de Sede (Se oculta mágicamente si solo hay 1) */}
                          {sedesReales.length > 1 && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${
                              config.temaFondo === 'dark' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-200'
                            }`}>
                              📍 {emp.sede_nombre || 'Sede Principal'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                        PIN de Acceso
                      </p>
                      <p className={`font-mono font-bold tracking-[4px] mb-2 ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {emp.activo ? '****' : '----'}
                      </p>
                      
                      {/* BOTONES DE ACCIÓN */}
                      <div className="flex gap-3">
                        <button 
                          onClick={() => abrirModalEdicion(emp)} // <-- Descomenta esto cuando tengas la función
                          className="text-xs font-bold transition-colors hover:scale-105"
                          style={{ color: config.colorPrimario }}
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => toggleActivo(emp)} // <-- Descomenta esto cuando hagas la función
                          className={`text-xs font-bold transition-colors hover:scale-105 ${emp.activo ? 'text-red-500 hover:text-red-400' : 'text-green-500 hover:text-green-400'}`}
                        >
                          {emp.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* ========== TABLA DE RENDIMIENTO (Reemplaza a la Matriz) ========== */}
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
          )}
          {/* ======================= VISTA: CRM Y MARKETING (WHATSAPP) ======================= */}
          {vistaActiva === 'crm' && (
            <div className="animate-fadeIn space-y-6 flex flex-col w-full min-w-0">
              
              {/* BANNER */}
              <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center text-center md:text-left shadow-xl w-full gap-4">
                <div className="w-full min-w-0">
                  <h3 className="text-2xl md:text-3xl font-black text-white mb-1">Generador de Campañas</h3>
                  <p className="text-green-100 text-sm">
                    Tienes <strong className="text-white">342</strong> clientes. Lanza una promoción por WhatsApp.
                  </p>
                </div>
                <button className="w-full md:w-auto bg-white text-green-600 px-6 py-3 rounded-xl font-black shadow-lg shrink-0 flex items-center justify-center gap-2 hover:bg-green-50 transition-colors">
                  <span className="text-xl">📱</span> ENVIAR PROMO
                </button>
              </div>

              {/* TABLA DE CLIENTES */}
              <div className={`rounded-3xl flex flex-col w-full min-w-0 relative overflow-hidden border ${
                config.temaFondo === 'dark'
                  ? 'bg-[#111] border-[#222]'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                
                <div className={`p-4 border-b flex flex-col sm:flex-row justify-between gap-3 ${
                  config.temaFondo === 'dark' ? 'border-[#222]' : 'border-gray-200'
                }`}>
                  <h4 className={`font-bold text-lg ${
                    config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Base de Datos
                  </h4>
                  <input 
                    type="text" 
                    placeholder="Buscar por número..." 
                    className={`w-full sm:w-64 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${
                      config.temaFondo === 'dark'
                        ? 'bg-[#1a1a1a] border border-[#333] text-white placeholder:text-neutral-500'
                        : 'bg-gray-100 border border-gray-300 text-gray-800 placeholder:text-gray-400'
                    }`}
                  />
                </div>
                
                <div className="w-full overflow-x-auto min-w-0">
                  <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                    <thead className={`text-[10px] uppercase tracking-widest ${
                      config.temaFondo === 'dark' ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <tr>
                        <th className="px-5 py-4 font-black">Cliente</th>
                        <th className="px-5 py-4 font-black">WhatsApp</th>
                        <th className="px-5 py-4 font-black text-center">Visitas</th>
                        <th className="px-5 py-4 font-black">Última Visita</th>
                        <th className="px-5 py-4 font-black text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${
                      config.temaFondo === 'dark' ? 'text-neutral-300 divide-[#222]' : 'text-gray-700 divide-gray-200'
                    }`}>
                      {[
                        { n: 'Carlos Gutiérrez', w: '987 654 321', v: 12, u: 'Hace 2 días' },
                        { n: 'Ana Mendoza', w: '912 345 678', v: 3, u: 'Hace 45 días' },
                        { n: 'Luis Fernández', w: '999 888 777', v: 28, u: 'Hoy' },
                      ].map((c, i) => (
                        <tr key={i} className={`transition-colors ${
                          config.temaFondo === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-50'
                        }`}>
                          <td className="px-5 py-4 font-bold flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              config.temaFondo === 'dark'
                                ? 'bg-[#222] text-[#ff5a1f]'
                                : 'bg-gray-200 text-gray-700'
                            }`}>
                              {c.n.charAt(0)}
                            </div>
                            <span className={config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}>
                              {c.n}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono">{c.w}</td>
                          <td className="px-5 py-4 font-bold text-green-500 text-center">{c.v}</td>
                          <td className="px-5 py-4 text-xs">
                            <span className={c.u.includes('45') ? 'text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded' : ''}>
                              {c.u}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button className="px-4 py-2 rounded-lg font-bold text-xs transition-colors bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white">
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
            <InventarioView />
          )}
          {/* ======================= VISTA: CARTA QR + CUENTA EN VIVO ======================= */}
          {vistaActiva === 'carta_qr' && (
            <DashboardCartaQR config={config} />
          )}

          {/* ======================= VISTA: BOT DE WHATSAPP ======================= */}
          {vistaActiva === 'bot_wsp' && (
            <div className="animate-fadeIn max-w-4xl mx-auto space-y-6">
              <div className={`rounded-3xl p-8 text-center border ${
                config.temaFondo === 'dark'
                  ? 'bg-[#121212] border-[#222]'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="text-7xl mb-4">🤖</div>
                <h2 className={`text-2xl font-black mb-2 ${
                  config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Bot de Pedidos por WhatsApp
                </h2>
                <p className={`mb-6 ${
                  config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-gray-600'
                }`}>
                  Módulo en desarrollo. Automatiza la toma de pedidos por WhatsApp y los envía directamente al POS.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff5a1f]/10 text-[#ff5a1f] text-sm font-bold">
                  🚧 Próximamente
                </div>
              </div>
            </div>
          )}

          {/* ======================= VISTA: FACTURACIÓN ELECTRÓNICA ======================= */}
          {vistaActiva === 'facturacion' && (
            <div className="animate-fadeIn max-w-4xl mx-auto space-y-6">
              <div className={`rounded-3xl p-8 text-center border ${
                config.temaFondo === 'dark'
                  ? 'bg-[#121212] border-[#222]'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="text-7xl mb-4">🧾</div>
                <h2 className={`text-2xl font-black mb-2 ${
                  config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Facturación Electrónica
                </h2>
                <p className={`mb-6 ${
                  config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-gray-600'
                }`}>
                  Módulo en desarrollo. Emite boletas y facturas electrónicas válidas ante SUNAT.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff5a1f]/10 text-[#ff5a1f] text-sm font-bold">
                  🚧 Próximamente
                </div>
              </div>
            </div>
          )}

          {/* ✨ NUEVA VISTA: El Editor de Planos */}
          {vistaActiva === 'diseno_salon' && (
            <EditorPlanos />
          )}


        </main>
      </div>
      {/* MODAL PARA AGREGAR / EDITAR EMPLEADO */}
      {modalEmpleado && (
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
              <button 
                onClick={() => {
                  setModalEmpleado(false);
                  setFormEmpleado({ id: null, nombre: '', pin: '', rol: rolesReales[0]?.id || '', sede: sedesReales[0]?.id || '' });
                }} 
                className="text-neutral-500 font-bold hover:text-red-500 transition-colors"
              >✕</button>
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
                    config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-[#ff5a1f]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#ff5a1f]'
                  }`}
                  style={{ '--tw-ring-color': config.colorPrimario }} // Para el foco
                  placeholder="Ej. Juan Pérez" 
                />
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
                    {/* ✨ MAGIA: Usamos rolesFiltrados, si no hay KDS, no hay cocineros */}
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
                      config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-[#ff5a1f]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#ff5a1f]'
                    }`}
                    placeholder={formEmpleado.id ? "****" : "0000"} 
                  />
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
                  {sedesReales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>

              <button 
                onClick={manejarGuardarEmpleado}
                disabled={!formEmpleado.nombre || (!formEmpleado.id && formEmpleado.pin.length !== 4)}
                style={{ backgroundColor: config.colorPrimario }}
                className="w-full text-white py-4 rounded-xl font-black mt-4 shadow-lg active:scale-95 transition-all hover:brightness-110 disabled:opacity-50 disabled:grayscale"
              >
                {formEmpleado.id ? 'GUARDAR CAMBIOS' : 'CREAR ACCESO'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ======================= MODAL DE AÑADIR/EDITAR PLATO ======================= */}
      <ModalFormularioPlato 
        isOpen={modalPlato}
        onClose={cerrarModalPlato}
        formPlato={formPlato}
        setFormPlato={setFormPlato}
        pasoModal={pasoModal}
        setPasoModal={setPasoModal}
        categorias={categorias}
        manejarGuardarPlato={manejarGuardarPlato}
      />
      {/* ======================= MODAL DE CATEGORÍAS ======================= */}
      {modalCategorias && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className={`border rounded-3xl w-full max-w-md animate-fadeIn relative overflow-hidden transition-colors ${tema === 'dark' ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-200'}`}>
            
            {/* Cabecera */}
            <div className={`p-6 border-b flex justify-between items-center transition-colors ${tema === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'}`}>
              <h3 className={`text-xl font-black ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>Categorías del Menú</h3>
              <button onClick={() => setModalCategorias(false)} className={`font-bold text-xl transition-colors ${tema === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* INPUT PARA NUEVA CATEGORÍA */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={nombreNuevaCat}
                  onChange={(e) => setNombreNuevaCat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && manejarCrearCategoria()}
                  className={`flex-1 border rounded-xl px-4 py-3 outline-none transition-colors ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-[#ff5a1f]' : 'bg-white border-gray-300 text-gray-900 focus:border-[#ff5a1f]'}`} 
                  style={{ '--tw-ring-color': colorPrimario }}
                  onFocus={(e) => e.target.style.borderColor = colorPrimario}
                  onBlur={(e) => e.target.style.borderColor = tema === 'dark' ? '#333' : '#d1d5db'}
                  placeholder="Ej. Bebidas, Postres..." 
                />
                <button 
                  onClick={manejarCrearCategoria}
                  disabled={!nombreNuevaCat.trim()}
                  className="text-white px-6 font-bold rounded-xl disabled:opacity-50 transition-all hover:brightness-110 active:scale-95 shadow-md"
                  style={{ backgroundColor: colorPrimario }}
                >
                  Agregar
                </button>
              </div>

              <div className={`h-px w-full ${tema === 'dark' ? 'bg-[#222]' : 'bg-gray-200'}`}></div>

              {/* LISTA DE CATEGORÍAS ACTUALES */}
              <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2">
                {categorias.length === 0 ? (
                  <p className={`text-center text-sm py-4 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>No hay categorías creadas aún.</p>
                ) : (
                  categorias.map(cat => (
                    <div key={cat.id} className={`flex justify-between items-center p-3 rounded-xl border transition-colors ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#222]' : 'bg-gray-50 border-gray-200'}`}>
                      <span className={`font-bold ${tema === 'dark' ? 'text-white' : 'text-gray-800'}`}>{cat.nombre}</span>
                      <button 
                        onClick={() => eliminarCategoriaLocal(cat.id)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:text-red-500 hover:bg-red-500/10 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}
                        title="Eliminar categoría"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      {/* MODAL DE CAMBIOS PENDIENTES */}
      {modalCambiosPendientes && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className={`rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border ${
            config.temaFondo === 'dark' ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-200'
          }`}>
            <div className={`p-6 border-b ${
              config.temaFondo === 'dark' ? 'border-[#222]' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-black ${
                config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Cambios sin guardar
              </h3>
              <p className={`text-sm mt-1 ${
                config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-gray-500'
              }`}>
                Tienes cambios pendientes en la configuración. ¿Qué deseas hacer?
              </p>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <button 
                onClick={guardarYCambiarVista}
                style={{ backgroundColor: config.colorPrimario }}
                className="text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all"
              >
                Guardar cambios y salir
              </button>
              <button 
                onClick={descartarCambios}
                className={`py-3 rounded-xl font-bold transition-all ${
                  config.temaFondo === 'dark'
                    ? 'bg-[#1a1a1a] text-neutral-300 hover:bg-[#222] border border-[#333]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                Descartar cambios
              </button>
              <button 
                onClick={cancelarCambioVista}
                className="text-sm font-bold text-neutral-500 hover:text-neutral-400 transition-colors"
              >
                Seguir editando
              </button>
            </div>
          </div>
        </div>
      )}
      <ModalConfigurarReceta 
        isOpen={modalRecetaOpen} 
        onClose={() => setModalRecetaOpen(false)} 
        producto={productoParaReceta} 
        config={config} 
      />
      <ModalVariaciones 
        isOpen={modalVariacionesOpen} 
        onClose={() => setModalVariacionesOpen(false)} 
        producto={productoParaVariaciones} 
        config={config} 
      />
    </div>
  );
}