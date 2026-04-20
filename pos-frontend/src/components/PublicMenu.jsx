import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getProductos, getCategorias, getOrdenes } from '../api/api';

export default function PublicMenu() {
  const { sedeId, mesaId } = useParams(); 
  
  const [vistaActiva, setVistaActiva] = useState('menu'); 
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [ordenActiva, setOrdenActiva] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Paleta de colores Premium
  const colorPrimario = '#ff5a1f';
  const colorFondo = '#050505'; // Negro más profundo
  const colorTarjeta = '#121212'; // Gris muy oscuro para contraste
  const colorBorde = '#262626';

  useEffect(() => {
    const cargarData = async () => {
      try {
        const [resProductos, resCategorias, resOrdenes] = await Promise.all([
          getProductos({ sede_id: sedeId }),
          getCategorias(),
          getOrdenes({ sede_id: sedeId }) 
        ]);

        setProductos(resProductos.data.filter(p => p.disponible && p.activo));
        setCategorias(resCategorias.data);

        const ordenViva = resOrdenes.data.find(o => 
          String(o.mesa) === String(mesaId) && 
          o.estado !== 'cancelado' && 
          o.estado_pago !== 'pagado'
        );
        
        setOrdenActiva(ordenViva || null);
      } catch (error) {
        console.error("Error al cargar la carta digital:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarData();
    const intervalo = setInterval(cargarData, 30000);
    return () => clearInterval(intervalo);
  }, [sedeId, mesaId]);

  const formatearNotas = (notas) => {
    if (!notas) return null;
    if (typeof notas === 'string') return notas;
    const partes = [];
    if (notas.variaciones && notas.variaciones.length > 0) partes.push(...notas.variaciones);
    if (notas.chips && notas.chips.length > 0) partes.push(...notas.chips);
    if (notas.nota_libre) partes.push(notas.nota_libre);
    return partes.length > 0 ? partes.join(', ') : null;
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colorFondo }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: colorPrimario, borderTopColor: 'transparent' }}></div>
          <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs animate-pulse">Preparando la mesa...</p>
        </div>
      </div>
    );
  }

  const productosFiltrados = productos.filter(plato => {
    if (categoriaActiva === 'Todas') return true;
    const nombreCatDelPlato = categorias.find(c => String(c.id) === String(plato.categoria))?.nombre || plato.categoria;
    return nombreCatDelPlato === categoriaActiva;
  });

  return (
    <div className="min-h-screen text-white font-sans pb-24 selection:bg-[#ff5a1f] selection:text-white" style={{ backgroundColor: colorFondo }}>
      
      {/* HEADER GLASSMORPHISM */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-[#262626] p-5 flex justify-between items-center transition-all">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black tracking-tighter leading-none">
            BRAVA<span style={{ color: colorPrimario }}>.</span>
          </h1>
          <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-[0.3em] mt-1">Menú Digital</p>
        </div>
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#333] px-4 py-2 rounded-2xl shadow-inner">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorPrimario, boxShadow: `0 0 10px ${colorPrimario}` }}></span>
          <span className="text-xs font-black tracking-widest text-white">MESA {mesaId}</span>
        </div>
      </header>

      {/* NAVEGACIÓN PRINCIPAL (TABS) */}
      <div className="p-5">
        <div className="flex bg-[#121212] p-1.5 rounded-2xl border border-[#262626] shadow-lg">
          <button 
            onClick={() => setVistaActiva('menu')} 
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${vistaActiva === 'menu' ? 'shadow-md scale-[0.98]' : 'text-neutral-500 hover:text-white'}`} 
            style={vistaActiva === 'menu' ? { backgroundColor: colorPrimario, color: 'white' } : {}}
          >
            Nuestra Carta
          </button>
          <button 
            onClick={() => setVistaActiva('cuenta')} 
            className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 relative ${vistaActiva === 'cuenta' ? 'shadow-md scale-[0.98]' : 'text-neutral-500 hover:text-white'}`} 
            style={vistaActiva === 'cuenta' ? { backgroundColor: colorPrimario, color: 'white' } : {}}
          >
            Mi Cuenta
            {ordenActiva && vistaActiva !== 'cuenta' && (
              <span className="absolute top-2 right-2 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: colorPrimario }}></span>
                <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: colorPrimario }}></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ===================== VISTA 1: LA CARTA ===================== */}
      {vistaActiva === 'menu' && (
        <div className="animate-fadeIn">
          
          {/* CATEGORÍAS (PÍLDORAS) */}
          <div className="flex overflow-x-auto gap-3 px-5 pb-6 pt-2 custom-scrollbar mask-fade-edges">
            <button 
              onClick={() => setCategoriaActiva('Todas')} 
              className={`px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${categoriaActiva === 'Todas' ? 'text-white shadow-lg' : 'bg-[#121212] text-neutral-400 border border-[#262626] hover:border-neutral-500'}`} 
              style={categoriaActiva === 'Todas' ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : {}}
            >
              Todas
            </button>
            {categorias.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setCategoriaActiva(cat.nombre)} 
                className={`px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${categoriaActiva === cat.nombre ? 'text-white shadow-lg' : 'bg-[#121212] text-neutral-400 border border-[#262626] hover:border-neutral-500'}`} 
                style={categoriaActiva === cat.nombre ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : {}}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          {/* GRID DE PRODUCTOS */}
          <div className="px-5 space-y-6">
            {productosFiltrados.map(plato => {
              const gruposObligatorios = plato.grupos_variacion?.filter(g => g.obligatorio) || [];
              const gruposOpcionales = plato.grupos_variacion?.filter(g => !g.obligatorio) || [];
              const esSoloSeleccion = plato.requiere_seleccion && parseFloat(plato.precio_base) === 0;

              return (
                <div key={plato.id} className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-2xl transition-all hover:border-[#404040]">
                  
                  {/* Fila Principal: Imagen + Info */}
                  <div className="p-5 flex gap-4 items-start">
                    {/* Imagen Premium */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-2xl shrink-0 flex items-center justify-center border border-[#333] shadow-inner relative overflow-hidden">
                      <span className="text-4xl filter drop-shadow-md">🍲</span>
                      <div className="absolute inset-0 bg-black/10"></div>
                    </div>
                    
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-black text-lg text-white leading-tight tracking-tight">{plato.nombre}</h3>
                        {!esSoloSeleccion && (
                          <span className="font-black text-base whitespace-nowrap" style={{ color: colorPrimario }}>
                            S/ {parseFloat(plato.precio_base).toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-neutral-400 leading-relaxed line-clamp-2">
                        Exquisita preparación de la casa con ingredientes seleccionados.
                      </p>
                    </div>
                  </div>

                  {/* ZONA DE VARIACIONES (Si existen) */}
                  {(gruposObligatorios.length > 0 || gruposOpcionales.length > 0) && (
                    <div className="px-5 pb-5 pt-2 border-t border-[#1a1a1a] bg-[#0a0a0a]/50">
                      
                      {/* OBLIGATORIOS (Tallas/Tamaños) - Estilo Lista Limpia */}
                      {gruposObligatorios.map((grupo, gIdx) => (
                        <div key={gIdx} className="mb-4 last:mb-0 mt-3">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-3">{grupo.nombre}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {grupo.opciones.map((opc, idx) => (
                              <div key={idx} className="flex justify-between items-center bg-[#161616] border border-[#2a2a2a] px-4 py-3 rounded-xl">
                                <span className="text-sm font-bold text-neutral-300">{opc.nombre}</span>
                                <span className="font-mono font-bold text-white text-sm">
                                  {parseFloat(opc.precio_adicional) > 0 ? `S/ ${parseFloat(opc.precio_adicional).toFixed(2)}` : 'Incluido'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* OPCIONALES (Extras) - Estilo Chips/Etiquetas */}
                      {gruposOpcionales.length > 0 && (
                        <div className="mt-4">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-3">Personaliza tu plato</p>
                          <div className="flex flex-wrap gap-2">
                            {gruposOpcionales.map(g => g.opciones.map((opc, idx) => (
                              <div key={idx} className="bg-transparent border border-[#333] pl-3 pr-1 py-1 rounded-full flex items-center gap-2">
                                <span className="text-xs font-bold text-neutral-400">{opc.nombre}</span>
                                <span className="bg-[#1a1a1a] text-[10px] font-black px-2 py-1 rounded-full" style={{ color: colorPrimario }}>
                                  + S/ {parseFloat(opc.precio_adicional).toFixed(2)}
                                </span>
                              </div>
                            )))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}

            {productosFiltrados.length === 0 && (
              <div className="text-center py-20">
                <span className="text-4xl block mb-4 opacity-50">🍽️</span>
                <p className="text-neutral-400 font-bold text-lg">No hay productos aquí</p>
                <p className="text-neutral-600 text-sm mt-2">Prueba seleccionando otra categoría.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== VISTA 2: MI CUENTA (EL TICKET) ===================== */}
      {vistaActiva === 'cuenta' && (
        <div className="px-5 animate-fadeIn pb-10">
          {!ordenActiva ? (
            <div className="bg-[#121212] border border-[#262626] rounded-3xl p-10 text-center mt-6 shadow-2xl flex flex-col items-center">
              <div className="w-24 h-24 bg-[#1a1a1a] rounded-full flex items-center justify-center mb-6 border border-[#333]">
                <span className="text-5xl">🥂</span>
              </div>
              <h2 className="text-2xl font-black text-white mb-3 tracking-tight">Mesa Disponible</h2>
              <p className="text-neutral-500 text-sm leading-relaxed max-w-[250px]">
                Aún no has ordenado. Llama a un miembro de nuestro equipo para hacer tu pedido.
              </p>
            </div>
          ) : (
            // EL TICKET DE RESTAURANTE
            <div className="bg-[#121212] rounded-3xl mt-6 shadow-2xl overflow-hidden relative border border-[#262626]">
              {/* Borde superior de color */}
              <div className="h-2 w-full" style={{ backgroundColor: colorPrimario }}></div>
              
              <div className="p-6 sm:p-8">
                {/* Cabecera del Ticket */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-white mb-1">Tu Cuenta</h2>
                    <p className="text-xs text-neutral-500 font-mono">TICKET #{ordenActiva.id.toString().padStart(4, '0')}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-2">Estado</span>
                    <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1.5 rounded-lg flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colorPrimario }}></span>
                      <span className="text-xs font-black text-white uppercase">{ordenActiva.estado}</span>
                    </div>
                  </div>
                </div>

                {/* Lista de Consumo */}
                <div className="space-y-6">
                  {ordenActiva.detalles.map((detalle, idx) => {
                    const notasTexto = formatearNotas(detalle.notas_y_modificadores);
                    return (
                      <div key={idx} className="flex justify-between items-start group">
                        <div className="flex-1 pr-4">
                          <div className="flex items-start gap-3">
                            <span className="bg-[#1a1a1a] text-white text-xs font-black px-2 py-1 rounded-md border border-[#333]">
                              {detalle.cantidad}
                            </span>
                            <div>
                              <p className="text-base font-bold text-white leading-tight pt-0.5">
                                {detalle.producto_nombre || detalle.producto?.nombre || 'Producto'}
                              </p>
                              {notasTexto && (
                                <p className="text-[11px] text-neutral-400 mt-1.5 leading-snug">
                                  {notasTexto}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <p className="text-base font-bold text-white pt-0.5 whitespace-nowrap">
                          S/ {(detalle.precio_unitario * detalle.cantidad).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Separador punteado estilo ticket */}
                <div className="my-8 border-t-2 border-dashed border-[#333] relative">
                  <div className="absolute -top-3 -left-9 w-6 h-6 bg-[#050505] rounded-full border-r border-[#262626]"></div>
                  <div className="absolute -top-3 -right-9 w-6 h-6 bg-[#050505] rounded-full border-l border-[#262626]"></div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-end">
                  <p className="text-sm uppercase tracking-[0.15em] text-neutral-400 font-bold">Total a pagar</p>
                  <p className="text-4xl font-black tracking-tighter" style={{ color: colorPrimario }}>
                    <span className="text-2xl mr-1 opacity-80">S/</span>
                    {parseFloat(ordenActiva.total).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}