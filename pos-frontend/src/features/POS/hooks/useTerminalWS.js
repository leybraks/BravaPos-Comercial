import { useEffect, useRef } from 'react';

export const useTerminalWS = (sedeActualId, setMesas, setOrdenesLlevar) => {
  const wsRef = useRef(null);

  useEffect(() => {
    // Si no hay sede, cortamos la ejecución para no abrir conexiones huérfanas
    if (!sedeActualId) return;

    let ws = null;
    let reconnectTimeout = null;
    let unmounted = false;

    const conectar = () => {
      if (unmounted) return;
      
      // ✨ EXTRAEMOS EL TOKEN
      const token = localStorage.getItem('tablet_token') || localStorage.getItem('access_token');
      
      const baseUrl = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000';
      
      // ✨ LE INYECTAMOS EL TOKEN AL FINAL DE LA URL
      const wsUrl = `${baseUrl}/ws/salon/${sedeActualId}/?token=${token}`;
      
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;// Guardamos la referencia para poder usarla fuera si es necesario

      // Solo actualizamos el estado cuando el servidor nos envía un mensaje
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        
        if (data.type === 'mesa_actualizada') {
          setMesas((prev) =>
            prev.map((m) =>
              m.id === data.mesa_id ? { ...m, estado: data.estado, totalConsumido: data.total ?? m.totalConsumido } : m
            )
          );
        }
        
        if (data.type === 'orden_llevar_actualizada') {
          const orden = data.orden;
          setOrdenesLlevar((prev) => {
            if (data.accion === 'nueva') return [orden, ...prev].slice(0, 10);
            if (data.accion === 'completada') return prev.filter((o) => o.id !== orden.id);
            if (data.accion === 'actualizada') return prev.map((o) => (o.id === orden.id ? orden : o));
            return prev;
          });
        }
      };

      ws.onclose = () => { 
        if (!unmounted) {
          // Intentamos reconectar automáticamente si se cae la red
          reconnectTimeout = setTimeout(conectar, 3000); 
        }
      };
      
      ws.onerror = () => { 
        console.warn("⚠️ Pestañeo en el WebSocket, intentando reconectar..."); 
      };
    };

    conectar();

    // Cleanup: Se ejecuta cuando desmontamos el componente o cambiamos de sede
    return () => { 
      unmounted = true; 
      clearTimeout(reconnectTimeout); 
      
      if (ws) {
        // Truco anti-Strict Mode: Si React desmonta muy rápido, esperamos a que conecte para cerrarlo bien
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.onopen = () => ws.close();
        } else {
          ws.close();
        }
      }
    };
  }, [sedeActualId, setMesas, setOrdenesLlevar]); // Dependencias limpias

  return wsRef;
};