import React, { useState, useEffect } from 'react';
import { 
  obtenerMetricasDashboard, 
  getEmpleados, 
  getRoles, 
  getSedes, 
  crearEmpleado,
  getNegocioConfig,
  updateNegocioConfig,
  getProductos,
  crearProducto,
  actualizarProducto,
  parchearProducto,
  getCategorias,
  crearCategoria,
  actualizarNegocio,
} from './api/api';
import api from './api/api';
import usePosStore from './store/usePosStore';
export default function ErpDashboard({ onVolverAlPos }) {
  const { configuracionGlobal } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const setConfiguracionGlobal = usePosStore((state) => state.setConfiguracionGlobal);
  const [vistaActiva, setVistaActiva] = useState('dashboard');
  const [sedeFiltro, setSedeFiltro] = useState('Todas');
  const [dropdownAbierto, setDropdownAbierto] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');
  const [sedeFiltroId, setSedeFiltroId] = useState(null); // ✨ Nuevo: ID real de la sede
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [modalEmpleado, setModalEmpleado] = useState(false);
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
  const [dropdownCatModalAbierto, setDropdownCatModalAbierto] = useState(false);
  // Estados para el modal de cambios pendientes
  const [configOriginal, setConfigOriginal] = useState(null); // Copia de la config al entrar
  const [hayCambiosPendientes, setHayCambiosPendientes] = useState(false);
  const [modalCambiosPendientes, setModalCambiosPendientes] = useState(false);
  const [vistaPendiente, setVistaPendiente] = useState(null); // guarda a qué vista quería ir
  // ==========================================
  // 📊 EFECTO 1: MÉTRICAS DINÁMICAS
  // ==========================================
  useEffect(() => {
    if (vistaActiva === 'dashboard') {
      const cargarDatos = async () => {
        try {
          // ✨ Enviamos el sede_id seleccionado (o null si es "Todas")
          const res = await obtenerMetricasDashboard({ sede_id: sedeFiltroId });
          setMetricas(res.data);
        } catch (error) {
          console.error("Error al cargar métricas:", error);
        }
      };
      cargarDatos();
      const intervalo = setInterval(cargarDatos, 10000);
      return () => clearInterval(intervalo);
    }
  }, [vistaActiva, sedeFiltroId]); // ✨ Recarga al cambiar de sede

  // ==========================================
  // 👥 EFECTO 2: GESTIÓN DE PERSONAL
  // ==========================================
  useEffect(() => {
    if (vistaActiva === 'personal') {
      const cargarDatosPersonal = async () => {
        try {
          // ✨ Filtramos empleados por la sede seleccionada en el ERP
          const [resEmpleados, resRoles, resSedes] = await Promise.all([
            getEmpleados({ sede_id: sedeFiltroId }), 
            getRoles(), 
            getSedes()
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
  const Sidebar = () => {
    // 1. Traemos la configuración de nuestra tienda Zustand
    const { configuracionGlobal } = usePosStore();
    const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
    const modulos = configuracionGlobal?.modulos || {};

    // 2. Creamos la lista y la filtramos mágicamente
    const menuItems = [
      { id: 'dashboard', icono: '📊', nombre: 'Ventas en Vivo', show: true },
      { id: 'personal', icono: '👥', nombre: 'Personal y Roles', show: true },
      // 👇 Estos botones dependen de los interruptores de configuración
      { id: 'crm', icono: '💬', nombre: 'Marketing & CRM', show: modulos.clientes },
      { id: 'inventario', icono: '📦', nombre: 'Inventario (Stock)', show: modulos.inventario },
      { id: 'menu', icono: '🍔', nombre: 'Editor de Menú', show: true },
      { id: 'carta_qr', icono: '📱', nombre: 'Carta QR + Cuenta en Vivo', show: modulos.cartaQr },
      { id: 'bot_wsp', icono: '🤖', nombre: 'Bot de WhatsApp', show: modulos.botWsp},
      { id: 'facturacion', icono: '🧾', nombre: 'Facturación Electrónica', show: modulos.facturacion },
      { id: 'config', icono: '⚙️', nombre: 'Configuraciones', show: true },
    ].filter(item => item.show); // <--- Esto elimina los ocultos

    return (
      <div className={`fixed inset-y-0 left-0 w-64 bg-[#111] border-r border-[#222] transform ${menuAbierto ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 z-50 flex flex-col`}>
        
        {/* LOGO TEMATIZADO */}
        <div className="p-6">
          <h1 className="text-xl font-black text-white">
            CAÑA <span style={{ color: colorPrimario }}>BRAVA</span>
          </h1>
          <p className="text-xs text-neutral-500 tracking-widest uppercase mt-1">ERP Cloud</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {menuItems.map(item => {
            const isActivo = vistaActiva === item.id;
            
            return (
              <button 
                key={item.id}
                onClick={() => { manejarCambioVista(item.id); setMenuAbierto(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all
                  ${!isActivo ? 'text-neutral-400 hover:bg-[#222] hover:text-white' : ''}`}
                // 👇 Magia CSS: Inyectamos el color dinámico con transparencias
                style={isActivo ? { 
                  backgroundColor: `${colorPrimario}1A`, // 1A = 10% opacidad
                  color: colorPrimario,
                  border: `1px solid ${colorPrimario}33` // 33 = 20% opacidad
                } : {}}
              >
                <span className="text-xl">{item.icono}</span>
                {item.nombre}
              </button>
            );
          })}
        </nav>

        {/* BOTÓN INFERIOR TEMATIZADO */}
        <div className="p-4 border-t border-[#222]">
          <button 
            onClick={onVolverAlPos} 
            className="w-full text-white py-3 rounded-xl font-bold hover:brightness-110 transition-all shadow-lg"
            style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 15px ${colorPrimario}40` }}
          >
            🖥️ Ir al POS
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

      alert("✅ ¡Configuración guardada y aplicada al instante!");
      
    } catch (error) {
      console.error("Error guardando config:", error);
      alert("❌ Hubo un error al guardar los cambios en la base de datos.");
    } finally {
      setGuardandoConfig(false);
    }
  };

  // 2. Crear Nuevo Empleado
  const manejarCrearEmpleado = async () => {
    if (!formEmpleado.nombre || formEmpleado.pin.length !== 4) {
      alert("Por favor ingresa un nombre y un PIN de 4 dígitos.");
      return;
    }
    try {
      await crearEmpleado({ ...formEmpleado, activo: true });
      setModalEmpleado(false);
      setFormEmpleado({ ...formEmpleado, nombre: '', pin: '' });
      
      const resEmpleados = await getEmpleados({ sede_id: sedeFiltroId });
      setEmpleadosReales(resEmpleados.data);
      alert("¡Empleado creado con éxito! 🎉");
    } catch (error) {
      console.error("Error creando empleado:", error);
      alert("Hubo un error al crear el acceso.");
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
          {vistaActiva === 'dashboard' && (
            <div className="animate-fadeIn space-y-6">
              
              {/* ========== FILTRO MULTI-SEDE ========== */}
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-2 rounded-2xl border transition-colors ${
                config.temaFondo === 'dark' 
                  ? 'bg-[#111] border-[#222]' 
                  : 'bg-gray-100 border-gray-300'
              }`}>
                <div className={`flex w-full sm:w-auto rounded-xl p-1 overflow-x-auto transition-colors ${
                  config.temaFondo === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-200'
                }`}>
                  <button 
                    onClick={() => cambiarSedeFiltro('Todas')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                      sedeFiltro === 'Todas' 
                        ? 'text-white' 
                        : config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-600'
                    }`}
                    style={sedeFiltro === 'Todas' ? { backgroundColor: config.colorPrimario } : {}}
                  >
                    Todas
                  </button>
                  {sedesReales.map(s => (
                    <button 
                      key={s.id} 
                      onClick={() => cambiarSedeFiltro(s)}
                      className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        sedeFiltro === s.nombre 
                          ? 'text-white' 
                          : config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-600'
                      }`}
                      style={sedeFiltro === s.nombre ? { backgroundColor: config.colorPrimario } : {}}
                    >
                      {s.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {/* ========== TARJETAS DE MÉTRICAS ========== */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                
                {/* Tarjeta Ingresos Totales (ocupa 2 columnas en móvil, 1 en desktop) */}
                <div className={`col-span-2 md:col-span-1 p-6 rounded-3xl border transition-all ${
                  config.temaFondo === 'dark' 
                    ? 'bg-[#121212] border-[#222]' 
                    : 'bg-white border-gray-200 shadow-sm'
                }`}>
                  <p className={`font-bold uppercase tracking-widest text-[10px] mb-2 ${
                    config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                  }`}>
                    Ingresos Totales
                  </p>
                  <h3 className={`text-3xl md:text-4xl font-black ${
                    config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    S/ {metricas.ventas.toFixed(2)}
                  </h3>
                </div>

                {/* Tarjeta Órdenes */}
                <div className={`col-span-1 p-5 md:p-6 rounded-3xl border transition-all ${
                  config.temaFondo === 'dark' 
                    ? 'bg-[#121212] border-[#222]' 
                    : 'bg-white border-gray-200 shadow-sm'
                }`}>
                  <p className={`font-bold uppercase tracking-widest text-[10px] mb-2 ${
                    config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                  }`}>
                    Órdenes
                  </p>
                  <h3 className={`text-2xl md:text-4xl font-black ${
                    config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    {metricas.ordenes}
                  </h3>
                </div>

                {/* Tarjeta Ticket Promedio */}
                <div className={`col-span-1 p-5 md:p-6 rounded-3xl border transition-all ${
                  config.temaFondo === 'dark' 
                    ? 'bg-[#121212] border-[#222]' 
                    : 'bg-white border-gray-200 shadow-sm'
                }`}>
                  <p className={`font-bold uppercase tracking-widest text-[10px] mb-2 ${
                    config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                  }`}>
                    Ticket Promedio
                  </p>
                  <h3 className={`text-2xl md:text-4xl font-black ${
                    config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    S/ {metricas.ticketPromedio.toFixed(2)}
                  </h3>
                </div>
              </div>

              {/* ========== ACTIVIDAD RECIENTE ========== */}
              <div className={`rounded-3xl p-6 border transition-all ${
                config.temaFondo === 'dark' 
                  ? 'bg-[#121212] border-[#222]' 
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${
                  config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Actividad Reciente
                </h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {metricas.actividadReciente.length === 0 ? (
                    <p className={`text-sm text-center py-4 ${
                      config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                    }`}>
                      Sin ventas el día de hoy.
                    </p>
                  ) : (
                    metricas.actividadReciente.map(orden => (
                      <div key={orden.id} className={`flex justify-between items-center p-4 rounded-xl border transition-all ${
                        config.temaFondo === 'dark' 
                          ? 'bg-[#1a1a1a] border-[#2a2a2a]' 
                          : 'bg-gray-50 border-gray-200'
                      }`}>
                        <div>
                          <p className={`font-bold ${
                            config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            Orden #{orden.id}
                          </p>
                          <p className={`text-xs ${
                            config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                          }`}>
                            {orden.origen} • {orden.hora}
                          </p>
                        </div>
                        <p className={`font-black text-right ${
                          config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>
                          S/ {orden.total.toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
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
            <div className="animate-fadeIn space-y-6 max-w-6xl mx-auto min-w-0">
              
              {/* ========== CABECERA DEL EDITOR DE MENÚ ========== */}
              <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-5 p-6 rounded-3xl border mb-6 transition-colors ${
                config.temaFondo === 'dark' 
                  ? 'bg-[#121212] border-[#222]' 
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                
                {/* Textos a la izquierda */}
                <div>
                  <h2 className={`text-2xl font-black ${
                    config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Editor de Carta Digital
                  </h2>
                  <p className={`text-sm mt-1 ${
                    config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                  }`}>
                    Crea tus categorías, platos y ajusta los precios en tiempo real.
                  </p>
                </div>

                {/* Grupo de Acciones a la derecha */}
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3 shrink-0">
                  
                  {/* Botón Secundario */}
                  <button 
                    onClick={() => setModalCategorias(true)}
                    className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-all w-full sm:w-auto text-sm ${
                      config.temaFondo === 'dark'
                        ? 'bg-[#1a1a1a] hover:bg-[#2a2a2a] text-neutral-300 border border-[#333] hover:border-[#555]'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    📁 Administrar Categorías
                  </button>
                  
                  {/* Botón Primario (usa colorPrimario) */}
                  <button 
                    onClick={() => {
                      cerrarModalPlato();
                      setModalPlato(true);
                    }}
                    style={{ backgroundColor: config.colorPrimario }}
                    className="flex items-center justify-center gap-2 text-white px-6 py-3 rounded-xl font-black shadow-lg transition-all w-full sm:w-auto text-sm hover:brightness-110 active:scale-95"
                  >
                    🍔 NUEVO PLATO
                  </button>
                  
                </div>
              </div>

              {/* ========== CUERPO: CATEGORÍAS + PLATOS ========== */}
              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Columna Izquierda: Categorías */}
                <div className="w-full lg:w-1/4 shrink-0 mb-4 lg:mb-0">
                  <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 px-2 hidden lg:block ${
                    config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                  }`}>
                    Categorías
                  </h4>
                  
                  {/* VERSIÓN MÓVIL (Dropdown) */}
                  <div className="block lg:hidden relative">
                    <button
                      onClick={() => setDropdownAbierto(!dropdownAbierto)}
                      className={`w-full flex items-center justify-between font-bold px-5 py-4 rounded-2xl shadow-lg transition-all ${
                        config.temaFondo === 'dark'
                          ? 'bg-[#1a1a1a] hover:bg-[#222] border border-[#333] hover:border-[#444] text-white'
                          : 'bg-gray-100 hover:bg-gray-200 border border-gray-300 hover:border-gray-400 text-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">
                          {categoriaSeleccionada === 'Todos' ? '🍔' : '📌'}
                        </span>
                        <span>{categoriaSeleccionada === 'Todos' ? 'Todas las Categorías' : categoriaSeleccionada}</span>
                      </div>
                      <span className={`transition-transform duration-300 ${dropdownAbierto ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {dropdownAbierto && (
                      <div className={`absolute z-50 mt-2 w-full rounded-2xl shadow-2xl overflow-hidden animate-fadeIn ${
                        config.temaFondo === 'dark'
                          ? 'bg-[#1a1a1a] border border-[#333]'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <button
                          onClick={() => {
                            setCategoriaSeleccionada('Todos');
                            setDropdownAbierto(false);
                          }}
                          className={`w-full text-left px-5 py-4 font-bold transition-all border-b flex items-center gap-3 ${
                            config.temaFondo === 'dark'
                              ? 'border-[#222] hover:bg-[#222] text-neutral-300'
                              : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                          } ${categoriaSeleccionada === 'Todos' ? (config.temaFondo === 'dark' ? 'bg-[#ff5a1f]/10 text-[#ff5a1f]' : 'bg-gray-100 text-gray-900') : ''}`}
                        >
                          <span className="text-xl">🍔</span>
                          Todas las Categorías
                        </button>
                        <div className="max-h-60 overflow-y-auto">
                          {categorias.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => {
                                setCategoriaSeleccionada(cat.nombre);
                                setDropdownAbierto(false);
                              }}
                              className={`w-full text-left px-5 py-4 font-bold transition-all border-b last:border-0 flex items-center gap-3 ${
                                config.temaFondo === 'dark'
                                  ? 'border-[#222] hover:bg-[#222] text-neutral-300'
                                  : 'border-gray-100 hover:bg-gray-50 text-gray-700'
                              } ${categoriaSeleccionada === cat.nombre ? (config.temaFondo === 'dark' ? 'bg-[#ff5a1f]/10 text-[#ff5a1f]' : 'bg-gray-100 text-gray-900') : ''}`}
                            >
                              <span className="text-xl opacity-50">📌</span>
                              {cat.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* VERSIÓN PC (Botones laterales) */}
                  <div className="hidden lg:flex flex-col space-y-2">
                    <button 
                      onClick={() => setCategoriaSeleccionada('Todos')}
                      className={`w-full text-left px-5 py-3.5 rounded-2xl font-bold transition-all flex justify-between items-center group ${
                        categoriaSeleccionada === 'Todos'
                          ? 'text-white shadow-lg'
                          : config.temaFondo === 'dark'
                            ? 'bg-[#1a1a1a] text-neutral-400 hover:bg-[#222] border border-[#333] hover:border-[#444]'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 hover:border-gray-300'
                      }`}
                      style={categoriaSeleccionada === 'Todos' ? { backgroundColor: config.colorPrimario } : {}}
                    >
                      Todos
                    </button>
                    {categorias.map(cat => (
                      <button 
                        key={cat.id} 
                        onClick={() => setCategoriaSeleccionada(cat.nombre)}
                        className={`w-full text-left px-5 py-3.5 rounded-2xl font-bold transition-all flex justify-between items-center group ${
                          categoriaSeleccionada === cat.nombre
                            ? 'text-white shadow-lg'
                            : config.temaFondo === 'dark'
                              ? 'bg-[#1a1a1a] text-neutral-400 hover:bg-[#222] border border-[#333] hover:border-[#444]'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200 hover:border-gray-300'
                        }`}
                        style={categoriaSeleccionada === cat.nombre ? { backgroundColor: config.colorPrimario } : {}}
                      >
                        {cat.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Columna Derecha: Cuadrícula de Platos */}
                <div className="lg:w-3/4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    
                    {productosReales
                      .filter(plato => {
                        if (categoriaSeleccionada === 'Todos') return true;
                        const nombreCatDelPlato = categorias.find(c => c.id === plato.categoria)?.nombre || plato.categoria;
                        return nombreCatDelPlato === categoriaSeleccionada;
                      })
                      .map((plato) => {
                        const nombreCategoriaMuestra = categorias.find(c => c.id === plato.categoria)?.nombre || plato.categoria || 'Sin categoría';
                        return (
                          <div 
                            key={plato.id} 
                            className={`rounded-3xl p-5 flex flex-col relative overflow-hidden transition-all ${
                              !plato.disponible ? 'opacity-60 grayscale' : ''
                            } ${
                              config.temaFondo === 'dark'
                                ? 'bg-[#111] border border-[#222] group hover:border-[#ff5a1f]/50'
                                : 'bg-white border border-gray-200 shadow-sm group hover:border-gray-300'
                            }`}
                          >
                            {/* Indicador de Disponibilidad */}
                            <button 
                              onClick={() => toggleDisponibilidad(plato)}
                              className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full border z-10 transition-all hover:scale-105 ${
                                config.temaFondo === 'dark'
                                  ? 'bg-[#1a1a1a] border-[#333]'
                                  : 'bg-gray-100 border-gray-200'
                              }`}
                            >
                              <span className={`w-2 h-2 rounded-full ${plato.disponible ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-gray-500'
                              }`}>
                                {plato.disponible ? 'Disponible' : 'Agotado'}
                              </span>
                            </button>

                            {/* Imagen placeholder */}
                            <div className={`w-full h-32 rounded-2xl flex items-center justify-center text-6xl mb-4 transition-transform group-hover:scale-105 shadow-inner ${
                              config.temaFondo === 'dark'
                                ? 'bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#222]'
                                : 'bg-gradient-to-br from-gray-100 to-gray-50 border border-gray-200'
                            }`}>
                              🍽️
                            </div>
                            
                            <h5 className={`font-black text-xl leading-tight mb-1 ${
                              config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                            }`}>
                              {plato.nombre}
                            </h5>
                            <p className={`text-[10px] font-bold uppercase tracking-widest mb-4 line-clamp-1 ${
                              config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                            }`}>
                              {nombreCategoriaMuestra}
                            </p>
                            
                            <div className="mt-auto flex items-center justify-between">
                              <p className="font-black text-2xl" style={{ color: config.colorPrimario }}>
                                S/ {parseFloat(plato.precio_base).toFixed(2)}
                              </p>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => abrirModalEditar(plato)}
                                  className={`w-10 h-10 flex items-center justify-center rounded-xl transition-colors ${
                                    config.temaFondo === 'dark'
                                      ? 'bg-[#1a1a1a] hover:bg-[#222] text-white border border-[#333]'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200'
                                  }`}
                                >
                                  ✏️
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {/* Mensaje si no hay platos */}
                    {productosReales.filter(plato => {
                      if (categoriaSeleccionada === 'Todos') return true;
                      const nombreCatDelPlato = categorias.find(c => c.id === plato.categoria)?.nombre || plato.categoria;
                      return nombreCatDelPlato === categoriaSeleccionada;
                    }).length === 0 && (
                      <div className="col-span-full py-12 text-center">
                        <p className={`text-lg font-bold ${
                          config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                        }`}>
                          No hay platos en esta categoría.
                        </p>
                      </div>
                    )}

                  </div>
                </div>

              </div>
            </div>
          )}
          {/* ======================= VISTA: PERSONAL Y ROLES ======================= */}
          {vistaActiva === 'personal' && (
            <div className="animate-fadeIn space-y-6">
              
              {/* ========== CABECERA ========== */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className={`text-2xl font-black ${
                    config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Equipo de Trabajo
                  </h3>
                  <p className={`text-sm ${
                    config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                  }`}>
                    Controla quién accede a cada módulo y sus códigos PIN.
                  </p>
                </div>
                <button 
                  onClick={() => setModalEmpleado(true)}
                  style={{ backgroundColor: config.colorPrimario }}
                  className="text-white px-6 py-3 rounded-xl font-black shadow-lg active:scale-95 transition-all hover:brightness-110"
                >
                  + NUEVO EMPLEADO
                </button>
              </div>

              {/* ========== LISTADO DE EMPLEADOS ========== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {empleadosReales.length === 0 && (
                  <p className={`py-4 ${
                    config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                  }`}>
                    Aún no hay empleados registrados.
                  </p>
                )}
                
                {empleadosReales.map(emp => (
                  <div 
                    key={emp.id} 
                    className={`p-5 rounded-3xl flex items-center justify-between group transition-all ${
                      config.temaFondo === 'dark'
                        ? 'bg-[#121212] border border-[#222] hover:border-[#ff5a1f]/50'
                        : 'bg-white border border-gray-200 shadow-sm hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border ${
                        config.temaFondo === 'dark'
                          ? 'bg-[#222] border-[#333]'
                          : 'bg-gray-100 border-gray-200'
                      }`}>
                        {emp.rol_nombre?.includes('Admin') ? '👑' : 
                        emp.rol_nombre?.includes('Cajer') ? '💰' : 
                        emp.rol_nombre?.includes('Mesero') ? '🏃' : '👨‍🍳'}
                      </div>
                      <div>
                        <h4 className={`font-bold text-lg ${
                          config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>
                          {emp.nombre}
                        </h4>
                        <div className="flex gap-2 mt-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                            config.temaFondo === 'dark'
                              ? 'bg-[#1a1a1a] text-[#ff5a1f] border-[#ff5a1f]/20'
                              : 'bg-gray-100 text-[#ff5a1f] border-gray-200'
                          }`}>
                            {emp.rol_nombre || 'Sin Rol'}
                          </span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                            emp.activo 
                              ? (config.temaFondo === 'dark' ? 'text-green-500 border-green-500/20 bg-[#1a1a1a]' : 'text-green-600 border-green-200 bg-gray-50')
                              : (config.temaFondo === 'dark' ? 'text-red-500 border-red-500/20 bg-[#1a1a1a]' : 'text-red-600 border-red-200 bg-gray-50')
                          }`}>
                            {emp.activo ? 'ACTIVO' : 'INACTIVO'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
                        config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                      }`}>
                        PIN de Acceso
                      </p>
                      <p className={`font-mono font-bold tracking-[4px] ${
                        config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        ****
                      </p>
                      {/* ✅ Botón Editar corregido: siempre visible, hover con color primario */}
                      <button 
                        className="text-xs font-bold mt-2 transition-colors duration-200"
                        style={{
                          color: config.temaFondo === 'dark' ? '#ffffff' : '#1f2937'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = config.colorPrimario}
                        onMouseLeave={(e) => e.currentTarget.style.color = config.temaFondo === 'dark' ? '#ffffff' : '#1f2937'}
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* ========== MATRIZ DE PERMISOS ========== */}
              <div className={`rounded-3xl p-6 mt-8 border transition-all ${
                config.temaFondo === 'dark'
                  ? 'bg-[#111] border-[#222]'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <h4 className={`font-bold mb-4 flex items-center gap-2 ${
                  config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  <span className="text-xl">🛡️</span> Matriz de Permisos
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className={`border-b ${
                        config.temaFondo === 'dark' ? 'text-neutral-500 border-[#222]' : 'text-gray-500 border-gray-200'
                      }`}>
                        <th className="pb-4 font-black uppercase tracking-widest text-[10px]">Módulo</th>
                        <th className="pb-4 text-center">Admin</th>
                        <th className="pb-4 text-center">Cajero</th>
                        <th className="pb-4 text-center">Mesero</th>
                        <th className="pb-4 text-center">Chef</th>
                      </tr>
                    </thead>
                    <tbody className={config.temaFondo === 'dark' ? 'text-neutral-300' : 'text-gray-700'}>
                      {[
                        { mod: 'Ventas y Dashboard', p: ['✅','✅','❌','❌'] },
                        { mod: 'Apertura/Cierre Caja', p: ['✅','✅','❌','❌'] },
                        { mod: 'Toma de Pedidos (POS)', p: ['✅','✅','✅','❌'] },
                        { mod: 'Pantalla Cocina (KDS)', p: ['✅','❌','✅','✅'] },
                        { mod: 'Editar Precios/Menú', p: ['✅','❌','❌','❌'] },
                      ].map((row, i) => (
                        <tr key={i} className={`border-b ${
                          config.temaFondo === 'dark' ? 'border-[#1a1a1a]' : 'border-gray-100'
                        }`}>
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
            <div className="animate-fadeIn space-y-6 max-w-5xl mx-auto">
              
              {/* CABECERA */}
              <div className="flex justify-between items-end">
                <div>
                  <h3 className={`text-2xl font-black ${
                    config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Insumos y Stock
                  </h3>
                  <p className={`text-sm ${
                    config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                  }`}>
                    Controla las mermas y asegura que no falte mercancía.
                  </p>
                </div>
                <button 
                  style={{ backgroundColor: config.colorPrimario }}
                  className="text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:brightness-110 transition-colors"
                >
                  + Ingresar Compra (Factura)
                </button>
              </div>

              {/* TARJETAS DE INSUMOS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { n: 'Pan de Hamburguesa', q: '12 Unidades', st: 'Bajo', color: 'red' },
                  { n: 'Carne Molida (Res)', q: '15.5 Kg', st: 'Óptimo', color: 'gray' },
                  { n: 'Cerveza Pilsen', q: '4 Cajas', st: 'Alerta', color: 'yellow' },
                ].map((ins, i) => (
                  <div 
                    key={i} 
                    className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${
                      config.temaFondo === 'dark'
                        ? `border-${ins.color}-500/50 bg-${ins.color}-500/5`
                        : 'border-gray-200 bg-white shadow-sm'
                    }`}
                  >
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${
                      config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                    }`}>
                      {ins.st}
                    </p>
                    <h4 className={`text-xl font-black ${
                      config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {ins.n}
                    </h4>
                    <p className={`text-3xl font-mono mt-3 font-bold ${
                      config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {ins.q}
                    </p>
                  </div>
                ))}
              </div>

              {/* INFO ESCANDALLO */}
              <div className={`rounded-3xl p-6 flex items-start gap-4 border ${
                config.temaFondo === 'dark'
                  ? 'bg-[#111] border-[#222]'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <span className="text-4xl">💡</span>
                <div>
                  <h4 className={`font-bold text-lg ${
                    config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    ¿Cómo funciona el escandallo automático?
                  </h4>
                  <p className={`text-sm mt-1 leading-relaxed ${
                    config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-gray-600'
                  }`}>
                    Cuando vincules una receta a un plato, el sistema hará el trabajo por ti. Si vendes una "Hamburguesa Simple", el sistema descontará automáticamente <strong className={config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}>1 Pan</strong> y <strong className={config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}>0.15 Kg de Carne</strong> de tu stock sin que el mesero tenga que hacer nada.
                  </p>
                  <button 
                    style={{ borderColor: config.colorPrimario, color: config.colorPrimario }}
                    className={`mt-4 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                      config.temaFondo === 'dark'
                        ? 'border hover:bg-[#222] hover:text-white'
                        : 'border hover:bg-gray-100'
                    }`}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = config.colorPrimario; e.currentTarget.style.color = 'white'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = config.colorPrimario; }}
                  >
                    Configurar Recetas →
                  </button>
                </div>
              </div>

            </div>
          )}
          {/* ======================= VISTA: CARTA QR + CUENTA EN VIVO ======================= */}
          {vistaActiva === 'carta_qr' && (
            <div className="animate-fadeIn max-w-4xl mx-auto space-y-6">
              <div className={`rounded-3xl p-8 text-center border ${
                config.temaFondo === 'dark'
                  ? 'bg-[#121212] border-[#222]'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}>
                <div className="text-7xl mb-4">📱</div>
                <h2 className={`text-2xl font-black mb-2 ${
                  config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Menú QR + Cuenta en Vivo
                </h2>
                <p className={`mb-6 ${
                  config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-gray-600'
                }`}>
                  Módulo en desarrollo. Permite a los clientes escanear un código QR en la mesa, ver el menú y solicitar la cuenta en tiempo real.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff5a1f]/10 text-[#ff5a1f] text-sm font-bold">
                  🚧 Próximamente
                </div>
              </div>
            </div>
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


        </main>
      </div>
      {/* MODAL PARA AGREGAR EMPLEADO REAL */}
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
                <input 
                  type="text" 
                  value={formEmpleado.nombre}
                  onChange={(e) => setFormEmpleado({...formEmpleado, nombre: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none" 
                  placeholder="Ej. Juan Pérez" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Rol</label>
                  <select 
                    value={formEmpleado.rol}
                    onChange={(e) => setFormEmpleado({...formEmpleado, rol: e.target.value})}
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none"
                  >
                    {rolesReales.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">PIN (4 Dígitos)</label>
                  <input 
                    type="password" 
                    maxLength="4" 
                    value={formEmpleado.pin}
                    onChange={(e) => setFormEmpleado({...formEmpleado, pin: e.target.value.replace(/\D/g, '')})} // Solo números
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white text-center font-mono text-xl tracking-[10px] focus:border-[#ff5a1f] outline-none" 
                    placeholder="0000" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Sede Asignada</label>
                <select 
                  value={formEmpleado.sede}
                  onChange={(e) => setFormEmpleado({...formEmpleado, sede: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none"
                >
                  {sedesReales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <button 
                onClick={manejarCrearEmpleado}
                disabled={!formEmpleado.nombre || formEmpleado.pin.length !== 4}
                className="w-full bg-[#ff5a1f] text-white py-4 rounded-xl font-black mt-4 shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                CREAR ACCESO
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL PARA AGREGAR/EDITAR PLATO */}
      {/* MODAL PARA AGREGAR/EDITAR PLATO (VERSIÓN WIZARD) */}
      {modalPlato && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#333] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fadeIn relative">
            
            {/* Cabecera Fija */}
            <div className="p-6 border-b border-[#222] bg-[#1a1a1a] flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-3">
                {pasoModal === 2 && (
                  <button onClick={() => setPasoModal(1)} className="text-neutral-500 hover:text-white bg-[#222] w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors">
                    ←
                  </button>
                )}
                <h3 className="text-xl font-black text-white">
                  {formPlato.id ? 'Editar Plato' : 'Nuevo Plato'} 
                  {pasoModal === 2 && <span className="text-[#ff5a1f]"> - Presentaciones</span>}
                </h3>
              </div>
              <button onClick={cerrarModalPlato} className="text-neutral-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <div className="p-6 space-y-6">

              {/* ======================= PANTALLA 1: DATOS BÁSICOS ======================= */}
              {pasoModal === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Nombre, Precio y Categoría */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Nombre del Plato</label>
                      <input 
                        type="text" 
                        value={formPlato.nombre}
                        onChange={(e) => setFormPlato({...formPlato, nombre: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none" 
                        placeholder="Ej. Pizza Hawaiana" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Precio Base (S/)</label>
                      <input 
                        type="number" 
                        step="0.10"
                        value={formPlato.precio_base}
                        onChange={(e) => setFormPlato({...formPlato, precio_base: e.target.value})}
                        disabled={formPlato.requiere_seleccion} 
                        className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-all" 
                        placeholder="0.00" 
                      />
                    </div>
                    {/* SELECT PERSONALIZADO DE CATEGORÍAS */}
                    <div className="col-span-1 md:col-span-3 relative">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-2 block">Categoría</label>
                      
                      {/* Botón del Select */}
                      <button
                        type="button"
                        onClick={() => setDropdownCatModalAbierto(!dropdownCatModalAbierto)}
                        className="w-full flex items-center justify-between bg-[#1a1a1a] border border-[#333] hover:border-[#444] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none transition-all text-left"
                      >
                        {/* Buscamos el nombre de la categoría porque el formulario solo guarda el ID */}
                        <span className={!formPlato.categoria_id ? "text-neutral-500" : "text-white font-bold"}>
                          {formPlato.categoria_id 
                            ? (categorias.find(c => String(c.id) === String(formPlato.categoria_id))?.nombre || "Categoría desconocida")
                            : "Seleccione una categoría..."}
                        </span>
                        <span className={`text-neutral-500 transition-transform duration-300 ${dropdownCatModalAbierto ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>

                      {/* Lista Desplegable Flotante */}
                      {dropdownCatModalAbierto && (
                        <div className="absolute z-[60] mt-2 w-full bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl overflow-hidden animate-fadeIn">
                          <div className="max-h-48 overflow-y-auto">
                            
                            <button
                              type="button"
                              onClick={() => {
                                setFormPlato({...formPlato, categoria_id: ''});
                                setDropdownCatModalAbierto(false);
                              }}
                              className={`w-full text-left px-4 py-3 text-sm font-bold transition-all border-b border-[#222] 
                                ${!formPlato.categoria_id ? 'bg-[#ff5a1f]/10 text-[#ff5a1f]' : 'text-neutral-400 hover:bg-[#222] hover:text-white'}`}
                            >
                              Ninguna / Quitar selección
                            </button>
                            
                            {categorias.map(cat => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setFormPlato({...formPlato, categoria_id: cat.id});
                                  setDropdownCatModalAbierto(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-bold transition-all border-b border-[#222] last:border-0 
                                  ${String(formPlato.categoria_id) === String(cat.id) ? 'bg-[#ff5a1f]/10 text-[#ff5a1f]' : 'text-neutral-300 hover:bg-[#222] hover:text-white'}`}
                              >
                                {cat.nombre}
                              </button>
                            ))}
                            
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comportamiento (Switches) */}
                  <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 space-y-4">
                    <h4 className="text-white font-bold text-sm mb-2 border-b border-[#333] pb-2">Comportamiento en POS</h4>
                    
                    {/* 1. Venta Rápida */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-sm">Venta Rápida (Directo al carrito)</p>
                        <p className="text-neutral-500 text-[11px]">Sin ventanas extra. Ideal para gaseosas.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formPlato.es_venta_rapida} onChange={(e) => setFormPlato({...formPlato, es_venta_rapida: e.target.checked, requiere_seleccion: false, tiene_variaciones: false})} />
                        <div className="w-11 h-6 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:bg-[#ff5a1f] transition-colors"><div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform ${formPlato.es_venta_rapida ? 'translate-x-full' : ''}`}></div></div>
                      </label>
                    </div>

                    {/* 2. Requiere Selección */}
                    <div className="flex items-center justify-between opacity-100 transition-opacity">
                      <div>
                        <p className="text-white font-bold text-sm">Requiere Selección (Presentaciones)</p>
                        <p className="text-neutral-500 text-[11px]">Ej. Personal o Familiar. Obliga a elegir.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formPlato.requiere_seleccion} 
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormPlato({...formPlato, requiere_seleccion: checked, es_venta_rapida: false, precio_base: checked ? '0.00' : formPlato.precio_base});
                          }} 
                        />
                        <div className="w-11 h-6 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:bg-[#ff5a1f] transition-colors"><div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform ${formPlato.requiere_seleccion ? 'translate-x-full' : ''}`}></div></div>
                      </label>
                    </div>

                    {/* 3. Tiene Variaciones */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-bold text-sm">Tiene Variaciones (Extras Opcionales)</p>
                        <p className="text-neutral-500 text-[11px]">Ej. Sin cebolla, Extra Queso. Abre modal.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formPlato.tiene_variaciones} 
                          onChange={(e) => setFormPlato({...formPlato, tiene_variaciones: e.target.checked, es_venta_rapida: false})} 
                        />
                        <div className="w-11 h-6 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:bg-[#ff5a1f] transition-colors"><div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform ${formPlato.tiene_variaciones ? 'translate-x-full' : ''}`}></div></div>
                      </label>
                    </div>
                  </div>

                  {/* BOTONES DEL PASO 1 */}
                  {(formPlato.requiere_seleccion || formPlato.tiene_variaciones) ? (
                    <button onClick={() => {
                      // Si no hay grupos, creamos uno por defecto al pasar al Paso 2
                      if (formPlato.grupos_variacion.length === 0) {
                        setFormPlato({...formPlato, grupos_variacion: [{ nombre: 'Opciones', obligatorio: formPlato.requiere_seleccion, seleccion_multiple: false, opciones: [] }]});
                      }
                      setPasoModal(2);
                    }} className="w-full bg-[#2463EB] hover:bg-blue-500 text-white py-4 rounded-xl font-black shadow-lg transition-all flex justify-center items-center gap-2">
                      {formPlato.id ? 'EDITAR OPCIONES / PRECIOS →' : 'SIGUIENTE: DEFINIR OPCIONES →'}
                    </button>
                  ) : (
                    <button onClick={manejarGuardarPlato} disabled={!formPlato.nombre || !formPlato.precio_base} className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white py-4 rounded-xl font-black shadow-lg disabled:opacity-50 transition-all">
                      {formPlato.id ? 'ACTUALIZAR PLATO' : 'GUARDAR PLATO'}
                    </button>
                  )}
                </div>
              )}

              {/* ======================= PANTALLA 2: LAS SELECCIONES / VARIACIONES ======================= */}
              {pasoModal === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-white font-bold text-sm">Grupos de Opciones</h4>
                    <button onClick={() => {
                      setFormPlato({...formPlato, grupos_variacion: [...formPlato.grupos_variacion, { nombre: 'Nuevo Grupo', obligatorio: false, seleccion_multiple: true, opciones: [] }]});
                    }} className="text-[#ff5a1f] text-xs font-bold bg-[#ff5a1f]/10 px-3 py-1.5 rounded-lg hover:bg-[#ff5a1f]/20 transition-colors">
                      + Añadir Grupo
                    </button>
                  </div>

                  <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2">
                    {formPlato.grupos_variacion.map((grupo, gIndex) => (
                      <div key={gIndex} className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 relative">
                        
                        {/* Botón eliminar grupo */}
                        <button onClick={() => {
                          const nuevos = formPlato.grupos_variacion.filter((_, i) => i !== gIndex);
                          setFormPlato({...formPlato, grupos_variacion: nuevos});
                        }} className="absolute top-4 right-4 text-neutral-500 hover:text-red-500 transition-colors">🗑️</button>

                        {/* Nombre y Reglas del Grupo */}
                        <div className="space-y-3 mb-4 pr-8">
                          <div>
                            <label className="text-[10px] font-black text-[#ff5a1f] uppercase tracking-widest block mb-1">Nombre del Grupo</label>
                            <input type="text" value={grupo.nombre} onChange={(e) => {
                              const nuevosGrupos = [...formPlato.grupos_variacion];
                              nuevosGrupos[gIndex].nombre = e.target.value;
                              setFormPlato({...formPlato, grupos_variacion: nuevosGrupos});
                            }} className="w-full bg-[#111] border border-[#ff5a1f]/30 focus:border-[#ff5a1f] rounded-xl px-4 py-2 text-white font-bold outline-none text-sm" placeholder="Ej. Elige tu crema" />
                          </div>
                          
                          <div className="flex gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={grupo.obligatorio} onChange={(e) => {
                                const nuevosGrupos = [...formPlato.grupos_variacion];
                                nuevosGrupos[gIndex].obligatorio = e.target.checked;
                                setFormPlato({...formPlato, grupos_variacion: nuevosGrupos});
                              }} className="accent-[#ff5a1f] w-4 h-4" />
                              <span className="text-white text-xs font-bold">Es Obligatorio</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={grupo.seleccion_multiple} onChange={(e) => {
                                const nuevosGrupos = [...formPlato.grupos_variacion];
                                nuevosGrupos[gIndex].seleccion_multiple = e.target.checked;
                                setFormPlato({...formPlato, grupos_variacion: nuevosGrupos});
                              }} className="accent-[#ff5a1f] w-4 h-4" />
                              <span className="text-white text-xs font-bold">Selección Múltiple</span>
                            </label>
                          </div>
                        </div>

                        <div className="h-px w-full bg-[#333] mb-4"></div>

                        {/* Lista de Opciones (Familiar, Personal, Sin Cebolla) */}
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Opciones y Precios (+S/)</label>
                            <button onClick={() => {
                              const nuevosGrupos = [...formPlato.grupos_variacion];
                              nuevosGrupos[gIndex].opciones.push({ nombre: '', precio_adicional: '' });
                              setFormPlato({...formPlato, grupos_variacion: nuevosGrupos});
                            }} className="text-[#ff5a1f] text-xs font-bold hover:underline">
                              + Añadir Opción
                            </button>
                          </div>

                          <div className="space-y-2 w-full overflow-hidden">
                            {grupo.opciones.map((opcion, oIndex) => (
                              <div key={oIndex} className="grid grid-cols-[1fr_80px_40px] sm:grid-cols-[1fr_100px_40px] gap-2 items-center">
                                <input type="text" placeholder="Ej. Sin Cebolla" value={opcion.nombre} onChange={(e) => {
                                  const nuevosGrupos = [...formPlato.grupos_variacion];
                                  nuevosGrupos[gIndex].opciones[oIndex].nombre = e.target.value;
                                  setFormPlato({...formPlato, grupos_variacion: nuevosGrupos});
                                }} className="w-full bg-[#111] border border-[#333] rounded-xl px-3 py-2.5 text-white outline-none focus:border-white text-sm" />
                                
                                <input type="number" placeholder="0.00" value={opcion.precio_adicional} onChange={(e) => {
                                  const nuevosGrupos = [...formPlato.grupos_variacion];
                                  nuevosGrupos[gIndex].opciones[oIndex].precio_adicional = e.target.value;
                                  setFormPlato({...formPlato, grupos_variacion: nuevosGrupos});
                                }} className="w-full bg-[#111] border border-[#333] rounded-xl px-3 py-2.5 text-white outline-none focus:border-white text-right text-sm" />
                                
                                <button onClick={() => {
                                  const nuevosGrupos = [...formPlato.grupos_variacion];
                                  nuevosGrupos[gIndex].opciones = nuevosGrupos[gIndex].opciones.filter((_, i) => i !== oIndex);
                                  setFormPlato({...formPlato, grupos_variacion: nuevosGrupos});
                                }} className="w-full h-[42px] flex items-center justify-center text-red-500 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-xl transition-colors font-bold">✕</button>
                              </div>
                            ))}
                            {grupo.opciones.length === 0 && (
                              <p className="text-neutral-500 text-xs italic">Añade opciones para este grupo.</p>
                            )}
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>

                  {/* BOTÓN FINAL DE GUARDAR */}
                  <button onClick={manejarGuardarPlato} className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white py-4 rounded-xl font-black shadow-lg shadow-[#ff5a1f]/20 mt-8 transition-all">
                    TERMINAR Y GUARDAR
                  </button>
                </div>
              )}
              
            </div>
          </div>
        </div>
      )}
      {/* MODAL DE ADMINISTRACIÓN DE CATEGORÍAS */}
      {modalCategorias && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-[#333] rounded-3xl w-full max-w-md animate-fadeIn relative overflow-hidden">
            
            <div className="p-6 border-b border-[#222] bg-[#1a1a1a] flex justify-between items-center">
              <h3 className="text-xl font-black text-white">Categorías del Menú</h3>
              <button onClick={() => setModalCategorias(false)} className="text-neutral-500 hover:text-white font-bold text-xl">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* INPUT PARA NUEVA CATEGORÍA */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={nombreNuevaCat}
                  onChange={(e) => setNombreNuevaCat(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && manejarCrearCategoria()}
                  className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:border-[#ff5a1f] outline-none" 
                  placeholder="Ej. Bebidas, Postres..." 
                />
                <button 
                  onClick={manejarCrearCategoria}
                  disabled={!nombreNuevaCat.trim()}
                  className="bg-[#ff5a1f] hover:bg-[#e04a15] text-white px-6 font-bold rounded-xl disabled:opacity-50 transition-all"
                >
                  Agregar
                </button>
              </div>

              <div className="h-px w-full bg-[#222]"></div>

              {/* LISTA DE CATEGORÍAS ACTUALES */}
              <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2">
                {categorias.length === 0 ? (
                  <p className="text-neutral-500 text-center text-sm py-4">No hay categorías creadas aún.</p>
                ) : (
                  categorias.map(cat => (
                    <div key={cat.id} className="flex justify-between items-center bg-[#1a1a1a] p-3 rounded-xl border border-[#222]">
                      <span className="text-white font-bold">{cat.nombre}</span>
                      <button 
                        onClick={() => eliminarCategoriaLocal(cat.id)}
                        className="text-neutral-500 hover:text-red-500 hover:bg-red-500/10 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
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
    </div>
  );
}