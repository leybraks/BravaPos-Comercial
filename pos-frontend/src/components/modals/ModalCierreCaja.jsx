import React, { useState } from 'react';
import { cerrarCaja } from '../../api/api';
import usePosStore from '../../store/usePosStore';

export default function ModalCierreCaja({ isOpen, onClose, onCierreExitoso }) {
  const { configuracionGlobal } = usePosStore();
  const tema = configuracionGlobal?.temaFondo || 'dark';
  const colorPrimario = configuracionGlobal?.colorPrimario || '#ff5a1f';

  const [efectivo, setEfectivo] = useState('');
  const [yape, setYape] = useState('');
  const [tarjeta, setTarjeta] = useState('');
  const [procesando, setProcesando] = useState(false);

  const sedeActualId = localStorage.getItem('sede_id');
  const empleadoCierreId = localStorage.getItem('empleado_id');

  if (!isOpen) return null;

  const procesarCierre = async () => {
    setProcesando(true);
    try {
      const payload = {
        empleado_id: empleadoCierreId,
        sede_id: sedeActualId,
        conteo_efectivo: parseFloat(efectivo || 0),
        conteo_yape: parseFloat(yape || 0),
        conteo_tarjeta: parseFloat(tarjeta || 0)
      };
      const response = await cerrarCaja(payload);
      onCierreExitoso(response.data);
    } catch (error) {
      console.error("Error en el cierre:", error);
      alert("No se pudo procesar el cierre. Verifica tu conexión o revisa la consola.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
      <div className={`rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border transition-colors ${
        tema === 'dark' ? 'bg-[#121212] border-[#333]' : 'bg-white border-gray-200'
      }`}>
        
        <div className={`p-6 border-b flex justify-between items-center text-center transition-colors ${
          tema === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-gray-200 bg-gray-50'
        }`}>
          <h3 className={`text-xl font-black w-full ${
            tema === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Cierre de Caja (Arqueo)
          </h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Alerta de Cierre Ciego */}
          <div className={`text-center border p-4 rounded-2xl mb-4 ${
            tema === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
          }`}>
            <span className="text-2xl mb-2 block">🔒</span>
            <p className={`font-bold text-sm ${
              tema === 'dark' ? 'text-red-400' : 'text-red-600'
            }`}>
              Cierre Ciego Activado
            </p>
            <p className={`text-xs mt-1 ${
              tema === 'dark' ? 'text-neutral-500' : 'text-gray-500'
            }`}>
              Cuenta el dinero en tu gaveta e ingrésalo. Cualquier diferencia será reportada al administrador.
            </p>
          </div>

          <div className="space-y-4">
            {/* Input Efectivo */}
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${
                tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'
              }`}>
                💵 Total Efectivo (Billetes y Monedas)
              </label>
              <div className={`flex items-center rounded-xl px-4 py-3 transition-colors focus-within:ring-1 ${
                tema === 'dark' 
                  ? 'bg-[#1a1a1a] border border-[#333] focus-within:border-green-500' 
                  : 'bg-gray-50 border border-gray-200 focus-within:border-green-500'
              }`}>
                <span className={`font-mono mr-2 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>S/</span>
                <input 
                  type="number" 
                  value={efectivo} 
                  onChange={(e) => setEfectivo(e.target.value)} 
                  className={`bg-transparent w-full text-xl font-bold focus:outline-none ${
                    tema === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                  placeholder="0.00" 
                />
              </div>
            </div>

            {/* Input Yape/Plin */}
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${
                tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'
              }`}>
                📱 Total en Yape / Plin (Revisa tu celular)
              </label>
              <div className={`flex items-center rounded-xl px-4 py-3 transition-colors focus-within:ring-1 ${
                tema === 'dark' 
                  ? 'bg-[#1a1a1a] border border-[#333] focus-within:border-purple-500' 
                  : 'bg-gray-50 border border-gray-200 focus-within:border-purple-500'
              }`}>
                <span className={`font-mono mr-2 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>S/</span>
                <input 
                  type="number" 
                  value={yape} 
                  onChange={(e) => setYape(e.target.value)} 
                  className={`bg-transparent w-full text-xl font-bold focus:outline-none ${
                    tema === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                  placeholder="0.00" 
                />
              </div>
            </div>

            {/* Input Tarjeta */}
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-widest mb-2 block ${
                tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'
              }`}>
                💳 Total en POS (Vouchers de Tarjeta)
              </label>
              <div className={`flex items-center rounded-xl px-4 py-3 transition-colors focus-within:ring-1 ${
                tema === 'dark' 
                  ? 'bg-[#1a1a1a] border border-[#333] focus-within:border-blue-500' 
                  : 'bg-gray-50 border border-gray-200 focus-within:border-blue-500'
              }`}>
                <span className={`font-mono mr-2 ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>S/</span>
                <input 
                  type="number" 
                  value={tarjeta} 
                  onChange={(e) => setTarjeta(e.target.value)} 
                  className={`bg-transparent w-full text-xl font-bold focus:outline-none ${
                    tema === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}
                  placeholder="0.00" 
                />
              </div>
            </div>
          </div>

          <button 
            onClick={procesarCierre} 
            disabled={procesando || !efectivo}
            style={{ backgroundColor: colorPrimario }}
            className="w-full text-white py-5 rounded-xl font-black tracking-widest shadow-lg active:scale-95 transition-all mt-4 disabled:opacity-50 hover:brightness-110"
          >
            {procesando ? 'CALCULANDO CUADRE...' : 'ENVIAR CIERRE A GERENCIA'}
          </button>
          
          <button 
            onClick={onClose} 
            className={`w-full text-sm font-bold py-2 transition-colors ${
              tema === 'dark' ? 'text-neutral-500 hover:text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Cancelar y volver a la caja
          </button>
        </div>
      </div>
    </div>
  );
}