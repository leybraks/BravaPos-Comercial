import React, { useState,useEffect } from 'react';
import { getMesas,crearOrden, getOrdenes,validarPinEmpleado, actualizarMesa,actualizarOrden, crearPago } from './api/api';
import ModalCobro from './ModalCobro';
import ModalCierreCaja from './ModalCierreCaja';
import  usePosStore  from './store/usePosStore';

import DrawerVentaRapida from './DrawerVentaRapida'; // Asegúrate que la ruta sea correcta
function MesasView({ onSeleccionarMesa, rolUsuario, onIrAErp }) {
  console.log("DEBUG - Rol recibido en MesasView:", rolUsuario);
  const [ordenesLlevar, setOrdenesLlevar] = useState([]);
  const [vistaLocal, setVistaLocal] = useState('salon'); 
  const [modoUnir, setModoUnir] = useState(false);
  const [mesaPrincipal, setMesaPrincipal] = useState(null);
  const [triggerRecarga, setTriggerRecarga] = useState(false);
  // NUEVO ESTADO: Controla el modal de datos del cliente para Delivery
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const { estadoCaja } = usePosStore();
  const [mesas, setMesas] = useState([]);
  const [modalCierreAbierto, setModalCierreAbierto] = useState(false);
  const [drawerVentaRapidaAbierto, setDrawerVentaRapidaAbierto] = useState(false);
  const [carritoVentaRapida, setCarritoVentaRapida] = useState([]); 
  const [totalVentaRapida, setTotalVentaRapida] = useState(0);
  const [ordenACobrar, setOrdenACobrar] = useState(null);
  useEffect(() => {
    async function cargarSalón() {
      try {
        // 1. Traemos todas las mesas de la Sede
        const resMesas = await getMesas();
        // 2. Traemos todas las órdenes de la Sede
        const resOrdenes = await getOrdenes();

        // Filtramos solo las órdenes que aún no están pagadas (vivas)
        const ordenesVivas = resOrdenes.data.filter(o => o.estado !== 'pagado');
        const ordenesDeliveryReales = resOrdenes.data
                  .filter(o => o.tipo === 'llevar' && o.estado !== 'pagado') 
                  .reverse() // Para que las más nuevas salgan arriba
                  .slice(0, 10);
                setOrdenesLlevar(ordenesDeliveryReales);
        const mesasReales = resMesas.data.map(mesaDB => {
          // Buscamos si la mesa (o su mesa principal) tiene una orden viva
          const ordenDeEstaMesa = ordenesVivas.find(o => 
            o.mesa !== null && (o.mesa === mesaDB.id || o.mesa === mesaDB.mesa_principal)
          );

          // Definimos el estado exacto para tu lógica visual
          let estadoFinal = 'libre';
          if (mesaDB.mesa_principal) {
             estadoFinal = 'unida'; // <--- ¡ESTO HARÁ QUE SE FUSIONE VISUALMENTE!
          } else if (ordenDeEstaMesa) {
             estadoFinal = 'ocupada';
          }

          return {
            id: mesaDB.id,
            numero: mesaDB.numero_o_nombre || mesaDB.id, 
            estado: estadoFinal,
            unida_a: mesaDB.mesa_principal || null,
            capacidad: mesaDB.capacidad || 4,
            totalConsumido: ordenDeEstaMesa ? parseFloat(ordenDeEstaMesa.total) : 0 
          };
        });

        setMesas(mesasReales);

      } catch (error) {
        console.error("Error cargando el salón:", error);
      }
    }

    cargarSalón();

    // Opcional: Podrías poner un setInterval aquí para que recargue cada 10 seg
    // si quieres que otra tablet se entere de los cambios.
  }, [triggerRecarga]);
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
        await actualizarOrden(id, { 
          estado: 'cancelado', 
          cancelado: true, 
          motivo_cancelacion: motivo 
        });
        setTriggerRecarga(prev => !prev);
        alert("Pedido cancelado y registrado.");
      } catch (error) {
        console.error("Error al cancelar:", error);
      }
    }
  };
  const manejarClickMesa = async (mesa) => {
    if (modoUnir) {
      if (!mesaPrincipal) {
        // Primer clic: Seleccionamos la mesa "Padre"
        setMesaPrincipal(mesa.id);
      } else {
        // Segundo clic: Seleccionamos la mesa "Hija" que se va a fusionar
        if (mesa.id !== mesaPrincipal) {
          try {
            // 1. Disparamos a la API: "Oye Django, la mesa actual ahora es hija de mesaPrincipal"
            await actualizarMesa(mesa.id, { mesa_principal: mesaPrincipal });
            
            // 2. Limpiamos la interfaz
            setModoUnir(false);
            setMesaPrincipal(null);
            
            // 3. Activamos el interruptor para que la pantalla se actualice sola
            setTriggerRecarga(!triggerRecarga); 
            
          } catch (error) {
            console.error("Error al unir las mesas:", error);
            alert("No se pudo unir las mesas en la base de datos.");
          }
        }
      }
    } else {
      onSeleccionarMesa(mesa.id);
    }
  };
  const separarMesas = async (idPadre) => {
    // 1. Una pequeña confirmación por si el dedo resbala
    if (!window.confirm("¿Desvincular este grupo de mesas?")) return;

    try {
      // 2. Buscamos todas las mesas en tu estado que sean hijas de este padre
      const mesasHijas = mesas.filter(m => m.unida_a === idPadre);

      // 3. Le decimos a Django que cada una de esas hijas ahora es libre e independiente (null)
      for (const hija of mesasHijas) {
        await actualizarMesa(hija.id, { mesa_principal: null });
      }

      // 4. Activamos el interruptor para que React redibuje el mapa al instante
      setTriggerRecarga(prev => !prev);
      
    } catch (error) {
      console.error("Error al separar mesas:", error);
      alert("La base de datos se resistió a separarlas.");
    }
  };

  const iniciarOrdenDelivery = () => {
    if (!nombreCliente.trim()) {
      alert("Por favor, ingresa al menos el nombre del cliente.");
      return;
    }
    setModalClienteAbierto(false);
    
    // ¡Enviamos un objeto con todos los datos a la vista principal!
    onSeleccionarMesa({ 
      id: 'llevar', 
      cliente: nombreCliente, 
      telefono: telefonoCliente 
    });
    
    // Limpiamos
    setNombreCliente('');
    setTelefonoCliente('');
  };
  // --- FUNCIÓN PARA ENTREGAR Y ARCHIVAR EL PEDIDO ---
  const entregarOrdenLlevar = async (id) => {
    try {
      // Como ya está pagado, lo pasamos al estado final para que desaparezca de la lista
      await actualizarOrden(id, { estado: 'pagado' }); 
      
      // Activamos el interruptor para que la lista se limpie sola al instante
      setTriggerRecarga(prev => !prev); 
      
      alert("¡Pedido entregado con éxito! 🛵✅");
    } catch (error) {
      console.error("Error al entregar la orden:", error);
      alert("Hubo un error al intentar entregar el pedido.");
    }
  };
  return (
    <div className="bg-[#121212] min-h-screen flex flex-col font-sans text-neutral-100 pb-10">
      
      <header className="px-5 pt-6 pb-5 bg-[#121212] sticky top-0 z-10 border-b border-[#2a2a2a]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-[28px] font-black tracking-tight uppercase">
              {vistaLocal === 'salon' ? (
                <><span className="text-white">Salón</span> <span className="text-[#ff5a1f]">Principal</span></>
              ) : (
                <><span className="text-white">Para</span> <span className="text-[#ff5a1f]">Llevar</span></>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-neutral-400 text-sm font-medium">Estado en vivo</span>
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            </div>
          </div>
          
          {/* CONTENEDOR PRINCIPAL: Inteligente según el Rol */}
          <div className="flex flex-col items-end gap-2">
            
            {/* === FILA 1: OPERATIVA (Mesero ve 3, Cajero ve 4, Admin ve 3) === */}
            <div className="flex items-center gap-2">
              
              {/* 1. BOTÓN UNIR MESAS */}
              {vistaLocal === 'salon' && (
                <button 
                  onClick={() => { setModoUnir(!modoUnir); setMesaPrincipal(null); }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all shrink-0
                    ${modoUnir ? 'bg-[#ff5a1f] border-[#ff5a1f] text-white shadow-[0_0_15px_rgba(255,90,31,0.3)]' : 'bg-[#1a1a1a] border-[#333] text-neutral-400 hover:text-white'}`}
                  title="Unir Mesas"
                >
                  <span className="text-lg">🔗</span>
                </button>
              )}

              {/* 2. EL BOTÓN MÁGICO (Alternador Salón <-> Llevar) */}
              <button 
                onClick={() => {
                  if (vistaLocal === 'salon') {
                    setVistaLocal('llevar');
                    setModoUnir(false);
                  } else {
                    setVistaLocal('salon');
                  }
                }}
                className="w-11 h-11 rounded-xl flex items-center justify-center border border-[#333] bg-[#1a1a1a] text-neutral-400 hover:text-white transition-all relative shadow-[0_0_10px_rgba(0,0,0,0.5)] shrink-0"
                title={vistaLocal === 'salon' ? "Ir a Para Llevar" : "Ir al Salón Principal"}
              >
                {vistaLocal === 'salon' ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                    </svg>
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#ff5a1f] text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-[#121212]">
                      {ordenesLlevar.length}
                    </span>
                  </>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path>
                  </svg>
                )}
              </button>

              {/* 3. BOTÓN VENTA RÁPIDA */}
              <button 
                onClick={() => setDrawerVentaRapidaAbierto(true)}
                className="w-11 h-11 rounded-xl flex items-center justify-center border border-[#ff5a1f]/30 bg-[#ff5a1f]/10 text-[#ff5a1f] hover:bg-[#ff5a1f] hover:text-white transition-all active:scale-95 shrink-0"
                title="Venta Rápida"
              >
                <span className="text-lg">⚡</span>
              </button>

              {/* 4. BOTÓN CERRAR CAJA (⚠️ SOLO CAJEROS EN LA PRIMERA FILA) */}
              {rolUsuario?.toLowerCase() === 'cajero' && (
                <button 
                  onClick={async () => {
                    const pinIngresado = window.prompt("Ingrese PIN de Cajero para cerrar caja:");
                    if (!pinIngresado) return;
                    try {
                      const respuesta = await validarPinEmpleado({ pin: pinIngresado, accion: 'entrar' });
                      if (respuesta.data.rol === 'Cajero' || respuesta.data.rol === 'Administrador' || respuesta.data.rol === 'Admin') {
                        setModalCierreAbierto(true);
                      } else {
                        alert("🚫 No tienes permiso para cerrar la caja.");
                      }
                    } catch (error) { alert("❌ PIN incorrecto."); }
                  }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-[0_0_10px_rgba(239,68,68,0.1)] shrink-0"
                  title="Cerrar Turno"
                >
                  <span className="text-lg">🔒</span>
                </button>
              )}
            </div>

            {/* === FILA 2: ADMINISTRATIVA (⚠️ SOLO ADMINS) === */}
            {(rolUsuario?.toLowerCase() === 'administrador' || rolUsuario?.toLowerCase() === 'admin') && (
              <div className="flex items-center gap-2">
                
                {/* 5. BOTÓN ERP */}
                <button 
                  onClick={onIrAErp}
                  className="w-11 h-11 rounded-xl flex items-center justify-center border border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all active:scale-95 shadow-[0_0_10px_rgba(59,130,246,0.1)] shrink-0"
                  title="Panel de Control (ERP)"
                >
                  <span className="text-lg">⚙️</span>
                </button>

                {/* 6. BOTÓN CERRAR CAJA (El Admin lo ve aquí abajo) */}
                <button 
                  onClick={async () => {
                    const pinIngresado = window.prompt("Ingrese PIN de Administrador para cerrar caja:");
                    if (!pinIngresado) return;
                    try {
                      const respuesta = await validarPinEmpleado({ pin: pinIngresado, accion: 'entrar' });
                      if (respuesta.data.rol === 'Administrador' || respuesta.data.rol === 'Admin') {
                        setModalCierreAbierto(true);
                      } else {
                        alert("🚫 Tu rol actual no tiene permiso de administrador.");
                      }
                    } catch (error) { alert("❌ PIN incorrecto."); }
                  }}
                  className="w-11 h-11 rounded-xl flex items-center justify-center border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 shadow-[0_0_10px_rgba(239,68,68,0.1)] shrink-0"
                  title="Cerrar Turno"
                >
                  <span className="text-lg">🔒</span>
                </button>

              </div>
            )}

          </div>
        </div>
      </header>

      {/* ================= CONTENIDO: SALÓN ================= */}
      {vistaLocal === 'salon' && (
        <div className="p-5 flex-1">
          {/* ... (Código de cuadrícula de mesas idéntico) ... */}
          {modoUnir && (
            <div className="bg-[#ff5a1f]/10 border border-[#ff5a1f]/30 text-[#ff5a1f] p-4 rounded-2xl mb-6 text-sm flex items-center gap-3 animate-pulse">
              <span className="text-xl">🔗</span>
              <span className="font-semibold">
                {mesaPrincipal ? `Selecciona la mesa que se va a unir a la Mesa ${mesaPrincipal}...` : 'Paso 1: Selecciona la Mesa Principal (la que recibirá la cuenta)...'}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mesasAgrupadas.map((mesa) => {
              const esOcupada = mesa.estado === 'ocupada';
              let cardStyle = "bg-[#161616] border-[#2a2a2a]"; 
              let badgeStyle = "bg-[#222222] text-neutral-400";
              let titleStyle = "text-white";

              if (esOcupada) {
                cardStyle = "bg-[#1a1311] border-[#ff5a1f]/40 shadow-[0_4px_20px_rgba(255,90,31,0.05)]";
                badgeStyle = "bg-[#3a1a10] text-[#ff5a1f]";
              }
              if (modoUnir && mesaPrincipal === mesa.id) {
                cardStyle = "bg-[#ff5a1f] border-[#ff5a1f] shadow-[0_10px_30px_rgba(255,90,31,0.4)] scale-105 z-10";
                badgeStyle = "bg-white/20 text-white";
              }

              return (
                <button key={mesa.id} onClick={() => manejarClickMesa(mesa)} className={`border-[1.5px] rounded-3xl p-4 flex flex-col transition-all active:scale-95 text-left h-44 relative ${cardStyle} ${mesa.esGigante ? 'col-span-2' : ''}`}>
                  
                  {/* --- CABECERA DE LA TARJETA (AQUÍ ENTRA EL BOTÓN) --- */}
                  <div className="flex justify-between items-start w-full mb-2">
                    <div className="flex gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest ${badgeStyle}`}>
                        {mesa.esGigante ? 'GRUPO' : mesa.estado}
                      </span>
                      
                      {/* BOTÓN DE SEPARAR */}
                      {mesa.esGigante && !modoUnir && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            separarMesas(mesa.id);
                          }}
                          className="text-[10px] font-black px-2 py-1.5 rounded-lg bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors z-20"
                        >
                          SEPARAR ✂️
                        </button>
                      )}
                    </div>

                    {esOcupada && !modoUnir && <span className="text-[#ff5a1f] opacity-50 text-sm">🍴</span>}
                  </div>
                  
                  {/* --- RESTO DE LA TARJETA (IGUAL) --- */}
                  <div className="flex-1 flex items-center justify-center w-full">
                    <h3 className={`font-black tracking-tight ${mesa.esGigante ? 'text-4xl' : 'text-3xl'} ${titleStyle}`}>
                      {mesa.esGigante ? mesa.mesasInvolucradas.join(' + ') : `Mesa ${mesa.numero}`}
                    </h3>
                  </div>
                  <div className={`w-full flex justify-center items-center gap-1.5 mt-2 ${modoUnir && mesaPrincipal === mesa.id ? 'text-white/80' : 'text-neutral-500'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                    </svg>
                    <span className="text-[11px] font-semibold">{mesa.capacidadTotal || mesa.capacidad} personas</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= CONTENIDO: PARA LLEVAR ================= */}
      {vistaLocal === 'llevar' && (
        <div className="p-5 flex-1 flex flex-col animate-fadeIn">
          
          {/* BOTÓN PARA ABRIR EL MODAL DE NUEVA ORDEN */}
          <button 
            onClick={() => setModalClienteAbierto(true)} 
            className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white font-bold py-5 rounded-3xl shadow-[0_4px_20px_rgba(255,90,31,0.3)] mb-8 flex justify-center items-center gap-3 text-lg transition-all active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"></path>
            </svg>
            Nueva Orden Para Llevar
          </button>

          <h2 className="text-neutral-500 font-bold mb-4 uppercase text-xs tracking-widest">Órdenes Activas</h2>
          
          <div className="space-y-4">
            {ordenesLlevar.length === 0 && (
              <div className="text-center py-10 border border-dashed border-[#333] rounded-3xl">
                <p className="text-neutral-500 font-bold">No hay órdenes activas para llevar 🛵</p>
              </div>
            )}

            {ordenesLlevar.map(orden => {
              const estaListo = orden.estado === 'listo';
              const estaPagado = orden.pago_confirmado; // Usamos el nuevo campo de Django
              
              return (
                <div key={orden.id} className="bg-[#1a1a1a] border border-[#2a2a2a] p-5 rounded-3xl flex justify-between items-center relative overflow-hidden transition-all hover:bg-[#222]">
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${estaPagado ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-lg">Orden #{orden.id}</h3>
                      {/* Badge de Pago */}
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${estaPagado ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                        {estaPagado ? 'PAGADO' : 'FALTA PAGAR'}
                      </span>
                      {/* Badge de Cocina */}
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${estaListo ? 'bg-green-500/20 text-green-400' : 'bg-[#ff5a1f]/20 text-[#ff5a1f]'}`}>
                        {estaListo ? 'LISTO' : 'EN COCINA'}
                      </span>
                    </div>
                    <p className="text-neutral-400 text-sm">👤 {orden.cliente_nombre}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* BOTÓN 1: CANCELAR (Siempre visible mientras no esté pagado/cerrado) */}
                    {!estaPagado && (
                      <button 
                        onClick={() => manejarCancelacion(orden.id)}
                        className="p-3 rounded-2xl bg-neutral-800 text-neutral-500 hover:bg-red-900/20 hover:text-red-500 transition-colors"
                        title="Cancelar Pedido"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      </button>
                    )}

                    {/* BOTÓN 2: COBRAR (Si no está pagado) */}
                    {!estaPagado ? (
                      <button 
                        onClick={() => setOrdenACobrar(orden)} // <--- ¡AQUÍ ESTÁ EL CAMBIO!
                        className="bg-[#ff5a1f] hover:bg-[#e04a15] text-white px-4 py-2 rounded-2xl font-bold text-sm"
                      >
                        COBRAR
                      </button>
                    ) : (
                      /* BOTÓN 3: ENTREGAR (Si ya está pagado Y listo) */
                      estaListo && (
                        <button 
                          onClick={() => entregarOrdenLlevar(orden.id)}
                          className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-2xl shadow-lg transition-transform active:scale-90"
                          title="Marcar como entregado"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                          </svg>
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

      {/* ================= MODAL: DATOS DEL CLIENTE (DELIVERY) ================= */}
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
        isOpen={!!ordenACobrar} // Se abre si ordenACobrar tiene algo
        onClose={() => setOrdenACobrar(null)} 
        total={ordenACobrar ? parseFloat(ordenACobrar.total) : 0} 
        // Convertimos los detalles de la orden al formato que espera tu carrito del modal
        carrito={ordenACobrar ? ordenACobrar.detalles.map(d => ({
          id: d.producto, 
          nombre: d.nombre, 
          precio: parseFloat(d.precio_unitario)
        })) : []} 
        onCobroExitoso={async (pagosRegistrados) => {
          try {
            let idDeLaOrden = ordenACobrar.id;

            if (idDeLaOrden === 'venta_rapida') {
              const resNuevaOrden = await crearOrden({
                tipo: 'llevar',
                estado: 'listo',
                pago_confirmado: true,
                sede: ordenACobrar.sede || 1, // 👈 Le decimos en qué sede es (Sede 1 por defecto)
                detalles: ordenACobrar.detalles || [] // 👈 Le pasamos los productos que seleccionó el cajero
              });
              // Ahora idDeLaOrden ya no es "venta_rapida", es un número de verdad (ej: 28)
              idDeLaOrden = resNuevaOrden.data.id; 
            } else {
              // 2. Si no era venta rápida, simplemente actualizamos la orden que ya existía
              await actualizarOrden(idDeLaOrden, { 
                pago_confirmado: true,
                estado: ordenACobrar.estado === 'listo' ? 'listo' : 'preparando'
              });
            }

            // 3. Guardamos los pagos usando el ID real numérico
            for (const pago of pagosRegistrados) {
              await crearPago({
                orden: idDeLaOrden,
                monto: pago.monto,
                metodo: pago.metodo // 🔙 Regresamos a tu nombre original
              });
            }
            
            setOrdenACobrar(null); // Cerramos el modal
            setTriggerRecarga(prev => !prev); // Refrescamos
            alert("¡Cobro realizado con éxito! 💵✨");
            
          } catch (error) {
            console.error("Error al procesar el cobro:", error);
            console.error("DETALLE EXACTO DE DJANGO:", error.response?.data); 
            alert("Hubo un error al guardar el pago. Revisa la consola.");
          }
        }}
      />
      <DrawerVentaRapida 
        isOpen={drawerVentaRapidaAbierto}
        onClose={() => setDrawerVentaRapidaAbierto(false)}
        onProcederPago={(carrito, total) => {
          // Cuando le dan a "Cobrar" en el cajón, guardamos el carrito y abrimos TU modal de cobro
          setCarritoVentaRapida(carrito);
          setTotalVentaRapida(total);
          // Usamos el mismo modal de cobro que ya tienes, engañándolo para que cobre esta venta libre
          setOrdenACobrar({ id: 'venta_rapida', total: total, detalles: carrito.map(c => ({ producto: c.id, nombre: c.nombre, precio_unitario: c.precio })) });
          setDrawerVentaRapidaAbierto(false); // Cerramos el cajón y abrimos el modal
        }}
      />
      <ModalCierreCaja 
        isOpen={modalCierreAbierto}
        onClose={() => setModalCierreAbierto(false)}
        onCierreExitoso={(resumen) => {
          setModalCierreAbierto(false);
          
          // ✨ AHORA SÍ USAMOS EL RESUMEN
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
          window.location.reload(); // Mandamos al login
        }}
      />
    </div>
  );
}

export default MesasView;