import React, { useState, useEffect } from 'react';
import { getProductos } from './api/api';
import usePosStore from './store/usePosStore';

const formatearSoles = (monto) => {
  const numero = parseFloat(monto);
  if (isNaN(numero)) return "S/ 0.00";
  return `S/ ${numero.toFixed(2)}`;
};

const obtenerPrecio = (p) => {
  const precio = p.precio_base !== undefined ? p.precio_base : p.precio;
  return parseFloat(precio) || 0;
};

export default function DrawerVentaRapida({ isOpen, onClose, onProcederPago }) {
  const { configuracionGlobal } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';

  const [productosRapidos, setProductosRapidos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const sedeActualId = localStorage.getItem('sede_id');

  useEffect(() => {
    if (isOpen) {
      cargarProductos();
    }
  }, [isOpen]);

  const cargarProductos = async () => {
    try {
      const res = await getProductos({ sede_id: sedeActualId });
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

  const restarDelCarrito = (id) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === id);
      if (!existe) return prev;
      if (existe.cantidad === 1) {
        return prev.filter(item => item.id !== id);
      } else {
        return prev.map(item => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item);
      }
    });
  };

  const calcularTotal = () => carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  return (
    <div className={`fixed inset-0 z-[100] transition-all duration-300 ease-out ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>

      <div className={`absolute right-0 top-0 bottom-0 w-[95%] md:w-[85%] lg:w-[75%] max-w-[1200px] flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${
        tema === 'dark' ? 'bg-[#0a0a0a] border-l border-[#222]' : 'bg-white border-l border-gray-200 shadow-2xl'
      }`}>
        
        {/* CABECERA */}
        <div className={`p-4 md:p-5 flex justify-between items-center border-b sticky top-0 z-10 shrink-0 ${
          tema === 'dark' ? 'border-[#222] bg-[#111]' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <div>
                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tighter leading-none" style={{ color: colorPrimario }}>
                  Venta Directa
                </h2>
                <p className={`font-bold text-[10px] md:text-xs uppercase tracking-widest mt-1 ${
                  tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                }`}>
                  Sede: {localStorage.getItem('sede_nombre') || 'Local'}
                </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`w-12 h-12 rounded-2xl flex justify-center items-center font-black text-xl transition-all active:scale-95 ${
              tema === 'dark' 
                ? 'bg-[#222] hover:bg-red-500/20 border border-[#333]' 
                : 'bg-gray-100 hover:bg-red-100 border border-gray-200'
            }`}
            style={{ color: colorPrimario }}
          >
            ✕
          </button>
        </div>

        {/* CUERPO */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* PANEL DE PRODUCTOS */}
          <div className={`flex-1 flex flex-col p-4 md:p-6 overflow-hidden border-b lg:border-b-0 lg:border-r ${
            tema === 'dark' ? 'bg-[#050505] border-[#222]' : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 content-start pr-2">
              {productosRapidos.length === 0 && (
                <div className="col-span-full text-center py-20">
                  <p className={`font-bold mb-2 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                    No hay productos marcados para esta sede.
                  </p>
                </div>
              )}
              {productosRapidos.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => agregarAlCarrito(p)}
                  className={`p-4 md:p-5 rounded-2xl border text-left transition-all active:scale-[0.95] flex flex-col justify-between min-h-[130px] shadow-lg group relative overflow-hidden ${
                    tema === 'dark'
                      ? 'bg-[#121212] border-[#2a2a2a] hover:border-[#ff5a1f] hover:bg-[#1a1a1a]'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                  }`}
                  style={{ borderColor: tema === 'dark' ? undefined : undefined }}
                >
                  <div 
                    className="absolute top-0 right-0 w-8 h-8 rounded-bl-2xl flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: `${colorPrimario}10` }}
                  >
                    <span className="text-xs font-black" style={{ color: colorPrimario }}>+</span>
                  </div>
                  <div>
                    <span className={`font-extrabold text-[15px] md:text-[17px] leading-tight block group-hover:${
                      tema === 'dark' ? 'text-white' : 'text-gray-900'
                    } ${tema === 'dark' ? 'text-neutral-200' : 'text-gray-800'}`}>
                      {p.nombre}
                    </span>
                  </div>
                  <span className={`font-mono font-black text-lg md:text-xl mt-3 ${
                    tema === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {formatearSoles(obtenerPrecio(p))}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* PANEL DEL CARRITO */}
          <div className={`h-[45vh] lg:h-auto lg:w-[350px] xl:w-[420px] flex flex-col shrink-0 ${
            tema === 'dark' ? 'bg-[#0a0a0a]' : 'bg-white'
          }`}>
            <h3 className={`p-3 md:p-5 font-black border-b text-xs uppercase tracking-widest ${
              tema === 'dark' ? 'text-neutral-500 border-[#222] bg-[#111]' : 'text-gray-500 border-gray-200 bg-gray-50'
            }`}>
              Ticket Actual
            </h3>
            
            <div className={`flex-1 overflow-y-auto p-4 md:p-5 space-y-3 ${
              tema === 'dark' ? '' : 'bg-gray-50'
            }`}>
              {carrito.length === 0 && (
                <div className="text-center mt-10 flex flex-col items-center gap-4">
                    <span className="text-5xl opacity-20">🧾</span>
                    <p className={`text-xs md:text-sm font-extrabold ${
                      tema === 'dark' ? 'text-neutral-600' : 'text-gray-400'
                    }`}>Selecciona productos a la izquierda</p>
                </div>
              )}
              {carrito.map(item => (
                <div key={item.id} className={`flex flex-col p-3 rounded-xl border ${
                  tema === 'dark' ? 'bg-[#151515] border-[#222]' : 'bg-gray-100 border-gray-200'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`font-bold leading-tight pr-2 ${
                      tema === 'dark' ? 'text-neutral-200' : 'text-gray-800'
                    }`}>{item.nombre}</span>
                    <span className={`font-mono font-bold text-sm shrink-0 mt-0.5 ${
                      tema === 'dark' ? 'text-neutral-400' : 'text-gray-600'
                    }`}>
                      {formatearSoles(item.precio * item.cantidad)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-mono ${
                      tema === 'dark' ? 'text-neutral-600' : 'text-gray-500'
                    }`}>{formatearSoles(item.precio)} c/u</span>
                    
                    <div className={`flex items-center gap-2 rounded-lg p-1 border ${
                      tema === 'dark' ? 'bg-[#0a0a0a] border-[#2a2a2a]' : 'bg-white border-gray-200'
                    }`}>
                      <button 
                        onClick={() => restarDelCarrito(item.id)} 
                        className={`w-8 h-8 flex justify-center items-center rounded-md transition-colors ${
                          tema === 'dark' ? 'text-neutral-400 hover:text-red-500 hover:bg-red-500/10' : 'text-gray-500 hover:text-red-500 hover:bg-red-100'
                        }`}
                      >
                        <span className="text-lg font-black leading-none pb-1">-</span>
                      </button>
                      
                      <span className="font-black text-lg w-6 text-center select-none" style={{ color: colorPrimario }}>
                        {item.cantidad}
                      </span>
                      
                      <button 
                        onClick={() => agregarAlCarrito(item)} 
                        className={`w-8 h-8 flex justify-center items-center rounded-md transition-colors ${
                          tema === 'dark' ? 'text-neutral-400 hover:text-green-500 hover:bg-green-500/10' : 'text-gray-500 hover:text-green-500 hover:bg-green-100'
                        }`}
                      >
                        <span className="text-lg font-black leading-none pb-1">+</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className={`p-4 md:p-5 border-t-2 border-dashed shrink-0 ${
              tema === 'dark' ? 'border-[#222] bg-[#050505]' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex justify-between items-end mb-5">
                <span className={`font-bold uppercase text-[10px] md:text-xs tracking-widest ${
                  tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'
                }`}>
                  Total Cobrar
                </span>
                <span className="text-3xl md:text-4xl font-black font-mono" style={{ color: colorPrimario }}>
                  {formatearSoles(calcularTotal())}
                </span>
              </div>
              
              <button 
                disabled={carrito.length === 0}
                onClick={() => onProcederPago(carrito, calcularTotal())}
                className={`w-full py-4 md:py-5 rounded-2xl font-black tracking-tighter text-xl md:text-2xl transition-all shadow-lg flex justify-center items-center gap-3 ${
                  carrito.length > 0 
                    ? 'text-white active:scale-95 shadow-md hover:brightness-110' 
                    : (tema === 'dark' ? 'bg-[#111] text-neutral-600 border border-[#222]' : 'bg-gray-200 text-gray-400 border border-gray-200')
                }`}
                style={carrito.length > 0 ? { backgroundColor: colorPrimario } : {}}
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