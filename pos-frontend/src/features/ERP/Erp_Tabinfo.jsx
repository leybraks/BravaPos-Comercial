import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { CalendarDays, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';

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

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function TabInfo({ c, colorPrimario, formSede, setFormSede, guardando, onGuardar, tema }) {
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
  const [paso, setPaso] = useState(1);

  const toggleDia = (dia) => {
    const actuales = formSede.dias_atencion || [];
    const nuevosDias = actuales.includes(dia)
      ? actuales.filter(d => d !== dia)
      : [...actuales, dia];
    setFormSede({ ...formSede, dias_atencion: nuevosDias });
  };

  const obtenerUbicacionPrecisa = () => {
    setLocalizando(true);
    if (!navigator.geolocation) {
      setLocalizando(false);
      alert('Tu navegador no soporta la geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormSede(prev => ({
          ...prev,
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
        }));
        setLocalizando(false);
      },
      (error) => {
        setLocalizando(false);
        let mensajeError = 'No pudimos obtener tu ubicación exacta. Fíjala manualmente en el mapa.';
        switch (error.code) {
          case 1: mensajeError = '⚠️ Permiso denegado. Debes permitir el acceso a la ubicación en tu navegador.'; break;
          case 2: mensajeError = '📍 Ubicación no disponible. Verifica que tu dispositivo tenga el GPS encendido o conexión a red.'; break;
          case 3: mensajeError = '⏳ Se agotó el tiempo de espera al intentar ubicarte. Inténtalo de nuevo.'; break;
        }
        console.warn('Geolocalización falló (Código ' + error.code + '):', error.message);
        alert(mensajeError);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const inputStyle = { background: c.surface2, borderColor: c.border2, color: c.text };
  const inputClass = 'w-full border px-5 py-4 rounded-2xl focus:outline-none transition-all font-bold text-sm shadow-inner';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fadeIn w-full items-stretch">

      {/* 📝 COLUMNA 1: FORMULARIO */}
      <div
        className="rounded-2xl border flex flex-col shadow-sm overflow-hidden"
        style={{ background: c.surface, borderColor: c.border }}
      >

        {/* ── Stepper Header ── */}
        <div className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-6">
            {/* Step 1 */}
            <button onClick={() => setPaso(1)} className="flex items-center gap-2 transition-opacity" style={{ opacity: paso === 1 ? 1 : 0.45 }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                style={{ background: paso >= 1 ? colorPrimario : c.surface2, color: paso >= 1 ? '#fff' : c.muted }}
              >
                {paso > 1
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  : '1'}
              </div>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: paso === 1 ? c.text : c.muted }}>Datos</span>
            </button>

            {/* Connector */}
            <div className="flex-1 h-px mx-1 relative overflow-hidden" style={{ background: c.border2 }}>
              <div
                className="absolute inset-y-0 left-0 transition-all duration-500"
                style={{ width: paso > 1 ? '100%' : '0%', background: colorPrimario }}
              />
            </div>

            {/* Step 2 */}
            <button onClick={() => setPaso(2)} className="flex items-center gap-2 transition-opacity" style={{ opacity: paso === 2 ? 1 : 0.45 }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all"
                style={{ background: paso === 2 ? colorPrimario : c.surface2, color: paso === 2 ? '#fff' : c.muted }}
              >
                2
              </div>
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: paso === 2 ? c.text : c.muted }}>Horarios</span>
            </button>
          </div>

          {/* Tab underline */}
          <div className="flex border-b" style={{ borderColor: c.border2 }}>
            <div
              className="pb-3 pr-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
              style={{
                borderBottom: `2px solid ${paso === 1 ? colorPrimario : 'transparent'}`,
                color: paso === 1 ? colorPrimario : c.muted,
                marginBottom: '-1px',
              }}
            >
              <i className="fi fi-rr-settings-sliders" style={{ fontSize: 11 }}></i>
              Información General
            </div>
            <div
              className="pb-3 pl-4 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
              style={{
                borderBottom: `2px solid ${paso === 2 ? colorPrimario : 'transparent'}`,
                color: paso === 2 ? colorPrimario : c.muted,
                marginBottom: '-1px',
              }}
            >
              <CalendarDays size={11} />
              Horarios y Días
            </div>
          </div>
        </div>

        {/* ── Panel Content ── */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto">

          {/* PASO 1: Datos generales */}
          {paso === 1 && (
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: c.muted }}>Nombre Comercial</label>
                <input
                  type="text"
                  value={formSede.nombre}
                  onChange={(e) => setFormSede({ ...formSede, nombre: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = colorPrimario)}
                  onBlur={(e) => (e.target.style.borderColor = c.border2)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest mb-2 block" style={{ color: c.muted }}>Dirección / Referencia</label>
                <input
                  type="text"
                  value={formSede.direccion}
                  onChange={(e) => setFormSede({ ...formSede, direccion: e.target.value })}
                  placeholder="Ej. Frente a la plaza principal"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = colorPrimario)}
                  onBlur={(e) => (e.target.style.borderColor = c.border2)}
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

              <div className="rounded-2xl px-5 py-4 text-xs font-bold flex items-start gap-3" style={{ background: colorPrimario + '12', color: colorPrimario }}>
                <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                <span>También puedes hacer clic en el mapa para fijar el pin con más precisión.</span>
              </div>
            </div>
          )}

          {/* PASO 2: Horarios */}
          {paso === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: c.muted }}>Apertura</label>
                  <input
                    type="time"
                    value={formSede.hora_apertura || ''}
                    onChange={(e) => setFormSede({ ...formSede, hora_apertura: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl outline-none font-mono font-bold text-sm border shadow-inner transition-all"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = colorPrimario)}
                    onBlur={(e) => (e.target.style.borderColor = c.border2)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest block mb-1" style={{ color: c.muted }}>Cierre</label>
                  <input
                    type="time"
                    value={formSede.hora_cierre || ''}
                    onChange={(e) => setFormSede({ ...formSede, hora_cierre: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl outline-none font-mono font-bold text-sm border shadow-inner transition-all"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = colorPrimario)}
                    onBlur={(e) => (e.target.style.borderColor = c.border2)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest mb-3 block" style={{ color: c.muted }}>Días Laborables</label>
                <div className="flex flex-wrap gap-2">
                  {diasSemana.map(dia => {
                    const activo = formSede.dias_atencion?.includes(dia);
                    return (
                      <button
                        key={dia}
                        onClick={() => toggleDia(dia)}
                        className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border"
                        style={activo
                          ? { background: colorPrimario, borderColor: colorPrimario, color: '#fff', boxShadow: `0 4px 15px ${colorPrimario}40` }
                          : { background: c.surface2, borderColor: c.border2, color: c.muted }}
                      >
                        {dia.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl px-5 py-4 text-xs font-bold flex items-start gap-3" style={{ background: colorPrimario + '12', color: colorPrimario }}>
                <CalendarDays size={14} className="mt-0.5 flex-shrink-0" />
                <span>Estos horarios se sincronizarán automáticamente con el bot de atención.</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer: navegación + guardar ── */}
        <div className="px-6 md:px-8 py-5 border-t flex items-center gap-3" style={{ borderColor: c.border2 }}>
          {paso === 2 && (
            <button
              onClick={() => setPaso(1)}
              className="flex items-center gap-1.5 px-5 py-3.5 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all hover:opacity-70"
              style={{ borderColor: c.border2, color: c.muted, background: c.surface2 }}
            >
              <ChevronLeft size={14} />
              Atrás
            </button>
          )}

          {paso === 1 ? (
            <button
              onClick={() => setPaso(2)}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95"
              style={{ backgroundColor: colorPrimario, boxShadow: `0 8px 25px ${colorPrimario}30` }}
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={onGuardar}
              disabled={guardando}
              className="flex-1 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: colorPrimario, boxShadow: `0 8px 25px ${colorPrimario}30` }}
            >
              {guardando ? 'Sincronizando...' : 'Guardar y Sincronizar Sede'}
            </button>
          )}
        </div>
      </div>

      <style>{estiloMapa}</style>

      {/* 🗺️ COLUMNA 2: MAPA (sin cambios) */}
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
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'
            }
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
          {formSede.latitud != null && formSede.longitud != null && (
            <Marker position={[formSede.latitud, formSede.longitud]} icon={iconoPin} />
          )}
          <SelectorUbicacion formSede={formSede} setFormSede={setFormSede} />
        </MapContainer>

        {/* Overlay coordenadas */}
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