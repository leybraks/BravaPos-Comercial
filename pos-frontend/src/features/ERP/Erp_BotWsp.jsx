import React, { useState } from 'react';

export default function Erp_BotWsp({ sedesReales = [] }) {
  const [sedes, setSedes] = useState(sedesReales);
  
  const [plusCodes, setPlusCodes] = useState(() => {
    const initial = {};
    sedesReales.forEach(s => initial[s.id] = s.direccion || '');
    return initial;
  });

  const [prevSedesProp, setPrevSedesProp] = useState(sedesReales);

  if (sedesReales !== prevSedesProp) {
    setPrevSedesProp(sedesReales);
    setSedes(sedesReales);
    
    const newCodes = {};
    sedesReales.forEach(s => newCodes[s.id] = s.direccion || '');
    setPlusCodes(newCodes);
  }

  const [loadingAction, setLoadingAction] = useState(null);
  const [qrModal, setQrModal] = useState({ open: false, qrBase64: '', sedeNombre: '' });

  // ✅ ELIMINADO: getToken() con localStorage
  // Las cookies HttpOnly se adjuntan automáticamente por el navegador.
  // Solo necesitamos credentials: 'include' en cada fetch.
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Helper para hacer fetch con cookies (reemplaza el Authorization header)
  const apiFetch = (url, options = {}) => {
    return fetch(`${apiUrl}${url}`, {
      ...options,
      credentials: 'include', // ← el navegador adjunta las cookies automáticamente
      headers: {
        'Content-Type': 'application/json',
        ...options.headers, // no incluimos Authorization: Bearer, ya no hace falta
      },
    });
  };

  // ==========================================
  // 📍 1. ACTUALIZAR PLUS CODE (GEOLOCALIZACIÓN)
  // ==========================================
  const manejarGuardarPlusCode = async (sedeId) => {
    setLoadingAction(`pluscode_${sedeId}`);
    try {
      const response = await apiFetch(`/api/sedes/${sedeId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ direccion: plusCodes[sedeId] }),
      });

      if (response.ok) {
        const data = await response.json();
        setSedes(prev => prev.map(s => s.id === sedeId ? { ...s, latitud: data.latitud, longitud: data.longitud, direccion: data.direccion } : s));
        alert('📍 Plus Code guardado. Coordenadas calculadas con éxito.');
      } else {
        alert('Error al guardar el Plus Code.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  // ==========================================
  // 🤖 2. VINCULAR WHATSAPP (CREAR INSTANCIA)
  // ==========================================
  const manejarVincularWsp = async (sede) => {
    setLoadingAction(`vincular_${sede.id}`);
    try {
      const response = await apiFetch(`/api/sedes/${sede.id}/crear_instancia_whatsapp/`, {
        method: 'POST',
      });

      const data = await response.json();
      if (response.ok) {
        setSedes(prev => prev.map(s => s.id === sede.id ? { ...s, whatsapp_instancia: data.instancia } : s));
        setQrModal({ open: true, qrBase64: data.qr_base64, sedeNombre: sede.nombre });
      } else {
        alert(data.error?.message || 'Error al crear instancia en Evolution API');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  // ==========================================
  // ❌ 3. DESVINCULAR WHATSAPP
  // ==========================================
  const manejarDesvincularWsp = async (sedeId) => {
    if (!window.confirm("¿Estás seguro de desconectar el Bot de esta sede?")) return;
    
    setLoadingAction(`desvincular_${sedeId}`);
    try {
      const response = await apiFetch(`/api/sedes/${sedeId}/eliminar_instancia/`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSedes(prev => prev.map(s => s.id === sedeId ? { ...s, whatsapp_instancia: null } : s));
        alert('Bot desconectado correctamente.');
      } else {
        alert('Error al desconectar el Bot.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      
      <div className="bg-[#111] border border-[#222] p-6 rounded-3xl">
        <h2 className="text-2xl font-black text-white mb-2">🤖 Gestión de Bots (WhatsApp)</h2>
        <p className="text-neutral-400 text-sm">
          Configura el Plus Code de Google Maps para el cálculo automático de delivery y vincula el número de WhatsApp de cada sede.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sedes.map((sede) => (
          <div key={sede.id} className="bg-[#111] border border-[#222] p-6 rounded-3xl flex flex-col gap-6">
            
            {/* Cabecera Sede */}
            <div className="flex justify-between items-center border-b border-[#222] pb-4">
              <h3 className="text-xl font-bold text-white">{sede.nombre}</h3>
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${sede.whatsapp_instancia ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {sede.whatsapp_instancia ? 'Bot Conectado' : 'Bot Desconectado'}
              </div>
            </div>

            {/* SECCIÓN 1: Geolocalización */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Ubicación de Salida (Delivery)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 bg-[#1a1a1a] border border-[#333] text-white px-4 py-2 rounded-xl focus:border-[#ff5a1f] outline-none transition-colors"
                  placeholder="Ej: 6MC5+QQ Ventanilla"
                  value={plusCodes[sede.id] || ''}
                  onChange={(e) => setPlusCodes({ ...plusCodes, [sede.id]: e.target.value })}
                />
                <button 
                  onClick={() => manejarGuardarPlusCode(sede.id)}
                  disabled={loadingAction === `pluscode_${sede.id}`}
                  className="bg-[#222] hover:bg-[#333] text-white px-4 py-2 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {loadingAction === `pluscode_${sede.id}` ? '...' : 'Guardar'}
                </button>
              </div>
              {sede.latitud && sede.longitud ? (
                <p className="text-xs text-green-500 mt-1">✓ Coordenadas detectadas: {sede.latitud}, {sede.longitud}</p>
              ) : (
                <p className="text-xs text-[#ff5a1f] mt-1">⚠ Falta configurar para calcular delivery.</p>
              )}
            </div>

            {/* SECCIÓN 2: Evolution API */}
            <div className="space-y-3 pt-4 border-t border-[#222]">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Conexión de WhatsApp</label>
              
              {sede.whatsapp_instancia ? (
                <div className="flex flex-col gap-3">
                  <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#333] flex items-center justify-between">
                    <span className="text-neutral-400 text-sm font-mono">{sede.whatsapp_instancia}</span>
                  </div>
                  <button 
                    onClick={() => manejarDesvincularWsp(sede.id)}
                    disabled={loadingAction === `desvincular_${sede.id}`}
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    {loadingAction === `desvincular_${sede.id}` ? 'Desconectando...' : 'Desvincular Bot'}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => manejarVincularWsp(sede)}
                  disabled={loadingAction === `vincular_${sede.id}`}
                  className="w-full bg-[#ff5a1f] hover:bg-[#ff703f] text-white py-3 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(255,90,31,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {loadingAction === `vincular_${sede.id}` ? 'Creando instancia...' : 'Vincular WhatsApp (Generar QR)'}
                </button>
              )}
            </div>

          </div>
        ))}
      </div>

      {/* ========================================== */}
      {/* 🧩 MODAL PARA ESCANEAR EL QR */}
      {/* ========================================== */}
      {qrModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-[#111] border border-[#333] rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl">
            <h3 className="text-xl font-black text-white mb-2">Vincular {qrModal.sedeNombre}</h3>
            <p className="text-sm text-neutral-400 mb-6">Abre WhatsApp en el celular del local, ve a "Dispositivos vinculados" y escanea este código.</p>
            
            <div className="bg-white p-4 rounded-2xl mb-6 inline-block">
              {qrModal.qrBase64 ? (
                <img src={qrModal.qrBase64} alt="QR WhatsApp" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-black">Cargando...</div>
              )}
            </div>

            <button 
              onClick={() => setQrModal({ open: false, qrBase64: '', sedeNombre: '' })}
              className="w-full bg-[#222] hover:bg-[#333] text-white py-3 rounded-xl font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

    </div>
  );
}