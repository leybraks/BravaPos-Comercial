import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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
        // 1. Le preguntamos al backend "¿Sigo teniendo una cookie válida?"
        // Axios enviará la cookie automáticamente
        await api.get('/verificar-sesion/'); 

        // 2. Si no tira error, estamos logueados. Recuperamos el rol.
        // ⚠️ Nota: Asegúrate de que tu login guarda esto como 'usuario_rol' (o cámbialo a 'rol_usuario' si prefieres)
        const rol = localStorage.getItem('usuario_rol') || localStorage.getItem('rol_usuario'); 
        
        if (rol) {
          setRolUsuario(rol);
          const rolLimpio = rol.toLowerCase().trim();
          if (rolLimpio === 'dueño' || rolLimpio === 'admin') setVista('erp');
          else if (rolLimpio === 'cocinero' || rolLimpio === 'cocina') setVista('cocina');
          else setVista('terminal');
        } else {
          setVista('login');
        }
      } catch (error) {
        // 3. Si da error (401), la cookie expiró o no existe
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
  );
}