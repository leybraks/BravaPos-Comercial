import React, { useState, useEffect, useRef } from 'react';
import { getSedes, actualizarSede, getMesas, actualizarMesa, crearMesa, crearSede } from '../../api/api';
import usePosStore from '../../store/usePosStore';
import { useSedeColors } from './Usesedecolors';
import TabInfo          from './Erp_Tabinfo';
import TabMapaResumen   from './Erp_Tabmaparesumen';
import ModalEditorPlano from './Erp_ModalEditorPlano';
import ModalNuevaMesa   from './Erp_Modalnuevamesa';
import ModalNuevaSede   from './Erp_Modalnuevasede';

export default function Erp_GestionSedes() {
  const { configuracionGlobal } = usePosStore();
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const tema          = configuracionGlobal?.temaFondo     || 'dark';
  const c             = useSedeColors(tema);

  const rolUsuario  = localStorage.getItem('usuario_rol') || localStorage.getItem('rol_usuario');
  const esDueño     = ['dueño', 'admin', 'administrador'].includes(rolUsuario?.trim().toLowerCase());
  const sedeAsignada = localStorage.getItem('sede_id');

  // ── Estado global ───────────────────────────
  const [sedes,       setSedes]       = useState([]);
  const [sedeActivaId, setSedeActivaId] = useState(
    esDueño ? (localStorage.getItem('memoria_sede_planos') || '') : sedeAsignada
  );
  const [tabActiva,   setTabActiva]   = useState('info');
  const [guardando,   setGuardando]   = useState(false);

  // ── Pestaña info ────────────────────────────
  const [formSede, setFormSede] = useState({ 
    nombre: '', 
    direccion: '',
    hora_apertura: '10:00',
    hora_cierre: '22:00',
    dias_atencion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  });
  const ultimaSedeCargada = useRef(null);
  // ── Editor de plano ─────────────────────────
  const [modalEditorAbierto, setModalEditorAbierto] = useState(false);
  const [mesas,              setMesas]              = useState([]);
  const [columnas,           setColumnas]           = useState(3);
  const [mesaArrastradaId,   setMesaArrastradaId]   = useState(null);

  // ── Modal nueva mesa ────────────────────────
  const [modalNuevaMesa, setModalNuevaMesa] = useState(false);
  const [formMesa,       setFormMesa]       = useState({ numero: '', capacidad: 4 });
  const [creandoMesa,    setCreandoMesa]    = useState(false);

  // ── Modal nueva sede ────────────────────────
  const [modalNuevaSede,  setModalNuevaSede]  = useState(false);
  const [formNuevaSede,   setFormNuevaSede]   = useState({ nombre: '', direccion: '' });
  const [creandoSede,     setCreandoSede]     = useState(false);

  // ── Mesas de todas las sedes (para tab mapa) ─
  const [mesasPorSede,    setMesasPorSede]    = useState({});
  const [cargandoMesasTodas, setCargandoMesasTodas] = useState(false);

  // ── Carga inicial de sedes ──────────────────
  useEffect(() => {
    const cargarSedes = async () => {
      try {
        const res = await getSedes();
        const sedesData = res.data;
        setSedes(sedesData);
        if (sedesData.length > 0) {
          // Si la sede activa guardada no existe en las sedes retornadas (ej. fue desactivada
          // o el localStorage tiene un valor obsoleto), auto-seleccionamos la primera sede.
          const existe = sedesData.some(s => String(s.id) === String(sedeActivaId));
          if (!sedeActivaId || !existe) {
            setSedeActivaId(String(sedesData[0].id));
          }
        }
      } catch (error) { console.error(error); }
    };
    cargarSedes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Carga cuando cambia la sede activa ──────
  // ── Carga cuando cambia la sede activa ──────
  // ── Carga cuando cambia la sede activa ──────
  useEffect(() => {
    if (esDueño && sedeActivaId) {
      localStorage.setItem('memoria_sede_planos', sedeActivaId);
    }

    if (sedeActivaId && sedes.length > 0) {
      const sedeActual = sedes.find(s => String(s.id) === String(sedeActivaId));
      
      if (sedeActual) {
        // ✨ LA MAGIA: Solo actualizamos el formulario si el ID de la Sede es nuevo.
        // Esto rompe el bucle de "cascading renders" y no requiere leer "formSede.nombre"
        if (ultimaSedeCargada.current !== sedeActivaId) {
            const horaAperturaLimpia = sedeActual.hora_apertura ? sedeActual.hora_apertura.substring(0, 5) : '10:00';
            const horaCierreLimpia = sedeActual.hora_cierre ? sedeActual.hora_cierre.substring(0, 5) : '22:00';
            const diasLimpios = sedeActual.dias_atencion?.length > 0 ? sedeActual.dias_atencion : ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

            setFormSede({ 
                nombre: sedeActual.nombre || '', 
                direccion: sedeActual.direccion || '',
                latitud: sedeActual.latitud ? parseFloat(sedeActual.latitud) : -12.0464,
                longitud: sedeActual.longitud ? parseFloat(sedeActual.longitud) : -77.0428,
                hora_apertura: horaAperturaLimpia,
                hora_cierre: horaCierreLimpia,
                dias_atencion: diasLimpios
            });
            setColumnas(parseInt(sedeActual.columnas_salon) || 3);

            // Marcamos que ya llenamos el form para esta sede
            ultimaSedeCargada.current = sedeActivaId;
        }
      }
    }

    // --- CARGA DE MESAS (Se mantiene exacto a como lo tenías) ---
    const cargarMesas = async () => {
      if (!sedeActivaId) return;
      setMesas([]);
      try {
        const res = await getMesas({ sede_id: sedeActivaId });
        const deSede = res.data.filter(m => {
          const idSede = (typeof m.sede === 'object' && m.sede !== null) ? m.sede.id : m.sede;
          return String(idSede) === String(sedeActivaId);
        });
        const mapa = {};
        const limpias = deSede.map(m => {
          let pos = m.posicion_x;
          if (pos === undefined || pos === null || mapa[pos]) {
            pos = 0;
            while (mapa[pos]) pos++;
          }
          mapa[pos] = true;
          return { ...m, posicion_x: pos };
        });
        setMesas(limpias);
      } catch (error) { console.error(error); }
    };

    cargarMesas();
  }, [sedeActivaId, sedes, esDueño]); // 👈 ¡Dependencias limpias y felices! // 👈 Quitamos `esDueño` de las dependencias para calmar a React

  // ── Carga mesas de todas las sedes al entrar al tab mapa ──
  useEffect(() => {
    if (tabActiva !== 'mapa' || sedes.length === 0) return;
    const cargarTodas = async () => {
      setCargandoMesasTodas(true);
      try {
        const resultados = await Promise.all(
          sedes.map(s => getMesas({ sede_id: s.id }).then(res => {
            const deSede = res.data.filter(m => {
              const idSede = (typeof m.sede === 'object' && m.sede !== null) ? m.sede.id : m.sede;
              return String(idSede) === String(s.id);
            });
            return { sedeId: s.id, mesas: deSede };
          }))
        );
        const mapaM = {};
        resultados.forEach(({ sedeId, mesas: m }) => { mapaM[sedeId] = m; });
        setMesasPorSede(mapaM);
      } catch (e) { console.error(e); }
      setCargandoMesasTodas(false);
    };
    cargarTodas();
  }, [tabActiva, sedes]);

  // ── Handlers ────────────────────────────────
  const manejarGuardarInfo = async () => {
    setGuardando(true);
    try {
      const res = await actualizarSede(sedeActivaId, { 
        nombre: formSede.nombre, 
        direccion: formSede.direccion,
        latitud: formSede.latitud,
        longitud: formSede.longitud,
        // ✨ Enviamos el horario
        hora_apertura: formSede.hora_apertura,
        hora_cierre: formSede.hora_cierre,
        dias_atencion: formSede.dias_atencion
      });
      setSedes(prev => prev.map(s => String(s.id) === String(sedeActivaId) ? { ...s, ...res.data } : s));
      alert('📍 Información actualizada correctamente.');
    } catch { alert('Error al actualizar la información.'); }
    setGuardando(false);
  };

  const manejarCambioColumnas = async (nuevasCols) => {
    setColumnas(nuevasCols);
    const compactadas = [...mesas]
      .sort((a, b) => a.posicion_x - b.posicion_x)
      .map((m, i) => ({ ...m, posicion_x: i }));
    setMesas(compactadas);
    try { if (sedeActivaId) await actualizarSede(sedeActivaId, { columnas_salon: nuevasCols }); } catch {}
  };

  const manejarCrearMesa = async () => {
    if (!formMesa.numero || !sedeActivaId) return;
    setCreandoMesa(true);
    try {
      let huecoLibre = 0;
      while (mesas.some(m => m.posicion_x === huecoLibre)) huecoLibre++;
      await crearMesa({
        sede: parseInt(sedeActivaId),
        numero_o_nombre: formMesa.numero,
        capacidad: parseInt(formMesa.capacidad),
        posicion_x: huecoLibre,
        posicion_y: 0,
      });
      const res   = await getMesas({ sede_id: sedeActivaId });
      const deSede = res.data.filter(m => {
        const idSede = (typeof m.sede === 'object' && m.sede !== null) ? m.sede.id : m.sede;
        return String(idSede) === String(sedeActivaId);
      });
      setMesas(deSede.map(m => m.posicion_x == null ? { ...m, posicion_x: huecoLibre } : m));
      setModalNuevaMesa(false);
      setFormMesa({ numero: '', capacidad: 4 });
    } catch (err) {
      const errData = err.response?.data;
      const mensaje =
        errData?.non_field_errors?.[0] ||
        errData?.numero_o_nombre?.[0] ||
        errData?.sede?.[0] ||
        errData?.detail ||
        'Error al crear la mesa.';
      alert(`⚠️ ${mensaje}`);
    }
    setCreandoMesa(false);
  };

  const manejarDrop = (casillaDestino) => {
    if (mesaArrastradaId === null) return;
    setMesas(prev => {
      const next = [...prev];
      const iOrigen   = next.findIndex(m => m.id === mesaArrastradaId);
      const origen    = next[iOrigen];
      const iOcupante = next.findIndex(m => m.posicion_x === casillaDestino);
      if (iOcupante !== -1) next[iOcupante] = { ...next[iOcupante], posicion_x: origen.posicion_x };
      next[iOrigen] = { ...origen, posicion_x: casillaDestino };
      return next;
    });
    setMesaArrastradaId(null);
  };

  const guardarCambiosMapa = async () => {
    setGuardando(true);
    try {
      await Promise.all(mesas.map(m => actualizarMesa(m.id, { posicion_x: m.posicion_x })));
      // Actualizar miniatura en TabMapaResumen sin recargar la página
      setMesasPorSede(prev => ({ ...prev, [sedeActivaId]: mesas }));
      alert('¡Distribución de mesas guardada!');
    } catch { alert('Error al guardar el diseño.'); }
    setGuardando(false);
  };

  const manejarCrearSede = async () => {
    if (!formNuevaSede.nombre.trim()) return alert("El nombre es obligatorio.");
    setCreandoSede(true);
    try {
      const negocioId = localStorage.getItem('negocio_id');
      const res = await crearSede({ 
        nombre: formNuevaSede.nombre, 
        direccion: formNuevaSede.direccion, 
        negocio: negocioId 
      });
      setSedes(prev => [...prev, res.data]);
      setSedeActivaId(res.data.id);
      setModalNuevaSede(false);
      setFormNuevaSede({ nombre: '', direccion: '' });
      alert("¡Sede creada! 🎉");
      
    } catch (error) {
      console.error("🔍 Error REAL de Django:", error.response?.data);
      
      const errData = error.response?.data;
      
      // Capturamos el error exacto que nos mande el backend
      const mensajeError = 
        errData?.detail || 
        errData?.nombre?.[0] || 
        errData?.non_field_errors?.[0] || 
        "Error al validar los datos de la sede.";
        
      alert(`⚠️ ${mensajeError}`);
      
    } finally { 
      setCreandoSede(false); 
    }
  };

  // ── Cálculo de casillas ─────────────────────
  const maxPosicion  = mesas.length > 0 ? Math.max(...mesas.map(m => m.posicion_x)) : -1;
  let baseCasillas   = Math.max(maxPosicion + 1, mesas.length, 12);
  baseCasillas      += columnas * 2;
  const casillasArray = Array.from(
    { length: Math.ceil(baseCasillas / columnas) * columnas },
    (_, i) => i
  );

  const sedeActualNombre = sedes.find(s => String(s.id) === String(sedeActivaId))?.nombre || 'Sede';

  // ── Render ──────────────────────────────────
  return (
    <div className="flex flex-col h-full animate-fadeIn w-full relative">

      {/* Cabecera */}
      <div
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-6 border-b"
        style={{ borderColor: c.border }}
      >
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight" style={{ color: c.text }}>
            Gestión de <span style={{ color: colorPrimario }}>Sedes</span>
          </h2>
          <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: c.muted }}>
            Administra ubicaciones y espacios
          </p>
        </div>

        {tabActiva !== 'mapa' && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: c.muted }}>
            {esDueño ? 'Sede activa:' : 'Asignado:'}
          </span>
          {esDueño ? (
            <div className="flex gap-2 items-center">
              <select
                value={sedeActivaId}
                onChange={(e) => setSedeActivaId(e.target.value)}
                className="border px-4 py-2 rounded-xl focus:outline-none font-bold text-sm cursor-pointer appearance-none min-w-[160px]"
                style={{
                  background: c.surface, color: c.text, borderColor: c.border2,
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right .7rem top 50%', backgroundSize: '.65rem auto',
                }}
              >
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <button
                onClick={() => setModalNuevaSede(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors"
                style={{ background: c.surface, color: c.text, borderColor: c.border2 }}
              >
                + Nueva
              </button>
            </div>
          ) : (
            <span className="font-black text-sm px-2" style={{ color: c.text }}>
              {localStorage.getItem('sede_nombre') || 'Sede Actual'}
            </span>
          )}
        </div>
        )}
      </div>

      {/* Pestañas */}
      <div className="flex gap-8 mb-8">
        {[
          { id: 'info', label: 'Información General', icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M7 6.5v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          )},
          { id: 'mapa', label: 'Diseño de Salón', icon: (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
              <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          )},
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            className="pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2"
            style={tabActiva === tab.id
              ? { color: colorPrimario, borderColor: colorPrimario }
              : { color: c.muted, borderColor: 'transparent' }
            }
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de pestañas */}
      {tabActiva === 'info' && (
        <TabInfo
          c={c}
          colorPrimario={colorPrimario}
          formSede={formSede}
          setFormSede={setFormSede}
          guardando={guardando}
          onGuardar={manejarGuardarInfo}
        />
      )}

      {tabActiva === 'mapa' && (
        <TabMapaResumen
          c={c}
          colorPrimario={colorPrimario}
          sedes={sedes}
          mesasPorSede={mesasPorSede}
          cargando={cargandoMesasTodas}
          onAbrirEditor={(sedeId) => {
            setSedeActivaId(sedeId);
            setModalEditorAbierto(true);
          }}
        />
      )}

      {/* Modales */}
      {modalEditorAbierto && (
        <ModalEditorPlano
          c={c}
          colorPrimario={colorPrimario}
          sedeActualNombre={sedeActualNombre}
          mesas={mesas}
          columnas={columnas}
          casillasArray={casillasArray}
          mesaArrastradaId={mesaArrastradaId}
          setMesaArrastradaId={setMesaArrastradaId}
          guardando={guardando}
          onCambioColumnas={manejarCambioColumnas}
          onDrop={manejarDrop}
          onGuardar={guardarCambiosMapa}
          onAbrirNuevaMesa={() => setModalNuevaMesa(true)}
          onCerrar={() => setModalEditorAbierto(false)}
        />
      )}

      {modalNuevaMesa && (
        <ModalNuevaMesa
          c={c}
          colorPrimario={colorPrimario}
          formMesa={formMesa}
          setFormMesa={setFormMesa}
          creandoMesa={creandoMesa}
          onCrear={manejarCrearMesa}
          onCerrar={() => { setModalNuevaMesa(false); setFormMesa({ numero: '', capacidad: 4 }); }}
        />
      )}

      {modalNuevaSede && (
        <ModalNuevaSede
          c={c}
          colorPrimario={colorPrimario}
          formNuevaSede={formNuevaSede}
          setFormNuevaSede={setFormNuevaSede}
          creandoSede={creandoSede}
          onCrear={manejarCrearSede}
          onCerrar={() => { setModalNuevaSede(false); setFormNuevaSede({ nombre: '', direccion: '' }); }}
        />
      )}
    </div>
  );
}