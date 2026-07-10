/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Fee, Need, Transaction } from '../types';

/**
 * Mengambil data dari Google Sheet publik menggunakan Visualisation API (gviz/tq).
 * Tanpa memerlukan API Key karena sheet bertipe "Siapa saja dengan link dapat melihat".
 */
export async function fetchSheetData<T>(
  spreadsheetId: string,
  sheetName: string,
  rowParser: (cols: any[]) => T
): Promise<T[]> {
  let text = '';
  let response;
  
  try {
    // Coba ambil dari backend proxy terlebih dahulu untuk melompati CORS / sandbox restriction
    const proxyUrl = `/api/sheets-data?spreadsheetId=${spreadsheetId}&sheetName=${encodeURIComponent(sheetName)}`;
    response = await fetch(proxyUrl);
    if (response.ok) {
      text = await response.text();
      // JIKA response OK tetapi isinya HTML (berarti diarahkan ke index.html atau halaman error HTML), kita harus throw error agar masuk ke catch fallback
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html') || text.trim().startsWith('<!doctype')) {
        throw new Error("Proxy returned HTML page instead of spreadsheet JSON");
      }
      if (!text.includes('google.visualization.Query.setResponse')) {
        throw new Error("Proxy did not return valid google visualization response");
      }
    } else {
      throw new Error(`Proxy responded with status ${response.status}`);
    }
  } catch (proxyErr) {
    console.warn(`[Proxy Fallback] Gagal melalui proxy backend, mencoba fetch langsung:`, proxyErr);
    // Jalur alternatif jika backend proxy tidak aktif (fallback)
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Gagal mengambil sheet "${sheetName}": HTTP status ${response.status}`);
    }
    text = await response.text();
  }
  // gviz/tq mengembalikan string dalam format: google.visualization.Query.setResponse({...});
  const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);/);
  if (!match) {
    throw new Error(`Format respons Google Sheets tidak valid untuk sheet "${sheetName}"`);
  }
  
  const json = JSON.parse(match[1]);
  if (json.status === 'error') {
    throw new Error(`Google Sheets API Error: ${json.errors?.[0]?.detailed_message || 'Kesalahan tidak diketahui'}`);
  }
  
  const rows = json.table.rows;
  if (!rows || rows.length === 0) {
    return [];
  }
  
  const results: T[] = [];
  
  for (const row of rows) {
    // row.c adalah array cell: { v: value, f: formatted_value }
    if (!row || !row.c) continue;
    
    // Kadang cell bisa null, kita petakan menjadi object nilai sederhana { v, f }
    const mappedCols = row.c.map((cell: any) => {
      if (!cell) return { v: null, f: '' };
      return {
        v: cell.v,
        f: cell.f || (cell.v !== null ? String(cell.v) : '')
      };
    });
    
    try {
      const parsedRow = rowParser(mappedCols);
      if (parsedRow) {
        results.push(parsedRow);
      }
    } catch (err) {
      console.warn(`Gagal memparsing baris pada sheet "${sheetName}":`, err, row);
    }
  }
  
  return results;
}

/**
 * Pemetaan baris dari sheet DATA_SISWA
 * Format: No, Nama Siswa, Jenis Kelamin, Kelas
 */
export function parseStudentRow(cols: any[]): Student | null {
  if (cols.length < 2 || !cols[1]?.v) return null; // Minimal ada nama siswa
  
  const no = typeof cols[0]?.v === 'number' ? cols[0].v : parseInt(cols[0]?.f || '0', 10);
  const namaSiswa = String(cols[1]?.v || '').trim();
  
  const rawJK = String(cols[2]?.v || '').trim().toUpperCase();
  let jenisKelamin = 'L'; // Default
  if (
    rawJK === 'P' || 
    rawJK === 'WANITA' || 
    rawJK === 'W' || 
    rawJK.startsWith('PEREMPUAN')
  ) {
    jenisKelamin = 'P';
  } else if (
    rawJK === 'L' || 
    rawJK === 'PRIA' || 
    rawJK.startsWith('LAKI')
  ) {
    jenisKelamin = 'L';
  } else if (rawJK.startsWith('P') && !rawJK.startsWith('PR')) {
    jenisKelamin = 'P';
  }

  const kelas = String(cols[3]?.v || cols[3]?.f || '').trim();
  
  return { no, namaSiswa, jenisKelamin, kelas };
}

/**
 * Pemetaan baris dari sheet BESARAN_BIAYA
 * Format: No, Jenis, Biaya
 */
export function parseFeeRow(cols: any[]): Fee | null {
  if (cols.length < 2 || !cols[1]?.v) return null; // Minimal ada nama biaya/jenis
  
  const no = typeof cols[0]?.v === 'number' ? cols[0].v : parseInt(cols[0]?.f || '0', 10);
  const jenis = String(cols[1]?.v || '').trim();
  
  // Biaya bisa bertipe number atau string berformat Rupiah
  let biaya = 0;
  if (typeof cols[2]?.v === 'number') {
    biaya = cols[2].v;
  } else if (cols[2]?.v) {
    // Hapus format non-angka jika string
    const cleanVal = String(cols[2].v).replace(/[^0-9]/g, '');
    biaya = parseInt(cleanVal, 10) || 0;
  } else if (cols[2]?.f) {
    const cleanVal = String(cols[2].f).replace(/[^0-9]/g, '');
    biaya = parseInt(cleanVal, 10) || 0;
  }
  
  return { no, jenis, biaya };
}

/**
 * Pemetaan baris dari sheet KEBUTUHAN_SISWA
 * Format: No, Jenis, Satuan
 */
export function parseNeedRow(cols: any[]): Need | null {
  if (cols.length < 2 || !cols[1]?.v) return null; // Minimal ada nama kebutuhan
  
  const no = typeof cols[0]?.v === 'number' ? cols[0].v : parseInt(cols[0]?.f || '0', 10);
  const jenis = String(cols[1]?.v || '').trim();
  const satuan = String(cols[2]?.v || 'PCS').trim().toUpperCase();
  
  return { no, jenis, satuan };
}

/**
 * Pemetaan baris dari sheet PEMBAYARAN
 * Format: No Transaksi, Tanggal, No Siswa, Nama Siswa, Kelas, Jenis Biaya, Biaya, Item Diserahkan, Petugas 1, Petugas 2, Terbilang
 */
export function parseTransactionRow(cols: any[]): Transaction | null {
  if (cols.length < 7 || !cols[0]?.v) return null; // Minimal ada ID transaksi
  
  const idTransaksi = String(cols[0]?.v || cols[0]?.f || '').trim();
  const tanggal = String(cols[1]?.v || cols[1]?.f || '').trim();
  const noSiswa = typeof cols[2]?.v === 'number' ? cols[2].v : parseInt(cols[2]?.f || '0', 10);
  const namaSiswa = String(cols[3]?.v || '').trim();
  const kelas = String(cols[4]?.v || cols[4]?.f || '').trim();
  const jenisBiaya = String(cols[5]?.v || '').trim();
  
  let biaya = 0;
  if (typeof cols[6]?.v === 'number') {
    biaya = cols[6].v;
  } else if (cols[6]?.v) {
    const cleanVal = String(cols[6].v).replace(/[^0-9]/g, '');
    biaya = parseInt(cleanVal, 10) || 0;
  }
  
  // Parse array kebutuhan (misal "1,2,3")
  const kebutuhanStr = String(cols[7]?.v || cols[7]?.f || '').trim();
  const kebutuhanDiserahkan = kebutuhanStr ? kebutuhanStr.split(',').map(Number).filter(n => !isNaN(n)) : [];
  
  const petugas1 = String(cols[8]?.v || '').trim();
  const petugas2 = String(cols[9]?.v || '').trim();
  const terbilang = String(cols[10]?.v || '').trim();
  const rawStatus = cols[11] ? String(cols[11]?.v || cols[11]?.f || '').trim().toUpperCase() : '';
  const isCancelled = rawStatus === 'CANCEL' || rawStatus === 'DIBATALKAN' || rawStatus === 'TRUE';
  
  // Tentukan jenis kelamin default dari jenisBiaya jika tidak ada
  let jenisKelamin = 'L';
  if (jenisBiaya.toLowerCase().includes('perempuan') || jenisBiaya.toLowerCase().includes('wanita')) {
    jenisKelamin = 'P';
  }
  
  return {
    idTransaksi,
    tanggal,
    noSiswa,
    namaSiswa,
    kelas,
    jenisKelamin,
    jenisBiaya,
    biaya,
    terbilang,
    kebutuhanDiserahkan,
    petugas1,
    petugas2,
    isCancelled
  };
}
