import React from 'react';
import { Package } from 'lucide-react';

export default function ComboPromoCard({
  combo,
  tema,
  colorPrimario,
  carrito,
  formatearSoles,
  onAgregar,
}) {
  const isDark = tema === 'dark';
  const enCarrito = carrito.filter(i => i.cart_id === `combo_promo_${combo.id}`)
    .reduce((sum, i) => sum + i.cantidad, 0);

  return (
    <div
      onClick={onAgregar}
      className={`relative p-3 sm:p-4 rounded-3xl transition-all flex flex-col text-left justify-between h-36 sm:h-44 border cursor-pointer ${
        isDark
          ? 'bg-[#141414] border-[#222] hover:border-[#444] hover:-translate-y-1'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:-translate-y-1'
      }`}
      style={{ borderColor: colorPrimario + '40' }}
    >
      {/* Badge promoción */}
      <div className="absolute top-3 left-3 z-10">
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg text-white"
          style={{ backgroundColor: colorPrimario }}>
          Promo
        </span>
      </div>

      {/* Imagen de fondo si existe */}
      {combo.imagen && (
        <div className="absolute inset-0 rounded-3xl overflow-hidden opacity-10">
          <img src={combo.imagen} alt={combo.nombre} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 mb-1 mt-6">
        <span className={`font-bold leading-tight text-[14px] sm:text-[16px] line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          {combo.nombre}
        </span>

        {/* Productos del combo */}
        <p className={`text-[9px] mt-1 truncate ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
          {combo.items?.map(i => i.producto_detalle?.nombre || '').filter(Boolean).join(' + ') || 'Combo especial'}
        </p>

        <p className="font-black text-xs sm:text-sm mt-auto pb-1" style={{ color: colorPrimario }}>
          <span className="text-[10px] mr-0.5 opacity-80">S/</span>
          {formatearSoles(parseFloat(combo.precio)).replace('S/ ', '')}
        </p>
      </div>

      <div className={`flex flex-row items-center justify-between gap-1.5 pt-2 border-t shrink-0 ${isDark ? 'border-[#222]' : 'border-gray-100'}`}>
        {enCarrito > 0 ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-black text-sm text-white"
              style={{ backgroundColor: colorPrimario }}>
              {enCarrito}
            </div>
            <span className={`text-[10px] font-bold ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>en cuenta</span>
          </div>
        ) : (
          <div className={`flex items-center gap-1.5 text-[10px] font-bold ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>
            <Package size={12} />
            <span>{combo.items?.length ?? 0} productos</span>
          </div>
        )}
      </div>
    </div>
  );
}