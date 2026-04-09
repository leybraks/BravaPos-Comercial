import React, { useState, useEffect } from 'react';
import { loginAdministrador, validarPinEmpleado, getEstadoCaja, abrirCajaBD, getSedes } from './api/api';

export default function LoginView({ onAccesoConcedido }) {
  // =========================================================
  // 1. MÁQUINA DE ESTADOS PRINCIPAL
  // =========================================================
  const tabletConfigurada = localStorage.getItem('tablet_token') && localStorage.getItem('sede_id');
  const [modo, setModo] = useState(tabletConfigurada ? 'empleado' : 'owner_login');
  
  // =========================================================
  // 2. ESTADOS DEL DUEÑO
  // =========================================================
  const [ownerUser, setOwnerUser] = useState('');
  const [ownerPass, setOwnerPass] = useState('');
  const [sedesDisponibles, setSedesDisponibles] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState('');
  const [loadingOwner, setLoadingOwner] = useState(false);

  // =========================================================
  // 3. ESTADOS DEL EMPLEADO
  // =========================================================
  const [pin, setPin] = useState('');
  const [horaLocal, setHoraLocal] = useState('');
  const [estadoLocal, setEstadoLocal] = useState('cargando...'); 
  const [modalApertura, setModalApertura] = useState(false);
  const [fondoCaja, setFondoCaja] = useState('');
  const [empleadoActual, setEmpleadoActual] = useState(null); 

  const negocioInfo = { 
    marca: 'CAÑA BRAVA', 
    sede: localStorage.getItem('sede_nombre') || 'Sede Principal' 
  };

  // =========================================================
  // 4. EFECTOS
  // =========================================================
  useEffect(() => {
    if (modo !== 'empleado') return; 

    const verificarCaja = async () => {
      try {
        const res = await getEstadoCaja();
        setEstadoLocal(res.data.estado);
      } catch (error) {
        console.error("Esperando conexión con el servidor...");
      }
    };

    verificarCaja(); 
    const intervaloCaja = setInterval(verificarCaja, 5000); 

    const timer = setInterval(() => {
      setHoraLocal(new Date().toLocaleTimeString('es-PE', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }));
    }, 1000);

    return () => {
      clearInterval(intervaloCaja);
      clearInterval(timer);
    };
  }, [modo]);

  // =========================================================
  // 5. LOGICA DEL DUEÑO
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
      alert('❌ Error: Usuario o contraseña de administrador incorrectos.');
    } finally {
      setLoadingOwner(false);
    }
  };

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
  // 6. LOGICA DEL EMPLEADO
  // =========================================================
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
        alert(`🕒 Asistencia registrada para:\n${empleado.nombre}`);
        setPin(''); return;
      }

      if (accion === 'entrar') {
        if (['Cocina', 'Cocinero'].includes(empleado.rol_nombre)) {
          onAccesoConcedido(empleado.rol_nombre);
          return;
        }

        if (estadoLocal === 'cerrado') {
          if (['Administrador', 'Cajero', 'Admin'].includes(empleado.rol_nombre)) {
            setEmpleadoActual(empleado); 
            setModalApertura(true);      
          } else {
            alert(`Caja cerrada. Pida a un administrador que abra el turno.`);
            setPin('');
          }
        } else {
          onAccesoConcedido(empleado.rol_nombre);
        }
      }
    } catch (error) {
      alert("❌ PIN incorrecto o empleado no pertenece a esta sede.");
      setPin('');
    }
  };

  const abrirLocal = async () => {
    if (fondoCaja === '') return alert("Ingresa el fondo de caja inicial");
    try {
      await abrirCajaBD({
        empleado_id: empleadoActual.id,
        fondo_inicial: parseFloat(fondoCaja)
      });
      setEstadoLocal('abierto');
      setModalApertura(false);
      onAccesoConcedido(empleadoActual.rol_nombre); 
    } catch (error) {
      alert("Hubo un error al abrir la caja en el servidor.");
    }
  };

  // =========================================================
  // RENDERIZADO 1: DUEÑO
  // =========================================================
  if (modo === 'owner_login') {
    return (
      <div className="min-h-screen font-sans flex flex-col items-center justify-center relative overflow-hidden bg-black text-white">
        <form onSubmit={handleOwnerLogin} className="z-10 bg-[#0a0a0a] p-10 rounded-3xl border border-[#222] w-full max-w-sm">
          <div className="text-center mb-10">
            <h2 className="text-white text-3xl font-black uppercase tracking-widest">BravaPOS</h2>
            <p className="text-neutral-500 text-xs mt-3 uppercase font-bold tracking-widest">Setup de Tablet</p>
          </div>
          <div className="space-y-5">
            <input type="text" placeholder="Usuario Admin" required className="w-full bg-[#111] border border-[#222] p-5 rounded-2xl text-white focus:outline-none focus:border-[#ff4a00] placeholder-neutral-600 font-bold transition-all"
              value={ownerUser} onChange={e => setOwnerUser(e.target.value)} />
            <input type="password" placeholder="Contraseña" required className="w-full bg-[#111] border border-[#222] p-5 rounded-2xl text-white focus:outline-none focus:border-[#ff4a00] placeholder-neutral-600 font-bold transition-all"
              value={ownerPass} onChange={e => setOwnerPass(e.target.value)} />
          </div>
          <button type="submit" disabled={loadingOwner} className="w-full bg-[#ff4a00] hover:bg-[#e04a15] text-white py-5 rounded-xl font-black tracking-widest mt-10 uppercase transition-all">
            {loadingOwner ? 'Conectando...' : 'Iniciar Configuración'}
          </button>
        </form>
      </div>
    );
  }

  // =========================================================
  // RENDERIZADO 2: SEDE
  // =========================================================
  if (modo === 'owner_sede') {
    return (
      <div className="min-h-screen font-sans flex flex-col items-center justify-center relative overflow-hidden bg-black text-white">
        <form onSubmit={handleSedeSetup} className="z-10 bg-[#0a0a0a] p-10 rounded-3xl border border-[#222] w-full max-w-sm">
          <div className="text-center mb-10">
            <h2 className="text-[#ff4a00] text-3xl font-black uppercase tracking-widest">Elegir Local</h2>
            <p className="text-neutral-500 text-xs mt-3 uppercase font-bold tracking-widest">¿En qué sucursal estará esta tablet?</p>
          </div>
          <div className="space-y-4 relative">
            <select 
              className="w-full bg-[#111] border border-[#222] p-5 rounded-2xl text-white focus:outline-none focus:border-[#ff4a00] appearance-none cursor-pointer text-lg font-black uppercase transition-all"
              value={sedeSeleccionada} 
              onChange={e => setSedeSeleccionada(e.target.value)}
              required
            >
              {sedesDisponibles.map(sede => (
                <option key={sede.id} value={sede.id} className="bg-[#111] text-white">
                  {sede.nombre}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-[#ff4a00] hover:bg-[#e04a15] text-white py-5 rounded-xl font-black tracking-widest mt-10 uppercase transition-all">
            Vincular Tablet Ahora
          </button>
        </form>
      </div>
    );
  }

  // =========================================================
  // RENDERIZADO 3: EMPLEADOS (Uso Diario)
  // =========================================================
  return (
    <div className="min-h-screen font-sans flex flex-col items-center justify-center relative overflow-hidden bg-black text-white select-none">
      
      <div className="z-10 w-full p-6 flex flex-col items-center animate-fadeIn">
        
        {/* CABECERA */}
        <div className="text-center mb-10 w-full flex flex-col items-center">
          <div className="inline-flex items-center justify-center gap-2 bg-[#0a0a0a] border border-[#222] px-4 py-1.5 rounded-full mb-6">
            <span className={`w-2.5 h-2.5 rounded-full ${estadoLocal === 'abierto' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-[11px] font-black text-neutral-400 tracking-widest uppercase">
              {estadoLocal === 'abierto' ? 'Local Abierto' : 'Local Cerrado'}
            </span>
          </div>
          
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase">{negocioInfo.marca}</h1>
          <p className="text-[#ff4a00] font-bold tracking-widest mt-1.5 text-xs uppercase">{negocioInfo.sede}</p>
          <p className="text-white font-mono text-xl mt-6 tracking-widest">{horaLocal || '--:--'}</p>
        </div>

        {/* INDICADOR DE PIN */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-5 h-5 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-white scale-110' : 'bg-[#1a1a1a]'}`}></div>
          ))}
        </div>

        {/* TECLADO NUMÉRICO (Agrupación perfecta, sin estiramientos) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button 
              key={num} 
              onClick={() => presionarTecla(num.toString())} 
              className="w-24 h-24 sm:w-28 sm:h-28 bg-[#1a1a1a] hover:bg-[#222] active:bg-[#2a2a2a] active:scale-95 text-white text-4xl font-bold rounded-[2rem] transition-all shadow-none"
            >
              {num}
            </button>
          ))}
          
          {/* Botón Borrar */}
          <button 
            onClick={borrarTecla} 
            className="w-24 h-24 sm:w-28 sm:h-28 bg-[#1a1a1a] hover:bg-[#222] active:bg-[#2a2a2a] active:scale-95 text-white rounded-[2rem] transition-all shadow-none flex items-center justify-center"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
              <line x1="18" y1="9" x2="12" y2="15"></line>
              <line x1="12" y1="9" x2="18" y2="15"></line>
            </svg>
          </button>
          
          {/* Botón 0 */}
          <button 
            onClick={() => presionarTecla('0')} 
            className="w-24 h-24 sm:w-28 sm:h-28 bg-[#1a1a1a] hover:bg-[#222] active:bg-[#2a2a2a] active:scale-95 text-white text-4xl font-bold rounded-[2rem] transition-all shadow-none"
          >
            0
          </button>
          
          {/* Botón Limpiar */}
          <button 
            onClick={() => setPin('')} 
            className="w-24 h-24 sm:w-28 sm:h-28 bg-[#1a1a1a] hover:bg-[#222] active:bg-[#2a2a2a] active:scale-95 text-[#ff4a00] text-sm font-black rounded-[2rem] transition-all shadow-none uppercase tracking-tighter"
          >
            Limpiar
          </button>
        </div>

        {/* BOTONES DE ACCIÓN (Alineados al ancho del teclado) */}
        <div className="w-full max-w-[304px] sm:max-w-[360px] mt-8 flex flex-col gap-4">
          <button 
            onClick={() => procesarPin('entrar')} 
            className="w-full bg-[#ff4a00] hover:bg-[#e04a15] text-white py-5 rounded-xl font-black text-lg tracking-widest shadow-none active:scale-95 transition-all uppercase"
          >
            ENTRAR AL SISTEMA
          </button>
          <button 
            onClick={() => procesarPin('asistencia')} 
            className="w-full bg-transparent hover:bg-[#111] border-2 border-[#222] text-white py-4 rounded-xl font-bold tracking-widest shadow-none active:scale-95 transition-all uppercase text-xs flex items-center justify-center gap-2"
          >
            MARCAR ASISTENCIA <span className="text-white text-lg">🕒</span>
          </button>
        </div>
      </div>

      {/* MODAL DE APERTURA */}
      {modalApertura && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn z-50">
          <div className="bg-[#0a0a0a] border border-[#333] rounded-[2rem] w-full max-w-sm overflow-hidden text-center shadow-2xl">
            <div className="text-center mb-8 p-6 pb-0">
              <h3 className="text-lg font-bold text-white uppercase tracking-widest">Apertura de Local</h3>
              <p className="text-neutral-500 text-xs mt-1 uppercase">Iniciando Turno</p>
            </div>
            
            <div className="p-8">
              <label className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-4 block">Fondo de Caja Inicial</label>
              <div className="flex items-center justify-center bg-[#111] border border-[#222] rounded-2xl p-5 mb-8 focus-within:border-[#ff4a00] transition-colors">
                <span className="text-neutral-500 text-3xl font-light mr-3">S/</span>
                <input 
                  type="number" 
                  value={fondoCaja}
                  onChange={(e) => setFondoCaja(e.target.value)}
                  className="bg-transparent w-32 text-white text-5xl font-black focus:outline-none text-center"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <button 
                onClick={abrirLocal} 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-xl font-black tracking-widest active:scale-95 transition-all uppercase"
              >
                Abrir Local Ahora🏪
              </button>
              <button onClick={() => {setModalApertura(false); setPin('');}} className="w-full text-neutral-600 hover:text-white text-xs font-bold mt-6 transition-colors uppercase tracking-wider">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}