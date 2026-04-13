import React, { useState, useEffect } from 'react';

export default function ModalMovimientoCaja({ isOpen, onClose, onGuardar }) {
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
      alert("⚠️ Debes justificar el movimiento (Ej. Compra de carbón).");
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#121212] w-full max-w-md rounded-3xl shadow-2xl border border-[#2a2a2a] overflow-hidden flex flex-col">
        
        {/* Cabecera */}
        <div className="p-6 border-b border-[#2a2a2a] flex justify-between items-center bg-[#0a0a0a]">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tighter">💸 Caja Chica</h2>
            <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mt-1">Registrar Movimiento</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-[#222] hover:bg-red-500/20 hover:text-red-500 rounded-full flex items-center justify-center text-neutral-400 font-bold transition-all border border-[#333]"
          >
            X
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Switch de Tipo */}
          <div className="flex bg-[#1a1a1a] p-1 rounded-2xl border border-[#333]">
            <button
              type="button"
              onClick={() => setTipo('egreso')}
              className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${tipo === 'egreso' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-neutral-500 hover:text-white'}`}
            >
              📉 Retiro (Gasto)
            </button>
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${tipo === 'ingreso' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-neutral-500 hover:text-white'}`}
            >
              📈 Ingreso
            </button>
          </div>

          {/* Input Monto */}
          <div>
            <label className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2 block">Monto (S/)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono text-neutral-500">S/</span>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#1a1a1a] border border-[#333] focus:border-[#ff5a1f] rounded-2xl py-4 pl-12 pr-4 text-3xl font-black font-mono text-white outline-none transition-colors"
                autoFocus
              />
            </div>
          </div>

          {/* Input Concepto */}
          <div>
            <label className="text-neutral-500 text-[10px] font-black uppercase tracking-widest mb-2 block">Motivo / Concepto</label>
            <input 
              type="text" 
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder={tipo === 'egreso' ? "Ej. Compra de 1L de aceite" : "Ej. Sencillo para dar vuelto"}
              className="w-full bg-[#1a1a1a] border border-[#333] focus:border-[#ff5a1f] rounded-xl py-3 px-4 text-white font-bold outline-none transition-colors"
            />
          </div>

          {/* Botón Acción */}
          <button 
            type="submit" 
            disabled={procesando}
            className={`w-full py-4 rounded-2xl font-black text-lg tracking-wider uppercase transition-all flex justify-center items-center gap-2 
              ${tipo === 'egreso' ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}
              ${procesando ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 shadow-lg'}`}
          >
            {procesando ? 'Guardando...' : `Registrar ${tipo === 'egreso' ? 'Gasto' : 'Ingreso'}`}
          </button>
        </form>
      </div>
    </div>
  );
}