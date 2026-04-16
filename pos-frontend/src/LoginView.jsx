import React, { useState, useEffect } from 'react';
import { loginAdministrador, validarPinEmpleado, getEstadoCaja, abrirCajaBD, getSedes } from './api/api';

export default function LoginView({ onAccesoConcedido }) {
  // =========================================================
  // 1. MÁQUINA DE ESTADOS (Lobby Gateway)
  // =========================================================
  const tabletConfigurada = localStorage.getItem('tablet_token') && localStorage.getItem('sede_id');
  const [modo, setModo] = useState(tabletConfigurada ? 'empleado' : 'inicio');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sedesDisponibles, setSedesDisponibles] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);

  const [pin, setPin] = useState('');
  const [horaLocal, setHoraLocal] = useState('');
  const [estadoLocal, setEstadoLocal] = useState('cargando...'); 
  const [modalApertura, setModalApertura] = useState(false);
  const [fondoCaja, setFondoCaja] = useState('');
  const [empleadoActual, setEmpleadoActual] = useState(null); 

  const negocioInfo = { marca: 'CAÑA BRAVA', sede: localStorage.getItem('sede_nombre') || 'Sede Principal' };

  useEffect(() => {
    if (modo !== 'empleado') return; 
    const verificarCaja = async () => {
      try {
        const res = await getEstadoCaja();
        setEstadoLocal(res.data.estado);
      } catch (error) { console.error("Conectando..."); }
    };
    verificarCaja(); 
    const intervaloCaja = setInterval(verificarCaja, 5000); 
    const timer = setInterval(() => {
      setHoraLocal(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true }));
    }, 1000);
    return () => { clearInterval(intervaloCaja); clearInterval(timer); };
  }, [modo]);

  const handleLoginSubmit = async (e, destino) => {
    e.preventDefault();
    setLoadingAuth(true);
    try {
      const res = await loginAdministrador({ username: email, password: password });
      console.log("🔥 RESPUESTA DE DJANGO:", res.data);
      localStorage.setItem('tablet_token', res.data.token);
      localStorage.setItem('rol_usuario', res.data.rol || 'Dueño'); 
      localStorage.setItem('negocio_id', res.data.negocio_id);

      if (destino === 'erp') {
         onAccesoConcedido('erp_admin'); 
      } else {
         const sedesRes = await getSedes();
         setSedesDisponibles(sedesRes.data);
         if (sedesRes.data.length > 0) setSedeSeleccionada(sedesRes.data[0].id); 
         setModo('setup_sede');
      }
    } catch (error) {
      alert('❌ Error: Credenciales incorrectas.');
    } finally { setLoadingAuth(false); }
  };

  const handleGoogleLogin = (destino) => alert("🚀 Google Sign-In Próximamente...");

  const handleSedeSetup = (e) => {
    e.preventDefault();
    const sedeObj = sedesDisponibles.find(s => s.id.toString() === sedeSeleccionada.toString());
    if (sedeObj) {
       localStorage.setItem('sede_id', sedeObj.id);
       localStorage.setItem('sede_nombre', sedeObj.nombre);
       setModo('empleado'); 
    }
  };

  // --- Lógica PIN ---
  const presionarTecla = (num) => { if (pin.length < 4) setPin(pin + num); };
  const borrarTecla = () => { setPin(pin.slice(0, -1)); };

  const procesarPin = async (accion) => {
    if (pin.length !== 4) return;
    try {
      const respuesta = await validarPinEmpleado({ pin, accion });
      const empleado = respuesta.data;
      localStorage.setItem('empleado_id', empleado.id);
      localStorage.setItem('empleado_nombre', empleado.nombre);
      localStorage.setItem('rol_usuario', empleado.rol_nombre); // ✨ ¡Agrega esta línea vital!
      if (accion === 'asistencia') {
        alert(`🕒 Asistencia: ${empleado.nombre}`); setPin(''); return;
      }
      if (accion === 'entrar') {
        if (['Cocina', 'Cocinero'].includes(empleado.rol_nombre)) {
          onAccesoConcedido(empleado.rol_nombre); return;
        }
        if (estadoLocal === 'cerrado') {
          if (['Administrador', 'Cajero', 'Admin'].includes(empleado.rol_nombre)) {
            setEmpleadoActual(empleado); setModalApertura(true);      
          } else { alert(`Caja cerrada.`); setPin(''); }
        } else {
          onAccesoConcedido(empleado.rol_nombre);
        }
      }
    } catch (error) { alert("❌ PIN incorrecto."); setPin(''); }
  };

  const abrirLocal = async () => {
    if (fondoCaja === '') return alert("Ingresa el fondo inicial");
    try {
      const respuesta = await abrirCajaBD({ empleado_id: empleadoActual.id, fondo_inicial: parseFloat(fondoCaja) });
      localStorage.setItem('sesion_caja_id', respuesta.data.id);
      setEstadoLocal('abierto');
      setModalApertura(false);
      onAccesoConcedido(empleadoActual.rol_nombre); 
    } catch (error) { alert("Error al abrir caja."); }
  };

  // =========================================================
  // RENDER: PANTALLA COMPLETA TERMINAL (Meseros)
  // =========================================================
  if (modo === 'empleado') {
    return (
      <div className="min-h-screen font-sans flex flex-col items-center justify-center relative overflow-hidden bg-[#050505] text-white select-none">
        <div className="z-10 w-full p-6 flex flex-col items-center animate-fadeIn">
          <div className="text-center mb-10 w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-3 bg-[#111] border border-[#222] px-5 py-2 rounded-full mb-8">
              <span className={`w-3 h-3 rounded-full ${estadoLocal === 'abierto' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]'}`}></span>
              <span className="text-[12px] font-black text-neutral-300 tracking-widest uppercase">
                {estadoLocal === 'abierto' ? 'Sede Operativa' : 'Caja Cerrada'}
              </span>
            </div>
            <h1 className="text-6xl font-black tracking-tighter mb-2">{negocioInfo.marca}</h1>
            <p className="text-[#ff5a1f] font-black tracking-[0.2em] text-xs uppercase">{negocioInfo.sede}</p>
            <p className="text-neutral-600 font-mono text-xl mt-8">{horaLocal || '--:--'}</p>
          </div>

          <div className="flex gap-5 mb-12">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`w-5 h-5 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-white scale-125 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'bg-[#1a1a1a] border border-[#333]'}`}></div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-[360px] w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} onClick={() => presionarTecla(num.toString())} className="aspect-square bg-[#0f0f0f] border border-[#222] hover:bg-[#1a1a1a] active:scale-95 text-white text-4xl font-bold rounded-[2rem] transition-all flex items-center justify-center shadow-2xl">{num}</button>
            ))}
            <button onClick={borrarTecla} className="aspect-square bg-[#0f0f0f] border border-[#222] hover:bg-red-500/10 active:scale-95 text-neutral-400 hover:text-white rounded-[2rem] transition-all flex items-center justify-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
            </button>
            <button onClick={() => presionarTecla('0')} className="aspect-square bg-[#0f0f0f] border border-[#222] hover:bg-[#1a1a1a] active:scale-95 text-white text-4xl font-bold rounded-[2rem] transition-all flex items-center justify-center">0</button>
            <button onClick={() => setPin('')} className="aspect-square bg-[#0f0f0f] border border-[#222] hover:bg-neutral-800 active:scale-95 text-[#ff5a1f] text-xs font-black rounded-[2rem] transition-all uppercase tracking-widest flex items-center justify-center text-center px-2">Limpiar</button>
          </div>

          <div className="w-full max-w-[360px] mt-12 flex flex-col gap-5">
            <button onClick={() => procesarPin('entrar')} className="w-full bg-gradient-to-r from-[#ff5a1f] to-[#e0155b] hover:opacity-90 text-white py-6 rounded-[2rem] font-black text-lg tracking-widest active:scale-95 transition-all uppercase shadow-[0_15px_40px_rgba(255,90,31,0.25)]">Ingresar 🚀</button>
          </div>
        </div>

        {modalApertura && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-[#0f0f0f] border border-[#222] rounded-[3.5rem] w-full max-w-sm text-center p-10">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-8">Apertura de Caja</h3>
              <div className="flex items-center justify-center bg-[#1a1a1a] border border-[#222] rounded-3xl p-6 mb-10">
                <span className="text-neutral-600 text-4xl font-light mr-4">S/</span>
                <input type="number" value={fondoCaja} onChange={(e) => setFondoCaja(e.target.value)} className="bg-transparent w-36 text-white text-6xl font-black focus:outline-none text-center" placeholder="0.00" autoFocus />
              </div>
              <button onClick={abrirLocal} className="w-full bg-green-600 text-white py-6 rounded-2xl font-black tracking-widest uppercase">Iniciar Turno</button>
              <button onClick={() => {setModalApertura(false); setPin('');}} className="w-full text-neutral-600 text-xs font-bold mt-8 uppercase">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================
  // RENDER: SPLIT SCREEN (Lobby / Login / Setup)
  // =========================================================
  return (
    <div className="min-h-screen flex text-white font-sans overflow-hidden bg-[#050505]">
      
      {/* LADO IZQUIERDO (Formularios) - Con Z-Index y Sombra para separar */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-center px-8 sm:px-16 lg:px-20 relative z-40 bg-[#0c0c0c] min-h-screen shadow-[20px_0_50px_rgba(0,0,0,0.5)]">
        
        {/* LOGO SUPERIOR */}
        <div className="absolute top-10 left-8 sm:left-16 lg:left-20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ff5a1f] to-[#e0155b]"></div>
          <span className="font-black text-xl tracking-tighter">BRAVA<span className="text-[#ff5a1f]">POS</span></span>
        </div>

        <div className="w-full max-w-md mx-auto mt-16 lg:mt-0 animate-fadeIn">
          
          {/* VISTA 1: EL LOBBY */}
          {modo === 'inicio' && (
            <>
              <h1 className="text-4xl font-black tracking-tighter mb-2">Bienvenido</h1>
              <p className="text-neutral-400 text-sm mb-10">Selecciona tu área de trabajo para continuar.</p>
              
              <div className="space-y-4">
                <button onClick={() => setModo('login_erp')} className="w-full bg-transparent border border-[#333] hover:border-[#ff5a1f]/50 p-6 rounded-2xl flex items-center gap-6 transition-all group text-left">
                  <div className="w-14 h-14 bg-[#161616] rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">💻</div>
                  <div>
                    <h3 className="font-bold text-lg">Panel de Control</h3>
                    <p className="text-neutral-500 text-xs mt-1">Gestionar menú, ventas y configuraciones.</p>
                  </div>
                </button>
                <button onClick={() => setModo('login_pos')} className="w-full bg-transparent border border-[#333] hover:border-[#ff5a1f]/50 p-6 rounded-2xl flex items-center gap-6 transition-all group text-left">
                  <div className="w-14 h-14 bg-[#161616] rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📱</div>
                  <div>
                    <h3 className="font-bold text-lg">Terminal POS</h3>
                    <p className="text-neutral-500 text-xs mt-1">Vincular esta pantalla como punto de caja.</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* VISTA 2: LOGIN ESTILO "PRO" */}
          {(modo === 'login_erp' || modo === 'login_pos') && (
            <div className="animate-slideUp">
              <button onClick={() => setModo('inicio')} className="text-neutral-500 hover:text-white text-xs font-bold mb-8 flex items-center gap-2 transition-colors">← Regresar</button>
              
              <h1 className="text-4xl font-black tracking-tighter mb-2">Accede a tu Cuenta</h1>
              <p className="text-neutral-400 text-sm mb-10">{modo === 'login_erp' ? 'Ingresa para administrar tu negocio.' : 'Ingresa para vincular este dispositivo.'}</p>
              
              <div className="flex gap-4 mb-8">
                <button onClick={() => handleGoogleLogin(esERP ? 'erp' : 'pos')} className="flex-1 bg-transparent border border-[#333] hover:bg-[#161616] py-3.5 rounded-xl flex items-center justify-center gap-3 transition-colors text-sm font-bold">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Google
                </button>
                <button onClick={() => alert("Apple Login")} className="flex-1 bg-transparent border border-[#333] hover:bg-[#161616] py-3.5 rounded-xl flex items-center justify-center gap-3 transition-colors text-sm font-bold">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05 1.8-3.08 1.81-.98 0-1.42-.58-2.58-.58-1.14 0-1.63.56-2.56.59-1.05.03-2.27-.96-3.18-2.27-1.34-1.9-2.29-5.18-1.42-7.58.42-1.15 1.18-2.03 2.12-2.6.93-.57 1.98-.6 2.97-.6.94 0 1.8.46 2.51.87.69.41 1.05.65 1.58.65.57 0 1.05-.27 1.84-.73 1.05-.62 2.21-.86 3.46-.66 1.34.22 2.37.84 3.03 1.75-2.48 1.48-2.06 4.96.38 5.92-.5 1.25-1.19 2.52-2.07 3.43zM14.98 5.7c-.52.64-1.26 1.08-2.06 1.13-.12-1.37.52-2.73 1.33-3.63.53-.61 1.33-1.09 2.16-1.16.14 1.39-.46 2.65-1.43 3.66z"/></svg>
                  Apple
                </button>
              </div>

              <div className="flex items-center gap-4 mb-8 opacity-40">
                <div className="h-px bg-neutral-600 flex-1"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-300">— OR —</span>
                <div className="h-px bg-neutral-600 flex-1"></div>
              </div>

              <form onSubmit={(e) => handleLoginSubmit(e, modo === 'login_erp' ? 'erp' : 'pos')} className="space-y-5">
                <input type="text" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-[#111] border border-[#222] p-4 rounded-xl text-white focus:outline-none focus:border-[#ff5a1f] transition-all text-sm" placeholder="Nombre de usuario o Correo" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-[#111] border border-[#222] p-4 rounded-xl text-white focus:outline-none focus:border-[#ff5a1f] transition-all text-sm" placeholder="Password" />
                
                <div className="flex justify-between items-center text-xs mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-white transition-colors">
                    <input type="checkbox" className="accent-[#ff5a1f]" /> Recordarme
                  </label>
                  <button type="button" className="text-neutral-400 hover:text-white transition-colors">¿Olvidaste tu contraseña?</button>
                </div>

                <button type="submit" disabled={loadingAuth} className="w-full bg-gradient-to-r from-[#ff5a1f] to-[#e0155b] hover:opacity-90 text-white py-4 rounded-xl font-bold mt-6 transition-all shadow-[0_4px_20px_rgba(255,90,31,0.3)] disabled:opacity-50">
                  {loadingAuth ? 'Iniciando...' : 'Login to Your Account'}
                </button>
              </form>
            </div>
          )}

          {/* VISTA 3: SETUP DE SEDE */}
          {modo === 'setup_sede' && (
            <div className="animate-slideUp text-center">
              <div className="w-20 h-20 bg-[#161616] rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6 border border-[#333]">🏢</div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-2">Asignar Local</h2>
              <p className="text-neutral-400 text-sm mb-10">¿En qué sucursal operará esta terminal?</p>
              
              <form onSubmit={handleSedeSetup}>
                <select value={sedeSeleccionada} onChange={e => setSedeSeleccionada(e.target.value)} required className="w-full bg-[#111] border border-[#333] p-4 rounded-xl text-white focus:outline-none focus:border-[#ff5a1f] appearance-none font-bold text-center cursor-pointer mb-8">
                  {sedesDisponibles.map(sede => <option key={sede.id} value={sede.id}>{sede.nombre}</option>)}
                </select>
                <button type="submit" className="w-full bg-gradient-to-r from-[#ff5a1f] to-[#e0155b] hover:opacity-90 text-white py-4 rounded-xl font-bold transition-all shadow-[0_4px_20px_rgba(255,90,31,0.3)]">Vincular Terminal 🔒</button>
              </form>
            </div>
          )}

        </div>
        
        {/* FOOTER IZQUIERDO */}
        <div className="absolute bottom-8 left-8 sm:left-16 lg:left-20 right-8 flex justify-between text-[10px] text-neutral-600 font-bold uppercase tracking-widest">
          <span>Privacy Policy</span>
          <span>Copyright 2026</span>
        </div>
      </div>

      {/* LADO DERECHO - HERO VISUAL (DISEÑO SAAS PREMIUM) */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden bg-[#050505]">

        {/* Glows de fondo sutiles */}
        <div className="absolute w-[700px] h-[700px] bg-[#ff5a1f] opacity-[0.12] rounded-full blur-[150px]" />
        <div className="absolute w-[500px] h-[500px] bg-[#e0155b] opacity-[0.12] rounded-full blur-[130px] translate-x-32 translate-y-20" />

        {/* CONTENEDOR PRINCIPAL DEL ARTE
            Mantenemos scale-110 para que se vea grande y nítido.
        */}
        <div className="relative z-10 flex items-end justify-center gap-0 scale-110 xl:scale-125 origin-center transition-transform duration-500">

          {/* ── LAPTOP (FONDO) ── */}
          <div className="relative mr-[-60px] mb-8 z-10">
            {/* Pantalla */}
            <div className="w-[420px] h-[260px] bg-[#111] rounded-t-2xl border-[3px] border-[#2a2a2a] overflow-hidden shadow-2xl">
              <div className="bg-[#0d0d0d] w-full h-full p-4">
                {/* Top bar macOS style */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#ff5a1f] opacity-80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
                  </div>
                  <div className="w-32 h-2 bg-[#1a1a1a] rounded-full" />
                  <div className="w-16 h-2 bg-[#1a1a1a] rounded-full" />
                </div>
                {/* Cards de métricas */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-[#161616] border border-[#222] rounded-xl p-3 shadow-inner">
                    <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest font-bold">Ventas Hoy</p>
                    <p className="text-xl text-[#ff5a1f] font-black font-mono mt-1">S/. 4,821</p>
                    <p className="text-[9px] text-green-500 font-mono mt-1">↑ 12% vs ayer</p>
                  </div>
                  <div className="bg-[#161616] border border-[#222] rounded-xl p-3 shadow-inner">
                    <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-widest font-bold">Pedidos</p>
                    <p className="text-xl text-[#e0155b] font-black font-mono mt-1">38</p>
                    <p className="text-[9px] text-green-500 font-mono mt-1">5 pendientes</p>
                  </div>
                </div>
                {/* Mini gráfico de barras */}
                <div className="bg-[#161616] border border-[#222] rounded-xl p-3 flex items-end gap-2 h-[75px] shadow-inner">
                  <span className="text-[9px] text-neutral-700 font-mono mr-1 self-center">Sem.</span>
                  {[60,80,50,90,100,65,40].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm rounded-b-none transition-all ${i === 4 ? 'bg-[#e0155b] shadow-[0_0_10px_rgba(224,21,91,0.5)]' : 'bg-[#ff5a1f]'}`}
                      style={{height:`${h}%`, opacity: i === 4 ? 1 : 0.4 + i * 0.07}}
                    />
                  ))}
                </div>
              </div>
            </div>
            {/* Bisagra */}
            <div className="w-[420px] h-2 bg-[#1c1c1c] border-x-[3px] border-[#2a2a2a]" />
            {/* Base */}
            <div className="w-[420px] h-3.5 bg-[#181818] rounded-b-lg border-[3px] border-[#2a2a2a] border-t-0" />
            {/* Pata central */}
            <div className="w-32 h-2 bg-[#1a1a1a] rounded-b-lg mx-auto border-2 border-[#2a2a2a] border-t-0" />
          </div>

          {/* ── TELÉFONO (FRENTE) ── */}
          <div className="relative z-20">
            <div className="w-[200px] h-[400px] bg-[#111] rounded-[32px] border-[4px] border-[#2a2a2a] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative">
              {/* Dynamic island */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-14 h-4 bg-black rounded-full z-10" />
              {/* Pantalla del Celular (POS Mockup) */}
              <div className="bg-[#0d0d0d] w-full h-full pt-[32px] px-3 pb-3 overflow-hidden flex flex-col">
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] text-neutral-600 font-mono">9:41</span>
                  <div className="flex gap-1 items-center">
                    <div className="w-3 h-[6px] bg-neutral-700 rounded-sm" />
                    <div className="w-[6px] h-[6px] bg-neutral-700 rounded-full" />
                  </div>
                </div>
                <p className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest font-bold">Hola,</p>
                <p className="text-lg text-white font-black mb-4 font-mono tracking-tighter">BravaPOS</p>
                
                {/* Balance card con gradiente oficial */}
                <div className="rounded-2xl p-4 mb-4 bg-gradient-to-br from-[#ff5a1f] to-[#e0155b] shadow-lg">
                  <p className="text-[9px] text-white/70 font-mono font-bold uppercase tracking-widest">Caja Hoy</p>
                  <p className="text-2xl text-white font-black font-mono mt-1">S/. 4,821</p>
                  <div className="flex gap-1.5 mt-3">
                    {[1,2,3].map(i => <div key={i} className="w-6 h-1 bg-white/30 rounded-full" />)}
                  </div>
                </div>
                
                {/* Stats rápidos */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-[#161616] rounded-xl p-3 border border-[#222] shadow-inner">
                    <p className="text-[9px] text-neutral-600 font-mono uppercase font-bold tracking-widest">Mesas</p>
                    <p className="text-lg text-[#ff5a1f] font-black font-mono mt-1">12</p>
                  </div>
                  <div className="bg-[#161616] rounded-xl p-3 border border-[#222] shadow-inner">
                    <p className="text-[9px] text-neutral-600 font-mono uppercase font-bold tracking-widest">Activas</p>
                    <p className="text-lg text-green-500 font-black font-mono mt-1">7</p>
                  </div>
                </div>
                
                {/* Notificación interna eliminada para limpiar y enfocar el pop-out */}
              </div>
            </div>
            
            {/* Botones físicos laterales del iPhone */}
            <div className="absolute right-[-4px] top-24 w-[4px] h-12 bg-[#222] rounded-r-md" />
            <div className="absolute left-[-4px] top-20 w-[4px] h-8 bg-[#222] rounded-l-md" />
            <div className="absolute left-[-4px] top-[120px] w-[4px] h-8 bg-[#222] rounded-l-md" />

            {/* ========================================================= */}
            {/* CARD FLOTANTE ESTÁTICA Y SUPERPUESTA (Mesa 3)              */}
            {/* ========================================================= */}
            {/* - Ajustamos z-index a 30 (mayor que el celular que es 20)
                - Cambiamos right de -32 a -16 (o un valor positivo) para que se meta dentro del borde del celular.
                - Quitamos 'animate-bounce'.
            */}
            <div className="absolute -top-16 -right-28 bg-[#0f0f0f]/90 backdrop-blur border border-white/10 rounded-2xl p-4 shadow-2xl w-44 z-30  transition-transform cursor-pointer">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#ff5a1f] flex items-center justify-center text-[10px] text-white font-black shadow-lg">AJ</div>
                <div>
                  <p className="text-white text-xs font-bold">Mesa 3</p>
                  <p className="text-neutral-500 text-[9px] font-mono mt-0.5">hace 2 min</p>
                </div>
              </div>
              <p className="text-neutral-400 text-[10px] mb-3 font-bold">2x Lomo Saltado</p>
              <div className="flex justify-between items-center">
                <span className="text-[#ff5a1f] font-black text-sm">S/. 56</span>
                <button className="text-[9px] bg-gradient-to-r from-[#ff5a1f] to-[#e0155b] px-3 py-1 rounded-md text-white font-bold shadow-md hover:opacity-90 active:scale-95 transition-all">OK</button>
              </div>
            </div>

            {/* ========================================================= */}
            {/* CARD FLOTANTE ESTÁTICA (Caja Abierta)                      */}
            {/* ========================================================= */}
            {/* - Quitamos 'animate-bounce'. */}
            <div className="absolute bottom-1 -left-36 xl:-left-44 bg-[#0f0f0f]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl w-40 z-30 cursor-pointer">
              <p className="text-white text-xs font-bold mb-1">Caja Abierta</p>
              <p className="text-neutral-500 text-[9px] mb-3 font-mono">Turno mañana</p>
              <div className="w-full h-1.5 bg-[#222] rounded-full overflow-hidden shadow-inner">
                <div className="w-[65%] h-full bg-gradient-to-r from-[#ff5a1f] to-[#e0155b] rounded-full" />
              </div>
              <p className="text-neutral-600 text-[8px] mt-2 font-mono uppercase tracking-widest text-right">65% de meta</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}