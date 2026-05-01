import React from 'react';
import ProductCard from './ProductCard';

export default function ProductGrid({
  productosFiltrados,
  tema,
  colorPrimario,
  carrito,
  categoriasReales,
  ordenActiva,
  totalMesa,
  busqueda,
  abrirModalParaNuevo,
  aprenderSeleccion,
  agregarProducto,
  restarDesdeGrid,
  notificarEstadoMesa,
  formatearSoles
}) {
  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-4 min-h-0">
      <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 relative z-0 pb-4">
        {productosFiltrados.map((prod) => (
          <ProductCard
            key={prod.id}
            prod={prod}
            tema={tema}
            colorPrimario={colorPrimario}
            carrito={carrito}
            categoriasReales={categoriasReales}
            ordenActiva={ordenActiva}
            totalMesa={totalMesa}
            busqueda={busqueda}
            abrirModalParaNuevo={abrirModalParaNuevo}
            aprenderSeleccion={aprenderSeleccion}
            agregarProducto={agregarProducto}
            restarDesdeGrid={restarDesdeGrid}
            notificarEstadoMesa={notificarEstadoMesa}
            formatearSoles={formatearSoles}
          />
        ))}
      </div>
    </div>
  );
}