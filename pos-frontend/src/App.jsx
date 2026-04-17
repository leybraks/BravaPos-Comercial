import React, { useState, useEffect } from 'react';
import MesasView from './MesasView';
import KdsView from './KdsView';
import ErpDashboard from './ErpDashboard';
import LoginView from './LoginView';
import PosView from './PosView';

export default function App() {
  const [vista, setVista] = useState('login');
  const [mesaActual, setMesaActual] = useState(null);
  const [rolUsuario, setRolUsuario] = useState(null);

  // ✨ AUTO-LOGIN: Si recargas la página, leemos la memoria para dejarte donde estabas
  useEffect(() => {
    const token = localStorage.getItem('tablet_token');
    const rol = localStorage.getItem('rol_usuario');
    
    if (token && rol) {
      setRolUsuario(rol);
      if (rol === 'Dueño') {
        setVista('erp');
      } else if (rol === 'Cocinero' || rol === 'Cocina') {
        setVista('cocina');
      } else {
        setVista('login'); // Los mortales (meseros) siempre deben poner su PIN al recargar
      }
    }
  }, []);

  return (
    <div className="bg-[#121212] min-h-screen text-neutral-100 font-sans flex flex-col relative pb-28 overflow-hidden">
      
      {/* 1. LOGIN / VINCULACIÓN */}
      {vista === 'login' && (
        <LoginView 
          onAccesoConcedido={(rol) => {
            setRolUsuario(rol);
            
            // 🚦 EL NUEVO SEMÁFORO DE RUTAS 🚦
            if (rol === 'Dueño') {
              setVista('erp'); // 👑 El Dueño va directo a su panel
            } else if (rol === 'Cocinero' || rol === 'Cocina') {
              setVista('cocina'); // 🍳 La cocina va a sus comandas
            } else {
              setVista('mesas'); // 🤵 Meseros y Admins van al salón
            }
          }} 
        />
      )}

      {/* 2. SALÓN (MESAS) */}
      {vista === 'mesas' && (
        <MesasView 
          rolUsuario={rolUsuario} 
          onIrAErp={() => setVista('erp')} 
          onSeleccionarMesa={(idMesa) => {
            setMesaActual(idMesa);
            setVista('menu'); 
          }} 
        />
      )}

      {/* 3. POS (CAJA / MENÚ) */}
      {vista === 'menu' && (
        <PosView 
          mesaId={mesaActual} 
          onVolver={() => setVista('mesas')} 
        />
      )}

      {/* 4. KDS (PANTALLA DE COCINA) */}
      {vista === 'cocina' && (
         <KdsView onVolver={() => setVista('login')} /> 
      )}

      {/* 5. ERP (PANEL DE ADMINISTRADOR) */}
      {vista === 'erp' && (
        <ErpDashboard 
          rolUsuario={rolUsuario} // ✨ ¡Vital para que el botón aparezca!
          onVolverAlPos={() => setVista('mesas')} 
        />
      )}
      
    </div>
  );
}