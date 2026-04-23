import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;
const API_URL = `${apiUrl}/api`;

// ============================================================
// INSTANCIA PRINCIPAL (con interceptores)
// ============================================================
const api = axios.create({ baseURL: API_URL });

// ============================================================
// INSTANCIA PÚBLICA (sin token — para carta QR)
// ============================================================
const apiPublica = axios.create({ baseURL: API_URL });

// ============================================================
// HELPERS DE STORAGE
// ============================================================
const getToken        = () => localStorage.getItem('tablet_token');
const getRefreshToken = () => localStorage.getItem('tablet_refresh_token');
const getEmpleadoId   = () => localStorage.getItem('empleado_id');
const getSedeId       = () => localStorage.getItem('sede_id');
const getNegocioId    = () => localStorage.getItem('negocio_id');

/** Guarda ambos tokens tras el login del dueño */
export const guardarTokens = (access, refresh) => {
  localStorage.setItem('tablet_token', access);
  localStorage.setItem('tablet_refresh_token', refresh);
};

/** Limpia todo y redirige al login */
const cerrarSesionGlobal = () => {
  localStorage.clear();
  window.location.href = '/';
};

// ============================================================
// INTERCEPTOR DE REQUEST — adjunta token, empleado y sede
// ============================================================
api.interceptors.request.use(
  (config) => {
    const token       = getToken();
    const empleadoId  = getEmpleadoId();
    const sedeIdSesion = getSedeId();

    // 1. Token JWT
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Header de empleado activo
    if (empleadoId) {
      config.headers['X-Empleado-ID'] = empleadoId;
    }

    // 3. Inyección automática de sede en GETs (solo si no viene ya)
    const tieneSedeEnUrl    = config.url.includes('sede_id=') || config.url.includes('sede=');
    const tieneSedeEnParams = config.params?.sede_id || config.params?.sede;
    const esRutaGlobal      = config.url.includes('negocios');

    if (
      sedeIdSesion &&
      config.method === 'get' &&
      !tieneSedeEnUrl &&
      !tieneSedeEnParams &&
      !esRutaGlobal
    ) {
      const sep = config.url.includes('?') ? '&' : '?';
      config.url = `${config.url}${sep}sede_id=${sedeIdSesion}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// INTERCEPTOR DE RESPONSE — refresco automático de token
// ============================================================
let estaRefrescando = false;
let colaDeEspera    = [];   // Requests que esperan el nuevo token

const procesarCola = (error, nuevoToken = null) => {
  colaDeEspera.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(nuevoToken);
  });
  colaDeEspera = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestOriginal = error.config;

    // Solo actúa en errores 401 que NO sean del propio endpoint de refresh
    if (
      error.response?.status === 401 &&
      !requestOriginal._yaReintento &&
      !requestOriginal.url?.includes('token/refresh')
    ) {
      requestOriginal._yaReintento = true;

      // Si ya hay un refresh en curso, encola este request
      if (estaRefrescando) {
        return new Promise((resolve, reject) => {
          colaDeEspera.push({ resolve, reject });
        }).then((nuevoToken) => {
          requestOriginal.headers.Authorization = `Bearer ${nuevoToken}`;
          return api(requestOriginal);
        });
      }

      estaRefrescando = true;
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        // Sin refresh token → el dueño debe loguearse de nuevo
        cerrarSesionGlobal();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/token/refresh/`, {
          refresh: refreshToken,
        });

        const nuevoAccess = data.access;
        localStorage.setItem('tablet_token', nuevoAccess);

        // Si Django Rotation está activo, también actualiza el refresh
        if (data.refresh) {
          localStorage.setItem('tablet_refresh_token', data.refresh);
        }

        procesarCola(null, nuevoAccess);

        // Reintenta el request original
        requestOriginal.headers.Authorization = `Bearer ${nuevoAccess}`;
        return api(requestOriginal);

      } catch (errorRefresh) {
        procesarCola(errorRefresh, null);
        cerrarSesionGlobal();
        return Promise.reject(errorRefresh);

      } finally {
        estaRefrescando = false;
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// LOGIN DEL DUEÑO (usa axios directo, sin interceptor de token)
// ============================================================
export const loginAdministrador = async (credenciales) => {
  const res = await axios.post(`${API_URL}/login-admin/`, credenciales);
  // Guardamos access + refresh automáticamente
  guardarTokens(res.data.access, res.data.refresh);
  return res;
};

// ============================================================
// CAJA Y LOGIN DE EMPLEADOS
// ============================================================
export const validarPinEmpleado      = (payload)  => api.post(`/empleados/validar_pin/`, { ...payload, sede_id: getSedeId() });
export const getEstadoCaja           = (params)   => api.get(`/sesiones_caja/estado_actual/`, { params });
export const abrirCajaBD             = (payload)  => api.post(`/sesiones_caja/abrir_caja/`, { ...payload, sede_id: getSedeId() });
export const cerrarCaja              = (data)     => api.post('/sesiones_caja/cerrar_caja/', { ...data, sede_id: getSedeId() });

// ============================================================
// VISTAS PRINCIPALES
// ============================================================
export const getProductos  = (params) => api.get(`/productos/`, { params });
export const getMesas      = (params) => api.get(`/mesas/`, { params });
export const getOrdenes    = (params) => api.get(`/ordenes/`, { params });

// ============================================================
// OPERACIONES CON ORDEN Y MESA
// ============================================================
export const crearOrden              = (ordenData)        => api.post('/ordenes/', ordenData);
export const actualizarOrden         = (id, data)         => api.patch(`/ordenes/${id}/`, data);
export const agregarProductosAOrden  = (idOrden, payload) => api.post(`/ordenes/${idOrden}/agregar_productos/`, payload);
export const actualizarMesa          = (id, data)         => api.patch(`/mesas/${id}/`, data);
export const crearPago               = (pagoData)         => api.post('/pagos/', pagoData);
export const anularItemDeOrden       = (idOrden, payload) => api.post(`/ordenes/${idOrden}/anular_item/`, payload);

// ============================================================
// DASHBOARD Y CONFIGURACIÓN
// ============================================================
export const obtenerMetricasDashboard = (params) => api.get(`/dashboard/metricas/`, { params });
export const getNegocioConfig         = (params) => api.get(`/negocio/configuracion/`, { params });
export const updateNegocioConfig      = (data)   => api.put(`/negocio/configuracion/?negocio_id=${getNegocioId()}`, data);

// ============================================================
// EMPLEADOS, ROLES Y SEDES
// ============================================================
export const getEmpleados    = (params)    => api.get(`/empleados/`, { params });
export const crearEmpleado   = (data)      => api.post('/empleados/', data);
export const actualizarEmpleado = (id, data) => api.patch(`/empleados/${id}/`, data);
export const getRoles        = (params)    => api.get('/roles/', { params });
export const getSedes        = (params)    => api.get('/sedes/', { params });
export const actualizarSede  = (id, data)  => api.patch(`/sedes/${id}/`, data);

// ============================================================
// PRODUCTOS Y CATEGORÍAS
// ============================================================
export const crearProducto           = (data)         => api.post('/productos/', data);
export const actualizarProducto      = (id, data)     => api.put(`/productos/${id}/`, data);
export const parchearProducto        = (id, data)     => api.patch(`/productos/${id}/`, data);
export const getCategorias           = (params)       => api.get('/categorias/', { params });
export const crearCategoria          = (data)         => api.post('/categorias/', data);
export const parchearCategoria       = (id, data)     => api.patch(`/categorias/${id}/`, data);
export const getModificadores        = (params)       => api.get('/modificadores-rapidos/', { params });
export const actualizarVariacionesProducto = (productoId, gruposData) =>
  api.patch(`/productos/${productoId}/`, { grupos_variacion: gruposData });

// ============================================================
// NEGOCIO
// ============================================================
export const getNegocio        = (id)      => api.get(`/negocios/${id}/`);
export const actualizarNegocio = (id, data) => api.patch(`/negocios/${id}/`, data);

// ============================================================
// MESAS
// ============================================================
export const crearMesa = (data) => api.post('/mesas/', data);

// ============================================================
// CAJA — MOVIMIENTOS
// ============================================================
export const registrarMovimientoCaja = (data) => api.post('/movimientos-caja/', data);

// ============================================================
// INSUMOS Y RECETAS
// ============================================================
export const getInsumos              = (params)       => api.get('/insumos/', { params });
export const registrarCompraInsumo   = (data)         => api.post('/insumos/registrar_compra/', data);
export const getRecetas              = (productoId)   => api.get(`/productos/${productoId}/receta/`);
export const guardarReceta           = (productoId, datosReceta) =>
  api.post(`/productos/${productoId}/configurar_receta/`, datosReceta);
export const getReceta               = (productoId)   =>
  api.get(`/productos/${productoId}/obtener_receta/`);

// ============================================================
// CATÁLOGO GLOBAL (para el Dueño)
// ============================================================
export const getCatalogoGlobal       = (params) => api.get('/insumo-base/', { params });
export const crearInsumoBase         = (data)   => api.post('/insumo-base/', data);
export const registrarIngresoMasivo  = (data)   => api.post('/insumo-sede/ingreso_masivo/', data);

// ============================================================
// STOCK FÍSICO POR SEDE
// ============================================================
export const getInsumosSede      = (params) => api.get('/insumo-sede/', { params });
export const vincularInsumoASede = (data)   => api.post('/insumo-sede/', data);

// ============================================================
// ENDPOINTS PÚBLICOS — Carta QR (sin token)
// ============================================================
export const getMenuPublico   = (sedeId)           => apiPublica.get(`/menu-publico/${sedeId}/`);
export const getOrdenPublica  = (sedeId, mesaId)   => apiPublica.get(`/orden-publica/${sedeId}/${mesaId}/`);

export default api;