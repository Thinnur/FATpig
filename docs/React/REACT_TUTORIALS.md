# FATpig React - Implementation Tutorials

> **Step-by-step guides for implementing key features in FATpig React**

---

## 📖 Table of Contents

1. [Tutorial 1: Setting Up a New FATpig React Project](#tutorial-1-setting-up-a-new-fatpig-react-project)
2. [Tutorial 2: Implementing AI Transaction Parsing](#tutorial-2-implementing-ai-transaction-parsing)
3. [Tutorial 3: Creating Budget Envelopes with Limits](#tutorial-3-creating-budget-envelopes-with-limits)
4. [Tutorial 4: Building Overbudget Warning System](#tutorial-4-building-overbudget-warning-system)
5. [Tutorial 5: Implementing PDF/Excel Export](#tutorial-5-implementing-pdfexcel-export)
6. [Tutorial 6: Creating Custom Theme System](#tutorial-6-creating-custom-theme-system)

---

## Tutorial 1: Setting Up a New FATpig React Project

**Goal:** Create a new FATpig React project from scratch with all dependencies and configuration.

**Time:** 30 minutes

**Prerequisites:**
- Node.js 18+ installed
- Supabase account
- Google AI Studio API key

---

### Step 1: Initialize Vite Project

```bash
npm create vite@latest fatpig-web -- --template react-ts
cd fatpig-web
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install @supabase/supabase-js zustand react-router-dom

# UI dependencies
npm install tailwindcss postcss autoprefixer
npm install clsx tailwind-merge lucide-react framer-motion

# AI & Export
npm install @google/generative-ai
npm install jspdf jspdf-autotable xlsx

# Date handling
npm install date-fns

# Dev dependencies
npm install -D @types/node
```

### Step 3: Initialize Tailwind CSS

```bash
npx tailwindcss init -p
```

Update `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

### Step 4: Set Up Environment Variables

Create `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-key
```

Add to `.gitignore`:

```
.env
.env.local
```

### Step 5: Create Project Structure

```bash
mkdir -p src/{components/{layout,ui,budget},hooks,lib,pages,services,store,types,utils}
```

### Step 6: Create Supabase Client

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase Environment Variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Step 7: Create TypeScript Types

Create `src/types/database.ts`:

```typescript
export interface UserProfile {
  id: string;
  email: string;
  nama: string;
  tema: "ungu" | "hijau" | "biru" | "pink" | "orange";
  dark_mode: boolean;
  avatar: string;
  akumulasi_sisa: boolean;
}

export interface Rekening {
  id: number;
  user_id: string;
  nama: string;
  tipe: "cash" | "bank" | "ewallet";
  saldo: number;
}

export interface PosAnggaran {
  id: number;
  user_id: string;
  kategori: string;
  jumlah: number;
  terpakai?: number;
  batas_nominal: number;
  tipe_batas: "Tidak Ada" | "Harian" | "Mingguan" | "Weekday" | "Weekend";
  is_sisa_amplop: boolean;
  limit_set_date: string | null;
}

export interface Transaksi {
  id: number;
  user_id: string;
  keterangan: string;
  nominal: number;
  kategori: string;
  rekening_id: number | null;
  tipe: "pengeluaran" | "pemasukan";
  created_at: string;
}
```

### Step 8: Set Up Supabase Database

In Supabase SQL Editor, run:

```sql
-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR NOT NULL,
  nama VARCHAR NOT NULL,
  tema VARCHAR DEFAULT 'ungu',
  dark_mode BOOLEAN DEFAULT false,
  avatar VARCHAR DEFAULT '👤',
  akumulasi_sisa BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage own profile"
  ON user_profiles FOR ALL
  USING (auth.uid() = id);

-- Create other tables (rekening, pos_anggaran, transaksi)
-- See REACT_DATABASE_API.md for full schema
```

### Step 9: Test Setup

```bash
npm run dev
```

Visit `http://localhost:5173` to verify setup.

---

## Tutorial 2: Implementing AI Transaction Parsing

**Goal:** Create a service that uses Google Gemini to parse natural language transactions.

**Time:** 45 minutes

---

### Step 1: Create AI Service

Create `src/services/aiService.ts`:

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const AIService = {
  async parseTransaction(text: string, categories: string[]) {
    if (!API_KEY) {
      throw new Error("API Key Gemini belum diatur di file .env");
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Filter out Sisa-* categories
    const validCategories = categories.filter((c) => !c.startsWith("Sisa-"));

    const prompt = `Analisis teks transaksi keuangan: "${text}"

Kategori tersedia: ${validCategories.length > 0 ? validCategories.join(", ") : "Lainnya"}

Tugas:
1. Tentukan tipe: 'pengeluaran' atau 'pemasukan'
2. Ekstrak nominal (angka saja)
3. Pilih kategori yang cocok atau 'Lainnya'
4. Buat keterangan singkat

Balas HANYA dengan JSON (tanpa backtick/markdown):
{"tipe":"pengeluaran","nominal":15000,"kategori":"Makan siang","keterangan":"Ayam goreng"}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();

      // Clean JSON response
      let cleanJson = textResponse
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/\n/g, "")
        .trim();

      // Extract JSON if wrapped
      const jsonMatch = cleanJson.match(/\{[^}]+\}/);
      if (jsonMatch) {
        cleanJson = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanJson);

      // Validate required fields
      if (!parsed.tipe || !parsed.nominal || !parsed.kategori) {
        throw new Error("Response tidak lengkap");
      }

      return parsed;
    } catch (error: any) {
      console.error("Error AI Detail:", error);
      
      if (error.message?.includes("API_KEY")) {
        throw new Error("API Key tidak valid.");
      }
      if (error.message?.includes("quota")) {
        throw new Error("Kuota API habis.");
      }
      if (error.message?.includes("JSON")) {
        throw new Error("Gagal parse response AI.");
      }

      throw new Error(`Gagal AI: ${error.message || "Unknown error"}`);
    }
  },
};
```

### Step 2: Create Transaction Input Component

Create `src/components/TransactionInput.tsx`:

```typescript
import { useState } from 'react';
import { AIService } from '@/services/aiService';

interface TransactionInputProps {
  categories: string[];
  onSubmit: (transaction: any) => void;
}

export const TransactionInput: React.FC<TransactionInputProps> = ({
  categories,
  onSubmit
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!input.trim()) {
      setError('Input tidak boleh kosong');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await AIService.parseTransaction(input, categories);
      onSubmit(result);
      setInput('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl">
      <h3 className="text-lg font-bold mb-4">AI Transaction Parser</h3>
      
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g., beli nasi goreng 25rb"
        className="w-full px-4 py-3 border rounded-lg mb-3"
        disabled={loading}
      />
      
      {error && (
        <p className="text-red-500 text-sm mb-3">{error}</p>
      )}
      
      <button
        onClick={handleParse}
        disabled={loading}
        className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg
          hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Parsing...' : 'Parse with AI'}
      </button>
    </div>
  );
};
```

### Step 3: Use in Transaction Page

```typescript
import { TransactionInput } from '@/components/TransactionInput';

const handleAIResult = async (result: any) => {
  console.log('AI Result:', result);
  
  // Save to database
  const { error } = await supabase
    .from('transaksi')
    .insert({
      user_id: userId,
      keterangan: result.keterangan,
      nominal: result.nominal,
      kategori: result.kategori,
      rekening_id: selectedAccountId,
      tipe: result.tipe,
      created_at: new Date().toISOString()
    });
    
  if (error) throw error;
  alert('Transaction saved!');
};

<TransactionInput 
  categories={categories} 
  onSubmit={handleAIResult}
/>
```

### Step 4: Test AI Parsing

Try these inputs:
- `"beli ayam goreng 25000"`
- `"top up gopay 100rb"`
- `"terima gaji 5 juta"`
- `"bensin motor 50k"`

---

## Tutorial 3: Creating Budget Envelopes with Limits

**Goal:** Implement budget envelope creation with flexible limit types.

**Time:** 60 minutes

---

### Step 1: Create Envelope Form Component

Create `src/components/budget/EnvelopeForm.tsx`:

```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface EnvelopeFormProps {
  userId: string;
  onSuccess: () => void;
}

export const EnvelopeForm: React.FC<EnvelopeFormProps> = ({
  userId,
  onSuccess
}) => {
  const [kategori, setKategori] = useState('');
  const [jumlah, setJumlah] = useState('');
  const [batasNominal, setBatasNominal] = useState('');
  const [tipeBatas, setTipeBatas] = useState<string>('Tidak Ada');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('pos_anggaran')
        .insert({
          user_id: userId,
          kategori: kategori,
          jumlah: parseFloat(jumlah),
          batas_nominal: parseFloat(batasNominal) || 0,
          tipe_batas: tipeBatas,
          is_sisa_amplop: false,
          limit_set_date: tipeBatas !== 'Tidak Ada' 
            ? new Date().toISOString() 
            : null
        });

      if (error) throw error;

      // Create Sisa-* envelope if has limit
      if (tipeBatas !== 'Tidak Ada') {
        await supabase
          .from('pos_anggaran')
          .insert({
            user_id: userId,
            kategori: `Sisa-${kategori}`,
            jumlah: 0,
            batas_nominal: 0,
            tipe_batas: 'Tidak Ada',
            is_sisa_amplop: true,
            limit_set_date: null
          });
      }

      alert('Envelope created!');
      onSuccess();
      
      // Reset form
      setKategori('');
      setJumlah('');
      setBatasNominal('');
      setTipeBatas('Tidak Ada');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <div>
        <label className="block text-sm font-medium mb-2">
          Category Name
        </label>
        <input
          type="text"
          value={kategori}
          onChange={(e) => setKategori(e.target.value)}
          placeholder="e.g., Food, Transport"
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Allocated Amount
        </label>
        <input
          type="number"
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="e.g., 1000000"
          required
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Limit Type
        </label>
        <select
          value={tipeBatas}
          onChange={(e) => setTipeBatas(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="Tidak Ada">No Limit</option>
          <option value="Harian">Daily</option>
          <option value="Mingguan">Weekly</option>
          <option value="Weekday">Weekday (Mon-Fri)</option>
          <option value="Weekend">Weekend (Sat-Sun)</option>
        </select>
      </div>

      {tipeBatas !== 'Tidak Ada' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Limit Amount
          </label>
          <input
            type="number"
            value={batasNominal}
            onChange={(e) => setBatasNominal(e.target.value)}
            placeholder="e.g., 50000"
            required
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full px-4 py-3 bg-green-500 text-white rounded-lg
          hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? 'Creating...' : 'Create Envelope'}
      </button>
    </form>
  );
};
```

### Step 2: Display Envelopes

Create `src/components/budget/EnvelopeList.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PosAnggaran } from '@/types/database';
import { BudgetService } from '@/services/budgetService';

interface EnvelopeListProps {
  userId: string;
}

export const EnvelopeList: React.FC<EnvelopeListProps> = ({ userId }) => {
  const [envelopes, setEnvelopes] = useState<PosAnggaran[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnvelopes();
  }, [userId]);

  const fetchEnvelopes = async () => {
    try {
      const { data, error } = await supabase
        .from('pos_anggaran')
        .select('*')
        .eq('user_id', userId)
        .eq('is_sisa_amplop', false)
        .order('id', { ascending: true });

      if (error) throw error;
      setEnvelopes(data || []);
    } catch (error) {
      console.error('Error fetching envelopes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {envelopes.map((envelope) => (
        <div
          key={envelope.id}
          className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow"
        >
          <h3 className="text-lg font-bold mb-2">{envelope.kategori}</h3>
          
          <div className="space-y-1 text-sm">
            <p>
              Allocated: {BudgetService.formatRupiah(envelope.jumlah)}
            </p>
            
            {envelope.tipe_batas !== 'Tidak Ada' && (
              <>
                <p>
                  Limit: {BudgetService.formatRupiah(envelope.batas_nominal)}
                </p>
                <p className="text-gray-500">
                  Type: {envelope.tipe_batas}
                </p>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Step 3: Use in Anggaran Page

```typescript
import { EnvelopeForm } from '@/components/budget/EnvelopeForm';
import { EnvelopeList } from '@/components/budget/EnvelopeList';

function Anggaran() {
  const [userId, setUserId] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || '');
    });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Budget Envelopes</h1>
      
      <EnvelopeForm 
        userId={userId} 
        onSuccess={() => setRefresh(r => r + 1)}
      />
      
      <div className="mt-8">
        <EnvelopeList userId={userId} key={refresh} />
      </div>
    </div>
  );
}
```

---

## Tutorial 4: Building Overbudget Warning System

**Goal:** Implement real-time overbudget checking before saving transactions.

**Time:** 45 minutes

---

### Step 1: Create Budget Service

Create `src/services/budgetService.ts`:

```typescript
import type { PosAnggaran, Transaksi } from '@/types/database';

export const BudgetService = {
  formatRupiah: (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  },

  checkOverbudget: (
    kategori: string,
    nominalBaru: number,
    anggaranList: PosAnggaran[],
    transaksiBulanIni: Transaksi[]
  ) => {
    const amplop = anggaranList.find((a) => a.kategori === kategori);

    if (!amplop || amplop.tipe_batas === "Tidak Ada") {
      return { isOver: false, message: "" };
    }

    const today = new Date();
    let limitPeriod = 0;
    let transactionsInPeriod: Transaksi[] = [];

    // Daily, Weekday, Weekend
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
    }
    
    // Weekly
    else if (amplop.tipe_batas === "Mingguan") {
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
        message: `Transaksi ini melebihi limit ${amplop.tipe_batas}. Sisa limitmu hanya ${BudgetService.formatRupiah(sisaLimit)}.`,
      };
    }

    return { isOver: false, message: "" };
  },
};
```

### Step 2: Use in Transaction Creation

```typescript
const handleCreateTransaction = async (transactionData: any) => {
  // 1. Fetch envelopes
  const { data: envelopes } = await supabase
    .from('pos_anggaran')
    .select('*')
    .eq('user_id', userId);

  // 2. Fetch transactions this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: transactions } = await supabase
    .from('transaksi')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startOfMonth.toISOString());

  // 3. Check overbudget
  const overbudgetCheck = BudgetService.checkOverbudget(
    transactionData.kategori,
    transactionData.nominal,
    envelopes || [],
    transactions || []
  );

  if (overbudgetCheck.isOver) {
    const proceed = window.confirm(
      `${overbudgetCheck.message}\n\n` +
      `Limit: ${BudgetService.formatRupiah(overbudgetCheck.limit!)}\n` +
      `Spent: ${BudgetService.formatRupiah(overbudgetCheck.limit! - overbudgetCheck.sisaLimit!)}\n` +
      `Remaining: ${BudgetService.formatRupiah(overbudgetCheck.sisaLimit!)}\n` +
      `Over by: ${BudgetService.formatRupiah(overbudgetCheck.overAmount!)}\n\n` +
      `Proceed anyway?`
    );

    if (!proceed) {
      return; // Cancel transaction
    }
  }

  // 4. Save transaction
  const { error } = await supabase
    .from('transaksi')
    .insert({
      user_id: userId,
      ...transactionData,
      created_at: new Date().toISOString()
    });

  if (error) throw error;
  alert('Transaction saved!');
};
```

---

## Tutorial 5: Implementing PDF/Excel Export

**Goal:** Create export functionality for financial reports.

**Time:** 30 minutes

---

### Step 1: Create Export Service

Create `src/services/exportService.ts`:

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { BudgetService } from "./budgetService";

export const ExportService = {
  exportPDF: (transaksiList: any[], periode: string, userNama: string) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text(`Financial Report - FATpig`, 14, 20);
    doc.setFontSize(11);
    doc.text(`User: ${userNama}`, 14, 30);
    doc.text(`Period: ${periode}`, 14, 35);
    doc.text(`Generated: ${new Date().toLocaleString("id-ID")}`, 14, 40);

    // Table data
    const tableData = transaksiList.map((t) => [
      new Date(t.created_at).toLocaleDateString("id-ID"),
      t.kategori,
      t.keterangan,
      t.tipe === "pemasukan" ? BudgetService.formatRupiah(t.nominal) : "-",
      t.tipe === "pengeluaran" ? BudgetService.formatRupiah(t.nominal) : "-",
    ]);

    // Generate table
    autoTable(doc, {
      startY: 50,
      head: [["Date", "Category", "Description", "Income", "Expense"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [55, 48, 163] },
    });

    // Summary
    const totalMasuk = transaksiList
      .filter((t) => t.tipe === "pemasukan")
      .reduce((acc, t) => acc + t.nominal, 0);
    const totalKeluar = transaksiList
      .filter((t) => t.tipe === "pengeluaran")
      .reduce((acc, t) => acc + t.nominal, 0);

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Total Income: ${BudgetService.formatRupiah(totalMasuk)}`, 14, finalY);
    doc.text(`Total Expense: ${BudgetService.formatRupiah(totalKeluar)}`, 14, finalY + 5);

    // Download
    doc.save(`FATpig_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  },

  exportExcel: (transaksiList: any[]) => {
    const dataToExport = transaksiList.map((t) => ({
      Date: new Date(t.created_at).toLocaleDateString("id-ID"),
      Time: new Date(t.created_at).toLocaleTimeString("id-ID"),
      Description: t.keterangan,
      Category: t.kategori,
      Type: t.tipe,
      Amount: t.nominal,
      AccountID: t.rekening_id,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    XLSX.writeFile(
      workbook,
      `FATpig_Report_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  },
};
```

### Step 2: Create Export Button Component

```typescript
import { useState } from 'react';
import { ExportService } from '@/services/exportService';
import { FileDown } from 'lucide-react';

interface ExportButtonProps {
  transactions: any[];
  period: string;
  userName: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  transactions,
  period,
  userName
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg
          hover:bg-blue-600 flex items-center gap-2"
      >
        <FileDown size={20} />
        Export
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg
          shadow-lg border z-50">
          <button
            onClick={() => {
              ExportService.exportPDF(transactions, period, userName);
              setShowMenu(false);
            }}
            className="w-full px-4 py-3 text-left hover:bg-gray-100
              rounded-t-lg"
          >
            Export as PDF
          </button>
          <button
            onClick={() => {
              ExportService.exportExcel(transactions);
              setShowMenu(false);
            }}
            className="w-full px-4 py-3 text-left hover:bg-gray-100
              rounded-b-lg"
          >
            Export as Excel
          </button>
        </div>
      )}
    </div>
  );
};
```

---

## Tutorial 6: Creating Custom Theme System

**Goal:** Implement a multi-theme system with Zustand persistence.

**Time:** 40 minutes

---

### Step 1: Create Theme Store

Create `src/store/themeStore.ts`:

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState {
  currentTheme: "ungu" | "hijau" | "biru" | "pink" | "orange";
  isDarkMode: boolean;
  setTheme: (theme: "ungu" | "hijau" | "biru" | "pink" | "orange") => void;
  toggleMode: () => void;
}

export const THEMES: Record<string, { primary: string; accent: string }> = {
  ungu: { primary: "#6366f1", accent: "#818cf8" },
  hijau: { primary: "#10b981", accent: "#34d399" },
  biru: { primary: "#3b82f6", accent: "#60a5fa" },
  pink: { primary: "#ec4899", accent: "#f472b6" },
  orange: { primary: "#f97316", accent: "#fb923c" },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: "ungu",
      isDarkMode: false,
      setTheme: (theme) => set({ currentTheme: theme }),
      toggleMode: () =>
        set((state) => {
          const newMode = !state.isDarkMode;
          if (newMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }
          return { isDarkMode: newMode };
        }),
    }),
    {
      name: "fatpig-theme-storage",
      onRehydrateStorage: () => (state) => {
        if (state?.isDarkMode) {
          document.documentElement.classList.add("dark");
        }
      },
    }
  )
);
```

### Step 2: Create Theme Switcher Component

```typescript
import { useThemeStore, THEMES } from '@/store/themeStore';
import { Moon, Sun } from 'lucide-react';

export const ThemeSwitcher = () => {
  const { currentTheme, isDarkMode, setTheme, toggleMode } = useThemeStore();

  return (
    <div className="p-4">
      <p className="text-sm font-medium mb-3">Theme Color</p>
      
      <div className="flex gap-2 mb-4">
        {Object.keys(THEMES).map((theme) => (
          <button
            key={theme}
            onClick={() => setTheme(theme as any)}
            className={`
              w-10 h-10 rounded-full border-2 transition-all
              ${currentTheme === theme 
                ? 'border-white scale-110 shadow-lg' 
                : 'border-transparent opacity-60'
              }
            `}
            style={{ backgroundColor: THEMES[theme].primary }}
            title={theme.charAt(0).toUpperCase() + theme.slice(1)}
          />
        ))}
      </div>

      <button
        onClick={toggleMode}
        className="flex items-center gap-3 px-4 py-3 rounded-xl
          hover:bg-gray-100 dark:hover:bg-gray-800 w-full"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
      </button>
    </div>
  );
};
```

### Step 3: Apply Theme to App

```typescript
import { useThemeStore, THEMES } from '@/store/themeStore';

function App() {
  const { currentTheme, isDarkMode } = useThemeStore();
  const themeColors = THEMES[currentTheme];

  return (
    <div 
      className={`${isDarkMode ? 'dark' : ''} min-h-screen`}
      style={{
        '--color-primary': themeColors.primary,
        '--color-accent': themeColors.accent,
      } as any}
    >
      {/* App content */}
    </div>
  );
}
```

### Step 4: Use Theme Colors in CSS

Update `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
      }
    }
  }
}
```

Use in components:

```tsx
<button className="bg-primary text-white hover:bg-accent">
  Themed Button
</button>
```

---

## 🎓 Conclusion

You've now learned how to implement:
1. ✅ Project setup with Vite + TypeScript
2. ✅ AI transaction parsing with Google Gemini
3. ✅ Budget envelopes with flexible limits
4. ✅ Overbudget warning system
5. ✅ PDF/Excel export functionality
6. ✅ Multi-theme system with persistence

**Next Steps:**
- See **[REACT_FUTURE_FEATURES.md](./REACT_FUTURE_FEATURES.md)** for Voice & OCR implementation
- See **[REACT_SERVICES.md](./REACT_SERVICES.md)** for advanced service patterns
- See **[REACT_UI_COMPONENTS.md](./REACT_UI_COMPONENTS.md)** for UI best practices

---

**Happy coding! 🐷💻**
