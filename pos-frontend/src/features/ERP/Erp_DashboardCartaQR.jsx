import React, { useState, useEffect } from 'react';
// ✨ 1. Agregamos getSedes aquí
import { getMesas, getSedes } from '../../api/api'; 
import { QRCodeSVG } from 'qrcode.react'; 

export default function DashboardCartaQR({ config }) { 
  // (Ya no necesitamos recibir sedesReales por las props)

  const rolUsuario = localStorage.getItem('rol_usuario') || '';
  const esDueño = rolUsuario.trim().toLowerCase() === 'dueño' || rolUsuario.trim().toLowerCase() === 'admin';
  const sedeAsignada = localStorage.getItem('sede_id');

  // ✨ 2. Creamos un estado propio para las sedes
  const [sedes, setSedes] = useState([]); 
  const [sedeSeleccionada, setSedeSeleccionada] = useState(esDueño ? '' : sedeAsignada);
  const [mesas, setMesas] = useState([]);
  const [cargando, setCargando] = useState(false);

  // ✨ 3. EFECTO NUEVO: Descargamos las sedes apenas se abre esta pantalla
  useEffect(() => {
    const cargarSedes = async () => {
      try {
        const res = await getSedes();
        setSedes(res.data);
        
        // Si es dueño y no hay sede elegida, auto-seleccionamos la primera para que carguen las mesas
        if (esDueño && res.data.length > 0 && !sedeSeleccionada) {
          setSedeSeleccionada(res.data[0].id);
        }
      } catch (error) {
        console.error("Error al cargar sedes:", error);
      }
    };
    cargarSedes();
  }, [esDueño, sedeSeleccionada]);

  // 4. EFECTO DE MESAS: Reacciona cuando ya tenemos una sede elegida
  useEffect(() => {
    if (sedeSeleccionada) {
      const cargarMesas = async () => {
        setCargando(true);
        try {
          const res = await getMesas({ sede_id: sedeSeleccionada });
          setMesas(res.data);
        } catch (error) {
          console.error("Error al cargar mesas para QR:", error);
        } finally {
          setCargando(false);
        }
      };
      cargarMesas();
    }
  }, [sedeSeleccionada]);

  const descargarQR = (idMesa, numeroMesa) => {
    const svg = document.getElementById(`qr-mesa-${idMesa}`);
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_Mesa_${numeroMesa}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="animate-fadeIn space-y-6 pb-10">
      
      {/* SECCIÓN: CABECERA Y SELECTOR */}
      <div className={`p-6 rounded-3xl border transition-all ${
        config.temaFondo === 'dark' ? 'bg-[#111] border-[#222]' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-black mb-1 flex items-center gap-2">
              <span>📱</span> Generador de Carta Digital
            </h2>
            <p className="text-sm text-neutral-500">
              {esDueño ? "Gestiona los códigos QR de todas tus sedes." : "Genera los códigos QR para las mesas de tu local."}
            </p>
          </div>

          {/* ✨ SELECTOR PARA EL DUEÑO: Usa el estado 'sedes' que acabamos de descargar */}
          {esDueño && sedes.length > 1 && (
            <div className="flex flex-col items-end gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Cambiar de Sede
              </span>
              <select 
                value={sedeSeleccionada || ''} 
                onChange={(e) => setSedeSeleccionada(e.target.value)}
                className="text-xs font-bold px-4 py-2.5 rounded-xl border outline-none cursor-pointer bg-[#1a1a1a] text-white border-[#333] hover:border-[#ff5a1f] focus:border-[#ff5a1f] transition-all"
                style={{ color: config.colorPrimario }}
              >
                {sedes.map(s => (
                  <option key={s.id} value={s.id}>📍 {s.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN: GRID DE MESAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cargando ? (
          <div className="col-span-full flex flex-col items-center py-20 gap-4">
             <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: config.colorPrimario, borderTopColor: 'transparent' }}></div>
             <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest">Sincronizando mesas...</p>
          </div>
        ) : mesas.length === 0 ? (
          <div className="col-span-full p-20 text-center rounded-3xl border border-dashed border-[#222]">
            <p className="text-neutral-500">No hay mesas registradas en esta sede.</p>
          </div>
        ) : (
          mesas.map(mesa => {
            const negocioId = localStorage.getItem('negocio_id');
            const urlMenu = `${window.location.origin}/menu/${negocioId}/${sedeSeleccionada}/${mesa.id}`;
            return (
              <div key={mesa.id} className={`p-6 rounded-3xl border flex flex-col items-center text-center transition-all hover:border-[#444] ${
                config.temaFondo === 'dark' ? 'bg-[#121212] border-[#222]' : 'bg-white border-gray-200'
              }`}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-4">Mesa {mesa.numero_o_nombre}</span>
                <div className="bg-white p-4 rounded-2xl mb-6 shadow-2xl">
                  <QRCodeSVG id={`qr-mesa-${mesa.id}`} value={urlMenu} size={150} level={"H"} includeMargin={false} />
                </div>
                <div className="w-full space-y-2">
                  <button onClick={() => descargarQR(mesa.id, mesa.numero_o_nombre)} className="w-full py-3 rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-neutral-200 transition-all active:scale-95">📥 Descargar PNG</button>
                  <button onClick={() => window.open(urlMenu, '_blank')} className="w-full py-3 rounded-xl border border-[#333] text-neutral-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-all">🔗 Vista Previa</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}