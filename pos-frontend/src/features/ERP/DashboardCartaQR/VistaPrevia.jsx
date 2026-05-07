import React, { useState } from 'react';
import { FONDOS_PRESET, FUENTES } from './constantes';
import MenuTemaGrid from '../../public/MenuTemaGrid'; // <--- Importas tu archivo real aquí
import MenuTemaHero from '../../public/MenuTemaHero'; // <--- Importas tu archivo real aquí
import MenuTemaLista from '../../public/MenuTemaLista'; // <--- Importas tu archivo real aquí

export default function VistaPrevia({ carta, colorPrimario, isDark, productos }) {
  const cardCls = isDark ? 'bg-[#141414] border-[#222]' : 'bg-white border-gray-200 shadow-sm';
  const labelCls = isDark ? 'text-neutral-500' : 'text-gray-500';

  // ── 1. ESTADOS SIMULADOS PARA LA VISTA PREVIA ──
  const [vistaActiva, setVistaActiva] = useState('menu');

  // ── 2. DATOS MOCK ADAPTADOS AL BACKEND REAL ──
  const categoriasDemo = [
    { id: 1, nombre: 'Promociones' },
    { id: 2, nombre: 'Fondos' }
  ];

  // Si hay productos reales (con fotos subidas), los usa. Si no, usa este mock perfecto.
  const platosDemo = productos?.length > 0 ? productos : [
    { id: 1, nombre: 'Anticuchos de Corazón', precio_base: '25.00', imagen: null, categoria: 2, descripcion: 'Acompañados de papa y choclo.' },
    { id: 2, nombre: 'Promo Pareja', precio_base: '45.00', imagen: null, categoria: 1, descripcion: '2 Platos + Bebida.' },
  ];

  // ── 3. COMPUTAMOS FUENTES Y COLORES ──
  const colorAcentoReal = carta.colorPrimario || colorPrimario || '#ff5a1f';
  
  const fuentes = {
    titulos: FUENTES.find(f => f.id === carta.fuenteTitulos)?.familia || "'Playfair Display', serif",
    cuerpo: FUENTES.find(f => f.id === carta.fuenteCuerpo)?.familia || "'Poppins', sans-serif"
  };

  const bgPreview = () => {
    if (carta.fondoTipo === 'custom' && carta.fondoImagenUrl) return `url(${carta.fondoImagenUrl}) center/cover`;
    const preset = FONDOS_PRESET.find(f => f.id === carta.colorFondo);
    return preset?.color || carta.colorFondo || '#080808';
  };

  // ── 4. EL ORQUESTADOR ──
  const renderTheme = () => {
    // Construimos el paquete de props que exige tu componente
    const propsComunes = {
      mesaId: '12',
      productos: platosDemo,
      categorias: categoriasDemo,
      ordenActiva: null, // Lo dejamos en null para simular que no han pedido aún
      carta: carta,
      fuentes: fuentes,
      colorAcento: colorAcentoReal,
      vistaActiva: vistaActiva,
      setVistaActiva: setVistaActiva
    };

    switch (carta.tipoPresentacion) {
      // Suponiendo que 'modelo_3' es tu MenuTemaGrid
      case 'modelo_3': return <MenuTemaGrid {...propsComunes} />;
      case 'modelo_2': return <MenuTemaHero {...propsComunes} />;
      case 'modelo_1': return <MenuTemaLista {...propsComunes} />;
      default:         return <MenuTemaGrid {...propsComunes} />;
    }
  };

  return (
    <div className="w-full xl:w-[360px] shrink-0 xl:sticky xl:top-24 space-y-3">
      <div className={`p-3 rounded-2xl border flex items-center gap-2 ${cardCls}`}>
        <i className="fi fi-rr-mobile text-sm" style={{ color: colorPrimario }} />
        <span className={`text-xs font-black uppercase tracking-widest ${labelCls}`}>Vista Previa</span>
      </div>

      <div className="rounded-3xl overflow-hidden border-4 border-[#222] shadow-2xl relative" style={{ background: bgPreview(), height: 680 }}>
        {/* Aquí llamamos la función renderTheme() que inyecta tu componente */}
        <div className="relative z-10 w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
           {renderTheme()} 
        </div>
      </div>
    </div>
  );
}