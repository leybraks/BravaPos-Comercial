import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getMenuPublico, getOrdenPublica } from '../../api/api';

import MenuTemaGrid from './MenuTemaGrid';
import MenuTemaLista from './MenuTemaLista';
import MenuTemaHero from './MenuTemaHero';

const DEFAULTS_CARTA = {
  nombreNegocio: '',
  slogan: '',
  logoUrl: '',
  colorPrimario: '#F47B0A',
  colorFondo: 'negro',
  tipoPresentacion: 'modelo_3',
};

// Colores de fondo predefinidos
const FONDOS_COLOR = {
  negro:   '#080808',
  crema:   '#faf6f0',
  pizarra: '#1c1f26',
  vino:    '#1a0a0a',
  oliva:   '#0f1a0d',
};

export default function PublicMenu() {
  const { negocioId, sedeId, mesaId } = useParams();
  const [vistaActiva, setVistaActiva]   = useState('menu');
  const [productos, setProductos]       = useState([]);
  const [categorias, setCategorias]     = useState([]);
  const [ordenActiva, setOrdenActiva]   = useState(null);
  const [cargando, setCargando]         = useState(true);
  const [carta, setCarta]               = useState(DEFAULTS_CARTA);

  // ── FUTURO ML: cuando tengas el modelo, inyecta aquí la lista ordenada ──
  // const [productosRecomendados, setProductosRecomendados] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const cargarData = async () => {
      try {
        const [resMenu, resOrden] = await Promise.all([
          getMenuPublico(sedeId),
          getOrdenPublica(sedeId, mesaId),
        ]);
        if (!isMounted) return;
        
        setProductos(resMenu.data.productos || []);
        setCategorias(resMenu.data.categorias || []);
        setOrdenActiva(resOrden.data.orden || null);

        const nombreRealBD = resMenu.data.negocio_nombre;

        if (resMenu.data.carta_config && Object.keys(resMenu.data.carta_config).length > 0) {
          setCarta(prev => ({
            ...prev,
            ...resMenu.data.carta_config,
            nombreNegocio: resMenu.data.carta_config.nombreNegocio || nombreRealBD || prev.nombreNegocio,
          }));
        } else {
          setCarta(prev => ({
            ...prev,
            nombreNegocio: nombreRealBD || prev.nombreNegocio,
          }));
        }

        // ── FUTURO ML ──────────────────────────────────────────────────────
        // Aquí podrías llamar a tu endpoint de recomendaciones:
        //
        // const resRecom = await getRecomendaciones(sedeId, mesaId);
        // if (isMounted) setProductosRecomendados(resRecom.data.productos);
        // ──────────────────────────────────────────────────────────────────

      } catch (error) {
        if (isMounted) console.error('Error al cargar la carta digital:', error);
      } finally {
        if (isMounted) setCargando(false);
      }
    };

    cargarData();
    const intervalo = setInterval(cargarData, 60000);
    return () => { isMounted = false; clearInterval(intervalo); };
  }, [sedeId, mesaId]);

  // ── Color primario y fondo ──
  const colorPrimarioReal = carta.colorPrimario || '#F47B0A';
  const fondoHex = FONDOS_COLOR[carta.colorFondo] || carta.colorFondo || '#080808';

  // Fuentes (por si los temas Lista/Hero las siguen usando)
  const fuentes = {
    titulos: carta.fuenteTitulos || "'Playfair Display', serif",
    cuerpo:  carta.fuenteCuerpo  || "'Poppins', sans-serif",
  };

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#050505' }}>
        <div style={{
          width: 56, height: 56,
          border: `4px solid ${colorPrimarioReal}`,
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const propsTema = {
    mesaId,
    productos,
    categorias,
    ordenActiva,
    carta,
    fuentes,
    colorAcento: colorPrimarioReal,
    vistaActiva,
    setVistaActiva,
    // productosRecomendados,   ← descomentar cuando el ML esté listo
  };

  const renderTemaCarta = () => {
    switch (carta.tipoPresentacion) {
      case 'modelo_1': return <MenuTemaLista {...propsTema} />;
      case 'modelo_2': return <MenuTemaHero  {...propsTema} />;
      case 'modelo_3': return <MenuTemaGrid  {...propsTema} />;
      default:         return <MenuTemaGrid  {...propsTema} />;
    }
  };

  return (
    <>
      {/* Fuentes */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lora:wght@400;700&family=Oswald:wght@400;700&family=Dancing+Script:wght@700&family=Poppins:wght@400;600;700;900&display=swap"
        rel="stylesheet"
      />

      {/*
        ─── FONDO REAL ───
        Solo una capa con el color de fondo configurado.
        El componente de tema ya no dibuja su propio fondo negro,
        así que este color se ve correctamente.
      */}
      <div style={{ backgroundColor: fondoHex, minHeight: '100vh' }}>
        <div style={{ minHeight: '100vh' }} className="text-white pb-24">
          {renderTemaCarta()}
        </div>
      </div>
    </>
  );
}