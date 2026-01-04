import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { BudgetService } from "./budgetService";

export const ExportService = {
  // --- EXPORT PDF ---
  exportPDF: (transaksiList: any[], periode: string, userNama: string) => {
    const doc = new jsPDF();

    // 1. Header Laporan
    doc.setFontSize(18);
    doc.text(`Laporan Keuangan - FATpig`, 14, 20);

    doc.setFontSize(11);
    doc.text(`User: ${userNama}`, 14, 30);
    doc.text(`Periode: ${periode}`, 14, 35);
    doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, 14, 40);

    // 2. Siapkan Data Tabel
    const tableData = transaksiList.map((t) => [
      new Date(t.created_at).toLocaleDateString("id-ID"), // Tanggal
      t.kategori, // Kategori
      t.keterangan, // Keterangan
      t.tipe === "pemasukan" ? BudgetService.formatRupiah(t.nominal) : "-", // Masuk
      t.tipe === "pengeluaran" ? BudgetService.formatRupiah(t.nominal) : "-", // Keluar
    ]);

    // 3. Buat Tabel
    autoTable(doc, {
      startY: 50,
      head: [["Tanggal", "Kategori", "Keterangan", "Pemasukan", "Pengeluaran"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [55, 48, 163] }, // Warna Ungu FATpig
      styles: { fontSize: 9 },
    });

    // 4. Hitung Total
    const totalMasuk = transaksiList
      .filter((t) => t.tipe === "pemasukan")
      .reduce((acc, t) => acc + t.nominal, 0);
    const totalKeluar = transaksiList
      .filter((t) => t.tipe === "pengeluaran")
      .reduce((acc, t) => acc + t.nominal, 0);
    const saldoAkhir = totalMasuk - totalKeluar;

    // 5. Footer Ringkasan (Posisi di bawah tabel)
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(
      `Total Pemasukan: ${BudgetService.formatRupiah(totalMasuk)}`,
      14,
      finalY
    );
    doc.text(
      `Total Pengeluaran: ${BudgetService.formatRupiah(totalKeluar)}`,
      14,
      finalY + 5
    );
    doc.setFont("helvetica", "bold");
    doc.text(
      `Surplus/Defisit: ${BudgetService.formatRupiah(saldoAkhir)}`,
      14,
      finalY + 12
    );

    // 6. Download
    doc.save(`Laporan_FATpig_${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  // --- EXPORT EXCEL ---
  exportExcel: (transaksiList: any[]) => {
    // 1. Format Data untuk Excel
    const dataToExport = transaksiList.map((t) => ({
      Tanggal: new Date(t.created_at).toLocaleDateString("id-ID"),
      Jam: new Date(t.created_at).toLocaleTimeString("id-ID"),
      Keterangan: t.keterangan,
      Kategori: t.kategori,
      Tipe: t.tipe,
      Nominal: t.nominal,
      AkunID: t.rekening_id,
    }));

    // 2. Buat Worksheet
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");

    // 3. Download
    XLSX.writeFile(
      workbook,
      `Laporan_FATpig_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  },
};
