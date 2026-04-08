import React, { useState } from 'react';
import MesasView from './MesasView';
import KdsView from './KdsView';
import ErpDashboard from './ErpDashboard';
import LoginView from './LoginView';
import PosView from './PosView';

export default function App() {
  // ✨ LoginView ahora es un "Súper Componente" que sabe si la tablet
  // está configurada o no. Así que siempre arrancamos en 'login'.
  const [vista, setVista] = useState('login');
  
  // Guardamos qué mesa tocó el cajero para pasársela al POS
  const [mesaActual, setMesaActual] = useState(null);
  
  // Guardamos quién entró para saber qué botones mostrarle
  const [rolUsuario, setRolUsuario] = useState(null);

  return (
    <div className="bg-[#121212] min-h-screen text-neutral-100 font-sans flex flex-col relative pb-28 overflow-hidden">
      
      {/* 1. LOGIN / VINCULACIÓN (El Guardián Multi-Sede) */}
      {vista === 'login' && (
        <LoginView 
          onAccesoConcedido={(rol) => {
            setRolUsuario(rol); // Guardamos su rol
            
            // Verificamos ambas formas en las que pudiste haber escrito el rol en Django
            if (rol === 'Cocinero' || rol === 'Cocina') {
              setVista('cocina'); // La cocina va directo a sus comandas (KDS)
            } else {
              setVista('mesas'); // Admin, Cajero y Meseros van al salón
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
         <ErpDashboard onVolverAlPos={() => setVista('mesas')} />
      )}
      
    </div>
  );
}