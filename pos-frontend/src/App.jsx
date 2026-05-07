import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';

// 🛡️ IMPORTAMOS TU INSTANCIA DE AXIOS SEGURA
import api from './api/api'; 

// Importamos tus vistas actuales
import KdsView from './views/View_Kds';
import ErpDashboard from './views/View_Erp';
import LoginView from './views/View_Login';
import PublicMenu from './features/public/PublicMenu';
import PosTerminal from './features/POS/Pos_Terminal'; 

const VistaInternaPOS = () => {
  const [vista, setVista] = useState('login');
  const [rolUsuario, setRolUsuario] = useState(null);
  
  // ✨ Nuevo estado para que no parpadee el login al recargar
  const [cargando, setCargando] = useState(true); 

  useEffect(() => {
    const verificarSeguridad = async () => {
      try {
        const res = await api.get('/verificar-sesion/');
        const rolServidor = res.data.user?.rol;

        if (rolServidor) {
          setRolUsuario(rolServidor);
          const rolLimpio = rolServidor.toLowerCase().trim();

          // ✨ 1. EXCEPCIÓN PARA EL DUEÑO/ADMIN:
          // Si tu cookie dice que eres el administrador, entras directo al ERP.
          // Ignoramos si el navegador tiene un "sede_id" guardado.
          if (rolLimpio === 'dueño' || rolLimpio === 'admin') {
            setVista('erp');
            return;
          }

          // 🛡️ 2. REGLA ESTRICTA PARA TERMINALES POS:
          // Si NO eres admin, y el dispositivo es una caja (tiene sede_id),
          // exigimos re-autenticación por PIN por seguridad.
          if (localStorage.getItem('sede_id')) {
            setVista('login');
            return;
          }

          // 3. Distribución para otros roles
          if (rolLimpio === 'cocinero' || rolLimpio === 'cocina') {
            setVista('cocina');
          } else {
            setVista('terminal');
          }

        } else {
          setVista('login');
        }
      } catch (error) {
        setVista('login');
      } finally {
        setCargando(false);
      }
    };

    verificarSeguridad();
  }, []);

  // ✨ Pantalla de carga mientras se verifica la cookie
  if (cargando) {
    return (
      <div className="bg-[#121212] h-screen flex items-center justify-center text-neutral-300 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-[#ff5a1f] border-t-transparent rounded-full animate-spin"></div>
          <p className="animate-pulse">Verificando sesión segura...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] h-screen text-neutral-100 font-sans flex flex-col relative overflow-hidden">
      
      {vista === 'login' && (
        <LoginView onAccesoConcedido={(rol) => {
          setRolUsuario(rol);
          const r = rol.toLowerCase().trim();
          if (r === 'dueño' || r === 'admin') setVista('erp');
          else if (r === 'cocinero' || r === 'cocina') setVista('cocina');
          else setVista('terminal');
        }} />
      )}

      {vista === 'terminal' && (
        <PosTerminal 
          rolUsuario={rolUsuario} 
          onIrAErp={() => setVista('erp')} 
        />
      )}

      {vista === 'cocina' && <KdsView onVolver={() => setVista('login')} />}

      {vista === 'erp' && (
        <ErpDashboard onVolverAlPos={() => setVista('terminal')} rolUsuario={rolUsuario} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VistaInternaPOS />} />
        <Route path="/menu/:negocioId/:sedeId/:mesaId" element={<PublicMenu />} />
        <Route path="*" element={
          <div className="h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-center p-6">
            <span className="text-8xl mb-4">🏮</span>
            <h1 className="text-4xl font-black text-white mb-2">404</h1>
            <p className="text-neutral-500 font-bold mb-6">Parece que este local no existe o se movió de sitio.</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="px-8 py-3 rounded-2xl bg-[#ff5a1f] text-white font-black uppercase tracking-widest shadow-lg shadow-orange-900/20 active:scale-95 transition-all"
            >
              Volver al Inicio
            </button>
          </div>
        } />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
  );
}