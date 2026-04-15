'use client';

import { useState } from 'react';
import { obtenerStockPorRegion, ProductoStock } from './actions';

interface ItemCarrito {
  material_id: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

export default function Home() {
  const [regionSeleccionada, setRegionSeleccionada] = useState<string | null>(null);
  const [stockReal, setStockReal] = useState<ProductoStock[]>([]);
  const [cargando, setCargando] = useState(false);
  
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  const [pantalla, setPantalla] = useState<'catalogo' | 'checkout'>('catalogo');

  const [comprobante, setComprobante] = useState<File | null>(null);
  
  const [datosVenta, setDatosVenta] = useState({
    nombre: '',
    agencia: '',
    correo: '',
    codigoEmpleado: ''
  });

  const cargarDatos = async (region: string) => {
    setRegionSeleccionada(region);
    setCargando(true);
    setCarrito([]); 
    setMostrarCarrito(false);
    setPantalla('catalogo');
    setComprobante(null);
    setDatosVenta({ nombre: '', agencia: '', correo: '', codigoEmpleado: '' });
    try {
      const datos = await obtenerStockPorRegion(region);
      setStockReal(datos);
    } catch (error) {
      console.error("Error al cargar", error);
    } finally {
      setCargando(false);
    }
  };

  const actualizarCantidad = (producto: ProductoStock, cambio: number) => {
    setCarrito((carritoActual) => {
      const itemExistente = carritoActual.find(item => item.material_id === producto.material_id);
      if (itemExistente) {
        const nuevaCantidad = itemExistente.cantidad + cambio;
        if (nuevaCantidad > producto.stock) return carritoActual;
        if (nuevaCantidad <= 0) return carritoActual.filter(item => item.material_id !== producto.material_id);
        return carritoActual.map(item => item.material_id === producto.material_id ? { ...item, cantidad: nuevaCantidad } : item);
      } else {
        if (cambio > 0) {
          return [...carritoActual, { material_id: producto.material_id, descripcion: producto.descripcion, cantidad: 1, precio_unitario: Number(producto.precio_unitario) }];
        }
        return carritoActual;
      }
    });
  };

  const manejarCambioInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDatosVenta(prev => ({ ...prev, [name]: value }));
  };

  const procesarPedido = () => {
    const pedidoId = `PED-${Math.floor(Math.random() * 1000000000)}`;
    const fechaActual = new Date();
    const fecha = fechaActual.toLocaleDateString('es-PE');
    const hora = fechaActual.toLocaleTimeString('es-PE', { hour12: false });

    console.log("=== ENVIANDO A BASE DE DATOS / GOOGLE SHEETS ===");
    carrito.forEach(item => {
      console.log({
        PEDIDO_ID: pedidoId,
        FECHA: fecha,
        HORA: hora,
        NOMBRE: datosVenta.nombre,
        AGENCIA: datosVenta.agencia,
        CORREO: datosVenta.correo,
        CODIGO: item.material_id,
        DESCRIPCION: item.descripcion,
        CANTIDAD: item.cantidad,
        PRECIO: item.precio_unitario,
        TOTAL: item.cantidad * item.precio_unitario,
        ESTADO: "PAGADO",
        CODIGO_EMPLEADO: datosVenta.codigoEmpleado
      });
    });
    alert("¡Pedido Registrado con Éxito! Revisa la consola (F12) para ver el formato de datos.");
  };

  const totalPagar = carrito.reduce((suma, item) => suma + (item.cantidad * item.precio_unitario), 0);

  const productosBodeguita = stockReal.filter(p => p.grupo === 'La Bodeguita');
  const productosMore = stockReal.filter(p => p.grupo === 'More');
  const productosDiageo = stockReal.filter(p => p.grupo === 'DIAGEO');

  // ==========================================
  // VISTA 1: EL NUEVO DISEÑO DEL PORTAL CBC
  // ==========================================
  if (!regionSeleccionada) {
    return (
      <main className="min-h-screen bg-slate-50">
        {/* Cabecera Corporativa */}
        <header className="bg-white shadow-sm flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-slate-200 rounded-full flex items-center justify-center bg-white p-1">
               {/* Asumo que tu logo se llama logo.png y está en public/ */}
               <img src="/logo.png" alt="CBC" className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 leading-tight text-lg">Sistema de Pedidos</h1>
              <p className="text-xs text-slate-500">Portal de Trabajadores</p>
            </div>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 shadow-sm border border-slate-200">
            🛒
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Hero Banner CBC */}
          <div className="bg-[#0b132b] rounded-[2rem] p-10 md:p-16 flex flex-col md:flex-row items-center justify-between relative overflow-hidden shadow-2xl mb-12">
             
             {/* Texto del Banner */}
             <div className="z-10 text-left max-w-lg mb-10 md:mb-0">
               <span className="inline-flex items-center gap-2 bg-blue-900/40 text-blue-100 text-xs font-bold px-4 py-2 rounded-full mb-6 border border-blue-800/50 backdrop-blur-sm">
                 <span className="text-white">🛡️</span> Uso Exclusivo Interno
               </span>
               <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
                 CBC <span className="text-[#00b4d8]">Perú</span>
               </h2>
               <p className="text-slate-300 text-lg leading-relaxed">
                 Realiza solicitudes de distribución e inventario de manera rápida, conectada a nuestra base de datos Postgres.
               </p>
             </div>

             {/* Circulo y Logo Derecho */}
             <div className="z-10 relative">
               {/* Flechita decorativa del carrusel */}
               <div className="absolute -left-16 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center text-white backdrop-blur-md hidden md:flex">
                 ‹
               </div>
               <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md hidden md:flex">
                 ›
               </div>

               <div className="w-64 h-64 md:w-80 md:h-80 bg-[#162244] rounded-full flex items-center justify-center p-6 shadow-2xl">
                 <div className="w-full h-full bg-white rounded-full flex items-center justify-center shadow-inner p-10">
                   {/* Logo central */}
                   <img src="/logo.png" alt="CBC Logo Central" className="w-full h-full object-contain" />
                 </div>
               </div>
             </div>
          </div>

          {/* Botones de Selección */}
          <div className="text-center max-w-2xl mx-auto">
             <h3 className="text-2xl font-black text-slate-800 mb-6">Selecciona tu región para comenzar</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => cargarDatos('Lima')}
                  className="bg-white border-2 border-slate-200 hover:border-blue-600 hover:bg-blue-50 text-slate-800 font-bold py-5 px-6 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3 text-lg group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">📍</span> Región Lima
                </button>
                <button 
                  onClick={() => cargarDatos('Norte')}
                  className="bg-white border-2 border-slate-200 hover:border-emerald-600 hover:bg-emerald-50 text-slate-800 font-bold py-5 px-6 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-3 text-lg group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">📍</span> Región Norte
                </button>
             </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // VISTA DE CARGA
  // ==========================================
  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium animate-pulse">Sincronizando con la nube...</p>
      </main>
    );
  }

  // ==========================================
  // VISTA 3: EL CHECKOUT (FORMULARIO EXCEL)
  // ==========================================
  if (pantalla === 'checkout') {
    return (
      <main className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => setPantalla('catalogo')}
            className="mb-6 text-slate-500 hover:text-slate-800 font-bold transition-colors"
          >
            ← Volver al catálogo
          </button>

          <h1 className="text-3xl font-black text-slate-800 mb-8">Registro de Venta</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
              <h2 className="font-bold text-lg mb-4 text-slate-800 border-b pb-2">Detalle del Pedido</h2>
              
              <div className="flex flex-col gap-6 mb-6 overflow-y-auto pr-2 flex-1">
                {carrito.map(item => (
                  <div key={item.material_id} className="flex justify-between items-start border-b border-slate-50 pb-4">
                    <div className="flex-1 pr-4">
                      <p className="font-bold text-slate-800 text-sm mb-1 leading-tight">{item.descripcion}</p>
                      <p className="text-xs font-mono text-slate-400 mb-2">ID: {item.material_id}</p>
                      
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-md text-xs border border-blue-100">
                          {item.cantidad} und
                        </span>
                        <span className="text-slate-400 text-xs">x</span>
                        <span className="text-slate-700 font-bold text-sm bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          S/ {item.precio_unitario.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="font-black text-slate-800 text-lg mt-1 whitespace-nowrap">
                      S/ {(item.cantidad * item.precio_unitario).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-slate-200 pt-6 flex justify-between items-end mt-auto">
                <span className="text-slate-500 font-bold text-lg">Total Final:</span>
                <span className="text-4xl font-black text-green-600">S/ {totalPagar.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-5">
              <h2 className="font-bold text-lg text-slate-800 border-b pb-2 mb-2">Datos del Vendedor / Cliente</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nombre Completo</label>
                  <input 
                    type="text" name="nombre" value={datosVenta.nombre} onChange={manejarCambioInput}
                    placeholder="Ej: Maricielo Aguilar"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Agencia / Sala</label>
                  <input 
                    type="text" name="agencia" value={datosVenta.agencia} onChange={manejarCambioInput}
                    placeholder="Ej: Sala Ventas Lim"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Código Empleado</label>
                  <input 
                    type="text" name="codigoEmpleado" value={datosVenta.codigoEmpleado} onChange={manejarCambioInput}
                    placeholder="Ej: 605683"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Correo Electrónico</label>
                  <input 
                    type="email" name="correo" value={datosVenta.correo} onChange={manejarCambioInput}
                    placeholder="Ej: usuario@empresa.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              <div className="mt-2">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Comprobante de Pago</label>
                <label className={`border-2 border-dashed rounded-xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer block ${comprobante ? 'border-green-400 bg-green-50/30' : 'border-slate-300'}`}>
                  {comprobante ? (
                    <>
                      <span className="text-3xl mb-1 block">✅</span>
                      <p className="text-sm text-green-700 font-bold truncate px-4">{comprobante.name}</p>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl mb-1 block">📸</span>
                      <p className="text-sm text-slate-600 font-bold">Subir Yape / Transferencia</p>
                    </>
                  )}
                  <input 
                    type="file" accept="image/*" className="hidden" 
                    onChange={(e) => { if (e.target.files && e.target.files[0]) setComprobante(e.target.files[0]); }}
                  />
                </label>
              </div>

              <button 
                onClick={procesarPedido}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition-all mt-auto text-lg"
              >
                Confirmar y Registrar Venta ✓
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // VISTA 2: EL CATÁLOGO 
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setRegionSeleccionada(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              ← Volver
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Catálogo CBC</h1>
              <p className="text-sm text-blue-600 font-semibold">📍 Región {regionSeleccionada}</p>
            </div>
          </div>
          
          <button onClick={() => setMostrarCarrito(true)} className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 hover:shadow-md ${totalPagar > 0 ? 'bg-green-100 text-green-800 scale-105 shadow-sm' : 'bg-blue-100 text-blue-800'}`}>
            <span>🛒</span> <span>S/ {totalPagar.toFixed(2)}</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {productosBodeguita.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2"><span className="bg-orange-100 text-orange-600 p-2 rounded-lg text-sm">🏪</span> La Bodeguita</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {productosBodeguita.map((prod) => <TarjetaProducto key={prod.material_id} producto={prod} carrito={carrito} onActualizar={actualizarCantidad} />)}
            </div>
          </div>
        )}
        {productosMore.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2"><span className="bg-purple-100 text-purple-600 p-2 rounded-lg text-sm">🍬</span> Gomitas More</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {productosMore.map((prod) => <TarjetaProducto key={prod.material_id} producto={prod} carrito={carrito} onActualizar={actualizarCantidad} />)}
            </div>
          </div>
        )}
        {productosDiageo.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2"><span className="bg-amber-100 text-amber-600 p-2 rounded-lg text-sm">🥃</span> Licores Diageo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {productosDiageo.map((prod) => <TarjetaProducto key={prod.material_id} producto={prod} carrito={carrito} onActualizar={actualizarCantidad} />)}
            </div>
          </div>
        )}
      </div>

      {mostrarCarrito && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
          <div className="bg-white w-full sm:w-[500px] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h3 className="font-black text-xl text-slate-800">🛒 Tu Pedido</h3>
              <button onClick={() => setMostrarCarrito(false)} className="bg-slate-200 hover:bg-slate-300 text-slate-600 w-8 h-8 rounded-full font-bold flex items-center justify-center transition-colors">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {carrito.length === 0 ? (
                <div className="text-center text-slate-400 py-10">
                  <p className="text-4xl mb-3">📦</p><p className="font-medium">Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {carrito.map((item) => (
                    <div key={item.material_id} className="flex justify-between items-start border-b border-slate-100 pb-4">
                      <div className="flex-1 pr-4">
                        <p className="font-bold text-slate-800 text-sm mb-1 leading-tight">{item.descripcion}</p>
                        <p className="text-xs font-mono text-slate-400 mb-2">ID: {item.material_id}</p>
                        
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-md text-xs border border-blue-100">
                            {item.cantidad} und
                          </span>
                          <span className="text-slate-400 text-xs">x</span>
                          <span className="text-slate-700 font-bold text-sm bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                            S/ {item.precio_unitario.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="font-black text-blue-700 text-lg mt-1 whitespace-nowrap">S/ {(item.cantidad * item.precio_unitario).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-white sm:rounded-b-3xl">
              <div className="flex justify-between items-end mb-4">
                <span className="text-slate-500 font-bold">Total a pagar:</span>
                <span className="text-3xl font-black text-green-600">S/ {totalPagar.toFixed(2)}</span>
              </div>
              <button 
                disabled={carrito.length === 0}
                onClick={() => {
                  setMostrarCarrito(false);
                  setPantalla('checkout');
                }}
                className="w-full bg-slate-900 text-white font-black py-4 rounded-xl disabled:bg-slate-200 disabled:text-slate-400 hover:bg-blue-600 transition-colors shadow-lg"
              >
                Siguiente: Confirmar Pedido →
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function TarjetaProducto({ producto, carrito, onActualizar }: { producto: ProductoStock, carrito: ItemCarrito[], onActualizar: (prod: ProductoStock, cambio: number) => void }) {
  const tieneStock = producto.stock > 0;
  const itemEnCarrito = carrito.find(item => item.material_id === producto.material_id);
  const cantidadPedida = itemEnCarrito ? itemEnCarrito.cantidad : 0;

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all border flex flex-col h-full group ${cantidadPedida > 0 ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{producto.material_id}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded-md ${tieneStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Stock: {producto.stock}</span>
      </div>
      <div className="mt-auto pt-4 border-t border-slate-50">
        <h3 className="font-bold text-slate-800 text-sm mb-3 line-clamp-2 leading-tight">{producto.descripcion}</h3>
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl font-black text-blue-700">S/ {Number(producto.precio_unitario).toFixed(2)}</span>
        </div>
        {!tieneStock ? (
          <button disabled className="w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-400 cursor-not-allowed">Agotado</button>
        ) : cantidadPedida === 0 ? (
          <button onClick={() => onActualizar(producto, 1)} className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all bg-slate-900 text-white hover:bg-blue-600 hover:shadow-lg hover:-translate-y-1">+ Añadir</button>
        ) : (
          <div className="flex items-center justify-between w-full bg-blue-50 rounded-xl overflow-hidden border border-blue-200">
            <button onClick={() => onActualizar(producto, -1)} className="w-1/3 py-3 font-black text-blue-700 hover:bg-blue-200 transition-colors text-lg">-</button>
            <span className="w-1/3 text-center font-black text-blue-900 text-lg">{cantidadPedida}</span>
            <button onClick={() => onActualizar(producto, 1)} disabled={cantidadPedida >= producto.stock} className={`w-1/3 py-3 font-black text-lg transition-colors ${cantidadPedida >= producto.stock ? 'text-blue-300 cursor-not-allowed' : 'text-blue-700 hover:bg-blue-200'}`}>+</button>
          </div>
        )}
      </div>
    </div>
  );
}