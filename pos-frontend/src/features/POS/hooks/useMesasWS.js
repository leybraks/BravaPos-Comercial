import { useEffect, useRef } from 'react';

export const useMesasWS = (sedeActualId, setMesas, setOrdenesLlevar) => {
  const wsRef = useRef(null);

  useEffect(() => {
    if (!sedeActualId) return;

    let ws = null;
    let reconnectTimeout = null;
    let unmounted = false;

    const conectar = () => {
      if (unmounted) return;
      const token = localStorage.getItem('tablet_token') || localStorage.getItem('access_token');
      
      const baseUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL.replace('http', 'ws');
      
      // ✨ LE INYECTAMOS EL TOKEN AL FINAL DE LA URL
      const wsUrl = `${baseUrl}/ws/salon/${sedeActualId}/?token=${token}`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);

        if (data.type === 'mesa_actualizada') {
          setMesas(prev => prev.map(mesa =>
            mesa.id === data.mesa_id
              ? { ...mesa, estado: data.estado, totalConsumido: data.total ?? mesa.totalConsumido }
              : mesa
          ));
        }

        if (data.type === 'orden_llevar_actualizada') {
          const orden = data.orden;
          setOrdenesLlevar(prev => {
            if (data.accion === 'nueva') return [orden, ...prev].slice(0, 10);
            if (data.accion === 'completada') return prev.filter(o => o.id !== orden.id);
            if (data.accion === 'actualizada') return prev.map(o => o.id === orden.id ? orden : o);
            return prev;
          });
        }
      };

      ws.onclose = () => { if (!unmounted) reconnectTimeout = setTimeout(conectar, 3000); };
      ws.onerror = () => { console.warn("Pestañeo en el WebSocket de mesas..."); };
    };

    conectar();

    return () => {
      unmounted = true;
      clearTimeout(reconnectTimeout);
      if (ws) {
        if (ws.readyState === WebSocket.CONNECTING) ws.onopen = () => ws.close();
        else ws.close();
      }
    };
  }, [sedeActualId, setMesas, setOrdenesLlevar]);

  return wsRef;
};