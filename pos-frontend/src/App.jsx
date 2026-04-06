import React, { useState } from 'react';
import MesasView from './MesasView';
import VinculacionDispositivo from './VinculacionDispositivo';
import KdsView from './KdsView';
import ErpDashboard from './ErpDashboard';
import LoginView from './LoginView';
import PosView from './PosView';

export default function App() {
  const estaVinculadoInicialmente = !!localStorage.getItem('access_token');
  const [vista, setVista] = useState(estaVinculadoInicialmente ? 'login' : 'vinculacion');
  
  // Guardamos qué mesa tocó el cajero para pasársela al POS
  const [mesaActual, setMesaActual] = useState(null);
  
  // ✨ NUEVO: Guardamos quién entró para saber qué botones mostrarle
  const [rolUsuario, setRolUsuario] = useState(null);

  const manejarVinculacionExitosa = () => setVista('login');

  return (
    <div className="bg-[#121212] min-h-screen text-neutral-100 font-sans flex flex-col relative pb-28 overflow-hidden">
      
      {/* 1. VINCULACIÓN */}
      {vista === 'vinculacion' && <VinculacionDispositivo onVinculado={manejarVinculacionExitosa} />}
      
      {/* 2. LOGIN (PIN) */}
      {vista === 'login' && (
        <LoginView 
          onAccesoConcedido={(rol) => {
            setRolUsuario(rol); // Guardamos su rol
            
            if (rol === 'Cocinero') {
              setVista('cocina'); // La cocina va directo al KDS
            } else {
              setVista('mesas'); // Admin, Cajero y Mesero van a ver las mesas
            }
          }} 
        />
      )}

      {/* 3. SALÓN (MESAS) */}
      {vista === 'mesas' && (
        <>
          <MesasView 
            rolUsuario={rolUsuario} // Le pasamos el rol a la vista de mesas
            onIrAErp={() => setVista('erp')} // Le pasamos el poder de ir al ERP
            onSeleccionarMesa={(idMesa) => {
              setMesaActual(idMesa);
              setVista('menu'); 
            }} 
          />
        </>
      )}

      {/* 4. POS (CAJA / MENÚ) */}
      {vista === 'menu' && (
        <PosView 
          mesaId={mesaActual} 
          onVolver={() => setVista('mesas')} 
        />
      )}

      {/* 5. KDS (COCINA) */}
      {vista === 'cocina' && <KdsView onVolver={() => setVista('login')} />} {/* Que vuelva al login si sale */}

      {/* 6. ERP (ADMINISTRADOR) */}
      {vista === 'erp' && <ErpDashboard onVolverAlPos={() => setVista('mesas')} />}
      
    </div>
  );
}