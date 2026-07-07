/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Fee, Need, Transaction } from '../types';

export const INITIAL_STUDENTS: Student[] = [
  { no: 1, namaSiswa: 'Ahmad Fauzi', jenisKelamin: 'L', kelas: 'X-1' },
  { no: 2, namaSiswa: 'Budi Santoso', jenisKelamin: 'L', kelas: 'X-2' },
  { no: 3, namaSiswa: 'Citra Lestari', jenisKelamin: 'P', kelas: 'X-1' },
  { no: 4, namaSiswa: 'Dwi Handayani', jenisKelamin: 'P', kelas: 'X-3' },
  { no: 5, namaSiswa: 'Eko Prasetyo', jenisKelamin: 'L', kelas: 'XI-MIPA-1' },
  { no: 6, namaSiswa: 'Fitriani', jenisKelamin: 'P', kelas: 'XI-IIS-2' },
  { no: 7, namaSiswa: 'Guntur Wibowo', jenisKelamin: 'L', kelas: 'XII-MIPA-3' },
  { no: 8, namaSiswa: 'Hesti Purwanti', jenisKelamin: 'P', kelas: 'XII-IIS-1' },
  { no: 9, namaSiswa: 'Indah Permatasari', jenisKelamin: 'P', kelas: 'X-2' },
  { no: 10, namaSiswa: 'Joko Susilo', jenisKelamin: 'L', kelas: 'XI-MIPA-2' },
  { no: 11, namaSiswa: 'Kartika Sari', jenisKelamin: 'P', kelas: 'X-3' },
  { no: 12, namaSiswa: 'Lutfi Hakim', jenisKelamin: 'L', kelas: 'XII-IIS-2' },
  { no: 13, namaSiswa: 'Muhammad Reyhan', jenisKelamin: 'L', kelas: 'X-1' },
  { no: 14, namaSiswa: 'Nabila Putri', jenisKelamin: 'P', kelas: 'XI-MIPA-1' },
  { no: 15, namaSiswa: 'Oki Setiawan', jenisKelamin: 'L', kelas: 'XII-MIPA-1' }
];

export const INITIAL_FEES: Fee[] = [
  { no: 1, jenis: 'Seragam laki-laki', biaya: 2175000 },
  { no: 2, jenis: 'Seragam Perempuan', biaya: 2175000 },
  { no: 3, jenis: 'Seragam Perempuan Jilbab', biaya: 2410000 }
];

export const INITIAL_NEEDS: Need[] = [
  { no: 1, jenis: 'Baju Seragam Putih OSIS', satuan: 'PCS' },
  { no: 2, jenis: 'Celana/Rok Abu-Abu', satuan: 'PCS' },
  { no: 3, jenis: 'Baju Seragam Pramuka', satuan: 'PCS' },
  { no: 4, jenis: 'Celana/Rok Pramuka', satuan: 'PCS' },
  { no: 5, jenis: 'Seragam Atasan Batik', satuan: 'PCS' },
  { no: 6, jenis: 'Kaos Olahraga Sekolah', satuan: 'PCS' },
  { no: 7, jenis: 'Celana Training Panjang Olahraga', satuan: 'PCS' },
  { no: 8, jenis: 'Atribut (Nama Dada, Topi, Dasi, Ikat Pinggang, Badge Lokasi )', satuan: 'SET' },
  { no: 9, jenis: 'Sabuk & Kaos Kaki Seragam', satuan: 'SET' }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    idTransaksi: 'TRX-20260701-0001',
    tanggal: '2026-07-01',
    noSiswa: 1,
    namaSiswa: 'Ahmad Fauzi',
    kelas: 'X-1',
    jenisKelamin: 'L',
    jenisBiaya: 'Seragam laki-laki',
    biaya: 2175000,
    terbilang: 'Dua Juta Seratus Tujuh Puluh Lima Ribu Rupiah',
    kebutuhanDiserahkan: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    petugas1: 'Budi (Kasir)',
    petugas2: 'Hasan (Petugas Koperasi)'
  },
  {
    idTransaksi: 'TRX-20260702-0002',
    tanggal: '2026-07-02',
    noSiswa: 3,
    namaSiswa: 'Citra Lestari',
    kelas: 'X-1',
    jenisKelamin: 'P',
    jenisBiaya: 'Seragam Perempuan Jilbab',
    biaya: 2410000,
    terbilang: 'Dua Juta Empat Ratus Sepuluh Ribu Rupiah',
    kebutuhanDiserahkan: [1, 2, 3, 4, 5, 6, 7, 8],
    petugas1: 'Siti (Kasir)',
    petugas2: 'Hasan (Petugas Koperasi)'
  },
  {
    idTransaksi: 'TRX-20260704-0003',
    tanggal: '2026-07-04',
    noSiswa: 5,
    namaSiswa: 'Eko Prasetyo',
    kelas: 'XI-MIPA-1',
    jenisKelamin: 'L',
    jenisBiaya: 'Seragam laki-laki',
    biaya: 2175000,
    terbilang: 'Dua Juta Seratus Tujuh Puluh Lima Ribu Rupiah',
    kebutuhanDiserahkan: [1, 2, 8, 9],
    petugas1: 'Budi (Kasir)',
    petugas2: 'Roni (Petugas Koperasi)'
  },
  {
    idTransaksi: 'TRX-20260705-0004',
    tanggal: '2026-07-05',
    noSiswa: 6,
    namaSiswa: 'Fitriani',
    kelas: 'XI-IIS-2',
    jenisKelamin: 'P',
    jenisBiaya: 'Seragam Perempuan',
    biaya: 2175000,
    terbilang: 'Dua Juta Seratus Tujuh Puluh Lima Ribu Rupiah',
    kebutuhanDiserahkan: [5],
    petugas1: 'Budi (Kasir)',
    petugas2: 'Roni (Petugas Koperasi)'
  },
  {
    idTransaksi: 'TRX-20260706-0005',
    tanggal: '2026-07-06',
    noSiswa: 14,
    namaSiswa: 'Nabila Putri',
    kelas: 'XI-MIPA-1',
    jenisKelamin: 'P',
    jenisBiaya: 'Seragam Perempuan',
    biaya: 2175000,
    terbilang: 'Dua Juta Seratus Tujuh Puluh Lima Ribu Rupiah',
    kebutuhanDiserahkan: [6, 7],
    petugas1: 'Budi (Kasir)',
    petugas2: 'Siti (Koperasi)'
  }
];
