'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { ProductoStock, reemplazarStockMasivo, agregarStockMasivo } from '../actions';

export default function GestionStockClient() {
  const [datosExcel, setDatosExcel] = useState<ProductoStock[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [nombreArchivo, setNombreArchivo] = useState('');

  const manejarSubida = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const stockProcesado = data.map((row: any) => ({
        material_id: String(row.material_id || row['Material ID'] || row['ID'] || ''),
        descripcion: String(row.descripcion || row['Descripción'] || row['Producto'] || ''),
        stock: Number(row.stock || row['Stock'] || row['Cantidad'] || 0),
        precio_unitario: Number(row.precio_unitario || row['Precio'] || row['Precio Unitario'] || 0),
        marca: row.marca || row['Marca'] || row['Grupo'] || null,
        region: String(row.region || row['Región'] || row['Region'] || 'Lima'),
      })).filter(p => p.material_id && p.descripcion);

      setDatosExcel(stockProcesado);
    };

    reader.readAsBinaryString(file);
  };

  const ejecutarReemplazo = async () => {
    if (datosExcel.length === 0) return alert('No hay datos válidos en el Excel.');
    if (!confirm('⚠️ ESTO BORRARÁ TODO EL STOCK ACTUAL y lo reemplazará con el archivo subido. ¿Estás seguro?')) return;

    setProcesando(true);
    const result = await reemplazarStockMasivo(datosExcel);
    setProcesando(false);

    if (result.exito) {
      alert(`✅ ¡Éxito! Se ha reemplazado toda la base. Total productos: ${datosExcel.length}`);
      setDatosExcel([]);
      setNombreArchivo('');
    } else {
      alert('❌ Error: ' + result.error);
    }
  };

  const ejecutarAcumulacion = async () => {
    if (datosExcel.length === 0) return alert('No hay datos válidos en el Excel.');
    if (!confirm('Se sumará el stock de los productos que ya existen, y se crearán los nuevos. ¿Estás seguro?')) return;

    setProcesando(true);
    const result = await agregarStockMasivo(datosExcel);
    setProcesando(false);

    if (result.exito) {
      alert(`✅ ¡Éxito! Se han actualizado/agregado los registros. Total en Excel: ${datosExcel.length}`);
      setDatosExcel([]);
      setNombreArchivo('');
    } else {
      alert('❌ Error: ' + result.error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
      <div className="mb-6">
        <label className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer block transition-all ${nombreArchivo ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:bg-slate-50'}`}>
          {nombreArchivo ? (
            <>
              <span className="text-4xl mb-2 block">✅</span>
              <p className="text-sm font-bold text-green-700">{nombreArchivo}</p>
              <p className="text-xs text-green-600 mt-1">{datosExcel.length} productos detectados</p>
            </>
          ) : (
            <>
              <span className="text-4xl mb-2 block">📊</span>
              <p className="text-sm font-bold text-slate-700">Subir archivo Excel (.xlsx)</p>
              <p className="text-xs text-slate-500 mt-1">Debe contener columnas: material_id, descripcion, stock, precio_unitario, marca, region</p>
            </>
          )}
          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={manejarSubida} />
        </label>
      </div>

      {datosExcel.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={ejecutarAcumulacion}
            disabled={procesando}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {procesando ? 'Procesando...' : '➕ Acumular Hacia Abajo (Actualizar/Añadir)'}
          </button>
          <button
            onClick={ejecutarReemplazo}
            disabled={procesando}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {procesando ? 'Procesando...' : '⚠️ Reemplazar TODA la Base'}
          </button>
        </div>
      )}

      {datosExcel.length > 0 && (
        <div className="mt-8 border-t border-gray-100 pt-6">
          <h3 className="font-bold text-gray-800 mb-4">Vista Previa de Datos a Procesar (Primeros 5)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Descripción</th>
                  <th className="px-4 py-2">Marca</th>
                  <th className="px-4 py-2">Stock</th>
                  <th className="px-4 py-2">Precio</th>
                  <th className="px-4 py-2">Región</th>
                </tr>
              </thead>
              <tbody>
                {datosExcel.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-2 font-medium">{row.material_id}</td>
                    <td className="px-4 py-2">{row.descripcion}</td>
                    <td className="px-4 py-2">{row.marca}</td>
                    <td className="px-4 py-2 font-bold text-blue-600">{row.stock}</td>
                    <td className="px-4 py-2">S/ {row.precio_unitario}</td>
                    <td className="px-4 py-2">{row.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
