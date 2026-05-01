import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import usePosStore from '../../store/usePosStore';
import { 
  Bot, Plug, MessageSquare, CheckCircle, Power, 
  Smartphone, Loader2, QrCode, Check, Timer,
  Gift, Megaphone, Settings, Clock, ShieldCheck, Bike // 👈 Nuevos íconos
} from 'lucide-react';

export default function Erp_BotWsp({ sedesReales = [], onRefrescar }) {
  const { configuracionGlobal } = usePosStore();
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const temaFondo = configuracionGlobal?.temaFondo || 'dark';
  const isDark = temaFondo === 'dark';
  
  const rolUsuario = localStorage.getItem('usuario_rol') || '';
  const esDueño = ['dueño', 'admin', 'administrador'].includes(rolUsuario.trim().toLowerCase());
  const sedeAsignada = localStorage.getItem('sede_id');
  const [tabActiva, setTabActiva] = useState('conexion'); 
  const [sedesVisibles, setSedesVisibles] = useState([]);
  const [numerosWsp, setNumerosWsp] = useState({});
  const [archivosCarta, setArchivosCarta] = useState({}); 
  const [linksCarta, setLinksCarta] = useState({});
  const [loadingAction, setLoadingAction] = useState(null);
  

  // ✨ ESTADOS DEL MODAL QR Y TEMPORIZADOR
  const [qrModal, setQrModal] = useState({ open: false, qrBase64: '', sedeId: null, sedeNombre: '' });
  const [tiempoQr, setTiempoQr] = useState(40);
  const [qrEscaneado, setQrEscaneado] = useState(false);
  const [operaciones, setOperaciones] = useState({
    horarioInicio: '18:00',
    horarioFin: '23:30',
    ingresoAutomatico: true, // ¿Pasa directo a cocina o requiere clic en Caja?
    deliveryActivo: true,    // Para apagarlo si llueve o no hay motorizado
  });
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
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-20">
      
      {/* ========== 🏗️ 1. CABECERA INTEGRADA ========== */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 pt-2 pb-6 border-b" style={{ borderColor: isDark ? '#222' : '#e5e7eb' }}>
        
        {/* ✨ Título e Ícono */}
        <div className="flex items-center gap-5">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: colorPrimario + '15', color: colorPrimario }}
          >
            <Bot size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Asistente <span style={{ color: colorPrimario }}>Virtual</span>
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              Conecta tu WhatsApp y automatiza la atención de tus clientes.
            </p>
          </div>
        </div>
      </div>

      {/* 🔘 NUEVA NAVEGACIÓN DE PESTAÑAS */}
      <div className={`flex gap-8 border-b overflow-x-auto custom-scrollbar ${isDark ? 'border-[#222]' : 'border-gray-200'}`}>
        {[
          { id: 'conexion', label: 'Conexión WhatsApp', icon: Plug },
          { id: 'reglas', label: 'Comportamiento', icon: Settings },
          { id: 'fidelizacion', label: 'Promociones y Fidelización', icon: Gift },
          { id: 'marketing', label: 'Marketing y Difusión', icon: Megaphone },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button 
              key={tab.id} onClick={() => setTabActiva(tab.id)}
              className="pb-4 text-sm font-bold transition-all flex items-center gap-2 border-b-2 whitespace-nowrap"
              style={tabActiva === tab.id 
                ? { color: colorPrimario, borderBottomColor: colorPrimario } 
                : { color: isDark ? '#737373' : '#9ca3af', borderColor: 'transparent' }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* ========================================== */}
      {/* 🟢 PESTAÑA 1: CONEXIÓN WHATSAPP */}
      {/* ========================================== */}
      {tabActiva === 'conexion' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          {sedesVisibles.map((sede) => {
            const estaConectado = sede.whatsapp_instancia || sede.estado_fake === 'conectado';

            return (
              <div key={sede.id} className={`rounded-[2rem] overflow-hidden flex flex-col transition-all border ${
                isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'
              }`}>
                
                {/* Header Sede */}
                <div className={`p-6 border-b flex justify-between items-start ${isDark ? 'bg-[#161616] border-[#222]' : 'bg-gray-50 border-gray-100'}`}>
                  <div>
                    <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{sede.nombre}</h3>
                    <span className="text-[10px] font-bold text-neutral-500 mt-1 block uppercase tracking-wider">Gestión de línea</span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
                    estaConectado 
                      ? (isDark ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-green-50 text-green-600 border-green-200')
                      : (isDark ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-red-50 text-red-600 border-red-200')
                  }`}>
                    {estaConectado 
                      ? <><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> CONECTADO</> 
                      : <><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> DESCONECTADO</>}
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-6 flex-1">
                  
                  {/* Tarjeta de Estado Principal */}
                  <div 
                    className={`p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all h-full ${
                      !estaConectado && !isDark ? 'bg-gray-50 border-gray-200 border-dashed' : ''
                    } ${!estaConectado && isDark ? 'bg-[#141414] border-[#333] border-dashed' : ''}`} 
                    style={estaConectado ? { borderColor: colorPrimario + '40', backgroundColor: colorPrimario + '0a' } : {}}
                  >
                    {estaConectado ? (
                      <div className="flex flex-col items-center gap-4 w-full">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: colorPrimario + '20', color: colorPrimario }}>
                          <CheckCircle size={32} />
                        </div>
                        <div>
                          <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Bot operando con normalidad</p>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1">ID: {sede.id}00{sede.negocio_id}</p>
                        </div>
                        <button 
                          onClick={() => manejarDesvincularWsp(sede.id)}
                          disabled={loadingAction === `desvincular_${sede.id}`}
                          className={`w-full mt-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50 border flex justify-center items-center gap-2 ${
                            isDark ? 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20' : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200'
                          }`}
                        >
                          <Power size={16} /> {loadingAction === `desvincular_${sede.id}` ? 'Desconectando...' : 'Desconectar Bot'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4 w-full">
                        <Smartphone size={40} className={isDark ? 'text-neutral-600 mb-2' : 'text-gray-400 mb-2'} strokeWidth={1.5} />
                        <div>
                          <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>No hay celular conectado</p>
                          <p className={`text-xs mt-1 px-4 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Vincula tu WhatsApp para automatizar pedidos.</p>
                        </div>
                        <button 
                          onClick={() => manejarVincularWsp(sede)}
                          disabled={loadingAction === `vincular_${sede.id}`}
                          className="w-full mt-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 text-white shadow-lg active:scale-95 flex items-center justify-center gap-2"
                          style={{ backgroundColor: colorPrimario, boxShadow: `0 8px 20px ${colorPrimario}30` }}
                        >
                          {loadingAction === `vincular_${sede.id}` ? (
                            <><Loader2 className="animate-spin" size={16} /> Iniciando Motor...</>
                          ) : (
                            <><QrCode size={16} /> Conectar WhatsApp</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Número de Referencia */}
                  <div className={`space-y-3 pt-4 border-t ${isDark ? 'border-[#222]' : 'border-gray-200'}`}>
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block">Número Referencial (Opcional)</label>
                    <div className="flex gap-2">
                      <input 
                        type="tel" 
                        className={`flex-1 border px-4 py-3 rounded-xl outline-none transition-colors font-medium text-sm focus:border-current ${
                          isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                        }`}
                        style={{ '--tw-ring-color': colorPrimario }} onFocus={(e) => e.target.style.borderColor = colorPrimario} onBlur={(e) => e.target.style.borderColor = isDark ? '#333' : '#e5e7eb'}
                        placeholder="Ej: +51 987 654 321"
                        value={numerosWsp[sede.id] || ''}
                        onChange={(e) => setNumerosWsp({ ...numerosWsp, [sede.id]: e.target.value })}
                      />
                      <button 
                        onClick={() => manejarGuardarNumero(sede.id)} disabled={loadingAction === `numero_${sede.id}`}
                        className={`px-5 py-3 rounded-xl font-bold transition-colors text-xs border ${
                          isDark ? 'bg-[#222] hover:bg-[#333] text-white border-[#333]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                        }`}
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
      {/* ⚙️ PESTAÑA 2: COMPORTAMIENTO (Operaciones Básicas) */}
      {/* ========================================== */}
      {tabActiva === 'reglas' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
          
          {/* 🛠️ COLUMNA 1: OPERACIONES BÁSICAS */}
          <div className={`rounded-[2rem] p-6 border ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl" style={{ backgroundColor: colorPrimario + '20', color: colorPrimario }}>
                <Settings size={24} />
              </div>
              <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Operaciones Básicas</h3>
            </div>

            <div className="space-y-6">
              {/* Horario de Atención */}
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-[#161616] border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={18} className={isDark ? 'text-neutral-400' : 'text-gray-500'} />
                  <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Horario del Bot</h4>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Apertura</label>
                    <input type="time" value={operaciones.horarioInicio} onChange={(e) => setOperaciones({...operaciones, horarioInicio: e.target.value})} className={`w-full px-3 py-2 rounded-xl outline-none font-mono text-sm border ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Cierre</label>
                    <input type="time" value={operaciones.horarioFin} onChange={(e) => setOperaciones({...operaciones, horarioFin: e.target.value})} className={`w-full px-3 py-2 rounded-xl outline-none font-mono text-sm border ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`} />
                  </div>
                </div>
                <p className="text-xs text-neutral-500 mt-3 font-medium">Fuera de este horario, el bot responderá que el local está cerrado.</p>
              </div>

              {/* Aprobación de Pedidos */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-[#161616] border-[#333]' : 'bg-gray-50 border-gray-100'}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={18} className={isDark ? 'text-neutral-400' : 'text-gray-500'} />
                    <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Ingreso Automático</h4>
                  </div>
                  <p className="text-xs text-neutral-500">¿Los pedidos pasan directo a cocina sin revisión humana?</p>
                </div>
                {/* Toggle Switch */}
                <button onClick={() => setOperaciones({...operaciones, ingresoAutomatico: !operaciones.ingresoAutomatico})} className={`w-12 h-6 rounded-full transition-colors relative flex items-center shrink-0 ${operaciones.ingresoAutomatico ? 'bg-green-500' : 'bg-neutral-500'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute transition-transform ${operaciones.ingresoAutomatico ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Botón de Guardar */}
              <button 
                className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all text-white shadow-lg active:scale-95 mt-4"
                style={{ backgroundColor: colorPrimario }}
              >
                Guardar Operaciones
              </button>
            </div>
          </div>

          {/* 🎨 COLUMNA 2: PERSONALIZACIÓN DEL BOT */}
          <div className={`rounded-[2rem] p-6 border flex flex-col items-center justify-center text-center ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <MessageSquare size={48} className={isDark ? 'text-[#333]' : 'text-gray-200'} strokeWidth={1} mb={4} />
            <h3 className={`text-xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Personalización</h3>
            <p className={`text-sm max-w-sm ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
              Próximamente: Aquí podrás configurar el tono del bot (formal o amigable), agregar FAQs (cochera, ubicación) y más detalles de personalidad.
            </p>
          </div>

        </div>
      )}
      
      {/* Pestañas vacías para el futuro */}
      {tabActiva === 'fidelizacion' && <div className="p-10 text-center font-bold text-neutral-500">Módulo de Promociones en construcción... 🎁</div>}
      {tabActiva === 'marketing' && <div className="p-10 text-center font-bold text-neutral-500">Módulo de Marketing en construcción... 📢</div>}
      {/* ========================================== */}
      {/* 🧩 MODAL MÁGICO PARA ESCANEAR EL QR */}
      {/* ========================================== */}
      {qrModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fadeIn">
          <div className={`border rounded-[2rem] p-8 max-w-sm w-full text-center relative shadow-2xl ${
            isDark ? 'bg-[#111] border-[#333]' : 'bg-white border-gray-200'
          }`}>
            
            {qrEscaneado ? (
              <div className="py-8 animate-fadeIn">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6 text-green-500 animate-bounce">
                  <Check size={40} strokeWidth={3} />
                </div>
                <h3 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>¡Conectado!</h3>
                <p className={isDark ? 'text-neutral-400' : 'text-gray-500'}>El Bot de WhatsApp está listo para trabajar.</p>
              </div>
            ) : (
              <div className="animate-fadeIn">
                <div className="flex justify-between items-center mb-6">
                  <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Vincular {qrModal.sedeNombre}</h3>
                  <div className={`px-3 py-1 rounded-md font-mono text-xs font-bold flex items-center gap-2 border ${
                    isDark ? 'bg-[#222] border-[#333] text-white' : 'bg-gray-100 border-gray-200 text-gray-800'
                  }`}>
                    <Timer size={14} /> 00:{tiempoQr.toString().padStart(2, '0')}
                  </div>
                </div>
                
                <p className={`text-xs mb-6 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                  Abre WhatsApp, ve a <strong className={isDark ? 'text-white' : 'text-gray-900'}>Dispositivos vinculados</strong> y escanea este código.
                </p>
                
                <div className="bg-white p-4 rounded-2xl mb-8 inline-block shadow-[0_0_30px_rgba(255,255,255,0.1)] relative">
                  {qrModal.qrBase64 ? (
                    <img src={qrModal.qrBase64} alt="QR WhatsApp" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex flex-col items-center justify-center text-black font-bold gap-3">
                      <Loader2 className="animate-spin text-neutral-400" size={32} />
                      <span className="text-sm text-neutral-500">Cargando código...</span>
                    </div>
                  )}
                  {/* Animación de escaneo */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 shadow-[0_0_10px_#22c55e] animate-scan"></div>
                </div>

                <button 
                  onClick={manejarCancelarVinculacion}
                  disabled={loadingAction?.includes('desvincular')}
                  className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors border disabled:opacity-50 ${
                    isDark ? 'bg-[#222] hover:bg-[#333] text-white border-[#333]' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
                  }`}
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