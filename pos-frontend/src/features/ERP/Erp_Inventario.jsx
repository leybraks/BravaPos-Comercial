import React, { useState, useEffect } from 'react';
import usePosStore from '../../store/usePosStore';
import { getInsumosSede, getCatalogoGlobal, getSedes, registrarIngresoMasivo } from '../../api/api';
import ModalIngresoMercaderia from '../../components/modals/ModalIngresoMercaderia';
import ModalNuevoInsumoBase from '../../components/modals/ModalNuevoInsumoBase';

export default function InventarioView() {
  const { configuracionGlobal } = usePosStore();
  const config = configuracionGlobal || { temaFondo: 'dark', colorPrimario: '#ff5a1f' };
  
  const [tab, setTab] = useState('locales'); // 'locales', 'catalogo'
  const [sedeActiva, setSedeActiva] = useState(null); 
  
  const [sedes, setSedes] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [insumosSede, setInsumosSede] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  const [modalCompraOpen, setModalCompraOpen] = useState(false);
  const [modalBaseOpen, setModalBaseOpen] = useState(false);

  useEffect(() => {
    fetchBase();
  }, []);

  const fetchBase = async () => {
    try {
      const [resSedes, resCatalogo] = await Promise.all([getSedes(), getCatalogoGlobal()]);
      setSedes(resSedes.data);
      setCatalogo(resCatalogo.data);
    } catch (err) {
      console.error("Error cargando base:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (sedeActiva) {
      setCargando(true);
      getInsumosSede({ sede_id: sedeActiva.id })
        .then(res => setInsumosSede(res.data))
        .catch(err => console.error(err))
        .finally(() => setCargando(false));
    }
  }, [sedeActiva]);

  const refrescarDatos = async () => {
    const resCatalogo = await getCatalogoGlobal();
    setCatalogo(resCatalogo.data);
    if (sedeActiva) {
      const resStock = await getInsumosSede({ sede_id: sedeActiva.id });
      setInsumosSede(resStock.data);
    }
  };
  const handleIngresarAMatriz = async (insumoId, cantidad) => {
    try {
      await registrarIngresoMasivo({
        insumo_base_id: insumoId,
        ingreso_global: cantidad, // Solo compramos, no repartimos
        distribucion: {} 
      });
      alert("📦 Stock añadido al Almacén Central.");
      refrescarDatos();
    } catch (error) {
      // Magia: Extraemos el mensaje exacto que Django nos mandó en el status 400
      const mensajeDjango = error.response?.data?.error || "Error de conexión";
      alert("Error: " + mensajeDjango);
    }
  };
  // 🔥 LÓGICA DE UNIÓN: Si estamos en una Sede, cruzamos el Catálogo Maestro con el Stock Local
  const inventarioParaMostrar = sedeActiva ? catalogo.map(itemBase => {
    // Buscamos si la sede ya tiene este insumo registrado
    const stockLocal = insumosSede.find(s => 
      s.insumo_base === itemBase.id || s.insumo_base?.id === itemBase.id
    );
    return {
      ...itemBase, // Esto trae el stock_general, nombre y unidad_medida
      stock_actual: stockLocal ? stockLocal.stock_actual : 0,
      stock_minimo: stockLocal ? stockLocal.stock_minimo : 5,
    };
  }) : catalogo; // Si estamos en "catalogo", simplemente mostramos la Matriz

  // Filtrado de búsqueda
  const itemsFiltrados = inventarioParaMostrar.filter(item => {
    const nombre = item.nombre || item.nombre_insumo || '';
    return nombre.toLowerCase().includes(busqueda.toLowerCase());
  });

  // 🔥 FUNCIÓN PARA BAJAR STOCK DE LA MATRIZ AL LOCAL (Directo desde la tarjeta)
  const handleTransferirDeMatriz = async (insumoId, cantidad) => {
    try {
      await registrarIngresoMasivo({
        insumo_base_id: insumoId,
        ingreso_global: 0, // No estamos comprando nuevo, solo transfiriendo
        distribucion: { [sedeActiva.id]: cantidad }
      });
      alert("✅ Stock transferido de la Matriz al Local con éxito.");
      refrescarDatos();
    } catch (error) {
      // Magia: Extraemos el mensaje exacto que Django nos mandó en el status 400
      const mensajeDjango = error.response?.data?.error || "Error de conexión";
      alert("Error: " + mensajeDjango);
    }
  };

  return (
    <div className="animate-fadeIn space-y-8 max-w-7xl mx-auto p-4 md:p-8 pb-24">
      
      {/* 🚀 HEADER PREMIUM (LA MATRIZ) */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 bg-gradient-to-br from-[#111] to-[#0a0a0a] p-8 rounded-[2rem] border border-[#222] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff5a1f] opacity-5 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="z-10">
          <h2 className="text-4xl font-black text-white tracking-tighter mb-1">
            Almacén <span style={{ color: config.colorPrimario }}>Central</span>
          </h2>
          <p className="text-neutral-400 font-medium mb-6">Visión global de tus locales y catálogo de ingredientes.</p>
          
          <div className="flex bg-[#1a1a1a] p-1.5 rounded-2xl border border-[#333] w-fit">
            <button 
              onClick={() => { setTab('locales'); setSedeActiva(null); setBusqueda(''); }}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'locales' ? 'bg-[#333] text-white shadow-md' : 'text-neutral-500 hover:text-white'}`}
            >
              🏢 Locales (Sedes)
            </button>
            <button 
              onClick={() => { setTab('catalogo'); setSedeActiva(null); setBusqueda(''); }}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'catalogo' ? 'bg-[#333] text-white shadow-md' : 'text-neutral-500 hover:text-white'}`}
            >
              📖 Catálogo Maestro
            </button>
          </div>
        </div>

        {/* BOTONES CONTEXTUALES (Cambian según la pestaña) */}
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto z-10">
          {tab === 'catalogo' && (
            <button 
              onClick={() => setModalBaseOpen(true)}
              className="flex-1 sm:flex-none border border-[#333] bg-[#161616] text-white px-6 py-4 rounded-2xl font-bold hover:bg-[#222] transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <span className="text-xl">+</span> Definir Insumo Base
            </button>
          )}
          
          {tab === 'locales' && (
            <button 
              onClick={() => setModalCompraOpen(true)}
              style={{ backgroundColor: config.colorPrimario }}
              className="flex-1 sm:flex-none text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              🚚 Distribución Masiva
            </button>
          )}
        </div>
      </div>

      {/* 🏙️ VISTA 1: LA CIUDAD (EDIFICIOS) */}
      {tab === 'locales' && !sedeActiva && (
        <div className="animate-fadeIn">
          <h3 className="text-xl font-black text-white mb-6 tracking-tight">Selecciona un Local para auditar:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sedes.map(sede => (
              <div 
                key={sede.id} 
                onClick={() => setSedeActiva(sede)}
                className="cursor-pointer bg-[#161616] border border-[#2a2a2a] p-8 rounded-[2rem] hover:border-[#ff5a1f] hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden"
              >
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-5 group-hover:opacity-10 transition-opacity">🏢</div>
                <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center text-3xl mb-6 shadow-inner">🏢</div>
                <h3 className="text-3xl font-black text-white group-hover:text-[#ff5a1f] transition-colors">{sede.nombre}</h3>
                <p className="text-neutral-500 font-medium mt-2">Auditar y asignar inventario →</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚪 VISTA 2: DENTRO DE UN EDIFICIO O EN EL CATÁLOGO */}
      {(sedeActiva || tab === 'catalogo') && (
        <div className="animate-fadeIn space-y-6">
          
          {sedeActiva && (
            <div className="flex items-center gap-4 border-b border-[#222] pb-6">
              <button 
                onClick={() => { setSedeActiva(null); setBusqueda(''); }}
                className="w-12 h-12 rounded-full bg-[#161616] border border-[#333] flex items-center justify-center text-white hover:bg-[#ff5a1f] hover:border-[#ff5a1f] transition-all"
              >←</button>
              <div>
                <p className="text-xs font-black text-[#ff5a1f] uppercase tracking-widest">Inventario Local</p>
                <h3 className="text-2xl font-black text-white">Edificio: {sedeActiva.nombre}</h3>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-500">🔍</div>
            <input 
              type="text" 
              placeholder={`Buscar en ${tab === 'catalogo' ? 'la Matriz' : sedeActiva?.nombre}...`} 
              value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#111] border border-[#333] text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:border-[#ff5a1f] transition-colors font-medium shadow-inner"
            />
          </div>

          {cargando ? (
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-56 bg-[#111] rounded-[2rem] border border-[#222]" />)}
            </div>
          ) : itemsFiltrados.length === 0 ? (
            <div className="bg-[#111] border border-[#222] rounded-[2rem] p-16 text-center">
              <div className="text-6xl mb-4">🕵️‍♂️</div>
              <h3 className="text-xl font-black text-white mb-2">Sin resultados</h3>
              <p className="text-neutral-500">Define insumos base en el Catálogo Maestro para empezar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {itemsFiltrados.map((item) => (
                <InsumoCard 
                  key={item.id} 
                  item={item} 
                  isStock={!!sedeActiva} 
                  config={config} 
                  onTransferir={sedeActiva ? handleTransferirDeMatriz : handleIngresarAMatriz}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALES */}
      <ModalIngresoMercaderia isOpen={modalCompraOpen} onClose={() => setModalCompraOpen(false)} sedes={sedes} onSuccess={refrescarDatos} config={config}/>
      <ModalNuevoInsumoBase isOpen={modalBaseOpen} onClose={() => setModalBaseOpen(false)} onSuccess={refrescarDatos} config={config}/>
    </div>
  );
}

// 🃏 SUB-COMPONENTE: Tarjeta Inteligente (Cambia según dónde estés)
function InsumoCard({ item, isStock, config, onTransferir }) {
  const [cantidadTransferir, setCantidadTransferir] = useState('');
  
  const nombre = item.nombre || item.nombre_insumo;
  const unidad = item.unidad_medida;
  
  // Si estamos en la Matriz, mostramos stock_general. Si en Sede, stock_actual.
  const stockMostrar = isStock ? (parseFloat(item.stock_actual) || 0) : (parseFloat(item.stock_general) || 0);
  const stockMatrizDisp = parseFloat(item.stock_general) || 0;
  const min = parseFloat(item.stock_minimo) || 5;
  
  const porcentaje = isStock ? Math.min((stockMostrar / (min * 3)) * 100, 100) : 0;
  const esCritico = isStock && stockMostrar <= min;

  const handleBajarStock = () => {
    const cant = parseFloat(cantidadTransferir);
    if (!cant || cant <= 0) return alert("Ingresa una cantidad válida.");
    if (cant > stockMatrizDisp) return alert("No hay suficiente stock en la Matriz.");
    onTransferir(item.id, cant);
    setCantidadTransferir('');
  };

  return (
    <div className="bg-[#161616] border border-[#2a2a2a] p-6 rounded-[2rem] hover:border-[#444] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
      
      <div>
        <div className="flex justify-between items-start mb-4">
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isStock ? (esCritico ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500') : 'bg-[#ff5a1f]/10 text-[#ff5a1f]'}`}>
            {isStock ? (esCritico ? 'Alerta Stock' : 'Stock Local') : 'Stock en Matriz'}
          </span>
        </div>
        
        <h4 className="text-xl font-black text-white leading-tight truncate">{nombre}</h4>
        
        <div className="mt-4">
          <p className="text-4xl font-mono font-black text-white tracking-tighter">
            {stockMostrar}
            <span className="text-sm font-sans text-neutral-500 font-bold ml-1">{unidad}</span>
          </p>
        </div>
      </div>

      {isStock ? (
        // 🔥 VISTA DE SEDE: Muestra la barra de salud y el mini-formulario para bajar de la Matriz
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-neutral-500 uppercase">
              <span>Mín: {min}</span>
              <span>Nivel</span>
            </div>
            <div className="w-full h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden border border-[#222]">
              <div className={`h-full rounded-full transition-all duration-1000 ${esCritico ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'bg-green-500'}`} style={{ width: `${porcentaje}%` }}></div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2a2a2a]">
            <p className="text-[10px] text-neutral-500 font-bold uppercase mb-2">
              Disponible en Matriz: <strong className="text-white">{stockMatrizDisp}</strong> {unidad}
            </p>
            <div className="flex gap-2">
              <input 
                type="number" min="0" placeholder="0.0" value={cantidadTransferir} onChange={(e) => setCantidadTransferir(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#333] px-3 py-2 rounded-xl text-white font-mono text-sm outline-none focus:border-[#ff5a1f]"
              />
              <button 
                onClick={handleBajarStock}
                className="bg-[#222] hover:bg-[#ff5a1f] hover:text-white text-neutral-400 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Bajar 📥
              </button>
            </div>
          </div>
        </div>
      ) : (
        // 🔥 VISTA DE MATRIZ (Catálogo): Formulario para COMPRAR stock general
        <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
          <p className="text-[10px] text-neutral-500 font-bold uppercase mb-2">
            Añadir directo a Matriz:
          </p>
          <div className="flex gap-2">
            <input 
              type="number" min="0" placeholder="0.0" value={cantidadTransferir} onChange={(e) => setCantidadTransferir(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#333] px-3 py-2 rounded-xl text-white font-mono text-sm outline-none focus:border-[#ff5a1f]"
            />
            <button 
              onClick={() => {
                const cant = parseFloat(cantidadTransferir);
                if (cant > 0) {
                  onTransferir(item.id, cant); 
                  setCantidadTransferir('');
                }
              }}
              className="bg-[#222] hover:bg-green-600 hover:text-white text-neutral-400 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
            >
              Añadir 🛒
            </button>
          </div>
        </div>
      )}
    </div>
  );
}