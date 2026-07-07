/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Search, TrendingUp, DollarSign, ListFilter, Trash2, ArrowUpDown, ChevronDown, CheckSquare, Edit, X, Printer, Ban, CheckCircle } from 'lucide-react';
import { Transaction, Need } from '../types';
import { convertToTerbilang } from '../utils/terbilang';

interface ReportsProps {
  transactions: Transaction[];
  needs: Need[];
  onDeleteTransaction?: (id: string) => void;
  onUpdateTransaction?: (updatedTx: Transaction) => void;
  onPrintTransaction?: (tx: Transaction) => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info', title?: string) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    type?: 'danger' | 'warning' | 'info',
    confirmText?: string,
    cancelText?: string,
    onCancel?: () => void
  ) => void;
}

export default function Reports({ 
  transactions, 
  needs, 
  onDeleteTransaction, 
  onUpdateTransaction, 
  onPrintTransaction,
  showToast,
  showConfirm
}: ReportsProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'tanggal' | 'biaya' | 'namaSiswa'>('tanggal');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit Modal States
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editTanggal, setEditTanggal] = useState('');
  const [editNama, setEditNama] = useState('');
  const [editKelas, setEditKelas] = useState('');
  const [editNoSiswa, setEditNoSiswa] = useState<number>(0);
  const [editJenisKelamin, setEditJenisKelamin] = useState('');
  const [editJenisBiaya, setEditJenisBiaya] = useState('');
  const [editBiaya, setEditBiaya] = useState<number>(0);
  const [editCheckedNeeds, setEditCheckedNeeds] = useState<number[]>([]);
  const [editPetugas1, setEditPetugas1] = useState('');
  const [editPetugas2, setEditPetugas2] = useState('');
  const [editIsCancelled, setEditIsCancelled] = useState(false);

  const handleStartEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditTanggal(tx.tanggal || '');
    setEditNama(tx.namaSiswa || '');
    setEditKelas(tx.kelas || '');
    setEditNoSiswa(tx.noSiswa || 0);
    setEditJenisKelamin(tx.jenisKelamin || 'L');
    setEditJenisBiaya(tx.jenisBiaya || '');
    setEditBiaya(tx.biaya || 0);
    setEditCheckedNeeds(tx.kebutuhanDiserahkan || []);
    setEditPetugas1(tx.petugas1 || '');
    setEditPetugas2(tx.petugas2 || '');
    setEditIsCancelled(tx.isCancelled || false);
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

  // Date constants based on current metadata: 2026-07-06
  const TODAY_STR = '2026-07-06';
  const TODAY_DATE = new Date(TODAY_STR);

  // Statistics calculation
  const stats = useMemo(() => {
    let todayTotal = 0;
    let weekTotal = 0;
    let allTimeTotal = 0;

    // Hitung tanggal 7 hari yang lalu
    const sevenDaysAgo = new Date(TODAY_DATE);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    transactions.forEach((tx) => {
      if (tx.isCancelled) return; // skip cancelled transactions in stats!
      const txBiaya = tx.biaya;
      allTimeTotal += txBiaya;

      if (tx.tanggal === TODAY_STR) {
        todayTotal += txBiaya;
      }

      const txDate = new Date(tx.tanggal);
      if (txDate >= sevenDaysAgo && txDate <= TODAY_DATE) {
        weekTotal += txBiaya;
      }
    });

    const activeTx = transactions.filter(t => !t.isCancelled);
    return {
      todayTotal,
      weekTotal,
      allTimeTotal,
      txCount: activeTx.length,
      average: activeTx.length > 0 ? Math.round(allTimeTotal / activeTx.length) : 0
    };
  }, [transactions]);

  // Filter & Sort Transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Filter Pencarian (Nama, Kelas, No Siswa, ID Transaksi)
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          term === '' ||
          tx.namaSiswa.toLowerCase().includes(term) ||
          tx.idTransaksi.toLowerCase().includes(term) ||
          tx.kelas.toLowerCase().includes(term) ||
          String(tx.noSiswa).includes(term) ||
          tx.jenisBiaya.toLowerCase().includes(term);

        // Filter Rentang Tanggal
        let matchesStartDate = true;
        let matchesEndDate = true;

        if (startDate) {
          matchesStartDate = tx.tanggal >= startDate;
        }
        if (endDate) {
          matchesEndDate = tx.tanggal <= endDate;
        }

        return matchesSearch && matchesStartDate && matchesEndDate;
      })
      .sort((a, b) => {
        let fieldA: any = a[sortField];
        let fieldB: any = b[sortField];

        if (sortField === 'namaSiswa') {
          fieldA = fieldA.toLowerCase();
          fieldB = fieldB.toLowerCase();
        }

        if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
        if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [transactions, searchTerm, startDate, endDate, sortField, sortOrder]);

  const toggleSort = (field: 'tanggal' | 'biaya' | 'namaSiswa') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
  };

  const getNeedLabels = (checkedNoList: number[]) => {
    if (!checkedNoList || checkedNoList.length === 0) return 'Tidak ada item';
    if (checkedNoList.length === needs.length) return 'Semua Item (Lengkap)';
    return `${checkedNoList.length} Item`;
  };

  const handleDelete = (id: string, name: string) => {
    if (onDeleteTransaction) {
      showConfirm(
        "Hapus Transaksi",
        `Apakah Anda yakin ingin menghapus transaksi ${id} atas nama ${name}? Tindakan ini akan menghapus data secara permanen dari perangkat lokal dan Google Sheets.`,
        () => {
          onDeleteTransaction(id);
        },
        'danger',
        'Ya, Hapus Permanen'
      );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Dashboard Rekap & Laporan</h1>
          <p className="text-slate-500 text-sm mt-1">
            Ringkasan pendapatan koperasi, audit keuangan, dan pelacakan pembayaran seragam siswa secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-slate-500 self-start md:self-auto shrink-0 font-mono">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span>Tanggal Audit: {TODAY_STR}</span>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Stat 1: Hari Ini */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pendapatan Hari Ini</p>
            <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{formatRupiah(stats.todayTotal)}</p>
            <p className="text-[10px] text-blue-600 font-medium mt-1">Tanggal: {TODAY_STR}</p>
          </div>
        </div>

        {/* Stat 2: Minggu Ini */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pendapatan Minggu Ini</p>
            <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{formatRupiah(stats.weekTotal)}</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">7 Hari Terakhir</p>
          </div>
        </div>

        {/* Stat 3: Total Akumulasi */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Pembayaran</p>
            <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">{formatRupiah(stats.allTimeTotal)}</p>
            <p className="text-[10px] text-violet-600 font-medium mt-1">Dari {stats.txCount} Transaksi</p>
          </div>
        </div>

      </div>

      {/* FILTER & TABLE PANEL */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        
        {/* Filter Controls Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
              <ListFilter className="h-4 w-4 text-blue-600" />
              <span>Filter Audit Laporan</span>
            </h3>
            {(startDate || endDate || searchTerm) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-red-600 hover:text-red-800 font-bold transition-all cursor-pointer bg-red-50 border border-red-100 px-3 py-1.5 rounded-lg"
              >
                Atur Ulang Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Cari transaksi</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm || ''}
                  onChange={(e) => setSearchTerm(e.target.value || '')}
                  placeholder="ID Transaksi, nama siswa, kelas, biaya..."
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Dari Tanggal</label>
              <input
                type="date"
                value={startDate || ''}
                onChange={(e) => setStartDate(e.target.value || '')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate || ''}
                onChange={(e) => setEndDate(e.target.value || '')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>

          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          {filteredTransactions.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">ID Transaksi</th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors" onClick={() => toggleSort('tanggal')}>
                    <div className="flex items-center gap-1">
                      <span>Tanggal</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0" />
                    </div>
                  </th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors" onClick={() => toggleSort('namaSiswa')}>
                    <div className="flex items-center gap-1">
                      <span>Siswa / Kelas</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0" />
                    </div>
                  </th>
                  <th className="px-6 py-4">Kategori Biaya</th>
                  <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 hover:text-slate-700 transition-colors" onClick={() => toggleSort('biaya')}>
                    <div className="flex items-center gap-1">
                      <span>Jumlah Pembayaran</span>
                      <ArrowUpDown className="h-3 w-3 shrink-0" />
                    </div>
                  </th>
                  <th className="px-6 py-4">Item Seragam</th>
                  <th className="px-6 py-4">Petugas</th>
                  {(onDeleteTransaction || onUpdateTransaction) && <th className="px-6 py-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.idTransaksi} className={`hover:bg-slate-50/50 text-sm transition-colors ${tx.isCancelled ? 'bg-rose-50/20 text-slate-400' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-xs text-blue-700">
                      <div className="flex flex-col">
                        <span>{tx.idTransaksi}</span>
                        {tx.isCancelled && (
                          <span className="inline-flex items-center gap-1 w-fit bg-rose-100 text-rose-700 border border-rose-200 text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-1 shadow-sm font-sans">
                            DIBATALKAN / CANCEL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                      {tx.tanggal}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{tx.namaSiswa}</p>
                        <p className="text-xs text-slate-400">#{tx.noSiswa} • Kelas {tx.kelas} ({tx.jenisKelamin})</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate" title={tx.jenisBiaya}>
                      {tx.jenisBiaya}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-emerald-600 whitespace-nowrap">
                      {formatRupiah(tx.biaya)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <CheckSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="text-xs font-semibold">{getNeedLabels(tx.kebutuhanDiserahkan)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      <div>
                        <p>1: <span className="font-medium text-slate-700">{tx.petugas1}</span></p>
                        <p>2: <span className="font-medium text-slate-700">{tx.petugas2}</span></p>
                      </div>
                    </td>
                    {(onDeleteTransaction || onUpdateTransaction || onPrintTransaction) && (
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-1">
                        {onPrintTransaction && (
                          <button
                            type="button"
                            onClick={() => onPrintTransaction(tx)}
                            disabled={tx.isCancelled}
                            className={`p-1.5 rounded-lg transition-all inline-flex items-center ${
                              tx.isCancelled 
                                ? 'text-slate-300 hover:bg-transparent cursor-not-allowed' 
                                : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 cursor-pointer'
                            }`}
                            title={tx.isCancelled ? "Transaksi Batal (Tidak dapat dicetak)" : "Cetak Ulang Bukti Bayar"}
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                        )}
                        {onUpdateTransaction && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(tx)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-all cursor-pointer inline-flex items-center"
                            title="Edit Transaksi"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                        {onDeleteTransaction && (
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.idTransaksi, tx.namaSiswa)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer inline-flex items-center"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Calendar className="h-10 w-10 text-slate-200" />
              <p className="font-semibold text-slate-700">Tidak ada data transaksi ditemukan</p>
              <p className="text-xs">Sesuaikan filter rentang tanggal atau kata kunci pencarian Anda.</p>
            </div>
          )}
        </div>

        {/* Footer Statistics Banner */}
        <div className="bg-slate-50/50 p-4 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Menampilkan <strong>{filteredTransactions.length}</strong> transaksi dari total <strong>{transactions.length}</strong> transaksi terekam.</span>
          <span>Jumlah Nominal Terfilter (Aktif): <strong className="text-emerald-700 font-mono text-sm">{formatRupiah(filteredTransactions.filter(tx => !tx.isCancelled).reduce((acc, tx) => acc + tx.biaya, 0))}</strong></span>
        </div>

      </div>

      {/* Edit Modal Overlay */}
      <AnimatePresence>
        {editingTx && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Edit Transaksi</h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">ID: {editingTx.idTransaksi}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!onUpdateTransaction) return;
                  
                  const updatedTx: Transaction = {
                    idTransaksi: editingTx.idTransaksi,
                    tanggal: editTanggal,
                    noSiswa: Number(editNoSiswa),
                    namaSiswa: editNama,
                    kelas: editKelas,
                    jenisKelamin: editJenisKelamin,
                    jenisBiaya: editJenisBiaya,
                    biaya: Number(editBiaya),
                    terbilang: convertToTerbilang(Number(editBiaya)),
                    kebutuhanDiserahkan: editCheckedNeeds,
                    petugas1: editPetugas1,
                    petugas2: editPetugas2,
                    isCancelled: editIsCancelled
                  };
                  
                  onUpdateTransaction(updatedTx);
                  setEditingTx(null);
                }}
                className="p-6 space-y-4 overflow-y-auto flex-1 text-left"
              >
                {editIsCancelled && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2.5 font-bold mb-4">
                    <Ban className="h-5 w-5 text-rose-600 shrink-0" />
                    <div>
                      <p className="font-extrabold uppercase tracking-wide">Transaksi Dibatalkan (CANCEL)</p>
                      <p className="text-[10px] font-normal text-rose-600 mt-0.5">Transaksi ini telah ditandai sebagai batal. Nominal pembayaran dikeluarkan dari laporan keuangan dan dilarang untuk dicetak ulang.</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Tanggal */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      required
                      value={editTanggal || ''}
                      onChange={(e) => setEditTanggal(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    />
                  </div>

                  {/* Nama Siswa */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nama Siswa
                    </label>
                    <input
                      type="text"
                      required
                      value={editNama || ''}
                      onChange={(e) => setEditNama(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    />
                  </div>

                  {/* No Siswa (NIS) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      No Siswa / Urut
                    </label>
                    <input
                      type="number"
                      required
                      value={editNoSiswa ?? ''}
                      onChange={(e) => setEditNoSiswa(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    />
                  </div>

                  {/* Kelas */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Kelas
                    </label>
                    <input
                      type="text"
                      required
                      value={editKelas || ''}
                      onChange={(e) => setEditKelas(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    />
                  </div>

                  {/* Jenis Kelamin */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Jenis Kelamin
                    </label>
                    <select
                      value={editJenisKelamin || 'L'}
                      onChange={(e) => setEditJenisKelamin(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  {/* Jenis Biaya */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Kategori Biaya
                    </label>
                    <input
                      type="text"
                      required
                      value={editJenisBiaya || ''}
                      onChange={(e) => setEditJenisBiaya(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    />
                  </div>

                  {/* Biaya */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Jumlah Pembayaran (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      value={editBiaya ?? ''}
                      onChange={(e) => setEditBiaya(Number(e.target.value))}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    />
                  </div>

                  {/* Petugas 1 */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Petugas 1 (Kasir)
                    </label>
                    <input
                      type="text"
                      required
                      value={editPetugas1 || ''}
                      onChange={(e) => setEditPetugas1(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    />
                  </div>

                  {/* Petugas 2 */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Petugas 2 (Koperasi)
                    </label>
                    <input
                      type="text"
                      required
                      value={editPetugas2 || ''}
                      onChange={(e) => setEditPetugas2(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 border border-slate-200 rounded-lg text-slate-950 focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white focus:outline-none font-medium"
                    />
                  </div>

                </div>

                {/* Checklist Kebutuhan Seragam */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Item Seragam yang Diserahkan
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    {needs.map((need) => {
                      const isChecked = editCheckedNeeds.includes(need.no);
                      return (
                        <label key={need.no} className="flex items-center gap-2.5 text-xs font-medium text-slate-700 cursor-pointer p-1 hover:bg-slate-100/50 rounded transition-colors select-none">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditCheckedNeeds(editCheckedNeeds.filter(n => n !== need.no));
                              } else {
                                setEditCheckedNeeds([...editCheckedNeeds, need.no]);
                              }
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 border-slate-300"
                          />
                          <span>{need.jenis} ({need.satuan})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Terbilang Live Preview */}
                <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-xs">
                  <span className="font-bold text-blue-800">Terbilang: </span>
                  <span className="italic text-blue-900 font-medium font-mono">"{convertToTerbilang(editBiaya)}"</span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  {!editIsCancelled ? (
                    <button
                      type="button"
                      onClick={() => {
                        showConfirm(
                          "Batalkan Transaksi",
                          "Apakah Anda yakin ingin membatalkan transaksi ini? Transaksi yang dibatalkan tidak dapat dicetak ulang.",
                          () => {
                            setEditIsCancelled(true);
                            const updatedTx: Transaction = {
                              idTransaksi: editingTx.idTransaksi,
                              tanggal: editTanggal,
                              noSiswa: Number(editNoSiswa),
                              namaSiswa: editNama,
                              kelas: editKelas,
                              jenisKelamin: editJenisKelamin,
                              jenisBiaya: editJenisBiaya,
                              biaya: Number(editBiaya),
                              terbilang: convertToTerbilang(Number(editBiaya)),
                              kebutuhanDiserahkan: editCheckedNeeds,
                              petugas1: editPetugas1,
                              petugas2: editPetugas2,
                              isCancelled: true
                            };
                            if (onUpdateTransaction) {
                              onUpdateTransaction(updatedTx);
                            }
                            setEditingTx(null);
                          },
                          'danger',
                          'Ya, Batalkan Transaksi'
                        );
                      }}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Ban className="h-4 w-4" />
                      <span>Batalkan Transaksi (CANCEL)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        showConfirm(
                          "Aktifkan Kembali Transaksi",
                          "Apakah Anda yakin ingin mengaktifkan kembali transaksi ini?",
                          () => {
                            setEditIsCancelled(false);
                            const updatedTx: Transaction = {
                              idTransaksi: editingTx.idTransaksi,
                              tanggal: editTanggal,
                              noSiswa: Number(editNoSiswa),
                              namaSiswa: editNama,
                              kelas: editKelas,
                              jenisKelamin: editJenisKelamin,
                              jenisBiaya: editJenisBiaya,
                              biaya: Number(editBiaya),
                              terbilang: convertToTerbilang(Number(editBiaya)),
                              kebutuhanDiserahkan: editCheckedNeeds,
                              petugas1: editPetugas1,
                              petugas2: editPetugas2,
                              isCancelled: false
                            };
                            if (onUpdateTransaction) {
                              onUpdateTransaction(updatedTx);
                            }
                            setEditingTx(null);
                            showToast("Transaksi berhasil diaktifkan kembali.", "success", "Transaksi Aktif");
                          },
                          'info',
                          'Ya, Aktifkan'
                        );
                      }}
                      className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Aktifkan Kembali</span>
                    </button>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingTx(null)}
                      className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-md cursor-pointer"
                    >
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
