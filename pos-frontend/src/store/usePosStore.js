import { create } from 'zustand';

const usePosStore = create((set, get) => ({
  // ==========================================
  // ⚙️ 0. CONFIGURACIÓN GLOBAL
  // ==========================================
  configuracionGlobal: {
    colorPrimario: '#ff5a1f',
    temaFondo: 'dark',
    ruc: '', razon_social: '', logo: null,
    yape_numero: '', yape_qr: null,
    plin_numero: '', plin_qr: null,
    usa_culqi: false, culqi_public_key: '',
    modulos: {
      salon: true, cocina: false, delivery: false, inventario: false,
      clientes: false, facturacion: false, cartaQr: false, botWsp: false, machineLearning: false
    }
  },

  setConfiguracionGlobal: (nuevaConfig) => set({ configuracionGlobal: nuevaConfig }),

  // ==========================================
  // 🛒 1. ESTADO DE OPERACIÓN
  // ==========================================
  carrito: [],
  estadoCaja: 'abierto',

  setEstadoCaja: (nuevoEstado) => set({ estadoCaja: nuevoEstado }),

  // ==========================================
  // 🍔 2. ACCIONES DEL CARRITO
  // ==========================================
  sumarUnidad: (identificadorUnique) => set((state) => ({
    carrito: state.carrito.map(item =>
      item.cart_id === identificadorUnique
        ? { ...item, cantidad: item.cantidad + 1 }
        : item
    )
  })),

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

  // ✨ NUEVO: Agregar un combo al carrito
  agregarCombo: (combo, tipo = 'promo') => set((state) => {
    // tipo: 'promo' para ComboPromocional, 'normal' para Producto con es_combo=true
    const cartId = tipo === 'promo'
      ? `combo_promo_${combo.id}`
      : `combo_normal_${combo.id}`;

    const existeIndex = state.carrito.findIndex(item => item.cart_id === cartId);

    const itemCombo = {
      cart_id: cartId,
      id: combo.id,
      nombre: combo.nombre,
      producto_nombre: combo.nombre,
      precio: parseFloat(combo.precio ?? combo.precio_base ?? 0),
      precio_unitario_calculado: parseFloat(combo.precio ?? combo.precio_base ?? 0),
      cantidad: 1,
      notas_cocina: '',
      _es_combo: true,
      _tipo_combo: tipo,
      // Items del combo para mostrar en el drawer
      _items_combo: (combo.items || combo.items_combo || []).map(i => ({
        id: i.producto ?? i.producto_hijo,
        nombre: i.producto_detalle?.nombre ?? i.producto_hijo_nombre ?? '',
        cantidad: i.cantidad,
        opcion: i.opcion_seleccionada ? `(${i.producto_detalle?.grupos_variacion?.[0]?.opciones?.find(o => o.id === i.opcion_seleccionada)?.nombre || 'opción'})` : '',
      })),
    };

    if (existeIndex !== -1) {
      const nuevoCarrito = [...state.carrito];
      nuevoCarrito[existeIndex] = {
        ...nuevoCarrito[existeIndex],
        cantidad: nuevoCarrito[existeIndex].cantidad + 1,
      };
      return { carrito: nuevoCarrito };
    }

    return { carrito: [...state.carrito, itemCombo] };
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

  restarProducto: (identificadorUnique) => set((state) => ({
    carrito: state.carrito.map(item =>
      item.cart_id === identificadorUnique
        ? { ...item, cantidad: item.cantidad - 1 }
        : item
    ).filter(item => item.cantidad > 0)
  })),

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
  // 🧮 3. CÁLCULOS
  // ==========================================
  obtenerTotalItems: () => {
    const state = get();
    return state.carrito.reduce((total, item) => total + item.cantidad, 0);
  },

  obtenerTotalDinero: () => {
    const state = get();
    return state.carrito.reduce((total, item) => {
      const precioParaSumar = item.precio_unitario_calculado !== undefined
        ? item.precio_unitario_calculado
        : item.precio;
      return total + (precioParaSumar * item.cantidad);
    }, 0);
  }
}));

export default usePosStore;