import { create } from 'zustand';

const usePosStore = create((set, get) => ({
  // 1. EL CARRITO (Memoria a corto plazo)
  carrito: [],

  // 2. ACCIONES (Lo que el mesero puede hacer)
  sumarUnidad: (identificadorUnique) => set((state) => {
    const nuevoCarrito = state.carrito.map(item => {
      if (item.cart_id === identificadorUnique) {
        return { ...item, cantidad: item.cantidad + 1 }; // Obligamos a que sume SOLO 1
      }
      return item;
    });
    return { carrito: nuevoCarrito };
  }),
  // Agregar un producto completamente nuevo (con cart_id generado externamente o internamente)
  agregarProducto: (producto) => set((state) => {
    // 1. Extraemos las notas y opciones (limpiando espacios extra)
    const notas = (producto.notas_cocina || producto.notas || '').trim();
    const opciones = producto.opciones_seleccionadas ? JSON.stringify(producto.opciones_seleccionadas) : '';

    // 2. Generamos la "Firma Única"
    let cartIdUnico = producto.cart_id; // Respetamos si ya trae un ID (ej. al editar)

    if (!cartIdUnico) {
      if (notas === '' && (opciones === '' || opciones === '[]')) {
        // Es un plato 100% base
        cartIdUnico = `base_${producto.id}`;
      } else {
        // ✨ LA MAGIA: El ID ahora es el texto de la modificación.
        // Si metes dos platos "Sin cebolla", ambos generarán el texto "mod_4_Sin cebolla_[]".
        // Como el ID es igual, el sistema los va a sumar en vez de separarlos.
        cartIdUnico = `mod_${producto.id}_${notas}_${opciones}`;
      }
    }
    
    // 3. Buscamos si ya existe esta firma exacta en el carrito
    const existeIndex = state.carrito.findIndex(item => item.cart_id === cartIdUnico);
    
    if (existeIndex !== -1) {
      // Si existe, le sumamos la cantidad de forma inmutable
      const nuevoCarrito = [...state.carrito];
      nuevoCarrito[existeIndex] = { 
          ...nuevoCarrito[existeIndex], 
          cantidad: nuevoCarrito[existeIndex].cantidad + (producto.cantidad || 1) 
      };
      return { carrito: nuevoCarrito };
    } else {
      // Si no existe, lo agregamos como nuevo
      return { 
        carrito: [...state.carrito, { 
            ...producto, 
            cart_id: cartIdUnico, 
            cantidad: producto.cantidad || 1, 
            notas_cocina: notas // Aseguramos guardar la nota limpia
        }] 
      };
    }
  }),

  // Sumar 1 al producto si viene desde la card del Grid de un plato normal
  sumarProductoDirecto: (productoId) => set((state) => {
      // Buscamos cualquier variante de ese producto
      const existeIndex = state.carrito.findIndex(item => item.id === productoId);
      
      if (existeIndex !== -1) {
          // Si existe una variante, le sumamos 1 a ESA variante (la primera que encuentre)
          const nuevoCarrito = [...state.carrito];
          nuevoCarrito[existeIndex].cantidad += 1;
          return { carrito: nuevoCarrito };
      } else {
          // Si no existe, es idéntico a agregarProducto sin notas
          // El backend responderá con el producto y precio base
          return state; // No hacemos nada aquí, debe usarse agregarProducto
      }
  }),
  restarDesdeGrid: (productoId) => set((state) => {
    let indexARestar = state.carrito.findIndex(item => item.cart_id === `base_${productoId}`);

    // Si no encuentra la base, busca el último que coincida con el ID
    if (indexARestar === -1) {
        indexARestar = state.carrito.findLastIndex(item => item.id === productoId);
    }

    if (indexARestar === -1) return state; // Si no hay, no hace nada

    // Hacemos una copia profunda correcta para Zustand
    const nuevoCarrito = [...state.carrito];
    const itemActual = { ...nuevoCarrito[indexARestar] };

    if (itemActual.cantidad > 1) {
        itemActual.cantidad -= 1;
        nuevoCarrito[indexARestar] = itemActual; // Guardamos el item actualizado
    } else {
        nuevoCarrito.splice(indexARestar, 1); // Lo borramos
    }
    
    return { carrito: nuevoCarrito };
  }),
  // Restar un producto
  restarProducto: (identificadorUnique) => set((state) => {
    const nuevoCarrito = state.carrito.map(item => {
      if (item.cart_id === identificadorUnique) {
        return { ...item, cantidad: item.cantidad - 1 };
      }
      return item;
    }).filter(item => item.cantidad > 0);
    
    return { carrito: nuevoCarrito };
  }),

  // ✨ NUEVA ACCIÓN: Reemplazar un item completo (Usado por el modal en modo EDITAR)
  actualizarItemCompleto: (itemCompleto) => set((state) => ({
      carrito: state.carrito.map(item => 
          item.cart_id === itemCompleto.cart_id ? itemCompleto : item
      )
  })),

  // Eliminar producto completo del carrito
  eliminarProducto: (identificadorUnique) => set((state) => ({
    carrito: state.carrito.filter(item => item.cart_id !== identificadorUnique)
  })),

  // Limpiar todo (para cuando se mande a cocina)
  vaciarCarrito: () => set({ carrito: [] }),

  // 3. CÁLCULOS AUTOMÁTICOS
  obtenerTotalItems: () => {
    const state = get();
    return state.carrito.reduce((total, item) => total + item.cantidad, 0);
  },

  obtenerTotalDinero: () => {
    const state = get();
    return state.carrito.reduce((total, item) => {
      // MAGIA: Sumamos el precio correcto (el calculado en el modal si existe, o el precio base del producto)
      const precioParaSumar = item.precio_unitario_calculado !== undefined ? item.precio_unitario_calculado : item.precio;
      return total + (precioParaSumar * item.cantidad);
    }, 0);
  }
}));

export default usePosStore;