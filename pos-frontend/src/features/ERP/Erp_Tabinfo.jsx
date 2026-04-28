import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// 📍 Pin Estilo Maps (Naranja Brava)
const iconoPin = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

function SelectorUbicacion({ formSede, setFormSede }) {
  useMapEvents({
    click(e) {
      setFormSede({ ...formSede, latitud: e.latlng.lat, longitud: e.latlng.lng });
    },
  });
  return null;
}

export default function TabInfo({ c, colorPrimario, formSede, setFormSede, guardando, onGuardar, tema }) {
  // Leaflet overrides z-index globally — cap it so modals render on top
  const estiloMapa = `
    .leaflet-map-pane,
    .leaflet-tile-pane,
    .leaflet-overlay-pane,
    .leaflet-shadow-pane,
    .leaflet-marker-pane,
    .leaflet-tooltip-pane,
    .leaflet-popup-pane,
    .leaflet-control-container {
      z-index: auto !important;
    }
    .leaflet-container {
      z-index: 0 !important;
    }
  `;
  const isDark = tema === 'dark';
  const [localizando, setLocalizando] = useState(false);

  // ✨ Función para forzar ubicación de alta precisión
  const obtenerUbicacionPrecisa = () => {
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormSede(prev => ({
          ...prev,
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude
        }));
        setLocalizando(false);
      },
      (error) => {
        console.error("Error de GPS:", error);
        setLocalizando(false);
        alert("No pudimos obtener tu ubicación exacta. Por favor, fíjala manualmente en el mapa.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fadeIn w-full items-stretch">
      
      {/* 📝 COLUMNA 1: FORMULARIO Y ACCIONES */}
      <div 
        className="p-6 md:p-8 rounded-2xl border flex flex-col justify-between shadow-sm"
        style={{ background: c.surface, borderColor: c.border }}
      >
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: colorPrimario + '15', color: colorPrimario }}>
              <i className="fi fi-rr-settings-sliders"></i>
            </div>
            <div>
              <h3 className="text-lg font-black" style={{ color: c.text }}>Datos de la Sede</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: c.muted }}>Configura el nombre y la ubicación</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: c.muted }}>Nombre Comercial</label>
              <input
                type="text"
                value={formSede.nombre}
                onChange={(e) => setFormSede({ ...formSede, nombre: e.target.value })}
                className="w-full border px-5 py-4 rounded-2xl focus:outline-none transition-all font-bold text-sm shadow-inner"
                style={{ background: c.surface2, borderColor: c.border2, color: c.text }}
                onFocus={(e) => e.target.style.borderColor = colorPrimario}
                onBlur={(e) => e.target.style.borderColor = c.border2}
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: c.muted }}>Dirección / Referencia</label>
              <input
                type="text"
                value={formSede.direccion}
                onChange={(e) => setFormSede({ ...formSede, direccion: e.target.value })}
                placeholder="Ej. Frente a la plaza principal"
                className="w-full border px-5 py-4 rounded-2xl focus:outline-none transition-all font-bold text-sm shadow-inner"
                style={{ background: c.surface2, borderColor: c.border2, color: c.text }}
                onFocus={(e) => e.target.style.borderColor = colorPrimario}
                onBlur={(e) => e.target.style.borderColor = c.border2}
              />
            </div>

            <button 
              onClick={obtenerUbicacionPrecisa}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
              style={{ color: colorPrimario }}
            >
              <i className={`fi ${localizando ? 'fi-rr-spinner animate-spin' : 'fi-rr-crosshairs'}`}></i>
              {localizando ? 'Localizando...' : 'Usar mi ubicación actual (GPS)'}
            </button>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t" style={{ borderColor: c.border2 }}>
          <button
            onClick={onGuardar}
            disabled={guardando}
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-lg transition-all active:scale-95 disabled:opacity-50"
            style={{ 
                backgroundColor: colorPrimario,
                boxShadow: `0 8px 25px ${colorPrimario}30`
            }}
          >
            {guardando ? 'Sincronizando...' : 'Guardar y Sincronizar Sede'}
          </button>
        </div>
      </div>

      <style>{estiloMapa}</style>

      {/* 🗺️ COLUMNA 2: EL MAPA PROFESIONAL */}
      <div 
        className="rounded-2xl border overflow-hidden relative shadow-sm min-h-[450px]" 
        style={{ borderColor: c.border, isolation: 'isolate', zIndex: 0 }}
      >
        <MapContainer 
          center={[formSede.latitud || -12.0464, formSede.longitud || -77.0428]} 
          zoom={16} 
          className="h-full w-full"
          key={formSede.latitud != null && formSede.longitud != null ? `${formSede.latitud}-${formSede.longitud}` : 'default'} 
        >
          <TileLayer
            url={isDark 
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
              : "http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" 
            }
            subdomains={['mt0','mt1','mt2','mt3']}
          />
          {formSede.latitud != null && formSede.longitud != null && (
            <Marker position={[formSede.latitud, formSede.longitud]} icon={iconoPin} />
          )}
          <SelectorUbicacion formSede={formSede} setFormSede={setFormSede} />
        </MapContainer>

        {/* Overlay informativo */}
        <div className="absolute top-4 right-4 z-[400]">
          <div className="bg-black/60 backdrop-blur-md text-[9px] text-white font-black px-3 py-2 rounded-xl border border-white/10 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Coordenadas: {formSede.latitud?.toFixed(4)}, {formSede.longitud?.toFixed(4)}
          </div>
        </div>
      </div>

    </div>
  );
}