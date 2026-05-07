import React, { useState } from 'react';
import { Truck, Clock, Layers } from 'lucide-react';
import Crm_TabCombos from './Crm_TabCombos';
import Crm_TabHorarios from './Crm_TabHorarios';
import Crm_TabReglas from './Crm_TabReglas';

export default function Crm_CombosPromociones({ config, productosReales = [], categoriasReales = [] , sedesReales = []}) {
  const isDark = config.temaFondo === 'dark';
  const colorPrimario = config.colorPrimario || '#ff5a1f';
  const [modoActivo, setModoActivo] = useState('reglas');

  const modos = [
    { id: 'reglas', icon: Truck, title: 'Reglas de Negocio', desc: 'Recargos, descuentos y condiciones' },
    { id: 'horarios', icon: Clock, title: 'Happy Hours', desc: '2x1, precios especiales, visibilidad' },
    { id: 'combos', icon: Layers, title: 'Combos Promocionales', desc: 'Paquetes con fechas' },
  ];

  return (
    <div className="w-full animate-fadeIn">

      {/* Selector de modo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {modos.map(modo => {
          const Icon = modo.icon;
          const isSelected = modoActivo === modo.id;
          return (
            <button
              key={modo.id}
              onClick={() => setModoActivo(modo.id)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? isDark ? 'border-opacity-100 shadow-lg' : 'shadow-lg'
                  : isDark ? 'border-[#222] bg-[#111] hover:bg-[#1a1a1a]' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
              style={isSelected ? { borderColor: colorPrimario, backgroundColor: colorPrimario + '12' } : {}}
            >
              <div className="flex items-center gap-3 mb-1">
                <Icon size={20} color={isSelected ? colorPrimario : (isDark ? '#888' : '#666')} />
                <h4 className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{modo.title}</h4>
              </div>
              <p className={`text-xs ml-8 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{modo.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Contenido de cada tab — cada uno maneja su propio estado y API */}
      {modoActivo === 'reglas' && (
        <Crm_TabReglas isDark={isDark} colorPrimario={colorPrimario} />
      )}

      {modoActivo === 'horarios' && (
        <Crm_TabHorarios
          isDark={isDark}
          colorPrimario={colorPrimario}
          productosReales={productosReales}
          categoriasReales={categoriasReales}
          sedesReales={sedesReales}
        />
      )}

      {modoActivo === 'combos' && (
        <Crm_TabCombos
          isDark={isDark}
          colorPrimario={colorPrimario}
          productosReales={productosReales}
          categoriasReales={categoriasReales}
          sedesReales={sedesReales}
        />
      )}
    </div>
  );
}