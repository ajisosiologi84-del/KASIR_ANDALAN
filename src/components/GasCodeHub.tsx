/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Code2, Copy, Check, BookOpen, ExternalLink, Download, FileCode, CheckCircle, HelpCircle } from 'lucide-react';

export default function GasCodeHub() {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const handleCopy = (code: string, tabName: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTab(tabName);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const codeGs = `/**
 * =========================================================================
 * BACKEND LOGIK - GOOGLE APPS SCRIPT (Code.gs)
 * Aplikasi Kasir Sekolah khusus Pembayaran Seragam
 * Terhubung dengan 4 Sheet pada Google Sheets
 * =========================================================================
 */

// Ganti ID Spreadsheet ini dengan ID Spreadsheet Anda sendiri
const SPREADSHEET_ID = "1JY82gKbHrKjBYSbULZcPi6i49ot0t0xIBXXOgdZ2zEc";

/**
 * 1. Menampilkan Halaman Web Utama
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Aplikasi Kasir Seragam Sekolah')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Fungsi pembantu untuk memuat file HTML lainnya (jika dipisah)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * API Endpoint POST - Menerima transaksi dari aplikasi luar (seperti React app)
 */
function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    var action = data.action || "saveTransaction";
    
    if (action === "deleteTransaction") {
      var id = data.idTransaksi;
      var result = deleteTransaction(id);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    if (action === "clearAllTransactions") {
      var result = clearAllTransactions();
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    if (action === "editTransaction") {
      var tx = data.transaction;
      var result = editTransaction(tx);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader('Access-Control-Allow-Origin', '*');
    }
    
    // Dukung format JSON dibungkus action atau data langsung
    var tx = data.transaction || data;
    
    var result = saveTransaction(tx);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader('Access-Control-Allow-Origin', '*');
  }
}

/**
 * Membuka Spreadsheet
 */
function getSpreadsheet() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (err) {
    throw new Error("Gagal membuka Spreadsheet. Periksa ID Spreadsheet Anda: " + err.message);
  }
}

/**
 * 2. Autentikasi Login Petugas (Role-Based Access)
 */
function checkLogin(username, password) {
  var userClean = username.trim().toLowerCase();
  var passClean = password.trim();
  
  if (userClean === 'admin' && passClean === 'AdminBayar2066') {
    return { success: true, role: 'admin', displayName: 'Admin Koperasi' };
  } else if (userClean === 'admin' && passClean === 'kepsek2026') {
    return { success: true, role: 'kepsek', displayName: 'Kepala Sekolah' };
  } else if (userClean === 'kasir' && passClean === 'kasir2066') {
    return { success: true, role: 'kasir', displayName: 'Petugas Kasir' };
  } else {
    return { success: false, message: 'Username atau Password salah!' };
  }
}

/**
 * 3. Mengambil Data Siswa (DATA_SISWA)
 */
function getStudents() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('DATA_SISWA');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Hanya header
  
  var students = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][1]) continue; // Skip jika nama kosong
    students.push({
      no: data[i][0] || i,
      namaSiswa: data[i][1],
      jenisKelamin: data[i][2] || 'L',
      kelas: data[i][3] || ''
    });
  }
  return students;
}

/**
 * 4. Mengambil Besaran Biaya (BESARAN_BIAYA)
 */
function getFees() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('BESARAN_BIAYA');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var fees = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;
    fees.push({
      no: data[i][0] || i,
      jenis: data[i][1],
      biaya: Number(data[i][2]) || 0
    });
  }
  return fees;
}

/**
 * 5. Mengambil Kebutuhan Siswa (KEBUTUHAN_SISWA)
 */
function getNeeds() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('KEBUTUHAN_SISWA');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var needs = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;
    needs.push({
      no: data[i][0] || i,
      jenis: data[i][1],
      satuan: data[i][2] || 'PCS'
    });
  }
  return needs;
}

/**
 * 6. Mengambil Riwayat Pembayaran (PEMBAYARAN)
 */
function getTransactions() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('PEMBAYARAN');
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var transactions = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue; // Skip jika ID Transaksi kosong
    
    // Parse array kebutuhan dari string (misal "1,2,3")
    var kebutuhanStr = String(data[i][7] || '');
    var kebutuhanArr = kebutuhanStr ? kebutuhanStr.split(',').map(Number) : [];
    
    // Format tanggal ke string YYYY-MM-DD
    var tglObj = data[i][1];
    var tglStr = "";
    if (tglObj instanceof Date) {
      tglStr = Utilities.formatDate(tglObj, Session.getScriptTimeZone(), "yyyy-MM-dd");
    } else {
      tglStr = String(tglObj || '');
    }

    transactions.push({
      idTransaksi: data[i][0],
      tanggal: tglStr,
      noSiswa: Number(data[i][2]),
      namaSiswa: data[i][3],
      kelas: data[i][4],
      jenisBiaya: data[i][5],
      biaya: Number(data[i][6]) || 0,
      kebutuhanDiserahkan: kebutuhanArr,
      petugas1: data[i][8] || '',
      petugas2: data[i][9] || '',
      terbilang: data[i][10] || '',
      isCancelled: data[i][11] === 'CANCEL' || data[i][11] === 'DIBATALKAN' || data[i][11] === true || String(data[i][11]).toUpperCase() === 'TRUE'
    });
  }
  return transactions;
}

/**
 * 7. Menyimpan Transaksi Pembayaran Baru ke PEMBAYARAN
 */
function saveTransaction(tx) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('PEMBAYARAN');
  if (!sheet) {
    // Buat sheet baru jika belum ada
    sheet = ss.insertSheet('PEMBAYARAN');
    sheet.appendRow([
      'No Transaksi', 'Tanggal', 'No Siswa', 'Nama Siswa', 'Kelas', 
      'Jenis Biaya', 'Biaya', 'Item Diserahkan', 'Petugas 1', 'Petugas 2', 'Terbilang', 'Status'
    ]);
  }
  
  // Ubah array kebutuhan [1, 2, 3] menjadi string koma "1,2,3"
  var kebutuhanStr = tx.kebutuhanDiserahkan ? tx.kebutuhanDiserahkan.join(',') : '';
  
  // Siapkan data baris baru
  var newRow = [
    tx.idTransaksi,
    tx.tanggal, // String format YYYY-MM-DD atau gunakan objek Date
    tx.noSiswa,
    tx.namaSiswa,
    tx.kelas,
    tx.jenisBiaya,
    tx.biaya,
    kebutuhanStr,
    tx.petugas1,
    tx.petugas2,
    tx.terbilang,
    tx.isCancelled ? 'CANCEL' : 'AKTIF'
  ];
  
  sheet.appendRow(newRow);
  return { success: true, idTransaksi: tx.idTransaksi };
}

/**
 * 8. Menghapus / Mereset Transaksi Berdasarkan ID Transaksi
 */
function deleteTransaction(idTransaksi) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('PEMBAYARAN');
  if (!sheet) return { success: false, message: 'Sheet PEMBAYARAN tidak ditemukan' };
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(idTransaksi).trim().toLowerCase()) {
      sheet.deleteRow(i + 1); // Indeks baris adalah 1-based, i=1 adalah baris ke-2
      return { success: true, message: 'Transaksi berhasil dihapus dari Google Sheets', idTransaksi: idTransaksi };
    }
  }
  return { success: false, message: 'Transaksi tidak ditemukan di Google Sheets' };
}

/**
 * 9. Mengubah / Mengedit Transaksi Berdasarkan ID Transaksi
 */
function editTransaction(tx) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('PEMBAYARAN');
  if (!sheet) return { success: false, message: 'Sheet PEMBAYARAN tidak ditemukan' };
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === String(tx.idTransaksi).trim().toLowerCase()) {
      var kebutuhanStr = tx.kebutuhanDiserahkan ? tx.kebutuhanDiserahkan.join(',') : '';
      var rowRange = sheet.getRange(i + 1, 1, 1, 12);
      rowRange.setValues([[
        tx.idTransaksi,
        tx.tanggal,
        tx.noSiswa,
        tx.namaSiswa,
        tx.kelas,
        tx.jenisBiaya,
        tx.biaya,
        kebutuhanStr,
        tx.petugas1,
        tx.petugas2,
        tx.terbilang,
        tx.isCancelled ? 'CANCEL' : 'AKTIF'
      ]]);
      return { success: true, message: 'Transaksi berhasil diubah di Google Sheets', idTransaksi: tx.idTransaksi };
    }
  }
  return { success: false, message: 'Transaksi tidak ditemukan di Google Sheets untuk diedit' };
}

/**
 * 10. Menghapus Semua Transaksi dari Sheet PEMBAYARAN
 */
function clearAllTransactions() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('PEMBAYARAN');
  if (!sheet) return { success: false, message: 'Sheet PEMBAYARAN tidak ditemukan' };
  
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  return { success: true, message: 'Semua transaksi berhasil dihapus dari Google Sheets' };
}
`;

  const indexHtml = `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aplikasi Kasir Seragam Sekolah</title>
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
    }
    .font-display {
      font-family: 'Space Grotesk', sans-serif;
    }
    /* Kwitansi A4/F4 CSS Print */
    @media print {
      body {
        background: white !important;
        color: black !important;
        font-size: 11px !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .no-print {
        display: none !important;
      }
      @page {
        size: A4 portrait;
        margin: 5mm 10mm 5mm 10mm;
      }
      .print-area {
        display: block !important;
        width: 100% !important;
        background: white !important;
      }
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen">

  <!-- ==================== CONTAINER UTAMA ==================== -->
  <div id="appContainer" class="p-4 md:p-6 max-w-7xl mx-auto">
    
    <!-- 1. VIEW LOGIN -->
    <div id="loginView" class="min-h-[80vh] flex items-center justify-center">
      <div class="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 w-full max-w-md space-y-6">
        <div class="text-center space-y-2">
          <div class="h-14 w-14 bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold mx-auto shadow-md">K</div>
          <h2 class="text-2xl font-bold tracking-tight text-slate-900 font-display">Login Kasir Seragam</h2>
          <p class="text-xs text-slate-500">Silakan masukkan akun kasir/admin untuk mengelola transaksi.</p>
        </div>
        
        <div id="loginError" class="hidden bg-rose-50 border-l-4 border-rose-500 p-3 rounded-r text-xs text-rose-700 font-medium"></div>

        <form id="loginForm" onsubmit="handleLogin(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Username</label>
            <input type="text" id="username" required class="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="admin / kasir">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Password</label>
            <input type="password" id="password" required class="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••">
          </div>
          <button type="submit" id="btnLogin" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg transition-all shadow-md">Masuk ke Aplikasi</button>
        </form>
      </div>
    </div>

    <!-- 2. VIEW KASIR & ADMIN -->
    <div id="mainView" class="hidden space-y-6">
      
      <!-- NAV HEADER -->
      <header class="no-print bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">KS</div>
          <div>
            <h1 class="text-md font-bold text-slate-900 leading-tight">Kasir Koperasi Seragam</h1>
            <p class="text-[10px] text-slate-400">Petugas Aktif: <strong id="lblPetugas" class="text-slate-600">Kasir</strong> (<span id="lblRole" class="font-bold">kasir</span>)</p>
          </div>
        </div>
        
        <nav class="flex items-center gap-2">
          <button onclick="switchTab('kasir')" id="tabBtnKasir" class="px-4 py-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 transition-all">Loket Transaksi</button>
          <button onclick="switchTab('laporan')" id="tabBtnLaporan" class="hidden px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-50 transition-all">Laporan & Rekap</button>
          <button onclick="handleLogout()" class="px-4 py-2 text-xs font-bold rounded-lg text-rose-600 hover:bg-rose-50 transition-all">Keluar</button>
        </nav>
      </header>

      <!-- TAB KASIR (Langkah 1-8) -->
      <div id="tabKasir" class="no-print grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- LEFT COLUMN -->
        <div class="lg:col-span-7 space-y-6">
          
          <!-- L1: Cari Siswa -->
          <div class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-3">
            <h3 class="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span class="h-5 w-5 bg-blue-50 text-blue-600 rounded-md flex items-center justify-center text-xs font-black">1</span>
              Langkah 1: Cari Data Siswa
            </h3>
            
            <div class="relative">
              <input type="text" id="siswaQuery" oninput="onStudentSearch()" class="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400" placeholder="Ketik nomor urut atau nama siswa...">
              <div class="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</div>
              
              <!-- Search Results Dropdown -->
              <div id="studentResults" class="hidden absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-lg shadow-xl divide-y divide-slate-50 overflow-hidden"></div>
            </div>

            <!-- Profile Display -->
            <div id="siswaProfileCard" class="hidden bg-blue-50/50 border border-blue-100 p-4 rounded-xl">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <p class="text-slate-400">No. Urut</p>
                  <p class="font-bold text-slate-800" id="profNo">-</p>
                </div>
                <div>
                  <p class="text-slate-400">Nama Siswa</p>
                  <p class="font-bold text-slate-800" id="profNama">-</p>
                </div>
                <div>
                  <p class="text-slate-400">Jenis Kelamin</p>
                  <p class="font-bold text-slate-800" id="profJK">-</p>
                </div>
                <div>
                  <p class="text-slate-400">Kelas</p>
                  <p class="font-bold text-slate-800" id="profKelas">-</p>
                </div>
              </div>
            </div>
          </div>

          <!-- L2: Pilih Biaya -->
          <div class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-3">
            <h3 class="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span class="h-5 w-5 bg-emerald-50 text-emerald-600 rounded-md flex items-center justify-center text-xs font-black">2</span>
              Langkah 2: Pilih & Kalkulasi Biaya
            </h3>
            <div>
              <select id="biayaSelect" onchange="onFeeSelected()" class="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Pilih Jenis Pembayaran Seragam --</option>
              </select>
            </div>

            <div id="kalkulasiPanel" class="hidden bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-xs text-emerald-800 font-bold">Total Pembayaran:</span>
                <span id="lblTotalBiaya" class="text-lg font-black text-emerald-700 font-mono">Rp 0</span>
              </div>
              <div class="border-t border-emerald-100 pt-1.5">
                <p class="text-[10px] text-slate-400 font-medium">Terbilang Huruf:</p>
                <p id="lblTerbilang" class="text-xs text-slate-800 font-bold italic mt-0.5">"Nol Rupiah"</p>
              </div>
            </div>
          </div>

          <!-- L3: Penandatangan -->
          <div class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-3">
            <h3 class="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span class="h-5 w-5 bg-slate-100 text-slate-700 rounded-md flex items-center justify-center text-xs font-black">3</span>
              Langkah 3: Nama Petugas pada Kwitansi
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[10px] text-slate-400 font-semibold mb-1">Petugas 1 (Sisi Kiri / Kasir)</label>
                <input type="text" id="txtPetugas1" class="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
              </div>
              <div>
                <label class="block text-[10px] text-slate-400 font-semibold mb-1">Petugas 2 (Sisi Kanan / Koperasi)</label>
                <input type="text" id="txtPetugas2" value="Koperasi Sekolah" class="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
              </div>
            </div>
          </div>

        </div>

        <!-- RIGHT COLUMN -->
        <div class="lg:col-span-5 space-y-6">
          
          <!-- L4: Ceklist Kebutuhan -->
          <div class="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-3 flex flex-col h-full">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 class="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span class="h-5 w-5 bg-amber-50 text-amber-600 rounded-md flex items-center justify-center text-xs font-black">4</span>
                Langkah 4: Checklist Seragam Diserahkan
              </h3>
              <button type="button" onclick="toggleAllNeeds()" class="text-[10px] text-blue-600 font-bold hover:underline">Semua</button>
            </div>
            
            <p class="text-[10px] text-slate-400">Tandai item fisik pakaian atau atribut yang langsung diberikan kepada siswa.</p>

            <div id="needsList" class="flex-1 divide-y divide-slate-100 max-h-[300px] overflow-y-auto p-1 border border-slate-100 rounded-lg bg-slate-50/50">
              <!-- Checkboxes rendered here -->
            </div>

            <div class="pt-4 border-t border-slate-100 space-y-2">
              <button id="btnSaveTransaction" onclick="onProcessPayment()" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2">
                <span>Simpan & Cetak Transaksi</span>
              </button>
              <p class="text-[9px] text-center text-slate-400">Aksi di atas akan mencatat data ke PEMBAYARAN dan mencetak kwitansi.</p>
            </div>
          </div>

        </div>

      </div>

      <!-- TAB LAPORAN (Langkah 9 - Admin Only) -->
      <div id="tabLaporan" class="no-print hidden bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-6">
        <div>
          <h2 class="text-lg font-bold text-slate-900 font-display">Dashboard Audit Pembayaran</h2>
          <p class="text-xs text-slate-400">Laporan transaksi harian, rekapitulasi nominal, pencarian, dan rentang tanggal keuangan.</p>
        </div>

        {/* Stats */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p class="text-[10px] text-blue-600 uppercase font-semibold">Total Pendapatan</p>
            <p id="lblReportAllTotal" class="text-lg font-black text-slate-800 font-mono mt-0.5">Rp 0</p>
          </div>
          <div class="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <p class="text-[10px] text-emerald-600 uppercase font-semibold">Hari Ini</p>
            <p id="lblReportTodayTotal" class="text-lg font-black text-slate-800 font-mono mt-0.5">Rp 0</p>
          </div>
          <div class="p-4 bg-violet-50 border border-violet-100 rounded-xl">
            <p class="text-[10px] text-violet-600 uppercase font-semibold">Total Kwitansi</p>
            <p id="lblReportCount" class="text-lg font-black text-slate-800 font-mono mt-0.5">0 Transaksi</p>
          </div>
        </div>

        {/* Filters */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg">
          <div>
            <label class="block text-[10px] text-slate-500 font-bold mb-1">Cari Keyword</label>
            <input type="text" id="reportSearch" oninput="renderReportTable()" class="w-full text-xs px-3 py-1.5 border border-slate-200 rounded bg-white" placeholder="Nama, ID, kelas...">
          </div>
          <div>
            <label class="block text-[10px] text-slate-500 font-bold mb-1">Mulai Tanggal</label>
            <input type="date" id="reportStart" onchange="renderReportTable()" class="w-full text-xs px-3 py-1.5 border border-slate-200 rounded bg-white">
          </div>
          <div>
            <label class="block text-[10px] text-slate-500 font-bold mb-1">Sampai Tanggal</label>
            <input type="date" id="reportEnd" onchange="renderReportTable()" class="w-full text-xs px-3 py-1.5 border border-slate-200 rounded bg-white">
          </div>
        </div>

        {/* Table */}
        <div class="overflow-x-auto border border-slate-100 rounded-lg">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                <th class="p-3">ID Transaksi</th>
                <th class="p-3">Tanggal</th>
                <th class="p-3">Nama Siswa</th>
                <th class="p-3">Kelas</th>
                <th class="p-3">Jenis Biaya</th>
                <th class="p-3">Jumlah</th>
                <th class="p-3">Item</th>
              </tr>
            </thead>
            <tbody id="reportTableBody" class="divide-y divide-slate-100">
              <tr>
                <td colspan="7" class="p-8 text-center text-slate-400">Memuat data transaksi...</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>

  </div>

  <!-- ==================== AREA PRINT CETAK (A4 / F4) ==================== -->
  <div id="printArea" class="hidden print-area bg-white p-6 max-w-4xl mx-auto border border-slate-200 my-6">
    <!-- KWITANSI BAGIAN 1 (ATAS / KIRI) -->
    <div class="border-b-2 border-dashed border-slate-300 pb-10 mb-10">
      <div class="flex justify-between items-start">
        <div>
          <h2 class="text-base font-black uppercase tracking-wider font-display">KWITANSI PEMBAYARAN SERAGAM</h2>
          <p class="text-[10px] text-slate-500 font-medium">Koperasi Sekolah Al-Azhar - Bukti Pembayaran Resmi</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-bold text-blue-700 font-mono" id="prId1">TRX-000000</p>
          <p class="text-[9px] text-slate-400" id="prTgl1">Tanggal: 2026-07-06</p>
        </div>
      </div>
      
      <div class="mt-4 grid grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-md border border-slate-100">
        <div>
          <span class="text-slate-400 block uppercase text-[9px] font-bold">No. Urut</span>
          <strong id="prNoSiswa1">#1</strong>
        </div>
        <div>
          <span class="text-slate-400 block uppercase text-[9px] font-bold">Nama Lengkap</span>
          <strong id="prNamaSiswa1">Ahmad Fauzi</strong>
        </div>
        <div>
          <span class="text-slate-400 block uppercase text-[9px] font-bold">Kelas</span>
          <strong id="prKelas1">X-1</strong>
        </div>
        <div>
          <span class="text-slate-400 block uppercase text-[9px] font-bold">Jenis Kelamin</span>
          <strong id="prJK1">Laki-laki</strong>
        </div>
      </div>

      <div class="mt-4 space-y-2">
        <div class="flex justify-between text-xs py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Rincian Pembayaran</span>
          <span class="font-bold text-slate-800" id="prRincian1">Paket Seragam Lengkap</span>
        </div>
        <div class="flex justify-between items-center text-sm py-1.5 bg-slate-50/50 px-2 rounded font-bold">
          <span class="text-emerald-800">Total Nominal</span>
          <span class="text-emerald-600 font-mono" id="prTotal1">Rp 850.000</span>
        </div>
        <p class="text-[10px] text-slate-600 italic bg-slate-50 p-2 rounded">
          Terbilang: "<strong id="prTerbilang1">Delapan Ratus Lima Puluh Ribu Rupiah</strong>"
        </p>
      </div>

      <div class="mt-4 text-[10px]">
        <p class="font-bold text-slate-700">Daftar Item Seragam / Atribut yang Diserahkan:</p>
        <p class="text-slate-600 mt-1" id="prItemSeragam1">Item: -</p>
      </div>

      <div class="mt-6 grid grid-cols-2 text-center text-xs pt-4 border-t border-slate-100">
        <div>
          <p class="text-slate-400 mb-10">Penerima (Petugas 1)</p>
          <strong id="prPetugas1A" class="underline">Siti Aminah</strong>
          <p class="text-[9px] text-slate-400">Kasir Koperasi</p>
        </div>
        <div>
          <p class="text-slate-400 mb-10">Pemberi Seragam (Petugas 2)</p>
          <strong id="prPetugas2A" class="underline">Hasan Basri</strong>
          <p class="text-[9px] text-slate-400">Koperasi Sekolah</p>
        </div>
      </div>
    </div>

    <!-- KWITANSI BAGIAN 2 (BAWAH / KANAN) -->
    <div>
      <div class="flex justify-between items-start">
        <div>
          <h2 class="text-base font-black uppercase tracking-wider font-display">KWITANSI PEMBAYARAN SERAGAM (ARSIP)</h2>
          <p class="text-[10px] text-slate-500 font-medium">Koperasi Sekolah Al-Azhar - Arsip Administrasi Sekolah</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-bold text-blue-700 font-mono" id="prId2">TRX-000000</p>
          <p class="text-[9px] text-slate-400" id="prTgl2">Tanggal: 2026-07-06</p>
        </div>
      </div>
      
      <div class="mt-4 grid grid-cols-4 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-md border border-slate-100">
        <div>
          <span class="text-slate-400 block uppercase text-[9px] font-bold">No. Urut</span>
          <strong id="prNoSiswa2">#1</strong>
        </div>
        <div>
          <span class="text-slate-400 block uppercase text-[9px] font-bold">Nama Lengkap</span>
          <strong id="prNamaSiswa2">Ahmad Fauzi</strong>
        </div>
        <div>
          <span class="text-slate-400 block uppercase text-[9px] font-bold">Kelas</span>
          <strong id="prKelas2">X-1</strong>
        </div>
        <div>
          <span class="text-slate-400 block uppercase text-[9px] font-bold">Jenis Kelamin</span>
          <strong id="prJK2">Laki-laki</strong>
        </div>
      </div>

      <div class="mt-4 space-y-2">
        <div class="flex justify-between text-xs py-1.5 border-b border-slate-100">
          <span class="text-slate-500">Rincian Pembayaran</span>
          <span class="font-bold text-slate-800" id="prRincian2">Paket Seragam Lengkap</span>
        </div>
        <div class="flex justify-between items-center text-sm py-1.5 bg-slate-50/50 px-2 rounded font-bold">
          <span class="text-emerald-800">Total Nominal</span>
          <span class="text-emerald-600 font-mono" id="prTotal2">Rp 850.000</span>
        </div>
        <p class="text-[10px] text-slate-600 italic bg-slate-50 p-2 rounded">
          Terbilang: "<strong id="prTerbilang2">Delapan Ratus Lima Puluh Ribu Rupiah</strong>"
        </p>
      </div>

      <div class="mt-4 text-[10px]">
        <p class="font-bold text-slate-700">Daftar Item Seragam / Atribut yang Diserahkan:</p>
        <p class="text-slate-600 mt-1" id="prItemSeragam2">Item: -</p>
      </div>

      <div class="mt-6 grid grid-cols-2 text-center text-xs pt-4 border-t border-slate-100">
        <div>
          <p class="text-slate-400 mb-10">Penerima (Petugas 1)</p>
          <strong id="prPetugas1B" class="underline">Siti Aminah</strong>
          <p class="text-[9px] text-slate-400">Kasir Koperasi</p>
        </div>
        <div>
          <p class="text-slate-400 mb-10">Pemberi Seragam (Petugas 2)</p>
          <strong id="prPetugas2B" class="underline">Hasan Basri</strong>
          <p class="text-[9px] text-slate-400">Koperasi Sekolah</p>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== JAVASCRIPT LOGIKA UTAMA ==================== -->
  <script>
    // Variables global
    let currentRole = null;
    let currentUser = null;
    let dbStudents = [];
    let dbFees = [];
    let dbNeeds = [];
    let dbTransactions = [];
    
    let activeStudent = null;
    let activeFee = null;
    let activeNeedsList = [];

    // On Load
    window.onload = function() {
      loadInitialData();
    };

    /**
     * Memanggil Google Apps Script Backend (atau mock data jika diuji lokal)
     */
    function loadInitialData() {
      // Set defaults penandatangan
      document.getElementById('txtPetugas1').value = "Petugas Kasir";
      
      // Jika di lingkungan Google Apps Script, jalankan pemanggilan server
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        // Ambil Data Siswa
        google.script.run.withSuccessHandler(function(data) {
          dbStudents = data;
        }).getStudents();

        // Ambil Besaran Biaya
        google.script.run.withSuccessHandler(function(data) {
          dbFees = data;
          renderFeeDropdown();
        }).getFees();

        // Ambil Kebutuhan Siswa
        google.script.run.withSuccessHandler(function(data) {
          dbNeeds = data;
          renderNeedsCheckboxes();
        }).getNeeds();

        // Ambil Riwayat Transaksi (Hanya jika admin, dipanggil nanti)
      } else {
        // LOKAL FALLBACK (Demo / Mock)
        dbStudents = [
          { no: 1, namaSiswa: 'Ahmad Fauzi', jenisKelamin: 'L', kelas: 'X-1' },
          { no: 2, namaSiswa: 'Budi Santoso', jenisKelamin: 'L', kelas: 'X-2' },
          { no: 3, namaSiswa: 'Citra Lestari', jenisKelamin: 'P', kelas: 'X-1' }
        ];
        dbFees = [
          { no: 1, jenis: 'Paket Seragam Lengkap Laki-Laki', biaya: 850000 },
          { no: 2, jenis: 'Paket Seragam Lengkap Perempuan', biaya: 900000 },
          { no: 3, jenis: 'Atribut Saja', biaya: 80000 }
        ];
        dbNeeds = [
          { no: 1, jenis: 'Baju Putih', satuan: 'PCS' },
          { no: 2, jenis: 'Celana/Rok', satuan: 'PCS' },
          { no: 3, jenis: 'Dasi & Topi', satuan: 'SET' }
        ];
        dbTransactions = [];
        
        renderFeeDropdown();
        renderNeedsCheckboxes();
      }
    }

    /**
     * Rendering Dropdown Biaya
     */
    function renderFeeDropdown() {
      const select = document.getElementById('biayaSelect');
      select.innerHTML = '<option value="">-- Pilih Jenis Pembayaran Seragam --</option>';
      dbFees.forEach(fee => {
        const option = document.createElement('option');
        option.value = fee.no;
        option.textContent = fee.jenis + ' - Rp ' + Number(fee.biaya).toLocaleString('id-ID');
        select.appendChild(option);
      });
    }

    /**
     * Rendering Checklist Kebutuhan
     */
    function renderNeedsCheckboxes() {
      const container = document.getElementById('needsList');
      container.innerHTML = '';
      dbNeeds.forEach(need => {
        const label = document.createElement('label');
        label.className = 'flex items-center justify-between p-2.5 hover:bg-white rounded transition-all cursor-pointer mb-1 border border-transparent';
        
        const leftDiv = document.createElement('div');
        leftDiv.className = 'flex items-center gap-3';
        
        const checkbox = document.createElement('input');
        typeCheckAttr(checkbox);
        checkbox.type = 'checkbox';
        checkbox.className = 'need-cb h-4 w-4 text-blue-600 rounded focus:ring-blue-500 border-slate-300 cursor-pointer';
        checkbox.value = need.no;
        
        const span = document.createElement('span');
        span.className = 'text-xs font-semibold text-slate-700';
        span.textContent = need.jenis;
        
        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(span);
        
        const rightSpan = document.createElement('span');
        rightSpan.className = 'text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase font-bold';
        rightSpan.textContent = need.satuan;
        
        label.appendChild(leftDiv);
        label.appendChild(rightSpan);
        container.appendChild(label);
      });
    }

    function typeCheckAttr(el) {}

    /**
     * Autentikasi Login (Server-Side atau Lokal)
     */
    function handleLogin(e) {
      e.preventDefault();
      const user = document.getElementById('username').value;
      const pass = document.getElementById('password').value;
      const errorDiv = document.getElementById('loginError');
      const btn = document.getElementById('btnLogin');
      
      errorDiv.classList.add('hidden');
      btn.disabled = true;
      btn.textContent = 'Menghubungkan...';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            btn.disabled = false;
            btn.textContent = 'Masuk ke Aplikasi';
            
            if (res.success) {
              loginAs(res.role, res.displayName);
            } else {
              errorDiv.textContent = res.message;
              errorDiv.classList.remove('hidden');
            }
          })
          .checkLogin(user, pass);
      } else {
        // LOKAL MOCK LOGIN
        btn.disabled = false;
        btn.textContent = 'Masuk ke Aplikasi';
        if (user === 'admin' && pass === 'AdminBayar2066') {
          loginAs('admin', 'Admin Koperasi (Lokal)');
        } else if (user === 'admin' && pass === 'kepsek2026') {
          loginAs('kepsek', 'Kepala Sekolah (Lokal)');
        } else if (user === 'kasir' && pass === 'kasir2066') {
          loginAs('kasir', 'Petugas Kasir (Lokal)');
        } else {
          errorDiv.textContent = 'Username atau Password salah!';
          errorDiv.classList.remove('hidden');
        }
      }
    }

    function loginAs(role, name) {
      currentRole = role;
      currentUser = name;
      
      document.getElementById('lblPetugas').textContent = name;
      document.getElementById('lblRole').textContent = role.toUpperCase();
      document.getElementById('txtPetugas1').value = name;
      
      // Atur hak akses Laporan & Kasir
      if (role === 'admin') {
        document.getElementById('tabBtnLaporan').classList.remove('hidden');
        document.getElementById('tabBtnKasir').classList.remove('hidden');
        loadTransactionsHistory(); // Ambil riwayat untuk laporan
        switchTab('kasir');
      } else if (role === 'kepsek') {
        document.getElementById('tabBtnLaporan').classList.remove('hidden');
        document.getElementById('tabBtnKasir').classList.add('hidden');
        loadTransactionsHistory();
        switchTab('laporan');
      } else {
        document.getElementById('tabBtnLaporan').classList.add('hidden');
        document.getElementById('tabBtnKasir').classList.remove('hidden');
        switchTab('kasir');
      }
      
      // Ganti View
      document.getElementById('loginView').classList.add('hidden');
      document.getElementById('mainView').classList.remove('hidden');
    }

    function handleLogout() {
      currentRole = null;
      currentUser = null;
      document.getElementById('loginForm').reset();
      document.getElementById('loginView').classList.remove('hidden');
      document.getElementById('mainView').classList.add('hidden');
      document.getElementById('printArea').classList.add('hidden');
      document.getElementById('appContainer').classList.remove('hidden');
    }

    /**
     * Navigasi Tab
     */
    function switchTab(tab) {
      const btnKasir = document.getElementById('tabBtnKasir');
      const btnLapor = document.getElementById('tabBtnLaporan');
      const viewKasir = document.getElementById('tabKasir');
      const viewLapor = document.getElementById('tabLaporan');

      if (tab === 'kasir') {
        btnKasir.className = "px-4 py-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 transition-all";
        btnLapor.className = "px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-50 transition-all";
        viewKasir.classList.remove('hidden');
        viewLapor.classList.add('hidden');
      } else if (tab === 'laporan') {
        btnLapor.className = "px-4 py-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100 transition-all";
        btnKasir.className = "px-4 py-2 text-xs font-bold rounded-lg text-slate-600 hover:bg-slate-50 transition-all";
        viewKasir.classList.add('hidden');
        viewLapor.classList.remove('hidden');
        loadTransactionsHistory();
      }
    }

    /**
     * Pencarian Siswa otomatis
     */
    function onStudentSearch() {
      const query = document.getElementById('siswaQuery').value.toLowerCase().trim();
      const dropdown = document.getElementById('studentResults');
      
      if (!query) {
        dropdown.classList.add('hidden');
        return;
      }
      
      const filtered = dbStudents.filter(s => 
        s.namaSiswa.toLowerCase().includes(query) || 
        String(s.no).includes(query) || 
        s.kelas.toLowerCase().includes(query)
      );
      
      dropdown.innerHTML = '';
      if (filtered.length > 0) {
        dropdown.classList.remove('hidden');
        filtered.slice(0, 5).forEach(siswa => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = "w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center justify-between text-xs text-slate-700 font-semibold transition-all";
          btn.innerHTML = '<span>#' + siswa.no + ' ' + siswa.namaSiswa + ' (Kelas ' + siswa.kelas + ')</span><span class="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Pilih</span>';
          btn.onclick = function() {
            selectStudent(siswa);
          };
          dropdown.appendChild(btn);
        });
      } else {
        dropdown.classList.remove('hidden');
        dropdown.innerHTML = '<div class="p-3 text-center text-xs text-slate-400 font-semibold">Siswa tidak ditemukan</div>';
      }
    }

    function selectStudent(siswa) {
      activeStudent = siswa;
      document.getElementById('siswaQuery').value = '';
      document.getElementById('studentResults').classList.add('hidden');
      
      // Tampilkan Profil
      document.getElementById('siswaProfileCard').classList.remove('hidden');
      document.getElementById('profNo').textContent = '#' + siswa.no;
      document.getElementById('profNama').textContent = siswa.namaSiswa;
      document.getElementById('profJK').textContent = siswa.jenisKelamin === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)';
      document.getElementById('profKelas').textContent = siswa.kelas;
      
      // Pilih otomatis semua kebutuhan saat pilih siswa baru
      const checkboxes = document.querySelectorAll('.need-cb');
      checkboxes.forEach(cb => cb.checked = true);
    }

    /**
     * Pilih Kategori Biaya
     */
    function onFeeSelected() {
      const val = document.getElementById('biayaSelect').value;
      const calcPanel = document.getElementById('kalkulasiPanel');
      
      if (!val) {
        calcPanel.classList.add('hidden');
        activeFee = null;
        return;
      }
      
      const fee = dbFees.find(f => f.no == val);
      if (fee) {
        activeFee = fee;
        calcPanel.classList.remove('hidden');
        document.getElementById('lblTotalBiaya').textContent = 'Rp ' + Number(fee.biaya).toLocaleString('id-ID');
        document.getElementById('lblTerbilang').textContent = '"' + convertToTerbilang(fee.biaya) + '"';
      }
    }

    function toggleAllNeeds() {
      const checkboxes = document.querySelectorAll('.need-cb');
      const allChecked = Array.from(checkboxes).every(cb => cb.checked);
      checkboxes.forEach(cb => cb.checked = !allChecked);
    }

    /**
     * Proses Simpan & Bayar Transaksi
     */
    function onProcessPayment() {
      if (!activeStudent) {
        alert('Silakan pilih siswa terlebih dahulu pada Langkah 1!');
        return;
      }
      if (!activeFee) {
        alert('Silakan pilih jenis besaran biaya pada Langkah 2!');
        return;
      }

      const checkBoxes = document.querySelectorAll('.need-cb:checked');
      const kebutuhanArr = Array.from(checkBoxes).map(cb => Number(cb.value));
      
      const p1 = document.getElementById('txtPetugas1').value || currentUser;
      const p2 = document.getElementById('txtPetugas2').value || 'Petugas Koperasi';

      const timestamp = new Date();
      const dateStr = timestamp.getFullYear() + '-' + String(timestamp.getMonth() + 1).padStart(2, '0') + '-' + String(timestamp.getDate()).padStart(2, '0');
      const uniqueId = 'TRX-' + timestamp.getFullYear() + String(timestamp.getMonth() + 1).padStart(2, '0') + String(timestamp.getDate()).padStart(2, '0') + '-' + Math.floor(1000 + Math.random() * 9000);

      const tx = {
        idTransaksi: uniqueId,
        tanggal: dateStr,
        noSiswa: activeStudent.no,
        namaSiswa: activeStudent.namaSiswa,
        kelas: activeStudent.kelas,
        jenisKelamin: activeStudent.jenisKelamin,
        jenisBiaya: activeFee.jenis,
        biaya: activeFee.biaya,
        terbilang: convertToTerbilang(activeFee.biaya),
        kebutuhanDiserahkan: kebutuhanArr,
        petugas1: p1,
        petugas2: p2
      };

      const btn = document.getElementById('btnSaveTransaction');
      btn.disabled = true;
      btn.textContent = 'Menyimpan Transaksi...';

      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run
          .withSuccessHandler(function(res) {
            btn.disabled = false;
            btn.textContent = 'Simpan & Cetak Transaksi';
            showPrintView(tx);
          })
          .saveTransaction(tx);
      } else {
        // LOKAL MOCK SAVE
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = 'Simpan & Cetak Transaksi';
          dbTransactions.push(tx);
          showPrintView(tx);
        }, 800);
      }
    }

    /**
     * Menampilkan Tampilan Cetak Kwitansi
     */
    function showPrintView(tx) {
      // Sembunyikan container app, tampilkan printArea saja
      document.getElementById('appContainer').classList.add('no-print');
      const printArea = document.getElementById('printArea');
      printArea.classList.remove('hidden');
      
      // Ambil label list item yang diserahkan
      const itemsDiserahkan = [];
      tx.kebutuhanDiserahkan.forEach(no => {
        const item = dbNeeds.find(n => n.no == no);
        if (item) itemsDiserahkan.push(item.jenis);
      });
      const itemsStr = itemsDiserahkan.length > 0 ? itemsDiserahkan.join(', ') : 'Tidak ada item';

      // Mapping ke template 1 (Arsip / Atas)
      document.getElementById('prId1').textContent = tx.idTransaksi;
      document.getElementById('prTgl1').textContent = 'Tanggal: ' + tx.tanggal;
      document.getElementById('prNoSiswa1').textContent = '#' + tx.noSiswa;
      document.getElementById('prNamaSiswa1').textContent = tx.namaSiswa;
      document.getElementById('prKelas1').textContent = tx.kelas;
      document.getElementById('prJK1').textContent = tx.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki';
      document.getElementById('prRincian1').textContent = tx.jenisBiaya;
      document.getElementById('prTotal1').textContent = 'Rp ' + Number(tx.biaya).toLocaleString('id-ID');
      document.getElementById('prTerbilang1').textContent = tx.terbilang;
      document.getElementById('prItemSeragam1').textContent = itemsStr;
      document.getElementById('prPetugas1A').textContent = tx.petugas1;
      document.getElementById('prPetugas2A').textContent = tx.petugas2;

      // Mapping ke template 2 (Arsip / Bawah)
      document.getElementById('prId2').textContent = tx.idTransaksi;
      document.getElementById('prTgl2').textContent = 'Tanggal: ' + tx.tanggal;
      document.getElementById('prNoSiswa2').textContent = '#' + tx.noSiswa;
      document.getElementById('prNamaSiswa2').textContent = tx.namaSiswa;
      document.getElementById('prKelas2').textContent = tx.kelas;
      document.getElementById('prJK2').textContent = tx.jenisKelamin === 'P' ? 'Perempuan' : 'Laki-laki';
      document.getElementById('prRincian2').textContent = tx.jenisBiaya;
      document.getElementById('prTotal2').textContent = 'Rp ' + Number(tx.biaya).toLocaleString('id-ID');
      document.getElementById('prTerbilang2').textContent = tx.terbilang;
      document.getElementById('prItemSeragam2').textContent = itemsStr;
      document.getElementById('prPetugas1B').textContent = tx.petugas1;
      document.getElementById('prPetugas2B').textContent = tx.petugas2;

      // Panggil Dialog Print Browser
      setTimeout(() => {
        window.print();
        
        // Setelah print selesai, kembalikan ke app normal
        document.getElementById('appContainer').classList.remove('no-print');
        printArea.classList.add('hidden');
        resetForm();
      }, 500);
    }

    function resetForm() {
      activeStudent = null;
      activeFee = null;
      document.getElementById('siswaProfileCard').classList.add('hidden');
      document.getElementById('biayaSelect').value = '';
      document.getElementById('kalkulasiPanel').classList.add('hidden');
      document.getElementById('siswaQuery').value = '';
      document.getElementById('needsList').querySelectorAll('input').forEach(cb => cb.checked = false);
    }

    /**
     * Laporan / Rekapitulasi (Admin Only)
     */
    function loadTransactionsHistory() {
      if (typeof google !== 'undefined' && google.script && google.script.run) {
        google.script.run.withSuccessHandler(function(data) {
          dbTransactions = data;
          renderReportTable();
        }).getTransactions();
      } else {
        // Fallback transaksi kosong atau dummy jika di lokal
        if (dbTransactions.length === 0) {
          dbTransactions = [
            { idTransaksi: 'TRX-20260706-9999', tanggal: '2026-07-06', noSiswa: 1, namaSiswa: 'Ahmad Fauzi', kelas: 'X-1', jenisBiaya: 'Paket Seragam', biaya: 850000, kebutuhanDiserahkan: [1,2], petugas1: 'Admin', petugas2: 'Koperasi' }
          ];
        }
        renderReportTable();
      }
    }

    function renderReportTable() {
      const tBody = document.getElementById('reportTableBody');
      const search = document.getElementById('reportSearch').value.toLowerCase().trim();
      const start = document.getElementById('reportStart').value;
      const end = document.getElementById('reportEnd').value;

      let filtered = dbTransactions.filter(tx => {
        const matchesSearch = !search || 
          tx.namaSiswa.toLowerCase().includes(search) || 
          tx.idTransaksi.toLowerCase().includes(search) || 
          tx.kelas.toLowerCase().includes(search);
          
        let matchesStart = true;
        let matchesEnd = true;
        if (start) matchesStart = tx.tanggal >= start;
        if (end) matchesEnd = tx.tanggal <= end;
        
        return matchesSearch && matchesStart && matchesEnd;
      });

      tBody.innerHTML = '';
      
      let allTotal = 0;
      let todayTotal = 0;
      const todayStr = '2026-07-06';

      if (filtered.length > 0) {
        filtered.forEach(tx => {
          allTotal += tx.biaya;
          if (tx.tanggal === todayStr) todayTotal += tx.biaya;

          const tr = document.createElement('tr');
          tr.className = 'hover:bg-slate-50 transition-colors';
          tr.innerHTML = \`
            <td class="p-3 font-mono font-bold text-blue-700">\${tx.idTransaksi}</td>
            <td class="p-3 whitespace-nowrap">\${tx.tanggal}</td>
            <td class="p-3"><strong>\${tx.namaSiswa}</strong></td>
            <td class="p-3">\${tx.kelas}</td>
            <td class="p-3 text-slate-600">\${tx.jenisBiaya}</td>
            <td class="p-3 font-mono font-bold text-emerald-600">Rp \${Number(tx.biaya).toLocaleString('id-ID')}</td>
            <td class="p-3 text-slate-400">\${tx.kebutuhanDiserahkan.length} item</td>
          \`;
          tBody.appendChild(tr);
        });
      } else {
        tBody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-400 font-semibold">Tidak ada transaksi terfilter.</td></tr>';
      }

      // Update widget stat
      document.getElementById('lblReportAllTotal').textContent = 'Rp ' + allTotal.toLocaleString('id-ID');
      document.getElementById('lblReportTodayTotal').textContent = 'Rp ' + todayTotal.toLocaleString('id-ID');
      document.getElementById('lblReportCount').textContent = filtered.length + ' Transaksi';
    }

    /**
     * ==========================================
     * ALGORITMA TERBILANG RUPIAH JAVASCRIPT
     * ==========================================
     */
    function convertToTerbilang(angka) {
      const val = Math.floor(angka);
      if (val === 0) return "Nol Rupiah";

      const bilangan = [
        "", "Satu", "Dua", "Tiga", "Empat", "Lima",
        "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"
      ];

      function helper(n) {
        let temp = "";
        if (n < 12) {
          temp = " " + bilangan[n];
        } else if (n < 20) {
          temp = helper(n - 10) + " Belas";
        } else if (n < 100) {
          temp = helper(Math.floor(n / 10)) + " Puluh" + helper(n % 10);
        } else if (n < 200) {
          temp = " Seratus" + helper(n - 100);
        } else if (n < 1000) {
          temp = helper(Math.floor(n / 100)) + " Ratus" + helper(n % 100);
        } else if (n < 2000) {
          temp = " Seribu" + helper(n - 1000);
        } else if (n < 1000000) {
          temp = helper(Math.floor(n / 1000)) + " Ribu" + helper(n % 1000);
        } else if (n < 1000000000) {
          temp = helper(Math.floor(n / 1000000)) + " Juta" + helper(n % 1000000);
        } else if (n < 1000000000000) {
          temp = helper(Math.floor(n / 1000000000)) + " Milyar" + helper(n % 1000000000);
        }
        return temp;
      }

      return helper(val).replace(/\\s+/g, " ").trim() + " Rupiah";
    }
  </script>
</body>
</html>
`;

  const [activeCodeTab, setActiveCodeTab] = useState<'codeGs' | 'indexHtml'>('codeGs');

  const getCodeContent = () => {
    return activeCodeTab === 'codeGs' ? codeGs : indexHtml;
  };

  const getFilename = () => {
    return activeCodeTab === 'codeGs' ? 'Code.gs' : 'Index.html';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
          <Code2 className="h-6 w-6 text-blue-600" />
          <span>Google Apps Script Developer Hub</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Salin kode backend dan antarmuka HTML untuk di-deploy langsung di Google Apps Script Web App Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panduan Deploy (Left Panel, 4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-950 flex items-center gap-2 border-b border-slate-100 pb-2.5 text-sm">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span>Panduan Langkah Deploy</span>
            </h3>
            
            <ol className="space-y-3.5 text-xs text-slate-600 list-decimal pl-4 leading-relaxed">
              <li>
                <p className="font-semibold text-slate-900">Buka Spreadsheet Database</p>
                <p className="mt-0.5">Buka file Google Sheets Anda yang memiliki 4 sheet berikut:</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 font-semibold text-slate-800">
                  <li><code className="text-[10px] bg-slate-100 px-1 rounded">DATA_SISWA</code></li>
                  <li><code className="text-[10px] bg-slate-100 px-1 rounded">BESARAN_BIAYA</code></li>
                  <li><code className="text-[10px] bg-slate-100 px-1 rounded">KEBUTUHAN_SISWA</code></li>
                  <li><code className="text-[10px] bg-slate-100 px-1 rounded">PEMBAYARAN</code></li>
                </ul>
              </li>
              <li>
                <p className="font-semibold text-slate-900">Masuk ke Apps Script</p>
                <p className="mt-0.5">Pada menu Spreadsheet atas, klik <strong className="text-slate-800">Ekstensi (Extensions)</strong> &gt; <strong className="text-slate-800">Apps Script</strong>.</p>
              </li>
              <li>
                <p className="font-semibold text-slate-900">Tulis Kode Backend</p>
                <p className="mt-0.5">Hapus kode default di <code className="bg-slate-100 p-0.5 rounded text-blue-600">Code.gs</code>, salin kode <strong className="text-blue-700">Code.gs</strong> dari tab kanan, lalu tempel di sana. Sesuaikan ID Spreadsheet Anda.</p>
              </li>
              <li>
                <p className="font-semibold text-slate-900">Buat File Antarmuka HTML</p>
                <p className="mt-0.5">Di panel kiri editor Apps Script, klik tombol <strong className="text-slate-800 font-black">+</strong> disamping Files, pilih <strong className="text-slate-800">HTML</strong>, beri nama <code className="bg-slate-100 p-0.5 rounded text-blue-600">Index</code> (tanpa ekstensi .html). Salin kode <strong className="text-blue-700">Index.html</strong> dari tab kanan lalu tempel di sana.</p>
              </li>
              <li>
                <p className="font-semibold text-slate-900">Simpan Projek</p>
                <p className="mt-0.5">Klik ikon <strong className="text-slate-800">Simpan Projek (Save project)</strong> di bilah atas editor Apps Script.</p>
              </li>
              <li>
                <p className="font-semibold text-slate-900">Deploy sebagai Web App</p>
                <p className="mt-0.5">Klik tombol <strong className="text-blue-700 font-bold">Terapkan (Deploy)</strong> &gt; <strong className="text-slate-800 font-bold">Penerapan Baru (New deployment)</strong>.</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-500">
                  <li>Pilih jenis: <strong className="text-slate-700">Aplikasi Web (Web App)</strong></li>
                  <li>Jalankan sebagai: <strong className="text-slate-700">Saya (Email Anda)</strong></li>
                  <li>Siapa yang memiliki akses: <strong className="text-slate-700">Siapa saja (Anyone)</strong></li>
                </ul>
              </li>
              <li>
                <p className="font-semibold text-slate-900">Berikan Otorisasi Akun</p>
                <p className="mt-0.5">Klik "Terapkan", berikan otorisasi akses ke akun Google Drive / Google Sheets Anda saat diminta (pilih akun &gt; Lanjutan / Advanced &gt; Buka Projek / Go to Untitled project).</p>
              </li>
              <li>
                <p className="font-semibold text-slate-900">Ambil URL Web App</p>
                <p className="mt-0.5">Salin URL Aplikasi Web yang diberikan. Aplikasi Kasir siap digunakan secara online dan aman oleh petugas!</p>
              </li>
            </ol>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-700 flex gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
              <span>
                <strong>Keunggulan Desain Terpadu:</strong> Antarmuka Index.html di kanan sudah dirancang <strong>Unified (All-in-One)</strong> yang menggabungkan login, kasir, dan laporan sekaligus. Anda tidak perlu repot mengelola banyak file HTML terpisah di Apps Script!
              </span>
            </div>
          </div>
        </div>

        {/* Code Files Display (Right Panel, 8 cols) */}
        <div className="lg:col-span-8 flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 shadow-md overflow-hidden min-h-[500px]">
          
          {/* File Selector Tabs */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveCodeTab('codeGs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeCodeTab === 'codeGs'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCode className="h-3.5 w-3.5" />
                <span>Code.gs</span>
              </button>
              <button
                onClick={() => setActiveCodeTab('indexHtml')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                  activeCodeTab === 'indexHtml'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Index.html (Unified)</span>
              </button>
            </div>

            <button
              onClick={() => handleCopy(getCodeContent(), activeCodeTab)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              {copiedTab === activeCodeTab ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Kode</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer Container */}
          <div className="flex-1 overflow-auto p-4 font-mono text-[11px] text-slate-300 leading-relaxed max-h-[600px] bg-slate-900 selection:bg-blue-500/30">
            <pre className="whitespace-pre">{getCodeContent()}</pre>
          </div>

          <div className="px-4 py-2 bg-slate-950 text-[10px] text-slate-500 border-t border-slate-800 flex justify-between items-center shrink-0">
            <span>Nama File: <strong>{getFilename()}</strong></span>
            <span>Siap di-copy & paste ke Editor Google Apps Script</span>
          </div>

        </div>

      </div>
    </div>
  );
}
