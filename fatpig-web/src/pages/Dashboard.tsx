import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { GlassCard } from "../components/ui/GlassCard"; // <--- INI YANG HILANG KEMARIN
import { useUIStore } from "../store/uiStore";
import { useThemeStore, THEMES } from "../store/themeStore";
import { BudgetService } from "../services/budgetService";
import { SisaLimitService } from "../services/sisaLimitService";
import { voiceService } from "../services/voiceService";
import {
  TrendingUp,
  Wallet,
  AlertTriangle,
  Loader2,
  Plus,
  Send,
  Mic,
  X,
  ArrowRightLeft,
  ChevronRight,
  MicOff,
  AlertCircle,
  Edit2,
  Trash2,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { AIService } from "../services/aiService";
import type { PosAnggaran, Rekening, Transaksi } from "../types/database";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import { getAccountLogo } from "../utils/accountIcons";

// Account Logo Component with proper hooks
const AccountLogoDisplay: React.FC<{ nama: string; tipe: string }> = ({ nama, tipe }) => {
  const [imageError, setImageError] = useState(false);
  const logoData = getAccountLogo(nama, tipe);
  
  return (
    <div
      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden bg-white"
    >
      {logoData.logo && !imageError ? (
        <img
          src={logoData.logo}
          alt={logoData.name}
          className="w-full h-full object-contain p-2"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full flex items-center justify-center ${logoData.color}`}>
          <span>{logoData.fallback}</span>
        </div>
      )}
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { setShowNavbar } = useUIStore();
  const { currentTheme } = useThemeStore();
  const themeColors = THEMES[currentTheme];

  const [rekeningList, setRekeningList] = useState<Rekening[]>([]);
  const [anggaranList, setAnggaranList] = useState<PosAnggaran[]>([]);
  const [transaksiList, setTransaksiList] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("User");
  const [userAvatar, setUserAvatar] = useState("😎");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRekeningModalOpen, setIsRekeningModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);
  const [isEditRekeningModalOpen, setIsEditRekeningModalOpen] = useState(false);
  const [isDeleteRekeningModalOpen, setIsDeleteRekeningModalOpen] = useState(false);
  const [selectedRekening, setSelectedRekening] = useState<Rekening | null>(null);

  const [inputMode, setInputMode] = useState<"ai" | "manual">("ai");
  const [aiText, setAiText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [manualForm, setManualForm] = useState({
    keterangan: "",
    nominal: "",
    kategori: "",
    rekeningId: "",
    tipe: "pengeluaran",
  });
  const [newRekening, setNewRekening] = useState({
    nama: "",
    tipe: "bank",
    saldo: "",
  });
  const [transferForm, setTransferForm] = useState({
    fromId: "",
    toId: "",
    nominal: "",
    keterangan: "",
  });
  const [topupForm, setTopupForm] = useState({
    rekeningId: "",
    nominal: "",
    keterangan: "",
  });

  const [pendingTx, setPendingTx] = useState<any>(null);
  const [warningMsg, setWarningMsg] = useState("");
  const [isAIConfirmOpen, setIsAIConfirmOpen] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [sisaRefundAmount, setSisaRefundAmount] = useState(0);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [userVoiceLanguage, setUserVoiceLanguage] = useState("id-ID");
  const [showVoiceToast, setShowVoiceToast] = useState(false);

  const formatNumber = (val: string) =>
    val.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const fetchData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("nama, avatar, bahasa_suara")
        .eq("id", user.id)
        .single();
      if (profile) {
        setUserName(profile.nama || "User");
        setUserAvatar(profile.avatar || "😎");
        setUserVoiceLanguage(profile.bahasa_suara || "id-ID");
      }

      const { data: dataRekening } = await supabase
        .from("multi_rekening")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_deleted", false)
        .order("id", { ascending: true });
      const { data: dataAnggaran } = await supabase
        .from("pos_anggaran")
        .select("*")
        .eq("user_id", user.id)
        .order("id", { ascending: true });
      const startOfMonth = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      ).toISOString();
      const { data: dataTransaksi } = await supabase
        .from("transaksi")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startOfMonth);

      const anggaranWithUsage = (dataAnggaran || []).map((amplop) => {
        const totalTerpakai = (dataTransaksi || [])
          .filter(
            (t) => t.kategori === amplop.kategori && t.tipe === "pengeluaran"
          )
          .reduce((sum, t) => sum + t.nominal, 0);
        return { ...amplop, terpakai: totalTerpakai };
      });

      setRekeningList(dataRekening || []);
      setAnggaranList(anggaranWithUsage as PosAnggaran[]);
      setTransaksiList(dataTransaksi || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        SisaLimitService.processAccumulation(user.id).then(() => fetchData());
      }
      fetchData();
    };
    init();
  }, []);

  // Voice recording functions
  const handleVoiceStart = () => {
    setVoiceError("");
    
    // Check browser support
    const browserInfo = voiceService.getBrowserInfo();
    if (!browserInfo.supported) {
      setVoiceError(browserInfo.note);
      setShowVoiceToast(true);
      setTimeout(() => setShowVoiceToast(false), 4000);
      return;
    }
    
    // Show toast for Safari/non-Chrome browsers
    if (browserInfo.browser === "Safari" || browserInfo.browser === "Unknown") {
      setShowVoiceToast(true);
      setTimeout(() => setShowVoiceToast(false), 3000);
    }
    
    setIsRecording(true);
    
    // Set up callbacks
    voiceService.onResult((result) => {
      if (result.isFinal) {
        setAiText((prev) => (prev ? `${prev} ${result.transcript}` : result.transcript));
      }
    });
    
    voiceService.onError((error) => {
      setVoiceError(error);
      setIsRecording(false);
      setShowVoiceToast(true);
      setTimeout(() => setShowVoiceToast(false), 4000);
    });
    
    voiceService.onEnd(() => {
      setIsRecording(false);
    });
    
    // Start recording with user's language preference
    voiceService.start({
      language: userVoiceLanguage,
      continuous: false,
      interimResults: false,
      maxAlternatives: 1,
    });
  };
  
  const handleVoiceStop = () => {
    voiceService.stop();
    setIsRecording(false);
  };
  
  useEffect(() => {
    // Cleanup voice service on unmount
    return () => {
      voiceService.abort();
      voiceService.clearCallbacks();
    };
  }, []);

  useEffect(() => {
    setShowNavbar(!isModalOpen);
    return () => setShowNavbar(true);
  }, [isModalOpen, setShowNavbar]);

  const onDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      setIsModalOpen(false);
    }
  };

  const executeTransaction = async (data: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("transaksi").insert({
      user_id: user.id,
      keterangan: data.keterangan,
      nominal: data.nominal,
      kategori: data.kategori,
      rekening_id: data.rekeningId,
      tipe: data.tipe,
    });
    if (error) throw error;
    const rekeningAsal = rekeningList.find((r) => r.id === data.rekeningId);
    if (rekeningAsal) {
      const saldoBaru =
        data.tipe === "pengeluaran"
          ? rekeningAsal.saldo - data.nominal
          : rekeningAsal.saldo + data.nominal;
      await supabase
        .from("multi_rekening")
        .update({ saldo: saldoBaru })
        .eq("id", data.rekeningId);
    }
    setIsModalOpen(false);
    setIsWarningModalOpen(false);
    setAiText("");
    setManualForm({
      keterangan: "",
      nominal: "",
      kategori: "",
      rekeningId: "",
      tipe: "pengeluaran",
    });
    fetchData();
  };
  const validateAndSubmit = (data: any) => {
    if (data.tipe === "pengeluaran") {
      const check = BudgetService.checkOverbudget(
        data.kategori,
        data.nominal,
        anggaranList,
        transaksiList
      );
      if (check.isOver) {
        setPendingTx(data);
        setWarningMsg(check.message);
        
        // Check if there's Sisa available to cover the overbudget
        const sisaKategori = `Sisa-${data.kategori}`;
        const sisaAmplop = anggaranList.find(
          (a) => a.kategori === sisaKategori && a.is_sisa_amplop
        );
        const sisaAvailable = sisaAmplop?.jumlah || 0;
        setSisaRefundAmount(sisaAvailable);
        
        setIsWarningModalOpen(true);
        return;
      }
    }
    executeTransaction(data).catch((err) => alert("Gagal: " + err.message));
  };
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nominal = parseInt(manualForm.nominal.replace(/\./g, "")) || 0;
    validateAndSubmit({
      ...manualForm,
      nominal,
      kategori: manualForm.kategori || "Lainnya",
      rekeningId: parseInt(manualForm.rekeningId) || rekeningList[0]?.id,
    });
  };
  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) return;
    setIsProcessing(true);
    try {
      const kategoriNames = anggaranList.map((a) => a.kategori);
      const result = await AIService.parseTransaction(aiText, kategoriNames);
      let selectedRekeningId = rekeningList[0]?.id;
      const foundRekening = rekeningList.find((r) =>
        aiText.toLowerCase().includes(r.nama.toLowerCase())
      );
      if (foundRekening) selectedRekeningId = foundRekening.id;
      
      // Show confirmation modal instead of direct submit
      setAiResult({
        keterangan: result.keterangan,
        nominal: result.nominal,
        kategori: result.kategori,
        rekeningId: selectedRekeningId,
        tipe: result.tipe,
      });
      setIsAIConfirmOpen(true);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Gagal AI.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAIConfirm = () => {
    if (!aiResult) return;
    validateAndSubmit(aiResult);
    setIsAIConfirmOpen(false);
    setAiResult(null);
    setAiText("");
  };

  const handleAICancel = () => {
    setIsAIConfirmOpen(false);
    setAiResult(null);
    setIsModalOpen(true); // Re-open transaction modal
  };
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(transferForm.nominal.replace(/\./g, "")) || 0;
    if (!transferForm.fromId || !transferForm.toId || !amount)
      return alert("Data tidak lengkap.");
    if (transferForm.fromId === transferForm.toId)
      return alert("Rekening sama.");
    const source = rekeningList.find(
      (r) => r.id === parseInt(transferForm.fromId)
    );
    const dest = rekeningList.find((r) => r.id === parseInt(transferForm.toId));
    if (source && source.saldo >= amount && dest) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("multi_rekening")
        .update({ saldo: source.saldo - amount })
        .eq("id", source.id);
      await supabase
        .from("multi_rekening")
        .update({ saldo: dest.saldo + amount })
        .eq("id", dest.id);
      await supabase.from("transaksi").insert([
        {
          user_id: user.id,
          keterangan: `Transfer ke ${dest.nama}: ${transferForm.keterangan}`,
          nominal: amount,
          kategori: "Transfer",
          rekening_id: source.id,
          tipe: "pengeluaran",
        },
        {
          user_id: user.id,
          keterangan: `Transfer dari ${source.nama}: ${transferForm.keterangan}`,
          nominal: amount,
          kategori: "Transfer",
          rekening_id: dest.id,
          tipe: "pemasukan",
        },
      ]);
      setIsTransferModalOpen(false);
      setTransferForm({ fromId: "", toId: "", nominal: "", keterangan: "" });
      fetchData();
      alert("Transfer Berhasil!");
    } else {
      alert("Saldo tidak cukup!");
    }
  };
  const handleAddRekening = async (e: React.FormEvent) => {
    e.preventDefault();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("multi_rekening").insert({
      user_id: user.id,
      nama: newRekening.nama,
      tipe: newRekening.tipe,
      saldo: parseInt(newRekening.saldo.replace(/\./g, "")) || 0,
    });
    if (!error) {
      setIsRekeningModalOpen(false);
      setNewRekening({ nama: "", tipe: "bank", saldo: "" });
      fetchData();
    } else {
      alert("Gagal: " + error.message);
    }
  };

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(topupForm.nominal.replace(/\./g, "")) || 0;
    if (!topupForm.rekeningId || !amount) return alert("Data tidak lengkap.");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const rekening = rekeningList.find(
      (r) => r.id === parseInt(topupForm.rekeningId)
    );
    if (rekening) {
      await supabase
        .from("multi_rekening")
        .update({ saldo: rekening.saldo + amount })
        .eq("id", rekening.id);

      await supabase.from("transaksi").insert({
        user_id: user.id,
        keterangan: topupForm.keterangan || `Topup ${rekening.nama}`,
        nominal: amount,
        kategori: "Topup",
        rekening_id: rekening.id,
        tipe: "pemasukan",
      });

      setIsTopupModalOpen(false);
      setTopupForm({ rekeningId: "", nominal: "", keterangan: "" });
      fetchData();
    }
  };
  
  // Handle Edit Rekening
  const handleEditRekening = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRekening) return;
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from("multi_rekening")
      .update({ nama: selectedRekening.nama })
      .eq("id", selectedRekening.id);
      
    if (!error) {
      setIsEditRekeningModalOpen(false);
      setSelectedRekening(null);
      fetchData();
    } else {
      alert("Gagal: " + error.message);
    }
  };
  
  // Handle Delete Rekening (Soft Delete)
  const handleDeleteRekening = async () => {
    if (!selectedRekening) return;
    
    // Check if balance is zero
    if (selectedRekening.saldo !== 0) {
      alert(`Tidak dapat menghapus rekening dengan saldo Rp ${BudgetService.formatRupiah(selectedRekening.saldo)}. Silakan kosongkan saldo terlebih dahulu.`);
      return;
    }
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from("multi_rekening")
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq("id", selectedRekening.id);
      
    if (!error) {
      setIsDeleteRekeningModalOpen(false);
      setSelectedRekening(null);
      fetchData();
    } else {
      alert("Gagal: " + error.message);
    }
  };

  const uangBebas = useMemo(
    () => BudgetService.hitungUangBebas(rekeningList, anggaranList),
    [rekeningList, anggaranList]
  );
  const totalSaldo = rekeningList.reduce((acc, curr) => acc + curr.saldo, 0);

  if (loading)
    return (
      <AppLayout>
        <div className="flex h-[80vh] items-center justify-center">
          <Loader2 className="animate-spin text-gray-400" size={40} />
        </div>
      </AppLayout>
    );

  return (
    <AppLayout>
      <header className="mb-4 flex justify-between items-end animate-fade-in-down relative z-20">
        <div>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-widest">
            Ringkasan
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Halo, {userName}
          </h2>
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center border-2 border-white dark:border-gray-700 shadow-md text-xl relative z-20">
          {userAvatar}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
        <div className="col-span-1 md:col-span-2 relative overflow-hidden rounded-[32px] p-8 text-white shadow-2xl transition-transform hover:scale-[1.01] duration-500 group">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent})`,
            }}
          ></div>
          <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-white/20 rounded-full blur-3xl group-hover:bg-white/30 transition-all"></div>
          <div className="absolute bottom-[-50px] left-[-20px] w-40 h-40 bg-purple-500/30 rounded-full blur-2xl"></div>
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[180px]">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white/80 font-medium text-sm md:text-base mb-1">
                  Safe to Spend
                </h3>
                <div className="text-4xl md:text-5xl font-extrabold tracking-tight drop-shadow-sm">
                  {BudgetService.formatRupiah(uangBebas)}
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-md p-2.5 rounded-2xl border border-white/20">
                <Wallet size={24} className="text-white" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs md:text-sm font-semibold bg-black/20 w-fit px-4 py-2 rounded-full backdrop-blur-md border border-white/10 hover:bg-black/30 transition-colors cursor-help">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]"></div>
              <span>Uang bebas dialokasikan</span>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 rounded-[32px] p-8 flex flex-col justify-between min-h-[180px] shadow-sm hover:shadow-md transition-all">
          <div>
            <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-gray-400">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-500">
                <TrendingUp size={18} />
              </div>
              <span className="font-bold text-xs uppercase tracking-wide">
                Total Aset
              </span>
            </div>
            <span className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {BudgetService.formatRupiah(totalSaldo)}
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-sm">
            <span className="text-gray-400">Status</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg">
              Aman <TrendingUp size={14} />
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-4 relative z-10">
        <div className="lg:col-span-1 space-y-4 relative z-10">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Rekening
            </h3>
            <button
              onClick={() => setIsRekeningModalOpen(true)}
              className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 p-2 rounded-full transition-all relative z-20"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-3">
            {rekeningList.map((akun) => (
              <div
                key={akun.id}
                className="group bg-white dark:bg-[#1C1C1E] p-4 rounded-[24px] flex justify-between items-center shadow-sm border border-gray-100 dark:border-white/5 hover:border-blue-500/30 transition-all relative z-10"
              >
                <div className="flex items-center gap-4 flex-1">
                  <AccountLogoDisplay nama={akun.nama} tipe={akun.tipe} />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 dark:text-white">
                      {akun.nama}
                    </p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {akun.tipe}
                    </p>
                  </div>
                  <div className="text-right mr-2">
                    <span className="font-bold block text-gray-900 dark:text-gray-100">
                      {BudgetService.formatRupiah(akun.saldo)}
                    </span>
                  </div>
                  {/* Edit & Delete Buttons */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRekening(akun);
                        setIsEditRekeningModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRekening(akun);
                        setIsDeleteRekeningModalOpen(true);
                      }}
                      className="p-2 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                      title="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* BUTTONS: Transfer & Lainnya (z-20 agar bisa diklik) */}
          <div className="grid grid-cols-2 gap-3 relative z-20">
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-all text-gray-700 dark:text-gray-300 relative z-20 cursor-pointer"
            >
              <ArrowRightLeft size={16} /> Transfer
            </button>
            <button
              onClick={() => setIsTopupModalOpen(true)}
              className="bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-all text-gray-700 dark:text-gray-300 relative z-20 cursor-pointer"
            >
              <Plus size={16} /> Topup
            </button>
          </div>
        </div>
        <div className="lg:col-span-2 relative z-10">
          <div className="flex justify-between items-center mb-5 px-1">
            <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              Amplop Aktif
            </h3>
            <a
              href="/anggaran"
              className="text-sm font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors relative z-20"
            >
              Lihat Semua <ChevronRight size={16} />
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Regular Envelopes */}
            {anggaranList
              .filter((a) => !a.is_sisa_amplop)
              .slice(0, 4)
              .map((amplop) => {
                const terpakai = amplop.terpakai || 0;
                const persentase = Math.min(
                  (terpakai / amplop.jumlah) * 100,
                  100
                );
                const isOver = terpakai > amplop.jumlah;
                return (
                  <GlassCard
                    key={amplop.id}
                    className="p-6 flex flex-col justify-between min-h-[160px] bg-white dark:bg-[#1C1C1E] border-gray-100 dark:border-white/5 shadow-sm relative z-10"
                    hoverEffect
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col">
                        <span className="font-bold text-lg text-gray-900 dark:text-white">
                          {amplop.kategori}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                          {amplop.tipe_batas === "Tidak Ada"
                            ? "Bulanan"
                            : amplop.tipe_batas}
                        </span>
                      </div>
                      {isOver && (
                        <AlertTriangle
                          size={20}
                          className="text-red-500 animate-bounce"
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2 font-medium">
                        <span className="text-gray-500">
                          {Math.round(persentase)}%
                        </span>
                        <span
                          className={
                            isOver
                              ? "text-red-500 font-bold"
                              : "text-gray-900 dark:text-gray-300"
                          }
                        >
                          Sisa:{" "}
                          {BudgetService.formatRupiah(amplop.jumlah - terpakai)}
                        </span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${persentase}%`,
                            backgroundColor: isOver
                              ? "#ef4444"
                              : themeColors.primary,
                          }}
                        />
                      </div>
                    </div>
                  </GlassCard>
                );
              })}

            {/* Sisa Envelopes - Special Design */}
            {anggaranList
              .filter((a) => a.is_sisa_amplop)
              .slice(0, 2)
              .map((amplop) => {
                const parentKategori = amplop.kategori.replace("Sisa-", "");
                return (
                  <div
                    key={amplop.id}
                    className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-5 rounded-[24px] border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm hover:shadow-md transition-all min-h-[160px] flex flex-col justify-between"
                  >
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>

                    {/* Header */}
                    <div className="relative z-10 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-lg shadow-md">
                          💰
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white block">
                            {amplop.kategori}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                            Tabungan Sisa
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="relative z-10">
                      <div className="flex justify-between items-end">
                        <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                          {BudgetService.formatRupiah(amplop.jumlah)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          dari {parentKategori}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mt-4 pb-32 relative z-10">
        <div className="flex items-center justify-between mb-5 px-1">
          <h3 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
            Transaksi Terbaru
          </h3>
          <a
            href="/transaksi"
            className="text-sm font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
          >
            Lihat Semua <ChevronRight size={16} />
          </a>
        </div>
        <div className="space-y-3">
          {transaksiList.slice(0, 3).map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-[#2C2C2E] transition-all shadow-sm"
            >
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.tipe === "pemasukan"
                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {tx.tipe === "pemasukan" ? (
                      <ArrowDown size={18} />
                    ) : (
                      <ArrowUp size={18} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {tx.keterangan}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {tx.kategori}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold text-sm ${
                      tx.tipe === "pemasukan"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {tx.tipe === "pemasukan" ? "+" : "-"}
                    {BudgetService.formatRupiah(tx.nominal)}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
            {transaksiList.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Belum ada transaksi</p>
              </div>
            )}
          </div>
        </div>

      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-32 right-6 md:bottom-10 md:right-10 w-16 h-16 rounded-full text-white shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer z-[999] ring-4 ring-white/20 dark:ring-black/20"
        style={{ backgroundColor: themeColors.primary }}
      >
        <Plus size={32} />
      </button>

      {/* MODAL TRANSAKSI */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
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
                  Transaksi Baru
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-gray-100 dark:bg-[#2C2C2E] p-2 rounded-full text-gray-500 hover:text-red-500"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="bg-gray-100 dark:bg-[#2C2C2E] p-1 rounded-2xl flex mb-6">
                <button
                  onClick={() => setInputMode("ai")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    inputMode === "ai"
                      ? "text-white shadow-sm"
                      : "text-gray-500"
                  }`}
                  style={
                    inputMode === "ai"
                      ? { backgroundColor: themeColors.primary }
                      : {}
                  }
                >
                  ✨ AI Magic
                </button>
                <button
                  onClick={() => setInputMode("manual")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    inputMode === "manual"
                      ? "text-white shadow-sm"
                      : "text-gray-500"
                  }`}
                  style={
                    inputMode === "manual"
                      ? { backgroundColor: themeColors.primary }
                      : {}
                  }
                >
                  ⌨️ Manual
                </button>
              </div>
              {inputMode === "ai" ? (
                <form onSubmit={handleAISubmit}>
                  <div className="relative mb-4">
                    <textarea
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      placeholder="Contoh: Makan siang 15rb pakai gopay..."
                      className="w-full p-5 rounded-3xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none focus:ring-2 focus:ring-blue-500 h-40 text-lg resize-none placeholder-gray-400"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={isRecording ? handleVoiceStop : handleVoiceStart}
                      className={`absolute right-4 bottom-4 p-3 rounded-full transition-all cursor-pointer ${
                        isRecording
                          ? "bg-red-500 text-white animate-pulse"
                          : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                      }`}
                      title={isRecording ? "Stop Recording" : "Start Voice Input"}
                    >
                      {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  </div>
                  
                  {/* Voice Toast Notification */}
                  <AnimatePresence>
                    {showVoiceToast && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-4 p-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-start gap-2"
                      >
                        <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 text-sm text-blue-800 dark:text-blue-300">
                          {voiceError || "Voice input works best on Chrome/Edge. Safari requires permission each time."}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button
                    type="submit"
                    disabled={isProcessing || !aiText}
                    className="w-full py-4 rounded-[20px] font-bold text-white text-lg flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <>
                        <Send size={20} /> Proses
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                        Tipe
                      </label>
                      <select
                        className="w-full p-4 mt-1 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium"
                        value={manualForm.tipe}
                        onChange={(e) =>
                          setManualForm({ ...manualForm, tipe: e.target.value })
                        }
                      >
                        <option value="pengeluaran">Pengeluaran</option>
                        <option value="pemasukan">Pemasukan</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                        Nominal
                      </label>
                      <input
                        required
                        type="text"
                        placeholder="0"
                        className="w-full p-4 mt-1 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-bold text-lg"
                        value={manualForm.nominal}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            nominal: formatNumber(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                      Keterangan
                    </label>
                    <input
                      required
                      placeholder="Beli apa?"
                      className="w-full p-4 mt-1 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none"
                      value={manualForm.keterangan}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          keterangan: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                        Kategori
                      </label>
                      <select
                        className="w-full p-4 mt-1 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium"
                        value={manualForm.kategori}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            kategori: e.target.value,
                          })
                        }
                      >
                        <option value="">Pilih...</option>
                        {anggaranList.map((a) => (
                          <option key={a.id} value={a.kategori}>
                            {a.kategori}
                          </option>
                        ))}
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                        Rekening
                      </label>
                      <select
                        className="w-full p-4 mt-1 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium"
                        value={manualForm.rekeningId}
                        onChange={(e) =>
                          setManualForm({
                            ...manualForm,
                            rekeningId: e.target.value,
                          })
                        }
                      >
                        <option value="">Pilih...</option>
                        {rekeningList.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 rounded-[20px] font-bold text-white text-lg bg-blue-600 mt-2 hover:bg-blue-700 transition-colors"
                  >
                    Simpan
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Lainnya */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsTransferModalOpen(false)}
          ></div>
          <GlassCard className="relative w-full max-w-md p-6 bg-white dark:bg-[#1C1C1E] shadow-2xl rounded-[32px] border border-gray-100 dark:border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Transfer Dana
              </h3>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="bg-gray-100 dark:bg-[#2C2C2E] p-2 rounded-full text-gray-500 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div className="space-y-2">
                <select
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none"
                  value={transferForm.fromId}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, fromId: e.target.value })
                  }
                >
                  <option value="">Dari...</option>
                  {rekeningList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama}
                    </option>
                  ))}
                </select>
                <div className="flex justify-center -my-2 z-10 relative">
                  <div className="bg-gray-200 dark:bg-[#2C2C2E] p-2 rounded-full border-4 border-white dark:border-[#1C1C1E]">
                    <ArrowRightLeft className="w-5 h-5 text-gray-500 rotate-90" />
                  </div>
                </div>
                <select
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none"
                  value={transferForm.toId}
                  onChange={(e) =>
                    setTransferForm({ ...transferForm, toId: e.target.value })
                  }
                >
                  <option value="">Ke...</option>
                  {rekeningList
                    .filter((r) => r.id.toString() !== transferForm.fromId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nama}
                      </option>
                    ))}
                </select>
              </div>
              <input
                required
                type="text"
                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-bold text-3xl text-center placeholder-gray-500"
                placeholder="Rp 0"
                value={transferForm.nominal}
                onChange={(e) =>
                  setTransferForm({
                    ...transferForm,
                    nominal: formatNumber(e.target.value),
                  })
                }
              />
              <button
                type="submit"
                className="w-full py-4 rounded-[20px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Transfer Sekarang
              </button>
            </form>
          </GlassCard>
        </div>
      )}
      {isWarningModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsWarningModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-[#1C1C1E] p-6 rounded-[32px] shadow-2xl border-2 border-orange-500/50">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
              Overbudget!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
              {warningMsg}
            </p>
            
            {/* Sisa Refund Information */}
            {sisaRefundAmount > 0 && pendingTx && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">💰</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1 uppercase tracking-wide">
                      Sisa Tersedia
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-400 mb-2">
                      Akan dipotong dari <strong>Sisa-{pendingTx.kategori}</strong> untuk menutupi kekurangan:
                    </p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {BudgetService.formatRupiah(Math.min(sisaRefundAmount, pendingTx.nominal))}
                    </p>
                    {sisaRefundAmount < pendingTx.nominal && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                        Sisa tidak cukup menutupi seluruh kekurangan. Transaksi tetap dapat dilanjutkan.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {sisaRefundAmount === 0 && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl">
                <p className="text-xs text-yellow-800 dark:text-yellow-300">
                  <strong>Tidak ada Sisa tersedia.</strong> Transaksi akan tetap dicatat meskipun melebihi budget.
                </p>
              </div>
            )}
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsWarningModalOpen(false);
                  setSisaRefundAmount(0);
                }}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Batalkan
              </button>
              <button
                onClick={() => {
                  executeTransaction(pendingTx);
                  setSisaRefundAmount(0);
                }}
                className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors shadow-lg"
              >
                Lanjut
              </button>
            </div>
          </div>
        </div>
      )}
      {isRekeningModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsRekeningModalOpen(false)}
          ></div>
          <GlassCard className="relative w-full max-w-md p-6 bg-white dark:bg-[#1C1C1E] shadow-2xl rounded-[32px] border border-gray-100 dark:border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Rekening Baru
              </h3>
              <button
                onClick={() => setIsRekeningModalOpen(false)}
                className="bg-gray-100 dark:bg-[#2C2C2E] p-2 rounded-full text-gray-500 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddRekening} className="space-y-4">
              <input
                required
                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none"
                placeholder="Nama Akun (cth: Gopay)"
                value={newRekening.nama}
                onChange={(e) =>
                  setNewRekening({ ...newRekening, nama: e.target.value })
                }
              />
              <select
                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none"
                value={newRekening.tipe}
                onChange={(e) =>
                  setNewRekening({ ...newRekening, tipe: e.target.value })
                }
              >
                <option value="bank">Bank</option>
                <option value="ewallet">E-Wallet</option>
                <option value="cash">Tunai</option>
              </select>
              <input
                required
                type="text"
                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-bold text-lg"
                placeholder="Saldo Awal"
                value={newRekening.saldo}
                onChange={(e) =>
                  setNewRekening({
                    ...newRekening,
                    saldo: formatNumber(e.target.value),
                  })
                }
              />
              <button
                type="submit"
                className="w-full py-4 rounded-[20px] font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Simpan Akun
              </button>
            </form>
          </GlassCard>
        </div>
      )}
      {isTopupModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsTopupModalOpen(false)}
          ></div>
          <GlassCard className="relative w-full max-w-md p-6 bg-white dark:bg-[#1C1C1E] shadow-2xl rounded-[32px] border border-gray-100 dark:border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Topup Saldo
              </h3>
              <button
                onClick={() => setIsTopupModalOpen(false)}
                className="bg-gray-100 dark:bg-[#2C2C2E] p-2 rounded-full text-gray-500 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTopup} className="space-y-4">
              <select
                required
                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none"
                value={topupForm.rekeningId}
                onChange={(e) =>
                  setTopupForm({ ...topupForm, rekeningId: e.target.value })
                }
              >
                <option value="">Pilih Rekening...</option>
                {rekeningList.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nama} - {BudgetService.formatRupiah(r.saldo)}
                  </option>
                ))}
              </select>
              <input
                required
                type="text"
                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-bold text-3xl text-center placeholder-gray-500"
                placeholder="Rp 0"
                value={topupForm.nominal}
                onChange={(e) =>
                  setTopupForm({
                    ...topupForm,
                    nominal: formatNumber(e.target.value),
                  })
                }
              />
              <input
                type="text"
                className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none"
                placeholder="Keterangan (opsional)"
                value={topupForm.keterangan}
                onChange={(e) =>
                  setTopupForm({ ...topupForm, keterangan: e.target.value })
                }
              />
              <button
                type="submit"
                className="w-full py-4 rounded-[20px] font-bold text-white transition-colors"
                style={{ backgroundColor: themeColors.primary }}
              >
                Topup Sekarang
              </button>
            </form>
          </GlassCard>
        </div>
      )}

      {/* EDIT REKENING MODAL */}
      {isEditRekeningModalOpen && selectedRekening && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsEditRekeningModalOpen(false)}
          ></div>
          <GlassCard className="relative w-full max-w-md p-8 z-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Edit Rekening
              </h3>
              <button
                onClick={() => setIsEditRekeningModalOpen(false)}
                className="bg-gray-100 dark:bg-[#2C2C2E] p-2 rounded-full text-gray-500 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditRekening} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Nama Rekening
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none"
                  placeholder="Nama rekening"
                  value={selectedRekening.nama}
                  onChange={(e) =>
                    setSelectedRekening({ ...selectedRekening, nama: e.target.value })
                  }
                />
              </div>
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>Catatan:</strong> Anda hanya bisa mengubah nama rekening. Tipe dan saldo tidak dapat diubah untuk menjaga integritas data transaksi.
                </p>
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-[20px] font-bold text-white transition-colors"
                style={{ backgroundColor: themeColors.primary }}
              >
                Simpan Perubahan
              </button>
            </form>
          </GlassCard>
        </div>
      )}

      {/* DELETE REKENING MODAL */}
      {isDeleteRekeningModalOpen && selectedRekening && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[10000]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setIsDeleteRekeningModalOpen(false)}
          ></div>
          <GlassCard className="relative w-full max-w-md p-8 z-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Hapus Rekening
              </h3>
              <button
                onClick={() => setIsDeleteRekeningModalOpen(false)}
                className="bg-gray-100 dark:bg-[#2C2C2E] p-2 rounded-full text-gray-500 hover:text-red-500"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                <AlertTriangle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={24} />
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-1">
                    Peringatan!
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-400">
                    Anda akan menghapus rekening <strong>{selectedRekening.nama}</strong>. Rekening yang dihapus tidak dapat dikembalikan.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#2C2C2E] rounded-xl">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Saldo Saat Ini:</span>
                  <span className={`font-bold ${selectedRekening.saldo === 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {BudgetService.formatRupiah(selectedRekening.saldo)}
                  </span>
                </div>
                
                {selectedRekening.saldo !== 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-2xl p-4">
                    <p className="text-xs text-yellow-800 dark:text-yellow-300">
                      <strong>Tidak dapat menghapus!</strong> Saldo rekening harus Rp 0 sebelum dapat dihapus. Silakan transfer atau gunakan saldo terlebih dahulu.
                    </p>
                  </div>
                )}
                
                <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-4">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Riwayat tetap tersimpan:</strong> Transaksi yang menggunakan rekening ini akan tetap tercatat dengan catatan "⚠️ Rekening Dihapus".
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsDeleteRekeningModalOpen(false)}
                  className="py-4 rounded-[20px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#2C2C2E] hover:bg-gray-200 dark:hover:bg-[#3A3A3C] transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteRekening}
                  disabled={selectedRekening.saldo !== 0}
                  className="py-4 rounded-[20px] font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Hapus
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* AI RESULT CONFIRMATION MODAL */}
      {isAIConfirmOpen && aiResult && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[10001]">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleAICancel}
          ></div>
          <div className="relative w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden">
            {/* Header */}
            <div
              className="p-6 text-white"
              style={{
                background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.accent})`,
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
                  ✨
                </div>
                <div>
                  <h3 className="text-xl font-bold">Hasil AI Magic</h3>
                  <p className="text-white/70 text-sm">Periksa & edit jika perlu</p>
                </div>
              </div>
            </div>

            {/* Content - Editable Form */}
            <div className="p-6 space-y-4">
              {/* Tipe */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAiResult({ ...aiResult, tipe: "pengeluaran" })}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
                    aiResult.tipe === "pengeluaran"
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}
                >
                  💸 Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => setAiResult({ ...aiResult, tipe: "pemasukan" })}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
                    aiResult.tipe === "pemasukan"
                      ? "bg-emerald-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}
                >
                  💰 Pemasukan
                </button>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                  Nominal
                </label>
                <input
                  type="text"
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-bold text-2xl text-center"
                  value={formatNumber(aiResult.nominal.toString())}
                  onChange={(e) =>
                    setAiResult({
                      ...aiResult,
                      nominal: parseInt(e.target.value.replace(/\./g, "")) || 0,
                    })
                  }
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                  Kategori
                </label>
                <select
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium"
                  value={aiResult.kategori}
                  onChange={(e) =>
                    setAiResult({ ...aiResult, kategori: e.target.value })
                  }
                >
                  {anggaranList
                    .filter((a) => !a.is_sisa_amplop)
                    .map((a) => (
                      <option key={a.id} value={a.kategori}>
                        {a.kategori}
                      </option>
                    ))}
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none"
                  value={aiResult.keterangan}
                  onChange={(e) =>
                    setAiResult({ ...aiResult, keterangan: e.target.value })
                  }
                />
              </div>

              {/* Rekening */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                  Rekening
                </label>
                <select
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium"
                  value={aiResult.rekeningId}
                  onChange={(e) =>
                    setAiResult({
                      ...aiResult,
                      rekeningId: parseInt(e.target.value),
                    })
                  }
                >
                  {rekeningList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nama} - {BudgetService.formatRupiah(r.saldo)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={handleAICancel}
                className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Batalkan
              </button>
              <button
                onClick={handleAIConfirm}
                className="flex-1 py-4 rounded-2xl font-bold text-white transition-colors"
                style={{ backgroundColor: themeColors.primary }}
              >
                ✓ Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
