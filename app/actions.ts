'use server';

import { sql } from '@vercel/postgres';

export interface ProductoStock {
  material_id: string;
  descripcion: string;
  stock: number;
  precio_unitario: number;
  grupo: string | null;
  region: string;
}

export async function obtenerStockPorRegion(region: string): Promise<ProductoStock[]> {
  // 1. Chismosos para ver si Next.js está ciego
  console.log("====== INICIANDO CONSULTA ======");
  console.log("1. Región solicitada:", region);
  console.log("2. ¿La llave existe?:", process.env.POSTGRES_URL ? "SÍ ✅" : "NO ❌ (Aquí está el error)");

  // 2. Ejecutamos SIN try/catch para que el error explote y lo podamos ver
  const { rows } = await sql<ProductoStock>`
    SELECT * FROM stock_disponible 
    WHERE region = ${region}
    ORDER BY descripcion ASC;
  `;
  
  console.log("3. Productos encontrados:", rows.length);
  return rows;
}