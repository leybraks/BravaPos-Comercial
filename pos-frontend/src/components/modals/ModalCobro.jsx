import React, { useState, useEffect, useCallback } from 'react';
import usePosStore from '../../store/usePosStore';
import { useToast } from '../../context/ToastContext';
import api from '../../api/api';
import { 
  X, Banknote, Smartphone, CreditCard, CheckCircle2, 
  Users, Receipt, QrCode, MessageCircle, ArrowLeft, Loader2
} from 'lucide-react';

export default function ModalCobroMejorado({ isOpen, onClose, total, onCobroExitoso, carrito = [], esVentaRapida = false, ordenId = null }) {
  const toast = useToast();
  const { configuracionGlobal } = usePosStore();
  const config = configuracionGlobal || {};
  const tema = config.temaFondo || 'dark';
  const colorPrimario = config.colorPrimario || '#8b5cf6';
  const isDark = tema === 'dark';

  // Estados principales
  const [paso, setPaso] = useState('cobro');
  const [tab, setTab] = useState('completo');
  const [metodo, setMetodo] = useState('efectivo');
  const [montoIngresado, setMontoIngresado] = useState('');
  const [dividirEntre, setDividirEntre] = useState(2);
  const [itemsSeleccionados, setItemsSeleccionados] = useState({});
  const [pagosAcumulados, setPagosAcumulados] = useState([]);
  const [telefonoTicket, setTelefonoTicket] = useState('');
  
  // Estados específicos de Culqi
  const [generandoQR, setGenerandoQR] = useState(false);
  const [qrCulqi, setQrCulqi] = useState(null);
  const [validandoPago, setValidandoPago] = useState(false);

  // Preview de descuento por método de pago
  const [preview, setPreview] = useState(null); // { subtotal, descuento_total, recargo_total, total }
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaso('cobro');
      setTab('completo');
      setMetodo('efectivo');
      setMontoIngresado('');
      setDividirEntre(2);
      setItemsSeleccionados({});
      setPagosAcumulados([]);
      setTelefonoTicket('');
      setGenerandoQR(false);
      setQrCulqi(null);
      setValidandoPago(false);
      setPreview(null);
    }
  }, [isOpen]);

  // Consulta el preview de descuento cuando el método cambia (solo si hay ordenId)
  const fetchPreview = useCallback(async (metodoActual) => {
    if (!ordenId) return;
    setLoadingPreview(true);
    try {
      const res = await api.post(`/ordenes/${ordenId}/preview_cobro/`, { metodo: metodoActual });
      setPreview(res.data);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [ordenId]);

  useEffect(() => {
    if (isOpen && ordenId) fetchPreview(metodo);
  }, [metodo, isOpen, ordenId, fetchPreview]);

  if (!isOpen) return null;

  // Cálculos — si hay preview del backend, usar ese total (tiene descuentos aplicados)
  const totalEfectivo = preview ? preview.total : total;
  const totalPagado = pagosAcumulados.reduce((sum, p) => sum + p.monto, 0);
  const restante = totalEfectivo - totalPagado;
  
  const calcularMontoCobro = () => {
    if (tab === 'completo') return restante;
    if (tab === 'dividir') return restante / dividirEntre;
    if (tab === 'items') {
      return carrito.reduce((sum, item) => {
        const cant = itemsSeleccionados[item.id] || 0;
        const precio = parseFloat(item.precio_unitario || item.precio || 0);
        return sum + (cant * precio);
      }, 0);
    }
    return 0;
  };

  const montoCobro = calcularMontoCobro();
  const montoRecibido = parseFloat(montoIngresado) || 0;
  const vuelto = montoRecibido > montoCobro ? montoRecibido - montoCobro : 0;

  const toggleItem = (itemId, maxCant) => {
    setItemsSeleccionados(prev => {
      const current = prev[itemId] || 0;
      if (current === 0) return { ...prev, [itemId]: 1 };
      if (current < maxCant) return { ...prev, [itemId]: current + 1 };
      return { ...prev, [itemId]: 0 };
    });
  };

  // ============================================
  // 🔌 INTEGRACIÓN CULQI - PLACEHOLDER
  // ============================================
  // TODO: Reemplazar con la integración real de Culqi
  // Documentación: https://docs.culqi.com/es/documentacion/checkout/v4/qr/
  
  const generarQRCulqi = async (monto, tipoMetodo) => {
    setGenerandoQR(true);
    setQrCulqi(null);
    
    try {
      // 🚧 PLACEHOLDER - Llamada real al backend que crea el QR con Culqi
      // Ejemplo de estructura esperada:
      /*
      const response = await fetch('/api/culqi/generar-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: Math.round(monto * 100), // Culqi usa centavos
          metodo: tipoMetodo, // 'yape' | 'plin'
          descripcion: `Pago POS - S/ ${monto.toFixed(2)}`
        })
      });
      const data = await response.json();
      setQrCulqi({
        url: data.qr_url,
        orderId: data.order_id,
        expiraEn: data.expira_en
      });
      */
      
      // Simulación de delay (1.5s)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // QR de prueba (REEMPLAZAR con respuesta real de Culqi)
      setQrCulqi({
        url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=CULQI-${tipoMetodo.toUpperCase()}-${monto}-${Date.now()}`,
        orderId: `ord_${Date.now()}`,
        expiraEn: 5 * 60
      });
    } catch (error) {
      console.error('Error generando QR Culqi:', error);
      toast.error('Error al generar el QR. Intenta de nuevo.');
    } finally {
      setGenerandoQR(false);
    }
  };

  const validarPagoCulqi = async () => {
    setValidandoPago(true);
    
    try {
      // 🚧 PLACEHOLDER - Validación real con Culqi
      /*
      const response = await fetch(`/api/culqi/validar-pago/${qrCulqi.orderId}`);
      const data = await response.json();

      if (data.estado === 'pagado') {
        registrarPago(montoCobro, 0);
      } else {
        toast.warning('El pago aún no se ha procesado. Espera unos segundos.');
      }
      */
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      registrarPago(montoCobro, 0);
    } catch (error) {
      console.error('Error validando pago:', error);
      toast.error('Error al validar el pago. Intenta de nuevo.');
    } finally {
      setValidandoPago(false);
    }
  };
  // ============================================

  const procesarCobro = () => {
    if (metodo !== 'efectivo') {
      setPaso('qr');
      
      // Si usa Culqi y es Yape/Plin, generar QR dinámico
      if (config.usa_culqi && (metodo === 'yape' || metodo === 'plin')) {
        generarQRCulqi(montoCobro, metodo);
      }
      return;
    }

    if (!montoIngresado || montoRecibido <= 0) {
      toast.warning('Ingresa el monto recibido del cliente.');
      return;
    }

    if (montoRecibido < montoCobro) {
      // Es un pago parcial, cobramos exactamente lo que entregó sin vuelto
      registrarPago(montoRecibido, 0);
      return;
    }

    // Si da exacto o más, cubre el total restante y calculamos vuelto
    registrarPago(montoCobro, vuelto);
  };

  const registrarPago = (monto, vueltoCalculado = 0) => {
    setPagosAcumulados([...pagosAcumulados, { 
      metodo, 
      monto: monto,
      vuelto: vueltoCalculado 
    }]);

    const nuevoTotal = totalPagado + monto;
    
    if (nuevoTotal >= totalEfectivo - 0.01) {
      setPaso('exito');
    } else {
      // Pago parcial — mostrar feedback con toast
      const restanteNuevo = totalEfectivo - nuevoTotal;
      toast.success(`Pago de S/ ${monto.toFixed(2)} registrado. Falta: S/ ${restanteNuevo.toFixed(2)}`);

      setMontoIngresado('');
      setTab('completo');
      setItemsSeleccionados({});
      setQrCulqi(null);
      setPaso('cobro');
    }
  };

  const finalizarCobro = () => {
    onCobroExitoso({ pagos: pagosAcumulados, telefono: telefonoTicket });
  };

  // Métodos disponibles según configuración
  const metodosDisponibles = [
    { id: 'efectivo', nombre: 'Efectivo', icono: Banknote, disponible: true },
    { 
      id: 'yape', 
      nombre: 'Yape', 
      icono: Smartphone, 
      // Disponible solo si:
      // - usa_culqi = true Y tiene (QR estático O número) configurado, O
      // - usa_culqi = false Y tiene (QR estático O número) configurado
      disponible: !!(config.yape_numero || config.yape_qr), 
      color: '#6d28d9' 
    },
    { 
      id: 'plin', 
      nombre: 'Plin', 
      icono: Smartphone, 
      // Mismo criterio que Yape
      disponible: !!(config.plin_numero || config.plin_qr), 
      color: '#14b8a6' 
    },
    { id: 'tarjeta', nombre: 'Tarjeta', icono: CreditCard, disponible: true, color: '#3b82f6' }
  ].filter(m => m.disponible);

  // RENDER: Pantalla principal de cobro
  if (paso === 'cobro') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-0 md:p-4">
        <div className={`w-full max-w-lg md:rounded-3xl shadow-2xl border h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col ${
          isDark ? 'bg-[#0a0a0a] border-[#1a1a1a]' : 'bg-white border-gray-200'
        }`}>
          
          {/* Header */}
          <div className={`p-6 border-b flex-shrink-0 ${isDark ? 'border-[#1a1a1a]' : 'border-gray-100'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className={`text-2xl font-black mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Procesar Pago
                </h2>
                <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                  {restante < total ? 'Pago parcial' : 'Selecciona el método de pago'}
                </p>
              </div>
              <button 
                onClick={onClose}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-[#1a1a1a] text-neutral-400' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            <div className={`rounded-2xl p-6 text-center ${
              isDark ? 'bg-[#111]' : 'bg-gradient-to-br from-gray-50 to-gray-100'
            }`}>
              {totalPagado > 0 && (
                <div className={`mb-4 pb-4 border-b ${isDark ? 'border-[#1a1a1a]' : 'border-gray-200'}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                    Progreso del pago
                  </p>
                  <div className={`w-full h-2 rounded-full mb-2 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-200'}`}>
                    <div 
                      className="h-full rounded-full bg-green-500 transition-all duration-500"
                      style={{ width: `${(totalPagado / total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? 'text-green-400' : 'text-green-600'}>
                      ✓ Pagado: S/ {totalPagado.toFixed(2)}
                    </span>
                    <span className={isDark ? 'text-neutral-500' : 'text-gray-500'}>
                      de S/ {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              
              <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                isDark ? 'text-neutral-500' : 'text-gray-500'
              }`}>
                {restante < totalEfectivo ? 'Por cobrar' : 'Total'}
              </p>
              <p className={`text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {loadingPreview
                  ? <span className="text-2xl opacity-50">Calculando...</span>
                  : `S/ ${restante.toFixed(2)}`
                }
              </p>

              {/* Desglose de reglas de negocio */}
              {preview && (preview.descuento_total > 0 || preview.recargo_total > 0) && (
                <div className={`mt-4 pt-4 border-t text-left space-y-1 ${isDark ? 'border-[#1a1a1a]' : 'border-gray-200'}`}>
                  <div className="flex justify-between text-xs">
                    <span className={isDark ? 'text-neutral-500' : 'text-gray-500'}>Subtotal</span>
                    <span className={isDark ? 'text-neutral-300' : 'text-gray-700'}>S/ {preview.subtotal.toFixed(2)}</span>
                  </div>
                  {preview.descuento_total > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-green-400 font-bold">Descuento aplicado</span>
                      <span className="text-green-400 font-bold">− S/ {preview.descuento_total.toFixed(2)}</span>
                    </div>
                  )}
                  {preview.recargo_total > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-400 font-bold">Recargo</span>
                      <span className="text-orange-400 font-bold">+ S/ {preview.recargo_total.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Resumen de pagos previos */}
              {pagosAcumulados.length > 0 && (
                <div className={`mt-4 pt-4 border-t ${isDark ? 'border-[#1a1a1a]' : 'border-gray-200'}`}>
                  <p className={`text-xs font-bold mb-2 ${isDark ? 'text-neutral-500' : 'text-gray-600'}`}>
                    Pagos registrados:
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {pagosAcumulados.map((pago, idx) => (
                      <div 
                        key={idx}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          isDark ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-green-50 text-green-700 border border-green-200'
                        }`}
                      >
                        {pago.metodo.charAt(0).toUpperCase() + pago.metodo.slice(1)}: S/ {pago.monto.toFixed(2)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto p-6">
            
            {/* Métodos de pago en línea */}
            <div className="mb-4">
              <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                isDark ? 'text-neutral-500' : 'text-gray-500'
              }`}>
                Método de pago
              </p>
              <div className="flex gap-2">
                {metodosDisponibles.map(({ id, nombre, icono: Icon, color }) => (
                  <button
                    key={id}
                    onClick={() => setMetodo(id)}
                    className={`flex-1 p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                      metodo === id
                        ? isDark ? 'border-white/20 bg-[#1a1a1a]' : 'border-gray-300 bg-gray-50'
                        : `border-transparent ${isDark ? 'bg-[#111] hover:bg-[#151515]' : 'bg-gray-50 hover:bg-gray-100'}`
                    }`}
                    style={metodo === id && color ? { borderColor: color } : {}}
                  >
                    <Icon 
                      size={20} 
                      className={metodo === id ? '' : isDark ? 'text-neutral-500' : 'text-gray-400'}
                      style={metodo === id && color ? { color } : {}}
                    />
                    <p className={`font-bold text-xs ${
                      metodo === id 
                        ? isDark ? 'text-white' : 'text-gray-900'
                        : isDark ? 'text-neutral-500' : 'text-gray-600'
                    }`}>
                      {nombre}
                    </p>
                  </button>
                ))}
              </div>
              
              {/* Indicador de Culqi activo */}
              {(metodo === 'yape' || metodo === 'plin' || metodo === 'tarjeta') && config.usa_culqi && (
                <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                  isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'
                }`}>
                  <CheckCircle2 size={12} />
                  <span className="font-bold">Validación automática con Culqi</span>
                </div>
              )}
            </div>

            {/* Tabs de división - SOLO si NO es venta rápida */}
            {!esVentaRapida && (
              <div className={`flex gap-2 p-1 rounded-xl mb-4 ${
                isDark ? 'bg-[#111]' : 'bg-gray-100'
              }`}>
                {[
                  { id: 'completo', label: 'Todo', icon: Receipt },
                  { id: 'dividir', label: 'Dividir', icon: Users },
                  { id: 'items', label: 'Items', icon: Receipt }
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 py-2.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                      tab === id
                        ? `${isDark ? 'bg-[#1a1a1a] text-white' : 'bg-white text-gray-900 shadow-sm'}`
                        : `${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-600 hover:text-gray-900'}`
                    }`}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {!esVentaRapida && tab === 'dividir' && (
              <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
                <p className={`text-xs font-bold mb-3 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                  Dividir cuenta entre:
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDividirEntre(Math.max(2, dividirEntre - 1))}
                    className={`w-10 h-10 rounded-xl font-bold ${
                      isDark ? 'bg-[#1a1a1a] text-white hover:bg-[#222]' : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <p className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {dividirEntre}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                      personas
                    </p>
                  </div>
                  <button
                    onClick={() => setDividirEntre(dividirEntre + 1)}
                    className={`w-10 h-10 rounded-xl font-bold ${
                      isDark ? 'bg-[#1a1a1a] text-white hover:bg-[#222]' : 'bg-white text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    +
                  </button>
                </div>
                <div className={`mt-3 p-3 rounded-lg text-center ${
                  isDark ? 'bg-[#0a0a0a]' : 'bg-white'
                }`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                    Cada persona paga:
                  </p>
                  <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    S/ {(restante / dividirEntre).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

            {!esVentaRapida && tab === 'items' && (
              <div className="max-h-48 overflow-y-auto space-y-2 mb-4">
                {carrito.map(item => {
                  const nombre = item.producto?.nombre || item.producto_nombre || item.nombre || 'Item';
                  const precio = parseFloat(item.precio_unitario || item.precio || 0);
                  const cantMax = item.cantidad || 1;
                  const cantSel = itemsSeleccionados[item.id] || 0;
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        cantSel > 0
                          ? `${isDark ? 'border-white/20 bg-[#111]' : 'border-gray-300 bg-gray-50'}`
                          : `border-transparent ${isDark ? 'bg-[#111] hover:bg-[#151515]' : 'bg-gray-50 hover:bg-gray-100'}`
                      }`}
                      onClick={() => toggleItem(item.id, cantMax)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className={`font-bold text-sm mb-1 ${
                            isDark ? 'text-white' : 'text-gray-900'
                          }`}>
                            {nombre}
                          </p>
                          <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                            S/ {precio.toFixed(2)} × {cantSel || cantMax}
                          </p>
                        </div>
                        <div className={`font-black text-lg ${
                          cantSel > 0 
                            ? isDark ? 'text-white' : 'text-gray-900'
                            : isDark ? 'text-neutral-600' : 'text-gray-400'
                        }`}>
                          {cantSel}/{cantMax}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <p className={`text-sm font-bold ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                  A cobrar ahora:
                </p>
                <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  S/ {montoCobro.toFixed(2)}
                </p>
              </div>
            </div>

            {metodo === 'efectivo' && (
              <>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-neutral-500' : 'text-gray-600'
                }`}>
                  Monto recibido del cliente
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={montoIngresado}
                  onChange={(e) => setMontoIngresado(e.target.value)}
                  placeholder="0.00"
                  className={`w-full p-4 rounded-xl text-3xl font-black text-center mb-3 border-2 ${
                    isDark 
                      ? 'bg-[#111] border-[#1a1a1a] text-white focus:border-[#2a2a2a]' 
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-gray-300'
                  } focus:outline-none`}
                  autoFocus
                />
                
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Exacto', valor: montoCobro.toFixed(2) },
                    { label: '20', valor: '20' },
                    { label: '50', valor: '50' },
                    { label: '100', valor: '100' }
                  ].map(({ label, valor }) => (
                    <button
                      key={label}
                      onClick={() => setMontoIngresado(valor)}
                      className={`py-2.5 rounded-xl font-bold text-xs ${
                        isDark 
                          ? 'bg-[#111] hover:bg-[#1a1a1a] text-white border border-[#1a1a1a]' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200'
                      }`}
                    >
                      {label === 'Exacto' ? label : `S/ ${label}`}
                    </button>
                  ))}
                </div>

                {vuelto > 0 && (
                  <div className={`p-4 rounded-xl border-2 ${
                    isDark ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-bold mb-1 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                          💰 Vuelto a entregar
                        </p>
                        <p className={`text-sm ${isDark ? 'text-green-400/70' : 'text-green-600'}`}>
                          Cliente da S/ {montoRecibido.toFixed(2)}
                        </p>
                      </div>
                      <p className={`text-3xl font-black ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                        S/ {vuelto.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className={`p-4 md:p-6 border-t flex-shrink-0 ${isDark ? 'border-[#1a1a1a] bg-[#0a0a0a]' : 'border-gray-200 bg-white'}`}>
            <button
              onClick={procesarCobro}
              disabled={metodo === 'efectivo' && montoCobro > 0 && (!montoIngresado || montoRecibido <= 0)}
              className="w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: colorPrimario }}
            >
              {metodo === 'efectivo' 
                ? (montoRecibido > 0 && montoRecibido < montoCobro 
                    ? `Registrar Parcial S/ ${montoRecibido.toFixed(2)}` 
                    : `Confirmar Cobro S/ ${montoCobro.toFixed(2)}`)
                : `Continuar con ${metodo.charAt(0).toUpperCase() + metodo.slice(1)}`
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Pantalla QR/Confirmación digital
  if (paso === 'qr') {
    const usaCulqi = !!config.usa_culqi;
    const qrEstatico = config[`${metodo}_qr`];
    const numero = config[`${metodo}_numero`];

    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-md rounded-3xl shadow-2xl border ${
          isDark ? 'bg-[#0a0a0a] border-[#1a1a1a]' : 'bg-white border-gray-200'
        }`}>
          
          <div className={`p-6 border-b ${isDark ? 'border-[#1a1a1a]' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => {
                  setPaso('cobro');
                  setQrCulqi(null);
                }}
                className={`p-2 rounded-xl ${isDark ? 'hover:bg-[#1a1a1a] text-neutral-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {metodo === 'yape' ? 'Pago con Yape' :
                   metodo === 'plin' ? 'Pago con Plin' :
                   'Pago con Tarjeta'}
                </h2>
                {usaCulqi && (
                  <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    Procesado por Culqi
                  </p>
                )}
              </div>
              <button 
                onClick={onClose}
                className={`p-2 rounded-xl ${isDark ? 'hover:bg-[#1a1a1a] text-neutral-400' : 'hover:bg-gray-100 text-gray-500'}`}
              >
                <X size={20} />
              </button>
            </div>

            <div className={`rounded-2xl p-4 text-center ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
              <p className={`text-xs font-bold mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                Total a cobrar
              </p>
              <p className={`text-4xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                S/ {montoCobro.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="p-8">
            
            {/* ============================================ */}
            {/* CASO 1: YAPE/PLIN con Culqi Y tiene QR/número configurado (QR DINÁMICO) */}
            {/* ============================================ */}
            {(metodo === 'yape' || metodo === 'plin') && usaCulqi && (qrEstatico || numero) && (
              <div className="text-center">
                {generandoQR && (
                  <div className="py-8">
                    <Loader2 size={48} className={`mx-auto mb-4 animate-spin ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    <p className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Generando QR con Culqi...
                    </p>
                    <p className={`text-sm ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                      Esto solo tomará unos segundos
                    </p>
                  </div>
                )}

                {!generandoQR && qrCulqi && (
                  <>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4 ${
                      isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
                    }`}>
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs font-bold">QR ACTIVO</span>
                    </div>

                    <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                      QR generado por Culqi
                    </p>
                    
                    <div className="inline-block p-4 bg-white rounded-2xl shadow-lg mb-4">
                      <img 
                        src={qrCulqi.url} 
                        alt={`QR Culqi ${metodo}`}
                        className="w-56 h-56 rounded-xl"
                      />
                    </div>
                    
                    <div className={`p-3 rounded-xl mb-6 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                      <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                        ✓ El cliente escanea con su app de {metodo.charAt(0).toUpperCase() + metodo.slice(1)}<br/>
                        ✓ Validación automática del pago
                      </p>
                    </div>

                    <button
                      onClick={validarPagoCulqi}
                      disabled={validandoPago}
                      className="w-full py-4 rounded-xl font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      {validandoPago ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Verificando pago...
                        </>
                      ) : (
                        'Verificar Pago'
                      )}
                    </button>
                  </>
                )}

                {!generandoQR && !qrCulqi && (
                  <div className="py-8">
                    <p className={`text-sm mb-4 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                      No se pudo generar el QR
                    </p>
                    <button
                      onClick={() => generarQRCulqi(montoCobro, metodo)}
                      className={`px-6 py-3 rounded-xl font-bold ${
                        isDark ? 'bg-[#111] text-white' : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ============================================ */}
            {/* CASO 2: YAPE/PLIN sin Culqi Y tiene QR/número (QR ESTÁTICO) */}
            {/* ============================================ */}
            {(metodo === 'yape' || metodo === 'plin') && !usaCulqi && (qrEstatico || numero) && (
              <div className="text-center">
                {qrEstatico ? (
                  <>
                    <p className={`text-xs font-bold uppercase tracking-wider mb-4 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                      Muestra este QR al cliente
                    </p>
                    
                    <div className="inline-block p-4 bg-white rounded-2xl shadow-lg mb-4">
                      <img 
                        src={qrEstatico} 
                        alt={`QR ${metodo}`}
                        className="w-56 h-56 rounded-xl"
                      />
                    </div>
                  </>
                ) : null}
                
                {numero && (
                  <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-[#111]' : 'bg-gray-100'}`}>
                    <p className={`text-xs mb-1 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                      Número de {metodo.charAt(0).toUpperCase() + metodo.slice(1)}
                    </p>
                    <p className={`text-2xl font-black font-mono ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {numero}
                    </p>
                  </div>
                )}

                <div className={`p-3 rounded-xl mb-6 ${isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
                  <p className={`text-xs ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                    ⚠️ Verifica manualmente que el pago haya ingresado a tu cuenta antes de confirmar
                  </p>
                </div>

                <button
                  onClick={() => registrarPago(montoCobro, 0)}
                  className="w-full py-4 rounded-xl font-bold text-white transition-all"
                  style={{ backgroundColor: colorPrimario }}
                >
                  Confirmar Pago Recibido
                </button>
              </div>
            )}

            {/* ============================================ */}
            {/* CASO 3: TARJETA con Culqi                    */}
            {/* ============================================ */}
            {metodo === 'tarjeta' && usaCulqi && (
              <div className="text-center py-4">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <CreditCard size={40} />
                </div>
                <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Pasarela Culqi
                </h3>
                <p className={`text-sm mb-6 max-w-xs mx-auto ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                  Se abrirá la pasarela segura de Culqi para procesar el pago con tarjeta.
                </p>
                <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-blue-500/5 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                    ✓ Validación automática del pago<br/>
                    ✓ Soporta Visa, Mastercard, Amex, Diners
                  </p>
                </div>

                <button
                  onClick={() => {
                    // 🚧 PLACEHOLDER - Aquí va la integración real con Culqi Checkout
                    /*
                    Culqi.publicKey = config.culqi_public_key;
                    Culqi.settings({
                      title: 'Pago POS',
                      currency: 'PEN',
                      amount: Math.round(montoCobro * 100),
                      order: orderId
                    });
                    Culqi.open();
                    */
                    toast.info('Pasarela Culqi en integración. Confirmando pago manual.');
                    registrarPago(montoCobro, 0);
                  }}
                  className="w-full py-4 rounded-xl font-bold text-white transition-all"
                  style={{ backgroundColor: colorPrimario }}
                >
                  Abrir Pasarela Culqi
                </button>
              </div>
            )}

            {/* ============================================ */}
            {/* CASO 4: TARJETA sin Culqi (Terminal POS)     */}
            {/* ============================================ */}
            {metodo === 'tarjeta' && !usaCulqi && (
              <div className="text-center py-4">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-500/10 text-gray-500 flex items-center justify-center">
                  <CreditCard size={40} />
                </div>
                <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Terminal POS Físico
                </h3>
                <p className={`text-sm mb-6 max-w-xs mx-auto ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                  Procesa el cobro en tu terminal físico (Niubiz, Izipay, Mercado Pago, etc.) y luego confirma manualmente.
                </p>
                <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-orange-500/10 border border-orange-500/20' : 'bg-orange-50 border border-orange-200'}`}>
                  <p className={`text-xs ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                    ⚠️ Asegúrate que la transacción fue aprobada en tu terminal antes de confirmar
                  </p>
                </div>

                <button
                  onClick={() => registrarPago(montoCobro, 0)}
                  className="w-full py-4 rounded-xl font-bold text-white transition-all"
                  style={{ backgroundColor: colorPrimario }}
                >
                  Confirmar Pago Aprobado
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RENDER: Pantalla de éxito
  if (paso === 'exito') {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden ${
          isDark ? 'bg-[#0a0a0a] border-[#1a1a1a]' : 'bg-white border-gray-200'
        }`}>
          
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500 mb-6 shadow-lg shadow-green-500/50">
              <CheckCircle2 size={40} className="text-white" strokeWidth={3} />
            </div>

            <h2 className={`text-3xl font-black mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              ¡Pago Exitoso!
            </h2>
            <p className={`text-sm mb-8 ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
              El cobro se registró correctamente
            </p>

            <div className={`rounded-2xl p-6 mb-6 ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed" style={{ borderColor: isDark ? '#222' : '#e5e7eb' }}>
                <span className={`text-sm font-bold ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Total</span>
                <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  S/ {total.toFixed(2)}
                </span>
              </div>
              {pagosAcumulados.map((pago, idx) => (
                <div key={idx} className={`flex justify-between items-center text-sm py-1 ${
                  isDark ? 'text-neutral-400' : 'text-gray-600'
                }`}>
                  <span className="capitalize">{pago.metodo}</span>
                  <span className="font-bold">S/ {pago.monto.toFixed(2)}</span>
                </div>
              ))}
              {pagosAcumulados.some(p => p.vuelto > 0) && (
                <div className={`mt-3 pt-3 border-t border-dashed flex justify-between items-center ${
                  isDark ? 'border-neutral-800 text-green-400' : 'border-gray-300 text-green-600'
                }`}>
                  <span className="text-sm font-bold">Vuelto entregado</span>
                  <span className="text-lg font-black">
                    S/ {pagosAcumulados.reduce((sum, p) => sum + (p.vuelto || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className={`p-6 rounded-2xl mb-6 ${isDark ? 'bg-[#111]' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isDark ? 'bg-green-500/10 text-green-500' : 'bg-green-50 text-green-600'
                }`}>
                  <MessageCircle size={20} />
                </div>
                <div className="text-left flex-1">
                  <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Ticket Digital
                  </p>
                  <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
                    Enviar por WhatsApp (opcional)
                  </p>
                </div>
              </div>
              
              <div className={`flex items-center gap-2 p-3 rounded-xl border ${
                isDark ? 'bg-[#0a0a0a] border-[#1a1a1a]' : 'bg-white border-gray-200'
              }`}>
                <span className="text-lg">🇵🇪</span>
                <span className={`font-bold ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}>+51</span>
                <input
                  type="tel"
                  value={telefonoTicket}
                  onChange={(e) => setTelefonoTicket(e.target.value)}
                  placeholder="999 000 000"
                  className={`flex-1 bg-transparent font-bold focus:outline-none ${
                    isDark ? 'text-white placeholder:text-neutral-700' : 'text-gray-900 placeholder:text-gray-300'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={finalizarCobro}
                className="w-full py-4 rounded-xl font-bold text-white transition-all"
                style={{ backgroundColor: colorPrimario }}
              >
                {telefonoTicket ? 'Enviar Ticket y Finalizar' : 'Finalizar'}
              </button>
              <button
                onClick={finalizarCobro}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                  isDark ? 'bg-[#111] hover:bg-[#1a1a1a] text-neutral-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}