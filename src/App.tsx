/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, 
  LogOut, 
  User, 
  CreditCard, 
  LayoutDashboard, 
  Code, 
  Database, 
  RefreshCw, 
  CheckCircle,
  FileText,
  HelpCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';

import { Student, Fee, Need, Transaction, Role } from './types';
import { 
  INITIAL_STUDENTS, 
  INITIAL_FEES, 
  INITIAL_NEEDS, 
  INITIAL_TRANSACTIONS 
} from './data/mockData';
import { 
  fetchSheetData, 
  parseStudentRow, 
  parseFeeRow, 
  parseNeedRow,
  parseTransactionRow
} from './utils/googleSheets';

// Import subcomponents
import Login from './components/Login';
import Cashier from './components/Cashier';
import Reports from './components/Reports';
import GasCodeHub from './components/GasCodeHub';
import ReceiptPrint from './components/ReceiptPrint';
import Toast, { ToastData } from './components/Toast';
import ConfirmModal, { ConfirmDialogData } from './components/ConfirmModal';

export default function App() {
  // Authentication states
  const [role, setRole] = useState<Role>(null);
  const [username, setUsername] = useState<string>('');
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'kasir' | 'laporan' | 'gasHub' | 'dataMaster'>('kasir');

  // Database states
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [fees, setFees] = useState<Fee[]>(INITIAL_FEES);
  const [needs, setNeeds] = useState<Need[]>(INITIAL_NEEDS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Loading & Sheet ID configs
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    const cached = localStorage.getItem('kasir_seragam_spreadsheet_id');
    return cached && cached !== '1JY82gKbHrKjBYSbULZcPi6i49ot0t0xIBXXOgdZ2zEc' ? cached : '1JY82gKbHrKjBYSbULZcPi6i49ot0t0xIBXXOgdZ2zEc';
  });
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    const cached = localStorage.getItem('kasir_seragam_webapp_url');
    const oldDefault = 'https://script.google.com/macros/s/AKfycbwquPPCOgghZTxcFw-z7X5ICip2gy2FzPWH2dXg_zylpYGuGRfidgju7f94LHtbvVUTQw/exec';
    const newDefault = 'https://script.google.com/macros/s/AKfycbwqO75pP52G23T_6Dr2u4Xm07ZC9jewJ8AYH3Rr4C3ZyrXoYljBRbRkTvBX_AH-BMlbLw/exec';
    if (!cached || cached === oldDefault) {
      localStorage.setItem('kasir_seragam_webapp_url', newDefault);
      return newDefault;
    }
    return cached;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);

  // Overlay print state
  const [selectedPrintTransaction, setSelectedPrintTransaction] = useState<Transaction | null>(null);

  // Transaction Reset Tool states
  const [dropdownResetTxId, setDropdownResetTxId] = useState('');
  const [manualResetTxId, setManualResetTxId] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState('');

  // Toast & Confirm states
  const [toast, setToast] = useState<ToastData | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogData | null>(null);

  const showToast = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'success', title?: string) => {
    setToast({ type, message, title });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'danger' | 'warning' | 'info' = 'warning',
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batalkan',
    onCancel?: () => void
  ) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      confirmText,
      cancelText,
      type,
      onConfirm,
      onCancel
    });
  };

  // 1. Load transactions from localStorage or default (Start fresh with empty array)
  useEffect(() => {
    const hasBeenResetForProduction = localStorage.getItem('kasir_seragam_reset_for_production_v3');
    if (!hasBeenResetForProduction) {
      localStorage.setItem('kasir_seragam_transactions', JSON.stringify([]));
      localStorage.setItem('kasir_seragam_reset_for_production_v3', 'true');
      setTransactions([]);
    } else {
      const cached = localStorage.getItem('kasir_seragam_transactions');
      if (cached) {
        try {
          setTransactions(JSON.parse(cached));
        } catch (err) {
          console.error('Gagal memuat cache transaksi, menggunakan data kosong:', err);
          setTransactions([]);
        }
      } else {
        setTransactions([]);
        localStorage.setItem('kasir_seragam_transactions', JSON.stringify([]));
      }
    }
  }, []);

  // 2. Synchronize sheet data (True Bi-directional Sync)
  const syncWithGoogleSheets = async (targetId: string = spreadsheetId, targetUrl: string = webAppUrl) => {
    if (!targetId.trim()) return;
    setIsSyncing(true);
    setSyncStatus('idle');
    setSyncErrorMessage(null);

    // Simpan ke localStorage agar awet
    localStorage.setItem('kasir_seragam_spreadsheet_id', targetId);
    localStorage.setItem('kasir_seragam_webapp_url', targetUrl);

    try {
      // Ambil data siswa
      const loadedStudents = await fetchSheetData<Student>(
        targetId,
        'DATA_SISWA ',
        parseStudentRow
      );
      
      // Ambil data biaya
      const loadedFees = await fetchSheetData<Fee>(
        targetId,
        'BESARAN_BIAYA ',
        parseFeeRow
      );
      
      // Ambil data kebutuhan
      const loadedNeeds = await fetchSheetData<Need>(
        targetId,
        'KEBUTUHAN_SISWA',
        parseNeedRow
      );

      // Pastikan data yang terambil tidak kosong sebelum melakukan update
      if (loadedStudents.length > 0) setStudents(loadedStudents);
      if (loadedFees.length > 0) setFees(loadedFees);
      if (loadedNeeds.length > 0) setNeeds(loadedNeeds);

      // Ambil riwayat transaksi dari sheet PEMBAYARAN secara opsional (Bi-directional Sync)
      try {
        const loadedTransactions = await fetchSheetData<Transaction>(
          targetId,
          'PEMBAYARAN',
          parseTransactionRow
        );
        
        // Ambil daftar ID transaksi yang telah dihapus agar tidak muncul kembali
        const deletedIdsStr = localStorage.getItem('kasir_seragam_deleted_ids') || '[]';
        let deletedIds: string[] = [];
        try {
          deletedIds = JSON.parse(deletedIdsStr).map((id: string) => id.toLowerCase().trim());
        } catch {
          deletedIds = [];
        }

        // Ambil transaksi lokal saat ini
        const localTxStr = localStorage.getItem('kasir_seragam_transactions');
        const localTxList: Transaction[] = localTxStr ? JSON.parse(localTxStr) : [];
        
        const validSheetTx = (loadedTransactions || [])
          .filter((tx): tx is Transaction => tx !== null)
          .filter(tx => !deletedIds.includes(tx.idTransaksi.toLowerCase().trim()));

        const sheetTxIds = new Set(validSheetTx.map(tx => tx.idTransaksi));
        
        // 1. Cari transaksi lokal yang BELUM ADA di Google Sheets untuk diunggah (sync up)
        const missingOnSheet = localTxList
          .filter(tx => !deletedIds.includes(tx.idTransaksi.toLowerCase().trim()))
          .filter(tx => !sheetTxIds.has(tx.idTransaksi));
        
        if (missingOnSheet.length > 0 && targetUrlIsSet(targetUrl)) {
          console.log(`[Sync] Mengunggah ${missingOnSheet.length} transaksi lokal baru ke Google Sheets...`);
          for (const tx of missingOnSheet) {
            try {
              const res = await fetch('/api/save-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  webAppUrl: targetUrl,
                  action: 'saveTransaction',
                  transaction: tx
                })
              });
              if (!res.ok) {
                throw new Error(`Proxy status ${res.status}`);
              }
            } catch (uploadErr) {
              console.warn(`[Sync Warning] Gagal mengunggah transaksi ${tx.idTransaksi} via proxy, mencoba langsung:`, uploadErr);
              try {
                await fetch(targetUrl, {
                  method: 'POST',
                  mode: 'no-cors',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'saveTransaction',
                    transaction: tx
                  })
                });
              } catch (directErr) {
                console.error(`[Sync Error] Gagal mengunggah langsung ke Google Sheets:`, directErr);
              }
            }
          }
        }

        // 2. Gabungkan data transaksi dari Google Sheets dan lokal
        const mergedMap = new Map<string, Transaction>();
        
        // Google Sheets adalah sumber kebenaran (source of truth)
        validSheetTx.forEach(tx => mergedMap.set(tx.idTransaksi, tx));
        
        // Tambahkan transaksi lokal yang mungkin baru atau belum disinkronkan
        localTxList
          .filter(tx => !deletedIds.includes(tx.idTransaksi.toLowerCase().trim()))
          .forEach(tx => mergedMap.set(tx.idTransaksi, tx));
        
        // Konversi ke array dan urutkan descending agar transaksi terbaru berada di atas
        const mergedTransactions = Array.from(mergedMap.values()).sort((a, b) => {
          return b.idTransaksi.localeCompare(a.idTransaksi);
        });

        setTransactions(mergedTransactions);
        localStorage.setItem('kasir_seragam_transactions', JSON.stringify(mergedTransactions));
        
      } catch (txErr) {
        console.warn('Gagal memuat atau menyinkronkan transaksi dari PEMBAYARAN (mungkin belum ada transaksi):', txErr);
      }

      setSyncStatus('success');
    } catch (err: any) {
      console.warn('Gagal memuat data Google Sheet (menggunakan data lokal):', err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || 'CORS Blocked atau format sheet tidak sesuai');
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-sync once on mount dengan ID spreadsheet tersimpan
  useEffect(() => {
    syncWithGoogleSheets(spreadsheetId, webAppUrl);
  }, []);

  // Save transaction handler
  const handleSaveTransaction = async (newTx: Transaction) => {
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    localStorage.setItem('kasir_seragam_transactions', JSON.stringify(updated));
    
    // Auto show receipt print overlay
    setSelectedPrintTransaction(newTx);

    // Kirim data ke Google Sheets Web App secara asinkron di background via proxy
    if (targetUrlIsSet(webAppUrl)) {
      try {
        console.log('Mengirim transaksi ke Google Sheets Web App via Proxy:', webAppUrl);
        const res = await fetch('/api/save-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webAppUrl: webAppUrl,
            action: 'saveTransaction',
            transaction: newTx
          })
        });
        if (!res.ok) {
          throw new Error(`Proxy responded with status ${res.status}`);
        }
        console.log('Transaksi berhasil disimpan ke Google Sheets via Proxy!');
      } catch (err) {
        console.warn('Gagal menyimpan transaksi via proxy, mencoba langsung:', err);
        try {
          await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'saveTransaction',
              transaction: newTx
            })
          });
        } catch (directErr) {
          console.error('Gagal menyimpan transaksi ke Google Sheets Web App:', directErr);
        }
      }
    }
  };

  // Helper to check if URL is set and valid
  function targetUrlIsSet(url: string) {
    return url && url.trim() && (url.startsWith('http://') || url.startsWith('https://'));
  }

  // Delete transaction (Admin Only - and bidirectionally deleted from Sheets)
  const handleDeleteTransaction = async (id: string) => {
    const targetId = id.trim();
    
    // Simpan ke daftar ID yang telah dihapus di localStorage
    const deletedIdsStr = localStorage.getItem('kasir_seragam_deleted_ids') || '[]';
    let deletedIds: string[] = [];
    try {
      deletedIds = JSON.parse(deletedIdsStr);
    } catch {
      deletedIds = [];
    }
    if (!deletedIds.map(d => d.toLowerCase().trim()).includes(targetId.toLowerCase())) {
      deletedIds.push(targetId);
      localStorage.setItem('kasir_seragam_deleted_ids', JSON.stringify(deletedIds));
    }

    // 1. Hapus lokal
    const updated = transactions.filter(t => t.idTransaksi.toLowerCase() !== targetId.toLowerCase());
    setTransactions(updated);
    localStorage.setItem('kasir_seragam_transactions', JSON.stringify(updated));
    
    // 2. Hapus dari Google Sheets via proxy
    if (targetUrlIsSet(webAppUrl)) {
      try {
        console.log('Menghapus transaksi di Google Sheets:', targetId);
        const res = await fetch('/api/save-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webAppUrl: webAppUrl,
            action: 'deleteTransaction',
            idTransaksi: targetId
          })
        });
        
        if (res.ok) {
          const responseText = await res.text();
          if (responseText.includes('berhasil dihapus')) {
            showToast(`Transaksi ${targetId} berhasil dihapus dari database lokal dan Google Sheets secara dua arah (Bi-directional).`, 'success', 'Penghapusan Sukses');
          } else if (responseText.includes('success":true') || responseText.includes('"success":true')) {
            showToast(`Transaksi ${targetId} berhasil dihapus secara lokal, tetapi script Google Sheets Anda perlu diperbarui.`, 'warning', 'Update Google Script');
          } else {
            showToast(`Transaksi ${targetId} terhapus lokal, tetapi gagal di Google Sheets: ${responseText}`, 'warning', 'Penghapusan Sebagian');
          }
        } else {
          throw new Error(`Proxy responded with status ${res.status}`);
        }
      } catch (err: any) {
        console.warn(`Gagal menghapus transaksi via proxy, mencoba langsung:`, err);
        try {
          await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'deleteTransaction',
              idTransaksi: targetId
            })
          });
          showToast(`Transaksi ${targetId} berhasil dihapus secara lokal dan instruksi hapus dikirim langsung ke Google Sheets.`, 'success', 'Penghapusan Sukses');
        } catch (directErr) {
          console.error(`Gagal menghapus transaksi langsung dari Google Sheets:`, directErr);
          showToast(`Transaksi ${targetId} terhapus lokal, tetapi gagal menghubungi Google Sheets.`, 'warning', 'Koneksi Gagal');
        }
      }
    } else {
      showToast(`Transaksi ${targetId} berhasil dihapus dari database lokal.`, 'success', 'Penghapusan Sukses');
    }
  };

  // Update transaction (Admin Only - bidirectionally updated in Sheets)
  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    // 1. Update secara lokal
    const updated = transactions.map(t => 
      t.idTransaksi.toLowerCase() === updatedTx.idTransaksi.toLowerCase() ? updatedTx : t
    );
    setTransactions(updated);
    localStorage.setItem('kasir_seragam_transactions', JSON.stringify(updated));

    // 2. Kirim update ke Google Sheets via proxy
    if (targetUrlIsSet(webAppUrl)) {
      try {
        console.log('Mengubah transaksi di Google Sheets:', updatedTx.idTransaksi);
        const res = await fetch('/api/save-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webAppUrl: webAppUrl,
            action: 'editTransaction',
            transaction: updatedTx
          })
        });
        
        if (res.ok) {
          const responseText = await res.text();
          if (responseText.includes('berhasil diubah') || responseText.includes('"success":true') || responseText.includes('success":true')) {
            showToast(`Transaksi ${updatedTx.idTransaksi} berhasil diperbarui di database lokal dan Google Sheets secara dua arah (Bi-directional).`, 'success', 'Pembaruan Sukses');
          } else {
            showToast(`Transaksi ${updatedTx.idTransaksi} diperbarui secara lokal, tetapi gagal disinkronkan ke Google Sheets.`, 'warning', 'Pembaruan Sebagian');
          }
        } else {
          throw new Error(`Proxy responded with status ${res.status}`);
        }
      } catch (err: any) {
        console.warn(`Gagal mengubah transaksi via proxy, mencoba langsung:`, err);
        try {
          await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'editTransaction',
              transaction: updatedTx
            })
          });
          showToast(`Transaksi ${updatedTx.idTransaksi} diperbarui secara lokal dan instruksi edit dikirim langsung ke Google Sheets.`, 'success', 'Pembaruan Sukses');
        } catch (directErr) {
          console.error(`Gagal mengubah langsung di Google Sheets:`, directErr);
          showToast(`Transaksi ${updatedTx.idTransaksi} diperbarui secara lokal, tetapi gagal menghubungi Google Sheets.`, 'warning', 'Koneksi Gagal');
        }
      }
    } else {
      showToast(`Transaksi ${updatedTx.idTransaksi} diperbarui secara lokal.`, 'success', 'Pembaruan Sukses');
    }
  };

  // Manual Reset / Delete Transaction Tool
  const handleManualResetTransaction = async (id: string) => {
    if (!id.trim()) {
      setResetStatus('error');
      setResetMessage('Harap masukkan ID Transaksi yang valid.');
      return;
    }

    const targetId = id.trim();
    setResetStatus('loading');
    setResetMessage('Sedang memproses penghapusan...');

    // Find matching transaction (case-insensitive) to get its exact casing
    const foundTx = transactions.find(t => t.idTransaksi.toLowerCase() === targetId.toLowerCase());
    const exactId = foundTx ? foundTx.idTransaksi : targetId;

    // Simpan ke daftar ID yang telah dihapus di localStorage agar tidak kembali saat sync
    const deletedIdsStr = localStorage.getItem('kasir_seragam_deleted_ids') || '[]';
    let deletedIds: string[] = [];
    try {
      deletedIds = JSON.parse(deletedIdsStr);
    } catch {
      deletedIds = [];
    }
    if (!deletedIds.map(d => d.toLowerCase().trim()).includes(exactId.toLowerCase())) {
      deletedIds.push(exactId);
      localStorage.setItem('kasir_seragam_deleted_ids', JSON.stringify(deletedIds));
    }

    // 1. Cari dan hapus secara lokal
    const existsLocally = transactions.some(t => t.idTransaksi.toLowerCase() === exactId.toLowerCase());
    const updated = transactions.filter(t => t.idTransaksi.toLowerCase() !== exactId.toLowerCase());
    setTransactions(updated);
    localStorage.setItem('kasir_seragam_transactions', JSON.stringify(updated));

    // 2. Hapus dari Google Sheets via proxy
    let sheetsSuccess = false;
    let sheetsMessage = '';
    let isOldScript = false;
    
    if (targetUrlIsSet(webAppUrl)) {
      try {
        console.log('Menghapus transaksi di Google Sheets via Proxy:', exactId);
        const res = await fetch('/api/save-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webAppUrl: webAppUrl,
            action: 'deleteTransaction',
            idTransaksi: exactId
          })
        });
        
        if (res.ok) {
          const responseText = await res.text();
          let jsonResponse;
          try {
            jsonResponse = JSON.parse(responseText);
          } catch {
            jsonResponse = { success: true };
          }
          
          if (responseText.includes('berhasil dihapus')) {
            sheetsSuccess = true;
            sheetsMessage = 'dan berhasil dihapus dari Google Sheets.';
          } else if (jsonResponse.success || responseText.includes('success":true') || responseText.includes('"success":true')) {
            // Berhasil tetapi tidak ada pesan konfirmasi hapus -> kemungkinan script lama
            isOldScript = true;
            sheetsMessage = 'tetapi GAGAL dihapus di Google Sheets karena Google Sheets Anda menggunakan script versi lama.';
          } else {
            sheetsMessage = `tetapi gagal dihapus dari Google Sheets (Pesan: ${jsonResponse.message || responseText}).`;
          }
        } else {
          throw new Error(`Proxy responded with status ${res.status}`);
        }
      } catch (err: any) {
        console.warn('Gagal menghapus via proxy, mencoba langsung:', err);
        try {
          await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'deleteTransaction',
              idTransaksi: exactId
            })
          });
          sheetsSuccess = true;
          sheetsMessage = 'dan instruksi hapus berhasil dikirim langsung ke Google Sheets.';
        } catch (directErr: any) {
          console.error('Gagal menghapus dari Google Sheets langsung:', directErr);
          sheetsMessage = `tetapi gagal menghubungi Google Sheets (${directErr.message || 'CORS/Koneksi'}).`;
        }
      }
    } else {
      sheetsMessage = '(Hanya dihapus lokal karena URL Web App belum diset).';
    }

    if (sheetsSuccess) {
      setResetStatus('success');
      setResetMessage(`Transaksi ${exactId} berhasil dihapus secara lokal ${sheetsMessage}`);
      setDropdownResetTxId('');
      setManualResetTxId('');
    } else if (isOldScript) {
      setResetStatus('error');
      setResetMessage(`Transaksi ${exactId} dihapus secara lokal, ${sheetsMessage} PENTING: Silakan buka tab "GAS Developer Hub" untuk menyalin dan menerapkan kode terbaru agar terhindar dari baris kosong di Google Sheets.`);
      setDropdownResetTxId('');
      setManualResetTxId('');
    } else if (existsLocally) {
      setResetStatus('success');
      setResetMessage(`Transaksi ${exactId} berhasil dihapus secara lokal, ${sheetsMessage}`);
      setDropdownResetTxId('');
      setManualResetTxId('');
    } else {
      setResetStatus('error');
      setResetMessage(`ID Transaksi ${exactId} tidak ditemukan. ${sheetsMessage}`);
    }
  };

  // Actual execution of clearing all transactions
  const executeClearAllTransactions = async (deleteOnSheets: boolean) => {
    setResetStatus('loading');
    setResetMessage('Sedang menghapus semua transaksi...');

    // 1. Ambil semua ID transaksi saat ini untuk dimasukkan ke deletedIds agar tidak ditarik kembali saat sync
    const currentTxIds = transactions.map(t => t.idTransaksi.trim());
    const deletedIdsStr = localStorage.getItem('kasir_seragam_deleted_ids') || '[]';
    let deletedIds: string[] = [];
    try {
      deletedIds = JSON.parse(deletedIdsStr);
    } catch {
      deletedIds = [];
    }

    // Masukkan semua ID transaksi saat ini ke list terhapus
    currentTxIds.forEach(id => {
      if (!deletedIds.map(d => d.toLowerCase().trim()).includes(id.toLowerCase())) {
        deletedIds.push(id);
      }
    });
    localStorage.setItem('kasir_seragam_deleted_ids', JSON.stringify(deletedIds));

    // 2. Hapus secara lokal (simpan array kosong [] agar tidak kembali ke data awal mockData)
    setTransactions([]);
    localStorage.setItem('kasir_seragam_transactions', JSON.stringify([]));

    let sheetsMessage = '';
    // 3. Jika disinkronkan ke Google Sheets
    if (deleteOnSheets && targetUrlIsSet(webAppUrl)) {
      try {
        console.log('Menghapus seluruh transaksi di Google Sheets via Proxy...');
        const res = await fetch('/api/save-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            webAppUrl: webAppUrl,
            action: 'clearAllTransactions'
          })
        });

        if (res.ok) {
          const responseText = await res.text();
          if (responseText.includes('berhasil dihapus') || responseText.includes('"success":true') || responseText.includes('success":true')) {
            sheetsMessage = 'dan berhasil mengosongkan database Google Sheets secara dua arah (Bi-directional).';
            setResetStatus('success');
            setResetMessage(`Sukses: Seluruh transaksi berhasil dihapus dari database lokal ${sheetsMessage}`);
            showToast(`Seluruh data transaksi berhasil dihapus secara permanen dari database lokal dan Google Sheets.`, 'success', 'Penghapusan Sukses');
          } else {
            sheetsMessage = `tetapi gagal mengosongkan Google Sheets (Pesan: ${responseText}).`;
            setResetStatus('error');
            setResetMessage(`Seluruh transaksi lokal berhasil dihapus, ${sheetsMessage}\n\nPastikan Anda sudah mengupdate kode Apps Script dari menu "GAS Developer Hub".`);
            showToast(`Transaksi lokal terhapus, tetapi gagal di Google Sheets.`, 'warning', 'Pembaruan Sebagian');
          }
        } else {
          throw new Error(`Proxy responded with status ${res.status}`);
        }
      } catch (err: any) {
        console.warn('Gagal menghapus semua transaksi via proxy, mencoba langsung:', err);
        try {
          await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'clearAllTransactions'
            })
          });
          sheetsMessage = 'dan instruksi pengosongan berhasil dikirim langsung ke Google Sheets.';
          setResetStatus('success');
          setResetMessage(`Sukses: Seluruh transaksi berhasil dihapus dari database lokal ${sheetsMessage}`);
          showToast(`Seluruh data transaksi berhasil dihapus secara permanen dari database lokal dan dikirim langsung ke Google Sheets.`, 'success', 'Penghapusan Sukses');
        } catch (directErr: any) {
          console.error('Gagal menghapus semua transaksi langsung:', directErr);
          sheetsMessage = `tetapi gagal menghubungi Google Sheets (${directErr.message || 'CORS/Koneksi'}).`;
          setResetStatus('error');
          setResetMessage(`Seluruh transaksi lokal berhasil dihapus, ${sheetsMessage}`);
          showToast(`Transaksi lokal terhapus, tetapi gagal menghubungi Google Sheets.`, 'warning', 'Koneksi Gagal');
        }
      }
    } else {
      setResetStatus('success');
      setResetMessage('Sukses: Seluruh transaksi lokal berhasil dihapus secara permanen.');
      showToast('Seluruh transaksi lokal berhasil dihapus secara permanen.', 'success', 'Penghapusan Sukses');
    }
  };

  // Clear/Delete All Transactions
  const handleClearAllTransactions = () => {
    showConfirm(
      "⚠️ PERINGATAN SANGAT PENTING!",
      "Apakah Anda benar-benar yakin ingin MENGHAPUS SELURUH TRANSAKSI pada aplikasi ini? Tindakan ini akan mengosongkan seluruh riwayat pembayaran dari penyimpanan lokal perangkat ini.",
      () => {
        showConfirm(
          "⚠️ KONFIRMASI TERAKHIR (TIDAK BISA DIBATALKAN)",
          "Apakah Anda juga ingin menghapus secara permanen seluruh data transaksi tersebut dari Google Sheets spreadsheet Anda?",
          () => {
            executeClearAllTransactions(true);
          },
          'danger',
          'Ya, Hapus di Sheets & Lokal',
          'Tidak, Hanya Hapus Lokal',
          () => {
            executeClearAllTransactions(false);
          }
        );
      },
      'danger',
      'Ya, Hapus Semua',
      'Batalkan'
    );
  };

  const handleLoginSuccess = (userRole: Role, name: string) => {
    setRole(userRole);
    setUsername(name);
    // Default route
    if (userRole === 'kepsek') {
      setActiveTab('laporan');
    } else {
      setActiveTab('kasir');
    }
  };

  const handleLogout = () => {
    setRole(null);
    setUsername('');
    setSelectedPrintTransaction(null);
  };

  // Render Login page if not authenticated
  if (!role) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="main-application-container" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* 1. TOP HEADER NAVIGATION - HIDDEN DURING PRINTING */}
      <header id="app-header-nav" className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo Brand */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md shadow-blue-100 shrink-0">
                KA
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase font-display leading-none">
                  Sistem Kasir ANDALAN
                </h1>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Koperasi Seragam & Atribut
                </p>
              </div>
            </div>

            {/* Middle Nav Tabs */}
            <nav className="hidden md:flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
              {role !== 'kepsek' && (
                <button
                  id="tab-nav-kasir"
                  onClick={() => setActiveTab('kasir')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'kasir'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  Loket Transaksi
                </button>
              )}
              
              {(role === 'admin' || role === 'kepsek') && (
                <button
                  id="tab-nav-laporan"
                  onClick={() => setActiveTab('laporan')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'laporan'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  Rekap & Laporan
                </button>
              )}

              {role !== 'kepsek' && (
                <button
                  id="tab-nav-datamaster"
                  onClick={() => setActiveTab('dataMaster')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'dataMaster'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  Data Master & Sync
                </button>
              )}

              {role !== 'kepsek' && (
                <button
                  id="tab-nav-gashub"
                  onClick={() => setActiveTab('gasHub')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    activeTab === 'gasHub'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  GAS Developer Hub
                </button>
              )}
            </nav>

            {/* Right User Controls */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800">{username}</p>
                <p className="text-[9px] text-slate-400 uppercase font-mono font-bold tracking-wider">
                  Petugas {role}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100 shrink-0">
                {username.charAt(0)}
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                title="Keluar"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* MOBILE NAV TABS CONTAINER - HIDDEN IN PRINT */}
      <div className="no-print md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0 overflow-x-auto gap-2">
        {role !== 'kepsek' && (
          <button
            onClick={() => setActiveTab('kasir')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${
              activeTab === 'kasir' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-50'
            }`}
          >
            Loket Kasir
          </button>
        )}
        {(role === 'admin' || role === 'kepsek') && (
          <button
            onClick={() => setActiveTab('laporan')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${
              activeTab === 'laporan' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-50'
            }`}
          >
            Laporan
          </button>
        )}
        {role !== 'kepsek' && (
          <button
            onClick={() => setActiveTab('dataMaster')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${
              activeTab === 'dataMaster' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-50'
            }`}
          >
            Master
          </button>
        )}
        {role !== 'kepsek' && (
          <button
            onClick={() => setActiveTab('gasHub')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap ${
              activeTab === 'gasHub' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-50'
            }`}
          >
            GAS Hub
          </button>
        )}
      </div>

      {/* 2. MAIN WORKSPACE CONTENT AREA - HIDDEN IN PRINT */}
      <main id="app-workspace-body" className="no-print flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'kasir' && role !== 'kepsek' && (
              <Cashier 
                students={students}
                fees={fees}
                needs={needs}
                onSaveTransaction={handleSaveTransaction}
                currentUser={username}
                showToast={showToast}
              />
            )}

            {activeTab === 'laporan' && (role === 'admin' || role === 'kepsek') && (
              <Reports 
                transactions={transactions}
                needs={needs}
                onDeleteTransaction={role === 'admin' ? handleDeleteTransaction : undefined}
                onUpdateTransaction={role === 'admin' ? handleUpdateTransaction : undefined}
                onPrintTransaction={setSelectedPrintTransaction}
                showToast={showToast}
                showConfirm={showConfirm}
              />
            )}

            {activeTab === 'gasHub' && role !== 'kepsek' && (
              <GasCodeHub />
            )}

            {activeTab === 'dataMaster' && role !== 'kepsek' && (
              <div className="space-y-6">
                
                {/* Spreadsheet Sync controls */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 font-display">Sinkronisasi Google Sheets</h2>
                      <p className="text-slate-400 text-xs mt-0.5">Atur Spreadsheet ID Anda untuk mengambil data siswa secara real-time.</p>
                    </div>
                    <div className="text-xs bg-slate-100 text-slate-600 font-semibold px-2.5 py-1 rounded-full border border-slate-200 uppercase font-mono tracking-wider shrink-0">
                      Google Sheets Integration
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="sheetIdInput" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                          Google Sheets Spreadsheet ID
                        </label>
                        <input
                          id="sheetIdInput"
                          type="text"
                          value={spreadsheetId || ''}
                          onChange={(e) => setSpreadsheetId(e.target.value || '')}
                          className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none"
                          placeholder="Masukkan Spreadsheet ID (misal: 1JY82gKbHrKjBYSbULZcPi6i...)"
                        />
                      </div>
                      <div>
                        <label htmlFor="webAppUrlInput" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                          Google Apps Script Web App URL
                        </label>
                        <input
                          id="webAppUrlInput"
                          type="text"
                          value={webAppUrl || ''}
                          onChange={(e) => setWebAppUrl(e.target.value || '')}
                          className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none"
                          placeholder="Masukkan Web App URL (misal: https://script.google.com/macros/s/.../exec)"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-50">
                      <button
                        onClick={() => {
                          setSpreadsheetId('1JY82gKbHrKjBYSbULZcPi6i49ot0t0xIBXXOgdZ2zEc');
                          setWebAppUrl('https://script.google.com/macros/s/AKfycbwqO75pP52G23T_6Dr2u4Xm07ZC9jewJ8AYH3Rr4C3ZyrXoYljBRbRkTvBX_AH-BMlbLw/exec');
                          syncWithGoogleSheets(
                            '1JY82gKbHrKjBYSbULZcPi6i49ot0t0xIBXXOgdZ2zEc',
                            'https://script.google.com/macros/s/AKfycbwqO75pP52G23T_6Dr2u4Xm07ZC9jewJ8AYH3Rr4C3ZyrXoYljBRbRkTvBX_AH-BMlbLw/exec'
                          );
                        }}
                        className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition-all cursor-pointer border border-slate-200"
                        title="Kembalikan Default ID & URL"
                      >
                        Reset Default
                      </button>
                      <button
                        onClick={() => syncWithGoogleSheets(spreadsheetId, webAppUrl)}
                        disabled={isSyncing}
                        className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Menghubungkan...' : 'Sinkronisasi Data (Bi-directional)'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Sync Status Feedback */}
                  {syncStatus === 'success' && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-lg text-emerald-700 text-xs flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 shrink-0" />
                      <span><strong>Koneksi Berhasil:</strong> Data siswa (DATA_SISWA), Kategori Biaya (BESARAN_BIAYA), dan Item Seragam (KEBUTUHAN_SISWA) berhasil diselaraskan langsung dari Google Sheet!</span>
                    </div>
                  )}

                  {syncStatus === 'error' && (
                    <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-lg text-amber-700 text-xs space-y-1">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>Gagal Mengambil Data Google Sheets Online</span>
                      </div>
                      <p className="pl-6 text-slate-500 text-[11px]">
                        Penyebab: CORS/Keamanan browser, atau link sheet belum di-share ke "Siapa saja dengan link dapat melihat".
                        <br />
                        <strong>Sistem dialihkan menggunakan Database Cadangan Lokal (Offline Mock Mode) agar aplikasi tetap berjalan sempurna.</strong>
                      </p>
                    </div>
                  )}
                </div>

                {/* ALAT RESET ID TRANSAKSI */}
                <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 font-display">Alat Reset / Hapus ID Transaksi</h2>
                      <p className="text-slate-400 text-xs mt-0.5">Hapus transaksi yang salah atau tidak digunakan dari database lokal dan Google Sheets secara dua arah (Bi-directional).</p>
                    </div>
                    <div className="text-xs bg-rose-50 text-rose-600 font-semibold px-2.5 py-1 rounded-full border border-rose-100 uppercase font-mono tracking-wider shrink-0">
                      Reset Utility
                    </div>
                  </div>

                  {/* PENTING / INSTRUCTIONAL CARD */}
                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-800">
                      <HelpCircle className="h-4 w-4 shrink-0" />
                      <span>Panduan Sinkronisasi Penghapusan (PENTING!)</span>
                    </div>
                    <p className="leading-relaxed">
                      Penghapusan dua arah memerlukan versi script Google Apps Script terbaru. Jika Anda masih menggunakan script lama, tindakan menghapus justru akan membuat baris kosong baru di spreadsheet Anda.
                    </p>
                    <div className="pl-4 list-decimal space-y-1 text-slate-700">
                      <div>1. Buka tab <strong className="text-slate-900">GAS Developer Hub</strong> di atas lalu salin seluruh kode di sana.</div>
                      <div>2. Buka Spreadsheet Anda &rarr; Ekstensi &rarr; Apps Script, lalu tempel kode tersebut.</div>
                      <div>3. Klik tombol Simpan, lalu klik <strong className="text-slate-900">Terapkan &rarr; Penerapan baru (Deploy &rarr; New deployment)</strong> sebagai "Siapa saja (Anyone)".</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* COLUMN 1: SELECT FROM HISTORY */}
                      <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 flex flex-col justify-between space-y-4">
                        <div>
                          <label htmlFor="resetTxIdSelect" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                            Pilih ID Transaksi dari Riwayat
                          </label>
                          <select
                            id="resetTxIdSelect"
                            value={dropdownResetTxId || ''}
                            onChange={(e) => {
                              setDropdownResetTxId(e.target.value || '');
                              // Clear manual state to keep focus clean
                              setManualResetTxId('');
                            }}
                            className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-white focus:outline-none font-medium"
                          >
                            <option value="">-- Pilih ID Transaksi untuk dihapus --</option>
                            {transactions.map((tx) => (
                              <option key={tx.idTransaksi} value={tx.idTransaksi || ''}>
                                {tx.idTransaksi} - {tx.namaSiswa} ({tx.tanggal}) - Rp{tx.biaya.toLocaleString('id-ID')}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                         <button
                          type="button"
                          onClick={() => {
                            showConfirm(
                              "Hapus Transaksi Terpilih",
                              `Apakah Anda yakin ingin menghapus transaksi terpilih dengan ID "${dropdownResetTxId}"? Tindakan ini akan menghapus data dari lokal dan Google Sheets secara permanen.`,
                              () => {
                                handleManualResetTransaction(dropdownResetTxId);
                              },
                              'danger',
                              'Ya, Hapus Permanen'
                            );
                          }}
                          disabled={resetStatus === 'loading' || !dropdownResetTxId}
                          className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus Transaksi Terpilih</span>
                        </button>
                      </div>

                      {/* COLUMN 2: MANUAL TEXT INPUT */}
                      <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 flex flex-col justify-between space-y-4">
                        <div>
                          <label htmlFor="resetTxIdInput" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                            Atau Masukkan Manual ID Transaksi
                          </label>
                          <input
                            id="resetTxIdInput"
                            type="text"
                            value={manualResetTxId || ''}
                            onChange={(e) => {
                              setManualResetTxId(e.target.value || '');
                              // Clear dropdown state to keep focus clean
                              setDropdownResetTxId('');
                            }}
                            className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-white focus:outline-none"
                            placeholder="Contoh: TRX-20260706-1234"
                          />
                        </div>
                                         <button
                          type="button"
                          onClick={() => {
                            showConfirm(
                              "Hapus Transaksi Manual",
                              `Apakah Anda yakin ingin menghapus transaksi manual dengan ID "${manualResetTxId}"? Tindakan ini akan menghapus data dari lokal dan Google Sheets secara permanen.`,
                              () => {
                                handleManualResetTransaction(manualResetTxId);
                              },
                              'danger',
                              'Ya, Hapus Permanen'
                            );
                          }}
                          disabled={resetStatus === 'loading' || !manualResetTxId.trim()}
                          className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus via ID Manual</span>
                        </button>
                      </div>

                    </div>

                    {/* DANGEROUS ZONE: CLEAR ALL DATA */}
                    <div className="bg-rose-50/50 border border-rose-200/60 rounded-xl p-5 mt-4 space-y-4 text-left">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-rose-100 rounded-lg text-rose-600 shrink-0">
                          <ShieldAlert className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-rose-950 text-xs uppercase tracking-wider">Zona Bahaya: Hapus Semua Transaksi</h4>
                          <p className="text-xs text-rose-800/80 mt-1 leading-relaxed">
                            Tindakan ini akan mengosongkan seluruh riwayat pembayaran di aplikasi ini secara permanen. Anda dapat memilih untuk mengosongkan database lokal saja atau sekaligus mengosongkan spreadsheet Google Sheets (jika terhubung).
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2 border-t border-rose-100">
                        <button
                          type="button"
                          onClick={handleClearAllTransactions}
                          disabled={resetStatus === 'loading'}
                          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Hapus Semua Transaksi</span>
                        </button>
                      </div>
                    </div>

                    {/* LIVE TRANSACTION DETAIL CARD */}
                    {(dropdownResetTxId || manualResetTxId) && (() => {
                      const activeId = dropdownResetTxId || manualResetTxId;
                      const selectedTx = transactions.find(t => t.idTransaksi.toLowerCase() === activeId.trim().toLowerCase());
                      if (!selectedTx) return null;
                      return (
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2 mt-1">
                          <p className="font-bold text-slate-700">Detail Transaksi yang Dipilih:</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-slate-600">
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-400">Nama Siswa</span>
                              <span className="font-bold text-slate-800">{selectedTx.namaSiswa}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-400">Kelas / No</span>
                              <span>{selectedTx.kelas} / #{selectedTx.noSiswa}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-400">Tanggal</span>
                              <span>{selectedTx.tanggal}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] uppercase font-semibold text-slate-400">Total Biaya</span>
                              <span className="font-bold text-rose-600">Rp{selectedTx.biaya.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {resetStatus === 'success' && (
                      <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-lg text-emerald-700 text-xs flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 shrink-0" />
                        <span>{resetMessage}</span>
                      </div>
                    )}

                    {resetStatus === 'error' && (
                      <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-lg text-rose-700 text-xs flex items-center gap-2 font-medium">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{resetMessage}</span>
                      </div>
                    )}

                    {resetStatus === 'loading' && (
                      <div className="bg-slate-100 border border-slate-200 p-3.5 rounded-lg text-slate-600 text-xs flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                        <span>{resetMessage}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DB Viewer tables */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* DATA_SISWA */}
                  <div className="lg:col-span-6 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-4">
                    <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 text-sm">
                      <Database className="h-4 w-4 text-blue-500" />
                      <span>Data Siswa Terpilih ({students.length})</span>
                    </h3>
                    <div className="overflow-y-auto max-h-[300px] border border-slate-100 rounded-lg">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                            <th className="p-2.5 pl-4">No</th>
                            <th className="p-2.5">Nama Siswa</th>
                            <th className="p-2.5">JK</th>
                            <th className="p-2.5">Kelas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {students.map((st) => (
                            <tr key={st.no} className="hover:bg-slate-50">
                              <td className="p-2.5 pl-4 font-mono text-slate-400">#{st.no}</td>
                              <td className="p-2.5 font-bold text-slate-800">{st.namaSiswa}</td>
                              <td className="p-2.5 text-slate-500 font-bold">{st.jenisKelamin}</td>
                              <td className="p-2.5 text-slate-500">{st.kelas}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* BESARAN_BIAYA & KEBUTUHAN_SISWA */}
                  <div className="lg:col-span-6 space-y-6">
                    
                    {/* BESARAN_BIAYA */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-4">
                      <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-emerald-500" />
                        <span>Besaran Biaya Seragam ({fees.length})</span>
                      </h3>
                      <div className="overflow-y-auto max-h-[150px] border border-slate-100 rounded-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                              <th className="p-2.5 pl-4">No</th>
                              <th className="p-2.5">Kategori / Jenis Seragam</th>
                              <th className="p-2.5">Biaya</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {fees.map((fee) => (
                              <tr key={fee.no} className="hover:bg-slate-50">
                                <td className="p-2.5 pl-4 font-mono text-slate-400">#{fee.no}</td>
                                <td className="p-2.5 text-slate-700 font-medium">{fee.jenis}</td>
                                <td className="p-2.5 font-bold text-emerald-600">Rp {fee.biaya.toLocaleString('id-ID')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* KEBUTUHAN_SISWA */}
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden p-5 space-y-4">
                      <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 text-sm">
                        <Database className="h-4 w-4 text-amber-500" />
                        <span>Katalog Checklist Kebutuhan ({needs.length})</span>
                      </h3>
                      <div className="overflow-y-auto max-h-[150px] border border-slate-100 rounded-lg">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                              <th className="p-2.5 pl-4">No</th>
                              <th className="p-2.5">Kategori Item</th>
                              <th className="p-2.5">Satuan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {needs.map((nd) => (
                              <tr key={nd.no} className="hover:bg-slate-50">
                                <td className="p-2.5 pl-4 font-mono text-slate-400">#{nd.no}</td>
                                <td className="p-2.5 text-slate-700 font-medium">{nd.jenis}</td>
                                <td className="p-2.5 font-bold uppercase text-slate-400">{nd.satuan}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 3. RECEIPT PRINT PREVIEW MODAL SCREEN (OVERLAY ON REACT) */}
      <ReceiptPrint 
        transaction={selectedPrintTransaction}
        needs={needs}
        onClose={() => setSelectedPrintTransaction(null)}
      />

      {/* 4. CUSTOM TOAST & CONFIRMATION MODALS (IFRAME SAFE) */}
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmModal dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />

    </div>
  );
}
