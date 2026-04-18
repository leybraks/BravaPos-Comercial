import React, { useState, useEffect } from 'react';
// ✨ 1. Importamos la tienda global
import usePosStore from './store/usePosStore'; // Ajusta esta ruta si es necesario

// Helper seguro para monedas
const formatearSoles = (monto) => `S/ ${parseFloat(monto || 0).toFixed(2)}`;

export default function ModalModificadores({ isOpen, onClose, producto, modificadoresGlobales = [], onAgregarAlCarrito }) {
  // ✨ 2. Extraemos la configuración visual
  const { configuracionGlobal } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';

  // --- ESTADOS ---
  const [cantidad, setCantidad] = useState(1);
  const [selecciones, setSelecciones] = useState({}); 
  const [chipsActivos, setChipsActivos] = useState([]); 
  const [notaLibre, setNotaLibre] = useState("");

  useEffect(() => {
    if (isOpen && producto) {
      if (producto.cart_id && producto.notas_y_modificadores) {
        setCantidad(producto.cantidad || 1);
        setSelecciones(producto.notas_y_modificadores.variaciones || {});
        setChipsActivos(producto.notas_y_modificadores.chips || []);
        setNotaLibre(producto.notas_y_modificadores.nota_libre || "");
      } else {
        setCantidad(1);
        setSelecciones({});
        setChipsActivos([]);
        setNotaLibre("");
      }
    }
  }, [isOpen, producto]);

  if (!isOpen || !producto) return null;

  // --- LÓGICA DE PRECIOS ---
  const precioBase = parseFloat(producto.precio_base || producto.precio || 0);
  
  let precioExtras = 0;
  Object.values(selecciones).forEach(opcionesSeleccionadas => {
    opcionesSeleccionadas.forEach(idOpcion => {
      producto.grupos_variacion?.forEach(grupo => {
        const opcion = grupo.opciones.find(opt => opt.id === idOpcion);
        if (opcion) precioExtras += parseFloat(opcion.precio_adicional || 0);
      });
    });
  });

  const precioUnitarioFinal = precioBase + precioExtras;
  const precioTotal = precioUnitarioFinal * cantidad;

  // --- MANEJADORES DE CLIC ---
  const toggleOpcion = (grupo, opcionId) => {
    setSelecciones(prev => {
      const actuales = prev[grupo.id] || [];
      if (grupo.seleccion_multiple) {
        if (actuales.includes(opcionId)) {
          return { ...prev, [grupo.id]: actuales.filter(id => id !== opcionId) };
        } else {
          return { ...prev, [grupo.id]: [...actuales, opcionId] };
        }
      } else {
        return { ...prev, [grupo.id]: [opcionId] };
      }
    });
  };

  const toggleChip = (nombreChip) => {
    setChipsActivos(prev => 
      prev.includes(nombreChip) 
        ? prev.filter(c => c !== nombreChip) 
        : [...prev, nombreChip]
    );
  };

  // --- VALIDACIÓN ---
  const todosLosObligatoriosListos = producto.grupos_variacion?.every(grupo => {
    if (!grupo.obligatorio) return true;
    const seleccionados = selecciones[grupo.id] || [];
    return seleccionados.length > 0;
  }) ?? true;

  // --- ENVIAR AL CARRITO ---
  const manejarAgregar = () => {
    const notasYModificadores = {
      variaciones: selecciones, 
      chips: chipsActivos,
      nota_libre: notaLibre
    };

    let textoCocina = [];
    Object.values(selecciones).forEach(opcionesSeleccionadas => {
      opcionesSeleccionadas.forEach(idOpcion => {
        producto.grupos_variacion?.forEach(g => {
          const opt = g.opciones.find(o => o.id === idOpcion);
          if (opt) textoCocina.push(opt.nombre);
        });
      });
    });
    if (chipsActivos.length > 0) textoCocina.push(...chipsActivos);
    if (notaLibre.trim()) textoCocina.push(`Nota: ${notaLibre.trim()}`);

    const esEdicion = !!producto.cart_id;

    const itemCarrito = {
      ...producto, 
      cart_id: esEdicion ? producto.cart_id : undefined, 
      precio: precioUnitarioFinal, 
      precio_unitario_calculado: precioUnitarioFinal,
      cantidad: cantidad,
      notas_y_modificadores: notasYModificadores,
      notas_cocina: textoCocina.join(" | ") 
    };

    onAgregarAlCarrito(itemCarrito, esEdicion);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 transition-all duration-300">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className={`relative border rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeInScale transition-colors ${
        tema === 'dark' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-[#f8f9fa] border-gray-200'
      }`}>
        
        {/* CABECERA */}
        <div className={`p-6 border-b flex justify-between items-start shrink-0 transition-colors ${
          tema === 'dark' ? 'border-[#222] bg-[#111]' : 'border-gray-200 bg-white'
        }`}>
          <div>
            <h2 className={`text-2xl font-black leading-tight ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {producto.nombre}
            </h2>
            
            {!(producto.requiere_seleccion && precioBase === 0) && (
              <p className={`font-bold text-sm mt-1 tracking-widest uppercase ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
                Precio Base: {formatearSoles(precioBase)}
              </p>
            )}
            
          </div>
          <button 
            onClick={onClose} 
            className={`w-10 h-10 rounded-xl flex justify-center items-center font-black text-lg transition-all active:scale-95 border ${
              tema === 'dark' 
                ? 'bg-[#222] border-[#333] text-neutral-400 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/30' 
                : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
            }`}
          >
            ✕
          </button>
        </div>

        {/* CUERPO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {/* 1. VARIACIONES (Grupos) */}
          {producto.grupos_variacion?.map(grupo => (
            <div key={grupo.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className={`font-black text-lg uppercase tracking-wider ${tema === 'dark' ? 'text-neutral-200' : 'text-gray-800'}`}>
                  {grupo.nombre}
                </h3>
                {grupo.obligatorio ? (
                  <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-red-500/20">Obligatorio</span>
                ) : (
                  <span className={`text-xs font-bold uppercase tracking-widest ${tema === 'dark' ? 'text-neutral-600' : 'text-gray-400'}`}>Opcional</span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {grupo.opciones.map(opcion => {
                  const estaSeleccionado = (selecciones[grupo.id] || []).includes(opcion.id);
                  const precioAdicional = parseFloat(opcion.precio_adicional);
                  
                  return (
                    <button
                      key={opcion.id}
                      onClick={() => toggleOpcion(grupo, opcion.id)}
                      className={`p-4 rounded-2xl border text-left flex justify-between items-center transition-all active:scale-95 ${
                        estaSeleccionado 
                          ? 'shadow-md' 
                          : (tema === 'dark' ? 'bg-[#151515] border-[#2a2a2a] hover:border-[#444] hover:bg-[#1a1a1a]' : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm')
                      }`}
                      style={estaSeleccionado ? { 
                        backgroundColor: `${colorPrimario}15`, // 15 es opacidad hex
                        borderColor: colorPrimario, 
                        boxShadow: `0 0 15px ${colorPrimario}30` 
                      } : {}}
                    >
                      <span className="font-bold text-sm transition-colors" style={estaSeleccionado ? { color: colorPrimario } : { color: tema === 'dark' ? '#d4d4d4' : '#4b5563' }}>
                        {opcion.nombre}
                      </span>
                      {precioAdicional > 0 && (
                        <span className={`font-mono text-xs font-bold ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
                          {precioBase === 0 ? formatearSoles(precioAdicional) : `+${formatearSoles(precioAdicional)}`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* 2. CHIPS RÁPIDOS */}
          <div className="space-y-3 pt-2">
            <h3 className={`font-black text-sm uppercase tracking-widest border-t pt-6 ${tema === 'dark' ? 'text-neutral-400 border-[#222]' : 'text-gray-500 border-gray-200'}`}>
              Notas Rápidas
            </h3>
            <div className="flex flex-wrap gap-2">
              {(modificadoresGlobales.length > 0 ? modificadoresGlobales : ["Sin cebolla", "Sin ensalada", "Poco arroz", "Bien cocido", "Para llevar"]).map(chip => {
                const nombreChip = chip.nombre || chip;
                const activo = chipsActivos.includes(nombreChip);
                return (
                  <button
                    key={nombreChip}
                    onClick={() => toggleChip(nombreChip)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                      activo 
                        ? 'text-white shadow-lg' 
                        : (tema === 'dark' ? 'bg-[#151515] border-[#2a2a2a] text-neutral-400 hover:text-white hover:border-[#444]' : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300 shadow-sm')
                    }`}
                    style={activo ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : {}}
                  >
                    {nombreChip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. TEXTO LIBRE */}
          <div className="space-y-3 pt-2">
            <h3 className={`font-black text-sm uppercase tracking-widest ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>
              Nota Personalizada
            </h3>
            <textarea 
              value={notaLibre}
              onChange={(e) => setNotaLibre(e.target.value)}
              placeholder="Ej: Alérgico al maní, por favor..."
              className={`w-full border rounded-2xl p-4 transition-colors resize-none h-24 font-medium text-sm outline-none ${
                tema === 'dark' 
                  ? 'bg-[#151515] border-[#2a2a2a] text-white placeholder-neutral-600' 
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 shadow-sm'
              }`}
              style={{ '--tw-ring-color': colorPrimario }}
              onFocus={(e) => e.target.style.borderColor = colorPrimario}
              onBlur={(e) => e.target.style.borderColor = tema === 'dark' ? '#2a2a2a' : '#e5e7eb'}
            ></textarea>
          </div>

        </div>

        {/* FOOTER FIXED */}
        <div className={`p-3 sm:p-5 border-t sticky bottom-0 left-0 w-full flex items-center gap-2 sm:gap-3 shrink-0 z-10 transition-colors ${
          tema === 'dark' ? 'border-[#222] bg-[#0d0d0d]' : 'border-gray-200 bg-white'
        }`}>
          
          {/* Selector de Cantidad */}
          <div className={`flex items-center gap-2 border p-1.5 rounded-xl shrink-0 ${
            tema === 'dark' ? 'bg-[#151515] border-[#2a2a2a]' : 'bg-gray-100 border-gray-200'
          }`}>
            <button 
              onClick={() => setCantidad(prev => Math.max(1, prev - 1))}
              className={`w-10 h-12 sm:w-12 sm:h-12 flex justify-center items-center rounded-lg transition-colors border ${
                tema === 'dark' 
                  ? 'bg-[#222] border-[#333] hover:bg-red-500/20 hover:text-red-500 text-white' 
                  : 'bg-white border-gray-200 hover:bg-red-50 hover:text-red-600 text-gray-800 shadow-sm'
              }`}
            >
              <span className="text-2xl font-black leading-none pb-1">-</span>
            </button>
            <span className={`font-black text-xl w-6 sm:w-8 text-center ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {cantidad}
            </span>
            <button 
              onClick={() => setCantidad(prev => prev + 1)}
              className={`w-10 h-12 sm:w-12 sm:h-12 flex justify-center items-center rounded-lg transition-colors border ${
                tema === 'dark' 
                  ? 'bg-[#222] border-[#333] hover:bg-green-500/20 hover:text-green-500 text-white' 
                  : 'bg-white border-gray-200 hover:bg-green-50 hover:text-green-600 text-gray-800 shadow-sm'
              }`}
            >
              <span className="text-2xl font-black leading-none pb-1">+</span>
            </button>
          </div>
          
          {/* Botón Principal PREMIUM */}
          <button 
            disabled={!todosLosObligatoriosListos}
            onClick={manejarAgregar}
            className={`flex-1 h-14 sm:h-16 rounded-xl font-black tracking-tighter transition-all flex justify-between items-center px-3 sm:px-6 overflow-hidden ${
              todosLosObligatoriosListos 
                ? 'text-white active:scale-95' 
                : (tema === 'dark' ? 'bg-[#222] text-neutral-500 cursor-not-allowed border border-[#333]' : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300')
            }`}
            style={todosLosObligatoriosListos ? { 
              backgroundColor: colorPrimario, 
              boxShadow: `0 4px 15px ${colorPrimario}40` 
            } : {}}
          >
            <span className="text-xs sm:text-lg uppercase truncate pr-2 text-left leading-tight">
              {!todosLosObligatoriosListos 
                  ? 'Falta Seleccionar' 
                  : (producto.cart_id ? 'Guardar Cambios' : 'Confirmar')}
            </span>
            
            {precioTotal > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-black/30 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shrink-0">
                  <span className="text-[9px] sm:text-[10px] text-white/80 tracking-widest uppercase hidden sm:block">Total</span>
                  <span className="font-mono text-sm sm:text-xl font-bold text-white">
                      {formatearSoles(precioTotal)}
                  </span>
              </div>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}