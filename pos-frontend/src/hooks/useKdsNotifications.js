import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export const useKdsNotifications = () => {
  const socketRef = useRef(null);

  // ✨ EXTRAEMOS LA SEDE DE LA TABLET
  const sedeActualId = localStorage.getItem('sede_id');

  useEffect(() => {
    if (!sedeActualId) return; // Seguridad por si aún no hay sede

    // 1. Conectar al WebSocket filtrado por Sede ✨
    const wsUrl = `ws://localhost:8000/ws/salon/${sedeActualId}/`; 
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onopen = () => {
      console.log(`✅ Notificaciones conectadas: Sede ${sedeActualId}`);
    };

    // 2. Escuchar mensajes de LA cocina de ESTA sede
    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'pedido_listo') {
        // A) Sonido de notificación[cite: 15]
        const audio = new Audio('/campana-listo.mp3'); 
        audio.play().catch(e => console.log("Audio bloqueado por el navegador"));

        // B) Notificación visual premium[cite: 15]
        toast.success(
          (t) => (
            <div>
              <p className="font-bold text-white mb-1">¡Pedido Listo!</p>
              <p className="text-sm text-neutral-400">
                Mesa: <span className="font-black text-[#ff5a1f] text-lg">{data.mesa}</span>
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

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [sedeActualId]); // Se reconecta si la sede cambia[cite: 15]

  return socketRef.current;
};