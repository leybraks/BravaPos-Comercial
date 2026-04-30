import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getMenuPublico, getOrdenPublica } from '../../api/api';

// ─────────────────────────────────────────────────────────────
// Helper: obtiene carta_config del negocio (endpoint público)
// Se llama junto con getMenuPublico para no añadir round-trips.
// El backend ya devuelve carta_config dentro de menu_publico.
// Si no viene, usamos defaults seguros.
// ─────────────────────────────────────────────────────────────
const DEFAULTS_CARTA = {
  nombreNegocio:    '',
  slogan:           '',
  logoUrl:          '',
  colorAcento:      '#ff5a1f',
  fondoTipo:        'negro',
  fondoColorCustom: '#080808',
  fondoImagenUrl:   '',
  opacidadOverlay:  70,
  fuenteTitulos:    'playfair',
  fuenteCuerpo:     'poppins',
  estiloTarjeta:    'minimal',
  mostrarDesc:      true,
  mostrarCalor:     false,
  mostrarBadge:     true,
  mostrarImagenes:  true,
  esquinas:         true,
};

const FONDOS_COLOR = {
  negro:   '#080808',
  crema:   '#faf6f0',
  pizarra: '#1c1f26',
  vino:    '#1a0a0a',
  oliva:   '#0f1a0d',
};

const FUENTES_FAMILIA = {
  playfair: "'Playfair Display', serif",
  poppins:  "'Poppins', sans-serif",
  lora:     "'Lora', serif",
  oswald:   "'Oswald', sans-serif",
  dancing:  "'Dancing Script', cursive",
};

// ─────────────────────────────────────────────────────────────
// Estilos de tarjeta
// ─────────────────────────────────────────────────────────────
function getTarjetaClases(estilo, esquinas) {
  const r = esquinas ? 'rounded-3xl' : 'rounded-xl';
  const base = `overflow-hidden shadow-2xl transition-all ${r}`;
  switch (estilo) {
    case 'gourmet': return `${base} bg-black/60 border border-white/10 backdrop-blur-sm hover:border-white/20`;
    case 'bistro':  return `${base} bg-white/5 border border-white/10 border-l-4 hover:border-l-white/30`;
    case 'moderno': return `${base} bg-white/10 hover:bg-white/15`;
    default:        return `${base} bg-[#121212] border border-[#262626] hover:border-[#404040]`; // minimal
  }
}

// ─────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────
export default function PublicMenu() {
  const { negocioId, sedeId, mesaId } = useParams();

  const [vistaActiva,      setVistaActiva]      = useState('menu');
  const [categoriaActiva,  setCategoriaActiva]  = useState('Todas');
  const [productos,        setProductos]        = useState([]);
  const [categorias,       setCategorias]       = useState([]);
  const [ordenActiva,      setOrdenActiva]      = useState(null);
  const [cargando,         setCargando]         = useState(true);
  const [carta,            setCarta]            = useState(DEFAULTS_CARTA);

  // ── Carga inicial + polling de 30s ──
  useEffect(() => {
    const cargarData = async () => {
      try {
        const [resMenu, resOrden] = await Promise.all([
          getMenuPublico(sedeId),
          getOrdenPublica(sedeId, mesaId),
        ]);

        setProductos(resMenu.data.productos  || []);
        setCategorias(resMenu.data.categorias || []);
        setOrdenActiva(resOrden.data.orden   || null);

        // ── Aplicar carta_config si el backend la devuelve ──
        // Asegúrate de que menu_publico devuelva carta_config en su response.
        // Ver nota en publico_views.py al final de este archivo.
        if (resMenu.data.carta_config && Object.keys(resMenu.data.carta_config).length > 0) {
          setCarta(prev => ({
            ...prev,
            ...resMenu.data.carta_config,
            // nombre del negocio viene de otro campo, lo preservamos como fallback
            nombreNegocio: resMenu.data.carta_config.nombreNegocio || resMenu.data.negocio_nombre || prev.nombreNegocio,
          }));
        } else {
          // Sin config guardada: al menos seteamos el nombre del negocio
          setCarta(prev => ({ ...prev, nombreNegocio: resMenu.data.negocio_nombre || prev.nombreNegocio }));
        }
      } catch (error) {
        console.error('Error al cargar la carta digital:', error);
      } finally {
        setCargando(false);
      }
    };

    cargarData();
    const intervalo = setInterval(cargarData, 30000);
    return () => clearInterval(intervalo);
  }, [sedeId, mesaId]);

  // ── Computed de la carta_config ──
  const colorAcento   = carta.colorAcento   || '#ff5a1f';
  const fuenteTitulos = FUENTES_FAMILIA[carta.fuenteTitulos] || FUENTES_FAMILIA.playfair;
  const fuenteCuerpo  = FUENTES_FAMILIA[carta.fuenteCuerpo]  || FUENTES_FAMILIA.poppins;
  const esquinas      = carta.esquinas !== false;

  // Fondo: imagen, color custom, o preset
  const bgFondo = (() => {
    if (carta.fondoTipo === 'custom' && carta.fondoImagenUrl)
      return { backgroundImage: `url(${carta.fondoImagenUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    if (carta.fondoTipo === 'custom')
      return { backgroundColor: carta.fondoColorCustom || '#111' };
    return { backgroundColor: FONDOS_COLOR[carta.fondoTipo] || '#080808' };
  })();

  // Overlay de oscuridad sobre la imagen/fondo
  const overlayStyle = {
    background: `rgba(0,0,0,${(carta.opacidadOverlay ?? 70) / 100})`,
    minHeight: '100vh',
  };

  // ── Filtro de productos ──
  const productosFiltrados = productos.filter(plato => {
    if (categoriaActiva === 'Todas') return true;
    const nombreCat = categorias.find(c => String(c.id) === String(plato.categoria))?.nombre || plato.categoria;
    return nombreCat === categoriaActiva;
  });

  // ── Helper notas ──
  const formatearNotas = (notas) => {
    if (!notas) return null;
    if (typeof notas === 'string') return notas;
    const partes = [];
    if (notas.variaciones?.length > 0) partes.push(...notas.variaciones);
    if (notas.chips?.length > 0)       partes.push(...notas.chips);
    if (notas.nota_libre)              partes.push(notas.nota_libre);
    return partes.length > 0 ? partes.join(', ') : null;
  };

  // ── Spinner de carga ──
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#050505' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#ff5a1f', borderTopColor: 'transparent' }}
          />
          <p className="text-neutral-500 font-bold tracking-widest uppercase text-xs animate-pulse">
            Preparando la mesa...
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <>
      {/* Google Fonts dinámicas según la config guardada */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&family=Oswald:wght@400;700&family=Dancing+Script:wght@700&family=Poppins:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Fondo base (imagen o color) */}
      <div style={{ ...bgFondo, minHeight: '100vh' }}>
        {/* Overlay de oscuridad */}
        <div style={overlayStyle} className="text-white font-sans pb-24 selection:bg-[#ff5a1f] selection:text-white">

          {/* ════════ HEADER ════════ */}
          <header
            className="sticky top-0 z-50 backdrop-blur-xl border-b p-5 flex justify-between items-center transition-all"
            style={{ background: `rgba(0,0,0,0.75)`, borderColor: '#262626' }}
          >
            <div className="flex items-center gap-3">
              {/* Logo si existe */}
              {carta.logoUrl ? (
                <img
                  src={carta.logoUrl}
                  alt="logo"
                  className="w-10 h-10 object-contain rounded-xl shrink-0"
                  style={{ background: colorAcento + '22' }}
                />
              ) : null}
              <div>
                <h1
                  className="text-2xl font-black tracking-tighter leading-none"
                  style={{ fontFamily: fuenteTitulos }}
                >
                  {carta.nombreNegocio || 'Menú'}<span style={{ color: colorAcento }}>.</span>
                </h1>
                {carta.slogan ? (
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] mt-0.5" style={{ color: colorAcento + 'aa', fontFamily: fuenteCuerpo }}>
                    {carta.slogan}
                  </p>
                ) : (
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-[0.3em] mt-1">Menú Digital</p>
                )}
              </div>
            </div>

            {/* Badge de mesa */}
            <div className="flex items-center gap-2 bg-black/60 border border-[#333] px-4 py-2 rounded-2xl shadow-inner">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: colorAcento, boxShadow: `0 0 10px ${colorAcento}` }}
              />
              <span className="text-xs font-black tracking-widest text-white">MESA {mesaId}</span>
            </div>
          </header>

          {/* ════════ TABS PRINCIPALES ════════ */}
          <div className="p-5">
            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-[#262626] shadow-lg">
              <button
                onClick={() => setVistaActiva('menu')}
                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                  vistaActiva === 'menu' ? 'shadow-md scale-[0.98]' : 'text-neutral-500 hover:text-white'
                }`}
                style={vistaActiva === 'menu' ? { backgroundColor: colorAcento, color: 'white' } : {}}
              >
                Nuestra Carta
              </button>
              <button
                onClick={() => setVistaActiva('cuenta')}
                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-300 relative ${
                  vistaActiva === 'cuenta' ? 'shadow-md scale-[0.98]' : 'text-neutral-500 hover:text-white'
                }`}
                style={vistaActiva === 'cuenta' ? { backgroundColor: colorAcento, color: 'white' } : {}}
              >
                Mi Cuenta
                {/* Punto pulsante si hay orden activa */}
                {ordenActiva && vistaActiva !== 'cuenta' && (
                  <span className="absolute top-2 right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: colorAcento }} />
                    <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: colorAcento }} />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════
              VISTA 1: LA CARTA
          ══════════════════════════════════════ */}
          {vistaActiva === 'menu' && (
            <div className="animate-fadeIn">

              {/* Separador de acento */}
              <div className="mx-5 mb-4 h-px" style={{ background: `linear-gradient(to right, ${colorAcento}44, transparent)` }} />

              {/* CATEGORÍAS — píldoras horizontales */}
              <div className="flex overflow-x-auto gap-3 px-5 pb-6 pt-2 custom-scrollbar mask-fade-edges">
                <button
                  onClick={() => setCategoriaActiva('Todas')}
                  className={`px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                    categoriaActiva === 'Todas'
                      ? 'text-white shadow-lg'
                      : 'bg-black/40 text-neutral-400 border border-[#262626] hover:border-neutral-500'
                  }`}
                  style={categoriaActiva === 'Todas' ? { backgroundColor: colorAcento } : {}}
                >
                  Todas
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaActiva(cat.nombre)}
                    className={`px-6 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                      categoriaActiva === cat.nombre
                        ? 'text-white shadow-lg'
                        : 'bg-black/40 text-neutral-400 border border-[#262626] hover:border-neutral-500'
                    }`}
                    style={categoriaActiva === cat.nombre ? { backgroundColor: colorAcento } : {}}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>

              {/* GRID DE PRODUCTOS */}
              <div className="px-5 space-y-4">
                {productosFiltrados.map(plato => {
                  const gruposObligatorios = plato.grupos_variacion?.filter(g => g.obligatorio)  || [];
                  const gruposOpcionales   = plato.grupos_variacion?.filter(g => !g.obligatorio) || [];
                  const esSoloSeleccion    = plato.requiere_seleccion && parseFloat(plato.precio_base) === 0;
                  const tarjetaCls         = getTarjetaClases(carta.estiloTarjeta, esquinas);
                  const bistroColor        = carta.estiloTarjeta === 'bistro' ? { borderLeftColor: colorAcento } : {};

                  return (
                    <div key={plato.id} className={tarjetaCls} style={bistroColor}>

                      {/* Fila principal: imagen + info */}
                      <div className="p-5 flex gap-4 items-start">

                        {/* Imagen / placeholder */}
                        {carta.mostrarImagenes !== false && (
                          <div
                            className={`w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center border shadow-inner relative overflow-hidden ${esquinas ? 'rounded-2xl' : 'rounded-lg'}`}
                            style={{ background: `linear-gradient(135deg, ${colorAcento}11, #0a0a0a)`, borderColor: '#333' }}
                          >
                            <span className="text-4xl filter drop-shadow-md">🍲</span>
                            <div className="absolute inset-0 bg-black/10" />
                          </div>
                        )}

                        <div className="flex-1 pt-1">
                          {/* Nombre + precio */}
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h3
                              className="font-black text-lg text-white leading-tight tracking-tight"
                              style={{ fontFamily: fuenteTitulos }}
                            >
                              {plato.nombre}
                            </h3>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {!esSoloSeleccion && (
                                <span
                                  className="font-black text-base whitespace-nowrap"
                                  style={{ color: colorAcento, fontFamily: fuenteTitulos }}
                                >
                                  S/ {parseFloat(plato.precio_base).toFixed(2)}
                                </span>
                              )}
                              {/* Badge "Más pedido" — solo si está activado en config */}
                              {carta.mostrarBadge && plato.es_popular && (
                                <span
                                  className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase text-white"
                                  style={{ background: colorAcento }}
                                >
                                  ⭐ Popular
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Descripción — respeta toggle */}
                          {carta.mostrarDesc !== false && (
                            <p
                              className="text-xs text-neutral-400 leading-relaxed line-clamp-2"
                              style={{ fontFamily: fuenteCuerpo }}
                            >
                              {plato.descripcion || 'Exquisita preparación de la casa con ingredientes seleccionados.'}
                            </p>
                          )}

                          {/* Calorías — solo si están activadas y el plato las tiene */}
                          {carta.mostrarCalor && plato.calorias && (
                            <span className="inline-block mt-1.5 text-[10px] text-neutral-500 font-mono">
                              🔥 {plato.calorias} kcal
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ZONA DE VARIACIONES */}
                      {(gruposObligatorios.length > 0 || gruposOpcionales.length > 0) && (
                        <div className="px-5 pb-5 pt-2 border-t border-white/5 bg-black/20">

                          {/* Obligatorios (Tallas/Tamaños) */}
                          {gruposObligatorios.map((grupo, gIdx) => (
                            <div key={gIdx} className="mb-4 last:mb-0 mt-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-3">
                                {grupo.nombre}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {grupo.opciones.map((opc, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex justify-between items-center bg-black/30 border border-white/10 px-4 py-3 ${esquinas ? 'rounded-xl' : 'rounded-md'}`}
                                  >
                                    <span className="text-sm font-bold text-neutral-300" style={{ fontFamily: fuenteCuerpo }}>
                                      {opc.nombre}
                                    </span>
                                    <span className="font-mono font-bold text-white text-sm">
                                      {parseFloat(opc.precio_adicional) > 0
                                        ? `S/ ${parseFloat(opc.precio_adicional).toFixed(2)}`
                                        : 'Incluido'
                                      }
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* Opcionales (Extras / Chips) */}
                          {gruposOpcionales.length > 0 && (
                            <div className="mt-4">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-3">
                                Personaliza tu plato
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {gruposOpcionales.map(g => g.opciones.map((opc, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-transparent border border-white/10 pl-3 pr-1 py-1 rounded-full flex items-center gap-2"
                                  >
                                    <span className="text-xs font-bold text-neutral-400" style={{ fontFamily: fuenteCuerpo }}>
                                      {opc.nombre}
                                    </span>
                                    <span
                                      className="bg-black/40 text-[10px] font-black px-2 py-1 rounded-full"
                                      style={{ color: colorAcento }}
                                    >
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
                    <p className="text-neutral-400 font-bold text-lg" style={{ fontFamily: fuenteTitulos }}>
                      No hay productos aquí
                    </p>
                    <p className="text-neutral-600 text-sm mt-2" style={{ fontFamily: fuenteCuerpo }}>
                      Prueba seleccionando otra categoría.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
              VISTA 2: MI CUENTA (EL TICKET)
              — lógica 100% intacta, solo colores dinámicos
          ══════════════════════════════════════ */}
          {vistaActiva === 'cuenta' && (
            <div className="px-5 animate-fadeIn pb-10">
              {!ordenActiva ? (
                <div className="bg-black/40 border border-white/10 rounded-3xl p-10 text-center mt-6 shadow-2xl flex flex-col items-center">
                  <div className="w-24 h-24 bg-black/30 rounded-full flex items-center justify-center mb-6 border border-white/10">
                    <span className="text-5xl">🥂</span>
                  </div>
                  <h2
                    className="text-2xl font-black text-white mb-3 tracking-tight"
                    style={{ fontFamily: fuenteTitulos }}
                  >
                    Mesa Disponible
                  </h2>
                  <p className="text-neutral-500 text-sm leading-relaxed max-w-[250px]" style={{ fontFamily: fuenteCuerpo }}>
                    Aún no has ordenado. Llama a un miembro de nuestro equipo para hacer tu pedido.
                  </p>
                </div>
              ) : (
                // EL TICKET
                <div className={`bg-black/50 mt-6 shadow-2xl overflow-hidden relative border border-white/10 ${esquinas ? 'rounded-3xl' : 'rounded-xl'}`}>
                  {/* Borde superior de color */}
                  <div className="h-2 w-full" style={{ backgroundColor: colorAcento }} />

                  <div className="p-6 sm:p-8">
                    {/* Cabecera del ticket */}
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h2
                          className="text-2xl font-black tracking-tight text-white mb-1"
                          style={{ fontFamily: fuenteTitulos }}
                        >
                          Tu Cuenta
                        </h2>
                        <p className="text-xs text-neutral-500 font-mono">
                          TICKET #{ordenActiva.id.toString().padStart(4, '0')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 font-bold mb-2">Estado</span>
                        <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colorAcento }} />
                          <span className="text-xs font-black text-white uppercase">{ordenActiva.estado}</span>
                        </div>
                      </div>
                    </div>

                    {/* Lista de consumo */}
                    <div className="space-y-6">
                      {ordenActiva.detalles.map((detalle, idx) => {
                        const notasTexto = formatearNotas(detalle.notas_y_modificadores);
                        return (
                          <div key={idx} className="flex justify-between items-start group">
                            <div className="flex-1 pr-4">
                              <div className="flex items-start gap-3">
                                <span className="bg-black/40 text-white text-xs font-black px-2 py-1 rounded-md border border-white/10">
                                  {detalle.cantidad}
                                </span>
                                <div>
                                  <p
                                    className="text-base font-bold text-white leading-tight pt-0.5"
                                    style={{ fontFamily: fuenteTitulos }}
                                  >
                                    {detalle.producto_nombre || detalle.producto?.nombre || 'Producto'}
                                  </p>
                                  {notasTexto && (
                                    <p
                                      className="text-[11px] text-neutral-400 mt-1.5 leading-snug"
                                      style={{ fontFamily: fuenteCuerpo }}
                                    >
                                      {notasTexto}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <p className="text-base font-bold text-white pt-0.5 whitespace-nowrap" style={{ fontFamily: fuenteTitulos }}>
                              S/ {(detalle.precio_unitario * detalle.cantidad).toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Separador punteado estilo ticket */}
                    <div className="my-8 border-t-2 border-dashed border-white/10 relative">
                      <div className="absolute -top-3 -left-9 w-6 h-6 rounded-full border-r border-white/10" style={{ background: 'rgba(0,0,0,0.8)' }} />
                      <div className="absolute -top-3 -right-9 w-6 h-6 rounded-full border-l border-white/10" style={{ background: 'rgba(0,0,0,0.8)' }} />
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-end">
                      <p
                        className="text-sm uppercase tracking-[0.15em] text-neutral-400 font-bold"
                        style={{ fontFamily: fuenteCuerpo }}
                      >
                        Total a pagar
                      </p>
                      <p
                        className="text-4xl font-black tracking-tighter"
                        style={{ color: colorAcento, fontFamily: fuenteTitulos }}
                      >
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
      </div>
    </>
  );
}

