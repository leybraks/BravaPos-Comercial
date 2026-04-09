import React, { useState, useEffect, useCallback } from 'react';
import usePosStore from './store/usePosStore';
import ModalCobro from './ModalCobro';
import ModalModificadores from './ModalModificadores';
import { getProductos, crearOrden, actualizarOrden, getOrdenes, crearPago, agregarProductosAOrden } from './api/api';

export default function PosView({ mesaId, onVolver }) {
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [categoriasExpandidas, setCategoriasExpandidas] = useState(false);
  const [modalCobroAbierto, setModalCobroAbierto] = useState(false);
  
  const [formLlevar, setFormLlevar] = useState({
    nombre: '',
    telefono: ''
  });
  const telefonoLlevar = formLlevar.telefono;
  const [modalModsAbierto, setModalModsAbierto] = useState(false);
  const [productoParaModificar, setProductoParaModificar] = useState(null);

  const [productosBase, setProductosBase] = useState([]);
  const [cargando, setCargando] = useState(true);
  const { estadoCaja } = usePosStore();
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mostrarExito, setMostrarExito] = useState(false);

  const [ordenActiva, setOrdenActiva] = useState(null);

  const { 
    carrito, agregarProducto, restarProducto, eliminarProducto, 
    obtenerTotalItems, restarDesdeGrid, obtenerTotalDinero, vaciarCarrito, actualizarItemCompleto, sumarUnidad
  } = usePosStore();

  const formatearSoles = (monto) => `S/ ${parseFloat(monto || 0).toFixed(2)}`;

  const vaciarStore = vaciarCarrito; 

  // ✨ AQUÍ OBTENEMOS LA SEDE DE LA MEMORIA ✨
  const sedeActualId = localStorage.getItem('sede_id');

  const cargarData = useCallback(async () => {
      try {
        const responseProductos = await getProductos();
        const dataFormateada = responseProductos.data.map(p => ({
          ...p,
          id: p.id, 
          nombre: p.nombre, 
          precio: parseFloat(p.precio_base), 
          categoria: p.categoria?.nombre || 'General'
        }));
        setProductosBase(dataFormateada);

        // ✨ LE DECIMOS A DJANGO QUE SOLO NOS DÉ LAS ÓRDENES DE ESTA SEDE ✨
        const responseOrdenes = await getOrdenes({ sede_id: sedeActualId });
        const ordenViva = responseOrdenes.data.find(o => 
            o.mesa === mesaId && 
            o.estado !== 'completado' && 
            o.estado !== 'cancelado' &&
            o.estado_pago !== 'pagado' // 👈 El filtro correcto
        );
        
        if (ordenViva) {
            setOrdenActiva(ordenViva);
        } else {
            setOrdenActiva(null);
        }
        vaciarStore(); 
        setCargando(false);
      } catch (error) {
        console.error(error);
        setCargando(false);
      }
  }, [mesaId, vaciarStore, sedeActualId]);

  useEffect(() => {
    cargarData();
  }, [cargarData]);

  const productosFiltrados = categoriaActiva === 'Todos' 
    ? productosBase 
    : productosBase.filter(p => p.categoria == categoriaActiva);
  
  const categoriasReales = ['Todos', ...new Set(productosBase.map(p => p.categoria))];

  const totalMesa = (ordenActiva ? parseFloat(ordenActiva.total) : 0) + obtenerTotalDinero();
  const cantItemsMesa = (ordenActiva ? ordenActiva.detalles.reduce((acc, el) => acc + el.cantidad, 0) : 0) + obtenerTotalItems();

  const manejarEnviarCocina = async () => {
    setProcesando(true);
    try {
      const detallesNuevos = carrito.map(item => ({
        producto: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario_calculado || item.precio,
        notas_y_modificadores: item.notas_y_modificadores || "",
        notas_cocina: item.notas_cocina || ""
      }));

      if (ordenActiva) {
        await agregarProductosAOrden(ordenActiva.id, { detalles: detallesNuevos });
      } else {
        const payloadOrden = {
          sede: sedeActualId, // ✨ AHORA LA ORDEN SE CREA EN LA SEDE CORRECTA ✨
          mesa: esParaLlevar ? null : mesaId, 
          tipo: esParaLlevar ? 'llevar' : 'salon',
          estado: 'preparando',
          total: obtenerTotalDinero(),
          cliente_nombre: esParaLlevar ? nombreLlevar : "", 
          cliente_telefono: esParaLlevar ? telefonoLlevar : "",
          detalles: detallesNuevos
        };
        await crearOrden(payloadOrden); 
      }
      
      setCarritoAbierto(false); 
      setMostrarExito(true);    
      
      setTimeout(() => {
        setMostrarExito(false);
        onVolver(); 
      }, 2000);
    } catch (error) {
      console.error(error);
      alert('Error al enviar la orden a Django.');
    } finally {
      setProcesando(false); 
    }
  };

  const abrirModalParaNuevo = (producto) => {
    setProductoParaModificar(producto); 
    setModalModsAbierto(true);
  };

  const abrirModalParaEditar = (itemCarrito) => {
    setProductoParaModificar(itemCarrito); 
    setModalModsAbierto(true);
  };

  const manejarAgregarAlCarritoDesdeModal = (itemCompleto) => {
      const existeItem = carrito.find(i => i.cart_id === itemCompleto.cart_id);
      
      if (existeItem) {
          actualizarItemCompleto(itemCompleto); 
      } else {
          agregarProducto(itemCompleto); 
      }
  };
  
  const esParaLlevar = (typeof mesaId === 'object' && mesaId?.id === 'llevar') || mesaId === 'llevar';
  const nombreLlevar = typeof mesaId === 'object' ? mesaId.cliente : 'Cliente (🛍️ Llevar)';

  return (
    <>
      <header className="bg-[#0a0a0a] p-4 shadow-xl sticky top-0 z-10 border-b border-[#222]">
        <div className="flex justify-between items-center mb-4 gap-3">
          <div className="flex items-center gap-3">
             <button onClick={onVolver} className="w-10 h-10 bg-[#1a1a1a] hover:bg-[#222] border border-[#222] rounded-xl flex items-center justify-center transition-colors text-white font-black text-xl active:scale-95">←</button>
             <div>
                <span className="text-neutral-600 text-[10px] font-bold tracking-widest uppercase">
                  {esParaLlevar ? 'Cajón delivery' : '🍽️ SALÓN'}
                </span>
                <h1 className="text-xl font-black text-white uppercase tracking-tight">
                  {esParaLlevar ? nombreLlevar : `Mesa ${mesaId}`}
                </h1>
             </div>
          </div>
        </div>

        <div className="mb-2 relative z-20">
          <button onClick={() => setCategoriasExpandidas(!categoriasExpandidas)} className="w-full flex justify-between items-center bg-[#1a1a1a] text-neutral-200 px-4 py-3 h-14 rounded-2xl border border-[#2a2a2a] hover:bg-[#222] transition-colors shadow-sm active:scale-[0.99]">
            <span className="font-semibold text-sm">Categoría: <span className="text-[#ff5a1f] ml-1 uppercase tracking-widest font-bold text-xs">{categoriaActiva}</span></span>
            <svg className={`w-5 h-5 transform transition-transform duration-200 ${categoriasExpandidas ? 'rotate-180 text-[#ff5a1f]' : 'text-neutral-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>
          {categoriasExpandidas && (
            <div className="absolute top-full left-0 w-full bg-[#111] border border-[#222] rounded-2xl mt-2 p-2 grid grid-cols-2 gap-2 shadow-2xl animate-fadeIn z-50">
                {categoriasReales.map(cat => (
                    <button key={cat} onClick={() => { setCategoriaActiva(cat); setCategoriasExpandidas(false); }} className={`py-3.5 px-3 rounded-xl text-xs font-black transition-colors border text-center uppercase tracking-wider ${categoriaActiva === cat ? 'bg-[#ff5a1f] text-white border-[#ff5a1f]' : 'bg-[#1a1a1a] text-neutral-400 border-[#222] hover:bg-[#222] hover:text-white'}`}>
                        {cat}
                    </button>
                ))}
            </div>
          )}
        </div>
      </header>

      {/* ==================== CUADRÍCULA DE PRODUCTOS ACTUALIZADA ==================== */}
      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 relative z-0 pb-32">
        {productosFiltrados.map((prod) => {
          const totalCantidadProd = carrito
              .filter(item => item.id === prod.id)
              .reduce((acc, curr) => acc + curr.cantidad, 0);
          const tieneVariantes = carrito.some(item => item.id === prod.id && item.cart_id !== `base_${prod.id}`);
          
          if (prod.requiere_seleccion) {
              return (
                <button key={prod.id} onClick={() => abrirModalParaNuevo(prod)} className="bg-[#111] border border-[#222] p-4 rounded-3xl shadow-lg active:scale-95 transition-all flex flex-col justify-between h-40 text-left hover:border-[#444] group">
                  <div>
                    <span className="font-bold text-neutral-200 leading-tight text-[15px] group-hover:text-white">{prod.nombre}</span>
                    <p className="text-[10px] text-neutral-600 mt-1 uppercase font-black tracking-widest">{prod.categoria}</p>
                  </div>
                  <div className="flex justify-between items-end w-full mt-2">
                      <span className="text-[10px] uppercase font-black tracking-widest text-neutral-400 bg-[#1a1a1a] px-2.5 py-1.5 rounded-lg border border-[#2a2a2a]">Opciones</span>
                      {totalCantidadProd > 0 && (
                          <div className='bg-[#ff5a1f] text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-xl shadow-lg'>{totalCantidadProd}</div>
                      )}
                  </div>
                </button>
              );
          }

          const precioAMostrar = parseFloat(prod.precio_base || prod.precio);
          
          return (
            <div 
              key={prod.id} 
              onClick={() => agregarProducto(prod)} 
              className="bg-[#111] border border-[#222] p-3 sm:p-4 rounded-3xl shadow-lg cursor-pointer hover:border-[#ff5a1f]/50 hover:bg-[#151515] transition-all flex flex-col h-full text-left justify-between relative overflow-hidden"
            >
              
              <div className='flex-1 mb-3 pointer-events-none'>
                <span className="font-bold text-neutral-200 leading-tight text-[13px] sm:text-[15px] line-clamp-2">{prod.nombre}</span>
                <p className="text-[9px] text-neutral-600 mt-1 uppercase font-black tracking-widest truncate">{prod.categoria}</p>
                <p className="font-mono text-sm text-[#ff5a1f] font-bold mt-1.5">{formatearSoles(precioAMostrar)}</p>
              </div>
              
              <div className="flex flex-col gap-2 pt-2 border-t border-[#1a1a1a] shrink-0">
                  
                  {totalCantidadProd > 0 && (
                    <div className='flex items-center justify-between gap-1'>
                      <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            restarDesdeGrid(prod.id);
                          }}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-lg transition-all border bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white"
                      >-</button>
                      
                      <span className="flex-1 h-9 sm:h-10 rounded-xl font-black text-lg flex items-center justify-center border transition-all bg-[#1a1a1a] text-white border-[#333]">
                          {totalCantidadProd}
                          {tieneVariantes && (
                             <span className="absolute top-1 right-1 text-[#ff5a1f] text-[10px]" title="Contiene variantes">⚙️</span>
                          )}
                      </span>
                      
                      <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            agregarProducto(prod); 
                          }} 
                          className='w-9 h-9 sm:w-10 sm:h-10 bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500 hover:text-white rounded-xl flex items-center justify-center font-black text-lg transition-all'
                      >+</button>
                    </div>
                  )}
                  
                  {prod.tiene_variaciones ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); 
                        abrirModalParaNuevo(prod);
                      }}
                      className="w-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[#ff5a1f] bg-[#ff5a1f]/10 py-2.5 rounded-lg border border-[#ff5a1f]/30 hover:bg-[#ff5a1f] hover:text-white transition-colors"
                    >
                      ⚙️ Variantes / Opc.
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); 
                        abrirModalParaNuevo(prod);
                      }}
                      className="w-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-[#1a1a1a] py-2 rounded-lg border border-[#2a2a2a] hover:border-[#444] hover:text-white transition-colors"
                    >
                      📝 Agregar Nota
                    </button>
                  )}
              </div>
              
            </div>
          );
        })}
      </div>

      {/* BARRA FLOTANTE FOOTER */}
      <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a]/90 backdrop-blur-md p-4 border-t border-[#222] z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        <div className="flex gap-3 h-16">
          <button 
            onClick={() => setCarritoAbierto(true)}
            disabled={cantItemsMesa === 0} 
            className="flex-1 bg-[#111] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-2xl py-4 font-bold text-lg flex justify-between px-5 items-center disabled:opacity-40 transition-all active:scale-[0.98] shadow-lg"
          >
            <div className="flex gap-2.5 items-center">
              <span className="bg-[#ff5a1f] text-white border border-[#ff5a1f] w-9 h-9 flex items-center justify-center rounded-xl font-black text-xl shadow-inner">
                {cantItemsMesa}
              </span>
              <span className='font-black tracking-tight text-white uppercase text-base'>Ver Cuenta</span>
            </div>
            <span className="font-mono text-xl font-bold text-[#ff5a1f]">
              {formatearSoles(totalMesa)}
            </span>
          </button>

          <button 
            onClick={manejarEnviarCocina}
            disabled={procesando || carrito.length === 0} 
            className="bg-[#ff5a1f] hover:bg-[#e04a15] text-white rounded-2xl px-6 py-4 font-black text-lg shadow-[0_4px_20px_rgba(255,90,31,0.3)] disabled:opacity-30 disabled:shadow-none disabled:bg-[#333] transition-all flex items-center justify-center min-w-[130px] active:scale-[0.98]"
          >
            {procesando ? (
              <span className="animate-pulse">...</span>
            ) : (
              'ENVIAR 🚀'
            )}
          </button>
        </div>
      </div>

      {carritoAbierto && <div className="fixed inset-0 bg-black/80 z-30 transition-opacity backdrop-blur-sm" onClick={() => setCarritoAbierto(false)}></div>}

      <div className={`fixed inset-x-0 bottom-0 z-40 bg-[#0d0d0d] rounded-t-3xl border-t border-[#222] flex flex-col transition-transform duration-300 ease-out shadow-[-10px_0_50px_rgba(0,0,0,0.8)] ${carritoAbierto ? 'translate-y-0' : 'translate-y-full'}`} style={{ maxHeight: '88vh' }}>
        <div className="w-full flex justify-center pt-3 pb-1" onClick={() => setCarritoAbierto(false)}>
          <div className="w-12 h-1 bg-[#333] rounded-full"></div>
        </div>

        <div className="px-6 py-5 flex justify-between items-center border-b border-[#222]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#ff5a1f]/10 rounded-2xl flex items-center justify-center text-[#ff5a1f] font-black text-2xl border border-[#ff5a1f]/30 shadow-inner">{cantItemsMesa}</div>
            <div>
              <p className="text-neutral-600 text-[10px] font-bold tracking-widest uppercase">Total Ticket Mesa</p>
              <p className="text-white text-3xl font-black tracking-tight"> {formatearSoles(totalMesa)}</p>
            </div>
          </div>
          {carrito.length > 0 && (
            <button onClick={vaciarStore} className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors border border-red-500/30">
              Limpiar Nuevos
            </button>
          )}
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 scrollbar-hide pb-20">
          {ordenActiva && ordenActiva.detalles.length > 0 && (
            <div>
              <p className="text-neutral-700 font-bold uppercase tracking-widest text-[10px] mb-2 pl-1">En Preparación / Servidos</p>
              <div className="space-y-2.5">
                {ordenActiva.detalles.map((item, index) => (
                  <div key={`db-${index}`} className="bg-[#111] border border-[#222]/50 rounded-2xl p-4 flex justify-between items-center opacity-60">
                    <div>
                      <span className="font-bold text-white text-[15px]">{item.nombre}</span>
                      
                      {(item.notas_cocina || item.notas_y_modificadores || item.notas) && (
                        <span className="block text-[11px] text-[#ff5a1f] mt-1 font-mono leading-tight">
                          ↳ {item.notas_cocina || item.notas_y_modificadores || item.notas}
                        </span>
                      )}
                      
                      <p className="font-mono text-[#ff5a1f] text-sm font-bold mt-1.5">{formatearSoles(item.precio_unitario)} /u</p>
                    </div>
                    <div className="text-neutral-500 font-black px-4 py-2 bg-[#1a1a1a] rounded-xl border border-[#222] text-xl">
                      x{item.cantidad}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {carrito.length > 0 && (
            <div>
              <p className="text-[#ff5a1f] font-bold uppercase tracking-widest text-[10px] mb-2 pl-1">Por Enviar a Cocina (Editables)</p>
              <div className="space-y-2.5">
                {carrito.map(item => {
                    const precioAMostrar = item.precio_unitario_calculado || item.precio_base || item.precio || 0;                    
                    return (
                    <div key={item.cart_id || item.id} className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-4 flex flex-col gap-3 shadow-lg">
                      <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-neutral-400 text-[15px]">✓ {item.producto_nombre || item.nombre}</span>
                            
                            {(item.notas_cocina || item.notas_y_modificadores || item.notas) && (
                              <span className="block text-[11px] text-[#ff5a1f] mt-1 italic font-mono">
                                ↳ {item.notas_cocina || item.notas_y_modificadores || item.notas}
                              </span>
                            )}
                            
                            <p className="font-mono text-neutral-600 text-xs mt-1.5 font-bold">{formatearSoles(precioAMostrar)} c/u</p>
                          </div>
                          
                          <div className='flex items-center bg-[#222222] rounded-xl p-1 border border-[#333]'>
                            <button onClick={() => restarProducto(item.cart_id || item.id)} className='w-9 h-9 flex items-center justify-center text-red-400 font-black text-xl hover:text-white'>-</button>
                            <span className='w-10 text-center text-white font-black text-xl'>{item.cantidad}</span>
                            <button onClick={() => sumarUnidad(item.cart_id)} className='w-9 h-9 flex items-center justify-center text-green-400 font-black text-xl hover:text-white'>+</button>
                          </div>
                      </div>
                      
                      <div className="flex justify-start pt-1 border-t border-[#222]">
                          <button 
                            onClick={() => {
                              abrirModalParaEditar(item);
                            }}
                            className="text-[10px] bg-[#222] text-neutral-400 px-4 py-2 rounded-lg font-black uppercase tracking-widest hover:text-white hover:bg-[#ff5a1f] transition-all border border-[#333] active:scale-[0.98]"
                          >
                            ⚙️ Editar / Notas
                          </button>
                      </div>
                    </div>
                )})}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-[#222] flex flex-col gap-3 bg-[#0d0d0d] sticky bottom-0 left-0 w-full z-10">
            {carrito.length > 0 ? (
                <button 
                  onClick={manejarEnviarCocina}
                  disabled={procesando}
                  className="w-full bg-[#ff5a1f] text-white rounded-xl h-16 font-black text-lg flex justify-center items-center shadow-lg shadow-[#ff5a1f]/20 transition-all active:scale-[0.98]"
                >
                  {procesando ? 'PROCESANDO...' : 'ENVIAR A COCINA 🚀'}
                </button>
            ) : (
                ordenActiva && (
                    <button 
                      onClick={() => setModalCobroAbierto(true)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl h-16 font-black text-lg flex justify-center items-center shadow-lg shadow-green-500/20 transition-all active:scale-[0.98]"
                    >
                      COBRAR TICKET 💵
                    </button>
                )
            )}
        </div>
      </div>

      {mostrarExito && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#1a1a1a] border border-[#333] p-10 rounded-3xl flex flex-col items-center shadow-2xl scale-in-center border border-[#ff5a1f]/30">
             <div className="w-24 h-24 bg-green-500 rounded-full flex justify-center items-center mb-5 text-white text-5xl font-black shadow-inner shadow-green-900 shadow-xl">✓</div>
             <h2 className="text-3xl font-black text-white uppercase tracking-tight">Pedido Enviado</h2>
             <p className='text-neutral-500 mt-1 font-bold'>La cocina ya está en marcha.</p>
          </div>
        </div>
      )}

      {modalCobroAbierto && (
          <ModalCobro 
            isOpen={modalCobroAbierto} 
            onClose={() => setModalCobroAbierto(false)} 
            total={totalMesa} 
            carrito={ordenActiva ? ordenActiva.detalles : []} 
            onCobroExitoso={async (datosPago) => {
              try {
                let metodoParaDjango = datosPago[0].metodo;
                if (metodoParaDjango === 'yape') {
                    metodoParaDjango = 'yape_plin';
                }
                await crearPago({
                   orden: ordenActiva.id,
                   metodo: metodoParaDjango,
                   monto: datosPago[0].monto
                });
                
                await actualizarOrden(ordenActiva.id, { 
                  estado: 'completado', 
                  estado_pago: 'pagado',
                  pago_confirmado: true 
                });

                setModalCobroAbierto(false);
                vaciarStore();
                setCarritoAbierto(false);
                onVolver();
                
              } catch (error) {
                console.error("Error al cobrar", error);
                alert("Hubo un error al procesar el pago");
              }
            }}
          />
      )}
      
      {estadoCaja === 'cerrado' && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#111] p-10 rounded-3xl border border-red-500/20 shadow-2xl max-w-sm animate-slideUp">
            <span className="text-6xl mb-4 block">🔒</span>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Turno Cerrado</h2>
            <p className="text-neutral-400 mt-3 text-sm font-bold leading-relaxed">
              El administrador ha finalizado el turno. No se pueden procesar más pedidos.
            </p>
            <button 
              onClick={onVolver} 
              className="mt-8 w-full bg-[#ff5a1f] text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#e04a15] active:scale-95 transition-all"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      )}
      
      <ModalModificadores 
        isOpen={modalModsAbierto}
        onClose={() => setModalModsAbierto(false)}
        producto={productoParaModificar}
        modificadoresGlobales={["Sin cebolla", "Sin ají", "Para llevar", "Poco arroz", "Salsas aparte"]}
        onAgregarAlCarrito={manejarAgregarAlCarritoDesdeModal}
      />
    </>
  );
}