import { create } from 'zustand';

const usePosStore = create((set, get) => ({
  // ==========================================
  // ⚙️ 0. CONFIGURACIÓN GLOBAL (EL CEREBRO DEL SAAS)
  // ==========================================
  configuracionGlobal: {
    // Apariencia
    colorPrimario: '#ff5a1f', 
    temaFondo: 'dark',
    numeroYape: '',
    
    // Módulos Básicos
    modulos: {
      salon: true,       // Mapa de mesas
      cocina: false,     // KDS
      delivery: false,   // Pestaña Para Llevar/Delivery
      inventario: false, // Control de stock
      clientes: false,   // CRM
      facturacion: false,// Boletas Sunat
      
      // 🚀 MÓDULOS AVANZADOS (Planes Premium)
      cartaQr: false,    // Menú QR + Cuenta en Vivo
      botWsp: false,     // Pedidos automáticos por WhatsApp
      machineLearning: false // Sugerencias inteligentes (Próximamente)
    }
  },

  // Acción para sobrescribir la configuración completa al hacer Login o recargar
  setConfiguracionGlobal: (nuevaConfig) => set({ configuracionGlobal: nuevaConfig }),


  // ==========================================
  // 🛒 1. ESTADO DE OPERACIÓN (CAJA Y CARRITO)
  // ==========================================
  carrito: [],
  estadoCaja: 'abierto', // Para controlar el bloqueo de pantalla si el turno cierra

  setEstadoCaja: (nuevoEstado) => set({ estadoCaja: nuevoEstado }),

  // ==========================================
  // 🍔 2. ACCIONES DEL CARRITO (Toda tu lógica intacta)
  // ==========================================
  sumarUnidad: (identificadorUnique) => set((state) => {
    const nuevoCarrito = state.carrito.map(item => {
      if (item.cart_id === identificadorUnique) {
        return { ...item, cantidad: item.cantidad + 1 }; 
      }
      return item;
    });
    return { carrito: nuevoCarrito };
  }),

  agregarProducto: (producto) => set((state) => {
    const notas = (producto.notas_cocina || producto.notas || '').trim();
    const opciones = producto.opciones_seleccionadas ? JSON.stringify(producto.opciones_seleccionadas) : '';

    let cartIdUnico = producto.cart_id; 

    if (!cartIdUnico) {
      if (notas === '' && (opciones === '' || opciones === '[]')) {
        cartIdUnico = `base_${producto.id}`;
      } else {
        cartIdUnico = `mod_${producto.id}_${notas}_${opciones}`;
      }
    }
    
    const existeIndex = state.carrito.findIndex(item => item.cart_id === cartIdUnico);
    
    if (existeIndex !== -1) {
      const nuevoCarrito = [...state.carrito];
      nuevoCarrito[existeIndex] = { 
          ...nuevoCarrito[existeIndex], 
          cantidad: nuevoCarrito[existeIndex].cantidad + (producto.cantidad || 1) 
      };
      return { carrito: nuevoCarrito };
    } else {
      return { 
        carrito: [...state.carrito, { 
            ...producto, 
            cart_id: cartIdUnico, 
            cantidad: producto.cantidad || 1, 
            notas_cocina: notas 
        }] 
      };
    }
  }),

  sumarProductoDirecto: (productoId) => set((state) => {
      const existeIndex = state.carrito.findIndex(item => item.id === productoId);
      if (existeIndex !== -1) {
          const nuevoCarrito = [...state.carrito];
          nuevoCarrito[existeIndex].cantidad += 1;
          return { carrito: nuevoCarrito };
      }
      return state; 
  }),

  restarDesdeGrid: (productoId) => set((state) => {
    let indexARestar = state.carrito.findIndex(item => item.cart_id === `base_${productoId}`);
    if (indexARestar === -1) {
        indexARestar = state.carrito.findLastIndex(item => item.id === productoId);
    }
    if (indexARestar === -1) return state;

    const nuevoCarrito = [...state.carrito];
    const itemActual = { ...nuevoCarrito[indexARestar] };

    if (itemActual.cantidad > 1) {
        itemActual.cantidad -= 1;
        nuevoCarrito[indexARestar] = itemActual;
    } else {
        nuevoCarrito.splice(indexARestar, 1);
    }
    return { carrito: nuevoCarrito };
  }),

  restarProducto: (identificadorUnique) => set((state) => {
    const nuevoCarrito = state.carrito.map(item => {
      if (item.cart_id === identificadorUnique) {
        return { ...item, cantidad: item.cantidad - 1 };
      }
      return item;
    }).filter(item => item.cantidad > 0);
    return { carrito: nuevoCarrito };
  }),

  actualizarItemCompleto: (itemCompleto) => set((state) => ({
      carrito: state.carrito.map(item => 
          item.cart_id === itemCompleto.cart_id ? itemCompleto : item
      )
  })),

  editarNotaItem: (cartIdOriginal, nuevaNota) => set((state) => {
    const index = state.carrito.findIndex(item => item.cart_id === cartIdOriginal);
    if (index === -1) return state;

    const nuevoCarrito = [...state.carrito];
    const itemEditado = { ...nuevoCarrito[index] };

    const notasLimpias = (nuevaNota || '').trim();
    itemEditado.notas_cocina = notasLimpias;

    const opciones = itemEditado.opciones_seleccionadas ? JSON.stringify(itemEditado.opciones_seleccionadas) : '';
    if (notasLimpias === '' && (opciones === '' || opciones === '[]')) {
      itemEditado.cart_id = `base_${itemEditado.id}`;
    } else {
      itemEditado.cart_id = `mod_${itemEditado.id}_${notasLimpias}_${opciones}`;
    }

    nuevoCarrito[index] = itemEditado;

    return { carrito: nuevoCarrito };
  }),

  eliminarProducto: (identificadorUnique) => set((state) => ({
    carrito: state.carrito.filter(item => item.cart_id !== identificadorUnique)
  })),

  vaciarCarrito: () => set({ carrito: [] }),

  // ==========================================
  // 🧮 3. CÁLCULOS AUTOMÁTICOS
  // ==========================================
  obtenerTotalItems: () => {
    const state = get();
    return state.carrito.reduce((total, item) => total + item.cantidad, 0);
  },

  obtenerTotalDinero: () => {
    const state = get();
    return state.carrito.reduce((total, item) => {
      const precioParaSumar = item.precio_unitario_calculado !== undefined ? item.precio_unitario_calculado : item.precio;
      return total + (precioParaSumar * item.cantidad);
    }, 0);
  }
}));

export default usePosStore;