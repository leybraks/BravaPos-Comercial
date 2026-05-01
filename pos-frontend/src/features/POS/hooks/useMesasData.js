import { useState, useEffect } from 'react';
import { getMesas, getOrdenes, getSedes, getNegocio } from '../../../api/api';

export const useMesasData = (sedeActualId, triggerRecarga, setConfiguracionGlobal) => {
  const [sedes, setSedes] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [ordenesLlevar, setOrdenesLlevar] = useState([]);
  const [vistaLocal, setVistaLocal] = useState(null); // null = cargando
  const [modulos, setModulos] = useState({ salon: true, delivery: true, cocina: true });

  // 1. Cargar Configuración del Negocio (Solo una vez)
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
      } catch (error) {
        console.error("Error cargando configuración:", error);
        if (isMounted) setVistaLocal('salon'); // Fallback
      }
    };
    initNegocio();
    return () => { isMounted = false; };
  }, [setConfiguracionGlobal]);

  // 2. Cargar Datos del Salón y Órdenes
  useEffect(() => {
    if (!sedeActualId) return;
    let isMounted = true;

    const cargarSalon = async () => {
      try {
        const [resMesas, resOrdenes, resSedes] = await Promise.all([
          getMesas({ sede_id: sedeActualId }),
          getOrdenes({ sede_id: sedeActualId }),
          getSedes()
        ]);
        
        if (!isMounted) return;
        
        setSedes(resSedes.data);

        const ordenesVivas = resOrdenes.data.filter(o => 
          o.estado !== 'completado' && o.estado !== 'cancelado' && o.estado_pago !== 'pagado'
        );
        
        setOrdenesLlevar(
          resOrdenes.data
            .filter(o => o.tipo === 'llevar' && o.estado !== 'completado' && o.estado !== 'cancelado') 
            .reverse() 
            .slice(0, 10)
        );
        
        setMesas(resMesas.data.map(mesaDB => {
          const ordenDeEstaMesa = ordenesVivas.find(o => 
            o.mesa !== null && (o.mesa === mesaDB.id || o.mesa === mesaDB.mesa_principal)
          );

          let estadoFinal = 'libre';
          if (mesaDB.mesa_principal) estadoFinal = 'unida'; 
          else if (ordenDeEstaMesa) estadoFinal = 'ocupada';

          return {
            id: mesaDB.id,
            numero: mesaDB.numero_o_nombre || mesaDB.id, 
            estado: estadoFinal,
            unida_a: mesaDB.mesa_principal || null,
            capacidad: mesaDB.capacidad || 4,
            totalConsumido: ordenDeEstaMesa ? parseFloat(ordenDeEstaMesa.total) : 0 ,
            posicion_x: mesaDB.posicion_x, 
            posicion_y: mesaDB.posicion_y
          };
        }));
      } catch (error) {
        console.error("Error cargando el salón:", error);
      }
    };

    cargarSalon();
    return () => { isMounted = false; };
  }, [triggerRecarga, sedeActualId]);

  return { sedes, mesas, setMesas, ordenesLlevar, setOrdenesLlevar, vistaLocal, setVistaLocal, modulos };
};