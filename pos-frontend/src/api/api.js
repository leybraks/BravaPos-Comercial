import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_URL,
});

// ==========================================
// EL INTERCEPTOR: El "pegamento" de seguridad
// ==========================================
api.interceptors.request.use(
  (config) => {
    // Busca el token en la memoria de la tablet
    const token = localStorage.getItem('access_token');
    if (token) {
      // Si existe, lo pega en la cabecera de la petición
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// TUS FUNCIONES (ENDPOINTS)
// ==========================================

// 1. Nueva función para pedir la pulsera VIP (Login)
export const loginAdministrador = (credenciales) => api.post('/token/', credenciales);

// 2. Las funciones que ya tenías (ahora protegidas automáticamente)
export const getProductos = () => api.get('/productos/');
export const getMesas = () => api.get('/mesas/');
export const crearOrden = (ordenData) => api.post('/ordenes/', ordenData);
export const getOrdenes = () => api.get('/ordenes/');
export const actualizarOrden = (id, data) => api.patch(`/ordenes/${id}/`, data);
// Si luego necesitas más, las vas agregando aquí:
// export const getCategorias = () => api.get('/categorias/');
// Agrega esto junto a tus otras funciones como crearOrden o actualizarOrden
export const crearPago = (pagoData) => {
  return api.post('/pagos/', pagoData); // <-- Usa 'api' (o el nombre de tu instancia) aquí
};
export const actualizarMesa = (id, data) => {
  return api.patch(`/mesas/${id}/`, data); // Ojo: usa 'api', 'axios' o tu instancia configurada
};
export const getEstadoCaja = () => axios.get(`${API_URL}/sesiones_caja/estado_actual/`);
export const abrirCajaBD = (payload) => axios.post(`${API_URL}/sesiones_caja/abrir_caja/`, payload);
export const agregarProductosAOrden = (idOrden, payload) => api.post(`${API_URL}/ordenes/${idOrden}/agregar_productos/`, payload);
// Agrega esto junto a tus otras funciones:
export const cerrarCaja = (data) => api.post('/sesiones_caja/cerrar_caja/', data);
export const validarPinEmpleado = (payload) => axios.post(`${API_URL}/empleados/validar_pin/`, payload);
export default api;