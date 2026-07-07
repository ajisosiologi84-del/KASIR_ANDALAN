/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mengubah angka nominal menjadi kalimat terbilang bahasa Indonesia.
 * Contoh: 250000 -> "Dua Ratus Lima Puluh Ribu Rupiah"
 */
export function convertToTerbilang(angka: number): string {
  const n = Math.floor(angka);
  if (n === 0) return "Nol Rupiah";

  const bilangan = [
    "", "Satu", "Dua", "Tiga", "Empat", "Lima",
    "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"
  ];

  function helper(val: number): string {
    let temp = "";
    if (val < 12) {
      temp = " " + bilangan[val];
    } else if (val < 20) {
      temp = helper(val - 10) + " Belas";
    } else if (val < 100) {
      temp = helper(Math.floor(val / 10)) + " Puluh" + helper(val % 10);
    } else if (val < 200) {
      temp = " Seratus" + helper(val - 100);
    } else if (val < 1000) {
      temp = helper(Math.floor(val / 100)) + " Ratus" + helper(val % 100);
    } else if (val < 2000) {
      temp = " Seribu" + helper(val - 1000);
    } else if (val < 1000000) {
      temp = helper(Math.floor(val / 1000)) + " Ribu" + helper(val % 1000);
    } else if (val < 1000000000) {
      temp = helper(Math.floor(val / 1000000)) + " Juta" + helper(val % 1000000);
    } else if (val < 1000000000000) {
      temp = helper(Math.floor(val / 1000000000)) + " Milyar" + helper(val % 1000000000);
    } else if (val < 1000000000000000) {
      temp = helper(Math.floor(val / 1000000000000)) + " Triliun" + helper(val % 1000000000000);
    }
    return temp;
  }

  const resultStr = helper(n).replace(/\s+/g, " ").trim();
  return resultStr + " Rupiah";
}
