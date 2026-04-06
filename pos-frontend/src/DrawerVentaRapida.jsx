import React, { useState, useEffect } from 'react';
import { getProductos } from './api/api';

const formatearSoles = (monto) => {
  const numero = parseFloat(monto);
  if (isNaN(numero)) return "S/ 0.00";
  return `S/ ${numero.toFixed(2)}`;
};

// Extractor de precio adaptado a tu modelo de Django (precio_base)
const obtenerPrecio = (p) => {
  // Ahora busca primero "precio_base", luego prueba las otras opciones por si acaso
  const precio = p.precio_base !== undefined ? p.precio_base : p.precio;
  return parseFloat(precio) || 0;
};

export default function DrawerVentaRapida({ isOpen, onClose, onProcederPago }) {
  const [productosRapidos, setProductosRapidos] = useState([]);
  const [carrito, setCarrito] = useState([]);

  useEffect(() => {
    if (isOpen) {
      cargarProductos();
    }
  }, [isOpen]);

  const cargarProductos = async () => {
    try {
      const res = await getProductos();
      const filtrados = res.data.filter(p => p.es_venta_rapida === true);
      setProductosRapidos(filtrados);
    } catch (error) {
      console.error("Error cargando menú para venta rápida", error);
    }
  };

  const agregarAlCarrito = (producto) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        return prev.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { id: producto.id, nombre: producto.nombre, precio: obtenerPrecio(producto), cantidad: 1 }];
    });
  };

  // --- NUEVA FUNCIÓN: QUITAR DEL CARRITO ---
  const restarDelCarrito = (id) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === id);
      if (existe.cantidad === 1) {
        return prev.filter(item => item.id !== id); // Si hay 1, lo borra entero
      } else {
        return prev.map(item => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item); // Si hay más, resta 1
      }
    });
  };

  const calcularTotal = () => carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-300 ease-out ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>

      <div className={`absolute right-0 top-0 bottom-0 w-[95%] md:w-[85%] lg:w-[75%] max-w-[1200px] bg-[#0a0a0a] border-l border-[#222] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* CABECERA */}
        <div className="p-4 md:p-5 flex justify-between items-center border-b border-[#222] bg-[#111] sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
                <h2 className="text-xl md:text-2xl font-black text-[#ff5a1f] uppercase tracking-tighter leading-none">Venta Directa</h2>
                <p className="text-neutral-500 font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1">Productos de Despacho Inmediato</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-[#222] hover:bg-red-500/20 hover:text-red-500 rounded-2xl flex justify-center items-center font-black text-xl transition-all border border-[#333] active:scale-95">✕</button>
        </div>

        {/* CUERPO */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* SECCIÓN MENÚ DIRECTO */}
          <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden border-b lg:border-b-0 lg:border-r border-[#222] bg-[#050505]">
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 content-start pr-2">
              {productosRapidos.length === 0 && (
                <div className="col-span-full text-center py-20">
                  <p className="text-neutral-500 font-bold mb-2">No hay productos marcados.</p>
                </div>
              )}
              {productosRapidos.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => agregarAlCarrito(p)}
                  className="bg-[#121212] p-4 md:p-5 rounded-2xl border border-[#2a2a2a] hover:border-[#ff5a1f] hover:bg-[#1a1a1a] text-left transition-all active:scale-[0.95] flex flex-col justify-between min-h-[130px] shadow-lg group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-8 h-8 bg-[#ff5a1f]/10 rounded-bl-2xl flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[#ff5a1f] text-xs font-black">+</span>
                  </div>
                  <div>
                    <span className="font-extrabold text-[15px] md:text-[17px] leading-tight text-neutral-200 block group-hover:text-white">{p.nombre}</span>
                  </div>
                  <span className="text-white font-mono font-black text-lg md:text-xl mt-3">
                    {formatearSoles(obtenerPrecio(p))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SECCIÓN CARRITO CON CONTROLES */}
          <div className="h-[45vh] lg:h-auto lg:w-[350px] xl:w-[420px] bg-[#0a0a0a] flex flex-col shrink-0">
            <h3 className="p-3 md:p-5 font-black text-neutral-500 border-b border-[#222] text-xs uppercase tracking-widest bg-[#111]">Ticket Actual</h3>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3">
              {carrito.length === 0 && (
                <div className="text-center mt-10 flex flex-col items-center gap-4">
                    <span className="text-5xl opacity-20">🧾</span>
                    <p className="text-neutral-600 text-xs md:text-sm font-extrabold">Selecciona productos a la izquierda</p>
                </div>
              )}
              {carrito.map(item => (
                // DISEÑO RENOVADO DEL ITEM CON BOTONES DE + Y -
                <div key={item.id} className="flex flex-col bg-[#151515] p-3 rounded-xl border border-[#222]">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-bold text-neutral-200 leading-tight pr-2">{item.nombre}</span>
                    <span className="font-mono text-neutral-400 font-bold text-sm shrink-0 mt-0.5">
                      {formatearSoles(item.precio * item.cantidad)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 text-xs font-mono">{formatearSoles(item.precio)} c/u</span>
                    
                    {/* CONTROLES DE CANTIDAD */}
                    <div className="flex items-center gap-2 bg-[#0a0a0a] rounded-lg p-1 border border-[#2a2a2a]">
                      <button 
                        onClick={() => restarDelCarrito(item.id)} 
                        className="w-8 h-8 flex justify-center items-center text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                        title="Quitar uno"
                      >
                        <span className="text-lg font-black leading-none pb-1">-</span>
                      </button>
                      
                      <span className="font-black text-lg text-[#ff5a1f] w-6 text-center select-none">
                        {item.cantidad}
                      </span>
                      
                      <button 
                        onClick={() => agregarAlCarrito(item)} 
                        className="w-8 h-8 flex justify-center items-center text-neutral-400 hover:text-green-500 hover:bg-green-500/10 rounded-md transition-colors"
                        title="Añadir uno"
                      >
                        <span className="text-lg font-black leading-none pb-1">+</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-4 md:p-5 border-t-2 border-dashed border-[#222] bg-[#050505] shrink-0">
              <div className="flex justify-between items-end mb-5">
                <span className="text-neutral-500 font-bold uppercase text-[10px] md:text-xs tracking-widest">Total Cobrar</span>
                <span className="text-3xl md:text-4xl font-black font-mono text-[#ff5a1f]">
                  {formatearSoles(calcularTotal())}
                </span>
              </div>
              
              <button 
                disabled={carrito.length === 0}
                onClick={() => onProcederPago(carrito, calcularTotal())}
                className={`w-full py-4 md:py-5 rounded-2xl font-black tracking-tighter text-xl md:text-2xl transition-all shadow-lg flex justify-center items-center gap-3 ${carrito.length > 0 ? 'bg-[#ff5a1f] hover:bg-[#e04a15] text-white active:scale-95 shadow-[#ff5a1f]/20' : 'bg-[#111] text-neutral-600 cursor-not-allowed border border-[#222]'}`}
              >
                PAGO EXPRESS ⚡
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}