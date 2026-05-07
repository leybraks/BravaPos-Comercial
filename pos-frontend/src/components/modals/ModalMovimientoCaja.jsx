import React, { useState, useEffect } from 'react';
import usePosStore from '../../store/usePosStore';

export default function ModalMovimientoCaja({ isOpen, onClose, onGuardar }) {
  const { configuracionGlobal } = usePosStore();
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';
  const tema = configuracionGlobal?.temaFondo || 'dark';

  const [tipo, setTipo] = useState('egreso');
  const [monto, setMonto] = useState('');
  const [concepto, setConcepto] = useState('');
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTipo('egreso');
      setMonto('');
      setConcepto('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) {
      alert("⚠️ Ingresa un monto válido.");
      return;
    }
    if (!concepto.trim()) {
      alert("⚠️ Debes justificar el movimiento.");
      return;
    }
    setProcesando(true);
    try {
      await onGuardar({
        tipo,
        monto: parseFloat(monto),
        concepto: concepto.trim()
      });
      onClose();
    } catch (error) {
      console.error("Error al registrar:", error);
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fadeIn">
      <div className={`w-full max-w-md rounded-[2.5rem] shadow-2xl border overflow-hidden flex flex-col transition-all duration-300 ${
        tema === 'dark' ? 'bg-[#0d0d0d] border-[#222]' : 'bg-white border-gray-200'
      }`}>
        
        {/* Cabecera Premium */}
        <div className={`p-8 border-b flex justify-between items-center ${
          tema === 'dark' ? 'border-[#222] bg-[#111]' : 'border-gray-100 bg-gray-50'
        }`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: `${colorPrimario}15`, color: colorPrimario }}>
              <i className="fi fi-rr-money-bill-wave text-2xl mt-1"></i>
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tighter leading-none ${
                tema === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Caja Chica</h2>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 ${
                tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'
              }`}>Movimiento de efectivo</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${
              tema === 'dark' 
                ? 'bg-[#1a1a1a] hover:bg-red-500/10 border-[#333] text-neutral-500 hover:text-red-500' 
                : 'bg-gray-100 hover:bg-red-50 border-gray-200 text-gray-400 hover:text-red-500'
            }`}
          >
            <i className="fi fi-rr-cross-small text-xl"></i>
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* Selector de Tipo Estilo Apple/ERP */}
          <div className={`flex p-1.5 rounded-2xl border ${
            tema === 'dark' ? 'bg-[#161616] border-[#222]' : 'bg-gray-100 border-gray-200'
          }`}>
            <button
              type="button"
              onClick={() => setTipo('egreso')}
              className={`flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                tipo === 'egreso' 
                  ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                  : (tema === 'dark' ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600')
              }`}
            >
              <i className="fi fi-rr-arrow-trend-down"></i> Gasto
            </button>
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                tipo === 'ingreso' 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : (tema === 'dark' ? 'text-neutral-500 hover:text-neutral-300' : 'text-gray-400 hover:text-gray-600')
              }`}
            >
              <i className="fi fi-rr-arrow-trend-up"></i> Ingreso
            </button>
          </div>

          <div className="space-y-6">
            {/* Input Monto */}
            <div>
              <label className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 block ${
                tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'
              }`}>Monto del movimiento</label>
              <div className="relative group">
                <span className={`absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black ${
                  tema === 'dark' ? 'text-neutral-600 group-focus-within:text-white' : 'text-gray-300 group-focus-within:text-gray-900'
                } transition-colors`}>S/</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="0.00"
                  className={`w-full rounded-3xl py-6 pl-14 pr-6 text-4xl font-black font-mono outline-none border-2 transition-all ${
                    tema === 'dark' 
                      ? 'bg-[#161616] border-[#222] text-white focus:bg-[#1a1a1a]' 
                      : 'bg-gray-50 border-gray-100 text-gray-900 focus:bg-white'
                  }`}
                  style={{ focusBorderColor: colorPrimario }}
                  onFocus={(e) => e.target.style.borderColor = colorPrimario}
                  onBlur={(e) => e.target.style.borderColor = tema === 'dark' ? '#222' : '#f3f4f6'}
                  autoFocus
                />
              </div>
            </div>

            {/* Input Concepto */}
            <div>
              <label className={`text-[10px] font-black uppercase tracking-[0.2em] mb-3 block ${
                tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'
              }`}>Motivo o Justificación</label>
              <div className="relative">
                <i className={`fi fi-rr-receipt absolute left-5 top-1/2 -translate-y-1/2 ${tema === 'dark' ? 'text-neutral-600' : 'text-gray-300'}`}></i>
                <input 
                  type="text" 
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                  placeholder={tipo === 'egreso' ? "Ej. Compra de insumos" : "Ej. Ingreso de sencillo"}
                  className={`w-full rounded-2xl py-4 pl-12 pr-5 font-bold text-sm outline-none border-2 transition-all ${
                    tema === 'dark' 
                      ? 'bg-[#161616] border-[#222] text-white focus:bg-[#1a1a1a]' 
                      : 'bg-gray-50 border-gray-100 text-gray-900 focus:bg-white'
                  }`}
                  onFocus={(e) => e.target.style.borderColor = colorPrimario}
                  onBlur={(e) => e.target.style.borderColor = tema === 'dark' ? '#222' : '#f3f4f6'}
                />
              </div>
            </div>
          </div>

          {/* Botón Acción Final */}
          <button 
            type="submit" 
            disabled={procesando}
            className={`w-full py-5 rounded-[1.5rem] font-black text-sm tracking-[0.2em] uppercase transition-all flex justify-center items-center gap-3 text-white shadow-xl
              ${tipo === 'egreso' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}
              ${procesando ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'}`}
          >
            {procesando ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <i className={`fi ${tipo === 'egreso' ? 'fi-rr-log-out' : 'fi-rr-log-in'} mt-1`}></i>
                Registrar {tipo === 'egreso' ? 'Salida' : 'Entrada'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}