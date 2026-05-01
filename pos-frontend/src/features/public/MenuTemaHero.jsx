import React, { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function resolverImagen(ruta) {
  if (!ruta) return null;
  if (ruta.startsWith('http://') || ruta.startsWith('https://')) return ruta;
  const normalizada = ruta.replace(/\\/g, '/').replace(/^\/+/, '');
  return `${API_BASE}/${normalizada}`;
}

// ── Helpers ───────────────────────────────────────────────────
function hexToRgb(hex) {
  const h = (hex || '#F47B0A').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) {
  try { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
  catch { return `rgba(244,123,10,${a})`; }
}
function isLight(hex) {
  try { const [r, g, b] = hexToRgb(hex); return (r * 299 + g * 587 + b * 114) / 1000 > 160; }
  catch { return false; }
}
// Detecta luminosidad de un elemento DOM siguiendo cadena de padres
function detectBgLuma(el) {
  let cur = el;
  while (cur && cur !== document.body) {
    const bg = getComputedStyle(cur).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(s => parseFloat(s.trim()));
      const [r, g, b, a = 1] = parts;
      if (a > 0.1) return (r * 299 + g * 587 + b * 114) / 1000;
    }
    cur = cur.parentElement;
  }
  // body
  const bg = getComputedStyle(document.body).backgroundColor;
  const m = bg.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(',').map(s => parseFloat(s.trim()));
    return (r * 299 + g * 587 + b * 114) / 1000;
  }
  return 30; // asume oscuro por defecto
}

// ── Iconos ────────────────────────────────────────────────────
const Icons = {
  Back: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  Heart: ({ filled, color, size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color || 'currentColor'} strokeWidth="1.8">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  Plus: ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Receipt: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  ),
};

// ── Regla de negocio: precio a mostrar ───────────────────────
function textoPrecio(plato) {
  const base = parseFloat(plato.precio_base ?? 0);
  const min  = parseFloat(plato.precio_minimo ?? base);
  const max  = parseFloat(plato.precio_maximo ?? base);
  if (!plato.tiene_variaciones || min === max) return { desde: false, valor: min.toFixed(2) };
  return { desde: true, valor: min.toFixed(2) };
}

// ── Imagen con fallback ───────────────────────────────────────
function Img({ src, alt, style, fallback = '🍽️', fallbackSize = 44, fallbackBg = 'rgba(128,128,128,0.08)' }) {
  const url = resolverImagen(src);
  const [error, setError] = useState(false);
  if (!url || error) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: fallbackBg }}>
        <span style={{ fontSize: fallbackSize }}>{fallback}</span>
      </div>
    );
  }
  return <img src={url} alt={alt} style={{ ...style, display: 'block' }} onError={() => setError(true)} />;
}

// ─────────────────────────────────────────────────────────────
//  HERO STORY — destacado tipo editorial, no carrusel comercial
// ─────────────────────────────────────────────────────────────
function HeroDestacado({ productos, productosRecomendados, colorAcento, fuentes, theme, onVerDetalle }) {
  const destacados = productos.filter(p => p.destacar_como_promocion);
  const slides = (productosRecomendados?.length > 0)
    ? productosRecomendados.slice(0, 3)
    : destacados.length > 0 ? destacados.slice(0, 3) : productos.slice(0, 3);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setIdx(i => (i + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  const plato = slides[idx];

  return (
    <div style={{ padding: '0 24px 8px', position: 'relative' }}>
      <div
        onClick={() => onVerDetalle(plato)}
        style={{
          display: 'flex', alignItems: 'center', gap: 18,
          padding: '20px 4px',
          cursor: 'pointer',
          borderTop: `1px solid ${theme.borderSoft}`,
          borderBottom: `1px solid ${theme.borderSoft}`,
          position: 'relative',
        }}
      >
        {/* Texto izquierda */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.25em',
            textTransform: 'uppercase', color: colorAcento,
            fontFamily: fuentes?.cuerpo, marginBottom: 8,
          }}>
            <span style={{ width: 18, height: 1, background: colorAcento }} />
            {productosRecomendados ? 'Para ti' : plato.destacar_como_promocion ? 'Promoción' : 'Hoy destacamos'}
          </div>
          <h2 style={{
            fontFamily: fuentes?.titulos,
            fontSize: 26, fontWeight: 400, fontStyle: 'italic',
            color: theme.text, margin: '0 0 6px', lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            {plato.nombre}
          </h2>
          <p style={{
            fontFamily: fuentes?.cuerpo, fontSize: 12,
            color: theme.textMuted, margin: '0 0 14px', lineHeight: 1.55,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {plato.descripcion || 'Una preparación cuidada, pensada para hoy.'}
          </p>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: fuentes?.cuerpo, fontSize: 12, fontWeight: 700,
            color: colorAcento, letterSpacing: '0.04em',
          }}>
            {textoPrecio(plato).desde ? `Desde S/ ${textoPrecio(plato).valor}` : `S/ ${textoPrecio(plato).valor}`}
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: theme.borderSoft }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Leer más <Icons.ArrowRight />
            </span>
          </div>
        </div>

        {/* Imagen circular grande derecha */}
        <div style={{
          width: 130, height: 130, borderRadius: '50%', flexShrink: 0,
          overflow: 'hidden', background: theme.bgSubtle,
          boxShadow: `0 16px 40px ${rgba(colorAcento, 0.18)}`,
          position: 'relative',
        }}>
          <Img src={plato.imagen} alt={plato.nombre}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            fallbackSize={50}
          />
        </div>
      </div>

      {/* Dots minimalistas */}
      {slides.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, paddingTop: 10 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} style={{
              width: i === idx ? 18 : 4, height: 4, borderRadius: 99,
              border: 'none', cursor: 'pointer', padding: 0,
              background: i === idx ? colorAcento : theme.borderSoft,
              transition: 'all 0.4s ease',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CARD GRID — estilo polaroid editorial
// ─────────────────────────────────────────────────────────────
function CardGrid({ plato, idx, colorAcento, fuentes, theme, onSelect }) {
  const [pressed, setPressed] = useState(false);
  const onLight = isLight(colorAcento);
  const textOnAccent = onLight ? '#000' : '#fff';

  // Variación sutil por índice — desplazamiento tipo collage
  const rotate = (idx % 4 === 0) ? -1 : (idx % 4 === 1) ? 0.5 : (idx % 4 === 2) ? -0.3 : 1;
  const offsetY = (idx % 3 === 1) ? 12 : 0;

  return (
    <div
      onClick={() => onSelect(plato)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        background: theme.cardBg,
        borderRadius: 18,
        cursor: 'pointer',
        transform: `translateY(${offsetY}px) rotate(${rotate}deg) scale(${pressed ? 0.96 : 1})`,
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: 10,
        boxShadow: theme.cardShadow,
        position: 'relative',
        border: `1px solid ${theme.borderSoft}`,
      }}
    >
      {/* Imagen */}
      <div style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: 14,
        overflow: 'hidden',
        background: theme.bgSubtle,
      }}>
        <Img
          src={plato.imagen}
          alt={plato.nombre}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          fallbackSize={38}
          fallbackBg={theme.bgSubtle}
        />

        {/* Nº de plato (estilo editorial) */}
        <div style={{
          position: 'absolute', top: 8, left: 10,
          fontFamily: fuentes?.titulos, fontStyle: 'italic',
          fontSize: 11, fontWeight: 500, color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.4)',
          letterSpacing: '0.05em',
        }}>
          № {String(idx + 1).padStart(2, '0')}
        </div>

        {/* Botón + flotante */}
        <button
          onClick={e => { e.stopPropagation(); onSelect(plato); }}
          style={{
            position: 'absolute', bottom: 8, right: 8,
            width: 34, height: 34, borderRadius: '50%',
            background: colorAcento,
            border: `2.5px solid ${theme.cardBg}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: textOnAccent,
            boxShadow: `0 4px 14px ${rgba(colorAcento, 0.45)}`,
          }}
        >
          <Icons.Plus size={15} />
        </button>
      </div>

      {/* Info debajo, tipo etiqueta polaroid */}
      <div style={{ padding: '12px 4px 4px' }}>
        {plato.destacar_como_promocion && (
          <span style={{
            display: 'inline-block', marginBottom: 4,
            background: 'linear-gradient(90deg,#e11d48,#f97316)',
            color: '#fff', fontSize: 8, fontWeight: 900,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 5,
          }}>🔥 Promo</span>
        )}
        <h3 style={{
          fontFamily: fuentes?.titulos,
          fontSize: 14, fontWeight: 500, fontStyle: 'italic',
          color: theme.text, margin: 0, lineHeight: 1.2,
          display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          letterSpacing: '-0.01em',
        }}>{plato.nombre}</h3>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginTop: 4,
        }}>
          {plato.categoria_nombre ? (
            <span style={{
              fontFamily: fuentes?.cuerpo, fontSize: 9.5,
              color: theme.textFaint, fontWeight: 500,
              letterSpacing: '0.18em', textTransform: 'uppercase',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              maxWidth: '60%',
            }}>{plato.categoria_nombre}</span>
          ) : <span />}
          <span style={{
            fontFamily: fuentes?.titulos, fontSize: 13, fontWeight: 600,
            color: colorAcento, whiteSpace: 'nowrap',
          }}>
            {textoPrecio(plato).desde && <span style={{ fontSize: 10, opacity: 0.7, marginRight: 2 }}>Desde </span>}
            S/{textoPrecio(plato).valor}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MODAL DETALLE — estilo editorial limpio
// ─────────────────────────────────────────────────────────────
function ModalDetalle({ plato, colorAcento, fuentes, theme, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  if (!plato) return null;
  const onLight = isLight(colorAcento);
  const textOnAccent = onLight ? '#000' : '#fff';

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: theme.modalBackdrop,
      display: 'flex', alignItems: 'flex-end',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    }}>
      <style>{`
        @keyframes modalUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        @keyframes imgFade { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
      `}</style>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%',
        background: theme.modalBg,
        borderRadius: '36px 36px 0 0',
        animation: 'modalUp 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
        paddingBottom: 40,
        position: 'relative',
        maxHeight: '92vh',
        overflowY: 'auto',
        border: `1px solid ${theme.borderSoft}`,
        borderBottom: 'none',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          <div style={{ width: 40, height: 4, borderRadius: 99, background: theme.borderStrong }} />
        </div>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px 0' }}>
          <button onClick={onClose} style={{
            width: 38, height: 38, borderRadius: '50%',
            background: theme.bgSubtle, border: `1px solid ${theme.borderSoft}`,
            color: theme.text, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><Icons.Back /></button>
          <span style={{
            fontFamily: fuentes?.cuerpo, fontWeight: 700, fontSize: 10,
            color: theme.textFaint, letterSpacing: '0.25em', textTransform: 'uppercase',
          }}>{plato.categoria_nombre || 'Especialidad'}</span>
          <button style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'transparent', border: `1px solid ${theme.borderStrong}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: colorAcento,
          }}>
            <Icons.Heart color={colorAcento} />
          </button>
        </div>

        {/* Imagen grande hero */}
        <div style={{
          padding: '24px 24px 8px',
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            width: 220, height: 220,
            animation: 'imgFade 0.5s cubic-bezier(0.32, 0.72, 0, 1)',
            position: 'relative',
          }}>
            <Img src={plato.imagen} alt={plato.nombre}
              style={{
                width: 220, height: 220, objectFit: 'cover', borderRadius: '50%',
                boxShadow: `0 20px 50px ${rgba(colorAcento, 0.3)}`,
              }}
              fallbackSize={80}
            />
          </div>
        </div>

        {/* Nombre grande editorial */}
        <div style={{ padding: '8px 28px 0', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: fuentes?.titulos,
            fontSize: 30, fontWeight: 400, fontStyle: 'italic',
            color: theme.text, margin: 0, lineHeight: 1.05,
            letterSpacing: '-0.02em',
          }}>
            {plato.nombre}
          </h2>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            marginTop: 10,
          }}>
            <span style={{ width: 24, height: 1, background: colorAcento }} />
            <span style={{
              fontFamily: fuentes?.cuerpo, fontSize: 9, fontWeight: 700,
              color: colorAcento, letterSpacing: '0.3em', textTransform: 'uppercase',
            }}>De la casa</span>
            <span style={{ width: 24, height: 1, background: colorAcento }} />
          </div>
        </div>

        {/* Descripción */}
        <p style={{
          fontFamily: fuentes?.cuerpo, fontSize: 13.5,
          color: theme.textMuted, lineHeight: 1.7,
          margin: '20px 28px 24px', textAlign: 'center',
        }}>
          {plato.descripcion || 'Una preparación pensada con ingredientes frescos, equilibrando sabores y texturas para una experiencia memorable.'}
        </p>

        {/* Línea separadora con info */}
        <div style={{
          display: 'flex', justifyContent: 'space-around',
          padding: '18px 24px',
          borderTop: `1px solid ${theme.borderSoft}`,
          borderBottom: `1px solid ${theme.borderSoft}`,
          margin: '0 24px',
        }}>
          {[
            { label: 'Calificación', value: '4.9' },
            { label: 'Tiempo', value: '~15 min' },
            { label: 'Servicio', value: 'Mesa' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: fuentes?.titulos, fontSize: 16, fontStyle: 'italic',
                fontWeight: 500, color: theme.text, lineHeight: 1,
              }}>{s.value}</div>
              <div style={{
                fontFamily: fuentes?.cuerpo, fontSize: 9, fontWeight: 600,
                color: theme.textFaint, letterSpacing: '0.18em',
                textTransform: 'uppercase', marginTop: 4,
              }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Precio + cantidad + CTA */}
        <div style={{ padding: '24px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{
                fontFamily: fuentes?.cuerpo, fontSize: 9, fontWeight: 700,
                color: theme.textFaint, letterSpacing: '0.25em', textTransform: 'uppercase',
              }}>Precio</div>
              <div style={{
                fontFamily: fuentes?.titulos, fontSize: 32, fontWeight: 500, fontStyle: 'italic',
                color: theme.text, lineHeight: 1, marginTop: 4,
              }}>
                {textoPrecio(plato).desde && (
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: colorAcento, opacity: 0.7, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Desde</span>
                )}
                <span style={{ fontSize: 16, color: colorAcento, marginRight: 4 }}>S/</span>
                {textoPrecio(plato).valor}
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: theme.bgSubtle, borderRadius: 100,
              padding: '4px', border: `1px solid ${theme.borderSoft}`,
            }}>
              <button style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: theme.text, fontSize: 16, fontWeight: 600,
              }}>−</button>
              <span style={{ fontFamily: fuentes?.titulos, fontSize: 14, fontWeight: 600, color: theme.text, minWidth: 14, textAlign: 'center' }}>1</span>
              <button style={{
                width: 32, height: 32, borderRadius: '50%',
                background: colorAcento, border: 'none', cursor: 'pointer',
                color: textOnAccent, fontSize: 16, fontWeight: 600,
              }}>+</button>
            </div>
          </div>

          <button onClick={onClose} style={{
            width: '100%', background: colorAcento, border: 'none', cursor: 'pointer',
            color: textOnAccent, fontFamily: fuentes?.cuerpo, fontWeight: 700, fontSize: 13,
            letterSpacing: '0.18em', textTransform: 'uppercase',
            padding: '18px 0', borderRadius: 100,
            boxShadow: `0 8px 28px ${rgba(colorAcento, 0.4)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            Pedir al mesero
            <Icons.ArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────
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
  productosRecomendados,
}) {
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [bgIsLight, setBgIsLight] = useState(false);
  const rootRef = useRef(null);
  const tabsRef = useRef(null);

  const color = colorAcento || '#F47B0A';
  const onLightAccent = isLight(color);
  const textOnAccent = onLightAccent ? '#000' : '#fff';

  // Detectar luminosidad del fondo padre al montar
  useEffect(() => {
    if (!rootRef.current) return;
    const luma = detectBgLuma(rootRef.current.parentElement);
    setBgIsLight(luma > 160);
  }, []);

  // Theme dinámico que se adapta a fondo claro u oscuro
  const theme = bgIsLight ? {
    text: '#1a1a1a',
    textMuted: 'rgba(26,26,26,0.65)',
    textFaint: 'rgba(26,26,26,0.4)',
    borderSoft: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.15)',
    bgSubtle: 'rgba(0,0,0,0.04)',
    cardBg: 'rgba(255,255,255,0.7)',
    cardShadow: '0 4px 20px rgba(0,0,0,0.06)',
    headerBg: 'rgba(255,255,255,0.75)',
    modalBg: '#ffffff',
    modalBackdrop: 'rgba(0,0,0,0.4)',
  } : {
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.7)',
    textFaint: 'rgba(255,255,255,0.4)',
    borderSoft: 'rgba(255,255,255,0.1)',
    borderStrong: 'rgba(255,255,255,0.2)',
    bgSubtle: 'rgba(255,255,255,0.06)',
    cardBg: 'rgba(255,255,255,0.05)',
    cardShadow: '0 4px 20px rgba(0,0,0,0.25)',
    headerBg: 'rgba(0,0,0,0.4)',
    modalBg: '#161618',
    modalBackdrop: 'rgba(0,0,0,0.65)',
  };

  const productosEnriquecidos = productos.map(p => ({
    ...p,
    categoria_nombre: categorias.find(c => String(c.id) === String(p.categoria))?.nombre || '',
  }));

  const productosFiltrados = productosEnriquecidos.filter(p =>
    categoriaActiva === 'Todas' ? true : p.categoria_nombre === categoriaActiva
  );

  useEffect(() => {
    if (!tabsRef.current) return;
    const active = tabsRef.current.querySelector('[data-active="true"]');
    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [categoriaActiva]);

  const todasCats = [{ nombre: 'Todas', id: null }, ...categorias];

  return (
    <div ref={rootRef} style={{ minHeight: '100vh', fontFamily: fuentes?.cuerpo, color: theme.text }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        .hscroll::-webkit-scrollbar{display:none}
        .hscroll{-ms-overflow-style:none;scrollbar-width:none}
      `}</style>

      {/* ══════════════════════════════════════════════════════
          HEADER — estilo magazine, sticky con blur
      ══════════════════════════════════════════════════════ */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: theme.headerBg,
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        borderBottom: `1px solid ${theme.borderSoft}`,
        padding: '18px 24px 14px',
        animation: 'slideDown 0.4s ease',
      }}>
        {/* Línea superior: número de mesa estilo "edición" */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 10,
        }}>
          <span style={{
            fontFamily: fuentes?.cuerpo, fontSize: 9, fontWeight: 700,
            color: theme.textFaint, letterSpacing: '0.3em', textTransform: 'uppercase',
          }}>
            Mesa N° {mesaId} · {new Date().toLocaleDateString('es', { day: '2-digit', month: 'short' }).toUpperCase()}
          </span>
          <button onClick={() => setVistaActiva('cuenta')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: `1px solid ${theme.borderStrong}`,
            padding: '5px 11px', borderRadius: 100, cursor: 'pointer',
            color: theme.text, position: 'relative',
          }}>
            <Icons.Receipt />
            <span style={{
              fontFamily: fuentes?.cuerpo, fontSize: 10, fontWeight: 700,
              color: theme.text, letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {ordenActiva ? `${ordenActiva.detalles?.length || 0} items` : 'Cuenta'}
            </span>
            {ordenActiva && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: color, boxShadow: `0 0 6px ${color}`,
                marginLeft: 2,
              }} />
            )}
          </button>
        </div>

        {/* Nombre del negocio — gigante editorial */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              fontFamily: fuentes?.titulos,
              fontSize: 30, fontWeight: 400, fontStyle: 'italic',
              color: theme.text, margin: 0, lineHeight: 1,
              letterSpacing: '-0.025em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {carta.nombreNegocio || 'La Carta'}
            </h1>
            {carta.slogan && (
              <div style={{
                fontFamily: fuentes?.cuerpo, fontSize: 10, fontWeight: 600,
                color: color, letterSpacing: '0.25em', textTransform: 'uppercase',
                marginTop: 6,
              }}>
                — {carta.slogan}
              </div>
            )}
          </div>
          {carta.logoUrl && (
            <Img src={carta.logoUrl} alt="logo"
              style={{
                width: 44, height: 44, borderRadius: '50%', objectFit: 'cover',
                flexShrink: 0, border: `1px solid ${theme.borderStrong}`,
              }}
            />
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════
          TABS vista (Carta / Cuenta)
      ══════════════════════════════════════════════════════ */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${theme.borderSoft}`,
        }}>
          {[['menu', 'La Carta'], ['cuenta', 'Mi Cuenta']].map(([key, label]) => (
            <button key={key} onClick={() => setVistaActiva(key)} style={{
              flex: 1, padding: '12px 0', background: 'transparent',
              border: 'none', cursor: 'pointer',
              color: vistaActiva === key ? color : theme.textFaint,
              fontFamily: fuentes?.cuerpo, fontSize: 11, fontWeight: 700,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              borderBottom: vistaActiva === key ? `2px solid ${color}` : '2px solid transparent',
              marginBottom: -1,
              transition: 'all 0.2s ease',
              position: 'relative',
            }}>
              {label}
              {key === 'cuenta' && ordenActiva && vistaActiva !== 'cuenta' && (
                <span style={{
                  position: 'absolute', top: 8, right: '25%',
                  width: 6, height: 6, borderRadius: '50%',
                  background: color, boxShadow: `0 0 8px ${color}`,
                }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          VISTA MENÚ
      ══════════════════════════════════════════════════════ */}
      {vistaActiva === 'menu' && (
        <div style={{ animation: 'fadeIn 0.3s ease', paddingBottom: 120 }}>

          {/* Hero editorial */}
          <div style={{ marginTop: 12 }}>
            <HeroDestacado
              productos={productosEnriquecidos}
              productosRecomendados={productosRecomendados}
              colorAcento={color}
              fuentes={fuentes}
              theme={theme}
              onVerDetalle={p => setProductoSeleccionado(p)}
            />
          </div>

          {/* Sección título tipo magazine */}
          <div style={{
            padding: '28px 24px 14px',
            display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{
                fontFamily: fuentes?.cuerpo, fontSize: 9, fontWeight: 700,
                color: color, letterSpacing: '0.3em', textTransform: 'uppercase',
                marginBottom: 4,
              }}>
                Capítulo {categoriaActiva === 'Todas' ? '01' : '02'}
              </div>
              <h2 style={{
                fontFamily: fuentes?.titulos, fontSize: 24, fontWeight: 400, fontStyle: 'italic',
                color: theme.text, margin: 0, letterSpacing: '-0.02em', lineHeight: 1,
              }}>
                {categoriaActiva === 'Todas' ? 'Toda la carta' : categoriaActiva}
              </h2>
            </div>
            <span style={{
              fontFamily: fuentes?.titulos, fontSize: 14, fontStyle: 'italic',
              color: theme.textFaint,
            }}>
              {String(productosFiltrados.length).padStart(2, '0')} platos
            </span>
          </div>

          {/* Filtros pills horizontales */}
          <div className="hscroll" ref={tabsRef} style={{
            display: 'flex', gap: 6, overflowX: 'auto',
            padding: '0 24px 24px',
          }}>
            {todasCats.map(cat => {
              const isActive = categoriaActiva === cat.nombre;
              return (
                <button
                  key={cat.id ?? 'todas'}
                  data-active={isActive}
                  onClick={() => setCategoriaActiva(cat.nombre)}
                  style={{
                    flexShrink: 0,
                    background: isActive ? color : 'transparent',
                    border: `1px solid ${isActive ? color : theme.borderStrong}`,
                    borderRadius: 100, padding: '7px 14px',
                    cursor: 'pointer',
                    fontFamily: fuentes?.cuerpo, fontSize: 11, fontWeight: 600,
                    color: isActive ? textOnAccent : theme.textMuted,
                    transition: 'all 0.2s ease',
                    letterSpacing: '0.05em',
                  }}
                >
                  {cat.nombre}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          <div style={{ padding: '0 20px' }}>
            {productosFiltrados.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '60px 24px',
                border: `1px dashed ${theme.borderStrong}`,
                borderRadius: 24,
              }}>
                <div style={{ fontSize: 42, marginBottom: 12, opacity: 0.4 }}>🍽️</div>
                <p style={{
                  fontFamily: fuentes?.titulos, fontSize: 16, fontStyle: 'italic',
                  color: theme.textMuted, margin: 0,
                }}>Próximamente en esta sección</p>
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 16, paddingBottom: 30,
              }}>
                {productosFiltrados.map((p, i) => (
                  <CardGrid
                    key={p.id}
                    plato={p}
                    idx={i}
                    colorAcento={color}
                    fuentes={fuentes}
                    theme={theme}
                    onSelect={setProductoSeleccionado}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer firma */}
          <div style={{
            padding: '40px 24px 0', textAlign: 'center',
            borderTop: `1px solid ${theme.borderSoft}`, marginTop: 30,
          }}>
            <div style={{
              fontFamily: fuentes?.titulos, fontSize: 14, fontStyle: 'italic',
              color: theme.textFaint, marginBottom: 4,
            }}>· · ·</div>
            <p style={{
              fontFamily: fuentes?.cuerpo, fontSize: 9, fontWeight: 700,
              color: theme.textFaint, letterSpacing: '0.3em', textTransform: 'uppercase', margin: 0,
            }}>
              Carta {new Date().getFullYear()} — Edición digital
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          VISTA CUENTA
      ══════════════════════════════════════════════════════ */}
      {vistaActiva === 'cuenta' && (
        <div style={{ padding: '28px 24px 100px', animation: 'fadeIn 0.3s ease' }}>

          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: fuentes?.cuerpo, fontSize: 9, fontWeight: 700,
              color: color, letterSpacing: '0.3em', textTransform: 'uppercase',
              marginBottom: 6,
            }}>
              Tu pedido
            </div>
            <h2 style={{
              fontFamily: fuentes?.titulos, fontSize: 28, fontWeight: 400, fontStyle: 'italic',
              color: theme.text, margin: 0, letterSpacing: '-0.02em', lineHeight: 1,
            }}>
              Mesa {mesaId}
            </h2>
          </div>

          {!ordenActiva ? (
            <div style={{
              textAlign: 'center', padding: '60px 24px',
              border: `1px dashed ${theme.borderStrong}`,
              borderRadius: 24,
            }}>
              <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.6 }}>🥂</div>
              <h3 style={{
                fontFamily: fuentes?.titulos, fontSize: 22, fontWeight: 400, fontStyle: 'italic',
                color: theme.text, margin: '0 0 8px', letterSpacing: '-0.01em',
              }}>
                Mesa disponible
              </h3>
              <p style={{
                fontFamily: fuentes?.cuerpo, fontSize: 13, color: theme.textMuted,
                lineHeight: 1.7, margin: '0 0 24px',
              }}>
                Aún no tienes pedidos.<br />Llama al mesero cuando estés listo.
              </p>
              <button onClick={() => setVistaActiva('menu')} style={{
                background: color, border: 'none', cursor: 'pointer',
                color: textOnAccent, fontFamily: fuentes?.cuerpo,
                fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase',
                padding: '14px 30px', borderRadius: 100,
                boxShadow: `0 8px 24px ${rgba(color, 0.4)}`,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                Explorar la carta <Icons.ArrowRight />
              </button>
            </div>
          ) : (
            <>
              {/* Estado */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 0',
                borderTop: `1px solid ${theme.borderSoft}`,
                borderBottom: `1px solid ${theme.borderSoft}`,
                marginBottom: 20,
              }}>
                <span style={{
                  fontFamily: fuentes?.cuerpo, fontSize: 9, fontWeight: 700,
                  color: theme.textFaint, letterSpacing: '0.25em', textTransform: 'uppercase',
                }}>Estado</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: fuentes?.cuerpo, fontSize: 11, fontWeight: 700,
                  color: color, letterSpacing: '0.15em', textTransform: 'uppercase',
                }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: color, boxShadow: `0 0 8px ${color}`,
                  }} />
                  {ordenActiva.estado}
                </span>
              </div>

              {/* Items */}
              <div>
                {ordenActiva.detalles?.map((det, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: `1px solid ${theme.borderSoft}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                      <span style={{
                        fontFamily: fuentes?.titulos, fontSize: 18, fontStyle: 'italic',
                        color: color, fontWeight: 500, minWidth: 22,
                      }}>×{det.cantidad}</span>
                      <span style={{
                        fontFamily: fuentes?.titulos, fontSize: 15, fontWeight: 400, fontStyle: 'italic',
                        color: theme.text, lineHeight: 1.2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {det.producto_nombre || det.producto?.nombre}
                      </span>
                    </div>
                    <span style={{
                      fontFamily: fuentes?.titulos, fontSize: 14, fontWeight: 500,
                      color: theme.textMuted,
                    }}>
                      S/ {(det.precio_unitario * det.cantidad).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{
                marginTop: 24, padding: '24px 0',
                borderTop: `2px solid ${theme.text}`,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{
                    fontFamily: fuentes?.cuerpo, fontSize: 9, fontWeight: 700,
                    color: theme.textFaint, letterSpacing: '0.3em', textTransform: 'uppercase',
                  }}>Total a pagar</div>
                  <div style={{
                    fontFamily: fuentes?.titulos, fontSize: 36, fontWeight: 400, fontStyle: 'italic',
                    color: theme.text, lineHeight: 1, marginTop: 4, letterSpacing: '-0.02em',
                  }}>
                    <span style={{ color: color, fontSize: 18, marginRight: 4 }}>S/</span>
                    {parseFloat(ordenActiva.total).toFixed(2)}
                  </div>
                </div>
              </div>

              <p style={{
                textAlign: 'center', marginTop: 24,
                fontFamily: fuentes?.cuerpo, fontSize: 10, fontWeight: 600,
                color: theme.textFaint, letterSpacing: '0.18em', textTransform: 'uppercase',
              }}>
                · El cobro lo realiza el mesero ·
              </p>
            </>
          )}
        </div>
      )}

      {/* MODAL */}
      {productoSeleccionado && (
        <ModalDetalle
          plato={productoSeleccionado}
          colorAcento={color}
          fuentes={fuentes}
          theme={theme}
          onClose={() => setProductoSeleccionado(null)}
        />
      )}
    </div>
  );
}