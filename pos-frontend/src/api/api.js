import axios from 'axios';

const API_URL = 'http://163.176.135.213:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

// ==========================================
// ✨ 1. EL INTERCEPTOR INTELIGENTE
// ==========================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tablet_token');
    const empleadoId = localStorage.getItem('empleado_id');
    const sedeId = localStorage.getItem('sede_id');

    // 1. Pase VIP
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    
    // 2. Firma del Empleado
    if (empleadoId) {
      config.headers['X-Empleado-ID'] = empleadoId; 
    }

    // 3. Inyección automática para GETs
    if (sedeId && config.method === 'get' && !config.url.includes('sede_id')) {
       const separador = config.url.includes('?') ? '&' : '?';
       config.url = `${config.url}${separador}sede_id=${sedeId}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// ✨ 2. LECTORES DINÁMICOS DE MEMORIA
// ==========================================
// Leen la memoria exactamente en el momento del click
const getSedeId = () => localStorage.getItem('sede_id');
const getNegocioId = () => localStorage.getItem('negocio_id');

// ==========================================
// ✨ 3. TUS ENDPOINTS (100% Dinámicos)
// ==========================================

// --- LOGIN INICIAL DE LA TABLET ---
export const loginAdministrador = (credenciales) => axios.post(`${API_URL}/login-tablet/`, credenciales);

// --- CAJA Y LOGIN DE EMPLEADOS ---
// Inyectamos la sede dinámicamente en el payload (cuerpo) de los POST
export const validarPinEmpleado = (payload) => api.post(`/empleados/validar_pin/`, { ...payload, sede_id: getSedeId() });
export const getEstadoCaja = () => api.get(`/sesiones_caja/estado_actual/?sede_id=${getSedeId()}`);
export const abrirCajaBD = (payload) => api.post(`/sesiones_caja/abrir_caja/`, { ...payload, sede_id: getSedeId() });
export const cerrarCaja = (data) => api.post('/sesiones_caja/cerrar_caja/', { ...data, sede_id: getSedeId() });

// --- VISTAS PRINCIPALES ---
export const getProductos = () => api.get(`/productos/?negocio_id=${getNegocioId()}`);
export const getMesas = () => api.get(`/mesas/?sede_id=${getSedeId()}`);
export const getOrdenes = () => api.get(`/ordenes/?sede_id=${getSedeId()}`);

// --- OPERACIONES CON ORDEN Y MESA ---
export const crearOrden = (ordenData) => api.post('/ordenes/', ordenData);
export const actualizarOrden = (id, data) => api.patch(`/ordenes/${id}/`, data);
export const agregarProductosAOrden = (idOrden, payload) => api.post(`/ordenes/${idOrden}/agregar_productos/`, payload);
export const actualizarMesa = (id, data) => api.patch(`/mesas/${id}/`, data);
export const crearPago = (pagoData) => api.post('/pagos/', pagoData);

// --- DASHBOARD Y CONFIGURACIÓN ---
export const obtenerMetricasDashboard = () => api.get(`/dashboard/metricas/?sede_id=${getSedeId()}`);
export const getNegocioConfig = () => api.get(`/negocio/configuracion/?negocio_id=${getNegocioId()}`);
export const updateNegocioConfig = (data) => api.put(`/negocio/configuracion/?negocio_id=${getNegocioId()}`, data);

// --- OTROS (Admin / Empleados) ---
export const getEmpleados = () => api.get(`/empleados/?sede_id=${getSedeId()}`);
export const getRoles = () => api.get('/roles/');
export const getSedes = () => api.get('/sedes/');
export const crearEmpleado = (data) => api.post('/empleados/', data);
export const crearProducto = (data) => api.post('/productos/', data);
export const actualizarProducto = (id, data) => api.put(`/productos/${id}/`, data);

export default api;