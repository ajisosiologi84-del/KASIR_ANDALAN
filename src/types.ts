/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Student {
  no: number;
  namaSiswa: string;
  jenisKelamin: 'L' | 'P' | string;
  kelas: string;
}

export interface Fee {
  no: number;
  jenis: string;
  biaya: number;
}

export interface Need {
  no: number;
  jenis: string;
  satuan: string;
}

export interface Transaction {
  idTransaksi: string;
  tanggal: string;
  noSiswa: number;
  namaSiswa: string;
  kelas: string;
  jenisKelamin: 'L' | 'P' | string;
  jenisBiaya: string;
  biaya: number;
  terbilang: string;
  kebutuhanDiserahkan: number[]; // Array of Need "no" values which are selected
  petugas1: string;
  petugas2: string;
  isCancelled?: boolean;
}

export type Role = 'admin' | 'kasir' | null;

export interface AppState {
  role: Role;
  username: string;
  students: Student[];
  fees: Fee[];
  needs: Need[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  spreadsheetId: string;
}
