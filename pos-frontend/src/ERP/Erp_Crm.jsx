import React from 'react';

export default function Erp_Crm({ config }) {
  return (
    <div className="animate-fadeIn space-y-6 flex flex-col w-full min-w-0">
      
      {/* BANNER */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-3xl p-5 flex flex-col md:flex-row justify-between items-center text-center md:text-left shadow-xl w-full gap-4">
        <div className="w-full min-w-0">
          <h3 className="text-2xl md:text-3xl font-black text-white mb-1">Generador de Campañas</h3>
          <p className="text-green-100 text-sm">
            Tienes <strong className="text-white">342</strong> clientes. Lanza una promoción por WhatsApp.
          </p>
        </div>
        <button className="w-full md:w-auto bg-white text-green-600 px-6 py-3 rounded-xl font-black shadow-lg shrink-0 flex items-center justify-center gap-2 hover:bg-green-50 transition-colors">
          <span className="text-xl">📱</span> ENVIAR PROMO
        </button>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className={`rounded-3xl flex flex-col w-full min-w-0 relative overflow-hidden border ${
        config.temaFondo === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className={`p-4 border-b flex flex-col sm:flex-row justify-between gap-3 ${
          config.temaFondo === 'dark' ? 'border-[#222]' : 'border-gray-200'
        }`}>
          <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Base de Datos
          </h4>
          <input 
            type="text" 
            placeholder="Buscar por número..." 
            className={`w-full sm:w-64 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm ${
              config.temaFondo === 'dark'
                ? 'bg-[#1a1a1a] border border-[#333] text-white placeholder:text-neutral-500'
                : 'bg-gray-100 border border-gray-300 text-gray-800 placeholder:text-gray-400'
            }`}
          />
        </div>
        
        <div className="w-full overflow-x-auto min-w-0">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
            <thead className={`text-[10px] uppercase tracking-widest ${
              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] text-neutral-500' : 'bg-gray-100 text-gray-500'
            }`}>
              <tr>
                <th className="px-5 py-4 font-black">Cliente</th>
                <th className="px-5 py-4 font-black">WhatsApp</th>
                <th className="px-5 py-4 font-black text-center">Visitas</th>
                <th className="px-5 py-4 font-black">Última Visita</th>
                <th className="px-5 py-4 font-black text-center">Acción</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${
              config.temaFondo === 'dark' ? 'text-neutral-300 divide-[#222]' : 'text-gray-700 divide-gray-200'
            }`}>
              {[
                { n: 'Carlos Gutiérrez', w: '987 654 321', v: 12, u: 'Hace 2 días' },
                { n: 'Ana Mendoza', w: '912 345 678', v: 3, u: 'Hace 45 días' },
                { n: 'Luis Fernández', w: '999 888 777', v: 28, u: 'Hoy' },
              ].map((c, i) => (
                <tr key={i} className={`transition-colors ${
                  config.temaFondo === 'dark' ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-50'
                }`}>
                  <td className="px-5 py-4 font-bold flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      config.temaFondo === 'dark' ? 'bg-[#222] text-[#ff5a1f]' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {c.n.charAt(0)}
                    </div>
                    <span className={config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}>
                      {c.n}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono">{c.w}</td>
                  <td className="px-5 py-4 font-bold text-green-500 text-center">{c.v}</td>
                  <td className="px-5 py-4 text-xs">
                    <span className={c.u.includes('45') ? 'text-red-400 font-bold bg-red-500/10 px-2 py-1 rounded' : ''}>
                      {c.u}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button className="px-4 py-2 rounded-lg font-bold text-xs transition-colors bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white">
                      Chat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}