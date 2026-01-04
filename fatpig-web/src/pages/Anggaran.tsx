import React, { useEffect, useState, useMemo } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { useUIStore } from "../store/uiStore";
import { supabase } from "../lib/supabase";
import { useThemeStore, THEMES } from "../store/themeStore"; // Import Theme
import { Plus, Trash2, X, Calculator, Edit2, Package } from "lucide-react";
import { BudgetService } from "../services/budgetService";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

export const Anggaran: React.FC = () => {
  const { currentTheme } = useThemeStore();
  const themeColors = THEMES[currentTheme]; // Ambil warna
  const { setShowNavbar } = useUIStore();

  const [anggaranList, setAnggaranList] = useState<any[]>([]);
  const [rekeningList, setRekeningList] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // ... (State Form & Logic Fetch SAMA) ...
  const [kategori, setKategori] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [tipeBatas, setTipeBatas] = useState("Tidak Ada");
  const [batasNominal, setBatasNominal] = useState("");
  const formatNumber = (val: string) =>
    val.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fetchData = async () => {
    /* ... (sama) ... */ const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    
    // Fetch rekening data
    const { data: dataRekening } = await supabase
      .from("multi_rekening")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false);
    setRekeningList(dataRekening || []);
    
    const { data: dataAmplop } = await supabase
      .from("pos_anggaran")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString();
    const { data: dataTransaksi } = await supabase
      .from("transaksi")
      .select("kategori, nominal, tipe")
      .eq("user_id", user.id)
      .eq("tipe", "pengeluaran")
      .gte("created_at", startOfMonth);
    const mergedData = (dataAmplop || []).map((amplop) => {
      const terpakai = (dataTransaksi || [])
        .filter((t) => t.kategori === amplop.kategori)
        .reduce((sum, t) => sum + t.nominal, 0);
      return { ...amplop, terpakai };
    });
    setAnggaranList(mergedData);
  };
  useEffect(() => {
    fetchData();
  }, []);
  useEffect(() => {
    setShowNavbar(!isFormOpen);
    return () => setShowNavbar(true);
  }, [isFormOpen, setShowNavbar]);
  const onDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      setIsFormOpen(false);
    }
  };
  const globalStats = useMemo(() => {
    const totalAnggaran = anggaranList.reduce(
      (acc, curr) => acc + curr.jumlah,
      0
    );
    const totalTerpakai = anggaranList.reduce(
      (acc, curr) => acc + curr.terpakai,
      0
    );
    const totalSisa = totalAnggaran - totalTerpakai;
    return { totalAnggaran, totalTerpakai, totalSisa };
  }, [anggaranList]);
  useEffect(() => {
    if (!jumlah || tipeBatas === "Tidak Ada") {
      if (tipeBatas === "Tidak Ada") setBatasNominal("");
      return;
    }
    const totalDana = parseInt(jumlah.replace(/\./g, "")) || 0;
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const sisaHari = Math.max(1, lastDay.getDate() - today.getDate() + 1);
    const sisaMinggu = Math.max(1, Math.ceil(sisaHari / 7));
    let hasil = 0;
    if (["Harian", "Weekday", "Weekend"].includes(tipeBatas))
      hasil = Math.floor(totalDana / sisaHari);
    else if (tipeBatas === "Mingguan")
      hasil = Math.floor(totalDana / sisaMinggu);
    setBatasNominal(formatNumber(hasil.toString()));
  }, [jumlah, tipeBatas]);
  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    
    const newAmount = parseInt(jumlah.replace(/\./g, "")) || 0;
    
    // Validasi uang bebas sebelum menyimpan
    const allocationCheck = BudgetService.checkAllocationLimit(
      newAmount,
      editId,
      rekeningList,
      anggaranList
    );
    
    if (allocationCheck.isOver) {
      alert(allocationCheck.message);
      return; // Block operation
    }
    
    const payload = {
      user_id: user.id,
      kategori,
      jumlah: newAmount,
      tipe_batas: tipeBatas,
      batas_nominal: batasNominal
        ? parseInt(batasNominal.replace(/\./g, ""))
        : 0,
      limit_set_date: new Date().toISOString(),
    };
    if (editId)
      await supabase.from("pos_anggaran").update(payload).eq("id", editId);
    else await supabase.from("pos_anggaran").insert(payload);
    setIsFormOpen(false);
    resetForm();
    fetchData();
  };
  const handleEdit = (amplop: any) => {
    setEditId(amplop.id);
    setKategori(amplop.kategori);
    setJumlah(formatNumber(amplop.jumlah.toString()));
    setTipeBatas(amplop.tipe_batas);
    setBatasNominal(formatNumber(amplop.batas_nominal.toString()));
    setIsFormOpen(true);
  };
  const handleDelete = async (id: number) => {
    if (!confirm("Hapus amplop ini?")) return;
    await supabase.from("pos_anggaran").delete().eq("id", id);
    fetchData();
  };
  const resetForm = () => {
    setEditId(null);
    setKategori("");
    setJumlah("");
    setTipeBatas("Tidak Ada");
    setBatasNominal("");
  };

  return (
    <AppLayout>
      <header className="mb-4 flex justify-between items-end animate-fade-in-down">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-widest">
            Budgeting
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Amplop Belanja
          </h2>
        </div>
      </header>

      {/* SUMMARY CARD (Gradient Dinamis) */}
      <div className="relative overflow-hidden rounded-[32px] p-8 text-white shadow-2xl mb-5 group">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent})`,
          }}
        ></div>
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] bg-white/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-5">
            <div>
              <p className="text-blue-100 font-medium text-sm mb-1">
                Total Alokasi Bulan Ini
              </p>
              <h3 className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-sm">
                {BudgetService.formatRupiah(globalStats.totalAnggaran)}
              </h3>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20">
              <Package size={24} className="text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <p className="text-blue-100 text-xs font-bold uppercase mb-1">
                Terpakai
              </p>
              <p className="font-bold text-xl">
                {BudgetService.formatRupiah(globalStats.totalTerpakai)}
              </p>
            </div>
            <div className="bg-black/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <p className="text-blue-100 text-xs font-bold uppercase mb-1">
                Sisa Budget
              </p>
              <p className="font-bold text-xl">
                {BudgetService.formatRupiah(globalStats.totalSisa)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LIST AMPLOP - Separate Sisa and Regular */}
      <div className="space-y-4 pb-32">
        {/* Regular Envelopes */}
        {anggaranList
          .filter((amplop) => !amplop.is_sisa_amplop)
          .map((amplop) => {
            const persentase = Math.min(
              (amplop.terpakai / amplop.jumlah) * 100,
              100
            );
            const isOver = amplop.terpakai > amplop.jumlah;
            const sisa = amplop.jumlah - amplop.terpakai;

            return (
              <div
                key={amplop.id}
                className="group bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] border border-gray-100 dark:border-white/5 hover:border-blue-500/30 shadow-sm transition-all relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-[20px] text-white flex items-center justify-center text-2xl shadow-inner`}
                      style={{ backgroundColor: themeColors.primary }}
                    >
                      📦
                    </div>
                    <div>
                      <h4 className="font-bold text-xl text-gray-900 dark:text-white leading-tight">
                        {amplop.kategori}
                      </h4>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">
                        Limit:{" "}
                        {amplop.tipe_batas !== "Tidak Ada"
                          ? `${BudgetService.formatRupiah(
                              amplop.batas_nominal
                            )}/${amplop.tipe_batas}`
                          : "Unlimited"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(amplop)}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 hover:text-blue-500 transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(amplop.id)}
                      className="p-2 rounded-xl bg-gray-100 dark:bg-[#2C2C2E] text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="mb-4 relative z-10">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                      {BudgetService.formatRupiah(amplop.terpakai)}
                    </span>
                    <span className="text-sm font-medium text-gray-400">
                      dari {BudgetService.formatRupiah(amplop.jumlah)}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-gray-100 dark:bg-black rounded-full overflow-hidden border border-gray-200 dark:border-white/5">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                        isOver ? "bg-red-500" : ""
                      }`}
                      style={{
                        width: `${persentase}%`,
                        backgroundColor: !isOver
                          ? themeColors.primary
                          : undefined,
                      }}
                    >
                      <div className="absolute inset-0 bg-white/20 bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-30"></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wide relative z-10">
                  <span
                    className={sisa < 0 ? "text-red-500" : "text-emerald-500"}
                  >
                    {sisa < 0 ? "Overbudget: " : "Sisa: "}
                    {BudgetService.formatRupiah(Math.abs(sisa))}
                  </span>
                  <span className="text-gray-400">
                    {Math.round(persentase)}% Used
                  </span>
                </div>
              </div>
            );
          })}

        {/* SISA AMPLOP SECTION - Special Design */}
        {anggaranList.filter((a) => a.is_sisa_amplop).length > 0 && (
          <>
            <div className="flex items-center gap-3 mt-8 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                🎁 Tabungan Sisa Limit
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-4 -mt-2">
              Akumulasi otomatis dari sisa limit harian yang tidak terpakai
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {anggaranList
                .filter((amplop) => amplop.is_sisa_amplop)
                .map((amplop) => {
                  // Find parent envelope to show context
                  const parentKategori = amplop.kategori.replace("Sisa-", "");
                  const parentAmplop = anggaranList.find(
                    (a) => a.kategori === parentKategori
                  );

                  return (
                    <div
                      key={amplop.id}
                      className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-5 rounded-[24px] border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm hover:shadow-md transition-all group"
                    >
                      {/* Decorative Background */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-teal-500/10 rounded-full blur-xl"></div>

                      {/* Header */}
                      <div className="relative z-10 flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-xl shadow-lg">
                            💰
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">
                              {amplop.kategori}
                            </h4>
                            <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              Dari: {parentKategori}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(amplop.id)}
                          className="p-1.5 rounded-lg bg-white/50 dark:bg-black/20 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Main Amount */}
                      <div className="relative z-10 mb-4">
                        <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          {BudgetService.formatRupiah(amplop.jumlah)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Terkumpul dari limit tidak terpakai
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="relative z-10 flex gap-2">
                        {parentAmplop && (
                          <div className="flex-1 bg-white/60 dark:bg-black/20 rounded-xl px-3 py-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase">
                              Limit/Hari
                            </p>
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                              {BudgetService.formatRupiah(
                                parentAmplop.batas_nominal
                              )}
                            </p>
                          </div>
                        )}
                        <div className="flex-1 bg-white/60 dark:bg-black/20 rounded-xl px-3 py-2">
                          <p className="text-[10px] font-bold text-gray-500 uppercase">
                            Status
                          </p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            ✨ Aktif
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          resetForm();
          setIsFormOpen(true);
        }}
        className="fixed bottom-32 right-6 md:bottom-10 md:right-10 w-16 h-16 rounded-full text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer z-[999] ring-4 ring-white/20 dark:ring-black/20"
        style={{ backgroundColor: themeColors.primary }}
      >
        <Plus size={32} />
      </button>

      {/* MODAL FORM */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={onDragEnd}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#1C1C1E] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border-t border-gray-100 dark:border-white/10 pb-20 sm:pb-6"
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing"></div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {editId ? "Edit Amplop" : "Amplop Baru"}
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="bg-gray-100 dark:bg-[#2C2C2E] p-2 rounded-full text-gray-500 hover:text-red-500"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSimpan} className="space-y-4">
                {/* ...Inputs sama... */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">
                    Nama Kategori
                  </label>
                  <input
                    required
                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium text-lg"
                    placeholder="Contoh: Makan"
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">
                    Budget Bulanan
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-bold text-xl"
                    placeholder="Rp 0"
                    value={jumlah}
                    onChange={(e) => setJumlah(formatNumber(e.target.value))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">
                      Tipe Limit
                    </label>
                    <select
                      className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium"
                      value={tipeBatas}
                      onChange={(e) => setTipeBatas(e.target.value)}
                    >
                      <option value="Tidak Ada">No Limit</option>
                      <option value="Harian">Harian</option>
                      <option value="Mingguan">Mingguan</option>
                      <option value="Weekday">Weekday</option>
                      <option value="Weekend">Weekend</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1 flex items-center gap-1">
                      Auto Limit{" "}
                      {tipeBatas !== "Tidak Ada" && (
                        <Calculator size={12} className="text-green-500" />
                      )}
                    </label>
                    <input
                      disabled={tipeBatas === "Tidak Ada"}
                      type="text"
                      className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none disabled:opacity-50 font-bold text-blue-500 text-lg"
                      placeholder="-"
                      value={batasNominal}
                      onChange={(e) =>
                        setBatasNominal(formatNumber(e.target.value))
                      }
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 rounded-[20px] font-bold text-white shadow-lg transition-all mt-4 text-lg"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {editId ? "Simpan Perubahan" : "Buat Amplop"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppLayout>
  );
};
