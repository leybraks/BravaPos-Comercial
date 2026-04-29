import { useEffect, useRef } from 'react';

// ✨ Agregamos setSolicitudesBot al final de los parámetros
export const useTerminalWS = (sedeActualId, setMesas, setOrdenesLlevar, setSolicitudesBot) => {
  const wsRef = useRef(null);

  useEffect(() => {
    if (!sedeActualId) return;

    let ws = null;
    let reconnectTimeout = null;
    let unmounted = false;

    const conectar = () => {
      if (unmounted) return;

      const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const baseUrl = import.meta.env.VITE_WS_URL || apiUrl.replace('https://', 'wss://').replace('http://', 'ws://');
      
      const wsUrl = `${baseUrl}/ws/salon/${sedeActualId}/`;
      
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`✅ WebSocket Salón conectado (Sede ${sedeActualId})`);
      };

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          if (data.type === 'conexion_exitosa') {
            console.log(data.mensaje);
          }

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

          // ====================================================
          // 🤖 ✨ NUEVO: RECEPTOR DE LA ALERTA DEL BOT
          // ====================================================
          if (data.type === 'solicitud_cambio_nueva') {
            console.log('🤖 Solicitud del Bot recibida en Terminal:', data);
            
            if (setSolicitudesBot) {
              setSolicitudesBot(prev => {
                // Evita que la misma alerta se duplique si el WebSocket parpadea
                if (prev.some(s => s.solicitud_id === data.solicitud_id)) return prev;
                return [data, ...prev];
              });
            }

            // Opcional: Sonido para alertar al cajero (asegúrate de tener el archivo o comenta esta línea)
            try {
              new Audio('/assets/sounds/notification.mp3').play().catch(() => {});
            } catch (err) {}
          }

          if (data.type === 'error') {
            console.error('🛑 Django rechazó la conexión:', data.mensaje);
          }

        } catch (err) {
          console.warn('⚠️ Mensaje WebSocket no válido', err);
        }
      };

      ws.onclose = (e) => {
        if (e.code === 4001 || e.code === 4003) {
          console.error(`🔒 WebSocket cerrado por seguridad (Código ${e.code}). No se reconectará.`);
          return;
        }
        if (!unmounted) reconnectTimeout = setTimeout(conectar, 3000);
      };

      ws.onerror = () => {
        console.warn('⚠️ Error de red en WebSocket, intentando reconectar...');
      };
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
  // ✨ Agregamos setSolicitudesBot a las dependencias
  }, [sedeActualId, setMesas, setOrdenesLlevar, setSolicitudesBot]);

  return wsRef;
};