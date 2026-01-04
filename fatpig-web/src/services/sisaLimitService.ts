import { supabase } from "../lib/supabase";

// Types for cron job status
interface CronJobStatus {
  id: number;
  job_name: string;
  started_at: string;
  finished_at: string | null;
  duration_seconds: number | null;
  status: "running" | "success" | "error";
  users_processed: number;
  envelopes_processed: number;
  days_processed: number;
  error_message: string | null;
  details: Record<string, unknown>;
}

interface AccumulationLog {
  id: number;
  kategori: string;
  tanggal: string;
  tipe_limit: string;
  batas_nominal: number;
  terpakai: number;
  sisa: number;
  created_at: string;
}

export const SisaLimitService = {
  /**
   * Cek status akumulasi sisa untuk user
   * Sekarang proses utama dijalankan oleh cron job server-side
   * Fungsi ini hanya untuk info/debug saat user buka app
   */
  checkAccumulationStatus: async (userId: string) => {
    console.log("🔍 Mengecek status akumulasi sisa limit...");

    // Cek preferensi user
    const { data: profile } = await supabase
      .from("profiles")
      .select("akumulasi_sisa")
      .eq("id", userId)
      .single();

    if (profile?.akumulasi_sisa === false) {
      console.log("⏸️ Fitur akumulasi sisa dinonaktifkan oleh user.");
      return { enabled: false, message: "Fitur akumulasi sisa dinonaktifkan" };
    }

    // Cek log akumulasi terakhir untuk user ini
    const { data: recentLogs } = await supabase
      .from("sisa_limit_log")
      .select("*")
      .eq("user_id", userId)
      .order("tanggal", { ascending: false })
      .limit(5);

    console.log("📊 Log akumulasi terakhir:", recentLogs);

    return {
      enabled: true,
      message: "Akumulasi sisa aktif (diproses otomatis oleh server)",
      recentLogs: recentLogs || [],
    };
  },

  /**
   * Get recent cron job execution history (for admin/debug)
   */
  getCronJobHistory: async (): Promise<CronJobStatus[]> => {
    const { data, error } = await supabase
      .from("v_recent_cron_jobs")
      .select("*")
      .limit(10);

    if (error) {
      console.error("Error fetching cron history:", error);
      return [];
    }

    return (data as CronJobStatus[]) || [];
  },

  /**
   * Get accumulation log for specific user
   */
  getAccumulationLog: async (
    userId: string,
    limit = 30
  ): Promise<AccumulationLog[]> => {
    const { data, error } = await supabase
      .from("sisa_limit_log")
      .select("*")
      .eq("user_id", userId)
      .order("tanggal", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching accumulation log:", error);
      return [];
    }

    return (data as AccumulationLog[]) || [];
  },

  /**
   * Get accumulation summary for a category
   */
  getCategorySummary: async (userId: string, kategori: string) => {
    const { data: logs } = await supabase
      .from("sisa_limit_log")
      .select("*")
      .eq("user_id", userId)
      .eq("kategori", kategori)
      .order("tanggal", { ascending: false })
      .limit(30);

    if (!logs || logs.length === 0) {
      return {
        kategori,
        totalDays: 0,
        totalSisa: 0,
        avgSisa: 0,
        underspentDays: 0,
        overspentDays: 0,
      };
    }

    const totalSisa = logs.reduce(
      (acc, log) => acc + (log.sisa > 0 ? log.sisa : 0),
      0
    );
    const underspentDays = logs.filter((log) => log.sisa > 0).length;
    const overspentDays = logs.filter((log) => log.sisa < 0).length;

    return {
      kategori,
      totalDays: logs.length,
      totalSisa,
      avgSisa: Math.round(totalSisa / logs.length),
      underspentDays,
      overspentDays,
    };
  },

  /**
   * Legacy: Client-side processing (DEPRECATED)
   * Sekarang dihandle oleh cron job server-side
   * Tetap ada untuk backward compatibility
   */
  processAccumulation: async (userId: string) => {
    console.log("ℹ️ Client-side processing sudah deprecated.");
    console.log(
      "📅 Akumulasi sekarang diproses otomatis oleh server setiap 00:05 WIB."
    );

    // Just check status instead of processing
    return SisaLimitService.checkAccumulationStatus(userId);
  },
};
