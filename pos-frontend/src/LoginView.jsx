import React, { useState, useEffect } from 'react';
import { loginAdministrador, validarPinEmpleado, getEstadoCaja, abrirCajaBD, getSedes } from './api/api';

export default function LoginView({ onAccesoConcedido }) {
  const tabletConfigurada = localStorage.getItem('tablet_token') && localStorage.getItem('sede_id');
  const [modo, setModo] = useState(tabletConfigurada ? 'empleado' : 'owner_login');
  
  // Estados del Dueño
  const [ownerUser, setOwnerUser] = useState('');
  const [ownerPass, setOwnerPass] = useState('');
  const [sedesDisponibles, setSedesDisponibles] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [loadingOwner, setLoadingOwner] = useState(false);

  // Estados del Empleado
  const [pin, setPin] = useState('');
  const [horaLocal, setHoraLocal] = useState('');
  const [estadoLocal, setEstadoLocal] = useState('cargando...');
  const [modalApertura, setModalApertura] = useState(false);
  const [fondoCaja, setFondoCaja] = useState('');
  const [empleadoActual, setEmpleadoActual] = useState(null); 

  const negocioInfo = { 
    marca: 'CAÑA BRAVA', 
    sede: localStorage.getItem('sede_nombre') || 'Local Principal' 
  };

  // =========================================================
  // PASO 1: LOGIN DEL DUEÑO
  // =========================================================
  const handleOwnerLogin = async (e) => {
    e.preventDefault();
    setLoadingOwner(true);
    try {
      const res = await loginAdministrador({ username: ownerUser, password: ownerPass });
      localStorage.setItem('tablet_token', res.data.token);
      
      const sedesRes = await getSedes();
      setSedesDisponibles(sedesRes.data);
      
      if (sedesRes.data.length > 0) {
         setSedeSeleccionada(sedesRes.data[0].id);
      }
      setModo('owner_sede');
    } catch (error) {
      // ✨ AHORA TE DIRÁ EL ERROR EXACTO DE DJANGO
      console.error(error.response?.data);
      alert(`❌ Error: ${error.response?.data?.non_field_errors?.[0] || 'Credenciales incorrectas'}`);
    } finally {
      setLoadingOwner(false);
    }
  };

  // =========================================================
  // PASO 2: ELEGIR SEDE
  // =========================================================
  const handleSedeSetup = (e) => {
    e.preventDefault();
    const sedeObj = sedesDisponibles.find(s => s.id.toString() === sedeSeleccionada.toString());
    
    if (sedeObj) {
       localStorage.setItem('sede_id', sedeObj.id);
       localStorage.setItem('sede_nombre', sedeObj.nombre);
       localStorage.setItem('negocio_id', sedeObj.negocio); 
       setModo('empleado');
    }
  };

  // =========================================================
  // LÓGICA DEL EMPLEADO 
  // =========================================================
  useEffect(() => {
    if (modo !== 'empleado') return; 

    const verificarCaja = async () => {
      try {
        const res = await getEstadoCaja();
        setEstadoLocal(res.data.estado);
      } catch (error) {
        console.error("Esperando conexión...");
      }
    };

    verificarCaja();
    const intervaloCaja = setInterval(verificarCaja, 5000);
    const timer = setInterval(() => {
      setHoraLocal(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    return () => {
      clearInterval(intervaloCaja);
      clearInterval(timer);
    };
  }, [modo]);

  const presionarTecla = (num) => { if (pin.length < 4) setPin(pin + num); };
  const borrarTecla = () => { setPin(pin.slice(0, -1)); };

  const procesarPin = async (accion) => {
    if (pin.length !== 4) return alert("Ingresa un PIN de 4 dígitos");

    try {
      const respuesta = await validarPinEmpleado({ pin, accion });
      const empleado = respuesta.data;

      localStorage.setItem('empleado_id', empleado.id);
      localStorage.setItem('empleado_nombre', empleado.nombre);

      if (accion === 'asistencia') {
        alert(`🕒 Asistencia registrada:\n${empleado.nombre}`);
        setPin(''); return;
      }

      if (accion === 'entrar') {
        if (empleado.rol_nombre === 'Cocina' || empleado.rol_nombre === 'Cocinero') {
          onAccesoConcedido(empleado.rol_nombre);
          return;
        }

        if (estadoLocal === 'cerrado') {
          if (empleado.rol_nombre === 'Administrador' || empleado.rol_nombre === 'Cajero') {
            setEmpleadoActual(empleado); 
            setModalApertura(true);      
          } else {
            alert(`Hola ${empleado.nombre}. La caja está cerrada.`);
            setPin('');
          }
        } else {
          onAccesoConcedido(empleado.rol_nombre);
        }
      }
    } catch (error) {
      alert("❌ PIN incorrecto o empleado inactivo.");
      setPin('');
    }
  };

  const abrirLocal = async () => {
    if (fondoCaja === '') return alert("Ingresa el fondo inicial");
    try {
      await abrirCajaBD({
        empleado_id: empleadoActual.id,
        fondo_inicial: parseFloat(fondoCaja)
      });
      setEstadoLocal('abierto');
      setModalApertura(false);
      onAccesoConcedido(empleadoActual.rol_nombre); 
    } catch (error) {
      alert("Error al abrir la caja.");
    }
  };

  // =========================================================
  // RENDERIZADO COMÚN: EL FONDO PREMIUM
  // =========================================================
  // 1. Reemplaza la función PremiumBackground por esta:
const PremiumBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden bg-[#050505]">
    {/* Gradiente de profundidad */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_#1a1a1a_0%,_#050505_100%)]"></div>
    
    {/* Orbe de luz Naranja (Acento de marca) */}
    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#ff5a1f]/10 rounded-full blur-[120px] animate-pulse"></div>
    
    {/* Orbe de luz Azul (Contraste elegante) */}
    <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]"></div>

    {/* Textura de puntos sutil para que no se vea "plano" */}
    <div className="absolute inset-0 opacity-[0.1]" style={{ backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)', backgroundSize: '30px 30px' }}></div>
  </div>
);


  if (modo === 'owner_login') {
    return (
      <div className="min-h-screen font-sans flex flex-col items-center justify-center relative overflow-hidden text-white">
        <PremiumBackground />
        
        <form onSubmit={handleOwnerLogin} className="z-10 bg-white/5 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 w-full max-w-sm shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#ff5a1f] to-[#9e330e] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#ff5a1f]/30">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-white to-neutral-400">BravaPOS</h2>
            <p className="text-neutral-400 text-xs mt-2 font-medium">VINCULAR NUEVO DISPOSITIVO</p>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="text-xs font-bold text-neutral-400 mb-2 block uppercase tracking-wider">Usuario Admin</label>
              <input type="text" required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] transition-all placeholder-neutral-600"
                value={ownerUser} onChange={e => setOwnerUser(e.target.value)} placeholder="Ej: admin" />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-400 mb-2 block uppercase tracking-wider">Contraseña</label>
              <input type="password" required className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] transition-all placeholder-neutral-600"
                value={ownerPass} onChange={e => setOwnerPass(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          
          <button type="submit" disabled={loadingOwner} className="w-full bg-gradient-to-r from-[#ff5a1f] to-[#e04a15] hover:from-[#e04a15] hover:to-[#c23b0d] text-white py-4 rounded-xl font-black tracking-widest mt-10 uppercase transition-all shadow-[0_0_20px_rgba(255,90,31,0.3)]">
            {loadingOwner ? 'Conectando...' : 'Autenticar Tablet'}
          </button>
        </form>
      </div>
    );
  }

  // =========================================================
  // VISTA 2: COMBO BOX SEDES (GLASSMORPHISM)
  // =========================================================
  if (modo === 'owner_sede') {
    return (
      <div className="min-h-screen font-sans flex flex-col items-center justify-center relative overflow-hidden text-white">
        <PremiumBackground />
        
        <form onSubmit={handleSedeSetup} className="z-10 bg-white/5 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 w-full max-w-sm shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
          <div className="text-center mb-8">
            <h2 className="text-[#ff5a1f] text-2xl font-black uppercase tracking-widest drop-shadow-[0_0_10px_rgba(255,90,31,0.5)]">Seleccionar Local</h2>
            <p className="text-neutral-400 text-sm mt-3">¿En qué sucursal operará este equipo?</p>
          </div>
          
          <div className="space-y-4 relative">
            <select 
              className="w-full bg-black/50 border border-white/10 p-5 rounded-xl text-white focus:outline-none focus:border-[#ff5a1f] focus:ring-1 focus:ring-[#ff5a1f] appearance-none cursor-pointer transition-all text-lg font-medium"
              value={sedeSeleccionada} 
              onChange={e => setSedeSeleccionada(e.target.value)}
              required
            >
              {sedesDisponibles.map(sede => (
                <option key={sede.id} value={sede.id} className="bg-[#111] text-white">
                  {sede.nombre} {sede.direccion ? `- ${sede.direccion}` : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-[#ff5a1f]">
              <svg className="fill-current h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
          </div>

          <button type="submit" className="w-full bg-gradient-to-r from-[#ff5a1f] to-[#e04a15] hover:from-[#e04a15] hover:to-[#c23b0d] text-white py-4 rounded-xl font-black tracking-widest mt-10 uppercase transition-all shadow-[0_0_20px_rgba(255,90,31,0.3)]">
            Finalizar Configuración
          </button>
        </form>
      </div>
    );
  }

  // =========================================================
  // VISTA 3: TECLADO PIN (PREMIUM)
  // =========================================================
  return (
    <div className="min-h-screen font-sans flex flex-col items-center justify-center relative overflow-hidden text-white">
      <PremiumBackground />

      <div className="z-10 w-full max-w-md p-8 flex flex-col items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
        <div className="text-center mb-8 w-full">
          <div className="flex justify-between items-center w-full px-2 mb-6">
            <div className="inline-flex items-center gap-2 bg-black/40 border border-white/5 px-4 py-2 rounded-full backdrop-blur-md">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_currentColor] ${estadoLocal === 'abierto' ? 'bg-green-500 text-green-500' : 'bg-red-500 text-red-500'}`}></span>
              <span className="text-[10px] font-black text-neutral-300 tracking-widest uppercase">
                {estadoLocal === 'abierto' ? 'Abierto' : 'Cerrado'}
              </span>
            </div>
            <p className="text-neutral-400 font-mono text-xl tracking-wider">{horaLocal || '--:--'}</p>
          </div>
          
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase drop-shadow-md">{negocioInfo.marca}</h1>
          <p className="text-[#ff5a1f] font-bold tracking-widest mt-2 text-sm uppercase">{negocioInfo.sede}</p>
        </div>

        <div className="flex gap-5 mb-10">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-5 h-5 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-gradient-to-r from-[#ff5a1f] to-[#e04a15] shadow-[0_0_15px_rgba(255,90,31,0.6)] scale-110' : 'bg-black/50 border border-white/10'}`}></div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => presionarTecla(num.toString())} className="bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white text-3xl font-light py-5 rounded-2xl transition-all backdrop-blur-md">
              {num}
            </button>
          ))}
          <button onClick={borrarTecla} className="bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-neutral-400 text-2xl font-light py-5 rounded-2xl transition-all backdrop-blur-md flex items-center justify-center">⌫</button>
          <button onClick={() => presionarTecla('0')} className="bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-white text-3xl font-light py-5 rounded-2xl transition-all backdrop-blur-md">0</button>
          <button onClick={() => setPin('')} className="bg-white/5 hover:bg-white/10 active:scale-95 border border-[#ff5a1f]/30 text-[#ff5a1f] text-xs font-bold tracking-widest py-5 rounded-2xl transition-all backdrop-blur-md uppercase">Limpiar</button>
        </div>

        <div className="w-full max-w-[280px] mt-10 flex flex-col gap-3">
          <button onClick={() => procesarPin('entrar')} className="w-full bg-gradient-to-r from-[#ff5a1f] to-[#e04a15] hover:from-[#e04a15] hover:to-[#c23b0d] text-white py-4 rounded-xl font-black tracking-widest shadow-[0_0_20px_rgba(255,90,31,0.3)] active:scale-95 transition-all uppercase">
            Desbloquear
          </button>
          <button onClick={() => procesarPin('asistencia')} className="w-full bg-black/40 hover:bg-black/60 border border-white/10 text-neutral-300 py-4 rounded-xl font-bold tracking-widest active:scale-95 transition-all backdrop-blur-md">
            ASISTENCIA 🕒
          </button>
        </div>
      </div>

      {modalApertura && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
            <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-white">Apertura de Local</h3>
                <p className="text-neutral-400 text-xs tracking-widest uppercase mt-1">Iniciando Turno</p>
              </div>
              <button onClick={() => {setModalApertura(false); setPin('');}} className="w-8 h-8 bg-black/50 hover:bg-[#ff5a1f] rounded-full flex justify-center items-center text-white font-bold transition-colors">✕</button>
            </div>
            <div className="p-8 space-y-6 text-center">
              <div>
                <label className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-4 block">Fondo de Caja Inicial</label>
                <div className="flex items-center justify-center bg-black/50 border border-white/10 rounded-2xl p-4 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all">
                  <span className="text-neutral-500 text-3xl font-light mr-3">S/</span>
                  <input type="number" value={fondoCaja} onChange={(e) => setFondoCaja(e.target.value)} className="bg-transparent w-32 text-white text-5xl font-black focus:outline-none text-center" placeholder="0.00" autoFocus />
                </div>
              </div>
              <button onClick={abrirLocal} className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-black tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.3)] active:scale-95 transition-all uppercase mt-4">
                ABRIR CAJA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}