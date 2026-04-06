import React, { useState, useEffect } from 'react';

// Helper seguro para monedas
const formatearSoles = (monto) => `S/ ${parseFloat(monto || 0).toFixed(2)}`;

export default function ModalModificadores({ isOpen, onClose, producto, modificadoresGlobales = [], onAgregarAlCarrito }) {
  // --- ESTADOS ---
  const [cantidad, setCantidad] = useState(1);
  const [selecciones, setSelecciones] = useState({}); // { id_grupo: [id_opcion1, id_opcion2] }
  const [chipsActivos, setChipsActivos] = useState([]); // ["Sin cebolla", "Poco arroz"]
  const [notaLibre, setNotaLibre] = useState("");

  // Reiniciar el modal cada vez que se abre con un producto nuevo
  useEffect(() => {
    if (isOpen && producto) {
      setCantidad(1);
      setSelecciones({});
      setChipsActivos([]);
      setNotaLibre("");
    }
  }, [isOpen, producto]);

  if (!isOpen || !producto) return null;

  // --- LÓGICA DE PRECIOS ---
  const precioBase = parseFloat(producto.precio_base || producto.precio || 0);
  
  // Calcular cuánto suman los extras seleccionados
  let precioExtras = 0;
  Object.values(selecciones).forEach(opcionesSeleccionadas => {
    opcionesSeleccionadas.forEach(idOpcion => {
      // Buscar la opción en los grupos del producto para saber su precio
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
        // Si es múltiple (Ej: Cremas), agregamos o quitamos del array
        if (actuales.includes(opcionId)) {
          return { ...prev, [grupo.id]: actuales.filter(id => id !== opcionId) };
        } else {
          return { ...prev, [grupo.id]: [...actuales, opcionId] };
        }
      } else {
        // Si NO es múltiple (Ej: Tamaño), reemplazamos el valor
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
  // Revisamos si el mesero ya seleccionó todo lo obligatorio
  const todosLosObligatoriosListos = producto.grupos_variacion?.every(grupo => {
    if (!grupo.obligatorio) return true;
    const seleccionados = selecciones[grupo.id] || [];
    return seleccionados.length > 0;
  }) ?? true;

  // --- ENVIAR AL CARRITO ---
  const manejarAgregar = () => {
    // Armamos el JSON hermoso para Django
    const notasYModificadores = {
      variaciones: selecciones, // Mandamos los IDs para que Django o React sepan qué se eligió
      chips: chipsActivos,
      nota_libre: notaLibre
    };

    // Armamos el texto plano para el KDS (Cocina)
    let textoCocina = [];
    
    // 1. Textos de variaciones (Ej: "Familiar", "Extra Queso")
    Object.values(selecciones).forEach(opcionesSeleccionadas => {
      opcionesSeleccionadas.forEach(idOpcion => {
        producto.grupos_variacion?.forEach(g => {
          const opt = g.opciones.find(o => o.id === idOpcion);
          if (opt) textoCocina.push(opt.nombre);
        });
      });
    });
    // 2. Textos de chips
    if (chipsActivos.length > 0) textoCocina.push(...chipsActivos);
    // 3. Nota libre
    if (notaLibre.trim()) textoCocina.push(`Nota: ${notaLibre.trim()}`);

    // Construimos el item final para el carrito
    const itemCarrito = {
      ...producto, 
      cart_id: `${producto.id}_${Date.now()}`, 
      
      // ✨ EL TRUCO: Sobrescribimos el precio original (0) con el precio real calculado
      precio: precioUnitarioFinal, 
      
      precio_unitario_calculado: precioUnitarioFinal,
      cantidad: cantidad,
      notas_y_modificadores: notasYModificadores,
      notas_cocina: textoCocina.join(" | ") 
    };

    onAgregarAlCarrito(itemCarrito);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 transition-all duration-300">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-[#0a0a0a] border border-[#222] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeInScale">
        
        {/* CABECERA */}
        <div className="p-6 border-b border-[#222] bg-[#111] flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-2xl font-black text-white leading-tight">{producto.nombre}</h2>
            
            {/* ✨ MAGIA VISUAL: Solo mostramos el precio base si NO es cero o si no requiere selección */}
            {!(producto.requiere_seleccion && precioBase === 0) && (
              <p className="text-neutral-500 font-bold text-sm mt-1 tracking-widest uppercase">
                Precio Base: {formatearSoles(precioBase)}
              </p>
            )}
            
          </div>
          <button onClick={onClose} className="w-10 h-10 bg-[#222] hover:bg-red-500/20 hover:text-red-500 rounded-xl flex justify-center items-center font-black text-lg transition-all active:scale-95 border border-[#333]">
            ✕
          </button>
        </div>

        {/* CUERPO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {/* 1. VARIACIONES (Grupos) */}
          {producto.grupos_variacion?.map(grupo => (
            <div key={grupo.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-neutral-200 text-lg uppercase tracking-wider">{grupo.nombre}</h3>
                {grupo.obligatorio ? (
                  <span className="bg-red-500/10 text-red-500 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest border border-red-500/20">Obligatorio</span>
                ) : (
                  <span className="text-neutral-600 text-xs font-bold uppercase tracking-widest">Opcional</span>
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
                          ? 'bg-[#ff5a1f]/10 border-[#ff5a1f] shadow-[0_0_15px_rgba(255,90,31,0.15)]' 
                          : 'bg-[#151515] border-[#2a2a2a] hover:border-[#444] hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <span className={`font-bold text-sm ${estaSeleccionado ? 'text-[#ff5a1f]' : 'text-neutral-300'}`}>
                        {opcion.nombre}
                      </span>
                      {precioAdicional > 0 && (
                        <span className="text-neutral-500 font-mono text-xs font-bold">
                          +{formatearSoles(precioAdicional)}
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
            <h3 className="font-black text-neutral-400 text-sm uppercase tracking-widest border-t border-[#222] pt-6">Notas Rápidas</h3>
            <div className="flex flex-wrap gap-2">
              {/* Si no tienes modificadores en BD aún, usamos estos de prueba */}
              {(modificadoresGlobales.length > 0 ? modificadoresGlobales : ["Sin cebolla", "Sin ensalada", "Poco arroz", "Bien cocido", "Para llevar"]).map(chip => {
                const nombreChip = chip.nombre || chip; // Soporta objetos de DB o strings de prueba
                const activo = chipsActivos.includes(nombreChip);
                return (
                  <button
                    key={nombreChip}
                    onClick={() => toggleChip(nombreChip)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                      activo 
                        ? 'bg-[#ff5a1f] border-[#ff5a1f] text-white shadow-lg' 
                        : 'bg-[#151515] border-[#2a2a2a] text-neutral-400 hover:text-white hover:border-[#444]'
                    }`}
                  >
                    {nombreChip}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. TEXTO LIBRE */}
          <div className="space-y-3 pt-2">
            <h3 className="font-black text-neutral-400 text-sm uppercase tracking-widest">Nota Personalizada</h3>
            <textarea 
              value={notaLibre}
              onChange={(e) => setNotaLibre(e.target.value)}
              placeholder="Ej: Alérgico al maní, por favor..."
              className="w-full bg-[#151515] border border-[#2a2a2a] rounded-2xl p-4 text-white placeholder-neutral-600 focus:outline-none focus:border-[#ff5a1f] transition-colors resize-none h-24 font-medium text-sm"
            ></textarea>
          </div>

        </div>

        {/* FOOTER FIXED: Diseño arreglado, responsivo, precio integrado en el botón */}
        <div className="p-3 sm:p-5 border-t border-[#222] bg-[#0d0d0d] sticky bottom-0 left-0 w-full flex items-center gap-2 sm:gap-3 shrink-0 z-10">
          
          {/* Selector de Cantidad */}
          <div className="flex items-center gap-2 bg-[#151515] border border-[#2a2a2a] p-1.5 rounded-xl shrink-0">
            <button 
              onClick={() => setCantidad(prev => Math.max(1, prev - 1))}
              className="w-10 h-12 sm:w-12 sm:h-12 flex justify-center items-center bg-[#222] rounded-lg hover:bg-red-500/20 hover:text-red-500 text-white transition-colors border border-[#333]"
            >
              <span className="text-2xl font-black leading-none pb-1">-</span>
            </button>
            <span className="font-black text-xl w-6 sm:w-8 text-center text-white">{cantidad}</span>
            <button 
              onClick={() => setCantidad(prev => prev + 1)}
              className="w-10 h-12 sm:w-12 sm:h-12 flex justify-center items-center bg-[#222] rounded-lg hover:bg-green-500/20 hover:text-green-500 text-white transition-colors border border-[#333]"
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
                ? 'bg-[#ff5a1f] hover:bg-[#e04a15] text-white active:scale-95 shadow-lg shadow-[#ff5a1f]/20' 
                : 'bg-[#222] text-neutral-500 cursor-not-allowed border border-[#333]'
            }`}
          >
            {/* Texto adaptable (si es muy largo se cortará con puntos suspensivos en lugar de desbordarse) */}
            <span className="text-xs sm:text-lg uppercase truncate pr-2 text-left leading-tight">
              {todosLosObligatoriosListos ? 'Confirmar' : 'Agregar'}
            </span>
            
            {/* Caja de Precio Inamovible */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-black/40 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg shrink-0">
                <span className="text-[9px] sm:text-[10px] text-neutral-300 tracking-widest uppercase hidden sm:block">Total</span>
                <span className="font-mono text-sm sm:text-xl font-bold">
                    {formatearSoles(precioTotal)}
                </span>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}