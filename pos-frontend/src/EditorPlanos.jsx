import React, { useState, useEffect } from 'react';
import { getMesas, actualizarMesa, crearMesa, getSedes } from './api/api';
import usePosStore from './store/usePosStore';

export default function EditorPlanos() {
  const { configuracionGlobal } = usePosStore();
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const tema = configuracionGlobal?.temaFondo || 'dark';

  const [sedes, setSedes] = useState([]);
  const [sedeActivaId, setSedeActivaId] = useState(localStorage.getItem('sede_id') || '');
  
  const [mesas, setMesas] = useState([]);
  const [columnas, setColumnas] = useState(3);
  const [guardando, setGuardando] = useState(false);
  const [mesaArrastradaId, setMesaArrastradaId] = useState(null);
  const rolUsuario = localStorage.getItem('rol_usuario');
  const [modalNuevaMesa, setModalNuevaMesa] = useState(false);
  const [formMesa, setFormMesa] = useState({ numero: '', capacidad: 4 });
  const [creando, setCreando] = useState(false);

  // 1. Cargar Sedes iniciales
  useEffect(() => {
    const cargarSedes = async () => {
      try {
        const res = await getSedes();
        setSedes(res.data);
        if (!sedeActivaId && res.data.length > 0) {
          setSedeActivaId(res.data[0].id);
        }
      } catch (error) { console.error(error); }
    };
    cargarSedes();
  }, []);

  // 2. Cargar Mesas cada vez que cambie la sede (CON FILTRO ANTI-FANTASMAS MEJORADO)
  useEffect(() => {
    const cargarMesas = async () => {
      if (!sedeActivaId) return;
      
      // Limpiamos la pantalla inmediatamente para no ver mesas del local anterior
      setMesas([]); 
      
      try {
        const res = await getMesas({ sede_id: sedeActivaId });
        
        // ✨ FILTRO ANTI-BALAS: Revisa si "m.sede" es un objeto o un número directo
        const mesasDeEstaSede = res.data.filter(m => {
            const idDeLaSede = (typeof m.sede === 'object' && m.sede !== null) ? m.sede.id : m.sede;
            return String(idDeLaSede) === String(sedeActivaId);
        });

        const mapa = {};
        const mesasLimpia = mesasDeEstaSede.map(m => {
           let pos = m.posicion_x;
           // Asignamos huecos vacíos si dos mesas chocan o vienen en null
           if (pos === undefined || pos === null || mapa[pos]) {
              pos = 0;
              while(mapa[pos]) pos++;
           }
           mapa[pos] = true;
           return { ...m, posicion_x: pos };
        });
        
        setMesas(mesasLimpia);
      } catch (error) { 
        console.error("Error al cargar mesas:", error); 
      }
    };
    
    cargarMesas();
  }, [sedeActivaId]);

  // 📐 MATEMÁTICA DEL GRID
  const maxPosicion = mesas.length > 0 ? Math.max(...mesas.map(m => m.posicion_x)) : -1;
  let baseCasillas = Math.max(maxPosicion + 1, mesas.length, 12);
  baseCasillas += (columnas * 2); // Damos 2 filas de respiro al final
  const TOTAL_CASILLAS = Math.ceil(baseCasillas / columnas) * columnas; 
  const casillasArray = Array.from({ length: TOTAL_CASILLAS }, (_, i) => i);

  // 🔄 AUTO-REORDENAR AL CAMBIAR COLUMNAS
  

  // 2. Agregamos este useEffect para que lea la memoria CADA VEZ que cambies de Sede
  useEffect(() => {
    if (sedeActivaId) {
      const colsGuardadas = parseInt(localStorage.getItem(`columnas_salon_${sedeActivaId}`)) || 3;
      setColumnas(colsGuardadas);
    }
  }, [sedeActivaId]);

  // 3. Actualizamos la función de cambio para que guarde con el ID de la sede
  const manejarCambioColumnas = (nuevasCols) => {
    setColumnas(nuevasCols);
    localStorage.setItem(`columnas_salon_${sedeActivaId}`, nuevasCols); // ✨ Guardado independiente
    
    const mesasOrdenadas = [...mesas].sort((a, b) => a.posicion_x - b.posicion_x);
    const mesasCompactadas = mesasOrdenadas.map((m, index) => ({ ...m, posicion_x: index }));
    setMesas(mesasCompactadas);
  };

  // 🪑 CREAR MESA (Asignada a la sede correcta)
  const manejarCrearMesa = async () => {
    if (!formMesa.numero || !sedeActivaId) return;
    setCreando(true);
    try {
      let huecoLibre = 0;
      while(mesas.some(m => m.posicion_x === huecoLibre)) huecoLibre++;

      // ✨ MAGIA: Forzamos que se cree en la sedeActivaId del menú desplegable
      await crearMesa({
        sede: parseInt(sedeActivaId), 
        numero_o_nombre: formMesa.numero,
        capacidad: parseInt(formMesa.capacidad),
        posicion_x: huecoLibre, 
        posicion_y: 0
      });
      
      // Recargamos silenciosamente
      const res = await getMesas({ sede_id: sedeActivaId });
      const mesasDeEstaSede = res.data.filter(m => {
          const idDeLaSede = (typeof m.sede === 'object' && m.sede !== null) ? m.sede.id : m.sede;
          return String(idDeLaSede) === String(sedeActivaId);
      });
      setMesas(mesasDeEstaSede.map(m => m.posicion_x == null ? {...m, posicion_x: huecoLibre} : m));
      
      setModalNuevaMesa(false);
      setFormMesa({ numero: '', capacidad: 4 });
    } catch (error) { alert("Error al crear la mesa."); }
    setCreando(false);
  };

  // 🖱️ DRAG & DROP
  const manejarDrop = (casillaDestino) => {
    if (mesaArrastradaId === null) return;
    setMesas(prevMesas => {
      const nuevasMesas = [...prevMesas];
      const indexOrigen = nuevasMesas.findIndex(m => m.id === mesaArrastradaId);
      const mesaOrigen = nuevasMesas[indexOrigen];
      
      const indexOcupante = nuevasMesas.findIndex(m => m.posicion_x === casillaDestino);
      if (indexOcupante !== -1) {
        nuevasMesas[indexOcupante] = { ...nuevasMesas[indexOcupante], posicion_x: mesaOrigen.posicion_x };
      }
      
      nuevasMesas[indexOrigen] = { ...mesaOrigen, posicion_x: casillaDestino };
      return nuevasMesas;
    });
    setMesaArrastradaId(null);
  };

  // 💾 GUARDAR
  const guardarCambios = async () => {
    setGuardando(true);
    try {
      await Promise.all(mesas.map(m => actualizarMesa(m.id, { posicion_x: m.posicion_x })));
      alert("¡Distribución de mesas guardada! 📱✨");
    } catch (error) { alert("Error al guardar el diseño."); }
    setGuardando(false);
  };

  return (
    <div className="flex flex-col h-full animate-fadeIn max-w-2xl mx-auto p-4 md:p-0">
      
      {/* 🏢 SELECTOR DE SEDES */}


      {/* 📋 CABECERA */}
      {/* 🏢 SELECTOR DE SEDES & MODO LECTURA */}
      <div className="mb-6 flex items-center gap-3">
        <span className={`text-[10px] font-black uppercase tracking-widest ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
          {rolUsuario === 'Dueño' ? 'Editando Sede:' : 'Sede Asignada:'}
        </span>
        
        {rolUsuario === 'Dueño' ? (
          sedes.length > 1 ? (
            <select 
              value={sedeActivaId} 
              onChange={(e) => setSedeActivaId(e.target.value)} // ✨ Bug corregido (antes decía cambiarSede)
              className={`border p-2 rounded-xl focus:outline-none font-bold transition-colors ${tema === 'dark' ? 'bg-[#111] text-white border-[#333] focus:border-[#ff5a1f]' : 'bg-white text-gray-900 border-gray-300 focus:border-[#ff5a1f]'}`}
            >
              {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          ) : (
            <span className={`font-black text-sm ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>{sedes[0]?.nombre || 'Principal'}</span>
          )
        ) : (
          <div className={`border px-4 py-2 rounded-xl text-sm font-black shadow-inner flex items-center gap-2 ${tema === 'dark' ? 'bg-[#111] text-white border-[#222]' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
            📍 {localStorage.getItem('sede_nombre') || 'Sede Actual'}
            <span className="text-[8px] bg-[#e0155b] text-white px-2 py-0.5 rounded-full uppercase tracking-widest ml-2">Bloqueado</span>
          </div>
        )}
      </div>
      {/* 👇 PEGA ESTO JUSTO DEBAJO 👇 */}
      {/* 📋 CABECERA Y BOTONES DE ACCIÓN */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-6 gap-4">
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tighter ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Diseño de <span style={{ color: colorPrimario }}>Local</span>
          </h2>
          <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>
            Arrastra para crear pasillos y ordenar
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setModalNuevaMesa(true)} 
            className={`flex-1 sm:flex-none px-4 py-3 rounded-xl font-black text-sm uppercase shadow-sm active:scale-95 transition-all border ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-300 border-[#333] hover:text-white' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
          >
            + Mesa
          </button>
          <button 
            onClick={guardarCambios} 
            disabled={guardando} 
            style={{ backgroundColor: colorPrimario }} 
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-white font-black text-sm uppercase shadow-lg active:scale-95 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      {/* ⚙️ CONTROLES */}
      <div className="flex gap-2 mb-4 justify-center items-center">
        <span className={`text-[10px] font-black uppercase tracking-widest mr-2 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>Visualización:</span>
        <button onClick={() => manejarCambioColumnas(2)} className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${columnas === 2 ? 'text-white shadow-md' : 'bg-transparent border text-neutral-500'}`} style={columnas === 2 ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : { borderColor: tema === 'dark' ? '#333' : '#ddd' }}>2 Cols</button>
        <button onClick={() => manejarCambioColumnas(3)} className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors ${columnas === 3 ? 'text-white shadow-md' : 'bg-transparent border text-neutral-500'}`} style={columnas === 3 ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : { borderColor: tema === 'dark' ? '#333' : '#ddd' }}>3 Cols</button>
      </div>

      {/* 📱 SIMULADOR */}
      <div className={`p-4 md:p-6 rounded-[2.5rem] border-[6px] md:border-[8px] transition-colors shadow-2xl overflow-y-auto max-h-[65vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${tema === 'dark' ? 'bg-[#0a0a0a] border-[#222]' : 'bg-gray-100 border-gray-300'}`}>
        
        <div className={`w-full py-3 mb-6 rounded-xl text-[10px] font-black text-center uppercase tracking-[0.2em] border border-dashed ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-500 border-[#333]' : 'bg-gray-200 text-gray-500 border-gray-400'}`}>
          Entrada Principal 🚪
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columnas}, minmax(0, 1fr))` }}>
          {casillasArray.map((casillaIndex) => {
            const mesaEnCasilla = mesas.find(m => m.posicion_x === casillaIndex);

            return (
              <div 
                key={casillaIndex}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => manejarDrop(casillaIndex)}
                className={`relative h-28 sm:h-32 rounded-2xl border-2 border-dashed flex items-center justify-center transition-colors ${
                  mesaArrastradaId !== null && !mesaEnCasilla
                    ? (tema === 'dark' ? 'border-[#ff5a1f] bg-[#ff5a1f]/5' : 'border-[#ff5a1f] bg-[#ff5a1f]/5') 
                    : (tema === 'dark' ? 'border-[#2a2a2a] bg-[#111]' : 'border-gray-300 bg-white/50')
                }`}
              >
                {mesaEnCasilla && (
                  <div
                    draggable
                    onDragStart={() => setMesaArrastradaId(mesaEnCasilla.id)}
                    style={{ borderColor: colorPrimario }}
                    className={`absolute inset-0 m-0.5 border-[1.5px] rounded-xl flex flex-col items-center justify-center cursor-grab active:cursor-grabbing shadow-sm hover:scale-105 transition-transform ${
                      tema === 'dark' ? 'bg-[#161616] text-white hover:bg-[#1a1a1a]' : 'bg-white text-gray-900'
                    }`}
                  >
                    <span className="text-[9px] font-black opacity-40 uppercase">Mesa</span>
                    <span className="text-2xl font-black">{mesaEnCasilla.numero_o_nombre || mesaEnCasilla.id}</span>
                  </div>
                )}
                {!mesaEnCasilla && <span className="text-[10px] font-black opacity-20">{casillaIndex}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===================== MODAL NUEVA MESA ===================== */}
      {modalNuevaMesa && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className={`border rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl ${tema === 'dark' ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-200'}`}>
            <div className={`p-6 border-b flex justify-between items-center ${tema === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'}`}>
              <h3 className={`text-lg font-black ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>Añadir Nueva Mesa</h3>
              <button onClick={() => setModalNuevaMesa(false)} className={`font-bold text-xl ${tema === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}>✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>Número o Nombre</label>
                <input type="text" value={formMesa.numero} onChange={(e) => setFormMesa({...formMesa, numero: e.target.value})} className={`w-full border rounded-xl px-4 py-3 outline-none ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-[#ff5a1f]' : 'bg-white border-gray-300 text-gray-900 focus:border-[#ff5a1f]'}`} style={{ '--tw-ring-color': colorPrimario }} onFocus={(e) => e.target.style.borderColor = colorPrimario} onBlur={(e) => e.target.style.borderColor = tema === 'dark' ? '#333' : '#d1d5db'} placeholder="Ej. 12 o VIP" />
              </div>
              <div>
                <label className={`text-[10px] font-black uppercase tracking-widest mb-2 block ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'}`}>Capacidad (Personas)</label>
                <input type="number" value={formMesa.capacidad} onChange={(e) => setFormMesa({...formMesa, capacidad: e.target.value})} className={`w-full border rounded-xl px-4 py-3 outline-none ${tema === 'dark' ? 'bg-[#1a1a1a] border-[#333] text-white focus:border-[#ff5a1f]' : 'bg-white border-gray-300 text-gray-900 focus:border-[#ff5a1f]'}`} style={{ '--tw-ring-color': colorPrimario }} onFocus={(e) => e.target.style.borderColor = colorPrimario} onBlur={(e) => e.target.style.borderColor = tema === 'dark' ? '#333' : '#d1d5db'} min="1" />
              </div>
              <button onClick={manejarCrearMesa} disabled={creando || !formMesa.numero} className="w-full text-white py-4 rounded-xl font-black mt-4 shadow-lg active:scale-95 disabled:opacity-50 transition-all" style={{ backgroundColor: colorPrimario }}>
                {creando ? 'Creando...' : 'CREAR Y COLOCAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}