import type { PosAnggaran } from "../types/database"; // FIX: Tambahkan 'type'

export const BudgetService = {
  formatRupiah: (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  },

  hitungUangBebas: (rekeningList: any[], anggaranList: any[]) => {
    const totalSaldo = rekeningList.reduce((acc, curr) => acc + curr.saldo, 0);
    const totalAlokasi = anggaranList.reduce(
      (acc, curr) => acc + curr.jumlah,
      0
    );
    return totalSaldo - totalAlokasi;
  },

  // --- CEK OVERBUDGET ---
  checkOverbudget: (
    kategori: string,
    nominalBaru: number,
    anggaranList: PosAnggaran[],
    transaksiBulanIni: any[]
  ) => {
    const amplop = anggaranList.find((a) => a.kategori === kategori);

    if (!amplop || amplop.tipe_batas === "Tidak Ada") {
      return { isOver: false, message: "" };
    }

    const today = new Date();
    let limitPeriod = 0;
    let transactionsInPeriod: any[] = [];

    if (
      amplop.tipe_batas === "Harian" ||
      amplop.tipe_batas === "Weekday" ||
      amplop.tipe_batas === "Weekend"
    ) {
      const day = today.getDay();
      const isWeekend = day === 0 || day === 6;

      if (amplop.tipe_batas === "Weekday" && isWeekend)
        return { isOver: false, message: "" };
      if (amplop.tipe_batas === "Weekend" && !isWeekend)
        return { isOver: false, message: "" };

      transactionsInPeriod = transaksiBulanIni.filter((t) => {
        const tDate = new Date(t.created_at);
        return (
          t.kategori === kategori &&
          tDate.getDate() === today.getDate() &&
          tDate.getMonth() === today.getMonth() &&
          tDate.getFullYear() === today.getFullYear()
        );
      });
      limitPeriod = amplop.batas_nominal;
    } else if (amplop.tipe_batas === "Mingguan") {
      const getMonday = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
      };
      const monday = getMonday(today);
      monday.setHours(0, 0, 0, 0);

      transactionsInPeriod = transaksiBulanIni.filter((t) => {
        const tDate = new Date(t.created_at);
        return t.kategori === kategori && tDate >= monday;
      });
      limitPeriod = amplop.batas_nominal;
    }

    const totalTerpakai = transactionsInPeriod.reduce(
      (sum, t) => sum + t.nominal,
      0
    );
    const sisaLimit = limitPeriod - totalTerpakai;

    if (nominalBaru > sisaLimit) {
      return {
        isOver: true,
        sisaLimit: sisaLimit,
        limit: limitPeriod,
        overAmount: nominalBaru - sisaLimit,
        message: `Transaksi ini melebihi limit ${
          amplop.tipe_batas
        }. Sisa limitmu hanya ${BudgetService.formatRupiah(sisaLimit)}.`,
      };
    }

    return { isOver: false, message: "" };
  },

  // --- CEK ALOKASI AMPLOP VS UANG BEBAS ---
  checkAllocationLimit: (
    newAmount: number,
    editingId: number | null,
    rekeningList: any[],
    anggaranList: any[]
  ) => {
    // Hitung total saldo rekening
    const totalSaldo = rekeningList.reduce((sum, r) => sum + r.saldo, 0);
    
    // Hitung total alokasi amplop (exclude amplop yang sedang diedit)
    const currentAllocation = anggaranList
      .filter((a) => a.id !== editingId)
      .reduce((sum, a) => sum + a.jumlah, 0);
    
    // Hitung uang bebas yang tersedia
    const freeBalance = totalSaldo - currentAllocation;
    
    // Cek apakah alokasi baru melebihi uang bebas
    const isOver = newAmount > freeBalance;
    const shortage = Math.max(0, newAmount - freeBalance);
    
    return {
      isOver,
      available: freeBalance,
      requested: newAmount,
      shortage,
      message: isOver
        ? `⚠️ Uang bebas tidak cukup!\n\nAlokasi yang diminta: ${BudgetService.formatRupiah(
            newAmount
          )}\nUang bebas tersedia: ${BudgetService.formatRupiah(
            freeBalance
          )}\nKekurangan: ${BudgetService.formatRupiah(shortage)}\n\nSilakan kurangi alokasi atau tambah saldo rekening terlebih dahulu.`
        : "",
    };
  },
};
