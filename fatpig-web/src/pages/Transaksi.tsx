import React, { useEffect, useState, useMemo } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { useThemeStore, THEMES } from "../store/themeStore"; // Import Theme
import { BudgetService } from "../services/budgetService";
import { ExportService } from "../services/exportService";
import { supabase } from "../lib/supabase";
import {
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Trash2,
  X,
  Save,
  AlertTriangle,
  FileText,
  Sheet,
  Edit2,
  Calendar,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const RiwayatTransaksi: React.FC = () => {
  const { currentTheme } = useThemeStore();
  const themeColors = THEMES[currentTheme]; // Ambil warna

  const [transaksiList, setTransaksiList] = useState<any[]>([]);
  const [rekeningMap, setRekeningMap] = useState<Record<number, string>>({});
  const [userName, setUserName] = useState("User");

  // ... (State & Fetch Data Sama) ...
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("Semua");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Date range states for export
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const fetchData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("nama")
      .eq("id", user.id)
      .single();
    if (profile) setUserName(profile.nama);
    const { data: rekData } = await supabase
      .from("multi_rekening")
      .select("id, nama")
      .eq("user_id", user.id);
    const rekMap: Record<number, string> = {};
    rekData?.forEach((r) => (rekMap[r.id] = r.nama));
    setRekeningMap(rekMap);
    const { data: transData } = await supabase
      .from("transaksi")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);
    setTransaksiList(transData || []);
  };
  useEffect(() => {
    fetchData();
  }, []);
  const filteredList = useMemo(() => {
    return transaksiList.filter((t) => {
      const matchSearch = t.keterangan
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchFilter =
        selectedFilter === "Semua"
          ? true
          : selectedFilter === "Pemasukan"
          ? t.tipe === "pemasukan"
          : selectedFilter === "Pengeluaran"
          ? t.tipe === "pengeluaran"
          : t.kategori === selectedFilter;
      return matchSearch && matchFilter;
    });
  }, [transaksiList, searchTerm, selectedFilter]);
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredList.forEach((t) => {
      const dateStr = new Date(t.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(t);
    });
    return groups;
  }, [filteredList]);
  const categories = useMemo(
    () => [
      "Semua",
      "Pemasukan",
      "Pengeluaran",
      ...Array.from(new Set(transaksiList.map((t) => t.kategori))),
    ],
    [transaksiList]
  );
  const totalPemasukan = useMemo(
    () =>
      transaksiList
        .filter((t) => t.tipe === "pemasukan")
        .reduce((acc, t) => acc + t.nominal, 0),
    [transaksiList]
  );
  const totalPengeluaran = useMemo(
    () =>
      transaksiList
        .filter((t) => t.tipe === "pengeluaran")
        .reduce((acc, t) => acc + t.nominal, 0),
    [transaksiList]
  );
  const handleExportPDF = () => {
    let dataToExport = filteredList;
    let periodLabel = "Semua Waktu";
    
    if (exportStartDate && exportEndDate) {
      const start = startOfDay(parseISO(exportStartDate));
      const end = endOfDay(parseISO(exportEndDate));
      
      dataToExport = filteredList.filter((t) => {
        const txDate = parseISO(t.created_at);
        return isWithinInterval(txDate, { start, end });
      });
      
      periodLabel = `${format(start, "dd/MM/yyyy", { locale: idLocale })} - ${format(end, "dd/MM/yyyy", { locale: idLocale })}`;
    }
    
    ExportService.exportPDF(dataToExport, periodLabel, userName);
    setShowExportMenu(false);
  };
  
  const handleExportExcel = () => {
    let dataToExport = filteredList;
    
    if (exportStartDate && exportEndDate) {
      const start = startOfDay(parseISO(exportStartDate));
      const end = endOfDay(parseISO(exportEndDate));
      
      dataToExport = filteredList.filter((t) => {
        const txDate = parseISO(t.created_at);
        return isWithinInterval(txDate, { start, end });
      });
    }
    
    ExportService.exportExcel(dataToExport);
    setShowExportMenu(false);
  };
  
  const setDatePreset = (preset: string) => {
    const now = new Date();
    let start: Date;
    
    switch(preset) {
      case "today":
        start = now;
        break;
      case "week":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        return;
    }
    
    setExportStartDate(format(start, "yyyy-MM-dd"));
    setExportEndDate(format(now, "yyyy-MM-dd"));
  };
  const handleDelete = async (t: any) => {
    if (!confirm(`Hapus transaksi "${t.keterangan}"?`)) return;
    try {
      const { data: akun } = await supabase
        .from("multi_rekening")
        .select("saldo")
        .eq("id", t.rekening_id)
        .single();
      if (akun) {
        const saldoBaru =
          t.tipe === "pengeluaran"
            ? akun.saldo + t.nominal
            : akun.saldo - t.nominal;
        await supabase
          .from("multi_rekening")
          .update({ saldo: saldoBaru })
          .eq("id", t.rekening_id);
      }
      await supabase.from("transaksi").delete().eq("id", t.id);
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert("Gagal: " + err.message);
    }
  };
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase
      .from("transaksi")
      .update({ keterangan: editForm.keterangan, kategori: editForm.kategori })
      .eq("id", editForm.id);
    setIsEditModalOpen(false);
    fetchData();
  };

  return (
    <AppLayout>
      <header className="flex justify-between items-end mb-5 animate-fade-in-down">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-widest">
            History
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Laporan Keuangan
          </h2>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all"
          >
            <Download size={20} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 z-50 overflow-hidden animate-fade-in">
              {/* Date Range Picker */}
              <div className="p-3 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={14} className="text-gray-500" />
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                    Filter Rentang Tanggal
                  </span>
                </div>
                
                {/* Date Presets */}
                <div className="flex gap-1.5 mb-2">
                  <button
                    onClick={() => setDatePreset("today")}
                    className="flex-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={() => setDatePreset("week")}
                    className="flex-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
                  >
                    7 Hari
                  </button>
                  <button
                    onClick={() => setDatePreset("month")}
                    className="flex-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
                  >
                    Bulan Ini
                  </button>
                </div>
                
                {/* Custom Date Inputs */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-md bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/10 text-[11px] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <span className="text-gray-400 text-[10px]">s/d</span>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-md bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/10 text-[11px] text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {exportStartDate && exportEndDate && (
                    <button
                      onClick={() => {
                        setExportStartDate("");
                        setExportEndDate("");
                      }}
                      className="w-full px-2 py-1 rounded-md text-[10px] text-gray-500 hover:text-red-500 transition-colors"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
              
              {/* Export Buttons */}
              <button
                onClick={handleExportPDF}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
              >
                <FileText size={16} className="text-red-500" /> 
                <div className="flex-1">
                  <div className="font-bold">PDF Report</div>
                  {exportStartDate && exportEndDate && (
                    <div className="text-xs text-gray-500">
                      {format(parseISO(exportStartDate), "dd MMM", { locale: idLocale })} - {format(parseISO(exportEndDate), "dd MMM yyyy", { locale: idLocale })}
                    </div>
                  )}
                </div>
              </button>
              <div className="h-[1px] bg-gray-100 dark:bg-white/5"></div>
              <button
                onClick={handleExportExcel}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
              >
                <Sheet size={16} className="text-green-600" /> 
                <div className="flex-1">
                  <div className="font-bold">Excel Data</div>
                  {exportStartDate && exportEndDate && (
                    <div className="text-xs text-gray-500">
                      {format(parseISO(exportStartDate), "dd MMM", { locale: idLocale })} - {format(parseISO(exportEndDate), "dd MMM yyyy", { locale: idLocale })}
                    </div>
                  )}
                </div>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Analytics Card */}
      <div className="mb-4">
        <div 
          onClick={() => window.location.href = '/analitik'}
          className="rounded-[32px] p-6 text-white shadow-2xl hover:shadow-3xl transition-all cursor-pointer group relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent})`,
          }}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/20 rounded-full blur-2xl"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Analitik Keuangan</h3>
                <p className="text-white/80 text-sm">Lihat statistik lengkap</p>
              </div>
            </div>
            <ChevronRight size={24} className="group-hover:translate-x-2 transition-transform" />
          </div>
        </div>
      </div>

      {/* SUMMARY WIDGETS */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="p-6 rounded-[32px] bg-[#E0F2F1] dark:bg-[#064E3B]/40 border border-emerald-100 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400 relative group">
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-emerald-400/20 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-white/50 dark:bg-black/20 rounded-lg backdrop-blur-sm">
              <ArrowDown size={14} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide">
              Pemasukan
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {BudgetService.formatRupiah(totalPemasukan)}
          </div>
        </div>
        <div className="p-6 rounded-[32px] bg-[#FFEBEE] dark:bg-[#7F1D1D]/40 border border-rose-100 dark:border-rose-500/20 text-rose-800 dark:text-rose-400 relative group">
          <div className="absolute top-[-20%] right-[-10%] w-24 h-24 bg-rose-400/20 rounded-full blur-xl group-hover:scale-125 transition-transform"></div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-white/50 dark:bg-black/20 rounded-lg backdrop-blur-sm">
              <ArrowUp size={14} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wide">
              Pengeluaran
            </span>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {BudgetService.formatRupiah(totalPengeluaran)}
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS (Dinamis) */}
      <div className="mb-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-5 top-4 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Cari transaksi..."
            className="w-full pl-14 pr-6 py-4 rounded-[20px] bg-white dark:bg-[#1C1C1E] text-gray-900 dark:text-white border border-gray-100 dark:border-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${
                selectedFilter === cat
                  ? "text-white shadow-lg"
                  : "bg-white dark:bg-[#1C1C1E] text-gray-600 dark:text-gray-400 border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#2C2C2E]"
              }`}
              style={{
                backgroundColor:
                  selectedFilter === cat ? themeColors.primary : undefined,
                borderColor:
                  selectedFilter === cat ? themeColors.primary : undefined,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* LIST */}
      <div className="space-y-8 pb-32">
        {Object.keys(groupedTransactions).map((dateStr) => (
          <div key={dateStr}>
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 ml-2 sticky top-20">
              {dateStr}
            </h3>
            <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
              {groupedTransactions[dateStr].map((t: any, index: number) => {
                const isExpense = t.tipe === "pengeluaran";
                const timeStr = new Date(t.created_at).toLocaleTimeString(
                  "id-ID",
                  { hour: "2-digit", minute: "2-digit" }
                );
                return (
                  <div
                    key={t.id}
                    className={`p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-colors cursor-pointer group ${
                      index !== groupedTransactions[dateStr].length - 1
                        ? "border-b border-gray-100 dark:border-white/5"
                        : ""
                    }`}
                    onClick={() => {
                      setEditForm({ ...t });
                      setIsEditModalOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                          isExpense
                            ? "bg-rose-100 dark:bg-rose-500/10 text-rose-500"
                            : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-500"
                        }`}
                      >
                        {isExpense ? (
                          <ArrowUp size={20} />
                        ) : (
                          <ArrowDown size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white truncate text-base">
                          {t.keterangan}
                        </p>
                        <p className="text-xs font-semibold text-gray-400 truncate mt-0.5">
                          {t.kategori} • {rekeningMap[t.rekening_id] || "Tunai"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right pl-2 flex items-center gap-3">
                      <div>
                        <p
                          className={`font-bold text-base ${
                            isExpense ? "text-rose-500" : "text-emerald-500"
                          }`}
                        >
                          {isExpense ? "-" : "+"}{" "}
                          {BudgetService.formatRupiah(t.nominal)}
                        </p>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                          {timeStr}
                        </p>
                      </div>
                      <Edit2
                        size={16}
                        className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsEditModalOpen(false)}
          ></div>
          <GlassCard className="relative w-full max-w-sm p-6 bg-white dark:bg-[#1C1C1E] shadow-2xl rounded-[32px] border border-gray-100 dark:border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Edit Transaksi
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            <div className="bg-blue-50 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/20 mb-6 flex gap-3">
              <AlertTriangle size={20} className="text-blue-500 shrink-0" />
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 leading-relaxed">
                Untuk menjaga akurasi saldo dan budget, nominal hanya bisa
                diubah dengan menghapus dan membuat baru.
              </p>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">
                  Keterangan
                </label>
                <input
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium"
                  value={editForm.keterangan}
                  onChange={(e) =>
                    setEditForm({ ...editForm, keterangan: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">
                  Kategori
                </label>
                <input
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium"
                  value={editForm.kategori}
                  onChange={(e) =>
                    setEditForm({ ...editForm, kategori: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleDelete(editForm)}
                  className="p-4 rounded-[20px] bg-red-50 dark:bg-red-500/10 text-red-600 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 rounded-[20px] font-bold text-white transition-colors flex items-center justify-center gap-2"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  <Save size={18} /> Simpan
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </AppLayout>
  );
};
