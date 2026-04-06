import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export const useKdsNotifications = () => {
  // useRef mantiene la referencia del socket sin causar re-renders innecesarios
  const socketRef = useRef(null);

  useEffect(() => {
    // 1. Conectar al WebSocket de Django (ajusta la URL a la tuya)
    const wsUrl = `ws://localhost:8000/ws/salon/`; 
    socketRef.current = new WebSocket(wsUrl);

    // 2. ¿Qué hacer cuando nos conectamos?
    socketRef.current.onopen = () => {
      console.log('✅ Conectado al canal del Salón');
    };

    // 3. ✨ LA MAGIA: Escuchar mensajes de la cocina
    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'pedido_listo') {
        // A) Sonido
        const audio = new Audio('/campana-listo.mp3'); // Asegúrate de tener este archivo en tu carpeta 'public'
        audio.play().catch(e => console.log("El navegador bloqueó el sonido automático"));

        // B) Notificación visual
        toast.success(
          (t) => (
            <div>
              <p className="font-bold text-white mb-1">¡Pedido Listo!</p>
              <p className="text-sm text-neutral-400">
                Correr a: <span className="font-black text-[#ff5a1f] text-lg">{data.mesa}</span>
              </p>
              <p className="text-xs text-neutral-500 mt-1 truncate max-w-[200px]">
                {data.producto}
              </p>
            </div>
          ),
          {
            duration: 6000,
            style: {
              background: '#161616',
              border: '1px solid #333',
              padding: '16px',
            },
            icon: '🛎️',
          }
        );
      }
    };

    // 4. Limpiar al desmontar (cuando el mesero cierra sesión)
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []); 

  // Devolvemos el socket por si luego quieres mandar mensajes DESDE el salón a la cocina
  return socketRef.current;
};