/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Printer, X, FileText, CheckCircle, HelpCircle, Download } from 'lucide-react';
import { Transaction, Need } from '../types';

interface ReceiptPrintProps {
  transaction: Transaction | null;
  needs: Need[];
  onClose: () => void;
}

export default function ReceiptPrint({ transaction, needs, onClose }: ReceiptPrintProps) {
  const [pageSize, setPageSize] = useState<'A4' | 'F4'>('A4');

  if (!transaction) return null;

  if (transaction.isCancelled) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center space-y-4 border border-rose-100 shadow-2xl">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <X className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-950 text-base">Cetak Dibatalkan</h3>
            <p className="text-xs text-slate-500 mt-2">
              Transaksi dengan ID <strong className="font-mono text-rose-600 font-bold">{transaction.idTransaksi}</strong> telah dibatalkan (CANCEL) dan tidak dapat dicetak ulang.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // Format currency helper
  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Find checking need names
  const checkedNeedNames = transaction.kebutuhanDiserahkan
    .map((no) => needs.find((n) => n.no === no)?.jenis)
    .filter((name): name is string => !!name);

  const itemsString = checkedNeedNames.length > 0 ? checkedNeedNames.join(', ') : 'Tidak ada item';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHTML = () => {
    // Create a beautifully formatted, completely self-contained printable document
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Bukti_Bayar_${transaction.idTransaksi}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              background-color: #f1f5f9;
              padding: 20px 10px;
              margin: 0;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .paper {
              width: 210mm;
              background: white;
              padding: 10mm;
              box-sizing: border-box;
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
            }
            .receipt-copy {
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 14px;
              margin-bottom: 12px;
              position: relative;
            }
            .header-flex {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 6px;
              margin-bottom: 8px;
            }
            .title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin: 0 0 2px 0;
              color: #0f172a;
            }
            .subtitle {
              font-size: 8px;
              color: #94a3b8;
              margin: 0;
            }
            .trx-id {
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              font-weight: 700;
              color: #1d4ed8;
              margin: 0;
              text-align: right;
            }
            .date {
              font-size: 8px;
              color: #94a3b8;
              margin: 1px 0 0 0;
              text-align: right;
            }
            .grid-student {
              display: grid;
              grid-template-cols: repeat(4, 1fr);
              gap: 4px;
              background-color: #f8fafc;
              padding: 6px;
              border-radius: 6px;
              border: 1px solid #f1f5f9;
              margin-bottom: 8px;
            }
            .student-col {
              display: flex;
              flex-direction: column;
            }
            .student-label {
              font-size: 7px;
              font-weight: 700;
              color: #94a3b8;
              text-transform: uppercase;
            }
            .student-val {
              font-size: 9px;
              font-weight: 700;
              color: #334155;
              margin-top: 1px;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              border-bottom: 1px solid #f1f5f9;
              font-size: 9px;
            }
            .payment-label {
              color: #94a3b8;
              font-weight: 600;
              text-transform: uppercase;
            }
            .payment-val {
              font-weight: 700;
              color: #1e293b;
            }
            .total-box {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background-color: #f8fafc;
              padding: 4px 8px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
              margin-top: 4px;
              margin-bottom: 4px;
            }
            .total-label {
              font-size: 9px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
            }
            .total-val {
              font-family: 'JetBrains Mono', monospace;
              font-size: 13px;
              font-weight: 900;
              color: #059669;
            }
            .terbilang-box {
              background-color: #f8fafc;
              padding: 4px 8px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
              font-size: 8.5px;
              font-style: italic;
              color: #475569;
              line-height: 1.4;
            }
            .table-container {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              overflow: hidden;
              margin-top: 6px;
              margin-bottom: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              text-align: left;
              font-size: 8px;
            }
            th {
              background-color: #f8fafc;
              color: #64748b;
              font-weight: 700;
              padding: 2px 6px;
              border-bottom: 1px solid #e2e8f0;
            }
            td {
              padding: 2px 6px;
              border-bottom: 1px solid #f1f5f9;
              color: #334155;
            }
            .th-no { width: 30px; text-align: center; border-right: 1px solid #e2e8f0; }
            .td-no { text-align: center; font-family: monospace; color: #94a3b8; border-right: 1px solid #e2e8f0; }
            .th-item { border-right: 1px solid #e2e8f0; }
            .td-item { border-right: 1px solid #e2e8f0; font-weight: 500; }
            .th-satuan { width: 60px; text-align: center; border-right: 1px solid #e2e8f0; }
            .td-satuan { text-align: center; font-family: monospace; color: #94a3b8; text-transform: uppercase; border-right: 1px solid #e2e8f0; }
            .th-status { width: 80px; text-align: center; }
            .td-status { text-align: center; font-weight: 700; color: #059669; }
            .signature-grid {
              display: flex !important;
              flex-direction: row !important;
              justify-content: space-between !important;
              align-items: flex-start !important;
              text-align: center;
              font-size: 9px;
              border-top: 1px solid #f1f5f9;
              padding-top: 6px;
              margin-top: 6px;
            }
            .signature-grid > div {
              width: 48% !important;
              box-sizing: border-box;
            }
            .sig-label {
              color: #94a3b8;
              margin: 0 0 25px 0;
              font-weight: 600;
            }
            .sig-name {
              font-weight: 700;
              text-decoration: underline;
              color: #1e293b;
              margin: 0;
            }
            .sig-title {
              font-size: 7.5px;
              color: #94a3b8;
              margin: 1px 0 0 0;
            }
            .divider-line {
              border-top: 2px dashed #cbd5e1;
              text-align: center;
              margin: 10px 0;
              position: relative;
            }
            .divider-badge {
              background: #f1f5f9;
              padding: 2px 10px;
              font-size: 8px;
              font-weight: 700;
              color: #94a3b8;
              border-radius: 9999px;
              border: 1px solid #cbd5e1;
              display: inline-block;
              position: relative;
              top: -8px;
              letter-spacing: 0.1em;
            }
            .copy-tag {
              position: absolute;
              top: 0;
              right: 0;
              background-color: #f1f5f9;
              color: #64748b;
              padding: 2px 8px;
              border-bottom-left-radius: 6px;
              font-size: 8px;
              font-weight: 700;
              font-family: monospace;
              text-transform: uppercase;
            }
            @media print {
              body { background-color: white; padding: 0; margin: 0; }
              .paper { border: none; box-shadow: none; padding: 0; width: 100%; }
              .divider-badge { background: white; }
            }
          </style>
        </head>
        <body>
          <div class="paper">
            <!-- COPY 1 -->
            <div class="receipt-copy">
              <span class="copy-tag">ADMIN</span>
              <div class="header-flex">
                <div>
                  <h1 class="title">Bukti Bayar Pembayaran Seragam</h1>
                  <p class="subtitle">Koperasi Sekolah Al-Azhar • Bukti Transaksi Resmi (ADMIN)</p>
                </div>
                <div>
                  <p class="trx-id">${transaction.idTransaksi}</p>
                  <p class="date">Tanggal: ${transaction.tanggal}</p>
                </div>
              </div>
              <div class="grid-student">
                <div class="student-col">
                  <span class="student-label">No. Urut</span>
                  <span class="student-val">#${transaction.noSiswa}</span>
                </div>
                <div class="student-col">
                  <span class="student-label">Nama Lengkap</span>
                  <span class="student-val">${transaction.namaSiswa}</span>
                </div>
                <div class="student-col">
                  <span class="student-label">Kelas</span>
                  <span class="student-val">${transaction.kelas}</span>
                </div>
                <div class="student-col">
                  <span class="student-label">Jenis Kelamin</span>
                  <span class="student-val">${transaction.jenisKelamin === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}</span>
                </div>
              </div>
              <div class="payment-row">
                <span class="payment-label">Rincian Pembayaran</span>
                <span class="payment-val">${transaction.jenisBiaya}</span>
              </div>
              <div class="total-box">
                <span class="total-label">Total Nominal</span>
                <span class="total-val">${formatRupiah(transaction.biaya)}</span>
              </div>
              <div class="terbilang-box">
                Terbilang: "<strong>${transaction.terbilang}</strong>"
              </div>
              <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 8px; margin-bottom: 2px;">Item Seragam yang Diserahkan:</div>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th class="th-no">No</th>
                      <th class="th-item">Item Seragam</th>
                      <th class="th-satuan">Satuan</th>
                      <th class="th-status">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      transaction.kebutuhanDiserahkan.length > 0 ?
                      transaction.kebutuhanDiserahkan.map((no, idx) => {
                        const item = needs.find(n => n.no === no);
                        return `
                          <tr>
                            <td class="td-no">${idx + 1}</td>
                            <td class="td-item">${item ? item.jenis : 'Item #' + no}</td>
                            <td class="td-satuan">${item ? item.satuan : '-'}</td>
                            <td class="td-status">✓ Diserahkan</td>
                          </tr>
                        `;
                      }).join('') : `
                        <tr>
                          <td colspan="4" style="text-align: center; padding: 6px; color: #94a3b8; font-style: italic;">Tidak ada item seragam yang diserahkan</td>
                        </tr>
                      `
                    }
                  </tbody>
                </table>
              </div>
              <div class="signature-grid">
                <div>
                  <p class="sig-label">Pemberi Seragam (Petugas 2)</p>
                  <p class="sig-name">${transaction.petugas2 || '-'}</p>
                  <p class="sig-title">Petugas Koperasi</p>
                </div>
                <div>
                  <p class="sig-label">Penerima (Petugas 1)</p>
                  <p class="sig-name">${transaction.petugas1}</p>
                  <p class="sig-title">Petugas Penerima</p>
                </div>
              </div>
            </div>

            <!-- DIVIDER -->
            <div class="divider-line">
              <span class="divider-badge">✂️ POTONG DI SINI (BATAS ARSIP) ✂️</span>
            </div>

            <!-- COPY 2 -->
            <div class="receipt-copy">
              <span class="copy-tag">ARSIP SEKOLAH</span>
              <div class="header-flex">
                <div>
                  <h1 class="title">Bukti Bayar Pembayaran Seragam</h1>
                  <p class="subtitle">Koperasi Sekolah Al-Azhar • Bukti Transaksi Resmi (ARSIP SEKOLAH)</p>
                </div>
                <div>
                  <p class="trx-id">${transaction.idTransaksi}</p>
                  <p class="date">Tanggal: ${transaction.tanggal}</p>
                </div>
              </div>
              <div class="grid-student">
                <div class="student-col">
                  <span class="student-label">No. Urut</span>
                  <span class="student-val">#${transaction.noSiswa}</span>
                </div>
                <div class="student-col">
                  <span class="student-label">Nama Lengkap</span>
                  <span class="student-val">${transaction.namaSiswa}</span>
                </div>
                <div class="student-col">
                  <span class="student-label">Kelas</span>
                  <span class="student-val">${transaction.kelas}</span>
                </div>
                <div class="student-col">
                  <span class="student-label">Jenis Kelamin</span>
                  <span class="student-val">${transaction.jenisKelamin === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}</span>
                </div>
              </div>
              <div class="payment-row">
                <span class="payment-label">Rincian Pembayaran</span>
                <span class="payment-val">${transaction.jenisBiaya}</span>
              </div>
              <div style="font-size: 8px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-top: 8px; margin-bottom: 2px;">Item Seragam yang Diserahkan:</div>
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th class="th-no">No</th>
                      <th class="th-item">Item Seragam</th>
                      <th class="th-satuan">Satuan</th>
                      <th class="th-status">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${
                      transaction.kebutuhanDiserahkan.length > 0 ?
                      transaction.kebutuhanDiserahkan.map((no, idx) => {
                        const item = needs.find(n => n.no === no);
                        return `
                          <tr>
                            <td class="td-no">${idx + 1}</td>
                            <td class="td-item">${item ? item.jenis : 'Item #' + no}</td>
                            <td class="td-satuan">${item ? item.satuan : '-'}</td>
                            <td class="td-status">✓ Diserahkan</td>
                          </tr>
                        `;
                      }).join('') : `
                        <tr>
                          <td colspan="4" style="text-align: center; padding: 6px; color: #94a3b8; font-style: italic;">Tidak ada item seragam yang diserahkan</td>
                        </tr>
                      `
                    }
                  </tbody>
                </table>
              </div>
              <div class="signature-grid">
                <div>
                  <p class="sig-label">Pemberi Seragam (Petugas 2)</p>
                  <p class="sig-name">${transaction.petugas2 || '-'}</p>
                  <p class="sig-title">Petugas Koperasi</p>
                </div>
                <div>
                  <p class="sig-label">Penerima (Petugas 1)</p>
                  <p class="sig-name">${transaction.petugas1}</p>
                  <p class="sig-title">Petugas Penerima</p>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          <\/script>
        </body>
      </html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bukti_Bayar_${transaction.idTransaksi}_${transaction.namaSiswa.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper component for single receipt copy
  const ReceiptCopy = ({ titleSuffix }: { titleSuffix: string }) => (
    <div className="bg-white p-4 print:p-3.5 border border-slate-200 rounded-lg space-y-3 print:space-y-1.5 text-[11px] print:text-[9.5px] text-slate-800 relative">
      {/* Decorative corner tag */}
      <span className="absolute top-0 right-0 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-bl font-mono text-[7.5px] font-bold uppercase no-print">
        {titleSuffix ? titleSuffix : 'Salinan Utama'}
      </span>

      {/* Header */}
      <div className="flex justify-between items-start pb-2 print:pb-1 border-b border-slate-100">
        <div>
          <h2 className="text-xs print:text-[10px] font-black uppercase tracking-wider font-display text-slate-900">
            Bukti Bayar Pembayaran Seragam
          </h2>
          <p className="text-[8.5px] print:text-[7px] text-slate-400 font-medium">
            Koperasi Sekolah Al-Azhar • Bukti Transaksi Resmi {titleSuffix && `(${titleSuffix})`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs print:text-[9.5px] font-bold text-blue-700 font-mono">{transaction.idTransaksi}</p>
          <p className="text-[8.5px] print:text-[7px] text-slate-400">Tanggal: {transaction.tanggal}</p>
        </div>
      </div>

      {/* Student Profile Info */}
      <div className="grid grid-cols-4 gap-1.5 text-[9.5px] print:text-[8px] bg-slate-50 p-2 print:p-1 rounded-md border border-slate-100">
        <div>
          <span className="text-slate-400 block uppercase text-[7.5px] print:text-[6.5px] font-bold">No. Urut</span>
          <strong className="text-slate-700">#{transaction.noSiswa}</strong>
        </div>
        <div>
          <span className="text-slate-400 block uppercase text-[7.5px] print:text-[6.5px] font-bold">Nama Lengkap</span>
          <strong className="text-slate-700">{transaction.namaSiswa}</strong>
        </div>
        <div>
          <span className="text-slate-400 block uppercase text-[7.5px] print:text-[6.5px] font-bold">Kelas</span>
          <strong className="text-slate-700">{transaction.kelas}</strong>
        </div>
        <div>
          <span className="text-slate-400 block uppercase text-[7.5px] print:text-[6.5px] font-bold">Jenis Kelamin</span>
          <strong className="text-slate-700">{transaction.jenisKelamin === 'P' ? 'Perempuan (P)' : 'Laki-laki (L)'}</strong>
        </div>
      </div>

      {/* Payment Details */}
      <div className="space-y-1 print:space-y-0.5">
        <div className="flex justify-between py-0.5 border-b border-slate-100 text-[9.5px] print:text-[8px]">
          <span className="text-slate-400 font-semibold uppercase">Rincian Pembayaran</span>
          <span className="font-bold text-slate-800">{transaction.jenisBiaya}</span>
        </div>
        {titleSuffix !== 'ARSIP SEKOLAH' && (
          <>
            <div className="flex justify-between items-center py-1.5 print:py-0.5 bg-slate-50/50 px-2 rounded border border-slate-100 font-bold">
              <span className="text-slate-500 text-[9.5px] print:text-[8px] uppercase">Total Nominal</span>
              <span className="text-emerald-600 font-mono text-sm print:text-[11px]">{formatRupiah(transaction.biaya)}</span>
            </div>
            <div className="text-[9.5px] print:text-[8px] text-slate-600 italic bg-slate-50 p-1.5 print:p-1 rounded border border-slate-100 leading-normal">
              Terbilang: "<strong className="text-slate-800">{transaction.terbilang}</strong>"
            </div>
          </>
        )}
      </div>

      {/* Needs Checklist - Tabel Sederhana */}
      <div className="space-y-1 print:space-y-0.5 text-slate-800">
        <span className="text-slate-400 block uppercase text-[7.5px] print:text-[6.5px] font-bold tracking-wider">Item Seragam yang Diserahkan:</span>
        <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
          <table className="w-full text-left text-[8.5px] print:text-[7.5px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <th className="p-0.5 px-1.5 w-8 text-center border-r border-slate-200">No</th>
                <th className="p-0.5 px-1.5 border-r border-slate-200">Item Seragam</th>
                <th className="p-0.5 px-1.5 w-16 text-center border-r border-slate-200">Satuan</th>
                <th className="p-0.5 px-1.5 w-20 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaction.kebutuhanDiserahkan.length > 0 ? (
                transaction.kebutuhanDiserahkan.map((no, idx) => {
                  const item = needs.find((n) => n.no === no);
                  return (
                    <tr key={no} className="hover:bg-slate-50/50">
                      <td className="p-0.5 text-center border-r border-slate-200 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-0.5 px-1.5 border-r border-slate-200 font-medium text-slate-700">{item ? item.jenis : `Item #${no}`}</td>
                      <td className="p-0.5 text-center border-r border-slate-200 font-mono uppercase text-slate-400 text-[7.5px]">{item ? item.satuan : '-'}</td>
                      <td className="p-0.5 text-center font-bold text-emerald-600 text-[7.5px] bg-emerald-50/20">✓ Diserahkan</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="p-1 text-center text-slate-400 italic">Tidak ada item seragam yang diserahkan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature Section */}
      <div className="flex flex-row justify-between text-center text-[9.5px] print:text-[8px] pt-2 border-t border-slate-100">
        <div className="w-[48%] flex flex-col items-center">
          <p className="text-slate-400 mb-6 print:mb-3 font-semibold">Pemberi Seragam (Petugas 2)</p>
          <strong className="underline text-slate-800 font-bold">{transaction.petugas2 || '-'}</strong>
          <p className="text-[7.5px] print:text-[6.5px] text-slate-400 mt-0.5">Petugas Koperasi</p>
        </div>
        <div className="w-[48%] flex flex-col items-center">
          <p className="text-slate-400 mb-6 print:mb-3 font-semibold">Penerima (Petugas 1)</p>
          <strong className="underline text-slate-800 font-bold">{transaction.petugas1}</strong>
          <p className="text-[7.5px] print:text-[6.5px] text-slate-400 mt-0.5">Petugas Penerima</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 overflow-y-auto flex items-center justify-center p-4">
      
      {/* Receipt Dialog Container */}
      <div className="bg-slate-100 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] my-4 border border-slate-200">
        
        {/* Top Control Header */}
        <div className="no-print bg-white px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 font-display">Pratinjau Cetak Bukti Bayar</h3>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Paper Size selector */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setPageSize('A4')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  pageSize === 'A4' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                A4 (2 Bagian)
              </button>
              <button
                onClick={() => setPageSize('F4')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  pageSize === 'F4' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                F4 (2 Bagian)
              </button>
            </div>

            {/* Download Action */}
            <button
              onClick={handleDownloadHTML}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              title="Unduh Bukti Bayar sebagai file HTML mandiri yang siap cetak"
            >
              <Download className="h-4 w-4" />
              <span>Unduh Hasil (PDF)</span>
            </button>

            {/* Print Action */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Cetak Bukti Bayar</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Paper Container Preview (Simulates real printed A4/F4) */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-600/25 flex items-start justify-center">
          <div 
            id="printable-receipt-area"
            className={`${
              pageSize === 'A4' ? 'a4-preview' : 'f4-preview'
            } transition-all space-y-6 print:space-y-2 flex flex-col justify-between print:justify-start`}
            style={{ boxSizing: 'border-box' }}
          >
            {/* 2 Bagian Bukti Bayar dalam 1 Lembar */}
            
            {/* Bagian Atas / Copy 1 */}
            <ReceiptCopy titleSuffix="ADMIN" />
            
            {/* Divider Perforasi Gunting */}
            <div className="border-t-2 border-dashed border-slate-300 w-full relative my-1 py-0.5 text-center flex items-center justify-center">
              <span className="bg-slate-50 px-3 text-[9px] font-bold text-slate-400 font-mono border border-slate-200 rounded-full tracking-wider uppercase select-none">
                ✂️ POTONG DI SINI (BATAS ARSIP) ✂️
              </span>
            </div>

            {/* Bagian Bawah / Copy 2 */}
            <ReceiptCopy titleSuffix="ARSIP SEKOLAH" />

          </div>
        </div>

        {/* Footer Help */}
        <div className="no-print bg-white p-3 border-t border-slate-200 text-[10px] text-slate-400 text-center shrink-0">
          💡 Tips Cetak: Di menu dialog print browser Anda, atur Layout ke <strong className="text-slate-700">Potret (Portrait)</strong>, Ukuran Kertas ke <strong className="text-slate-700">{pageSize}</strong>, dan pastikan centang <strong className="text-slate-700">Sederhanakan Tampilan/Margin Minimum</strong> agar presisi. Untuk mendownload PDF, pilih opsi <strong className="text-slate-700">Simpan sebagai PDF (Save as PDF)</strong> di tujuan printer Anda.
        </div>

      </div>

    </div>
  );
}
