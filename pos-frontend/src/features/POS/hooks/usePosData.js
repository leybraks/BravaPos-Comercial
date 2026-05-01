import { useState, useEffect } from 'react';
import { getProductos, getCategorias, getModificadores, getOrdenes } from '../../../api/api'; 

export const usePosData = (sedeActualId, mesaId, vaciarStore) => {
  const [productosBase, setProductosBase] = useState([]);
  const [categoriasReales, setCategoriasReales] = useState([]);
  const [modificadoresGlobales, setModificadoresGlobales] = useState([]);
  const [ordenActiva, setOrdenActiva] = useState(null);
  
  // Arranca en true para mostrar el loader desde el primer milisegundo
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Envolvemos ABSOLUTAMENTE TODO dentro de la función asíncrona
    const fetchData = async () => {
      // 1. Si no hay sede, quitamos el loading y cortamos la ejecución
      if (!sedeActualId) {
        if (isMounted) setCargando(false);
        return;
      }
      
      // 2. Activamos el loading explícitamente antes de llamar a la API
      if (isMounted) setCargando(true);

      try {
        const [responseProductos, responseCategorias, responseMods, responseOrdenes] = await Promise.all([
            getProductos({ sede_id: sedeActualId }),
            getCategorias(),
            getModificadores(),
            getOrdenes({ sede_id: sedeActualId })
        ]);

        // Si el usuario salió del componente, no intentamos actualizar estados
        if (!isMounted) return;

        const dataFormateada = responseProductos.data.map(p => ({
          ...p, 
          id: p.id, 
          nombre: p.nombre, 
          precio: parseFloat(p.precio_base), 
          categoria: p.categoria
        }));
        
        setProductosBase(dataFormateada);
        setCategoriasReales(responseCategorias.data);
        setModificadoresGlobales(responseMods.data);

        const ordenViva = responseOrdenes.data.find(o => 
            String(o.mesa) === String(mesaId) && 
            o.estado !== 'completado' && 
            o.estado !== 'cancelado' &&
            o.estado_pago !== 'pagado'
        );
        
        setOrdenActiva(ordenViva || null);
        vaciarStore(); 

      } catch (error) {
        console.error("Error al cargar datos del POS:", error);
      } finally {
        // Al terminar (ya sea éxito o error), quitamos el loader
        if (isMounted) {
          setCargando(false);
        }
      }
    };

    // Ejecutamos la función
    fetchData();

    // Limpieza (cleanup) del useEffect
    return () => {
      isMounted = false;
    };
  }, [sedeActualId, mesaId, vaciarStore]); 

  return {
    productosBase,
    categoriasReales,
    modificadoresGlobales,
    ordenActiva,
    setOrdenActiva,
    cargando
  };
};