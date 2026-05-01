import React, { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────
//  CONFIGURACIÓN — cambia solo esta constante para producción
// ─────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/** Resuelve la URL de cualquier imagen que venga del backend.
 *  - Si ya es https:// la devuelve tal cual
 *  - Si empieza con /media/  →  API_BASE + ruta
 *  - Si viene como  media\..  (Windows) normaliza barras
 */
function resolverImagen(ruta) {
  if (!ruta) return null;
  if (ruta.startsWith('http://') || ruta.startsWith('https://')) return ruta;
  const normalizada = ruta.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${API_BASE}/${normalizada}`;
}

// ─────────────────────────────────────────────────────────────
//  ICONOS SVG
// ─────────────────────────────────────────────────────────────
const Icons = {
  Back: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  Heart: ({ filled, color }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Star: ({ size = 12, color = '#FFB800' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  Cart: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  Clock: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Truck: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  Sparkle: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────
//  REGLA DE NEGOCIO: PRECIO A MOSTRAR
//  - Sin variaciones          → precio_base fijo
//  - Con variaciones, min=max → precio único
//  - Con variaciones, min<max → "Desde S/ X"
// ─────────────────────────────────────────────────────────────
function textoPrecio(plato) {
  const base = parseFloat(plato.precio_base ?? 0);
  const min  = parseFloat(plato.precio_minimo ?? base);
  const max  = parseFloat(plato.precio_maximo ?? base);
  if (!plato.tiene_variaciones || min === max) return { desde: false, valor: min.toFixed(2) };
  return { desde: true, valor: min.toFixed(2) };
}

// ─────────────────────────────────────────────────────────────
//  IMAGEN CON FALLBACK
// ─────────────────────────────────────────────────────────────
function Img({ src, alt, style, fallback = '🍽️', fallbackSize = 44 }) {
  const url = resolverImagen(src);
  const [error, setError] = useState(false);

  if (!url || error) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: fallbackSize, opacity: 0.5 }}>{fallback}</span>
      </div>
    );
  }
  return <img src={url} alt={alt} style={style} onError={() => setError(true)} />;
}

// ─────────────────────────────────────────────────────────────
//  CARRUSEL HERO  —  preparado para ML
//  Cuando esté listo el modelo, `PublicMenu` puede pasar
//  `productosRecomendados` y este carrusel los usará.
//  Por ahora toma los primeros 5 productos como destacados.
// ─────────────────────────────────────────────────────────────
function CarruselHero({ productos, productosRecomendados, colorAcento, fuentes, onVerDetalle }) {
  // Si llega lista de recomendados ML la usamos.
  // Si no, usamos productos con destacar_como_promocion=true.
  // Si tampoco hay, tomamos los primeros 5.
  const destacados = productos.filter(p => p.destacar_como_promocion);
  const slides = (productosRecomendados && productosRecomendados.length > 0)
    ? productosRecomendados.slice(0, 5)
    : destacados.length > 0
      ? destacados.slice(0, 5)
      : productos.slice(0, 5);

  const [idx, setIdx] = useState(0);
  const timerRef = useRef(null);

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIdx(i => (i + 1) % slides.length), 3500);
  };

  useEffect(() => {
    if (slides.length < 2) return;
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  if (!slides.length) return null;
  const plato = slides[idx];
  const imgUrl = resolverImagen(plato.imagen);

  return (
    <div style={{
      margin: '0 20px',
      borderRadius: 24,
      overflow: 'hidden',
      background: '#1a1a1a',
      border: `1px solid ${colorAcento}25`,
      position: 'relative',
      minHeight: 160,
    }}>
      {/* Fondo difuminado con la imagen del plato */}
      {imgUrl && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${imgUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(20px) brightness(0.25)',
          transform: 'scale(1.1)',
        }} />
      )}
      {/* Capa de gradiente */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, rgba(0,0,0,0.85) 0%, ${colorAcento}18 100%)` }} />

      {/* Contenido */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '20px 20px 20px 22px', gap: 14 }}>
        <div style={{ flex: 1 }}>
          {/* Badge ML o Destacado */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: `${colorAcento}22`, border: `1px solid ${colorAcento}44`,
            borderRadius: 100, padding: '3px 10px', marginBottom: 8,
          }}>
            <Icons.Sparkle />
            <span style={{ fontSize: 9, fontWeight: 800, color: colorAcento, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: fuentes.cuerpo }}>
              {productosRecomendados ? 'Recomendado' : plato.destacar_como_promocion ? 'Promoción' : 'Destacado'}
            </span>
          </div>

          <h2 style={{
            fontFamily: fuentes.titulos, fontSize: 20, fontWeight: 900, color: '#fff',
            margin: '0 0 4px', lineHeight: 1.15, letterSpacing: '-0.02em',
          }}>{plato.nombre}</h2>

          <p style={{
            fontFamily: fuentes.cuerpo, fontSize: 11, color: 'rgba(255,255,255,0.45)',
            margin: '0 0 14px', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {plato.descripcion || 'Preparación especial de la casa.'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => onVerDetalle(plato)}
              style={{
                background: colorAcento, border: 'none', cursor: 'pointer',
                color: '#000', fontFamily: fuentes.cuerpo, fontWeight: 900,
                fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '9px 18px', borderRadius: 100,
                boxShadow: `0 6px 20px ${colorAcento}55`,
              }}>
              Ver detalles
            </button>
            <span style={{ fontFamily: fuentes.titulos, fontSize: 16, fontWeight: 900, color: colorAcento }}>
              {textoPrecio(plato).desde && <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginRight: 2 }}>Desde</span>}
              S/ {textoPrecio(plato).valor}
            </span>
          </div>
        </div>

        {/* Imagen circular del plato */}
        <div style={{
          width: 110, height: 110, borderRadius: '50%', flexShrink: 0,
          background: `radial-gradient(circle, ${colorAcento}33, transparent 70%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          filter: `drop-shadow(0 8px 20px ${colorAcento}66)`,
        }}>
          <Img
            src={plato.imagen}
            alt={plato.nombre}
            style={{ width: 104, height: 104, objectFit: 'cover', borderRadius: '50%' }}
            fallbackSize={52}
          />
        </div>
      </div>

      {/* Dots indicadores */}
      {slides.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, paddingBottom: 14, position: 'relative', zIndex: 1 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); resetTimer(); }}
              style={{
                width: i === idx ? 20 : 6, height: 6,
                borderRadius: 99, border: 'none', cursor: 'pointer',
                background: i === idx ? colorAcento : 'rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CARD GRID (2 columnas)
// ─────────────────────────────────────────────────────────────
function CardGrid({ plato, colorAcento, fuentes, carta, onSelect }) {
  return (
    <div
      onClick={() => onSelect(plato)}
      style={{
        background: '#1a1a1a', borderRadius: 20, cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
        transition: 'transform 0.15s ease',
      }}
      onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
      onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ position: 'relative', aspectRatio: '1/1', background: '#141414' }}>
        <Img
          src={plato.imagen}
          alt={plato.nombre}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          fallbackSize={44}
        />
        {/* Rating */}
        <div style={{
          position: 'absolute', top: 8, left: 8,
          background: '#fff', borderRadius: 100, padding: '3px 7px',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <Icons.Star />
          <span style={{ fontFamily: fuentes.cuerpo, fontSize: 10, fontWeight: 900, color: '#111' }}>4.9</span>
        </div>
        {/* Favorito */}
        <div style={{
          position: 'absolute', top: 8, right: 8,
          width: 28, height: 28, borderRadius: '50%',
          background: colorAcento,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.Heart color="#fff" />
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', background: 'linear-gradient(to top, #1a1a1a, transparent)' }} />
      </div>
      <div style={{ padding: '10px 12px 14px' }}>
        {plato.destacar_como_promocion && (
          <span style={{
            display: 'inline-block', marginBottom: 5,
            background: 'linear-gradient(90deg,#e11d48,#f97316)',
            color: '#fff', fontSize: 9, fontWeight: 900,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            padding: '2px 7px', borderRadius: 6,
          }}>🔥 Promo</span>
        )}
        <h3 style={{
          fontFamily: fuentes.titulos, fontSize: 13, fontWeight: 900, color: '#fff',
          margin: '0 0 6px', lineHeight: 1.2, letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{plato.nombre}</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.35)' }}>
            <Icons.Truck />
            <span style={{ fontFamily: fuentes.cuerpo, fontSize: 10 }}>En mesa</span>
          </div>
          <span style={{ fontFamily: fuentes.titulos, fontSize: 14, fontWeight: 900, color: colorAcento }}>
            {textoPrecio(plato).desde && <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, marginRight: 2 }}>Desde</span>}
            S/{textoPrecio(plato).valor}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MODAL DETALLE
// ─────────────────────────────────────────────────────────────
function ModalDetalle({ plato, colorAcento, fuentes, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!plato) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <style>{`
        @keyframes modalUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes floatAnim { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          background: '#111',
          borderRadius: '32px 32px 0 0',
          animation: 'modalUp 0.38s cubic-bezier(0.32,0.72,0,1)',
          paddingBottom: 36,
          position: 'relative',
          overflow: 'visible',
        }}
      >
        {/* ── Imagen flotante ── */}
        <div style={{
          position: 'absolute', top: -100, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 2,
        }}>
          <div style={{
            width: 200, height: 200,
            animation: 'floatAnim 4s ease-in-out infinite',
            filter: `drop-shadow(0 24px 48px ${colorAcento}88)`,
          }}>
            <Img
              src={plato.imagen}
              alt={plato.nombre}
              style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: '50%', border: `3px solid ${colorAcento}44` }}
              fallbackSize={80}
            />
          </div>
        </div>

        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 14 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.12)' }} />
        </div>

        {/* Header: Volver / Título / Fav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px 0' }}>
          <button onClick={onClose} style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', border: 'none',
            color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icons.Back /></button>
          <span style={{ fontFamily: fuentes.titulos, fontWeight: 900, fontSize: 16, color: '#fff' }}>Detalles</span>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            background: colorAcento,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.Heart color="#fff" />
          </div>
        </div>

        {/* Espacio imagen flotante */}
        <div style={{ height: 108 }} />

        {/* Contenido */}
        <div style={{ padding: '0 24px' }}>
          {/* Nombre + contador */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <h2 style={{
                fontFamily: fuentes.titulos, fontSize: 24, fontWeight: 900, color: '#fff',
                margin: 0, lineHeight: 1.1, letterSpacing: '-0.02em',
              }}>{plato.nombre}</h2>
              <p style={{ fontFamily: fuentes.cuerpo, fontSize: 12, color: 'rgba(255,255,255,0.38)', margin: '4px 0 0' }}>
                {plato.categoria_nombre || 'Especialidad de la casa'}
              </p>
            </div>
            {/* Selector decorativo — informativo, no carrito */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 18, fontWeight: 700,
              }}>−</div>
              <span style={{ fontFamily: fuentes.titulos, fontSize: 16, fontWeight: 900, color: '#fff', minWidth: 16, textAlign: 'center' }}>1</span>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: colorAcento,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#000', fontSize: 18, fontWeight: 700,
                boxShadow: `0 4px 14px ${colorAcento}88`,
              }}>+</div>
            </div>
          </div>

          {/* Descripción */}
          <div style={{ marginTop: 16, marginBottom: 16 }}>
            <p style={{ fontFamily: fuentes.titulos, fontSize: 13, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Descripción</p>
            <p style={{ fontFamily: fuentes.cuerpo, fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.7, margin: 0 }}>
              {plato.descripcion || 'Un platillo especial preparado con ingredientes frescos seleccionados para brindarte la mejor experiencia.'}
            </p>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: 18, padding: '12px 0',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            marginBottom: 20,
          }}>
            {[
              { icon: <Icons.Star color="#FFB800" size={14} />, label: '4.9' },
              { icon: <Icons.Truck />, label: 'En Mesa' },
              { icon: <Icons.Clock />, label: '~15 min' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.5)' }}>
                {s.icon}
                <span style={{ fontFamily: fuentes.cuerpo, fontSize: 12, fontWeight: 700 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Precio + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: fuentes.cuerpo, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Precio</p>
              <p style={{ fontFamily: fuentes.titulos, fontSize: 30, fontWeight: 900, color: colorAcento, margin: '3px 0 0', lineHeight: 1 }}>
                {textoPrecio(plato).desde && (
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.6, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Desde</span>
                )}
                <span style={{ fontSize: 16, marginRight: 2 }}>S/</span>
                {textoPrecio(plato).valor}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: colorAcento, border: 'none', cursor: 'pointer',
                color: '#000', fontFamily: fuentes.cuerpo, fontWeight: 900, fontSize: 13,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '16px 30px', borderRadius: 100,
                boxShadow: `0 8px 24px ${colorAcento}55`,
              }}>
              Pedir al mesero →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
/**
 * Props que acepta:
 *  - mesaId, productos, categorias, ordenActiva, carta
 *  - fuentes, colorAcento, vistaActiva, setVistaActiva
 *
 *  Props FUTURAS para ML (opcionales, retrocompatibles):
 *  - productosRecomendados: Array  → lista ordenada por el modelo
 */
export default function MenuTemaGrid({
  mesaId,
  productos = [],
  categorias = [],
  ordenActiva,
  carta = {},
  fuentes,
  colorAcento,
  vistaActiva,
  setVistaActiva,
  productosRecomendados,          // ← FUTURO: viene del modelo ML
}) {
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  const color = colorAcento || '#F47B0A';

  // Enriquecemos con nombre de categoría (útil para el modal)
  const productosEnriquecidos = productos.map(p => ({
    ...p,
    categoria_nombre: categorias.find(c => String(c.id) === String(p.categoria))?.nombre || '',
  }));

  const productosFiltrados = productosEnriquecidos.filter(p => {
    if (categoriaActiva === 'Todas') return true;
    return p.categoria_nombre === categoriaActiva;
  });

  return (
    // Sin backgroundColor propio — hereda el fondo que aplica PublicMenu
    <div style={{ minHeight: '100vh', color: '#fff', fontFamily: fuentes?.cuerpo }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .no-scroll::-webkit-scrollbar{display:none}
        .no-scroll{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* ──── HEADER ──── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Logo + Nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {carta.logoUrl ? (
            <Img
              src={carta.logoUrl}
              alt="logo"
              style={{ width: 42, height: 42, borderRadius: 12, objectFit: 'contain', border: `1px solid ${color}44`, background: `${color}15` }}
            />
          ) : (
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: fuentes?.titulos, fontSize: 20, fontWeight: 900, color: '#000',
            }}>
              {(carta.nombreNegocio || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{
              fontFamily: fuentes?.titulos, fontSize: 17, fontWeight: 900,
              color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em',
            }}>
              {carta.nombreNegocio}
            </div>
            {carta.slogan && (
              <div style={{
                fontSize: 9, fontWeight: 700, color: `${color}cc`,
                letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: fuentes?.cuerpo,
              }}>
                {carta.slogan}
              </div>
            )}
          </div>
        </div>

        {/* Mesa + acceso a cuenta */}
        <button
          onClick={() => setVistaActiva('cuenta')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 14px', borderRadius: 100, cursor: 'pointer',
            position: 'relative',
          }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Mesa {mesaId}
          </span>
          {ordenActiva && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              width: 16, height: 16, borderRadius: '50%',
              background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 900, color: '#000',
            }}>
              {ordenActiva.detalles?.length || '!'}
            </div>
          )}
        </button>
      </header>

      {/* ──── TABS ──── */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          display: 'flex', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 5,
        }}>
          {[['menu', 'La Carta'], ['cuenta', 'Mi Cuenta']].map(([key, label]) => (
            <button key={key} onClick={() => setVistaActiva(key)} style={{
              flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: vistaActiva === key ? color : 'transparent',
              color: vistaActiva === key ? '#000' : 'rgba(255,255,255,0.4)',
              fontFamily: fuentes?.cuerpo, fontSize: 12, fontWeight: 800,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              transition: 'all 0.2s ease', position: 'relative',
            }}>
              {label}
              {key === 'cuenta' && ordenActiva && vistaActiva !== 'cuenta' && (
                <span style={{
                  position: 'absolute', top: 7, right: 12,
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#fff', boxShadow: `0 0 8px ${color}`,
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════
          VISTA: MENÚ
      ════════════════════════════════════════════ */}
      {vistaActiva === 'menu' && (
        <div style={{ animation: 'fadeIn 0.25s ease', paddingBottom: 100 }}>

          {/* Carrusel hero */}
          <div style={{ marginTop: 20 }}>
            <CarruselHero
              productos={productosEnriquecidos}
              productosRecomendados={productosRecomendados}
              colorAcento={color}
              fuentes={fuentes}
              onVerDetalle={p => setProductoSeleccionado(p)}
            />
          </div>

          {/* Categorías con foto circular */}
          <div style={{ padding: '24px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontFamily: fuentes?.titulos, fontSize: 17, fontWeight: 900, color: '#fff', margin: 0 }}>
                Categorías
              </h2>
            </div>
            <div className="no-scroll" style={{ display: 'flex', gap: 14, overflowX: 'auto' }}>
              {[{ nombre: 'Todas', id: null }, ...categorias].map(cat => {
                const isActive = categoriaActiva === cat.nombre;
                const refProd = cat.id
                  ? productos.find(p => String(p.categoria) === String(cat.id))
                  : productos[0];
                return (
                  <button key={cat.id ?? 'todas'} onClick={() => setCategoriaActiva(cat.nombre)} style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      border: isActive ? `2.5px solid ${color}` : '2px solid rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                      background: isActive ? `${color}18` : '#1a1a1a',
                      transition: 'all 0.2s',
                      boxShadow: isActive ? `0 4px 18px ${color}44` : 'none',
                    }}>
                      <Img
                        src={refProd?.imagen}
                        alt={cat.nombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        fallback="🍔"
                        fallbackSize={28}
                      />
                    </div>
                    <span style={{
                      fontFamily: fuentes?.cuerpo, fontSize: 10, fontWeight: 800,
                      color: isActive ? color : 'rgba(255,255,255,0.45)',
                      whiteSpace: 'nowrap',
                    }}>{cat.nombre}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid de productos */}
          <div style={{ padding: '22px 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontFamily: fuentes?.titulos, fontSize: 17, fontWeight: 900, color: '#fff', margin: 0 }}>
                {categoriaActiva === 'Todas' ? 'Todos los platos' : categoriaActiva}
              </h2>
              <span style={{ fontFamily: fuentes?.cuerpo, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
                {productosFiltrados.length} platos
              </span>
            </div>

            {productosFiltrados.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.25)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🍽️</div>
                <p style={{ fontFamily: fuentes?.cuerpo, fontSize: 13 }}>Sin platos en esta categoría</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {productosFiltrados.map(p => (
                  <CardGrid
                    key={p.id}
                    plato={p}
                    colorAcento={color}
                    fuentes={fuentes}
                    carta={carta}
                    onSelect={setProductoSeleccionado}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          VISTA: CUENTA
      ════════════════════════════════════════════ */}
      {vistaActiva === 'cuenta' && (
        <div style={{ padding: '24px 20px 100px', animation: 'fadeIn 0.25s ease' }}>
          {/* Header cuenta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => setVistaActiva('menu')}
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <Icons.Back />
            </button>
            <h2 style={{ fontFamily: fuentes?.titulos, fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>
              Mi Cuenta
            </h2>
          </div>

          {!ordenActiva ? (
            <div style={{
              textAlign: 'center', padding: '60px 24px',
              background: '#1a1a1a', borderRadius: 24,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 54, marginBottom: 16 }}>🥂</div>
              <h3 style={{ fontFamily: fuentes?.titulos, fontSize: 20, fontWeight: 900, color: '#fff', margin: '0 0 8px' }}>
                Mesa disponible
              </h3>
              <p style={{ fontFamily: fuentes?.cuerpo, fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, margin: '0 0 24px' }}>
                Aún no tienes pedidos activos.<br />Llama a un mesero para ordenar.
              </p>
              <button
                onClick={() => setVistaActiva('menu')}
                style={{
                  background: color, border: 'none', cursor: 'pointer',
                  color: '#000', fontFamily: fuentes?.cuerpo, fontWeight: 900,
                  fontSize: 13, padding: '14px 32px', borderRadius: 100,
                  boxShadow: `0 6px 20px ${color}44`,
                }}>
                Ver la carta →
              </button>
            </div>
          ) : (
            <>
              {/* Estado del pedido */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontFamily: fuentes?.cuerpo, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Estado del pedido</span>
                <span style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase',
                  background: `${color}22`, color: color,
                  padding: '5px 14px', borderRadius: 100,
                  border: `1px solid ${color}44`, fontFamily: fuentes?.cuerpo,
                }}>
                  {ordenActiva.estado}
                </span>
              </div>

              {/* Items */}
              <div style={{
                background: '#1a1a1a', borderRadius: 22,
                border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden',
              }}>
                <div style={{ height: 3, background: color }} />
                <div style={{ padding: '16px 20px' }}>
                  {ordenActiva.detalles?.map((det, i) => {
                    const isLast = i === ordenActiva.detalles.length - 1;
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        paddingBottom: !isLast ? 14 : 0,
                        marginBottom: !isLast ? 14 : 0,
                        borderBottom: !isLast ? '1px solid rgba(255,255,255,0.06)' : 'none',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: `${color}20`, border: `1px solid ${color}33`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: fuentes?.titulos, fontSize: 13, fontWeight: 900, color: color,
                          }}>{det.cantidad}</div>
                          <span style={{ fontFamily: fuentes?.titulos, fontSize: 14, fontWeight: 700, color: '#fff' }}>
                            {det.producto_nombre || det.producto?.nombre}
                          </span>
                        </div>
                        <span style={{ fontFamily: fuentes?.titulos, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.65)' }}>
                          S/ {(det.precio_unitario * det.cantidad).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div style={{
                  borderTop: '1px dashed rgba(255,255,255,0.08)',
                  padding: '16px 20px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(0,0,0,0.2)',
                }}>
                  <div>
                    <p style={{ fontFamily: fuentes?.cuerpo, fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                      Total a pagar
                    </p>
                    <p style={{ fontFamily: fuentes?.titulos, fontSize: 32, fontWeight: 900, color: color, margin: '4px 0 0', lineHeight: 1 }}>
                      <span style={{ fontSize: 16 }}>S/ </span>
                      {parseFloat(ordenActiva.total).toFixed(2)}
                    </p>
                  </div>
                  <div style={{ fontSize: 36 }}>🧾</div>
                </div>
              </div>

              <p style={{
                textAlign: 'center', marginTop: 14,
                fontFamily: fuentes?.cuerpo, fontSize: 11,
                color: 'rgba(255,255,255,0.2)', lineHeight: 1.6,
              }}>
                El cobro lo realiza el mesero directamente en tu mesa.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── MODAL DETALLE ── */}
      {productoSeleccionado && (
        <ModalDetalle
          plato={productoSeleccionado}
          colorAcento={color}
          fuentes={fuentes}
          onClose={() => setProductoSeleccionado(null)}
        />
      )}
    </div>
  );
}