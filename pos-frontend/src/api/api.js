import axios from 'axios';
const apiUrl = import.meta.env.VITE_API_URL;
const API_URL = `${apiUrl}/api`;

const api = axios.create({
  baseURL: API_URL,
});

// ==========================================
// ✨ 1. EL INTERCEPTOR INTELIGENTE (Mejorado para el ERP)
// ==========================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tablet_token');
    const empleadoId = localStorage.getItem('empleado_id');
    const sedeIdSesion = localStorage.getItem('sede_id');

    // 1. Pase VIP
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; 
    }
    
    // 2. Firma del Empleado
    if (empleadoId) {
      config.headers['X-Empleado-ID'] = empleadoId; 
    }

    // 3. Inyección automática para GETs (Respetando los parámetros manuales)
    // Verificamos si la URL o los parámetros ya incluyen la sede
    const tieneSedeEnUrl = config.url.includes('sede_id=') || config.url.includes('sede=');
    const tieneSedeEnParams = config.params?.sede_id || config.params?.sede;

    // Solo inyectamos si NO hay sede, NO hay parámetros y NO es una ruta global
    if (sedeIdSesion && config.method === 'get' && !tieneSedeEnUrl && !tieneSedeEnParams && !config.url.includes('negocios')) {
       const separador = config.url.includes('?') ? '&' : '?';
       config.url = `${config.url}${separador}sede_id=${sedeIdSesion}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// ✨ 2. LECTORES DINÁMICOS DE MEMORIA
// ==========================================
const getSedeId = () => localStorage.getItem('sede_id');
const getNegocioId = () => localStorage.getItem('negocio_id');

// ==========================================
// ✨ 3. TUS ENDPOINTS (100% Dinámicos)
// ==========================================

// --- LOGIN INICIAL DE LA TABLET ---
export const loginAdministrador = (credenciales) => axios.post(`${API_URL}/login-admin/`, credenciales);

// --- CAJA Y LOGIN DE EMPLEADOS ---
export const validarPinEmpleado = (payload) => api.post(`/empleados/validar_pin/`, { ...payload, sede_id: getSedeId() });
export const getEstadoCaja = (params) => api.get(`/sesiones_caja/estado_actual/`, { params });
export const abrirCajaBD = (payload) => api.post(`/sesiones_caja/abrir_caja/`, { ...payload, sede_id: getSedeId() });
export const cerrarCaja = (data) => api.post('/sesiones_caja/cerrar_caja/', { ...data, sede_id: getSedeId() });

// --- VISTAS PRINCIPALES ---
// 🚀 LIBERADOS: Ahora aceptan 'params' y ya no tienen la sede hardcodeada en el string
export const getProductos = (params) => api.get(`/productos/`, { params });
export const getMesas = (params) => api.get(`/mesas/`, { params });
export const getOrdenes = (params) => api.get(`/ordenes/`, { params });

// --- OPERACIONES CON ORDEN Y MESA ---
export const crearOrden = (ordenData) => api.post('/ordenes/', ordenData);
export const actualizarOrden = (id, data) => api.patch(`/ordenes/${id}/`, data);
export const agregarProductosAOrden = (idOrden, payload) => api.post(`/ordenes/${idOrden}/agregar_productos/`, payload);
export const actualizarMesa = (id, data) => api.patch(`/mesas/${id}/`, data);
export const crearPago = (pagoData) => api.post('/pagos/', pagoData);

// --- DASHBOARD Y CONFIGURACIÓN ---
export const obtenerMetricasDashboard = (params) => api.get(`/dashboard/metricas/`, { params });
export const getNegocioConfig = (params) => api.get(`/negocio/configuracion/`, { params });
export const updateNegocioConfig = (data) => api.put(`/negocio/configuracion/?negocio_id=${getNegocioId()}`, data);

// --- OTROS (Admin / Empleados) ---
export const getEmpleados = (params) => api.get(`/empleados/`, { params });
export const getRoles = (params) => api.get('/roles/', { params });
export const getSedes = (params) => api.get('/sedes/', { params });
export const crearEmpleado = (data) => api.post('/empleados/', data);
export const crearProducto = (data) => api.post('/productos/', data);
export const actualizarProducto = (id, data) => api.put(`/productos/${id}/`, data);
export const parchearProducto = (id, data) => api.patch(`/productos/${id}/`, data);
export const registrarMovimientoCaja = (data) => api.post('/movimientos-caja/', data);
export const getCategorias = (params) => api.get('/categorias/', { params }); 
export const crearCategoria = (data) => api.post('/categorias/', data);
export const parchearCategoria = (id, data) => api.patch(`/categorias/${id}/`, data);
export const actualizarNegocio = (id, data) => api.patch(`/negocios/${id}/`, data);
export const getNegocio = (id) => api.get(`/negocios/${id}/`);
export const actualizarEmpleado = (id, data) => api.patch(`/empleados/${id}/`, data);
export const crearMesa = (data) => api.post('/mesas/', data);
export const actualizarSede = (id, data) => api.patch(`/sedes/${id}/`, data);
export const getModificadores = (params) => api.get('/modificadores-rapidos/', { params });
export const getInsumos = (params) => api.get('/insumos/', { params });
export const registrarCompraInsumo = (data) => api.post('/insumos/registrar_compra/', data);
export const getRecetas = (productoId) => api.get(`/productos/${productoId}/receta/`);

// 🌍 Para el Dueño (Catálogo Global)
export const getCatalogoGlobal = (params) => api.get('/insumo-base/', { params });
export const crearInsumoBase = (data) => api.post('/insumo-base/', data);
export const registrarIngresoMasivo = (data) => api.post('/insumo-sede/ingreso_masivo/', data);

// 📍 Para el Local (Stock Físico)
export const getInsumosSede = (params) => api.get('/insumo-sede/', { params });
export const vincularInsumoASede = (data) => api.post('/insumo-sede/', data);
export const guardarReceta = async (productoId, datosReceta) => {
    return await api.post(`/productos/${productoId}/configurar_receta/`, datosReceta);
};
export const getReceta = async (productoId) => {
    return await api.get(`/productos/${productoId}/obtener_receta/`);
};

export const actualizarVariacionesProducto = async (productoId, gruposData) => {
    // Usamos PATCH para actualizar solo la parte de las variaciones sin tocar el nombre o el precio base
    return await api.patch(`/productos/${productoId}/`, { grupos_variacion: gruposData });
};
export const anularItemDeOrden = (idOrden, payload) => api.post(`/ordenes/${idOrden}/anular_item/`, payload);

// ==========================================
// 🌐 ENDPOINTS PÚBLICOS (Sin token - Carta QR)
// ==========================================
// Usamos axios directo (sin interceptor) para no adjuntar el token
const apiPublica = axios.create({ baseURL: API_URL });

export const getMenuPublico = (sedeId) => apiPublica.get(`/menu-publico/${sedeId}/`);
export const getOrdenPublica = (sedeId, mesaId) => apiPublica.get(`/orden-publica/${sedeId}/${mesaId}/`);

export default api;