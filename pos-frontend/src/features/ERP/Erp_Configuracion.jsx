import React from 'react';

export default function Erp_Configuracion({ config, setConfig, manejarGuardarConfig, guardandoConfig }) {
  return (
    <div className="animate-fadeIn max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* ================= SECCIÓN PAGOS DIGITALES ================= */}
      <div className={`rounded-3xl overflow-hidden shadow-lg transition-colors ${
        config.temaFondo === 'dark' ? 'bg-[#121212] border border-[#222]' : 'bg-white border border-neutral-200'
      }`}>
        <div className={`p-6 border-b transition-colors ${
          config.temaFondo === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-neutral-200 bg-neutral-50'
        }`}>
          <h3 className={`text-xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Billeteras Digitales
          </h3>
          <p className={`text-sm mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Configura Yape y Plin para el cobro rápido en POS.
          </p>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className={`text-xs font-bold uppercase tracking-widest mb-2 block ${
              config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              Número Asociado
            </label>
            <input 
              type="text" 
              value={config.numeroYape}
              onChange={(e) => setConfig({...config, numeroYape: e.target.value})}
              className={`w-full rounded-xl px-4 py-3 text-lg font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-[${config.colorPrimario}] ${
                config.temaFondo === 'dark' 
                  ? 'bg-[#1a1a1a] border border-[#333] text-white focus:border-transparent' 
                  : 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-transparent'
              }`}
              placeholder="Ej. 987654321"
            />
            <p className={`text-xs mt-2 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Este número se mostrará al cliente si pide el dato manual.
            </p>
          </div>
          
          <div>
            <label className={`text-xs font-bold uppercase tracking-widest mb-2 block ${
              config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              Código QR (Opcional)
            </label>
            <label className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group relative overflow-hidden min-h-[140px] ${
              config.temaFondo === 'dark' 
                ? 'border-[#333] hover:border-[#ff5a1f] bg-[#1a1a1a]' 
                : 'border-gray-300 hover:border-[#ff5a1f] bg-gray-50'
            }`}>
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg"
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files[0];
                  if(file) {
                    const imagenTemporal = URL.createObjectURL(file);
                    setConfig({...config, qrFile: file, qrPreview: imagenTemporal});
                  }
                }}
              />
              {config.qrPreview ? (
                <div className="absolute inset-0 p-2">
                  <img src={config.qrPreview} alt="QR Yape Preview" className="w-full h-full object-contain rounded-lg" />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold text-sm bg-black/80 px-3 py-1 rounded-full">Cambiar Imagen</span>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📱</span>
                  <p className={`font-bold text-sm ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                    Sube tu imagen QR
                  </p>
                  <p className={`text-xs mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                    PNG o JPG max 2MB
                  </p>
                </>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* ================= SECCIÓN MÓDULOS DEL SISTEMA ================= */}
      <div className={`rounded-3xl overflow-hidden shadow-lg transition-colors ${
        config.temaFondo === 'dark' ? 'bg-[#121212] border border-[#222]' : 'bg-white border border-neutral-200'
      }`}>
        <div className={`p-6 border-b transition-colors ${
          config.temaFondo === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-neutral-200 bg-neutral-50'
        }`}>
          <h3 className={`text-xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Módulos del Sistema
          </h3>
          <p className={`text-sm mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Activa o desactiva las herramientas según la operación de este local y tu plan actual.
          </p>
        </div>
        <div className="p-6 space-y-4">
          
          {/* Módulo Salón (Siempre visible) */}
          <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
            config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
          }`}>
            <div>
              <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Gestión de Salón (Mesas)
              </h4>
              <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Habilita el mapa interactivo de mesas y la opción de unir cuentas.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={config.modSalon} onChange={() => setConfig({...config, modSalon: !config.modSalon})} />
              <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all" 
                  style={config.modSalon ? {backgroundColor: config.colorPrimario} : {}}>
              </div>
            </label>
          </div>

          {/* Módulo CRM (Siempre visible) */}
          <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
            config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
          }`}>
            <div>
              <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Directorio de Clientes (CRM)
              </h4>
              <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Guarda DNI/RUC, nombres y teléfonos para fidelización.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={config.modClientes} onChange={() => setConfig({...config, modClientes: !config.modClientes})} />
              <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                  style={config.modClientes ? {backgroundColor: config.colorPrimario} : {}}>
              </div>
            </label>
          </div>

          {/* Módulo Facturación (Siempre visible) */}
          <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
            config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
          }`}>
            <div>
              <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Facturación Electrónica
              </h4>
              <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                Emite Boletas y Facturas válidas (Requiere configuración externa).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={config.modFacturacion} onChange={() => setConfig({...config, modFacturacion: !config.modFacturacion})} />
              <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                  style={config.modFacturacion ? {backgroundColor: config.colorPrimario} : {}}>
              </div>
            </label>
          </div>

          {/* ================= MÓDULOS CONDICIONALES (Según Plan) ================= */}
          
          {config.permisosPlan?.modulo_kds && (
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}>
              <div>
                <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Pantalla de Cocina (KDS) <span className="text-xs bg-[#ff5a1f]/20 text-[#ff5a1f] px-2 py-1 rounded ml-2">PRO</span>
                </h4>
                <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Permite a los cocineros ver y despachar órdenes en tiempo real.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.modCocina} onChange={() => setConfig({...config, modCocina: !config.modCocina})} />
                <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                    style={config.modCocina ? {backgroundColor: config.colorPrimario} : {}}>
                </div>
              </label>
            </div>
          )}

          {config.permisosPlan?.modulo_delivery && (
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}>
              <div>
                <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Módulo Delivery y Para Llevar
                </h4>
                <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Habilita una pestaña dedicada para despachos externos.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.modDelivery} onChange={() => setConfig({...config, modDelivery: !config.modDelivery})} />
                <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                    style={config.modDelivery ? {backgroundColor: config.colorPrimario} : {}}>
                </div>
              </label>
            </div>
          )}

          {config.permisosPlan?.modulo_inventario && (
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}>
              <div>
                <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  Control de Inventario
                </h4>
                <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Descuenta insumos y alerta sobre stock crítico en tiempo real.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.modInventario} onChange={() => setConfig({...config, modInventario: !config.modInventario})} />
                <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                    style={config.modInventario ? {backgroundColor: config.colorPrimario} : {}}>
                </div>
              </label>
            </div>
          )}

          {config.permisosPlan?.modulo_carta_qr && (
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>Menú Digital QR</h4>
                  <span className="text-[10px] bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded-full font-black border border-blue-500/30 uppercase">Premium</span>
                </div>
                <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Genera QRs para las mesas y permite que vean la carta desde el celular.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.modCartaQr} onChange={() => setConfig({...config, modCartaQr: !config.modCartaQr})} />
                <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                    style={config.modCartaQr ? {backgroundColor: config.colorPrimario} : {}}>
                </div>
              </label>
            </div>
          )}

          {config.permisosPlan?.modulo_bot_wsp && (
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>Bot de Pedidos (WSP)</h4>
                  <span className="text-[10px] bg-green-500/20 text-green-500 px-2 py-0.5 rounded-full font-black border border-green-500/30 uppercase">Beta</span>
                </div>
                <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Recibe pedidos automáticamente desde WhatsApp directo a tu cocina.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.modBotWsp} onChange={() => setConfig({...config, modBotWsp: !config.modBotWsp})} />
                <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                    style={config.modBotWsp ? {backgroundColor: config.colorPrimario} : {}}>
                </div>
              </label>
            </div>
          )}

          {config.permisosPlan?.modulo_ml && (
            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${
              config.temaFondo === 'dark' ? 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-[#333]' : 'bg-gray-50 border-gray-200 hover:border-gray-300'
            }`}>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>Predicciones con IA</h4>
                  <span className="text-[10px] bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded-full font-black border border-purple-500/30 uppercase">Enterprise</span>
                </div>
                <p className={`text-sm ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-500'}`}>
                  Anticípate a la demanda de mañana usando los datos históricos de tus ventas.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={config.modMl} onChange={() => setConfig({...config, modMl: !config.modMl})} />
                <div className="w-14 h-7 bg-[#333] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all"
                    style={config.modMl ? {backgroundColor: config.colorPrimario} : {}}>
                </div>
              </label>
            </div>
          )}
          
        </div>
      </div>

      {/* ================= SECCIÓN APARIENCIA ================= */}
      <div className={`border rounded-3xl overflow-hidden shadow-lg transition-colors duration-300 mt-6 ${
        config.temaFondo === 'dark' ? 'bg-[#121212] border-[#222]' : 'bg-white border-neutral-200'
      }`}>
        <div className={`p-6 border-b transition-colors ${
          config.temaFondo === 'dark' ? 'border-[#222] bg-[#1a1a1a]' : 'border-neutral-200 bg-neutral-50'
        }`}>
          <h3 className={`text-xl font-black ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Apariencia del Sistema
          </h3>
          <p className={`text-sm mt-1 ${config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-500'}`}>
            Personaliza los colores para que combinen con la identidad de tu marca.
          </p>
        </div>
        <div className="p-6 space-y-8">
          
          {/* Selector Tema */}
          <div>
            <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ${
              config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              Tema Base
            </label>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfig({...config, temaFondo: 'dark'})}
                className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all shadow-md ${
                  config.temaFondo === 'dark' 
                    ? 'bg-[#1a1a1a] text-white border-transparent' 
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
                style={config.temaFondo === 'dark' ? { borderColor: config.colorPrimario } : {}}
              >
                🌙 Oscuro (Recomendado)
              </button>
              <button 
                onClick={() => setConfig({...config, temaFondo: 'light'})}
                className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all shadow-md ${
                  config.temaFondo === 'light' 
                    ? 'bg-white text-black border-transparent' 
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
                style={config.temaFondo === 'light' ? { borderColor: config.colorPrimario } : {}}
              >
                ☀️ Claro
              </button>
            </div>
          </div>

          {/* Paleta de colores */}
          <div>
            <label className={`text-xs font-bold uppercase tracking-widest mb-3 block ${
              config.temaFondo === 'dark' ? 'text-neutral-400' : 'text-neutral-600'
            }`}>
              Color Principal (Botones y Acentos)
            </label>
            <div className="flex flex-wrap gap-4">
              {[
                { hex: '#ff5a1f', nombre: 'Naranja Brava' },
                { hex: '#3b82f6', nombre: 'Azul Tech' },
                { hex: '#10b981', nombre: 'Verde Fresh' },
                { hex: '#eab308', nombre: 'Amarillo Mostaza' },
                { hex: '#8b5cf6', nombre: 'Morado Neón' },
                { hex: '#ec4899', nombre: 'Rosa Flamingo' }
              ].map((color) => (
                <button
                  key={color.hex}
                  onClick={() => setConfig({...config, colorPrimario: color.hex})}
                  className={`w-14 h-14 rounded-full border-4 transition-all active:scale-95 flex items-center justify-center ${
                    config.colorPrimario === color.hex 
                      ? 'border-white scale-110 shadow-lg' 
                      : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.nombre}
                >
                  {config.colorPrimario === color.hex && (
                    <span className="text-white text-xl drop-shadow-md">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* ================= VISTA PREVIA DEL COLOR ================= */}
          <div className={`mt-6 flex items-center justify-between p-4 rounded-2xl border transition-colors ${
            config.temaFondo === 'dark' 
              ? 'bg-[#1a1a1a] border-[#2a2a2a]' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div>
              <h4 className={`font-bold text-lg ${config.temaFondo === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Vista Previa del Color
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: config.colorPrimario }}></div>
                <span className={`font-mono text-xs font-bold uppercase tracking-widest ${config.temaFondo === 'dark' ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  {config.colorPrimario}
                </span>
              </div>
            </div>
            
            <button 
              style={{ 
                backgroundColor: config.colorPrimario, 
                boxShadow: `0 4px 15px ${config.colorPrimario}40` 
              }}
              className="px-6 py-2.5 rounded-xl text-white font-bold transition-transform hover:brightness-110 active:scale-95 flex items-center gap-2"
            >
              <span>✓</span> Botón de Prueba
            </button>
          </div>

        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end pt-4">
        <button 
          onClick={manejarGuardarConfig}
          disabled={guardandoConfig}
          style={{ backgroundColor: config.colorPrimario, boxShadow: `0 4px 20px ${config.colorPrimario}66` }}
          className="text-white px-10 py-5 rounded-2xl font-black text-lg tracking-widest transition-all active:scale-95 disabled:opacity-50"
        >
          {guardandoConfig ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
        </button>
      </div>

    </div>
  );
}