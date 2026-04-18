import React, { useState, useEffect } from 'react';
// 1. Importamos las herramientas de navegación
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import MesasView from './MesasView';
import KdsView from './KdsView';
import ErpDashboard from './ErpDashboard';
import LoginView from './LoginView';
import PosView from './PosView';
import PublicMenu from './components/PublicMenu';

// ✨ CREAMOS UN SUB-COMPONENTE PARA EL POS INTERNO
// Esto separa la lógica de los mozos de lo que ve el cliente
const VistaInternaPOS = () => {
  const [vista, setVista] = useState('login');
  const [mesaActual, setMesaActual] = useState(null);
  const [rolUsuario, setRolUsuario] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('tablet_token');
    const rol = localStorage.getItem('rol_usuario');
    
    if (token && rol) {
      setRolUsuario(rol);
      const rolLimpio = rol.toLowerCase().trim();
      if (rolLimpio === 'dueño') setVista('erp');
      else if (rolLimpio === 'cocinero' || rolLimpio === 'cocina') setVista('cocina');
      else setVista('login');
    }
  }, []);

  return (
    <div className="bg-[#121212] min-h-screen text-neutral-100 font-sans flex flex-col relative pb-28 overflow-hidden">
      {/* 1. LOGIN */}
      {vista === 'login' && (
        <LoginView onAccesoConcedido={(rol) => {
          setRolUsuario(rol);
          const r = rol.toLowerCase().trim();
          if (r === 'dueño') setVista('erp');
          else if (r === 'cocinero' || r === 'cocina') setVista('cocina');
          else setVista('mesas');
        }} />
      )}

      {/* 2. SALÓN (MESAS) */}
      {vista === 'mesas' && (
        <MesasView 
          rolUsuario={rolUsuario} 
          onIrAErp={() => setVista('erp')} 
          onSeleccionarMesa={(idMesa) => { setMesaActual(idMesa); setVista('menu'); }} 
        />
      )}

      {/* 3. POS (MENÚ) */}
      {vista === 'menu' && (
        <PosView mesaId={mesaActual} onVolver={() => setVista('mesas')} />
      )}

      {/* 4. KDS */}
      {vista === 'cocina' && <KdsView onVolver={() => setVista('login')} />}

      {/* 5. ERP */}
      {vista === 'erp' && (
        <ErpDashboard onVolverAlPos={() => setVista('mesas')} />
      )}
    </div>
  );
};

// 🚀 COMPONENTE PRINCIPAL APP
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* RUTA 1: El POS principal (mozos, dueños, cocina) */}
        <Route path="/" element={<VistaInternaPOS />} />

        {/* RUTA 2: La Carta QR para el Cliente (pública e independiente) */}
        <Route path="/menu/:sedeId/:mesaId" element={<PublicMenu />} />
      </Routes>
    </BrowserRouter>
  );
}