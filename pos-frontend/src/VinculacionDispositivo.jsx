import React, { useState } from 'react';
import { loginAdministrador } from './api/api'; // Importamos tu función

export default function VinculacionDispositivo({ onVinculado }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      // ¡HACEMOS LA PETICIÓN REAL A DJANGO!
      const respuesta = await loginAdministrador({ username, password });
      
      // Guardamos los tokens en la memoria de la tablet
      localStorage.setItem('access_token', respuesta.data.access);
      localStorage.setItem('refresh_token', respuesta.data.refresh);
      
      // Le avisamos a App.jsx que ya tenemos la llave
      onVinculado();
    } catch (err) {
      setError('Credenciales incorrectas o servidor apagado.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center p-4">
      <div className="bg-[#111] border border-[#222] p-8 rounded-3xl w-full max-w-md shadow-2xl animate-fadeIn">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#ff5a1f]/10 text-[#ff5a1f] rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-[#ff5a1f]/20">
            🔗
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Vincular Dispositivo</h2>
          <p className="text-neutral-500 text-sm mt-2">Inicia sesión con tu cuenta de administrador para conectar esta tablet a tu restaurante.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl text-sm font-bold text-center mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-2 block">Usuario (SuperAdmin)</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff5a1f]" 
              placeholder="ej. admin"
              required
            />
          </div>
          
          <div>
            <label className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-2 block">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#ff5a1f]" 
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={cargando}
            className="w-full bg-[#ff5a1f] hover:bg-[#e04a15] text-white py-4 rounded-xl font-black tracking-widest shadow-[0_4px_20px_rgba(255,90,31,0.3)] active:scale-95 transition-all mt-4 disabled:opacity-50"
          >
            {cargando ? 'CONECTANDO...' : 'VINCULAR AHORA'}
          </button>
        </form>
      </div>
    </div>
  );
}