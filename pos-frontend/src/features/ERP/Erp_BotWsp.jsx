import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import usePosStore from '../../store/usePosStore';

export default function Erp_BotWsp({ sedesReales = [], onRefrescar }) {
  const { configuracionGlobal } = usePosStore();
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';

  const rolUsuario = localStorage.getItem('usuario_rol') || '';
  const esDueño = ['dueño', 'admin', 'administrador'].includes(rolUsuario.trim().toLowerCase());
  const sedeAsignada = localStorage.getItem('sede_id');

  const [sedesVisibles, setSedesVisibles] = useState([]);
  const [numerosWsp, setNumerosWsp] = useState({});
  const [archivosCarta, setArchivosCarta] = useState({}); 
  const [linksCarta, setLinksCarta] = useState({});
  const [loadingAction, setLoadingAction] = useState(null);
  const [tabActiva, setTabActiva] = useState('conexion'); 

  // ✨ ESTADOS DEL MODAL QR Y TEMPORIZADOR
  const [qrModal, setQrModal] = useState({ open: false, qrBase64: '', sedeId: null, sedeNombre: '' });
  const [tiempoQr, setTiempoQr] = useState(40);
  const [qrEscaneado, setQrEscaneado] = useState(false);

  useEffect(() => {
    let filtradas = sedesReales;
    if (!esDueño && sedeAsignada) {
      filtradas = sedesReales.filter(s => String(s.id) === String(sedeAsignada));
    }
    setSedesVisibles(filtradas);

    const nums = {};
    const links = {};
    filtradas.forEach(s => {
      nums[s.id] = s.whatsapp_numero || '';
      links[s.id] = s.enlace_carta_virtual || '';
    });
    setNumerosWsp(nums);
    setLinksCarta(links);
  }, [sedesReales, esDueño, sedeAsignada]);

  // ==========================================
  // ⏱️ EFECTO: TEMPORIZADOR Y AUTOCIERRE DEL QR
  // ==========================================
  useEffect(() => {
    let intervaloTiempo;
    let intervaloEstado;

    if (qrModal.open && !qrEscaneado) {
      // 1. Cuenta regresiva visual (40 segundos)
      intervaloTiempo = setInterval(() => {
        setTiempoQr((prev) => {
          if (prev <= 1) {
            setQrModal({ open: false, qrBase64: '', sedeId: null, sedeNombre: '' });
            alert("El código QR ha expirado. Por favor, genera uno nuevo.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // 2. Espía silencioso: Pregunta a Django cada 3 segundos si ya se escaneó
      intervaloEstado = setInterval(async () => {
        try {
          const res = await api.get(`/sedes/${qrModal.sedeId}/estado_conexion/`);
          if (res.data.estado === 'conectado') {
            setQrEscaneado(true);
            setTimeout(() => {
              setQrModal({ open: false, qrBase64: '', sedeId: null, sedeNombre: '' });
              setQrEscaneado(false);
              // Actualizamos visualmente el "foquito" a verde
              setSedesVisibles(prev => prev.map(s => s.id === qrModal.sedeId ? { ...s, estado_fake: 'conectado' } : s));
            }, 2500); // Espera 2.5s mostrando la animación de éxito antes de cerrar
          }
        } catch (error) {
          console.error("Esperando conexión...");
        }
      }, 3000);
    }

    return () => {
      clearInterval(intervaloTiempo);
      clearInterval(intervaloEstado);
    };
  }, [qrModal.open, qrEscaneado, qrModal.sedeId]);

  // ==========================================
  // FUNCIONES DE CONEXIÓN
  // ==========================================
  const manejarVincularWsp = async (sede) => {
    setLoadingAction(`vincular_${sede.id}`);
    try {
      const response = await api.post(`/sedes/${sede.id}/crear_instancia_whatsapp/`);
      setSedesVisibles(prev => prev.map(s => s.id === sede.id ? { ...s, whatsapp_instancia: response.data.instancia } : s));
      
      setTiempoQr(40);
      setQrEscaneado(false);
      setQrModal({ open: true, qrBase64: response.data.qr_base64, sedeId: sede.id, sedeNombre: sede.nombre });
      
    } catch (error) {
      alert(error.response?.data?.error?.message || 'Error al conectar. Intenta de nuevo.');
    } finally {
      setLoadingAction(null);
    }
  };

  const manejarDesvincularWsp = async (sedeId) => {
  if (!window.confirm("¿Estás seguro de desconectar el Bot?...")) return;
  setLoadingAction(`desvincular_${sedeId}`);
  try {
    await api.delete(`/sedes/${sedeId}/eliminar_instancia/`);
    // Actualiza visual inmediato
    setSedesVisibles(prev =>
      prev.map(s => s.id === sedeId ? { ...s, whatsapp_instancia: null, estado_fake: null } : s)
    );
    // ✅ Avisa al padre para que recargue datos frescos del backend
    if (onRefrescar) onRefrescar();
  } catch (error) {
    alert('Error al desconectar el Bot.');
  } finally {
    setLoadingAction(null);
  }
};

  // ... (Las funciones de guardarNumero y Menu Digital siguen intactas, omitidas aquí para enfocarnos en la UI)
  const manejarGuardarNumero = async (sedeId) => {
    setLoadingAction(`numero_${sedeId}`);
    try {
      await api.patch(`/sedes/${sedeId}/`, { whatsapp_numero: numerosWsp[sedeId] });
      alert('📱 Número guardado como referencia.');
    } catch (error) { alert('Error al guardar el número.'); } 
    finally { setLoadingAction(null); }
  };
  // ✨ Función para cancelar y borrar lo que se creó a medias
  const manejarCancelarVinculacion = async () => {
  if (qrModal.sedeId) {
    setLoadingAction(`desvincular_${qrModal.sedeId}`);
    try {
      await api.delete(`/sedes/${qrModal.sedeId}/eliminar_instancia/`);
      setSedesVisibles(prev =>
        prev.map(s => s.id === qrModal.sedeId ? { ...s, whatsapp_instancia: null, estado_fake: null } : s)
      );
      if (onRefrescar) onRefrescar(); // ✅ también aquí
    } catch (error) {
      console.error("Error al limpiar instancia cancelada");
    } finally {
      setLoadingAction(null);
    }
  }
  setQrModal({ open: false, qrBase64: '', sedeId: null, sedeNombre: '' });
};
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      
      {/* 🏷️ CABECERA DINÁMICA */}
      <div className="bg-[#111] border border-[#222] p-6 md:p-8 rounded-3xl flex items-center gap-5 shadow-sm">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: colorPrimario + '20', color: colorPrimario }}>
          <i className="fi fi-rr-robot"></i>
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Asistente <span style={{ color: colorPrimario }}>Virtual</span></h2>
          <p className="text-neutral-400 text-sm mt-1">
            Conecta tu WhatsApp y automatiza la atención de tus clientes.
          </p>
        </div>
      </div>

      {/* 🔘 NAVEGACIÓN DE PESTAÑAS */}
      <div className="flex gap-8 border-b border-[#222] overflow-x-auto custom-scrollbar">
        {[
          { id: 'conexion', label: 'Conexión WhatsApp', icon: 'fi-rr-plug' },
          { id: 'reglas', label: 'Comportamiento (Prompts)', icon: 'fi-rr-comment-alt' },
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setTabActiva(tab.id)}
            className="pb-4 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap"
            style={tabActiva === tab.id ? { color: colorPrimario, borderBottomColor: colorPrimario } : { color: '#737373', borderColor: 'transparent' }}
          >
            <i className={`fi ${tab.icon} mt-0.5`}></i> {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================== */}
      {/* 🟢 PESTAÑA 1: CONEXIÓN WHATSAPP */}
      {/* ========================================== */}
      {tabActiva === 'conexion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {sedesVisibles.map((sede) => {
            const estaConectado = sede.whatsapp_instancia || sede.estado_fake === 'conectado';

            return (
              <div key={sede.id} className="bg-[#111] border border-[#222] rounded-3xl overflow-hidden flex flex-col shadow-lg">
                
                {/* Header Sede */}
                <div className="p-6 border-b border-[#222] flex justify-between items-start bg-[#141414]">
                  <div>
                    <h3 className="text-xl font-black text-white">{sede.nombre}</h3>
                    <span className="text-[10px] font-bold text-neutral-500 mt-1 block">Gestión de línea de atención</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${estaConectado ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                    {estaConectado ? <><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> CONECTADO</> : <><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> DESCONECTADO</>}
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-6 flex-1">
                  
                  {/* Tarjeta de Estado Principal (Lenguaje amigable para el cliente) */}
                  <div 
                    className="p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all h-full" 
                    style={
                      estaConectado 
                      ? { borderColor: colorPrimario + '40', backgroundColor: colorPrimario + '0a' } 
                      : { borderColor: '#333', backgroundColor: '#141414', borderStyle: 'dashed' }
                    }
                  >
                    {estaConectado ? (
                      <div className="flex flex-col items-center gap-4 w-full">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-2" style={{ backgroundColor: colorPrimario + '20', color: colorPrimario }}>
                          <i className="fi fi-rr-check-circle"></i>
                        </div>
                        <div>
                          <p className="text-sm font-black text-white">Bot operando con normalidad</p>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">ID de Conexión: {sede.id}00{sede.negocio_id}</p>
                        </div>
                        <button 
                          onClick={() => manejarDesvincularWsp(sede.id)}
                          disabled={loadingAction === `desvincular_${sede.id}`}
                          className="w-full mt-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50 border border-red-500/20 flex justify-center items-center gap-2"
                        >
                          <i className="fi fi-rr-power"></i> {loadingAction === `desvincular_${sede.id}` ? 'Desconectando...' : 'Desconectar Bot'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 w-full">
                        <i className="fi fi-rr-mobile-button text-4xl text-neutral-600 mb-2"></i>
                        <div>
                          <p className="text-sm font-black text-white">No hay ningún celular conectado</p>
                          <p className="text-xs text-neutral-400 mt-1 px-4">Vincula tu WhatsApp para que el sistema empiece a tomar pedidos por ti.</p>
                        </div>
                        <button 
                          onClick={() => manejarVincularWsp(sede)}
                          disabled={loadingAction === `vincular_${sede.id}`}
                          className="w-full mt-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 text-white shadow-lg active:scale-95 flex items-center justify-center gap-2"
                          style={{ backgroundColor: colorPrimario, boxShadow: `0 8px 20px ${colorPrimario}30` }}
                        >
                          {loadingAction === `vincular_${sede.id}` ? (
                            <>
                              <i className="fi fi-rr-spinner animate-spin"></i> Iniciando Motor (Puede tardar 10s)...
                            </>
                          ) : (
                            <>
                              <i className="fi fi-rr-qrcode"></i> Conectar WhatsApp
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Número de Referencia (Movido al fondo y explicado) */}
                  <div className="space-y-3 pt-4 border-t border-[#222]">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Número de Referencia (Opcional)</label>
                    <p className="text-[10px] text-neutral-500 leading-tight mb-2">Anota aquí el número del celular que dejaste escaneado en esta sede para llevar un control interno.</p>
                    <div className="flex gap-2">
                      <input 
                        type="tel" 
                        className="flex-1 bg-[#0a0a0a] border border-[#333] text-white px-4 py-3 rounded-xl outline-none transition-colors font-medium text-sm focus:border-current"
                        style={{ '--tw-ring-color': colorPrimario }} onFocus={(e) => e.target.style.borderColor = colorPrimario} onBlur={(e) => e.target.style.borderColor = '#333'}
                        placeholder="Ej: +51 987 654 321"
                        value={numerosWsp[sede.id] || ''}
                        onChange={(e) => setNumerosWsp({ ...numerosWsp, [sede.id]: e.target.value })}
                      />
                      <button 
                        onClick={() => manejarGuardarNumero(sede.id)} disabled={loadingAction === `numero_${sede.id}`}
                        className="bg-[#222] hover:bg-[#333] text-white px-5 py-3 rounded-xl font-bold transition-colors text-xs border border-[#333]"
                      >
                        {loadingAction === `numero_${sede.id}` ? '...' : 'Guardar'}
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================== */}
      {/* 🧩 MODAL MÁGICO PARA ESCANEAR EL QR */}
      {/* ========================================== */}
      {qrModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fadeIn">
          <div className="bg-[#111] border border-[#333] rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl">
            
            {qrEscaneado ? (
              <div className="py-8 animate-fadeIn">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-5xl mx-auto mb-6 text-green-500 animate-bounce">
                  <i className="fi fi-rr-check"></i>
                </div>
                <h3 className="text-2xl font-black text-white mb-2">¡Conectado!</h3>
                <p className="text-neutral-400">El Bot de WhatsApp está listo para trabajar.</p>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-white">Vincular {qrModal.sedeNombre}</h3>
                  <div className="px-3 py-1 rounded-md bg-[#222] border border-[#333] text-white font-mono text-xs font-bold flex items-center gap-2">
                    <i className="fi fi-rr-time-stop"></i> 00:{tiempoQr.toString().padStart(2, '0')}
                  </div>
                </div>
                
                <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                  Abre WhatsApp en tu celular, ve a <strong className="text-white">Dispositivos vinculados</strong> y escanea este código rápidamente.
                </p>
                
                <div className="bg-white p-4 rounded-2xl mb-8 inline-block shadow-[0_0_30px_rgba(255,255,255,0.1)] relative">
                  {qrModal.qrBase64 ? (
                    <img src={qrModal.qrBase64} alt="QR WhatsApp" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-black font-bold animate-pulse">Cargando código...</div>
                  )}
                  {/* Animación de escaneo (línea que baja) */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 shadow-[0_0_10px_#22c55e] animate-scan"></div>
                </div>

                <button 
                  onClick={manejarCancelarVinculacion} // 👈 Ahora llama a nuestra función de limpieza
                  disabled={loadingAction?.includes('desvincular')}
                  className="w-full bg-[#222] hover:bg-[#333] text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors border border-[#333] disabled:opacity-50"
                >
                  {loadingAction?.includes('desvincular') ? 'Limpiando...' : 'Cancelar Vinculación'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}