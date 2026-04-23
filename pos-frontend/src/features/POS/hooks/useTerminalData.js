import { useState, useEffect } from 'react';
import { getMesas, getOrdenes, getSedes, getNegocio } from '../../../api/api';

export const useTerminalData = (sedeActualId, triggerRecarga, setConfiguracionGlobal) => {
  const [sedes, setSedes] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [ordenesLlevar, setOrdenesLlevar] = useState([]);
  const [todasLasOrdenesActivas, setTodasLasOrdenesActivas] = useState([]);
  const [vistaLocal, setVistaLocal] = useState(null); // null = cargando
  const [modulos, setModulos] = useState({ salon: true, delivery: true, cocina: true });

  // 1. Carga inicial de Configuración del Negocio
  useEffect(() => {
    let isMounted = true;
    const initNegocio = async () => {
      try {
        const negocioId = localStorage.getItem('negocio_id') || 1;
        const { data } = await getNegocio(negocioId);
        if (!isMounted) return;

        const mods = {
          salon: data.mod_salon_activo !== false,
          delivery: data.mod_delivery_activo !== false,
          cocina: data.mod_cocina_activo !== false,
        };
        setModulos(mods);

        if (setConfiguracionGlobal) {
          setConfiguracionGlobal({
            colorPrimario: data.color_primario || '#ff5a1f',
            temaFondo: data.tema_fondo || 'dark',
            modulos: mods,
          });
        }

        if (mods.salon) setVistaLocal('salon');
        else if (mods.delivery) setVistaLocal('llevar');
        else setVistaLocal('fastfood');
      } catch {
        if (isMounted) setVistaLocal('salon');
      }
    };
    initNegocio();
    return () => { isMounted = false; };
  }, [setConfiguracionGlobal]);

  // 2. Carga de datos del Salón (Sedes, Mesas, Órdenes)
  useEffect(() => {
    if (!sedeActualId) return;
    let isMounted = true;

    const cargarSalon = async () => {
      try {
        const [resMesas, resOrdenes, resSedes] = await Promise.all([
          getMesas({ sede_id: sedeActualId }),
          getOrdenes({ sede_id: sedeActualId }),
          getSedes(),
        ]);
        
        if (!isMounted) return;
        setSedes(resSedes.data);

        const ordenesVivas = resOrdenes.data.filter(
          (o) => o.estado !== 'completado' && o.estado !== 'cancelado' && o.estado_pago !== 'pagado'
        );
        
        setTodasLasOrdenesActivas(ordenesVivas);
        setOrdenesLlevar(
          resOrdenes.data
            .filter((o) => o.tipo === 'llevar' && o.estado !== 'completado' && o.estado !== 'cancelado')
            .reverse()
            .slice(0, 10)
        );

        setMesas(
          resMesas.data.map((m) => {
            const orden = ordenesVivas.find((o) => o.mesa !== null && (o.mesa === m.id || o.mesa === m.mesa_principal));
            return {
              id: m.id,
              numero: m.numero_o_nombre || m.id,
              estado: m.mesa_principal ? 'unida' : orden ? 'ocupada' : 'libre',
              unida_a: m.mesa_principal || null,
              capacidad: m.capacidad || 4,
              totalConsumido: orden ? parseFloat(orden.total) : 0,
              posicion_x: m.posicion_x,
              posicion_y: m.posicion_y,
            };
          })
        );
      } catch (e) {
        console.error('Error cargando el salón:', e);
      }
    };

    cargarSalon();
    return () => { isMounted = false; };
  }, [triggerRecarga, sedeActualId]);

  return { sedes, mesas, setMesas, ordenesLlevar, setOrdenesLlevar, todasLasOrdenesActivas, vistaLocal, setVistaLocal, modulos };
};