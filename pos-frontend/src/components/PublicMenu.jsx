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

  const colorPrimario = '#ff5a1f';
  const bgGlobal = '#0a0a0a';

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

  // ✨ LA FUNCIÓN TRADUCTORA: Convierte el JSON de la BD en texto legible para el cliente
  const formatearNotas = (notas) => {
    if (!notas) return null;
    // Si por alguna razón ya es texto, lo devolvemos tal cual
    if (typeof notas === 'string') return notas;
    
    // Si es el objeto JSON que estructuramos, lo unimos
    const partes = [];
    if (notas.variaciones && notas.variaciones.length > 0) partes.push(...notas.variaciones);
    if (notas.chips && notas.chips.length > 0) partes.push(...notas.chips);
    if (notas.nota_libre) partes.push(notas.nota_libre);
    
    return partes.length > 0 ? partes.join(' | ') : null;
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: colorPrimario, borderTopColor: 'transparent' }}></div>
      </div>
    );
  }

  const productosFiltrados = productos.filter(plato => {
    if (categoriaActiva === 'Todas') return true;
    const nombreCatDelPlato = categorias.find(c => String(c.id) === String(plato.categoria))?.nombre || plato.categoria;
    return nombreCatDelPlato === categoriaActiva;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-24">
      
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#222] p-4 flex justify-between items-center shadow-xl">
        <div>
          <h1 className="text-2xl font-black tracking-tight">BRAVA <span style={{ color: colorPrimario }}>POS</span></h1>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Local Digital</p>
        </div>
        <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1.5 rounded-lg text-xs font-black tracking-widest text-neutral-400">
          MESA {mesaId}
        </div>
      </header>

      <div className="flex p-4 gap-2">
        <button 
          onClick={() => setVistaActiva('menu')}
          className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${
            vistaActiva === 'menu' ? 'text-white' : 'bg-[#111] text-neutral-500 border border-[#222]'
          }`}
          style={vistaActiva === 'menu' ? { backgroundColor: colorPrimario } : {}}
        >
          🍔 La Carta
        </button>
        <button 
          onClick={() => setVistaActiva('cuenta')}
          className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all relative ${
            vistaActiva === 'cuenta' ? 'text-white' : 'bg-[#111] text-neutral-500 border border-[#222]'
          }`}
          style={vistaActiva === 'cuenta' ? { backgroundColor: colorPrimario } : {}}
        >
          🧾 Mi Cuenta
          {ordenActiva && vistaActiva !== 'cuenta' && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-[#0a0a0a]"></span>
          )}
        </button>
      </div>

      {vistaActiva === 'menu' && (
        <div className="animate-fadeIn">
          <div className="flex overflow-x-auto gap-2 px-4 pb-4 custom-scrollbar">
            <button 
              onClick={() => setCategoriaActiva('Todas')}
              className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                categoriaActiva === 'Todas' ? 'text-[#0a0a0a]' : 'bg-[#1a1a1a] text-neutral-400 border border-[#222]'
              }`}
              style={categoriaActiva === 'Todas' ? { backgroundColor: colorPrimario } : {}}
            >
              Todas
            </button>
            {categorias.map(cat => (
              <button 
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.nombre)}
                className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
                  categoriaActiva === cat.nombre ? 'text-[#0a0a0a]' : 'bg-[#1a1a1a] text-neutral-400 border border-[#222]'
                }`}
                style={categoriaActiva === cat.nombre ? { backgroundColor: colorPrimario } : {}}
              >
                {cat.nombre}
              </button>
            ))}
          </div>

          <div className="px-4 space-y-4">
            {productosFiltrados.map(plato => (
              <div key={plato.id} className="bg-[#111] border border-[#222] p-4 rounded-2xl flex gap-4 items-center">
                <div className="w-20 h-20 bg-[#1a1a1a] rounded-xl shrink-0 flex items-center justify-center border border-[#333]">
                  <span className="text-2xl">🍲</span>
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-white mb-1 leading-tight">{plato.nombre}</h3>
                  <p className="text-[10px] text-neutral-500 line-clamp-2 leading-relaxed">
                    Deliciosa preparación con la receta original de la casa.
                  </p>
                  <p className="font-black text-sm mt-2" style={{ color: colorPrimario }}>
                    S/ {parseFloat(plato.precio_base).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
            {productosFiltrados.length === 0 && (
              <p className="text-center text-neutral-500 py-10 text-sm">No hay productos en esta categoría.</p>
            )}
          </div>
        </div>
      )}

      {vistaActiva === 'cuenta' && (
        <div className="px-4 animate-fadeIn">
          {!ordenActiva ? (
            <div className="bg-[#111] border border-[#222] rounded-3xl p-8 text-center mt-4">
              <span className="text-4xl block mb-4">🍽️</span>
              <h2 className="text-lg font-bold text-white mb-2">Mesa libre</h2>
              <p className="text-sm text-neutral-500">
                Aún no has realizado ningún pedido. ¡Llama al mesero para ordenar!
              </p>
            </div>
          ) : (
            <div className="bg-[#111] border border-[#222] rounded-3xl p-5 mt-4">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-[#222]">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Estado de tu orden</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colorPrimario }}></span>
                    <span className="font-black text-sm text-white capitalize">{ordenActiva.estado}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-1">Orden #</p>
                  <p className="font-black text-sm text-white">{ordenActiva.id}</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {ordenActiva.detalles.map((detalle, idx) => {
                  // ✨ APLICAMOS LA FUNCIÓN TRADUCTORA AQUÍ
                  const notasTexto = formatearNotas(detalle.notas_y_modificadores);
                  
                  return (
                    <div key={idx} className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-white">
                          <span className="text-neutral-500 mr-2">{detalle.cantidad}x</span> 
                          {detalle.producto_nombre || detalle.producto?.nombre || 'Producto'}
                        </p>
                        {notasTexto && (
                          <p className="text-[10px] text-neutral-500 mt-1 ml-6 leading-tight">
                            ↳ {notasTexto}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-bold text-white ml-4 shrink-0">
                        S/ {(detalle.precio_unitario * detalle.cantidad).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-[#222] pt-4 flex justify-between items-center">
                <p className="text-sm uppercase tracking-widest text-neutral-500 font-black">Total a pagar</p>
                <p className="text-2xl font-black" style={{ color: colorPrimario }}>
                  S/ {parseFloat(ordenActiva.total).toFixed(2)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}