'use client';

import { useState } from 'react';
import { obtenerStockPorRegion, ProductoStock, registrarPedido, obtenerVendedores, Vendedor, enviarCorreoConfirmacion } from './actions';

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
  const [guardando, setGuardando] = useState(false);
  
  const [vendedoresBD, setVendedoresBD] = useState<Vendedor[]>([]);
  const [busquedaVendedor, setBusquedaVendedor] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const [datosVenta, setDatosVenta] = useState({
    nombre: '',
    lugar: '', 
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
    setDatosVenta({ nombre: '', lugar: '', correo: '', codigoEmpleado: '' });
    setBusquedaVendedor('');
    
    try {
      const [datosStock, datosVendedores] = await Promise.all([
        obtenerStockPorRegion(region),
        obtenerVendedores()
      ]);
      
      setStockReal(datosStock);
      setVendedoresBD(datosVendedores);
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

  const procesarPedido = async () => {
    if (!datosVenta.nombre || !datosVenta.codigoEmpleado) {
      alert("⚠️ Error: Debes buscar y SELECCIONAR tu nombre de la lista desplegable.");
      return;
    }
    if (!datosVenta.lugar) {
      alert("⚠️ Error: Debes seleccionar un Lugar de la lista.");
      return;
    }

    setGuardando(true);
    const ordenBaseId = `PED-${Math.floor(Math.random() * 1000000)}`;

    try {
      let comprobanteUrl = 'Sin comprobante';

      if (comprobante) {
        const formData = new FormData();
        formData.append('file', comprobante);
        formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
        formData.append('folder', 'comprobantes_cbc');

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );

        if (!uploadRes.ok) throw new Error("No se pudo subir el comprobante");
        const uploadData = await uploadRes.json();
        comprobanteUrl = uploadData.secure_url; 
      }

      for (const item of carrito) {
        const idUnicoFila = `${ordenBaseId}-${item.material_id}`;

        const respuesta = await registrarPedido({
          pedido_id: idUnicoFila,
          nombre_cliente: datosVenta.nombre,
          agencia: datosVenta.lugar,
          correo: datosVenta.correo || 'Sin correo',
          material_id: item.material_id,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precio_total: item.cantidad * item.precio_unitario,
          codigo_empleado: datosVenta.codigoEmpleado,
          comprobante_url: comprobanteUrl, 
        });

        if (!respuesta.exito) throw new Error("Fallo al insertar en la base de datos");
      }

      if (datosVenta.correo) {
        await enviarCorreoConfirmacion({
          nombre: datosVenta.nombre,
          correoDestino: datosVenta.correo,
          pedidoId: ordenBaseId,
          lugar: datosVenta.lugar,
          total: totalPagar,
          items: carrito,
          comprobanteUrl: comprobanteUrl, 
        });
      }

      alert(`✅ ¡Pedido ${ordenBaseId} registrado con éxito!`);

      setCarrito([]);
      setDatosVenta({ nombre: '', lugar: '', correo: '', codigoEmpleado: '' });
      setBusquedaVendedor('');
      setComprobante(null);
      setPantalla('catalogo');

    } catch (error) {
      console.error(error);
      alert("❌ Hubo un error al guardar el pedido. Revisa tu conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const totalPagar = carrito.reduce((suma, item) => suma + (item.cantidad * item.precio_unitario), 0);

  const productosBodeguita = stockReal.filter(p => p.grupo === 'La Bodeguita');
  const productosMore = stockReal.filter(p => p.grupo === 'More');
  const productosDiageo = stockReal.filter(p => p.grupo === 'DIAGEO');

  // VISTA 1: SELECCIÓN DE REGIÓN (LANDING)
  if (!regionSeleccionada) {
    return (
      <main className="min-h-screen overflow-hidden antialiased" style={{background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1b3e 50%, #0a1628 100%)'}}>
        
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;700&display=swap');
          
          body {
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
          }

          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.7; }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-12px); }
          }
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .badge { animation: fadeUp 0.6s ease forwards; opacity: 0; animation-delay: 0.1s; }
          .hero-title { animation: fadeUp 0.7s ease forwards; opacity: 0; animation-delay: 0.25s; }
          .hero-sub { animation: fadeUp 0.7s ease forwards; opacity: 0; animation-delay: 0.4s; }
          .hero-btns { animation: fadeUp 0.7s ease forwards; opacity: 0; animation-delay: 0.55s; }
          .hero-logo { animation: fadeIn 1s ease forwards; opacity: 0; animation-delay: 0.3s; }
          .logo-float { animation: float 5s ease-in-out infinite; }
          .ring-spin { animation: spinSlow 20s linear infinite; }
          .shimmer-text {
            background: linear-gradient(90deg, #06b6d4, #ffffff, #06b6d4, #a78bfa);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 4s linear infinite;
          }
          .card-region {
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .card-region:hover {
            transform: translateY(-6px) scale(1.02);
          }
          .glow-btn {
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
          }
          .glow-btn::before {
            content: '';
            position: absolute;
            top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
            transition: left 0.5s ease;
          }
          .glow-btn:hover::before { left: 100%; }
          .glow-btn:hover { box-shadow: 0 0 30px rgba(6,182,212,0.4); }
        `}</style>

        {/* FONDO ANIMADO */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div style={{
            position: 'absolute', top: '-20%', left: '-10%',
            width: '600px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
            animation: 'pulse 8s ease-in-out infinite'
          }}/>
          <div style={{
            position: 'absolute', bottom: '-10%', right: '-10%',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168,85,247,0.06) 0%, transparent 70%)',
            animation: 'pulse 10s ease-in-out infinite reverse'
          }}/>
        </div>

        {/* HEADER */}
        <header style={{
          position: 'relative', zIndex: 10,
          padding: '20px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src="/logo.png" alt="CBC" style={{width: '28px', height: '28px', objectFit: 'contain'}}/>
            </div>
            <div>
              <p style={{margin: 0, fontSize: '15px', fontWeight: 700, color: '#ffffff', fontFamily: 'Syne, sans-serif'}}>CBC Perú</p>
              <p style={{margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif'}}>Portal Interno</p>
            </div>
          </div>
        </header>

        {/* HERO SECTION */}
        <div style={{
          position: 'relative', zIndex: 5,
          maxWidth: '1200px', margin: '0 auto',
          padding: '80px 32px 60px',
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '60px', alignItems: 'center'
        }}>
          <div>
            <div className="badge" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)',
              borderRadius: '20px', padding: '6px 16px', marginBottom: '28px'
            }}>
              <span style={{fontSize: '12px', fontWeight: 700, color: '#67e8f9', fontFamily: 'DM Sans, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Uso Exclusivo Interno</span>
            </div>

            <h1 className="hero-title" style={{fontFamily: 'Syne, sans-serif', fontSize: '72px', fontWeight: 800, color: '#fff', lineHeight: 1.1, margin: 0}}>CBC</h1>
            <h1 className="hero-title shimmer-text" style={{fontFamily: 'Syne, sans-serif', fontSize: '72px', fontWeight: 800, lineHeight: 1.1, margin: '0 0 24px 0'}}>Perú</h1>

            <p className="hero-sub" style={{fontFamily: 'DM Sans, sans-serif', fontSize: '18px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginBottom: '40px', maxWidth: '440px'}}>
              Gestiona solicitudes de distribución e inventario en tiempo real para las sedes de Lima y Norte.
            </p>

            <div className="hero-btns" style={{display: 'flex', gap: '16px'}}>
              <button onClick={() => cargarDatos('Lima')} className="glow-btn" style={{background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff', border: 'none', padding: '16px 32px', borderRadius: '14px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px'}}>📍 Región Lima</button>
              <button onClick={() => cargarDatos('Norte')} className="card-region" style={{background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 32px', borderRadius: '14px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '16px'}}>📍 Región Norte</button>
            </div>
          </div>

          <div className="hero-logo" style={{display: 'flex', justifyContent: 'center'}}>
             <div className="logo-float" style={{position: 'relative', width: '300px', height: '300px'}}>
                <div className="ring-spin" style={{position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(6,182,212,0.3)'}} />
                <div style={{position: 'absolute', inset: '30px', background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(6,182,212,0.3)'}}>
                  <img src="/logo.png" alt="Logo" style={{width: '60%'}} />
                </div>
             </div>
          </div>
        </div>

        {/* BARRA INFERIOR */}
        <div style={{maxWidth: '1200px', margin: '0 auto', padding: '40px 32px', display: 'flex', gap: '20px'}}>
            {[
              {icon: '⚡', title: 'Tiempo Real', desc: 'Stock actualizado al instante'},
              {icon: '🔒', title: 'Seguro', desc: 'Acceso por código de empleado'},
              {icon: '📧', title: 'Confirmación', desc: 'Correo automático al registrar'}
            ].map(f => (
              <div key={f.title} style={{flex: 1, background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{fontSize: '24px', marginBottom: '12px'}}>{f.icon}</div>
                <h3 style={{color: '#fff', fontFamily: 'Syne, sans-serif', margin: '0 0 8px 0', fontSize: '16px'}}>{f.title}</h3>
                <p style={{color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', margin: 0}}>{f.desc}</p>
              </div>
            ))}
        </div>
      </main>
    );
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium animate-pulse">Sincronizando con la nube...</p>
      </main>
    );
  }

  // VISTA 2: FORMULARIO DE CHECKOUT
  if (pantalla === 'checkout') {
    return (
      <main className="min-h-screen bg-slate-50 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => setPantalla('catalogo')} className="mb-6 text-slate-500 hover:text-slate-800 font-bold transition-colors">
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
                      <div className="flex items-center gap-2">
                        <span className="bg-blue-50 text-blue-700 font-bold px-2 py-1 rounded-md text-xs">{item.cantidad} und</span>
                        <span className="text-slate-700 font-bold text-sm">S/ {item.precio_unitario.toFixed(2)}</span>
                      </div>
                    </div>
                    <p className="font-black text-slate-800 text-lg">S/ {(item.cantidad * item.precio_unitario).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 pt-6 flex justify-between items-end">
                <span className="text-slate-500 font-bold text-lg">Total Final:</span>
                <span className="text-4xl font-black text-green-600">S/ {totalPagar.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col gap-5 relative">
              <h2 className="font-bold text-lg text-slate-800 border-b pb-2 mb-2">Datos del Trabajador</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 relative">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nombre Completo</label>
                  <input 
                    type="text" 
                    value={busquedaVendedor} 
                    onFocus={() => setMostrarSugerencias(true)}
                    onChange={(e) => {
                      setBusquedaVendedor(e.target.value);
                      setMostrarSugerencias(true);
                      setDatosVenta(prev => ({ ...prev, nombre: '', codigoEmpleado: '' }));
                    }} 
                    placeholder="Escribe tu nombre para buscar..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                  />
                  {datosVenta.nombre && <span className="absolute right-3 top-9 text-green-500 font-bold text-sm bg-white px-2 py-1">✓ Seleccionado</span>}

                  {mostrarSugerencias && busquedaVendedor.length > 0 && !datosVenta.nombre && (
                    <ul className="absolute z-50 w-full bg-white border border-slate-200 mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                      {vendedoresBD
                        .filter(v => v.nombre_completo.toLowerCase().includes(busquedaVendedor.toLowerCase()))
                        .slice(0, 10)
                        .map(v => (
                          <li key={v.codigo_empleado} onClick={() => {
                              setBusquedaVendedor(v.nombre_completo);
                              setDatosVenta(prev => ({ ...prev, nombre: v.nombre_completo, codigoEmpleado: v.codigo_empleado }));
                              setMostrarSugerencias(false);
                            }}
                            className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                          >
                            <div className="font-bold text-slate-700">{v.nombre_completo}</div>
                            <div className="text-xs text-slate-500">Cód: {v.codigo_empleado}</div>
                          </li>
                        ))
                      }
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Lugar</label>
                  <select name="lugar" value={datosVenta.lugar} onChange={manejarCambioInput} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 outline-none">
                    <option value="">Seleccione...</option>
                    <option value="Sala de ventas Norte (Callao)">Sala de ventas Norte (Callao)</option>
                    <option value="Sala de ventas Sur (Chorrillos)">Sala de ventas Sur (Chorrillos)</option>
                    <option value="Cromo (San isidro)">Cromo (San isidro)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Código</label>
                  <input type="text" value={datosVenta.codigoEmpleado} readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-3 font-bold text-blue-600" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Correo para confirmación</label>
                  <input type="email" name="correo" value={datosVenta.correo} onChange={manejarCambioInput} placeholder="usuario@empresa.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 outline-none" />
                </div>
              </div>

              <div className="mt-2">
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Comprobante de Pago</label>
                <label className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer block ${comprobante ? 'border-green-400 bg-green-50' : 'border-slate-300'}`}>
                  {comprobante ? <p className="text-sm text-green-700 font-bold truncate">✓ {comprobante.name}</p> : <p className="text-sm text-slate-600">📸 Subir Foto de Comprobante</p>}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files && e.target.files[0]) setComprobante(e.target.files[0]); }} />
                </label>
              </div>

              <button onClick={procesarPedido} disabled={guardando} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black py-4 rounded-xl shadow-lg transition-all mt-4 text-lg">
                {guardando ? 'Sincronizando...' : 'Confirmar Venta ✓'}
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // VISTA 3: EL CATÁLOGO
  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setRegionSeleccionada(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">← Volver</button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Catálogo CBC</h1>
              <p className="text-sm text-blue-600 font-semibold">📍 Región {regionSeleccionada}</p>
            </div>
          </div>
          <button onClick={() => setMostrarCarrito(true)} className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${totalPagar > 0 ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
            <span>🛒 S/ {totalPagar.toFixed(2)}</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {productosBodeguita.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">🏪 La Bodeguita</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {productosBodeguita.map((prod) => <TarjetaProducto key={prod.material_id} producto={prod} carrito={carrito} onActualizar={actualizarCantidad} />)}
            </div>
          </div>
        )}
        {productosMore.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">🍬 Gomitas More</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {productosMore.map((prod) => <TarjetaProducto key={prod.material_id} producto={prod} carrito={carrito} onActualizar={actualizarCantidad} />)}
            </div>
          </div>
        )}
        {productosDiageo.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">🥃 Licores Diageo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {productosDiageo.map((prod) => <TarjetaProducto key={prod.material_id} producto={prod} carrito={carrito} onActualizar={actualizarCantidad} />)}
            </div>
          </div>
        )}
      </div>

      {mostrarCarrito && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full sm:w-[450px] rounded-3xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h3 className="font-black text-xl text-slate-800">🛒 Carrito</h3>
              <button onClick={() => setMostrarCarrito(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {carrito.map((item) => (
                <div key={item.material_id} className="flex justify-between items-center mb-4 pb-4 border-b border-slate-50">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{item.descripcion}</p>
                    <p className="text-xs text-blue-600 font-bold">{item.cantidad} und x S/ {item.precio_unitario.toFixed(2)}</p>
                  </div>
                  <p className="font-black text-slate-800">S/ {(item.cantidad * item.precio_unitario).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="p-6 border-t">
              <div className="flex justify-between mb-4">
                <span className="font-bold">Total:</span>
                <span className="text-2xl font-black text-green-600">S/ {totalPagar.toFixed(2)}</span>
              </div>
              <button onClick={() => { setMostrarCarrito(false); setPantalla('checkout'); }} className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg">Registrar Venta →</button>
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
    <div className={`bg-white rounded-2xl p-5 shadow-sm border transition-all h-full flex flex-col ${cantidadPedida > 0 ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{producto.material_id}</span>
        <span className={`text-xs font-bold px-2 py-1 rounded-md ${tieneStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Stock: {producto.stock}</span>
      </div>
      <div className="mt-auto">
        <h3 className="font-bold text-slate-800 text-sm mb-4 leading-tight h-10 line-clamp-2">{producto.descripcion}</h3>
        <p className="text-2xl font-black text-blue-700 mb-4">S/ {Number(producto.precio_unitario).toFixed(2)}</p>
        
        {!tieneStock ? (
          <button disabled className="w-full py-3 rounded-xl font-bold bg-slate-100 text-slate-400">Agotado</button>
        ) : cantidadPedida === 0 ? (
          <button onClick={() => onActualizar(producto, 1)} className="w-full py-3 rounded-xl font-bold bg-slate-900 text-white hover:bg-blue-600 transition-colors">+ Añadir</button>
        ) : (
          <div className="flex items-center justify-between w-full bg-blue-50 rounded-xl overflow-hidden border border-blue-200">
            <button onClick={() => onActualizar(producto, -1)} className="w-1/3 py-3 font-black text-blue-700 hover:bg-blue-100">-</button>
            <span className="w-1/3 text-center font-black text-blue-900">{cantidadPedida}</span>
            <button onClick={() => onActualizar(producto, 1)} disabled={cantidadPedida >= producto.stock} className="w-1/3 py-3 font-black text-blue-700 hover:bg-blue-100">+</button>
          </div>
        )}
      </div>
    </div>
  );
}