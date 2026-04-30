// ============================================================
// CONSTANTES DE LA CARTA QR
// ============================================================

export const FUENTES = [
  { id: 'playfair', label: 'Playfair Display', familia: "'Playfair Display', serif",  preview: 'Sabor Clásico'   },
  { id: 'poppins',  label: 'Poppins',          familia: "'Poppins', sans-serif",       preview: 'Sabor Moderno'   },
  { id: 'lora',     label: 'Lora',             familia: "'Lora', serif",              preview: 'Sabor Artesanal' },
  { id: 'oswald',   label: 'Oswald',           familia: "'Oswald', sans-serif",        preview: 'Sabor Bold'      },
  { id: 'dancing',  label: 'Dancing Script',   familia: "'Dancing Script', cursive",  preview: 'Sabor Creativo'  },
];

export const FONDOS_PRESET = [
  { id: 'negro',   label: 'Noche',   color: '#080808' },
  { id: 'crema',   label: 'Crema',   color: '#faf6f0' },
  { id: 'pizarra', label: 'Pizarra', color: '#1c1f26' },
  { id: 'vino',    label: 'Vino',    color: '#1a0a0a' },
  { id: 'oliva',   label: 'Oliva',   color: '#0f1a0d' },
  { id: 'custom',  label: 'Custom',  color: null      },
];

export const ESTILOS_TARJETA = [
  { id: 'minimal', label: 'Minimal', desc: 'Limpio, precio destacado'  },
  { id: 'gourmet', label: 'Gourmet', desc: 'Separadores elegantes'     },
  { id: 'bistro',  label: 'Bistro',  desc: 'Línea izquierda de acento' },
  { id: 'moderno', label: 'Moderno', desc: 'Badge grande, sin bordes'  },
];

export const COLORES_ACENTO = [
  '#ff5a1f', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#ef4444', '#e2c97e',
];

export const PLATOS_MOCK = [
  { nombre: 'Tagliatelle al Tartufo', precio: '38.00', desc: 'Pasta fresca, trufa negra y parmesano', popular: true  },
  { nombre: 'Carbonara Clásica',      precio: '29.00', desc: 'Guanciale, pecorino y pimienta negra',  popular: false },
];

export const TABS_EDITOR = [
  { id: 'identidad',  icon: 'fi-rr-id-badge',   label: 'Identidad'  },
  { id: 'fondo',      icon: 'fi-rr-picture',     label: 'Fondo'      },
  { id: 'tipografia', icon: 'fi-rr-text',        label: 'Tipografía' },
  { id: 'tarjetas',   icon: 'fi-rr-apps',        label: 'Platos'     },
];

export const TIPOS_PRESENTACION = [
  { id: 'modelo_1', label: 'App Delivery', desc: 'Estilo UberEats: limpio, lista vertical', icon: 'fi-rr-motorcycle' },
  { id: 'modelo_2', label: 'Cafetería',    desc: 'Estilo Starbucks: elegante, fotos grandes', icon: 'fi-rr-coffee' },
  { id: 'modelo_3', label: 'Fast Food',    desc: 'Estilo KFC: impactante, cuadrícula', icon: 'fi-rr-flame' },
];