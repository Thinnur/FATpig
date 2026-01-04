import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { AppLayout } from "../components/layout/AppLayout";
import { useThemeStore, THEMES } from "../store/themeStore";
import type { Transaksi } from "../types/database";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, PieChart as PieChartIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, subDays, parseISO, isWithinInterval } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface ChartData {
  name: string;
  value?: number;
  pemasukan?: number;
  pengeluaran?: number;
  color?: string;
  [key: string]: string | number | undefined;
}

const COLORS = [
  "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
];

export default function Analitik() {
  const navigate = useNavigate();
  const { currentTheme } = useThemeStore();
  const themeColors = THEMES[currentTheme];
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all" | "custom">("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  useEffect(() => {
    fetchTransaksi();
  }, []);

  const fetchTransaksi = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transaksi")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransaksi(data || []);
    } catch (error) {
      console.error("Error fetching transaksi:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter transaksi berdasarkan rentang tanggal
  const getFilteredTransaksi = () => {
    if (dateRange === "all") return transaksi;

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (dateRange === "custom" && customStartDate && customEndDate) {
      startDate = parseISO(customStartDate);
      endDate = parseISO(customEndDate);
    } else if (dateRange === "7d") {
      startDate = subDays(now, 7);
    } else if (dateRange === "30d") {
      startDate = subDays(now, 30);
    } else if (dateRange === "90d") {
      startDate = subDays(now, 90);
    } else {
      return transaksi;
    }

    return transaksi.filter((t) => {
      const transactionDate = parseISO(t.created_at);
      return isWithinInterval(transactionDate, { start: startDate, end: endDate });
    });
  };

  const filteredTransaksi = getFilteredTransaksi();

  // Data untuk Pie Chart - Pengeluaran per Kategori
  const getCategoryData = (): ChartData[] => {
    const expenses = filteredTransaksi.filter((t) => t.tipe === "pengeluaran");
    const categoryMap = new Map<string, number>();

    expenses.forEach((t) => {
      const current = categoryMap.get(t.kategori) || 0;
      categoryMap.set(t.kategori, current + t.nominal);
    });

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 kategori
  };

  // Data untuk Bar Chart - Pemasukan vs Pengeluaran Bulanan
  const getMonthlyData = (): ChartData[] => {
    const monthlyMap = new Map<string, { pemasukan: number; pengeluaran: number }>();

    filteredTransaksi.forEach((t) => {
      const month = format(parseISO(t.created_at), "MMM yyyy", { locale: idLocale });
      const current = monthlyMap.get(month) || { pemasukan: 0, pengeluaran: 0 };

      if (t.tipe === "pemasukan") {
        current.pemasukan += t.nominal;
      } else {
        current.pengeluaran += t.nominal;
      }

      monthlyMap.set(month, current);
    });

    return Array.from(monthlyMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .slice(-6); // 6 bulan terakhir
  };

  // Data untuk Line Chart - Trend Pengeluaran Harian
  const getDailyData = (): ChartData[] => {
    const dailyMap = new Map<string, number>();

    filteredTransaksi
      .filter((t) => t.tipe === "pengeluaran")
      .forEach((t) => {
        const day = format(parseISO(t.created_at), "dd MMM", { locale: idLocale });
        const current = dailyMap.get(day) || 0;
        dailyMap.set(day, current + t.nominal);
      });

    return Array.from(dailyMap.entries())
      .map(([name, value]) => ({ name, value }))
      .slice(-14); // 14 hari terakhir
  };

  // Summary Statistics
  const getTotalPemasukan = () => {
    return filteredTransaksi
      .filter((t) => t.tipe === "pemasukan")
      .reduce((sum, t) => sum + t.nominal, 0);
  };

  const getTotalPengeluaran = () => {
    return filteredTransaksi
      .filter((t) => t.tipe === "pengeluaran")
      .reduce((sum, t) => sum + t.nominal, 0);
  };

  const getSaldo = () => getTotalPemasukan() - getTotalPengeluaran();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const categoryData = getCategoryData();
  const monthlyData = getMonthlyData();
  const dailyData = getDailyData();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
              style={{ borderBottomColor: themeColors.primary }}
            ></div>
            <p className="text-gray-600 dark:text-gray-400">Memuat data analitik...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/transaksi")}
              className="p-2 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-white/10 transition-all">
              <ArrowLeft size={24} className="text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <PieChartIcon style={{ color: themeColors.primary }} />
                Analitik Keuangan
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Visualisasi dan statistik keuangan Anda
              </p>
            </div>
          </div>
        </div>

        {/* Date Range Controls */}
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 mb-4 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="text-gray-700 dark:text-gray-300" size={20} style={{ color: themeColors.primary }} />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Periode</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setDateRange("7d")}
              className="px-4 py-2 rounded-lg transition-all text-sm font-medium text-white shadow-lg"
              style={{
                backgroundColor: dateRange === "7d" ? themeColors.primary : undefined,
              }}
            >
              <span className={dateRange !== "7d" ? "text-gray-700 dark:text-gray-300" : ""}>
                7 Hari
              </span>
            </button>
            <button
              onClick={() => setDateRange("30d")}
              className="px-4 py-2 rounded-lg transition-all text-sm font-medium text-white shadow-lg"
              style={{
                backgroundColor: dateRange === "30d" ? themeColors.primary : undefined,
              }}
            >
              <span className={dateRange !== "30d" ? "text-gray-700 dark:text-gray-300" : ""}>
                30 Hari
              </span>
            </button>
            <button
              onClick={() => setDateRange("90d")}
              className="px-4 py-2 rounded-lg transition-all text-sm font-medium text-white shadow-lg"
              style={{
                backgroundColor: dateRange === "90d" ? themeColors.primary : undefined,
              }}
            >
              <span className={dateRange !== "90d" ? "text-gray-700 dark:text-gray-300" : ""}>
                90 Hari
              </span>
            </button>
            <button
              onClick={() => setDateRange("all")}
              className="px-4 py-2 rounded-lg transition-all text-sm font-medium text-white shadow-lg"
              style={{
                backgroundColor: dateRange === "all" ? themeColors.primary : undefined,
              }}
            >
              <span className={dateRange !== "all" ? "text-gray-700 dark:text-gray-300" : ""}>
                Semua
              </span>
            </button>
            <button
              onClick={() => setDateRange("custom")}
              className="px-4 py-2 rounded-lg transition-all text-sm font-medium text-white shadow-lg"
              style={{
                backgroundColor: dateRange === "custom" ? themeColors.primary : undefined,
              }}
            >
              <span className={dateRange !== "custom" ? "text-gray-700 dark:text-gray-300" : ""}>
                Custom
              </span>
            </button>
          </div>

          {/* Custom Date Inputs */}
          {dateRange === "custom" && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/20">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-36 px-2.5 py-2 rounded-lg bg-white/50 dark:bg-white/5 border border-white/20 text-gray-700 dark:text-gray-300 text-xs focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': themeColors.primary } as any}
              />
              <span className="text-gray-600 dark:text-gray-400 text-xs">s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-36 px-2.5 py-2 rounded-lg bg-white/50 dark:bg-white/5 border border-white/20 text-gray-700 dark:text-gray-300 text-xs focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': themeColors.primary } as any}
              />
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp size={32} />
              <span className="text-emerald-100 text-sm">Total Pemasukan</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(getTotalPemasukan())}</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown size={32} />
              <span className="text-red-100 text-sm">Total Pengeluaran</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(getTotalPengeluaran())}</p>
          </div>

          <div className={`bg-gradient-to-br ${getSaldo() >= 0 ? "from-blue-500 to-blue-600" : "from-orange-500 to-orange-600"} rounded-2xl p-6 text-white`}>
            <div className="flex items-center justify-between mb-2">
              <PieChartIcon size={32} />
              <span className="text-white/80 text-sm">Saldo</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(getSaldo())}</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Pie Chart - Pengeluaran per Kategori */}
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Pengeluaran per Kategori
            </h2>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Tidak ada data pengeluaran
              </p>
            )}
          </div>

          {/* Bar Chart - Pemasukan vs Pengeluaran */}
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Pemasukan vs Pengeluaran Bulanan
            </h2>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                  <Legend />
                  <Bar dataKey="pemasukan" fill="#10b981" name="Pemasukan" />
                  <Bar dataKey="pengeluaran" fill="#ef4444" name="Pengeluaran" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Tidak ada data bulanan
              </p>
            )}
          </div>

          {/* Line Chart - Trend Pengeluaran Harian */}
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/20 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Trend Pengeluaran Harian
            </h2>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip formatter={(value: number | undefined) => formatCurrency(value || 0)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Pengeluaran"
                    dot={{ fill: "#8b5cf6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Tidak ada data harian
              </p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
