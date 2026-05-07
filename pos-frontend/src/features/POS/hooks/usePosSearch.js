import { useState, useMemo } from 'react';

export const usePosSearch = (productosBase, categoriasReales, modificadoresGlobales) => {
  const [busqueda, setBusqueda] = useState('');
  const [inputBusquedaActivo, setInputBusquedaActivo] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  
  // El "Cerebro" que recuerda qué escoge la gente
  const [cerebroBusqueda, setCerebroBusqueda] = useState(() => {
    const memoria = localStorage.getItem('pos_cerebro');
    return memoria ? JSON.parse(memoria) : {};
  });

  const aprenderSeleccion = (productoId, termino) => {
    if (!termino || termino.trim().length < 2) return; 
    const terminoLower = termino.trim().toLowerCase();

    setCerebroBusqueda(prev => {
      const nuevoCerebro = { ...prev };
      if (!nuevoCerebro[terminoLower]) nuevoCerebro[terminoLower] = {};
      nuevoCerebro[terminoLower][productoId] = (nuevoCerebro[terminoLower][productoId] || 0) + 1;
      localStorage.setItem('pos_cerebro', JSON.stringify(nuevoCerebro));
      return nuevoCerebro;
    });
  };

  // useMemo evita que este cálculo pesado se haga en CADA mini-render
  const productosFiltrados = useMemo(() => {
    return productosBase
      .filter(plato => {
        const nombreCatDelPlato = categoriasReales.find(c => String(c.id) === String(plato.categoria))?.nombre || plato.categoria;
        const pasaCategoria = (categoriaActiva === 'Todas' || categoriaActiva === 'Todos') || nombreCatDelPlato === categoriaActiva;
        const termino = busqueda.trim().toLowerCase();
        const pasaNombre = busqueda === '' || plato.nombre.toLowerCase().includes(termino);
        
        const modificadoresDelPlato = modificadoresGlobales.filter(m => String(m.producto_id) === String(plato.id) || String(m.producto) === String(plato.id));
        const variacionCoincidente = modificadoresDelPlato.find(m => m.nombre.toLowerCase().includes(termino));
        
        const pasaVariacion = busqueda !== '' && !!variacionCoincidente;

        if (pasaVariacion && !pasaNombre) {
          plato._coincidenciaVariacion = variacionCoincidente.nombre;
        } else {
          plato._coincidenciaVariacion = null;
        }

        return pasaCategoria && (pasaNombre || pasaVariacion);
      })
      .sort((a, b) => {
        if (busqueda.trim().length >= 2) {
          const termino = busqueda.trim().toLowerCase();
          const scoreA = cerebroBusqueda[termino]?.[a.id] || 0;
          const scoreB = cerebroBusqueda[termino]?.[b.id] || 0;
          if (scoreA !== scoreB) return scoreB - scoreA; 
        }
        return 0; 
      });
  }, [productosBase, categoriasReales, categoriaActiva, busqueda, modificadoresGlobales, cerebroBusqueda]);

  return {
    busqueda,
    setBusqueda,
    inputBusquedaActivo,
    setInputBusquedaActivo,
    categoriaActiva,
    setCategoriaActiva,
    aprenderSeleccion,
    productosFiltrados
  };
};