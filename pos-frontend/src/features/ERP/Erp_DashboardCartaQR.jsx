import React, { useState, useEffect, useRef } from 'react';
import { getMesas, getSedes } from '../../api/api';
import api from '../../api/api';          // instancia axios con cookies/CSRF
import { QRCodeSVG } from 'qrcode.react';
import usePosStore from '../../store/usePosStore';

// ── Helpers de carta (nuevos endpoints del backend) ──
const getCartaConfig  = ()           => api.get('/negocios/carta_config/');
const saveCartaConfig = (config)     => api.patch('/negocios/carta_config/', { carta_config: config });
const subirImagenCarta = (tipo, file) => {
  const form = new FormData();
  form.append('tipo',   tipo);   // 'logo' | 'fondo'
  form.append('imagen', file);
  return api.post('/negocios/subir_imagen_carta/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ============================================================
// CONSTANTES DEL EDITOR
// ============================================================
const FUENTES = [
  { id: 'playfair', label: 'Playfair Display', familia: "'Playfair Display', serif",  preview: 'Sabor Clásico'   },
  { id: 'poppins',  label: 'Poppins',          familia: "'Poppins', sans-serif",       preview: 'Sabor Moderno'   },
  { id: 'lora',     label: 'Lora',             familia: "'Lora', serif",              preview: 'Sabor Artesanal' },
  { id: 'oswald',   label: 'Oswald',           familia: "'Oswald', sans-serif",        preview: 'Sabor Bold'      },
  { id: 'dancing',  label: 'Dancing Script',   familia: "'Dancing Script', cursive",  preview: 'Sabor Creativo'  },
];

const FONDOS_PRESET = [
  { id: 'negro',   label: 'Noche',   color: '#080808' },
  { id: 'crema',   label: 'Crema',   color: '#faf6f0' },
  { id: 'pizarra', label: 'Pizarra', color: '#1c1f26' },
  { id: 'vino',    label: 'Vino',    color: '#1a0a0a' },
  { id: 'oliva',   label: 'Oliva',   color: '#0f1a0d' },
  { id: 'custom',  label: 'Custom',  color: null      },
];

const ESTILOS_TARJETA = [
  { id: 'minimal', label: 'Minimal', desc: 'Limpio, precio destacado'  },
  { id: 'gourmet', label: 'Gourmet', desc: 'Separadores elegantes'     },
  { id: 'bistro',  label: 'Bistro',  desc: 'Línea izquierda de acento' },
  { id: 'moderno', label: 'Moderno', desc: 'Badge grande, sin bordes'  },
];

const COLORES_ACENTO = [
  '#ff5a1f', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#ef4444', '#e2c97e',
];

const PLATOS_MOCK = [
  { nombre: 'Tagliatelle al Tartufo', precio: '38.00', desc: 'Pasta fresca, trufa negra y parmesano', popular: true  },
  { nombre: 'Carbonara Clásica',      precio: '29.00', desc: 'Guanciale, pecorino y pimienta negra',  popular: false },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function DashboardCartaQR() {

  // ── Store (igual que EditorMenu) ──
  const { configuracionGlobal } = usePosStore();
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const temaFondo     = configuracionGlobal?.temaFondo     || 'dark';
  const isDark        = temaFondo === 'dark';

  // ── Roles ──
  const rolUsuario  = localStorage.getItem('usuario_rol')?.toLowerCase() || '';
  const esDueño     = ['dueño', 'admin', 'administrador'].includes(rolUsuario.trim());
  // NOTA: En DashboardCartaQR original solo el 'dueño' exacto cambia de sede.
  // En EditorCartaVirtual usamos el array completo. Aquí mantenemos ambas lógicas.
  const esDueñoQR   = rolUsuario.trim() === 'dueño';
  const sedeAsignada = localStorage.getItem('sede_id');
  const negocioId    = localStorage.getItem('negocio_id');

  // ── Vista activa: 'qr' | 'editor' ──
  const [vista, setVista] = useState('qr');

  // ────────────────────────────────────────
  // ESTADO: QR
  // ────────────────────────────────────────
  const [sedes, setSedes]               = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState(
    esDueñoQR ? (localStorage.getItem('memoria_sede_qr') || '') : sedeAsignada
  );
  const [mesas, setMesas]               = useState([]);
  const [cargandoMesas, setCargandoMesas] = useState(false);

  // Memorizar sede del dueño
  useEffect(() => {
    if (esDueñoQR && sedeSeleccionada) {
      localStorage.setItem('memoria_sede_qr', sedeSeleccionada);
    }
  }, [sedeSeleccionada, esDueñoQR]);

  // Cargar sedes (solo una vez)
  useEffect(() => {
    let isMounted = true;
    const cargarSedes = async () => {
      try {
        const res = await getSedes();
        if (!isMounted) return;
        setSedes(res.data);
        if (esDueñoQR && res.data.length > 0) {
          setSedeSeleccionada(prev => prev ? prev : res.data[0].id);
        }
      } catch (error) {
        console.error('Error al cargar sedes:', error);
      }
    };
    cargarSedes();
    return () => { isMounted = false; };
  }, [esDueñoQR]);

  // Cargar mesas al cambiar de sede
  useEffect(() => {
    if (!sedeSeleccionada) return;
    let isMounted = true;
    const cargarMesas = async () => {
      setCargandoMesas(true);
      try {
        const res = await getMesas({ sede_id: sedeSeleccionada });
        if (isMounted) setMesas(res.data);
      } catch (error) {
        console.error('Error al cargar mesas para QR:', error);
      } finally {
        if (isMounted) setCargandoMesas(false);
      }
    };
    cargarMesas();
    return () => { isMounted = false; };
  }, [sedeSeleccionada]);

  const descargarQR = (idMesa, numeroMesa) => {
    const svg = document.getElementById(`qr-mesa-${idMesa}`);
    if (!svg) return;
    const svgData    = new XMLSerializer().serializeToString(svg);
    const canvas     = document.createElement('canvas');
    const ctx        = canvas.getContext('2d');
    const img        = new Image();
    img.onload = () => {
      canvas.width  = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const link    = document.createElement('a');
      link.download = `QR_Mesa_${numeroMesa}.png`;
      link.href     = pngFile;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // ────────────────────────────────────────
  // ESTADO: EDITOR DE CARTA
  // ────────────────────────────────────────
  const [cargandoEditor, setCargandoEditor] = useState(false);
  const [guardando,      setGuardando]      = useState(false);
  const [guardadoOk,     setGuardadoOk]     = useState(false);
  const [errorMsg,       setErrorMsg]       = useState('');
  const [pestana,        setPestana]        = useState('identidad');

  const [carta, setCarta] = useState({
    nombreNegocio:    localStorage.getItem('negocio_nombre') || 'Mi Restaurante',
    slogan:           '',
    logoUrl:          '',
    colorAcento:      colorPrimario,
    fondoTipo:        'negro',
    fondoColorCustom: '#111111',
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
    mejoraIA:         false,
  });

  const logoInputRef  = useRef(null);
  const fondoInputRef = useRef(null);

  // Cargar config del editor al abrir por primera vez (solo una vez por sesión)
  const editorCargado = useRef(false);
  useEffect(() => {
    if (vista !== 'editor' || editorCargado.current) return;
    editorCargado.current = true;
    const cargar = async () => {
      setCargandoEditor(true);
      try {
        const res = await getCartaConfig();
        if (res.data?.carta_config && Object.keys(res.data.carta_config).length > 0) {
          setCarta(prev => ({ ...prev, ...res.data.carta_config }));
        }
      } catch (err) {
        console.error('Error al cargar config carta:', err);
      } finally {
        setCargandoEditor(false);
      }
    };
    cargar();
  }, [vista]);

  const setCampo = (campo, valor) => setCarta(prev => ({ ...prev, [campo]: valor }));

  // Subida de logo — preview inmediata + upload al backend
  const [subiendoLogo,  setSubiendoLogo]  = useState(false);
  const [subiendoFondo, setSubiendoFondo] = useState(false);

  const onLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Preview local instantánea
    setCampo('logoUrl', URL.createObjectURL(file));
    setSubiendoLogo(true);
    try {
      const res = await subirImagenCarta('logo', file);
      setCampo('logoUrl', res.data.url);
    } catch (err) {
      console.error('Error subiendo logo:', err);
      setErrorMsg('No se pudo subir el logo. Intenta de nuevo.');
    } finally {
      setSubiendoLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const onFondoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCampo('fondoImagenUrl', URL.createObjectURL(file));
    setCampo('fondoTipo', 'custom');
    setSubiendoFondo(true);
    try {
      const res = await subirImagenCarta('fondo', file);
      setCampo('fondoImagenUrl', res.data.url);
    } catch (err) {
      console.error('Error subiendo fondo:', err);
      setErrorMsg('No se pudo subir la imagen de fondo. Intenta de nuevo.');
    } finally {
      setSubiendoFondo(false);
      if (fondoInputRef.current) fondoInputRef.current.value = '';
    }
  };

  const guardarCarta = async () => {
    setGuardando(true);
    setErrorMsg('');
    try {
      await saveCartaConfig(carta);
      setGuardadoOk(true);
      setTimeout(() => setGuardadoOk(false), 3000);
    } catch (err) {
      console.error('Error al guardar carta:', err);
      setErrorMsg('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  // ── Clases (patrón del proyecto) ──
  const cardCls  = isDark ? 'bg-[#141414] border-[#222]' : 'bg-white border-gray-200 shadow-sm';
  const inputCls = isDark
    ? 'bg-[#1a1a1a] border-[#333] text-white placeholder-neutral-600 focus:border-[#ff5a1f] outline-none'
    : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#ff5a1f] outline-none';
  const labelCls = isDark ? 'text-neutral-500' : 'text-gray-500';
  const textCls  = isDark ? 'text-white' : 'text-gray-900';
  const divider  = isDark ? 'border-[#1f1f1f]' : 'border-gray-100';

  // ── Preview computed ──
  const fuenteTit  = FUENTES.find(f => f.id === carta.fuenteTitulos) || FUENTES[0];
  const fuenteBody = FUENTES.find(f => f.id === carta.fuenteCuerpo)  || FUENTES[1];

  const bgPreview = () => {
    if (carta.fondoTipo === 'custom' && carta.fondoImagenUrl)
      return `url(${carta.fondoImagenUrl}) center/cover`;
    const preset = FONDOS_PRESET.find(f => f.id === carta.fondoTipo);
    if (carta.fondoTipo === 'custom') return carta.fondoColorCustom;
    return preset?.color || '#080808';
  };

  const TABS_EDITOR = [
    { id: 'identidad',  icon: 'fi-rr-id-badge',   label: 'Identidad'  },
    { id: 'fondo',      icon: 'fi-rr-picture',     label: 'Fondo'      },
    { id: 'tipografia', icon: 'fi-rr-text',        label: 'Tipografía' },
    { id: 'tarjetas',   icon: 'fi-rr-apps',        label: 'Platos'     },
  ];

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="animate-fadeIn space-y-6 pb-10 max-w-7xl mx-auto">

      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:wght@400;700&family=Oswald:wght@400;700&family=Dancing+Script:wght@700&family=Poppins:wght@400;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ═══ CABECERA ═══ */}
      <div
        className="flex flex-col md:flex-row justify-between md:items-center gap-6 pt-2 pb-6 border-b"
        style={{ borderColor: isDark ? '#222' : '#e5e7eb' }}
      >
        <div className="flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{ backgroundColor: colorPrimario + '15', color: colorPrimario }}
          >
            <i className={`fi ${vista === 'qr' ? 'fi-rr-qrcode' : 'fi-rr-picture'} mt-1`} />
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${textCls}`}>
              {vista === 'qr'
                ? <><span style={{ color: colorPrimario }}>Carta</span> Digital QR</>
                : <>Editor de <span style={{ color: colorPrimario }}>Carta Digital</span></>
              }
            </h2>
            <p className={`text-sm mt-1 ${labelCls}`}>
              {vista === 'qr'
                ? (esDueñoQR ? 'Gestiona los códigos QR de todas tus sedes.' : 'Genera los QR para las mesas de tu local.')
                : 'Personaliza el estilo visual que verán tus clientes al escanear el QR.'
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Toggle QR / Editor */}
          <div className={`flex gap-1 p-1.5 rounded-2xl border ${cardCls}`}>
            <button
              onClick={() => setVista('qr')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border border-transparent ${
                vista === 'qr'
                  ? 'text-white shadow-md'
                  : isDark ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#1a1a1a]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
              style={vista === 'qr' ? { backgroundColor: colorPrimario } : {}}
            >
              <i className="fi fi-rr-qrcode text-sm" /> QR
            </button>
            {esDueño && (
              <button
                onClick={() => setVista('editor')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 border border-transparent ${
                  vista === 'editor'
                    ? 'text-white shadow-md'
                    : isDark ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#1a1a1a]' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                }`}
                style={vista === 'editor' ? { backgroundColor: colorPrimario } : {}}
              >
                <i className="fi fi-rr-picture text-sm" /> Editor
              </button>
            )}
          </div>

          {/* Botón guardar (solo en editor) */}
          {vista === 'editor' && (
            <>
              {errorMsg && <span className="text-xs text-red-400 font-bold">{errorMsg}</span>}
              <button
                onClick={guardarCarta}
                disabled={guardando}
                className="px-6 py-3 rounded-xl text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                style={{ backgroundColor: guardadoOk ? '#10b981' : colorPrimario, opacity: guardando ? 0.7 : 1 }}
              >
                <i className={`fi ${guardadoOk ? 'fi-rr-check' : guardando ? 'fi-rr-spinner' : 'fi-rr-disk'} text-sm`} />
                {guardando ? 'Guardando...' : guardadoOk ? 'Guardado ✓' : 'Guardar Carta'}
              </button>
            </>
          )}

          {/* Selector de sede del dueño (solo en QR) */}
          {vista === 'qr' && esDueñoQR && sedes.length > 1 && (
            <div className="flex flex-col items-end gap-1.5">
              <span className={`text-[10px] font-black uppercase tracking-widest ${labelCls}`}>Sede</span>
              <select
                value={sedeSeleccionada || ''}
                onChange={e => setSedeSeleccionada(e.target.value)}
                className={`text-xs font-bold px-4 py-2.5 rounded-xl border outline-none cursor-pointer transition-all ${
                  isDark
                    ? 'bg-[#1a1a1a] text-white border-[#333] hover:border-[#ff5a1f] focus:border-[#ff5a1f]'
                    : 'bg-white text-gray-800 border-gray-300 hover:border-orange-400 focus:border-orange-400'
                }`}
                style={{ color: colorPrimario }}
              >
                {sedes.map(s => (
                  <option key={s.id} value={s.id}>📍 {s.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ═══ VISTA QR ═══ */}
      {vista === 'qr' && (
        <>
          {/* Badge de sede para admin */}
          {!esDueñoQR && (
            <div className={`inline-flex items-center px-5 py-3 rounded-2xl border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <span className="text-xl mr-2">📍</span>
              <span className={`text-sm font-bold uppercase tracking-wider ${labelCls}`}>
                Local:
                <span className={`ml-2 font-black ${textCls}`}>
                  {localStorage.getItem('sede_nombre') || 'Local Principal'}
                </span>
              </span>
            </div>
          )}

          {/* Grid de mesas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cargandoMesas ? (
              <div className="col-span-full flex flex-col items-center py-20 gap-4">
                <div
                  className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: colorPrimario, borderTopColor: 'transparent' }}
                />
                <p className={`text-xs font-black uppercase tracking-widest ${labelCls}`}>Sincronizando mesas...</p>
              </div>
            ) : mesas.length === 0 ? (
              <div className={`col-span-full p-20 text-center rounded-3xl border border-dashed ${isDark ? 'border-[#333]' : 'border-gray-300'}`}>
                <i className="fi fi-rr-table-layout text-3xl mb-3 block" style={{ color: colorPrimario + '66' }} />
                <p className={labelCls}>No hay mesas registradas en esta sede.</p>
              </div>
            ) : (
              mesas.map(mesa => {
                const urlMenu = `${window.location.origin}/menu/${negocioId}/${sedeSeleccionada}/${mesa.id}`;
                return (
                  <div
                    key={mesa.id}
                    className={`p-6 rounded-3xl border flex flex-col items-center text-center transition-all hover:border-[#444] ${cardCls}`}
                  >
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${labelCls}`}>
                      Mesa {mesa.numero_o_nombre}
                    </span>
                    <div className="bg-white p-4 rounded-2xl mb-6 shadow-2xl">
                      <QRCodeSVG
                        id={`qr-mesa-${mesa.id}`}
                        value={urlMenu}
                        size={150}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                    <div className="w-full space-y-2">
                      <button
                        onClick={() => descargarQR(mesa.id, mesa.numero_o_nombre)}
                        className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 text-black"
                        style={{ backgroundColor: '#ffffff' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e5e5e5'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                      >
                        <i className="fi fi-rr-download mr-2" />📥 Descargar PNG
                      </button>
                      <button
                        onClick={() => window.open(urlMenu, '_blank')}
                        className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                          isDark ? 'border-[#333] text-neutral-400 hover:text-white hover:border-[#555]' : 'border-gray-300 text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        🔗 Vista Previa
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* ═══ VISTA EDITOR ═══ */}
      {vista === 'editor' && (
        <>
          {!esDueño ? (
            <div className={`rounded-3xl border p-16 text-center ${cardCls}`}>
              <i className="fi fi-rr-lock text-4xl mb-4 block" style={{ color: colorPrimario }} />
              <p className={`font-black text-lg ${textCls}`}>Acceso restringido</p>
              <p className={`text-sm mt-1 ${labelCls}`}>Solo el dueño puede editar el estilo de la carta.</p>
            </div>
          ) : cargandoEditor ? (
            <div className="flex items-center justify-center py-32 gap-3">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: colorPrimario, borderTopColor: 'transparent' }}
              />
              <span className={`text-xs font-black uppercase tracking-widest ${labelCls}`}>Cargando configuración...</span>
            </div>
          ) : (
            <div className="flex flex-col xl:flex-row gap-8 items-start">

              {/* ── Panel Editor ── */}
              <div className="flex-1 w-full min-w-0 space-y-4">

                {/* Tabs */}
                <div className={`flex gap-1.5 p-1.5 rounded-2xl border ${cardCls}`}>
                  {TABS_EDITOR.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setPestana(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-transparent ${
                        pestana === tab.id
                          ? 'text-white shadow-md'
                          : isDark
                            ? 'text-neutral-500 hover:text-neutral-300 hover:bg-[#1a1a1a] hover:border-[#333]'
                            : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 hover:border-gray-200'
                      }`}
                      style={pestana === tab.id ? { backgroundColor: colorPrimario } : {}}
                    >
                      <i className={`fi ${tab.icon} text-sm mt-0.5`} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Contenido de tabs */}
                <div className={`rounded-3xl border p-6 space-y-7 ${cardCls}`}>

                  {/* ══ IDENTIDAD ══ */}
                  {pestana === 'identidad' && (
                    <>
                      <Seccion titulo="Logo del Negocio" icon="fi-rr-id-badge" labelCls={labelCls}>
                        <div className="flex items-center gap-5">
                          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden border-2 border-dashed ${isDark ? 'border-[#333] bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'}`}>
                            {carta.logoUrl
                              ? <img src={carta.logoUrl} alt="logo" className="w-full h-full object-contain" />
                              : <i className="fi fi-rr-restaurant text-3xl" style={{ color: colorPrimario + '66' }} />
                            }
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => logoInputRef.current?.click()}
                              disabled={subiendoLogo}
                              className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all flex items-center gap-2 disabled:opacity-60"
                              style={{ borderColor: colorPrimario, color: colorPrimario }}
                            >
                              {subiendoLogo
                                ? <><div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: colorPrimario }} /> Subiendo...</>
                                : <><i className="fi fi-rr-upload text-xs" />{carta.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}</>
                              }
                            </button>
                            {carta.logoUrl && (
                              <button
                                onClick={() => setCampo('logoUrl', '')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${isDark ? 'border-[#333] text-neutral-500 hover:text-red-400 hover:border-red-900' : 'border-gray-200 text-gray-400 hover:text-red-500'}`}
                              >
                                <i className="fi fi-rr-trash text-xs" /> Eliminar
                              </button>
                            )}
                            <p className={`text-[10px] ${labelCls}`}>PNG o SVG · Fondo transparente recomendado</p>
                          </div>
                          <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
                        </div>
                      </Seccion>

                      <hr className={`border-t ${divider}`} />

                      <Seccion titulo="Nombre del Negocio" icon="fi-rr-edit" labelCls={labelCls}>
                        <input
                          type="text"
                          value={carta.nombreNegocio}
                          onChange={e => setCampo('nombreNegocio', e.target.value)}
                          maxLength={50}
                          placeholder="Ej: Restaurante El Rincón"
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-bold transition-all ${inputCls}`}
                        />
                      </Seccion>

                      <Seccion titulo="Slogan o Subtítulo" icon="fi-rr-comment" labelCls={labelCls}>
                        <input
                          type="text"
                          value={carta.slogan}
                          onChange={e => setCampo('slogan', e.target.value)}
                          maxLength={80}
                          placeholder="Ej: Sabores auténticos desde 1990"
                          className={`w-full px-4 py-3 rounded-xl border text-sm transition-all ${inputCls}`}
                        />
                      </Seccion>

                      <hr className={`border-t ${divider}`} />

                      <Seccion titulo="Color de Acento de la Carta" icon="fi-rr-palette" labelCls={labelCls}>
                        <div className="flex flex-wrap gap-3 items-center">
                          {COLORES_ACENTO.map(color => (
                            <button
                              key={color}
                              onClick={() => setCampo('colorAcento', color)}
                              className="w-9 h-9 rounded-full transition-all active:scale-90"
                              style={{
                                background: color,
                                transform: carta.colorAcento === color ? 'scale(1.18)' : 'scale(1)',
                                boxShadow: carta.colorAcento === color
                                  ? `0 0 0 2px ${isDark ? '#141414' : '#fff'}, 0 0 0 4px ${color}`
                                  : 'none',
                              }}
                            />
                          ))}
                          <label
                            className={`w-9 h-9 rounded-full cursor-pointer flex items-center justify-center border-2 border-dashed text-sm ${labelCls}`}
                            style={{ borderColor: isDark ? '#444' : '#ccc' }}
                            title="Color personalizado"
                          >
                            <i className="fi fi-rr-add" />
                            <input type="color" value={carta.colorAcento} onChange={e => setCampo('colorAcento', e.target.value)} className="opacity-0 absolute w-0 h-0" />
                          </label>
                          <span className={`text-xs font-mono ${labelCls}`}>{carta.colorAcento}</span>
                        </div>
                        <p className={`text-[10px] mt-1 ${labelCls}`}>
                          Afecta precios, badges y separadores. Por defecto usa el color de tu marca.
                        </p>
                      </Seccion>
                    </>
                  )}

                  {/* ══ FONDO ══ */}
                  {pestana === 'fondo' && (
                    <>
                      <Seccion titulo="Fondo de la Carta" icon="fi-rr-picture" labelCls={labelCls}>
                        <div className="grid grid-cols-3 gap-3">
                          {FONDOS_PRESET.map(f => (
                            <button
                              key={f.id}
                              onClick={() => { if (f.id !== 'custom') setCampo('fondoImagenUrl', ''); setCampo('fondoTipo', f.id); }}
                              className="p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95"
                              style={{ borderColor: carta.fondoTipo === f.id ? colorPrimario : isDark ? '#333' : '#e5e7eb' }}
                            >
                              <div
                                className="w-full h-10 rounded-xl border border-white/10"
                                style={{ background: f.color || (isDark ? '#333' : '#ddd') }}
                              />
                              <span className={`text-[10px] font-black uppercase tracking-widest ${labelCls}`}>{f.label}</span>
                            </button>
                          ))}
                        </div>
                      </Seccion>

                      {carta.fondoTipo === 'custom' && (
                        <>
                          <hr className={`border-t ${divider}`} />
                          <Seccion titulo="Imagen o Color Personalizado" icon="fi-rr-upload" labelCls={labelCls}>
                            <button
                              onClick={() => fondoInputRef.current?.click()}
                              disabled={subiendoFondo}
                              className="w-full py-3 rounded-xl border border-dashed text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                              style={{ borderColor: colorPrimario, color: colorPrimario }}
                            >
                              {subiendoFondo
                                ? <><div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: colorPrimario }} /> Subiendo imagen...</>
                                : <><i className="fi fi-rr-picture" /> Subir Imagen de Fondo</>
                              }
                            </button>
                            <div className="flex items-center gap-3 mt-3">
                              <span className={`text-xs ${labelCls} whitespace-nowrap`}>O elige un color:</span>
                              <input
                                type="color"
                                value={carta.fondoColorCustom}
                                onChange={e => { setCampo('fondoColorCustom', e.target.value); setCampo('fondoImagenUrl', ''); }}
                                className="w-10 h-10 rounded-xl cursor-pointer border-0"
                              />
                              <span className={`text-xs font-mono ${labelCls}`}>{carta.fondoColorCustom}</span>
                            </div>
                            <input ref={fondoInputRef} type="file" accept="image/*" className="hidden" onChange={onFondoChange} />
                          </Seccion>
                        </>
                      )}

                      <hr className={`border-t ${divider}`} />

                      <Seccion titulo="Oscuridad del Overlay" icon="fi-rr-brightness" labelCls={labelCls}>
                        <div className="flex items-center gap-4">
                          <input
                            type="range" min={0} max={95} value={carta.opacidadOverlay}
                            onChange={e => setCampo('opacidadOverlay', Number(e.target.value))}
                            className="flex-1"
                            style={{ accentColor: colorPrimario }}
                          />
                          <span className="text-sm font-black w-12 text-right" style={{ color: colorPrimario }}>
                            {carta.opacidadOverlay}%
                          </span>
                        </div>
                        <p className={`text-[10px] mt-1 ${labelCls}`}>
                          Capa oscura sobre el fondo para mejorar la legibilidad del texto.
                        </p>
                      </Seccion>
                    </>
                  )}

                  {/* ══ TIPOGRAFÍA ══ */}
                  {pestana === 'tipografia' && (
                    <>
                      <Seccion titulo="Fuente para Títulos y Precios" icon="fi-rr-text" labelCls={labelCls}>
                        <div className="space-y-2">
                          {FUENTES.map(f => (
                            <button
                              key={f.id}
                              onClick={() => setCampo('fuenteTitulos', f.id)}
                              className="w-full px-5 py-4 rounded-2xl border-2 flex items-center justify-between transition-all"
                              style={{ borderColor: carta.fuenteTitulos === f.id ? colorPrimario : isDark ? '#2a2a2a' : '#e5e7eb' }}
                            >
                              <span className={`text-[10px] font-black uppercase tracking-widest ${labelCls}`}>{f.label}</span>
                              <span
                                className="text-base font-bold"
                                style={{ fontFamily: f.familia, color: carta.fuenteTitulos === f.id ? colorPrimario : isDark ? '#fff' : '#111' }}
                              >
                                {f.preview}
                              </span>
                            </button>
                          ))}
                        </div>
                      </Seccion>

                      <hr className={`border-t ${divider}`} />

                      <Seccion titulo="Fuente para Descripciones" icon="fi-rr-align-left" labelCls={labelCls}>
                        <div className="space-y-2">
                          {FUENTES.slice(0, 3).map(f => (
                            <button
                              key={f.id}
                              onClick={() => setCampo('fuenteCuerpo', f.id)}
                              className="w-full px-5 py-4 rounded-2xl border-2 flex items-center justify-between transition-all"
                              style={{ borderColor: carta.fuenteCuerpo === f.id ? colorPrimario : isDark ? '#2a2a2a' : '#e5e7eb' }}
                            >
                              <span className={`text-[10px] font-black uppercase tracking-widest ${labelCls}`}>{f.label}</span>
                              <span
                                className="text-sm"
                                style={{ fontFamily: f.familia, color: carta.fuenteCuerpo === f.id ? colorPrimario : isDark ? '#aaa' : '#555' }}
                              >
                                Con sazón y tradición
                              </span>
                            </button>
                          ))}
                        </div>
                      </Seccion>
                    </>
                  )}

                  {/* ══ PLATOS ══ */}
                  {pestana === 'tarjetas' && (
                    <>
                      <Seccion titulo="Estilo de Tarjeta de Plato" icon="fi-rr-apps" labelCls={labelCls}>
                        <div className="grid grid-cols-2 gap-3">
                          {ESTILOS_TARJETA.map(est => (
                            <button
                              key={est.id}
                              onClick={() => setCampo('estiloTarjeta', est.id)}
                              className="p-4 rounded-2xl border-2 text-left transition-all active:scale-95"
                              style={{ borderColor: carta.estiloTarjeta === est.id ? colorPrimario : isDark ? '#2a2a2a' : '#e5e7eb' }}
                            >
                              <p className="text-sm font-black mb-0.5" style={{ color: carta.estiloTarjeta === est.id ? colorPrimario : isDark ? '#fff' : '#111' }}>
                                {est.label}
                              </p>
                              <p className={`text-[10px] ${labelCls}`}>{est.desc}</p>
                            </button>
                          ))}
                        </div>
                      </Seccion>

                      <hr className={`border-t ${divider}`} />

                      <Seccion titulo="Opciones de Presentación" icon="fi-rr-settings-sliders" labelCls={labelCls}>
                        {[
                          { campo: 'mostrarDesc',     label: 'Mostrar descripción del plato' },
                          { campo: 'mostrarCalor',    label: 'Mostrar calorías'              },
                          { campo: 'mostrarBadge',    label: 'Badge "Más pedido"'            },
                          { campo: 'mostrarImagenes', label: 'Mostrar imágenes de platos'    },
                          { campo: 'esquinas',        label: 'Esquinas muy redondeadas'      },
                        ].map(op => (
                          <div key={op.campo} className={`flex justify-between items-center py-3 border-b last:border-b-0 ${divider}`}>
                            <span className={`text-sm font-bold ${textCls}`}>{op.label}</span>
                            <Toggle activo={carta[op.campo]} onChange={v => setCampo(op.campo, v)} color={colorPrimario} isDark={isDark} />
                          </div>
                        ))}
                      </Seccion>

                      <hr className={`border-t ${divider}`} />

                      {/* Bloque IA */}
                      <div
                        className="p-5 rounded-2xl border-2 transition-all"
                        style={{ borderColor: carta.mejoraIA ? colorPrimario : isDark ? '#2a2a2a' : '#e5e7eb' }}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <i className="fi fi-rr-magic-wand text-sm" style={{ color: colorPrimario }} />
                              <span className={`text-sm font-black ${textCls}`}>Mejora de Imágenes con IA</span>
                              <span className="text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest text-white" style={{ background: colorPrimario }}>
                                Próximamente
                              </span>
                            </div>
                            <p className={`text-xs leading-relaxed ${labelCls}`}>
                              Mejora automáticamente iluminación, encuadre y color de las fotos de tus platos con inteligencia artificial.
                            </p>
                          </div>
                          <Toggle activo={carta.mejoraIA} onChange={v => setCampo('mejoraIA', v)} color={colorPrimario} isDark={isDark} />
                        </div>
                        {carta.mejoraIA && (
                          <div className={`mt-4 p-4 rounded-xl text-center ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-50'}`}>
                            <i className="fi fi-rr-time-forward text-2xl mb-2 block" style={{ color: colorPrimario + '66' }} />
                            <p className={`text-xs ${labelCls}`}>
                              Esta función estará disponible en la próxima actualización. ¡Ya la tienes activada para cuando se lance!
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                </div>
              </div>

              {/* ── Panel Preview ── */}
              <div className="w-full xl:w-[360px] shrink-0 xl:sticky xl:top-24 space-y-3">
                <div className={`p-3 rounded-2xl border flex items-center gap-2 ${cardCls}`}>
                  <i className="fi fi-rr-eye text-sm" style={{ color: colorPrimario }} />
                  <span className={`text-xs font-black uppercase tracking-widest ${labelCls}`}>Vista Previa · En Vivo</span>
                  <span className={`ml-auto text-[9px] px-2 py-1 rounded-lg font-bold ${isDark ? 'bg-[#1a1a1a] text-neutral-600' : 'bg-gray-100 text-gray-400'}`}>
                    Carta Digital
                  </span>
                </div>

                {/* Mockup */}
                <div className="rounded-3xl overflow-hidden border border-[#222] shadow-2xl" style={{ background: bgPreview(), minHeight: 580 }}>
                  <div className="flex flex-col" style={{ background: `rgba(0,0,0,${carta.opacidadOverlay / 100})`, minHeight: 580 }}>
                    {/* Header carta */}
                    <div className="flex flex-col items-center pt-10 pb-6 px-6 text-center">
                      {carta.logoUrl
                        ? <img src={carta.logoUrl} alt="logo" className="w-14 h-14 object-contain mb-3 rounded-xl" />
                        : (
                          <div className="w-14 h-14 rounded-xl mb-3 flex items-center justify-center text-2xl" style={{ background: carta.colorAcento + '22' }}>
                            🍽️
                          </div>
                        )
                      }
                      <h1 className="text-xl font-bold text-white leading-tight" style={{ fontFamily: fuenteTit.familia }}>
                        {carta.nombreNegocio || 'Mi Restaurante'}
                      </h1>
                      {carta.slogan && (
                        <p className="text-xs mt-1 text-white/50" style={{ fontFamily: fuenteBody.familia }}>
                          {carta.slogan}
                        </p>
                      )}
                      <div className="mt-3 w-10 h-0.5 rounded-full" style={{ background: carta.colorAcento }} />
                    </div>

                    {/* Pill categoría */}
                    <div className="px-4 pb-3 flex justify-center">
                      <span
                        className="text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full"
                        style={{ background: carta.colorAcento + '22', border: `1px solid ${carta.colorAcento}55`, color: carta.colorAcento }}
                      >
                        🍝 Pastas
                      </span>
                    </div>

                    {/* Tarjetas mock */}
                    <div className="px-4 pb-6 space-y-3">
                      {PLATOS_MOCK.map((plato, i) => (
                        <PreviewTarjeta
                          key={i}
                          plato={plato}
                          estilo={carta.estiloTarjeta}
                          fuenteTit={fuenteTit.familia}
                          fuenteBody={fuenteBody.familia}
                          acento={carta.colorAcento}
                          mostrarDesc={carta.mostrarDesc}
                          mostrarBadge={carta.mostrarBadge}
                          mostrarImagen={carta.mostrarImagenes}
                          esquinas={carta.esquinas}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTES
// ============================================================

function Seccion({ titulo, icon, labelCls, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <i className={`fi ${icon} text-sm opacity-60`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${labelCls}`}>{titulo}</span>
      </div>
      {children}
    </div>
  );
}

function Toggle({ activo, onChange, color, isDark }) {
  return (
    <button
      onClick={() => onChange(!activo)}
      className="relative w-12 h-6 rounded-full transition-all shrink-0"
      style={{ background: activo ? color : isDark ? '#2a2a2a' : '#d1d5db' }}
    >
      <div
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: activo ? '28px' : '4px' }}
      />
    </button>
  );
}

function PreviewTarjeta({ plato, estilo, fuenteTit, fuenteBody, acento, mostrarDesc, mostrarBadge, mostrarImagen, esquinas }) {
  const r = esquinas ? 'rounded-2xl' : 'rounded-lg';
  const estilosMap = {
    minimal: 'bg-white/5 border border-white/10',
    gourmet: 'bg-black/40 border border-white/15',
    bistro:  'bg-white/5 border border-white/10 border-l-2',
    moderno: 'bg-white/10',
  };
  return (
    <div
      className={`p-4 ${r} ${estilosMap[estilo] || estilosMap.minimal}`}
      style={estilo === 'bistro' ? { borderLeftColor: acento } : {}}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            <span className="text-white text-sm font-bold leading-snug" style={{ fontFamily: fuenteTit }}>
              {plato.nombre}
            </span>
            {mostrarBadge && plato.popular && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase shrink-0 text-white" style={{ background: acento }}>
                ⭐ Popular
              </span>
            )}
          </div>
          {mostrarDesc && (
            <p className="text-white/50 text-xs leading-relaxed" style={{ fontFamily: fuenteBody }}>
              {plato.desc}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-sm font-black" style={{ fontFamily: fuenteTit, color: acento }}>
            <span className="text-[10px] opacity-75 mr-0.5">S/</span>{plato.precio}
          </span>
          {mostrarImagen && (
            <div className={`w-12 h-12 ${esquinas ? 'rounded-xl' : 'rounded-md'} bg-white/10 flex items-center justify-center text-xl`}>
              🍝
            </div>
          )}
        </div>
      </div>
    </div>
  );
}