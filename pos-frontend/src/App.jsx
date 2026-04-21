import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importamos tus vistas actuales
import KdsView from './KdsView';
import ErpDashboard from './ErpDashboard';
import LoginView from './LoginView';
import PublicMenu from './components/PublicMenu';

// ✨ IMPORTAMOS EL NUEVO CONTENEDOR DIVIDIDO
import PosTerminal from './PosTerminal'; 

const VistaInternaPOS = () => {
  const [vista, setVista] = useState('login');
  // 🗑️ Ya no necesitamos mesaActual aquí, PosTerminal se encarga de eso.
  const [rolUsuario, setRolUsuario] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('tablet_token');
    const rol = localStorage.getItem('rol_usuario');
    
    if (token && rol) {
      setRolUsuario(rol);
      const rolLimpio = rol.toLowerCase().trim();
      if (rolLimpio === 'dueño') setVista('erp');
      else if (rolLimpio === 'cocinero' || rolLimpio === 'cocina') setVista('cocina');
      else setVista('terminal'); // ✨ Cambiamos 'mesas' por 'terminal'
    }
  }, []);

  return (
    // ✨ Le quitamos el padding bottom (pb-28) general para que la pantalla dividida use el 100% del alto
    <div className="bg-[#121212] h-screen text-neutral-100 font-sans flex flex-col relative overflow-hidden">
      
      {/* 1. LOGIN */}
      {vista === 'login' && (
        <LoginView onAccesoConcedido={(rol) => {
          setRolUsuario(rol);
          const r = rol.toLowerCase().trim();
          if (r === 'dueño') setVista('erp');
          else if (r === 'cocinero' || r === 'cocina') setVista('cocina');
          else setVista('terminal'); // ✨ Los cajeros/meseros van al terminal
        }} />
      )}

      {/* 2. TERMINAL POS (PANTALLA DIVIDIDA: MESAS + MENÚ) */}
      {vista === 'terminal' && (
        <PosTerminal 
          rolUsuario={rolUsuario} 
          onIrAErp={() => setVista('erp')} 
        />
      )}

      {/* 3. KDS (COCINA) */}
      {vista === 'cocina' && <KdsView onVolver={() => setVista('login')} />}

      {/* 4. ERP */}
      {vista === 'erp' && (
        <ErpDashboard onVolverAlPos={() => setVista('terminal')} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VistaInternaPOS />} />
        <Route path="/menu/:negocioId/:sedeId/:mesaId" element={<PublicMenu />} />
      </Routes>
    </BrowserRouter>
  );
}