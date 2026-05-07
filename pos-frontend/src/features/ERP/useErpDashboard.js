import { useState, useEffect } from 'react';
import { 
  obtenerMetricasDashboard, getEmpleados, getRoles, getOrdenes,
  crearEmpleado, getProductos, crearProducto, actualizarProducto, parchearProducto,
  getCategorias, crearCategoria, actualizarNegocio, actualizarEmpleado, parchearCategoria,
  getModificadores,
} from '../../api/api';
import api from '../../api/api';
import usePosStore from '../../store/usePosStore';

export const useErpDashboard = () => {
  const { configuracionGlobal, setConfiguracionGlobal } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';

  // ==========================================
  // 1. ESTADOS PRINCIPALES
  // ==========================================
  const [ordenesReales, setOrdenesReales] = useState([]);
  const [vistaActiva, setVistaActiva] = useState('dashboard');
  
  // ✨ CEREBROS DE MEMORIA AISLADA (Leen directamente de su propio localStorage)
  // 🔧 FIX: El dueño arranca siempre en 'Todas' (sin sede fija).
  // Si tiene 'memoria_sede_ventas' guardada la usamos, pero solo si el rol NO es dueño.
  const _rolInicial = localStorage.getItem('usuario_rol')?.toLowerCase() || '';
  const _esDueñoInicial = _rolInicial === 'dueño';
  const [sedeVentasId, setSedeVentasId] = useState(
    _esDueñoInicial ? '' : (localStorage.getItem('memoria_sede_ventas') || '')
  );
  const [sedePersonalId, setSedePersonalId] = useState(localStorage.getItem('memoria_sede_personal') || '');
  const [sedeMenuId, setSedeMenuId] = useState(localStorage.getItem('memoria_sede_menu') || '');

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [modalEmpleado, setModalEmpleado] = useState(false);
  const [modalVariacionesOpen, setModalVariacionesOpen] = useState(false);
  const [productoParaVariaciones, setProductoParaVariaciones] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [config, setConfig] = useState({
    // Identidad
    ruc: '', razon_social: '', logoPreview: null, logoFile: null, logo: null,
    // Billeteras
    yape_numero: '', yape_qrPreview: null, yape_qrFile: null, yape_qr: null,
    plin_numero: '', plin_qrPreview: null, plin_qrFile: null, plin_qr: null,
    // Culqi
    usa_culqi: false, culqi_public_key: '', culqi_private_key: '',
    // Módulos
    modSalon: true, modCocina: false, modDelivery: false, modInventario: false, 
    modClientes: false, modFacturacion: false, modCartaQr: false, modBotWsp: false, modMl: false,
    // UI
    colorPrimario: '#ff5a1f', temaFondo: 'dark', permisosPlan: {}
  });
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [productosReales, setProductosReales] = useState([]);
  const [modificadoresReales, setModificadoresReales] = useState([]);
  const [modalPlato, setModalPlato] = useState(false);
  const [pasoModal, setPasoModal] = useState(1);
  const [formPlato, setFormPlato] = useState({ 
    id: null, nombre: '', precio_base: '', categoria_id: '', es_venta_rapida: true,
    requiere_seleccion: false, tiene_variaciones: false, disponible: true, grupos_variacion: []
  });
  const [empleadosReales, setEmpleadosReales] = useState([]);
  const [rolesReales, setRolesReales] = useState([]);
  const [sedesReales, setSedesReales] = useState([]);
  const [formEmpleado, setFormEmpleado] = useState({ id: null, nombre: '', pin: '', rol: '', sede: '' });
  const [metricas, setMetricas] = useState({ ventas: 0, ordenes: 0, ticketPromedio: 0, actividadReciente: [] });
  const [modalCategorias, setModalCategorias] = useState(false);
  const [nombreNuevaCat, setNombreNuevaCat] = useState('');
  const [modalRecetaOpen, setModalRecetaOpen] = useState(false);
  const [productoParaReceta, setProductoParaReceta] = useState(null);
  const [configOriginal, setConfigOriginal] = useState(null);
  const [modalCambiosPendientes, setModalCambiosPendientes] = useState(false);
  const [vistaPendiente, setVistaPendiente] = useState(null);

  const hayCambiosPendientes = configOriginal ? (
    config.numeroYape !== configOriginal.numeroYape || config.modSalon !== configOriginal.modSalon ||
    config.modCocina !== configOriginal.modCocina || config.modDelivery !== configOriginal.modDelivery ||
    config.modInventario !== configOriginal.modInventario || config.modClientes !== configOriginal.modClientes ||
    config.modFacturacion !== configOriginal.modFacturacion || config.modCartaQr !== configOriginal.modCartaQr ||
    config.modBotWsp !== configOriginal.modBotWsp || config.modMl !== configOriginal.modMl ||
    config.colorPrimario !== configOriginal.colorPrimario || config.temaFondo !== configOriginal.temaFondo
  ) : false;

  const moduloKdsActivo = configuracionGlobal?.modulos?.cocina;
  const rolesFiltrados = rolesReales.filter(rol => {
    if (!moduloKdsActivo && (rol.nombre.toLowerCase().includes('cocin') || rol.nombre.toLowerCase().includes('chef'))) return false;
    return true; 
  });
  
  // ✨ LA EXTRAEMOS PARA QUE OTROS COMPONENTES LA PUEDAN USAR
  const recargarSedes = async () => {
    try {
      const negocioId = parseInt(localStorage.getItem('negocio_id') || 1);
      const resSedes = await api.get(`/sedes/`, { params: { negocio_id: negocioId } });
      setSedesReales(resSedes.data);
    } catch (error) { console.error("Error cargando sedes:", error); }
  };

  useEffect(() => {
    recargarSedes(); // Se ejecuta al inicio, igual que antes
  }, []);

  // ==========================================
  // ✨ 2. EFECTOS MULTITAREA (Conectados a su propia memoria)
  // ==========================================
  
  // 🔧 FIX: construye params correctos para el dashboard.
  // Si el dueño seleccionó "Todas" (sedeVentasId vacío), manda negocio_id
  // para que el interceptor NO inyecte la sede del localStorage.
  const buildDashboardParams = (sedeId, extraParams = {}) => {
    const negocioId = localStorage.getItem('negocio_id');
    const rol = localStorage.getItem('usuario_rol')?.toLowerCase();
    const esDueño = rol === 'dueño';
    if (sedeId) return { sede_id: sedeId, ...extraParams };
    if (esDueño) return { negocio_id: negocioId, ...extraParams };
    return { ...extraParams };
  };

  // Dashboard (Ventas)
  useEffect(() => {
    if (vistaActiva === 'dashboard') {
      const cargarDatos = async () => {
        try {
          const params = buildDashboardParams(sedeVentasId, { modo: 'dashboard' });
          const [resMetricas, resOrdenes] = await Promise.all([
            obtenerMetricasDashboard(params),
            getOrdenes(params)
          ]);
          setMetricas(resMetricas.data);
          setOrdenesReales(resOrdenes.data);
        } catch (error) { console.error("Error al cargar métricas:", error); }
      };
      cargarDatos();
      const intervalo = setInterval(cargarDatos, 10000);
      return () => clearInterval(intervalo);
    }
  }, [vistaActiva, sedeVentasId]); // 👈 Solo reacciona a su propia memoria

  // Personal
  useEffect(() => {
    if (vistaActiva === 'personal') {
      const cargarDatosPersonal = async () => {
        try {
          const negocioId = parseInt(localStorage.getItem('negocio_id') || 1);
          const params = { negocio_id: negocioId, negocio: negocioId };
          if (sedePersonalId) { params.sede_id = sedePersonalId; params.sede = sedePersonalId; }
          const [resEmpleados, resRoles, resSedes] = await Promise.all([
            getEmpleados(params), getRoles(), api.get(`/sedes/`, { params: { negocio_id: negocioId } })
          ]);
          setEmpleadosReales(resEmpleados.data);
          setRolesReales(resRoles.data);
          setSedesReales(resSedes.data);
        } catch (error) { console.error("Error cargando personal:", error); }
      };
      cargarDatosPersonal();
    }
  }, [vistaActiva, sedePersonalId]); // 👈 Solo reacciona a su propia memoria

  // Menú
  useEffect(() => {
    if (vistaActiva === 'menu'|| vistaActiva === 'bot_wsp'|| vistaActiva === 'crm') {
      const cargarMenu = async () => {
        try {
          const negocioId = localStorage.getItem('negocio_id');
          const [resProductos, resCategorias, resModificadores] = await Promise.all([
            getProductos({ sede_id: sedeMenuId }), 
            getCategorias(),
            getModificadores({ negocio_id: negocioId })
          ]);
          setProductosReales(resProductos.data);
          setCategorias(resCategorias.data);
          setModificadoresReales(resModificadores.data || []);
        } catch (error) { 
          console.error("Error menú:", error); 
          setModificadoresReales([]);
        }
      };
      cargarMenu();
    }
  }, [vistaActiva, sedeMenuId]); // 👈 Solo reacciona a su propia memoria

  useEffect(() => {
    const cargarConfiguracionGlobal = async () => {
      try {
        const negocioId = localStorage.getItem('negocio_id') || 1;
        const response = await api.get(`/negocios/${negocioId}/`);
        const datosBD = response.data;
        const configData = {
          // Identidad
          ruc: datosBD.ruc || '',
          razon_social: datosBD.razon_social || '',
          logo: datosBD.logo || null,
          // Billeteras
          yape_numero: datosBD.yape_numero || '',
          yape_qr: datosBD.yape_qr || null,
          plin_numero: datosBD.plin_numero || '',
          plin_qr: datosBD.plin_qr || null,
          // Culqi
          usa_culqi: datosBD.usa_culqi || false,
          culqi_public_key: datosBD.culqi_public_key || '',
          culqi_private_key: datosBD.culqi_private_key || '',
          // Módulos
          modSalon: datosBD.mod_salon_activo ?? true,
          modCocina: datosBD.mod_cocina_activo ?? false, modInventario: datosBD.mod_inventario_activo ?? false,
          modDelivery: datosBD.mod_delivery_activo ?? false, modClientes: datosBD.mod_clientes_activo ?? false,
          modFacturacion: datosBD.mod_facturacion_activo ?? false, modCartaQr: datosBD.mod_carta_qr_activo ?? false,
          modBotWsp: datosBD.mod_bot_wsp_activo ?? false, modMl: datosBD.mod_ml_activo ?? false,
          // UI
          colorPrimario: datosBD.color_primario || '#ff5a1f', temaFondo: datosBD.tema_fondo || 'dark',
          permisosPlan: datosBD.plan_detalles || {}
        };
        setConfig(configData);
        setConfigOriginal(JSON.parse(JSON.stringify(configData)));
        setConfiguracionGlobal({
          colorPrimario: configData.colorPrimario, temaFondo: configData.temaFondo,
          yape_numero: configData.yape_numero, yape_qr: configData.yape_qr,
          plin_numero: configData.plin_numero, plin_qr: configData.plin_qr,
          usa_culqi: configData.usa_culqi, culqi_public_key: configData.culqi_public_key,
          modulos: { salon: configData.modSalon, cocina: configData.modCocina, delivery: configData.modDelivery, inventario: configData.modInventario, clientes: configData.modClientes, facturacion: configData.modFacturacion, cartaQr: configData.modCartaQr, botWsp: configData.modBotWsp, machineLearning: configData.modMl }
        });
      } catch (error) { console.error("Error config:", error); }
    };
    cargarConfiguracionGlobal();
  }, [setConfiguracionGlobal]);

  // ==========================================
  // ✨ 3. CALCULADOR DINÁMICO DE ESTADO ACTIVO
  // ==========================================
  // Esta lógica descubre qué vista estás mirando y extrae su ID de memoria
  const getSedeFiltroIdActivo = () => {
    if (vistaActiva === 'dashboard') return sedeVentasId;
    if (vistaActiva === 'personal') return sedePersonalId;
    if (vistaActiva === 'menu') return sedeMenuId;
    return '';
  };

  const sedeFiltroIdActivo = getSedeFiltroIdActivo();
  const sedeObj = sedesReales.find(s => String(s.id) === String(sedeFiltroIdActivo));
  const sedeFiltroActiva = sedeObj ? sedeObj.nombre : 'Todas';

  // ==========================================
  // 4. FUNCIONES DE CONTROL
  // ==========================================
  
  // ✨ ENRUTADOR INTELIGENTE DE SEDES: Guarda la selección en el lugar correcto
  const cambiarSedeFiltro = (valor) => {
    let nuevoId = '';
    
    // Extraer inteligentemente el ID ya sea que nos pasen un objeto, un texto o "Todas"
    if (typeof valor === 'object' && valor !== null) {
      nuevoId = valor.id || '';
    } else if (valor === 'Todas' || valor === '') {
      nuevoId = '';
    } else {
      const sedeEncontrada = sedesReales.find(s => String(s.id) === String(valor) || s.nombre === valor);
      if (sedeEncontrada) nuevoId = sedeEncontrada.id;
      else nuevoId = valor; // Fallback por si la lista aún no carga
    }

    // Inyectar en el cerebro que corresponde a la pantalla actual
    if (vistaActiva === 'dashboard') {
      setSedeVentasId(nuevoId);
      if (nuevoId) localStorage.setItem('memoria_sede_ventas', nuevoId);
      else localStorage.removeItem('memoria_sede_ventas');
    } 
    else if (vistaActiva === 'personal') {
      setSedePersonalId(nuevoId);
      if (nuevoId) localStorage.setItem('memoria_sede_personal', nuevoId);
      else localStorage.removeItem('memoria_sede_personal');
    } 
    else if (vistaActiva === 'menu') {
      setSedeMenuId(nuevoId);
      if (nuevoId) localStorage.setItem('memoria_sede_menu', nuevoId);
      else localStorage.removeItem('memoria_sede_menu');
    }
  };

  const manejarCambioVista = (nuevaVista) => {
    if (vistaActiva === 'config' && hayCambiosPendientes) {
      setVistaPendiente(nuevaVista); setModalCambiosPendientes(true); return;
    }
    if (nuevaVista === 'config') {
      const { qrFile: _qrFile, qrPreview: _qrPreview, ...configSegura } = config;
      setConfigOriginal(JSON.parse(JSON.stringify(configSegura)));
    } else { setConfigOriginal(null); }
    setVistaActiva(nuevaVista); setMenuAbierto(false);
  };

  const descartarCambios = () => {
    setConfig(prev => ({ ...prev, ...configOriginal }));
    setModalCambiosPendientes(false);
    if (vistaPendiente) { setVistaActiva(vistaPendiente); setConfigOriginal(null); setVistaPendiente(null); }
    setMenuAbierto(false);
  };

  const guardarYCambiarVista = async () => {
    await manejarGuardarConfig(); 
    setModalCambiosPendientes(false);
    if (vistaPendiente) { setVistaActiva(vistaPendiente); setConfigOriginal(null); setVistaPendiente(null); }
    setMenuAbierto(false);
  };

  const cancelarCambioVista = () => { setModalCambiosPendientes(false); setVistaPendiente(null); };

  const manejarGuardarConfig = async () => {
    setGuardandoConfig(true);
    try {
      const negocioId = localStorage.getItem('negocio_id'); 
      if (!negocioId) return alert("⚠️ No se encontró ID negocio.");

      const formData = new FormData();

      // Textos (Enviamos strings vacíos si el usuario los borra)
      formData.append('ruc', config.ruc || '');
      formData.append('razon_social', config.razon_social || ''); // 👈 CORREGIDO
      formData.append('yape_numero', config.yape_numero || ''); // 👈 CORREGIDO
      formData.append('plin_numero', config.plin_numero || '');
      formData.append('culqi_public_key', config.culqi_public_key || '');
      formData.append('culqi_private_key', config.culqi_private_key || '');

      // Booleans de Culqi
      formData.append('usa_culqi', config.usa_culqi ? 'True' : 'False');

      // Archivos (Solo se envían si hay un File nuevo)
      if (config.logoFile) formData.append('logo', config.logoFile);
      if (config.yape_qrFile) formData.append('yape_qr', config.yape_qrFile);
      if (config.plin_qrFile) formData.append('plin_qr', config.plin_qrFile);

      // Feature Flags (Módulos)
      formData.append('mod_salon_activo', config.modSalon ? 'True' : 'False');
      formData.append('mod_cocina_activo', config.modCocina ? 'True' : 'False');
      formData.append('mod_inventario_activo', config.modInventario ? 'True' : 'False');
      formData.append('mod_delivery_activo', config.modDelivery ? 'True' : 'False');
      formData.append('mod_clientes_activo', config.modClientes ? 'True' : 'False');
      formData.append('mod_facturacion_activo', config.modFacturacion ? 'True' : 'False');
      formData.append('mod_carta_qr_activo', config.modCartaQr ? 'True' : 'False');
      formData.append('mod_bot_wsp_activo', config.modBotWsp ? 'True' : 'False');
      formData.append('mod_ml_activo', config.modMl ? 'True' : 'False');
      
      if (config.colorPrimario) formData.append('color_primario', config.colorPrimario);
      if (config.temaFondo) formData.append('tema_fondo', config.temaFondo);

      await api.patch(`/negocios/${negocioId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setConfiguracionGlobal({
        colorPrimario: config.colorPrimario, temaFondo: config.temaFondo,
        yape_numero: config.yape_numero, yape_qr: config.yape_qrPreview || config.yape_qr, // 👈 Pasa el preview si recién lo subió
        plin_numero: config.plin_numero, plin_qr: config.plin_qrPreview || config.plin_qr,
        usa_culqi: config.usa_culqi, culqi_public_key: config.culqi_public_key,
        modulos: { salon: config.modSalon, cocina: config.modCocina, delivery: config.modDelivery, inventario: config.modInventario, clientes: config.modClientes, facturacion: config.modFacturacion, cartaQr: config.modCartaQr, botWsp: config.modBotWsp, machineLearning: config.modMl }
      });

      // Limpieza del estado original sin crashear por los Files
      const { logoFile: _l, yape_qrFile: _y, plin_qrFile: _p, logoPreview: _lp, yape_qrPreview: _yqp, plin_qrPreview: _pqp, ...configSegura } = config;
      setConfigOriginal(JSON.parse(JSON.stringify(configSegura)));
      
      alert("✅ ¡Configuración e imágenes guardadas!");
    } catch (error) { 
      console.error(error);
      alert("❌ Error al guardar. Verifica la consola."); 
    } finally { 
      setGuardandoConfig(false); 
    }
  };

  const abrirModalEdicion = (emp) => {
    setFormEmpleado({ id: emp.id, nombre: emp.nombre, pin: '', rol: emp.rol, sede: emp.sede });
    setModalEmpleado(true);
  };

  const toggleActivo = async (emp) => {
    if (!window.confirm(`¿Seguro?`)) return;
    try {
      await actualizarEmpleado(emp.id, { activo: !emp.activo });
      setEmpleadosReales(prev => prev.map(e => e.id === emp.id ? { ...e, activo: !emp.activo } : e));
    } catch (error) { alert("Error de conexión."); }
  };

  const manejarGuardarEmpleado = async () => {
    const esCreacion = !formEmpleado.id;
    if (!formEmpleado.nombre || (esCreacion && formEmpleado.pin.length !== 4)) return alert("Revisa los datos.");
    try {
      const negocioId = parseInt(localStorage.getItem('negocio_id') || 1);
      const sedeSel = formEmpleado.sede ? parseInt(formEmpleado.sede) : null;
      const rolSel = formEmpleado.rol ? parseInt(formEmpleado.rol) : null;
      const payload = { negocio: negocioId, negocio_id: negocioId, nombre: formEmpleado.nombre, rol: rolSel, rol_id: rolSel, sede: sedeSel, sede_id: sedeSel };
      if (!esCreacion && formEmpleado.pin && formEmpleado.pin.length === 4) payload.pin = formEmpleado.pin; 
      else if (esCreacion) { payload.pin = formEmpleado.pin; payload.activo = true; }

      if (esCreacion) await crearEmpleado(payload); else await actualizarEmpleado(formEmpleado.id, payload);
      setModalEmpleado(false);
      setFormEmpleado({ id: null, nombre: '', pin: '', rol: rolesReales[0]?.id || '', sede: sedesReales[0]?.id || '' });
      const resEmpleados = await getEmpleados({ negocio_id: negocioId, sede_id: sedeFiltroIdActivo });
      setEmpleadosReales(resEmpleados.data);
    } catch (error) { alert("❌ Hubo un error."); }
  };

  const manejarGuardarPlato = async () => {
    if (!formPlato.nombre) return alert("Obligatorio.");
    const negocioId = localStorage.getItem('negocio_id') || 1;
    const gruposLimpios = formPlato.grupos_variacion.map(g => ({ ...g, opciones: g.opciones.map(o => ({ ...o, precio_adicional: o.precio_adicional || "0.00" })) }));
    const payload = { negocio: negocioId, nombre: formPlato.nombre, precio_base: formPlato.precio_base || "0.00", es_venta_rapida: formPlato.es_venta_rapida, requiere_seleccion: formPlato.requiere_seleccion, tiene_variaciones: formPlato.tiene_variaciones, disponible: formPlato.disponible, categoria: formPlato.categoria_id || null, grupos_variacion: gruposLimpios };
    try {
      if (formPlato.id) await actualizarProducto(formPlato.id, payload); else await crearProducto(payload);
      setModalPlato(false); setPasoModal(1);
      const res = await getProductos({ sede_id: sedeFiltroIdActivo });
      setProductosReales(res.data);
      alert("✅ Guardado");
    } catch (error) { alert("Error al guardar."); }
  };

  const manejarCrearCategoria = async () => {
    if (!nombreNuevaCat.trim()) return;
    try {
      const res = await crearCategoria({ nombre: nombreNuevaCat, negocio: localStorage.getItem('negocio_id') || 1, orden: 0, activo: true });
      setCategorias([...categorias, res.data]); setNombreNuevaCat('');
    } catch (error) { alert("Error al crear categoría."); }
  };

  const eliminarCategoriaLocal = async (id) => {
    if(!window.confirm("¿Seguro?")) return;
    try { await parchearCategoria(id, { activo: false }); setCategorias(categorias.filter(c => c.id !== id)); } catch (error) { }
  };

  const toggleDisponibilidad = async (plato) => {
    try {
      await parchearProducto(plato.id, { disponible: !plato.disponible });
      setProductosReales(prev => prev.map(p => p.id === plato.id ? { ...p, disponible: !p.disponible } : p));
    } catch (error) { alert("Error al cambiar estado."); }
  };

  const abrirModalEditar = (plato) => {
    const grp = plato.grupos_variacion ? plato.grupos_variacion.map(g => ({ ...g, opciones: g.opciones ? g.opciones.map(o => ({ id: o.id, nombre: o.nombre, precio_adicional: o.precio_adicional })) : [] })) : [];
    setFormPlato({ id: plato.id, nombre: plato.nombre, precio_base: plato.precio_base, categoria_id: plato.categoria || '', es_venta_rapida: plato.es_venta_rapida || false, requiere_seleccion: plato.requiere_seleccion || false, tiene_variaciones: plato.tiene_variaciones || false, disponible: plato.disponible, grupos_variacion: grp });
    setPasoModal(1); setModalPlato(true);
  };

  const cerrarModalPlato = () => {
    setModalPlato(false); setPasoModal(1);
    setFormPlato({ id: null, nombre: '', precio_base: '', categoria_id: '', es_venta_rapida: false, requiere_seleccion: false, tiene_variaciones: false, disponible: true, grupos_variacion: [] });
  };

  // ==========================================
  // 4. RETORNAMOS TODO AL COMPONENTE VISUAL
  // ==========================================
  return {
    tema, colorPrimario, config, setConfig, vistaActiva, setVistaActiva, 
    
    // ✨ INYECCIÓN DINÁMICA: Los componentes reciben lo que el cerebro determine
    sedeFiltro: sedeFiltroActiva, 
    sedeFiltroId: sedeFiltroIdActivo, 
    setSedeFiltroId: cambiarSedeFiltro, 
    setSedeFiltro: cambiarSedeFiltro,
    menuAbierto, setMenuAbierto,
    isCollapsed, setIsCollapsed,
    modalEmpleado, setModalEmpleado, modalVariacionesOpen, setModalVariacionesOpen,
    productoParaVariaciones, setProductoParaVariaciones, categorias, setCategorias,
    guardandoConfig, setGuardandoConfig, productosReales, setProductosReales,
    modalPlato, setModalPlato, pasoModal, setPasoModal, formPlato, setFormPlato,
    empleadosReales, setEmpleadosReales, rolesReales, setRolesReales, sedesReales, setSedesReales,
    formEmpleado, setFormEmpleado, metricas, setMetricas, modalCategorias, setModalCategorias,
    nombreNuevaCat, setNombreNuevaCat, modalRecetaOpen, setModalRecetaOpen,
    productoParaReceta, setProductoParaReceta, modalCambiosPendientes, rolesFiltrados,ordenesReales,
    modificadoresReales, setModificadoresReales,
    
    cambiarSedeFiltro, manejarCambioVista, descartarCambios, guardarYCambiarVista,
    cancelarCambioVista, manejarGuardarConfig, abrirModalEdicion, toggleActivo,
    manejarGuardarEmpleado, manejarGuardarPlato, manejarCrearCategoria,
    eliminarCategoriaLocal, toggleDisponibilidad, abrirModalEditar, cerrarModalPlato,recargarSedes
  };
};