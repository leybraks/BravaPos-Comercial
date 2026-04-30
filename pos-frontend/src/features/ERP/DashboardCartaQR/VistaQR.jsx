import React, { useState, useEffect } from 'react';
import { getMesas, getSedes } from '../../../api/api';
import { QRCodeSVG } from 'qrcode.react';

export default function VistaQR({ esDueñoQR, colorPrimario, isDark }) {
  // ── Clases compartidas ──
  const cardCls = isDark ? 'bg-[#141414] border-[#222]' : 'bg-white border-gray-200 shadow-sm';
  const labelCls = isDark ? 'text-neutral-500' : 'text-gray-500';
  const textCls = isDark ? 'text-white' : 'text-gray-900';

  // ── Constantes locales ──
  const sedeAsignada = localStorage.getItem('sede_id');
  const negocioId = localStorage.getItem('negocio_id');

  // ── Estado ──
  const [sedes, setSedes] = useState([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState(
    esDueñoQR ? (localStorage.getItem('memoria_sede_qr') || '') : sedeAsignada
  );
  const [mesas, setMesas] = useState([]);
  const [cargandoMesas, setCargandoMesas] = useState(false);

  // ── Efectos ──
  
  // 1. Memorizar sede del dueño
  useEffect(() => {
    if (esDueñoQR && sedeSeleccionada) {
      localStorage.setItem('memoria_sede_qr', sedeSeleccionada);
    }
  }, [sedeSeleccionada, esDueñoQR]);

  // 2. Cargar sedes (solo una vez)
  useEffect(() => {
    let isMounted = true;
    const cargarSedes = async () => {
      try {
        const res = await getSedes();
        if (!isMounted) return;
        setSedes(res.data);
        if (esDueñoQR && res.data.length > 0) {
          setSedeSeleccionada(prev => prev ? prev : res.data[0].id);
        }
      } catch (error) {
        console.error('Error al cargar sedes:', error);
      }
    };
    cargarSedes();
    return () => { isMounted = false; };
  }, [esDueñoQR]);

  // 3. Cargar mesas al cambiar de sede
  useEffect(() => {
    if (!sedeSeleccionada) return;
    let isMounted = true;
    const cargarMesas = async () => {
      setCargandoMesas(true);
      try {
        const res = await getMesas({ sede_id: sedeSeleccionada });
        if (isMounted) setMesas(res.data);
      } catch (error) {
        console.error('Error al cargar mesas para QR:', error);
      } finally {
        if (isMounted) setCargandoMesas(false);
      }
    };
    cargarMesas();
    return () => { isMounted = false; };
  }, [sedeSeleccionada]);

  // ── Funciones ──
  const descargarQR = (idMesa, numeroMesa) => {
    const svg = document.getElementById(`qr-mesa-${idMesa}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QR_Mesa_${numeroMesa}.png`;
      link.href = pngFile;
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      
      {/* ══ CABECERA DE CONTROLES DE LA VISTA QR ══ */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Badge de sede para admin (no dueño) */}
        {!esDueñoQR ? (
          <div className={`inline-flex items-center px-5 py-3 rounded-2xl border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xl mr-2">📍</span>
            <span className={`text-sm font-bold uppercase tracking-wider ${labelCls}`}>
              Local:
              <span className={`ml-2 font-black ${textCls}`}>
                {localStorage.getItem('sede_nombre') || 'Local Principal'}
              </span>
            </span>
          </div>
        ) : (
          <div className="hidden sm:block"></div> /* Spacer para alinear a la derecha si es dueño */
        )}

        {/* Selector de sede del dueño */}
        {esDueñoQR && sedes.length > 1 && (
          <div className="flex flex-col items-end gap-1.5 w-full sm:w-auto">
            <span className={`text-[10px] font-black uppercase tracking-widest ${labelCls}`}>Sede</span>
            <select
              value={sedeSeleccionada || ''}
              onChange={e => setSedeSeleccionada(e.target.value)}
              className={`w-full sm:w-auto text-xs font-bold px-4 py-2.5 rounded-xl border outline-none cursor-pointer transition-all ${
                isDark
                  ? 'bg-[#1a1a1a] text-white border-[#333] hover:border-[#ff5a1f] focus:border-[#ff5a1f]'
                  : 'bg-white text-gray-800 border-gray-300 hover:border-orange-400 focus:border-orange-400'
              }`}
              style={{ color: colorPrimario }}
            >
              {sedes.map(s => (
                <option key={s.id} value={s.id}>📍 {s.nombre}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ══ GRID DE MESAS ══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cargandoMesas ? (
          <div className="col-span-full flex flex-col items-center py-20 gap-4">
            <div
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: colorPrimario, borderTopColor: 'transparent' }}
            />
            <p className={`text-xs font-black uppercase tracking-widest ${labelCls}`}>Sincronizando mesas...</p>
          </div>
        ) : mesas.length === 0 ? (
          <div className={`col-span-full p-20 text-center rounded-3xl border border-dashed ${isDark ? 'border-[#333]' : 'border-gray-300'}`}>
            <i className="fi fi-rr-table-layout text-3xl mb-3 block" style={{ color: colorPrimario + '66' }} />
            <p className={labelCls}>No hay mesas registradas en esta sede.</p>
          </div>
        ) : (
          mesas.map(mesa => {
            const urlMenu = `${window.location.origin}/menu/${negocioId}/${sedeSeleccionada}/${mesa.id}`;
            return (
              <div
                key={mesa.id}
                className={`p-6 rounded-3xl border flex flex-col items-center text-center transition-all hover:border-[#444] ${cardCls}`}
              >
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${labelCls}`}>
                  Mesa {mesa.numero_o_nombre}
                </span>
                
                <div className="bg-white p-4 rounded-2xl mb-6 shadow-2xl">
                  <QRCodeSVG
                    id={`qr-mesa-${mesa.id}`}
                    value={urlMenu}
                    size={150}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                
                <div className="w-full space-y-2">
                  <button
                    onClick={() => descargarQR(mesa.id, mesa.numero_o_nombre)}
                    className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 text-black"
                    style={{ backgroundColor: '#ffffff' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#e5e5e5'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <i className="fi fi-rr-download mr-2" />📥 Descargar PNG
                  </button>
                  <button
                    onClick={() => window.open(urlMenu, '_blank')}
                    className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                      isDark 
                        ? 'border-[#333] text-neutral-400 hover:text-white hover:border-[#555]' 
                        : 'border-gray-300 text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    🔗 Vista Previa
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}