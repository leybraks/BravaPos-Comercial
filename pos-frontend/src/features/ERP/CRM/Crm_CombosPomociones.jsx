import React, { useState,useEffect } from 'react';
import { Truck, Clock, Layers, Plus, Trash2, CalendarDays } from 'lucide-react';
import api from '../../../api/api'; // Asegúrate de tener tu instancia de Axios configurada
export default function Crm_CombosPromociones({ config, productosReales = [] ,categoriasReales = []}) {
  const isDark = config.temaFondo === 'dark';
  const colorPrimario = config.colorPrimario || '#ff5a1f';

  // Navegación interna del módulo de promociones
  const [modoActivo, setModoActivo] = useState('reglas'); // 'reglas', 'horarios', 'combos'

  // ==========================================
  // ESTADOS TEMPORALES PARA LOS FORMULARIOS
  // ==========================================
  
  // 🚚 1. ESTADOS PARA REGLAS DE NEGOCIO (Reemplaza a reglaDelivery)
  const [reglasLista, setReglasLista] = useState([]);
  const [creandoRegla, setCreandoRegla] = useState(false);
  const [formRegla, setFormRegla] = useState({
    tipo: 'recargo_llevar',
    valor: '',
    es_porcentaje: false,
    monto_minimo_orden: '',
    dia_semana: '', // 0 a 6
    activa: true
  });
  const diasNombres = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  // ⏰ 2. ESTADOS PARA HAPPY HOURS (Tus estados intactos)
  const [horariosLista, setHorariosLista] = useState([]); // 👈 Aquí vivirán las ofertas creadas
  const [creandoHorario, setCreandoHorario] = useState(false);
  const [horarioForm, setHorarioForm] = useState({ 
    tipoPromo: '2x1_producto', 
    productoId: '', 
    categoriaId: '',
    precioEspecial: '',
    dias: [], 
    horaInicio: '', 
    horaFin: '',
    activa: true
  });
  const diasSemana = [{ id: 0, l: 'Lun' }, { id: 1, l: 'Mar' }, { id: 2, l: 'Mié' }, { id: 3, l: 'Jue' }, { id: 4, l: 'Vie' }, { id: 5, l: 'Sáb' }, { id: 6, l: 'Dom' }];

  const toggleDia = (id) => {
    setHorarioForm(prev => ({
      ...prev,
      dias: prev.dias.includes(id) ? prev.dias.filter(d => d !== id) : [...prev.dias, id]
    }));
  };

  // 🍔 3. ESTADOS PARA COMBOS (Tus estados intactos)
  const [combo, setCombo] = useState({ productoPadreId: '', items: [] });
  // ✨ FUNCIÓN MAESTRA PARA ENVIAR A DJANGO
  // ✨ FUNCIÓN MAESTRA PARA ENVIAR A DJANGO
  const manejarGuardarGlobal = async () => {
    // 1. Validaciones básicas
    if (modoActivo === 'combos' && combo.productoPadreId && combo.items.length === 0) {
      return alert("El combo necesita al menos un producto interno.");
    }

    // 2. Empaquetamos todo
    const payload = {
      reglasCreadas: reglasLista,
      configuracionHorario: horariosLista,
      configuracionCombo: combo
    };

    

    try {
      // Reemplaza "api.post" con tu instancia configurada de Axios
      const response = await api.post('/marketing/guardar-global/', payload);
      alert('✅ ' + response.data.mensaje);
      
      // Opcional: Limpiar los formularios después de guardar
      if (modoActivo === 'horarios') setHorarioForm({ productoId: '', dias: [], horaInicio: '', horaFin: '' });
      if (modoActivo === 'combos') setCombo({ productoPadreId: '', items: [] });
      
    } catch (error) {
      console.error("Error guardando marketing:", error);
      alert("Hubo un error al guardar. Revisa la consola.");
    }
  };
  // ✨ DESCARGAR LAS REGLAS AL CARGAR LA PÁGINA
  useEffect(() => {
    const cargarMarketing = async () => {
      try {
        // Asegúrate de usar la misma ruta que usaste en tu api.post
        const response = await api.get('/marketing/guardar-global/'); 
        
        if (response.data.reglas) {
          // Mapeamos para que los nulos de Django sean strings vacíos en React
          const reglasFormateadas = response.data.reglas.map(r => ({
            ...r,
            dia_semana: r.dia_semana !== null ? r.dia_semana : '',
            valor: r.valor || '',
            monto_minimo_orden: r.monto_minimo_orden || ''
          }));
          setReglasLista(reglasFormateadas);
        }
      } catch (error) {
        console.error("Error descargando reglas:", error);
      }
    };
    cargarMarketing();
  }, []); // El array vacío significa "ejecuta esto solo al abrir el componente"
  return (
    <div className="w-full animate-fadeIn">
      
      {/* 🧭 SELECTOR DE MODO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { id: 'reglas', icon: Truck, title: 'Reglas de Negocio', desc: 'Delivery gratis y recargos' },
          { id: 'horarios', icon: Clock, title: 'Happy Hours', desc: 'Ocultar/Mostrar por horas' },
          { id: 'combos', icon: Layers, title: 'Armador de Combos', desc: 'Agrupa productos' }
        ].map(modo => {
          const Icon = modo.icon;
          const isSelected = modoActivo === modo.id;
          return (
            <button 
              key={modo.id} onClick={() => setModoActivo(modo.id)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected 
                  ? `border-[${colorPrimario}] bg-[${colorPrimario}]/10 shadow-[0_0_15px_rgba(255,90,31,0.15)]` 
                  : isDark ? 'border-[#222] bg-[#111] hover:bg-[#1a1a1a]' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
              style={isSelected ? { borderColor: colorPrimario } : {}}
            >
              <div className="flex items-center gap-3 mb-1">
                <Icon size={20} color={isSelected ? colorPrimario : (isDark ? '#888' : '#666')} />
                <h4 className={`font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{modo.title}</h4>
              </div>
              <p className={`text-xs ml-8 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>{modo.desc}</p>
            </button>
          )
        })}
      </div>

      {/* ========================================== */}
      {/* 🚚 MODO 1: REGLAS DE NEGOCIO (Creador Dinámico) */}
      {/* ========================================== */}
      {modoActivo === 'reglas' && (
        <div className={`rounded-[2rem] p-6 md:p-8 border ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-dashed" style={{ borderColor: isDark ? '#333' : '#e5e7eb' }}>
            <div>
              <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Reglas de Negocio</h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Configura recargos, delivery gratis o descuentos por día.</p>
            </div>
            {!creandoRegla && (
              <button 
                onClick={() => setCreandoRegla(true)}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md active:scale-95 transition-transform flex items-center gap-2"
                style={{ backgroundColor: colorPrimario }}
              >
                <Plus size={16} strokeWidth={3} /> Nueva Regla
              </button>
            )}
          </div>

          {creandoRegla ? (
            <div className={`p-6 rounded-2xl border animate-fadeIn ${isDark ? 'bg-[#161616] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`font-black uppercase tracking-widest text-xs mb-5 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Crear Nueva Regla</h4>
              
              <div className="space-y-5">
                {/* 1. Tipo de Regla */}
                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">Tipo de Regla</label>
                  <select 
                    value={formRegla.tipo} 
                    onChange={(e) => setFormRegla({...formRegla, tipo: e.target.value, valor: '', monto_minimo_orden: '', dia_semana: ''})}
                    className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="recargo_llevar">📦 Recargo por empaque (Para Llevar)</option>
                    <option value="delivery_gratis">🛵 Delivery Gratis por Monto Mínimo</option>
                    <option value="descuento_dia">📅 Descuento por Día Específico</option>
                  </select>
                </div>

                {/* 2. Campos Dinámicos según el tipo */}
                <div className="flex flex-col sm:flex-row gap-4">
                  
                  {/* Mostrar Valor si NO es delivery gratis */}
                  {formRegla.tipo !== 'delivery_gratis' && (
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2 flex justify-between">
                        <span>Valor a {formRegla.tipo === 'recargo_llevar' ? 'Cobrar' : 'Descontar'}</span>
                        {formRegla.tipo === 'descuento_dia' && (
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input type="checkbox" checked={formRegla.es_porcentaje} onChange={(e) => setFormRegla({...formRegla, es_porcentaje: e.target.checked})} className="accent-pink-500" />
                            <span className="text-[9px]">¿Es Porcentaje?</span>
                          </label>
                        )}
                      </label>
                      <input 
                        type="number" 
                        placeholder={formRegla.es_porcentaje ? 'Ej: 15%' : 'Ej: 2.00'} 
                        value={formRegla.valor} 
                        onChange={(e) => setFormRegla({...formRegla, valor: e.target.value})}
                        className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white focus:border-pink-500' : 'bg-white border-gray-300 text-gray-900 focus:border-pink-500'}`} 
                      />
                    </div>
                  )}

                  {/* Mostrar Monto Mínimo si ES delivery gratis */}
                  {formRegla.tipo === 'delivery_gratis' && (
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">Min. Compra (S/)</label>
                      <input 
                        type="number" placeholder="Ej: 60.00" value={formRegla.monto_minimo_orden} onChange={(e) => setFormRegla({...formRegla, monto_minimo_orden: e.target.value})}
                        className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white focus:border-green-500' : 'bg-white border-gray-300 text-gray-900 focus:border-green-500'}`} 
                      />
                    </div>
                  )}

                  {/* ✨ ACTUALIZADO: Mostrar Selector de Día para Descuentos Y Delivery */}
                  {(formRegla.tipo === 'descuento_dia' || formRegla.tipo === 'delivery_gratis') && (
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-2">
                        {formRegla.tipo === 'delivery_gratis' ? 'Día (Opcional)' : 'Día de la semana'}
                      </label>
                      <select 
                        value={formRegla.dia_semana} onChange={(e) => setFormRegla({...formRegla, dia_semana: e.target.value})}
                        className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="">{formRegla.tipo === 'delivery_gratis' ? 'Todos los días' : 'Selecciona un día...'}</option>
                        {diasNombres.map((dia, index) => (
                          <option key={index} value={index}>{dia}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Botonera Guardar/Cancelar */}
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setCreandoRegla(false)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-colors ${isDark ? 'bg-[#222] text-white hover:bg-[#333]' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      // Aquí harías el api.post() a Django
                      setReglasLista([...reglasLista, {...formRegla, id: Date.now()}]);
                      setCreandoRegla(false);
                      setFormRegla({ tipo: 'recargo_llevar', valor: '', es_porcentaje: false, monto_minimo_orden: '', dia_semana: '', activa: true });
                    }}
                    className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md active:scale-95 transition-transform"
                    style={{ backgroundColor: colorPrimario }}
                  >
                    Guardar Regla
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* LISTA DE REGLAS ACTIVAS */
            <div className="space-y-3">
              {reglasLista.length === 0 ? (
                <div className={`text-center py-10 border-2 border-dashed rounded-2xl ${isDark ? 'border-[#333] text-neutral-500' : 'border-gray-200 text-gray-400'}`}>
                  <Truck size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-bold">No hay reglas configuradas.</p>
                  <p className="text-xs mt-1">Crea tu primera regla para automatizar cobros y descuentos.</p>
                </div>
              ) : (
                reglasLista.map((regla) => (
                  <div key={regla.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors ${isDark ? 'bg-[#161616] border-[#333] hover:border-[#444]' : 'bg-white border-gray-200 shadow-sm hover:border-gray-300'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-[#222] text-white' : 'bg-gray-100 text-gray-700'}`}>
                        {regla.tipo === 'recargo_llevar' ? '📦' : regla.tipo === 'delivery_gratis' ? '🛵' : '📅'}
                      </div>
                      <div>
                        <h5 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {regla.tipo === 'recargo_llevar' ? 'Recargo por Llevar' : regla.tipo === 'delivery_gratis' ? 'Delivery Gratis' : 'Descuento por Día'}
                        </h5>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                          {regla.tipo === 'recargo_llevar' && `Cobra S/ ${regla.valor} adicionales al pedido.`}
                          {regla.tipo === 'delivery_gratis' && `Aplica en compras mayores a S/ ${regla.monto_minimo_orden} ${regla.dia_semana !== '' ? `solo los ${diasNombres[regla.dia_semana]}` : 'todos los días'}.`}
                          {regla.tipo === 'descuento_dia' && `Descuenta ${regla.es_porcentaje ? `${regla.valor}%` : `S/ ${regla.valor}`} los ${diasNombres[regla.dia_semana]}.`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-0 flex items-center justify-end gap-3">
                       <button 
                        onClick={() => setReglasLista(reglasLista.map(r => r.id === regla.id ? {...r, activa: !r.activa} : r))}
                        className={`w-10 h-5 rounded-full transition-colors relative flex items-center shrink-0 ${regla.activa ? 'bg-green-500' : 'bg-neutral-500'}`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white rounded-full absolute transition-transform ${regla.activa ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                      <button onClick={() => setReglasLista(reglasLista.filter(r => r.id !== regla.id))} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={16} strokeWidth={2.5}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* ⏰ MODO 2: HAPPY HOURS (Gestor Completo) */}
      {/* ========================================== */}
      {modoActivo === 'horarios' && (
        <div className={`rounded-[2rem] p-6 md:p-8 border ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
          
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-dashed" style={{ borderColor: isDark ? '#333' : '#e5e7eb' }}>
            <div>
              <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Happy Hours & Ofertas</h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Programa 2x1, precios especiales o bloquea productos por horas.</p>
            </div>
            {!creandoHorario && (
              <button 
                onClick={() => setCreandoHorario(true)}
                className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md active:scale-95 transition-transform flex items-center gap-2 shrink-0"
                style={{ backgroundColor: colorPrimario }}
              >
                <Plus size={16} strokeWidth={3} /> Nueva Oferta
              </button>
            )}
          </div>

          {creandoHorario ? (
            /* FORMULARIO DE CREACIÓN DE HAPPY HOUR */
            <div className={`p-6 rounded-2xl border animate-fadeIn ${isDark ? 'bg-[#161616] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`font-black uppercase tracking-widest text-xs mb-5 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Configurar Nueva Oferta</h4>
              
              <div className="space-y-6">
                {/* TIPO DE PROMOCIÓN */}
                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3">Tipo de Oferta Flash</label>
                  <select 
                    value={horarioForm.tipoPromo} 
                    onChange={(e) => setHorarioForm({...horarioForm, tipoPromo: e.target.value, productoId: '', categoriaId: '', precioEspecial: ''})}
                    className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border focus:border-pink-500 transition-colors ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                  >
                    <option value="2x1_producto">🍻 2x1 en Producto Específico</option>
                    <option value="3x2_producto">🔥 3x2 en Producto Específico</option>
                    <option value="2x1_categoria">🍱 2x1 en toda una Categoría</option>
                    <option value="precio_especial">💰 Precio Especial Rebajado</option>
                    <option value="visibilidad">👁️ Solo Visibilidad (Aparece/Desaparece)</option>
                  </select>
                </div>

                {/* SELECTORES (Producto vs Categoría) */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {horarioForm.tipoPromo === '2x1_categoria' ? (
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3">Categoría a Promocionar</label>
                      <select 
                        value={horarioForm.categoriaId} onChange={(e) => setHorarioForm({...horarioForm, categoriaId: e.target.value})}
                        className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="">Selecciona la categoría...</option>
                        {categoriasReales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3">Producto a Promocionar</label>
                      <select 
                        value={horarioForm.productoId} onChange={(e) => setHorarioForm({...horarioForm, productoId: e.target.value})}
                        className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="">Selecciona un producto...</option>
                        {productosReales.map(p => <option key={p.id} value={p.id}>{p.nombre} (S/ {p.precio_base})</option>)}
                      </select>
                    </div>
                  )}

                  {horarioForm.tipoPromo === 'precio_especial' && (
                    <div className="w-full sm:w-1/3">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3">Nuevo Precio (S/)</label>
                      <input 
                        type="number" placeholder="Ej: 15.00" value={horarioForm.precioEspecial} onChange={(e) => setHorarioForm({...horarioForm, precioEspecial: e.target.value})}
                        className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white focus:border-pink-500' : 'bg-white border-gray-300 text-gray-900 focus:border-pink-500'}`} 
                      />
                    </div>
                  )}
                </div>

                {/* DÍAS Y HORAS */}
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3 flex items-center gap-2"><CalendarDays size={14}/> Días Permitidos</label>
                    <div className="flex flex-wrap gap-2">
                      {diasSemana.map(dia => {
                        const activo = horarioForm.dias.includes(dia.id);
                        return (
                          <button 
                            key={dia.id} onClick={() => toggleDia(dia.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              activo ? `bg-[${colorPrimario}] text-white border-[${colorPrimario}]` : isDark ? 'bg-[#1a1a1a] border-[#444] text-neutral-400' : 'bg-white border-gray-300 text-gray-500'
                            }`}
                            style={activo ? { backgroundColor: colorPrimario, borderColor: colorPrimario } : {}}
                          >
                            {dia.l}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex gap-4 lg:w-1/3 shrink-0">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3"><Clock size={12} className="inline mr-1"/> Inicio</label>
                      <input type="time" value={horarioForm.horaInicio} onChange={(e) => setHorarioForm({...horarioForm, horaInicio: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white text-center' : 'bg-white border-gray-300 text-gray-900 text-center'}`} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3"><Clock size={12} className="inline mr-1"/> Fin</label>
                      <input type="time" value={horarioForm.horaFin} onChange={(e) => setHorarioForm({...horarioForm, horaFin: e.target.value})} className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-bold border ${isDark ? 'bg-[#0a0a0a] border-[#444] text-white text-center' : 'bg-white border-gray-300 text-gray-900 text-center'}`} />
                    </div>
                  </div>
                </div>

                {/* BOTONERA GUARDAR / CANCELAR */}
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    onClick={() => setCreandoHorario(false)}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-colors ${isDark ? 'bg-[#222] text-white hover:bg-[#333]' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      if(!horarioForm.productoId && !horarioForm.categoriaId) return alert("Selecciona un producto o categoría.");
                      setHorariosLista([...horariosLista, {...horarioForm, id: Date.now()}]);
                      setCreandoHorario(false);
                      setHorarioForm({ tipoPromo: '2x1_producto', productoId: '', categoriaId: '', precioEspecial: '', dias: [], horaInicio: '', horaFin: '', activa: true });
                    }}
                    className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md active:scale-95 transition-transform"
                    style={{ backgroundColor: colorPrimario }}
                  >
                    Agregar Oferta
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================== */
            /* LISTA DE HAPPY HOURS ACTIVOS               */
            /* ========================================== */
            <div className="space-y-3">
              {horariosLista.length === 0 ? (
                <div className={`text-center py-10 border-2 border-dashed rounded-2xl ${isDark ? 'border-[#333] text-neutral-500' : 'border-gray-200 text-gray-400'}`}>
                  <Clock size={40} className="mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-bold">No hay Happy Hours activos.</p>
                  <p className="text-xs mt-1">Crea ofertas flash para impulsar ventas en horas de baja demanda.</p>
                </div>
              ) : (
                horariosLista.map((oferta) => {
                  const nombreItem = oferta.productoId 
                    ? productosReales.find(p => String(p.id) === String(oferta.productoId))?.nombre 
                    : categoriasReales.find(c => String(c.id) === String(oferta.categoriaId))?.nombre;

                  return (
                    <div key={oferta.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-colors ${isDark ? 'bg-[#161616] border-[#333] hover:border-[#444]' : 'bg-white border-gray-200 shadow-sm hover:border-gray-300'}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${isDark ? 'bg-[#222]' : 'bg-gray-100'}`}>
                          {oferta.tipoPromo.includes('2x1') ? '🍻' : oferta.tipoPromo.includes('3x2') ? '🔥' : oferta.tipoPromo === 'precio_especial' ? '💰' : '👁️'}
                        </div>
                        <div>
                          <h5 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {oferta.tipoPromo.includes('2x1') ? '2x1 en ' : oferta.tipoPromo.includes('3x2') ? '3x2 en ' : oferta.tipoPromo === 'precio_especial' ? 'Precio Especial: ' : 'Visibilidad: '}
                            {nombreItem}
                          </h5>
                          <p className={`text-xs mt-0.5 flex gap-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                            <span>{oferta.dias.length > 0 ? oferta.dias.map(d => diasSemana.find(x => x.id === d)?.l).join(', ') : 'Todos los días'}</span>
                            {(oferta.horaInicio || oferta.horaFin) && (
                              <span>• {oferta.horaInicio || 'Apertura'} a {oferta.horaFin || 'Cierre'}</span>
                            )}
                            {oferta.tipoPromo === 'precio_especial' && <span className="font-bold text-pink-500">• S/ {oferta.precioEspecial}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 sm:mt-0 flex items-center justify-end gap-3">
                         <button 
                          onClick={() => setHorariosLista(horariosLista.map(h => h.id === oferta.id ? {...h, activa: !h.activa} : h))}
                          className={`w-10 h-5 rounded-full transition-colors relative flex items-center shrink-0 ${oferta.activa ? 'bg-pink-500' : 'bg-neutral-500'}`}
                        >
                          <div className={`w-3.5 h-3.5 bg-white rounded-full absolute transition-transform ${oferta.activa ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        <button onClick={() => setHorariosLista(horariosLista.filter(h => h.id !== oferta.id))} className="text-red-500 hover:text-red-400 p-2"><Trash2 size={16} strokeWidth={2.5}/></button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* 🍔 MODO 3: COMBOS (ComponenteCombo) */}
      {/* ========================================== */}
      {modoActivo === 'combos' && (
        <div className={`rounded-[2rem] p-6 md:p-8 border ${isDark ? 'bg-[#111] border-[#2a2a2a]' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="mb-8">
            <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>Constructor de Combos</h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>Asigna componentes a un producto para descontar stock múltiple.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3">Producto Principal (El Combo)</label>
              <select 
                value={combo.productoPadreId} onChange={(e) => setCombo({...combo, productoPadreId: e.target.value})}
                className={`w-full px-4 py-3 rounded-xl outline-none text-sm border font-bold ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`}
              >
                <option value="">Selecciona el producto que venderás como combo...</option>
                {productosReales.map(p => <option key={p.id} value={p.id}>{p.nombre} (S/ {p.precio_base})</option>)}
              </select>
              <p className={`text-[10px] mt-2 ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>* Debes crear el producto primero en tu pestaña de Menú.</p>
            </div>

            {combo.productoPadreId && (
              <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#161616] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-3 flex items-center gap-2"><Plus size={14}/> Componentes Internos</label>
                
                <div className="flex gap-2 mb-4">
                  <select id="select-hijo" className={`flex-1 px-4 py-2.5 rounded-xl outline-none text-sm border font-bold ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
                    <option value="">Añadir producto interno...</option>
                    {productosReales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button 
                    onClick={() => {
                      const id = document.getElementById('select-hijo').value;
                      if(id) {
                        setCombo({...combo, items: [...combo.items, { productoId: id, cantidad: 1 }]});
                        document.getElementById('select-hijo').value = '';
                      }
                    }}
                    className="px-4 rounded-xl font-black text-white shadow-md active:scale-95 transition-transform"
                    style={{ backgroundColor: colorPrimario }}
                  >
                    AGREGAR
                  </button>
                </div>

                {combo.items.length > 0 ? (
                  <div className="space-y-2">
                    {combo.items.map((item, idx) => {
                      const prodInfo = productosReales.find(p => String(p.id) === String(item.productoId));
                      return (
                        <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-[#1a1a1a] border-[#2a2a2a]' : 'bg-white border-gray-100'}`}>
                          <span className={`text-sm font-bold ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>{prodInfo?.nombre}</span>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>Cant:</span>
                            <input 
                              type="number" min="1" value={item.cantidad} 
                              onChange={(e) => {
                                const newItems = [...combo.items];
                                newItems[idx].cantidad = parseInt(e.target.value) || 1;
                                setCombo({...combo, items: newItems});
                              }}
                              className={`w-16 px-2 py-1 text-center rounded-lg outline-none text-sm border font-bold ${isDark ? 'bg-[#0a0a0a] border-[#333] text-white' : 'bg-gray-100 border-gray-200 text-gray-900'}`} 
                            />
                            <button 
                              onClick={() => setCombo({...combo, items: combo.items.filter((_, i) => i !== idx)})}
                              className="text-red-500 hover:text-red-400 p-1"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className={`text-center py-6 border-2 border-dashed rounded-xl ${isDark ? 'border-[#333] text-neutral-500' : 'border-gray-200 text-gray-400'}`}>
                    <p className="text-sm font-bold">No hay componentes.</p>
                    <p className="text-xs mt-1">Añade los platos que conforman este combo.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTÓN GUARDAR MAESTRO */}
      <div className="mt-6 flex justify-end">
        <button 
          onClick={manejarGuardarGlobal} // 👈 ¡ESTE ES EL CABLE QUE FALTABA!
          className="px-8 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all text-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] active:scale-95"
          style={{ backgroundColor: colorPrimario }}
        >
          Guardar Configuración
        </button>
      </div>

    </div>
  );
}