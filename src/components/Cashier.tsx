/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, User, CreditCard, CheckSquare, Save, Printer, RefreshCw, Check, Info, FileText } from 'lucide-react';
import { Student, Fee, Need, Transaction } from '../types';
import { convertToTerbilang } from '../utils/terbilang';

interface CashierProps {
  students: Student[];
  fees: Fee[];
  needs: Need[];
  onSaveTransaction: (transaction: Transaction) => void;
  currentUser: string;
  showToast?: (message: string, type?: 'success' | 'warning' | 'error' | 'info', title?: string) => void;
}

export default function Cashier({ students, fees, needs, onSaveTransaction, currentUser, showToast }: CashierProps) {
  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [checkedNeeds, setCheckedNeeds] = useState<number[]>([]);
  
  const [petugas1, setPetugas1] = useState(currentUser);
  const [petugas2, setPetugas2] = useState('Petugas Koperasi');
  
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedTransaction, setSavedTransaction] = useState<Transaction | null>(null);

  // Filter students based on search term (Nama or No)
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = students.filter(
      (s) =>
        s.namaSiswa.toLowerCase().includes(term) ||
        String(s.no).includes(term) ||
        s.kelas.toLowerCase().includes(term)
    );
    setSearchResults(filtered.slice(0, 5)); // limit to 5 results for dropdown
  }, [searchTerm, students]);

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSearchTerm('');
    setSearchResults([]);
    
    // Auto preset checklist based on gender (optional smart feature if helpful)
    // By default, let's keep it clean, but select all items (1-9) to save cashier time
    setCheckedNeeds(needs.map(n => n.no));
  };

  const handleToggleNeed = (no: number) => {
    if (checkedNeeds.includes(no)) {
      setCheckedNeeds(checkedNeeds.filter((item) => item !== no));
    } else {
      setCheckedNeeds([...checkedNeeds, no]);
    }
  };

  const handleSelectAllNeeds = () => {
    if (checkedNeeds.length === needs.length) {
      setCheckedNeeds([]);
    } else {
      setCheckedNeeds(needs.map((n) => n.no));
    }
  };

  const handleResetForm = () => {
    setSelectedStudent(null);
    setSelectedFee(null);
    setCheckedNeeds([]);
    setSearchTerm('');
    setSavedTransaction(null);
    setIsSuccess(false);
  };

  // Format currency
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleProcessPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      if (showToast) {
        showToast('Silakan pilih siswa terlebih dahulu.', 'warning', 'Siswa Belum Dipilih');
      } else {
        alert('Silakan pilih siswa terlebih dahulu.');
      }
      return;
    }
    if (!selectedFee) {
      if (showToast) {
        showToast('Silakan pilih jenis besaran biaya.', 'warning', 'Besaran Biaya Belum Dipilih');
      } else {
        alert('Silakan pilih jenis besaran biaya.');
      }
      return;
    }

    const timestamp = new Date();
    const dateString = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const uniqueId = `TRX-${timestamp.getFullYear()}${String(timestamp.getMonth() + 1).padStart(2, '0')}${String(timestamp.getDate()).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const transactionData: Transaction = {
      idTransaksi: uniqueId,
      tanggal: dateString,
      noSiswa: selectedStudent.no,
      namaSiswa: selectedStudent.namaSiswa,
      kelas: selectedStudent.kelas,
      jenisKelamin: selectedStudent.jenisKelamin,
      jenisBiaya: selectedFee.jenis,
      biaya: selectedFee.biaya,
      terbilang: convertToTerbilang(selectedFee.biaya),
      kebutuhanDiserahkan: checkedNeeds,
      petugas1: petugas1.trim() || currentUser,
      petugas2: petugas2.trim() || 'Petugas Koperasi'
    };

    onSaveTransaction(transactionData);
    setSavedTransaction(transactionData);
    setIsSuccess(true);
  };

  // Custom event to trigger print of the receipt
  const triggerPrintReceipt = () => {
    // We will pass the transaction object to the parent so it can display a printable iframe or print view
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 font-display">Loket Transaksi Kasir</h1>
        <p className="text-slate-500 text-sm mt-1">
          Alur pencarian siswa, kalkulasi terbilang rupiah, ceklist pengambilan seragam, dan cetak bukti bayar.
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <form onSubmit={handleProcessPayment} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT PANEL (8 cols in lg) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* STEP 1: Pencarian Siswa */}
              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Langkah 1: Cari Data Siswa</h3>
                </div>

                <div className="relative">
                  <label htmlFor="searchSiswa" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Cari berdasarkan Nama Siswa, No Urut, atau Kelas
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      id="searchSiswa"
                      type="text"
                      value={searchTerm || ''}
                      onChange={(e) => setSearchTerm(e.target.value || '')}
                      className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                      placeholder="Ketik nama siswa (misal: Ahmad) atau nomor urut..."
                    />
                  </div>

                  {/* Dropdown search results */}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white rounded-xl shadow-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                      {searchResults.map((student) => (
                        <button
                          key={student.no}
                          type="button"
                          onClick={() => handleSelectStudent(student)}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
                              {student.no}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{student.namaSiswa}</p>
                              <p className="text-xs text-slate-400">Kelas {student.kelas} • {student.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                            </div>
                          </div>
                          <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-1 rounded-full">
                            Pilih Siswa
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* STEP 2: Identitas Siswa */}
                {selectedStudent ? (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-4"
                  >
                    <div className="p-3 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                      <User className="h-6 w-6" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                      <div>
                        <p className="text-xs text-slate-400 font-medium">No. Urut Siswa</p>
                        <p className="font-bold text-slate-800 text-base">#{selectedStudent.no}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Nama Lengkap</p>
                        <p className="font-bold text-slate-800 text-base">{selectedStudent.namaSiswa}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Jenis Kelamin</p>
                        <p className="font-bold text-slate-800 text-base">
                          {selectedStudent.jenisKelamin === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 font-medium">Kelas</p>
                        <p className="font-bold text-slate-800 text-base">{selectedStudent.kelas}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
                    <User className="h-8 w-8 text-slate-300" />
                    <span>Belum ada siswa terpilih. Cari dan klik nama siswa di atas.</span>
                  </div>
                )}
              </div>

              {/* STEP 3 & 4: Pilih Biaya & Kalkulasi */}
              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Langkah 2: Informasi Biaya & Pembayaran</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="selectBiaya" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Pilih Jenis Kategori Seragam / Biaya (BESARAN_BIAYA)
                    </label>
                    <select
                      id="selectBiaya"
                      disabled={!selectedStudent}
                      value={selectedFee ? selectedFee.no : ''}
                      onChange={(e) => {
                        const feeNo = parseInt(e.target.value, 10);
                        const fee = fees.find((f) => f.no === feeNo);
                        setSelectedFee(fee || null);
                      }}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Pilih Besaran Biaya Seragam --</option>
                      {fees.map((fee) => (
                        <option key={fee.no} value={fee.no}>
                          {fee.jenis} - {formatRupiah(fee.biaya)}
                        </option>
                      ))}
                    </select>
                    {!selectedStudent && (
                      <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                        <Info className="h-3 w-3 shrink-0" /> Cari dan pilih siswa terlebih dahulu sebelum memilih biaya.
                      </p>
                    )}
                  </div>

                  {/* STEP 4: Kalkulasi & Terbilang */}
                  {selectedFee && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 space-y-3"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-800 font-semibold">Total yang Harus Dibayarkan:</span>
                        <span className="text-2xl font-black text-emerald-700 font-mono">
                          {formatRupiah(selectedFee.biaya)}
                        </span>
                      </div>
                      <div className="pt-2.5 border-t border-emerald-100">
                        <p className="text-xs text-slate-400 font-medium">Terbilang Huruf (Kalkulasi Otomatis):</p>
                        <p className="font-bold text-slate-800 italic text-sm mt-0.5">
                          "{convertToTerbilang(selectedFee.biaya)}"
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* STEP 6: Form Tanda Tangan */}
              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-slate-900">Langkah 3: Identitas Petugas Penandatangan</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="petugas1" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Nama Petugas 1 (Sisi Kiri / Kasir)
                    </label>
                    <input
                      id="petugas1"
                      type="text"
                      value={petugas1 || ''}
                      onChange={(e) => setPetugas1(e.target.value || '')}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-slate-50 focus:bg-white"
                      placeholder="Nama Kasir Penerima..."
                    />
                  </div>
                  <div>
                    <label htmlFor="petugas2" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Nama Petugas 2 (Sisi Kanan / Koperasi)
                    </label>
                    <input
                      id="petugas2"
                      type="text"
                      value={petugas2 || ''}
                      onChange={(e) => setPetugas2(e.target.value || '')}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all bg-slate-50 focus:bg-white"
                      placeholder="Nama Penanggung Jawab Seragam..."
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT PANEL (5 cols in lg) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* STEP 5: Ceklist Kebutuhan */}
              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-4 flex flex-col h-full">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                      <CheckSquare className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-900">Langkah 4: Seragam Diserahkan</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleSelectAllNeeds}
                    disabled={!selectedStudent}
                    className="text-xs text-blue-600 font-bold hover:text-blue-800 disabled:text-slate-300 disabled:cursor-not-allowed flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-md hover:bg-slate-100 transition-all border border-slate-100"
                  >
                    {checkedNeeds.length === needs.length ? 'Hapus Semua' : 'Pilih Semua'}
                  </button>
                </div>

                <div className="text-xs text-slate-500 -mt-1 shrink-0">
                  Tandai seragam/atribut fisik yang telah diserahkan langsung kepada siswa saat pembayaran.
                </div>

                <div className="flex-1 overflow-y-auto min-h-[250px] border border-slate-100 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-2">
                  {needs.map((need) => {
                    const isChecked = checkedNeeds.includes(need.no);
                    return (
                      <label
                        key={need.no}
                        className={`flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer select-none mb-1 border ${
                          isChecked
                            ? 'bg-white border-blue-100 shadow-sm'
                            : 'hover:bg-white/80 border-transparent text-slate-600'
                        } ${!selectedStudent ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={!selectedStudent}
                            onChange={() => handleToggleNeed(need.no)}
                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <span className={`text-sm font-medium ${isChecked ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>
                            {need.jenis}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase font-mono font-bold shrink-0">
                          {need.satuan}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Submitting Actions */}
                <div className="pt-4 border-t border-slate-100 shrink-0 space-y-3">
                  <button
                    type="submit"
                    disabled={!selectedStudent || !selectedFee}
                    className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <Save className="h-5 w-5" />
                    <span>Simpan & Bayar Transaksi</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    Menyimpan transaksi akan merekam riwayat pembayaran ke database lokal / PEMBAYARAN.
                  </p>
                </div>

              </div>

            </div>

          </form>
        ) : (
          /* SUCCESS STATE / RECEIPT ACTION PANEL */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-8 border border-slate-100 shadow-md text-center max-w-xl mx-auto space-y-6 my-4"
          >
            <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Check className="h-9 w-9 stroke-[3px]" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 font-display">Transaksi Berhasil Disimpan!</h2>
              <p className="text-sm text-slate-500">
                Data pembayaran atas nama <span className="font-bold text-slate-800">{savedTransaction?.namaSiswa}</span> telah direkam ke database.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 text-left divide-y divide-slate-100 text-xs">
              <div className="flex justify-between py-2">
                <span className="text-slate-400">No Transaksi:</span>
                <span className="font-bold text-slate-700">{savedTransaction?.idTransaksi}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Siswa:</span>
                <span className="font-bold text-slate-700">#{savedTransaction?.noSiswa} - {savedTransaction?.namaSiswa} (Kelas {savedTransaction?.kelas})</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Biaya Seragam:</span>
                <span className="font-bold text-slate-700">{savedTransaction?.jenisBiaya}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Jumlah Bayar:</span>
                <span className="font-bold text-emerald-600 text-sm font-mono">{savedTransaction && formatRupiah(savedTransaction.biaya)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Item Seragam:</span>
                <span className="font-bold text-slate-700 text-right max-w-[250px] truncate">
                  {savedTransaction?.kebutuhanDiserahkan.length} dari 9 item diserahkan
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                onClick={triggerPrintReceipt}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-blue-200 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Cetak Bukti Bayar</span>
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white transition-all cursor-pointer shadow-md"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Transaksi Baru</span>
              </button>
            </div>
            
            <p className="text-[11px] text-slate-400">
              *Catatan: Tombol "Cetak Bukti Bayar" akan membuka menu cetak bawaan browser. Pastikan printer Anda siap dan layout diatur ke ukuran A4 atau F4.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
