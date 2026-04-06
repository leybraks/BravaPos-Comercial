import React, { useState } from 'react';
import { cerrarCaja } from './api/api'; // Asegúrate de exportar esta función en tu api.js

export default function ModalCierreCaja({ isOpen, onClose, onCierreExitoso }) {
  const [efectivo, setEfectivo] = useState('');
  const [yape, setYape] = useState('');
  const [tarjeta, setTarjeta] = useState('');
  const [procesando, setProcesando] = useState(false);

  if (!isOpen) return null;

  const procesarCierre = async () => {
    setProcesando(true);
    try {
      // 1. Enviamos lo que el cajero CONTÓ físicamente
      const payload = {
        empleado_id: 1, // Esto vendrá de tu AuthContext/Store más adelante
        conteo_efectivo: parseFloat(efectivo || 0),
        conteo_yape: parseFloat(yape || 0),
        conteo_tarjeta: parseFloat(tarjeta || 0)
      };

      const response = await cerrarCaja(payload);
      
      // 2. El backend nos responderá con el resumen y las diferencias calculadas
      onCierreExitoso(response.data); 
      
    } catch (error) {
      console.error("Error en el cierre:", error);
      alert("No se pudo procesar el cierre. Verifica tu conexión.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#121212] border border-[#333] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        
        <div className="p-6 border-b border-[#222] bg-[#1a1a1a] flex justify-between items-center text-center">
          <h3 className="text-xl font-black text-white w-full">Cierre de Caja (Arqueo)</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Alerta de Cierre Ciego */}
          <div className="text-center bg-red-500/10 border border-red-500/20 p-4 rounded-2xl mb-4">
             <span className="text-2xl mb-2 block">🔒</span>
             <p className="text-red-400 font-bold text-sm">Cierre Ciego Activado</p>
             <p className="text-neutral-500 text-xs mt-1">
               Cuenta el dinero en tu gaveta e ingrésalo. Cualquier diferencia será reportada al administrador.[cite: 6]
             </p>
          </div>

          <div className="space-y-4">
            {/* Input Efectivo[cite: 6] */}
            <div>
              <label className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">💵 Total Efectivo (Billetes y Monedas)</label>
              <div className="flex items-center bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 focus-within:border-green-500 transition-colors">
                <span className="text-neutral-500 font-mono mr-2">S/</span>
                <input 
                  type="number" 
                  value={efectivo} 
                  onChange={(e) => setEfectivo(e.target.value)} 
                  className="bg-transparent w-full text-white text-xl font-bold focus:outline-none" 
                  placeholder="0.00" 
                />
              </div>
            </div>

            {/* Input Yape/Plin[cite: 6] */}
            <div>
              <label className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">📱 Total en Yape / Plin (Revisa tu celular)</label>
              <div className="flex items-center bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 focus-within:border-purple-500 transition-colors">
                <span className="text-neutral-500 font-mono mr-2">S/</span>
                <input 
                  type="number" 
                  value={yape} 
                  onChange={(e) => setYape(e.target.value)} 
                  className="bg-transparent w-full text-white text-xl font-bold focus:outline-none" 
                  placeholder="0.00" 
                />
              </div>
            </div>

            {/* Input Tarjeta[cite: 6] */}
            <div>
              <label className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-2 block">💳 Total en POS (Vouchers de Tarjeta)</label>
              <div className="flex items-center bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
                <span className="text-neutral-500 font-mono mr-2">S/</span>
                <input 
                  type="number" 
                  value={tarjeta} 
                  onChange={(e) => setTarjeta(e.target.value)} 
                  className="bg-transparent w-full text-white text-xl font-bold focus:outline-none" 
                  placeholder="0.00" 
                />
              </div>
            </div>
          </div>

          <button 
            onClick={procesarCierre} 
            disabled={procesando || !efectivo}
            className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white py-5 rounded-xl font-black tracking-widest shadow-[0_4px_20px_rgba(255,90,31,0.3)] active:scale-95 transition-all mt-4 disabled:opacity-50"
          >
            {procesando ? 'CALCULANDO CUADRE...' : 'ENVIAR CIERRE A GERENCIA'}
          </button>
          
          <button 
            onClick={onClose} 
            className="w-full text-neutral-500 text-sm font-bold py-2 hover:text-white transition-colors"
          >
            Cancelar y volver a la caja
          </button>
        </div>
      </div>
    </div>
  );
}