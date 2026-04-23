import React from 'react';

export default function TerminalLlevarView({
  ordenesLlevar, tema, colorPrimario, setModalClienteAbierto,
  manejarCancelacion, setOrdenACobrar, entregarOrdenLlevar
}) {
  return (
    <div className="p-5 flex flex-col animate-fadeIn">
      <button onClick={() => setModalClienteAbierto(true)} style={{ backgroundColor: colorPrimario, boxShadow: `0 4px 20px ${colorPrimario}4D` }} className="w-full text-white font-black uppercase tracking-widest py-5 rounded-3xl mb-8 flex justify-center items-center gap-3 text-sm md:text-lg transition-all active:scale-95">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        Nueva Orden Para Llevar
      </button>

      <h2 className={`font-bold mb-4 uppercase text-xs tracking-widest ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>Órdenes Activas</h2>
      <div className="space-y-4">
        {ordenesLlevar.length === 0 && (
          <div className={`text-center py-10 border border-dashed rounded-3xl ${tema === 'dark' ? 'border-[#333]' : 'border-gray-300'}`}>
            <p className={`font-bold ${tema === 'dark' ? 'text-neutral-500' : 'text-gray-400'}`}>No hay órdenes activas para llevar 🛵</p>
          </div>
        )}
        {ordenesLlevar.map((orden) => {
          const estaListo = orden.estado === 'listo';
          const estaPagado = orden.pago_confirmado;
          return (
            <div key={orden.id} className={`p-5 rounded-3xl flex justify-between items-center relative overflow-hidden transition-all ${tema === 'dark' ? 'bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#222]' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${estaPagado ? 'bg-blue-500' : 'bg-red-500'}`} />
              <div className="flex-1 pl-2">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className={`font-black text-lg ${tema === 'dark' ? 'text-white' : 'text-gray-900'}`}>Orden #{orden.id}</h3>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${estaPagado ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>{estaPagado ? 'PAGADO' : 'FALTA PAGAR'}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${estaListo ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'border'}`} style={!estaListo ? { backgroundColor: `${colorPrimario}1A`, color: colorPrimario, borderColor: `${colorPrimario}33` } : {}}>{estaListo ? 'LISTO' : 'EN COCINA'}</span>
                </div>
                <p className={`text-sm font-bold ${tema === 'dark' ? 'text-neutral-400' : 'text-gray-500'}`}>👤 {orden.cliente_nombre}</p>
              </div>
              <div className="flex items-center gap-2">
                {!estaPagado && (
                  <button onClick={() => manejarCancelacion(orden.id)} className={`p-3 rounded-2xl transition-colors ${tema === 'dark' ? 'bg-[#222] text-neutral-500 hover:bg-red-900/20 hover:text-red-500' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
                {!estaPagado
                  ? <button onClick={() => setOrdenACobrar(orden)} style={{ backgroundColor: colorPrimario }} className="text-white px-4 py-2 rounded-2xl font-black text-xs md:text-sm shadow-md active:scale-95">COBRAR</button>
                  : estaListo && <button onClick={() => entregarOrdenLlevar(orden.id)} className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-2xl shadow-lg active:scale-90"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg></button>
                }
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}