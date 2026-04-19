import React, { useState, useEffect, useRef, useCallback } from 'react';
// ✨ 1. Importamos getSedes
import { getMesas, crearOrden, getOrdenes, getNegocio, validarPinEmpleado, actualizarMesa, actualizarOrden, crearPago, registrarMovimientoCaja, getSedes } from './api/api';
import ModalCobro from './ModalCobro';
import ModalCierreCaja from './ModalCierreCaja';
import usePosStore from './store/usePosStore';
import DrawerVentaRapida from './DrawerVentaRapida';
import ModalMovimientoCaja from './ModalMovimientoCaja';

function MesasView({ onSeleccionarMesa, onIrAErp }) {
  const { estadoCaja, configuracionGlobal, setConfiguracionGlobal } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  
  const modSalonActivo = configuracionGlobal?.modulos?.salon;
  const modLlevarActivo = configuracionGlobal?.modulos?.delivery;
  
  // ✨ 2. Estado para las sedes
  const [sedes, setSedes] = useState([]);
  
  const [modalMovimientosAbierto, setModalMovimientosAbierto] = useState(false);
  const [ordenesLlevar, setOrdenesLlevar] = useState([]);
  
  const [vistaLocal, setVistaLocal] = useState('salon'); 
  const [mostrarPuertaMovil, setMostrarPuertaMovil] = useState(false);
  
  // ✨ 3. Limpiamos las variables duplicadas. Solo definimos estas UNA VEZ:
  const [sedeActualId, setSedeActualId] = useState(localStorage.getItem('sede_id') || '');
  const rolUsuario = localStorage.getItem('rol_usuario') || ''; 
  const esDueño = rolUsuario.trim().toLowerCase() === 'dueño' || rolUsuario.trim().toLowerCase() === 'admin';
  
  const columnasGrid = parseInt(localStorage.getItem(`columnas_salon_${sedeActualId}`)) || 3;
  const [modoUnir, setModoUnir] = useState(false);
  const [mesaPrincipal, setMesaPrincipal] = useState(null);
  const [triggerRecarga, setTriggerRecarga] = useState(false);
  const wsRef = useRef(null);
  
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  
  const [mesas, setMesas] = useState([]);
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);
  const [drawerVentaRapidaAbierto, setDrawerVentaRapidaAbierto] = useState(false);
  const [ordenACobrar, setOrdenACobrar] = useState(null);

  // ✨ 4. Función para cambiar de sede (el Dueño usa esto)
  const manejarCambioSede = (nuevaSedeId) => {
    if (!nuevaSedeId) return;
    localStorage.setItem('sede_id', nuevaSedeId);
    setSedeActualId(nuevaSedeId);
  };

  useEffect(() => {
    async function cargarSalón() {
      try {
        // ✨ 5. Traemos las sedes junto con las mesas
        const [resMesas, resOrdenes, resSedes] = await Promise.all([
            getMesas({ sede_id: sedeActualId }),
            getOrdenes({ sede_id: sedeActualId }),
            getSedes() // Obtenemos todas las sedes del negocio
        ]);
        
        setSedes(resSedes.data); // Guardamos las sedes para el <select>

        const ordenesVivas = resOrdenes.data.filter(o => 
          o.estado !== 'completado' && 
          o.estado !== 'cancelado' &&
          o.estado_pago !== 'pagado'
        );
        const ordenesDeliveryReales = resOrdenes.data
          .filter(o => o.tipo === 'llevar' && o.estado !== 'completado' && o.estado !== 'cancelado') 
          .reverse() 
          .slice(0, 10);
        
        setOrdenesLlevar(ordenesDeliveryReales);
        
        const mesasReales = resMesas.data.map(mesaDB => {
          const ordenDeEstaMesa = ordenesVivas.find(o => 
            o.mesa !== null && (o.mesa === mesaDB.id || o.mesa === mesaDB.mesa_principal)
          );

          let estadoFinal = 'libre';
          if (mesaDB.mesa_principal) {
             estadoFinal = 'unida'; 
          } else if (ordenDeEstaMesa) {
             estadoFinal = 'ocupada';
          }

          return {
            id: mesaDB.id,
            numero: mesaDB.numero_o_nombre || mesaDB.id, 
            estado: estadoFinal,
            unida_a: mesaDB.mesa_principal || null,
            capacidad: mesaDB.capacidad || 4,
            totalConsumido: ordenDeEstaMesa ? parseFloat(ordenDeEstaMesa.total) : 0 ,
            posicion_x: mesaDB.posicion_x, 
            posicion_y: mesaDB.posicion_y
          };
        });

        setMesas(mesasReales);

      } catch (error) {
        console.error("Error cargando el salón:", error);
      }
    }
    cargarSalón();
  }, [triggerRecarga, sedeActualId]);

  // WebSocket: escucha cambios de mesas en tiempo real
  useEffect(() => {
    if (!sedeActualId) return;

    let ws = null;
    let reconnectTimeout = null;
    let unmounted = false;

    const conectar = () => {
      if (unmounted) return;
      const wsUrl = `${import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL.replace('http', 'ws')}/ws/salon/${sedeActualId}/`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        if (data.type === 'mesa_actualizada') {
          setMesas(prev => prev.map(mesa =>
            mesa.id === data.mesa_id
              ? { ...mesa, estado: data.estado, totalConsumido: data.total ?? mesa.totalConsumido }
              : mesa
          ));
        }

        if (data.type === 'orden_llevar_actualizada') {
          const orden = data.orden;
          if (data.accion === 'nueva') {
            // Agregamos la nueva orden al tope de la lista (máx 10)
            setOrdenesLlevar(prev => [orden, ...prev].slice(0, 10));
          } else if (data.accion === 'completada') {
            // La quitamos de la lista
            setOrdenesLlevar(prev => prev.filter(o => o.id !== orden.id));
          } else if (data.accion === 'actualizada') {
            // Actualizamos la orden existente
            setOrdenesLlevar(prev => prev.map(o => o.id === orden.id ? orden : o));
          }
        }
      };

      ws.onclose = () => {
        if (!unmounted) {
          reconnectTimeout = setTimeout(conectar, 3000);
        }
      };

      ws.onerror = () => ws.close(); // deja que onclose maneje la reconexión
    };

    conectar();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [sedeActualId]);

  const mesasAgrupadas = mesas.filter(m => m.estado !== 'unida').map(mesaPadre => {
    const hijas = mesas.filter(m => m.unida_a === mesaPadre.id);
    return {
      ...mesaPadre,
      mesasInvolucradas: [mesaPadre.numero, ...hijas.map(h => h.numero)],
      esGigante: hijas.length > 0,
      capacidadTotal: mesaPadre.capacidad + hijas.reduce((sum, h) => sum + h.capacidad, 0)
    };
  });
  const manejarCancelacion = async (id) => {
    const motivo = window.prompt("¿Por qué se cancela el pedido? (Ej: Cliente se fue, Error de digitación)");
    if (motivo) {
      try {
        await actualizarOrden(id, { estado: 'cancelado', cancelado: true, motivo_cancelacion: motivo });
        setTriggerRecarga(prev => !prev);
      } catch (error) {
        console.error("Error al cancelar:", error);
      }
    }
  };

  const manejarClickMesa = async (mesa) => {
    if (modoUnir) {
      if (!mesaPrincipal) {
        setMesaPrincipal(mesa.id);
      } else {
        if (mesa.id !== mesaPrincipal) {
          try {
            await actualizarMesa(mesa.id, { mesa_principal: mesaPrincipal });
            setModoUnir(false);
            setMesaPrincipal(null);
            setTriggerRecarga(!triggerRecarga); 
          } catch (error) {
            alert("No se pudo unir las mesas en la base de datos.");
          }
        }
      }
    } else {
      onSeleccionarMesa(mesa.id);
    }
  };

  const separarMesas = async (idPadre) => {
    if (!window.confirm("¿Desvincular este grupo de mesas?")) return;
    try {
      const mesasHijas = mesas.filter(m => m.unida_a === idPadre);
      for (const hija of mesasHijas) {
        await actualizarMesa(hija.id, { mesa_principal: null });
      }
      setTriggerRecarga(prev => !prev);
    } catch (error) {
      alert("La base de datos se resistió a separarlas.");
    }
  };

  const iniciarOrdenDelivery = () => {
    if (!nombreCliente.trim()) {
      alert("Por favor, ingresa al menos el nombre del cliente.");
      return;
    }
    setModalClienteAbierto(false);
    onSeleccionarMesa({ id: 'llevar', cliente: nombreCliente, telefono: telefonoCliente });
    setNombreCliente('');
    setTelefonoCliente('');
  };

  const entregarOrdenLlevar = async (id) => {
    try {
      await actualizarOrden(id, { estado: 'pagado' }); 
      setTriggerRecarga(prev => !prev); 
    } catch (error) {
      alert("Hubo un error al intentar entregar el pedido.");
    }
  };

  const manejarCierreCajaSeguro = async () => {
    // 1. Verificamos si hay mesas ocupadas o pedidos para llevar sin pagar
    const hayMesasOcupadas = mesas.some(mesa => mesa.estado === 'ocupada' || mesa.orden_activa);
    const hayLlevarPendientes = ordenesLlevar.some(orden => orden.estado_pago !== 'pagado'); 

    if (hayMesasOcupadas || hayLlevarPendientes) {
      alert("⚠️ ALTO AHÍ: No puedes cerrar el turno. Aún hay mesas ocupadas o pedidos pendientes de cobro.");
      return;
    }

    // 2. Pedimos el PIN de seguridad
    const pinIngresado = window.prompt("Ingrese PIN autorizado para cerrar caja:");
    if (!pinIngresado) return;

    try {
      const respuesta = await validarPinEmpleado({ pin: pinIngresado, accion: 'entrar' });
      const rolIngresado = respuesta.data.rol_nombre;
      
      // 3. Verificamos que tenga el rol correcto
      if (['Cajero', 'Administrador', 'Admin'].includes(rolIngresado)) {
        setModalCierreAbierto(true); // Abrimos el modal si todo está OK
      } else {
        alert("🚫 Tu rol no tiene permisos para cerrar la caja.");
      }
    } catch (error) { 
      alert("❌ PIN incorrecto o empleado inactivo."); 
    }
  };
  // ✨ EL MOTOR DE ARRANQUE ÚNICO Y DEFINITIVO
  // ✨ EL MOTOR DE ARRANQUE FORZADO
  useEffect(() => {
    const arrancarPos = async () => {
      console.log("🚀 [POS] Iniciando descarga de configuración...");
      try {
        const negocioId = localStorage.getItem('negocio_id') || 1;
        const response = await getNegocio(negocioId);
        const datosBD = response.data;
        
        console.log("📦 [POS] Datos que llegaron de Django:", datosBD);
        
        if (setConfiguracionGlobal) {
          // 1. Inyectamos los datos frescos a la memoria global
          setConfiguracionGlobal({
            colorPrimario: datosBD.color_primario || '#ff5a1f',
            temaFondo: datosBD.tema_fondo || 'dark',
            modulos: {
              salon: datosBD.mod_salon_activo !== false,
              delivery: datosBD.mod_delivery_activo !== false,
              cocina: datosBD.mod_cocina_activo !== false
            }
          });

          // 2. Decidimos qué vista mostrar según la verdad absoluta de la BD
          if (datosBD.mod_salon_activo !== false) {
            setVistaLocal('salon');
          } else if (datosBD.mod_delivery_activo !== false) {
            setVistaLocal('llevar');
          } else {
            setVistaLocal('fastfood'); // Un estado de rescate
          }
        }
      } catch (error) {
        console.error("❌ [POS] Error crítico al contactar a Django:", error);
        setVistaLocal('salon'); // Si el internet falla, intentamos abrir el salón
      }
    };

    // Al dejar los corchetes vacíos [], le decimos a React: "Haz esto UNA SOLA VEZ al abrir la página"
    arrancarPos();
  }, []); 



  // ✨ EL SINCRONIZADOR: Ajusta la vista inicial cuando la configuración llega de la BD
  useEffect(() => {
    // Si la configuración ya cargó y el salón está apagado, nos movemos a llevar
    if (configuracionGlobal?.modulos) {
      if (!modSalonActivo && modLlevarActivo) {
        setVistaLocal('llevar');
      } else if (modSalonActivo) {
        setVistaLocal('salon');
      }
    }
  }, [modSalonActivo, modLlevarActivo, configuracionGlobal]);
  // ✨ EL ESCUDO DE CARGA
  // Solo mostramos la pantalla de carga si vistaLocal sigue siendo null
  if (vistaLocal === null) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${tema === 'dark' ? 'bg-[#0a0a0a]' : 'bg-[#f4f4f5]'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: colorPrimario || '#ff5a1f', borderTopColor: 'transparent' }}></div>
          <p className={`font-black tracking-widest uppercase text-xs ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>
            Conectando con la base de datos...
          </p>
        </div>
      </div>
    );
  }
  // --- RENDERIZADO CONDICIONAL DE BLOQUEO DE MÓDULOS ---
  if (modSalonActivo === false && modLlevarActivo === false) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center text-center p-6 ${tema === 'dark' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f0f0f0] text-gray-900'}`}>
        <span className="text-6xl mb-4">🍔</span>
        <h1 className="text-3xl font-black mb-2 uppercase">Modo Fast Food Activo</h1>
        <p className="text-neutral-500 mb-8 max-w-md">El salón principal y delivery están desactivados. Usa la Venta Rápida para atender en barra.</p>
        <button 
          onClick={() => setDrawerVentaRapidaAbierto(true)}
          style={{ backgroundColor: colorPrimario }}
          className="px-8 py-4 rounded-2xl text-white font-black text-xl shadow-lg transition-transform active:scale-95"
        >
          ⚡ INICIAR VENTA RÁPIDA
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-500 pb-10 ${
      tema === 'dark' ? 'bg-[#0a0a0a] text-neutral-100' : 'bg-[#f4f4f5] text-gray-900'
    }`}>
      
      {/* CABECERA (HEADER) - FORZADA A DARK MODE PARA HACER JUEGO CON EL ERP */}
      {/* CABECERA (HEADER) - ESTRUCTURA 2 FILAS */}
      <header className="px-4 py-4 md:px-5 md:pt-6 md:pb-5 sticky top-0 z-10 border-b bg-[#0a0a0a]/95 border-[#222] backdrop-blur-md shadow-xl">
        <div className="flex justify-between items-start gap-2">
          
          {/* TÍTULO Y ESTADO */}
          <div className="shrink-0 mt-1">
            <h1 className="text-xl sm:text-2xl md:text-[28px] font-black tracking-tight uppercase leading-none flex flex-col sm:block">
              {vistaLocal === 'salon' ? (
                <><span className="text-white">Salón</span> <span style={{ color: colorPrimario }}>Principal</span></>
              ) : (
                <><span className="text-white">Para</span> <span style={{ color: colorPrimario }}>Llevar</span></>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-1 sm:mt-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-neutral-500">En vivo</span>
              <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            </div>
          </div>
          
          {/* BOTONERA (Ahora con el Selector de Sedes para el Dueño) */}
          <div className="flex flex-col items-end gap-2 sm:gap-3">
            
            {/* ✨ FILA 0: SELECTOR EXCLUSIVO PARA EL DUEÑO */}
            {esDueño && sedes?.length > 1 &&(
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Modo Dueño:
                </span>
                <select 
                  value={sedeActualId || ''} 
                  onChange={(e) => manejarCambioSede(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer appearance-none text-center shadow-sm transition-colors bg-[#1a1a1a] text-white border-[#333] hover:border-[#ff5a1f] focus:border-[#ff5a1f]"
                  style={{ color: colorPrimario }}
                >
                  <option value="" disabled>Seleccionar Sede...</option>
                  {sedes?.map(sede => (
                    <option key={sede.id} value={sede.id}>📍 {sede.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex flex-col items-end gap-1.5 sm:gap-2">
              {/* FILA 1: Operaciones del POS (Máximo 3 botones) */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* BOTÓN UNIR MESAS */}
                {vistaLocal === 'salon' && (
                  <button 
                    onClick={() => { setModoUnir(!modoUnir); setMesaPrincipal(null); }}
                    className={`w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all shrink-0 ${
                      !modoUnir && 'bg-[#1a1a1a] border-[#333] text-neutral-400 hover:text-white hover:bg-[#222]'
                    }`}
                    style={modoUnir ? { backgroundColor: colorPrimario, borderColor: colorPrimario, color: '#fff', boxShadow: `0 0 15px ${colorPrimario}60` } : {}}
                    title="Unir Mesas"
                  >
                    <span className="text-base sm:text-lg">🔗</span>
                  </button>
                )}

                {/* BOTÓN CAMBIO SALÓN/LLEVAR */}
                {modSalonActivo && modLlevarActivo && (
                  <button 
                    onClick={() => {
                      if (vistaLocal === 'salon') { setVistaLocal('llevar'); setModoUnir(false); } 
                      else { setVistaLocal('salon'); }
                    }}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all relative shrink-0 border-[#333] bg-[#1a1a1a] text-neutral-400 hover:text-white hover:bg-[#222] shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                    title={vistaLocal === 'salon' ? "Ir a Para Llevar" : "Ir al Salón Principal"}
                  >
                    {vistaLocal === 'salon' ? (
                      <>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white text-[8px] sm:text-[9px] font-bold flex items-center justify-center rounded-full border border-[#0a0a0a]" style={{ backgroundColor: colorPrimario }}>
                          {ordenesLlevar?.length || 0}
                        </span>
                      </>
                    ) : (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                    )}
                  </button>
                )}

                {/* BOTÓN VENTA RÁPIDA */}
                <button 
                  onClick={() => setDrawerVentaRapidaAbierto(true)}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border transition-all active:scale-95 shrink-0 hover:brightness-125"
                  style={{ backgroundColor: `${colorPrimario}1A`, borderColor: `${colorPrimario}4D`, color: colorPrimario }}
                  title="Venta Rápida"
                >
                  <span className="text-base sm:text-lg">⚡</span>
                </button>
              </div>

              {/* FILA 2: Acciones Administrativas / Caja */}
              {['administrador', 'admin', 'cajero', 'dueño'].includes(rolUsuario?.toLowerCase()) && (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  
                  {/* BOTÓN ERP (Solo Admin y Dueño) */}
                  {['administrador', 'admin', 'dueño'].includes(rolUsuario?.toLowerCase()) && (
                    <button onClick={onIrAErp} className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all active:scale-95 shrink-0" title="Panel de Control (ERP)">
                      <span className="text-base sm:text-lg">⚙️</span>
                    </button>
                  )}

                  {/* BOTÓN CAJA CHICA */}
                  <button onClick={() => setModalMovimientosAbierto(true)} className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border border-green-500/30 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-all active:scale-95 shrink-0" title="Caja Chica">
                    <span className="text-base sm:text-lg">💸</span>
                  </button>

                  {/* BOTÓN CERRAR TURNO */}
                  <button 
                    onClick={manejarCierreCajaSeguro} 
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 shrink-0" 
                    title="Cerrar Turno"
                  >
                    <span className="text-base sm:text-lg">🔒</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* VISTA: SALÓN PRINCIPAL (MAPA UNIVERSAL SINCRONIZADO)      */}
      {/* ========================================================= */}
      {vistaLocal === 'salon' && modSalonActivo && (() => {
        
        // ✨ LA LECTURA MAESTRA: Buscamos cuántas columnas configuró el dueño
        const sedeActual = sedes.find(s => String(s.id) === String(sedeActualId));
        const COLUMNAS_MAPA = sedeActual?.columnas_salon || 3; 

        // 🧠 LÓGICA UNIVERSAL DE HUECOS
        let maxPos = 0;
        const mapaMesas = {};
        mesasAgrupadas.forEach((mesa) => {
          let pos = mesa.posicion_x;
          if (pos === undefined || pos === null || mapaMesas[pos]) {
             pos = 0;
             while(mapaMesas[pos]) pos++; 
          }
          mapaMesas[pos] = mesa;
          if (pos > maxPos) maxPos = pos;
        });

        // 📏 Calculamos el total de casillas basado en las columnas que eligió el Admin
        const baseCasillas = Math.max(maxPos + 1, mesasAgrupadas.length, 12);
        const totalCasillas = Math.ceil(baseCasillas / COLUMNAS_MAPA) * COLUMNAS_MAPA; 
        const casillasArray = Array.from({ length: totalCasillas }, (_, i) => i);

        return (
          <div className="p-4 md:p-5 flex-1 flex flex-col animate-fadeIn items-center">
            
            <div className="w-full max-w-3xl">
              {/* AVISO MODO UNIR MESAS */}
              {modoUnir && (
                <div className="p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 animate-pulse border shadow-md" style={{ backgroundColor: `${colorPrimario}1A`, borderColor: `${colorPrimario}4D`, color: colorPrimario }}>
                  <span className="text-xl">🔗</span>
                  <span className="font-bold">
                    {mesaPrincipal ? `Selecciona la mesa que se unirá a la Mesa ${mesaPrincipal}...` : 'Paso 1: Selecciona la Mesa Principal (la que recibirá la cuenta)...'}
                  </span>
                </div>
              )}

              {/* CONTROLES DE LA CUADRÍCULA Y ORIENTACIÓN */}
              <div className="flex justify-end items-center mb-5">
                <button 
                  onClick={() => setMostrarPuertaMovil(!mostrarPuertaMovil)}
                  className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-lg border transition-all active:scale-95 w-full sm:w-auto shadow-sm"
                  style={mostrarPuertaMovil 
                    ? { backgroundColor: colorPrimario, color: 'white', borderColor: colorPrimario } 
                    : { backgroundColor: `${colorPrimario}1A`, color: colorPrimario, borderColor: `${colorPrimario}40` }
                  }
                >
                  {mostrarPuertaMovil ? 'Ocultar Orientación' : '📍 Activar Orientación'}
                </button>
              </div>

              {/* Marcador de Puerta */}
              {mostrarPuertaMovil && (
                <div className={`w-full py-3 rounded-xl mb-4 text-[10px] font-black text-center uppercase tracking-[0.2em] shadow-inner border border-dashed ${tema === 'dark' ? 'bg-[#1a1a1a] text-neutral-500 border-[#333]' : 'bg-gray-100 text-gray-400 border-gray-300'}`}>
                  Entrada Principal 🚪
                </div>
              )}

              {/* ========================================== */}
              {/* 🗺️ GRID UNIVERSAL (Idéntico para todos)    */}
              {/* ========================================== */}
              <div 
                className="grid gap-3 sm:gap-4 pb-10" 
                style={{ gridTemplateColumns: `repeat(${COLUMNAS_MAPA}, minmax(0, 1fr))` }}
              >
                {casillasArray.map((casillaIndex) => {
                  const mesa = mapaMesas[casillaIndex];

                  // Hueco invisible (Mantiene la estructura del mapa intacta)
                  if (!mesa) return <div key={`hueco-${casillaIndex}`} className="h-32 sm:h-40 rounded-3xl border-2 border-dashed border-transparent pointer-events-none"></div>;

                  const esOcupada = mesa.estado === 'ocupada';
                  const esTomandoPedido = mesa.estado === 'tomando_pedido';
                  const esCobrando = mesa.estado === 'cobrando';
                  let cardStyle = tema === 'dark' ? "bg-[#161616] border-[#2a2a2a] active:bg-[#1a1a1a] hover:bg-[#1a1a1a]" : "bg-white border-gray-200 shadow-sm active:bg-gray-50 hover:shadow-md"; 
                  let badgeStyle = tema === 'dark' ? "bg-[#222222] text-neutral-400" : "bg-gray-100 text-gray-500";
                  let titleStyle = tema === 'dark' ? "text-white" : "text-gray-900";
                  let inlineCardStyle = {};
                  let icono = null;
                  let labelEstado = mesa.estado;

                  if (esOcupada) {
                    cardStyle = "";
                    inlineCardStyle = { backgroundColor: tema === 'dark' ? `${colorPrimario}0D` : `${colorPrimario}0A`, borderColor: `${colorPrimario}60` };
                    badgeStyle = "";
                    icono = '🍴'; labelEstado = 'ocupada';
                  }
                  if (esTomandoPedido) {
                    cardStyle = "";
                    inlineCardStyle = { backgroundColor: tema === 'dark' ? '#fbbf2408' : '#fef9c3', borderColor: '#fbbf24aa' };
                    badgeStyle = "bg-yellow-400/20 text-yellow-400";
                    icono = '📝'; labelEstado = 'pidiendo';
                  }
                  if (esCobrando) {
                    cardStyle = "";
                    inlineCardStyle = { backgroundColor: tema === 'dark' ? '#a855f708' : '#faf5ff', borderColor: '#a855f7aa' };
                    badgeStyle = "bg-purple-400/20 text-purple-400";
                    icono = '💳'; labelEstado = 'cobrando';
                  }
                  if (modoUnir && mesaPrincipal === mesa.id) {
                    cardStyle = "text-white scale-[1.02] z-10";
                    inlineCardStyle = { backgroundColor: colorPrimario, borderColor: colorPrimario, boxShadow: `0 4px 15px ${colorPrimario}4D` };
                    badgeStyle = "bg-white/20 text-white";
                    titleStyle = "text-white";
                  }

                  return (
                    <button key={`mesa-${mesa.id}`} onClick={() => manejarClickMesa(mesa)} style={inlineCardStyle} className={`border-[1.5px] rounded-3xl p-3.5 sm:p-4 flex flex-col active:scale-95 text-left h-32 sm:h-40 relative transition-all ${cardStyle} ${mesa.esGigante ? 'col-span-2' : ''}`}>
                      <div className="flex justify-between items-start w-full mb-1 sm:mb-2">
                        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                          <span className={`text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg uppercase tracking-widest ${badgeStyle}`} style={esOcupada && !modoUnir ? { backgroundColor: `${colorPrimario}20`, color: colorPrimario } : {}}>
                            {mesa.esGigante ? 'GRUPO' : labelEstado}
                          </span>
                          {mesa.esGigante && !modoUnir && (
                            <button onClick={(e) => { e.stopPropagation(); separarMesas(mesa.id); }} className="text-[9px] sm:text-[10px] font-black px-2 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors z-20">✂️</button>
                          )}
                        </div>
                        {icono && !modoUnir && <span className="opacity-70 text-sm sm:opacity-50">{icono}</span>}
                      </div>
                      <div className="flex-1 flex items-center justify-center w-full">
                        <h3 className={`font-black tracking-tight leading-none ${mesa.esGigante ? 'text-2xl sm:text-4xl' : 'text-xl sm:text-3xl'} ${titleStyle}`}>
                          {mesa.esGigante ? mesa.mesasInvolucradas.join(' + ') : mesa.numero}
                        </h3>
                      </div>
                      <div className={`w-full flex justify-center items-center gap-1 sm:gap-1.5 mt-1 sm:mt-2 ${modoUnir && mesaPrincipal === mesa.id ? 'text-white/80' : (tema === 'dark' ? 'text-neutral-500' : 'text-gray-400')}`}>
                        <svg className="hidden sm:block w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                        <span className="text-[10px] sm:text-[11px] font-bold">{mesa.capacidadTotal || mesa.capacidad} pax</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* VISTA: PARA LLEVAR */}
      {vistaLocal === 'llevar' && modLlevarActivo && (
        <div className="p-5 flex-1 flex flex-col animate-fadeIn">
          <button 
            onClick={() => setModalClienteAbierto(true)} 
            style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 20px ${colorPrimario}4D` }}
            className="w-full text-white font-black uppercase tracking-widest py-5 rounded-3xl mb-8 flex justify-center items-center gap-3 text-sm md:text-lg transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path></svg>
            Nueva Orden Para Llevar
          </button>

          <h2 className={`font-bold mb-4 uppercase text-xs tracking-widest ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>Órdenes Activas</h2>
          
          <div className="space-y-4">
            {ordenesLlevar.length === 0 && (
              <div className={`text-center py-10 border border-dashed rounded-3xl ${tema === 'dark' ? 'border-[#333]' : 'border-gray-300'}`}>
                <p className={`font-bold ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>No hay órdenes activas para llevar 🛵</p>
              </div>
            )}

            {ordenesLlevar.map(orden => {
              const estaListo = orden.estado === 'listo';
              const estaPagado = orden.pago_confirmado; 
              
              return (
                <div key={orden.id} className={`p-5 rounded-3xl flex justify-between items-center relative overflow-hidden transition-all ${tema === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222]' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${estaPagado ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                  
                  <div className="flex-1 pl-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-black text-lg ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>Orden #{orden.id}</h3>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${estaPagado ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        {estaPagado ? 'PAGADO' : 'FALTA PAGAR'}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${estaListo ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'border'}`} style={!estaListo ? { backgroundColor: `${colorPrimario}1A`, color: colorPrimario, borderColor: `${colorPrimario}33` } : {}}>
                        {estaListo ? 'LISTO' : 'EN COCINA'}
                      </span>
                    </div>
                    <p className={`text-sm font-bold ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>👤 {orden.cliente_nombre}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!estaPagado && (
                      <button onClick={() => manejarCancelacion(orden.id)} className={`p-3 rounded-2xl transition-colors ${tema === 'dark' ? 'bg-[#222] text-neutral-500 hover:bg-red-900/20 hover:text-red-500' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`} title="Cancelar Pedido">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    )}

                    {!estaPagado ? (
                      <button onClick={() => setOrdenACobrar(orden)} style={{ backgroundColor: colorPrimario }} className="text-white px-4 py-2 rounded-2xl font-black text-xs md:text-sm shadow-md active:scale-95 transition-all">
                        COBRAR
                      </button>
                    ) : (
                      estaListo && (
                        <button onClick={() => entregarOrdenLlevar(orden.id)} className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-2xl shadow-lg transition-transform active:scale-90" title="Marcar como entregado">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {modalClienteAbierto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#1a1a1a] border border-[#333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#2a2a2a] flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white">Datos del Cliente</h2>
                <p className="text-neutral-500 text-sm mt-1">Identifica el pedido para llevar</p>
              </div>
              <button onClick={() => setModalClienteAbierto(false)} className="w-8 h-8 bg-[#222] rounded-full flex items-center justify-center text-neutral-400 hover:text-white font-bold">X</button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>👤</span> Nombre (Obligatorio)
                </label>
                <input 
                  type="text" 
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Ej. Carlos Gutiérrez" 
                  className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-4 text-white focus:outline-none focus:border-[#ff5a1f] transition-colors shadow-inner" 
                />
              </div>
              <div>
                <label className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span>📱</span> WhatsApp (Opcional)
                </label>
                <input 
                  type="tel" 
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  placeholder="Ej. 999 999 999" 
                  className="w-full bg-[#121212] border border-[#333] rounded-xl px-4 py-4 text-white focus:outline-none focus:border-[#ff5a1f] transition-colors shadow-inner" 
                />
                <p className="text-neutral-500 text-[11px] mt-2 font-medium leading-relaxed">
                  Ingresa el número para enviarle un SMS automático cuando su pedido esté listo para recoger.
                </p>
              </div>
              <button 
                onClick={iniciarOrdenDelivery} 
                className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white font-black py-4 rounded-xl mt-2 active:scale-95 transition-all shadow-[0_4px_15px_rgba(255,90,31,0.3)]"
              >
                IR AL MENÚ ➔
              </button>
            </div>
          </div>
        </div>
      )}

      <ModalCobro 
        isOpen={!!ordenACobrar} 
        onClose={() => setOrdenACobrar(null)} 
        total={ordenACobrar ? parseFloat(ordenACobrar.total) : 0} 
        
        // 👇 1. Agregamos la "cantidad" al carrito para que el modal no se confunda
        carrito={ordenACobrar ? ordenACobrar.detalles.map(d => ({
          id: d.producto, 
          nombre: d.nombre, 
          precio: parseFloat(d.precio_unitario),
          cantidad: d.cantidad || 1 // ✨ IMPORTANTE
        })) : []} 

        // 👇 2. LA BANDERA MÁGICA QUE ENCIENDE EL MODO EXPRESS
        esVentaRapida={ordenACobrar?.es_venta_rapida || false}

        onCobroExitoso={async (pagosRegistrados) => {
          try {
            let idDeLaOrden = ordenACobrar.id;

            if (idDeLaOrden === 'venta_rapida') {
              const resNuevaOrden = await crearOrden({
                tipo: 'llevar',
                estado: 'completado', // ✨ La venta rápida nace y muere completada
                estado_pago: 'pagado', // ✨ El campo correcto para tu BD
                sede: sedeActualId, 
                detalles: ordenACobrar.detalles || [] 
              });
              idDeLaOrden = resNuevaOrden.data.id; 
            } else {
              await actualizarOrden(idDeLaOrden, { 
                estado_pago: 'pagado', // ✨ Registra el pago en Django
                estado: 'completado'   // ✨ Esto libera la mesa automáticamente
              });
            }

            for (const pago of pagosRegistrados) {
              await crearPago({
                orden: idDeLaOrden,
                monto: pago.monto,
                metodo: pago.metodo 
              });
            }
            
            setOrdenACobrar(null); 
            setTriggerRecarga(prev => !prev); 
            alert("¡Cobro realizado con éxito! 💵✨");
            
          } catch (error) {
            console.error("Error al procesar el cobro:", error);
            alert("Hubo un error al guardar el pago. Revisa la consola.");
          }
        }}
      />

      <DrawerVentaRapida 
        isOpen={drawerVentaRapidaAbierto}
        onClose={() => setDrawerVentaRapidaAbierto(false)}
        onProcederPago={(carrito, total) => {
          setCarritoVentaRapida(carrito);
          setTotalVentaRapida(total);
          setOrdenACobrar({ 
            id: 'venta_rapida', 
            es_venta_rapida: true, // ✨ ESTA ES LA BANDERA MÁGICA ✨
            total: total, 
            detalles: carrito.map(c => ({ 
                producto: c.id, 
                nombre: c.nombre, 
                precio_unitario: c.precio,
                cantidad: c.cantidad 
            })) 
          });
          setDrawerVentaRapidaAbierto(false); 
        }}
      />

      <ModalCierreCaja 
        isOpen={modalCierreAbierto}
        onClose={() => setModalCierreAbierto(false)}
        onCierreExitoso={(resumen) => {
          setModalCierreAbierto(false);
          const diferencia = resumen?.diferencia || 0;
          let mensaje = "";

          if (diferencia === 0) {
            mensaje = "✅ ¡Cuadre perfecto! Caja cerrada sin diferencias.";
          } else if (diferencia > 0) {
            mensaje = `⚠️ Caja cerrada. Hay un SOBRANTE de S/ ${diferencia.toFixed(2)}`;
          } else {
            mensaje = `🚨 Caja cerrada. Hay un FALTANTE de S/ ${Math.abs(diferencia).toFixed(2)}`;
          }

          alert(`${mensaje}\n\nCerrando sesión del sistema...`);
          window.location.reload(); 
        }}
      />
      {/* MODAL DE CAJA CHICA / MOVIMIENTOS */}
      <ModalMovimientoCaja 
        isOpen={modalMovimientosAbierto}
        onClose={() => setModalMovimientosAbierto(false)}
        onGuardar={async (datosMovimiento) => {
          try {
            const sesionId = estadoCaja?.id || localStorage.getItem('sesion_caja_id');

            if (!sesionId) {
              alert("⚠️ No se encontró una sesión de caja activa. Revisa si la caja está abierta.");
              return;
            }

            const payload = {
              tipo: datosMovimiento.tipo,
              monto: datosMovimiento.monto,
              concepto: datosMovimiento.concepto,
              sesion_caja_id: sesionId,
              empleado_id: localStorage.getItem('empleado_id') 
            };

            // ✨ ARREGLADO: Solo disparamos la petición sin guardar la respuesta
            await registrarMovimientoCaja(payload);
            
            alert(`💸 ¡Listo! Se registró el ${datosMovimiento.tipo} de S/ ${datosMovimiento.monto} exitosamente.`);
            
          } catch (error) {
            console.error("Error al registrar caja chica:", error);
            alert("❌ Hubo un error al guardar el movimiento en el sistema.");
          }
        }}
      />
    </div>
  );
}

export default MesasView;