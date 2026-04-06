import React, { useState, useEffect } from 'react';
import { validarPinEmpleado, getEstadoCaja, abrirCajaBD } from './api/api';

export default function LoginView({ onAccesoConcedido }) {
  const [pin, setPin] = useState('');
  const [horaLocal, setHoraLocal] = useState('');
  
  const [estadoLocal, setEstadoLocal] = useState('cargando...'); // Empezamos en cargando
  const [modalApertura, setModalApertura] = useState(false);
  const [fondoCaja, setFondoCaja] = useState('');
  
  // Guardamos quién se acaba de loguear para poder asignarle la caja
  const [empleadoActual, setEmpleadoActual] = useState(null); 

  const negocioInfo = { marca: 'CAÑA BRAVA', sede: 'Sede Principal' };

  // ✨ AL CARGAR LA PANTALLA Y CADA 5 SEGUNDOS: Le preguntamos a Django
  useEffect(() => {
    const verificarCaja = async () => {
      try {
        const res = await getEstadoCaja();
        setEstadoLocal(res.data.estado); // React es inteligente, si sigue 'cerrado', no recarga la pantalla
      } catch (error) {
        console.error("Error al verificar caja:", error);
      }
    };

    verificarCaja(); // 1. Chequeo inmediato al cargar

    // 2. El "Chismoso": Le pregunta a Django cada 5 segundos (5000 ms)
    const intervaloCaja = setInterval(verificarCaja, 5000);

    // 3. El Reloj de la pantalla
    const timer = setInterval(() => {
      setHoraLocal(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);

    // 4. Limpiamos los temporizadores si el usuario sale de esta pantalla
    return () => {
      clearInterval(intervaloCaja);
      clearInterval(timer);
    };
  }, []);

  const presionarTecla = (num) => { if (pin.length < 4) setPin(pin + num); };
  const borrarTecla = () => { setPin(pin.slice(0, -1)); };

  const procesarPin = async (accion) => {
    if (pin.length !== 4) return alert("Ingresa un PIN de 4 dígitos");

    try {
      const respuesta = await validarPinEmpleado({ pin, accion });
      const empleado = respuesta.data;

      if (accion === 'asistencia') {
        const horaAsistencia = new Date(empleado.hora_asistencia).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        alert(`🕒 Asistencia:\n${empleado.nombre} (${empleado.rol})\nHora: ${horaAsistencia}`);
        setPin(''); return;
      }

      if (accion === 'entrar') {
        // ✨ EL PASE VIP PARA COCINA: Ellos no manejan plata, entran directo al KDS
        if (empleado.rol === 'Cocina' || empleado.rol === 'Cocinero') {
          onAccesoConcedido(empleado.rol);
          return;
        }

        // Validación normal para Meseros, Cajeros y Admins
        if (estadoLocal === 'cerrado') {
          if (empleado.rol === 'Administrador' || empleado.rol === 'Admin' || empleado.rol === 'Cajero') {
            setEmpleadoActual(empleado); 
            setModalApertura(true);      
          } else {
            alert(`Hola ${empleado.nombre}. El local está cerrado. Un cajero o administrador debe abrir la caja primero.`);
            setPin('');
          }
        } else {
          onAccesoConcedido(empleado.rol);
        }
      }
    } catch (error) {
      alert("❌ PIN incorrecto o empleado inactivo.");
      setPin('');
    }
  };

  // ✨ LA NUEVA FUNCIÓN: Abre la caja en la BD real
  const abrirLocal = async () => {
    if (fondoCaja === '') return alert("Ingresa el fondo de caja inicial");
    
    try {
      await abrirCajaBD({
        empleado_id: empleadoActual.id,
        fondo_inicial: parseFloat(fondoCaja)
      });
      
      setEstadoLocal('abierto');
      setModalApertura(false);
      alert(`✅ Local Abierto exitosamente.`);
      
      // ✨ AHORA SÍ: Respeta si eres Administrador o Cajero
      onAccesoConcedido(empleadoActual.rol); 
      
    } catch (error) {
      alert("Hubo un error al abrir la caja en el servidor.");
    }
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen font-sans flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* FONDO DECORATIVO */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#ff5a1f]/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="z-10 w-full max-w-md p-6 flex flex-col items-center animate-fadeIn">
        
        {/* INFO DEL NEGOCIO Y ESTADO */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#111] border border-[#222] px-4 py-1.5 rounded-full mb-4 shadow-lg">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${estadoLocal === 'abierto' ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-xs font-bold text-neutral-400 tracking-widest uppercase">
              {estadoLocal === 'abierto' ? 'Local Abierto' : 'Local Cerrado'}
            </span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{negocioInfo.marca}</h1>
          <p className="text-[#ff5a1f] font-bold tracking-widest mt-1 text-sm">{negocioInfo.sede}</p>
          <p className="text-neutral-500 font-mono text-xl mt-4">{horaLocal || '--:--'}</p>
        </div>

        {/* INDICADOR DE PIN */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-5 h-5 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-[#ff5a1f] shadow-[0_0_15px_rgba(255,90,31,0.5)] scale-110' : 'bg-[#222] border border-[#333]'}`}></div>
          ))}
        </div>

        {/* TECLADO NUMÉRICO */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button key={num} onClick={() => presionarTecla(num.toString())} className="bg-[#111] hover:bg-[#222] active:scale-95 border border-[#222] text-white text-3xl font-bold py-5 rounded-2xl transition-all shadow-lg">
              {num}
            </button>
          ))}
          <button onClick={borrarTecla} className="bg-[#111] hover:bg-[#222] active:scale-95 border border-[#222] text-neutral-500 text-2xl font-bold py-5 rounded-2xl transition-all shadow-lg flex items-center justify-center">
            ⌫
          </button>
          <button onClick={() => presionarTecla('0')} className="bg-[#111] hover:bg-[#222] active:scale-95 border border-[#222] text-white text-3xl font-bold py-5 rounded-2xl transition-all shadow-lg">
            0
          </button>
          <button onClick={() => setPin('')} className="bg-[#111] hover:bg-[#222] active:scale-95 border border-[#222] text-red-500/80 text-sm font-bold py-5 rounded-2xl transition-all shadow-lg uppercase tracking-widest">
            Limpiar
          </button>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="w-full max-w-[280px] mt-8 flex flex-col gap-3">
          <button 
            onClick={() => procesarPin('entrar')}
            className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white py-4 rounded-xl font-black tracking-widest shadow-[0_4px_20px_rgba(255,90,31,0.3)] active:scale-95 transition-all"
          >
            ENTRAR AL SISTEMA
          </button>
          <button 
            onClick={() => procesarPin('asistencia')}
            className="w-full bg-[#111] hover:bg-[#222] border border-[#333] text-neutral-400 py-4 rounded-xl font-bold tracking-widest shadow-lg active:scale-95 transition-all"
          >
            MARCAR ASISTENCIA 🕒
          </button>
        </div>
      </div>

      {/* ================= MODAL: APERTURA DE LOCAL Y CAJA ================= */}
      {modalApertura && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#121212] border border-[#333] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl scale-in-center">
            
            <div className="p-6 border-b border-[#222] bg-[#1a1a1a] flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-white">Apertura de Local</h3>
                <p className="text-neutral-500 text-xs tracking-widest uppercase mt-1">Iniciando Turno</p>
              </div>
              <button onClick={() => {setModalApertura(false); setPin('');}} className="w-8 h-8 bg-[#222] rounded-full flex justify-center items-center text-neutral-500 font-bold">X</button>
            </div>

            <div className="p-6 space-y-6 text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/30 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                <span className="text-4xl">🏪</span>
              </div>
              
              <div>
                <label className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-3 block">Declarar Fondo de Caja Inicial</label>
                <div className="flex items-center justify-center bg-[#1a1a1a] border border-[#333] rounded-2xl p-4 focus-within:border-[#ff5a1f] transition-colors">
                  <span className="text-neutral-500 text-3xl font-mono mr-2">S/</span>
                  <input 
                    type="number" 
                    value={fondoCaja}
                    onChange={(e) => setFondoCaja(e.target.value)}
                    className="bg-transparent w-32 text-white text-4xl font-black focus:outline-none text-center"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
                <p className="text-neutral-500 text-xs mt-3">Ingresa con cuánto sencillo estás empezando el día.</p>
              </div>

              <button 
                onClick={abrirLocal}
                className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-black tracking-widest shadow-[0_4px_20px_rgba(34,197,94,0.3)] active:scale-95 transition-all uppercase"
              >
                ABRIR LOCAL AHORA
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}