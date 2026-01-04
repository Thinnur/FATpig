# FATpig React - Services Documentation

> **Complete guide to service layer: AI parsing, budget calculations, exports, and limit management**

---

## 📖 Table of Contents

- [Overview](#overview)
- [aiService](#aiservice---ai-transaction-parsing)
- [budgetService](#budgetservice---financial-calculations)
- [exportService](#exportservice---pdf--excel-generation)
- [sisaLimitService](#sisalimitservice---envelope-limit-management)

---

## 🎯 Overview

FATpig React uses a **service layer pattern** to separate business logic from UI components. All services are located in [src/services/](../fatpig-web/src/services/).

### Service Architecture

```
Components (UI)
     ↓
Services (Business Logic)
     ↓
Supabase Client (Data Layer)
```

### Available Services

| Service | Purpose | Key Functions |
|---------|---------|---------------|
| **aiService** | AI-powered transaction parsing | `parseTransaction()` |
| **budgetService** | Budget calculations & formatting | `hitungUangBebas()`, `checkOverbudget()`, `formatRupiah()` |
| **exportService** | Report generation | `exportPDF()`, `exportExcel()` |
| **sisaLimitService** | Envelope limit reset logic | `getLastResetHistoryEntry()`, `canResetLimit()` |

---

## 🤖 aiService - AI Transaction Parsing

Location: [src/services/aiService.ts](../fatpig-web/src/services/aiService.ts)

### Overview

Uses **Google Gemini 2.5 Flash** to parse natural language transaction inputs into structured data.

### Setup

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
```

### API

#### `parseTransaction(text: string, categories: string[])`

Parse natural language input into transaction structure.

**Parameters:**
- `text` - User input (e.g., "beli ayam goreng 15 ribu")
- `categories` - Array of available category names

**Returns:**
```typescript
{
  tipe: "pengeluaran" | "pemasukan",
  nominal: number,
  kategori: string,
  keterangan: string
}
```

**Example Usage:**

```typescript
import { AIService } from '@/services/aiService';

const categories = ["Food", "Transport", "Shopping", "Entertainment"];

try {
  const result = await AIService.parseTransaction(
    "makan siang ayam goreng 25000",
    categories
  );
  
  console.log(result);
  // {
  //   tipe: "pengeluaran",
  //   nominal: 25000,
  //   kategori: "Food",
  //   keterangan: "Makan siang ayam goreng"
  // }
} catch (error) {
  console.error("AI parsing failed:", error);
}
```

### Prompt Engineering

The service uses a structured prompt in **Indonesian**:

```typescript
const prompt = `Analisis teks transaksi keuangan: "${text}"

Kategori tersedia: ${validCategories.join(", ")}

Tugas:
1. Tentukan tipe: 'pengeluaran' atau 'pemasukan'
2. Ekstrak nominal (angka saja)
3. Pilih kategori yang cocok atau 'Lainnya'
4. Buat keterangan singkat

Balas HANYA dengan JSON (tanpa backtick/markdown):
{"tipe":"pengeluaran","nominal":15000,"kategori":"Makan siang","keterangan":"Ayam goreng"}`;
```

### Key Features

1. **Category Filtering** - Automatically excludes `Sisa-*` categories
2. **JSON Cleaning** - Handles malformed responses with regex extraction
3. **Validation** - Ensures all required fields are present
4. **Error Handling** - Specific error messages for common issues

### Error Handling

```typescript
if (error.message?.includes("API_KEY")) {
  throw new Error("API Key tidak valid. Periksa kembali di Google AI Studio.");
}
if (error.message?.includes("quota")) {
  throw new Error("Kuota API habis. Coba lagi besok atau upgrade plan.");
}
if (error.message?.includes("JSON")) {
  throw new Error("Gagal parse response AI. Coba input lebih spesifik.");
}
```

### Common AI Input Examples

| User Input (ID) | Parsed Output |
|-----------------|---------------|
| "beli nasi goreng 20rb" | `{tipe: "pengeluaran", nominal: 20000, kategori: "Food", keterangan: "Nasi goreng"}` |
| "top up gopay 100000" | `{tipe: "pengeluaran", nominal: 100000, kategori: "Transfer", keterangan: "Top up GoPay"}` |
| "terima gaji 5jt" | `{tipe: "pemasukan", nominal: 5000000, kategori: "Salary", keterangan: "Gaji"}` |
| "bensin motor 50k" | `{tipe: "pengeluaran", nominal: 50000, kategori: "Transport", keterangan: "Bensin motor"}` |

### Best Practices

- ✅ Pass real category list (not hardcoded)
- ✅ Handle errors gracefully with user-friendly messages
- ✅ Show loading state during API call
- ✅ Allow manual correction if AI fails
- ❌ Don't send sensitive data to AI
- ❌ Don't trust AI output blindly - validate before saving

---

## 💰 budgetService - Financial Calculations

Location: [src/services/budgetService.ts](../fatpig-web/src/services/budgetService.ts)

### Overview

Handles currency formatting, free balance calculation, and overbudget detection.

### API

#### `formatRupiah(amount: number): string`

Format number as Indonesian Rupiah.

**Example:**
```typescript
BudgetService.formatRupiah(1500000);
// "Rp 1.500.000"

BudgetService.formatRupiah(50000);
// "Rp 50.000"
```

**Implementation:**
```typescript
formatRupiah: (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}
```

---

#### `hitungUangBebas(rekeningList: Rekening[], anggaranList: PosAnggaran[]): number`

Calculate safe-to-spend amount (Free Balance).

**Formula:**
```
Free Balance = Total Saldo (All Accounts) - Total Alokasi (All Envelopes)
```

**Example:**
```typescript
const accounts = [
  { saldo: 2000000 },
  { saldo: 1500000 }
];

const envelopes = [
  { jumlah: 1000000 },
  { jumlah: 500000 }
];

const freeBalance = BudgetService.hitungUangBebas(accounts, envelopes);
// 2000000 + 1500000 - 1000000 - 500000 = 2000000
```

---

#### `checkOverbudget(kategori, nominalBaru, anggaranList, transaksiBulanIni)`

Check if transaction exceeds envelope limit.

**Parameters:**
- `kategori` - Category name
- `nominalBaru` - New transaction amount
- `anggaranList` - Array of budget envelopes
- `transaksiBulanIni` - Transactions in current period

**Returns:**
```typescript
{
  isOver: boolean;
  sisaLimit?: number;
  limit?: number;
  overAmount?: number;
  message: string;
}
```

**Example Usage:**

```typescript
const result = BudgetService.checkOverbudget(
  "Food",
  50000,  // New transaction
  envelopes,
  transactions
);

if (result.isOver) {
  alert(result.message);
  // "Transaksi ini melebihi limit Harian. Sisa limitmu hanya Rp 30.000."
}
```

### Limit Types Logic

#### 1. Daily Limit (`"Harian"`)

```typescript
if (amplop.tipe_batas === "Harian") {
  // Filter transactions for today only
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
```

#### 2. Weekly Limit (`"Mingguan"`)

```typescript
if (amplop.tipe_batas === "Mingguan") {
  // Get Monday of current week
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };
  
  const monday = getMonday(today);
  monday.setHours(0, 0, 0, 0);

  // Filter transactions since Monday
  transactionsInPeriod = transaksiBulanIni.filter((t) => {
    const tDate = new Date(t.created_at);
    return t.kategori === kategori && tDate >= monday;
  });
}
```

#### 3. Weekday Limit (`"Weekday"`)

```typescript
if (amplop.tipe_batas === "Weekday") {
  const day = today.getDay();
  const isWeekend = day === 0 || day === 6;  // Sunday = 0, Saturday = 6
  
  if (isWeekend) {
    return { isOver: false, message: "" };  // Skip check on weekends
  }
  
  // Same as daily check
}
```

#### 4. Weekend Limit (`"Weekend"`)

```typescript
if (amplop.tipe_batas === "Weekend") {
  const day = today.getDay();
  const isWeekend = day === 0 || day === 6;
  
  if (!isWeekend) {
    return { isOver: false, message: "" };  // Skip check on weekdays
  }
  
  // Same as daily check
}
```

### Overbudget Warning Example

```typescript
const result = BudgetService.checkOverbudget("Food", 100000, envelopes, transactions);

if (result.isOver) {
  const confirmProceed = window.confirm(
    `${result.message}\n\nLimit: ${BudgetService.formatRupiah(result.limit!)}\n` +
    `Terpakai: ${BudgetService.formatRupiah(result.limit! - result.sisaLimit!)}\n` +
    `Sisa: ${BudgetService.formatRupiah(result.sisaLimit!)}\n` +
    `Kelebihan: ${BudgetService.formatRupiah(result.overAmount!)}\n\n` +
    `Tetap lanjutkan?`
  );
  
  if (!confirmProceed) {
    return;  // Cancel transaction
  }
}
```

---

## 📄 exportService - PDF & Excel Generation

Location: [src/services/exportService.ts](../fatpig-web/src/services/exportService.ts)

### Overview

Generate financial reports in PDF and Excel formats.

### API

#### `exportPDF(transaksiList, periode, userNama)`

Generate PDF report with transaction table.

**Parameters:**
- `transaksiList` - Array of transactions
- `periode` - Report period (e.g., "Desember 2025")
- `userNama` - User's name

**Example:**
```typescript
import { ExportService } from '@/services/exportService';

const transactions = [/* ... */];

ExportService.exportPDF(
  transactions,
  "Desember 2025",
  "John Doe"
);

// Downloads: Laporan_FATpig_2025-12-28.pdf
```

**PDF Structure:**

```
┌─────────────────────────────────────────────┐
│ Laporan Keuangan - FATpig                   │
│                                             │
│ User: John Doe                              │
│ Periode: Desember 2025                      │
│ Dicetak: 28/12/2025 10:30:00                │
│                                             │
│ ┌───────────────────────────────────────┐  │
│ │ Tanggal | Kategori | Keterangan | ... │  │
│ │ 28/12   | Food     | Lunch       | ... │  │
│ │ 27/12   | Transport| Taxi        | ... │  │
│ └───────────────────────────────────────┘  │
│                                             │
│ Total Pemasukan: Rp 5.000.000               │
│ Total Pengeluaran: Rp 2.500.000             │
│ Surplus/Defisit: Rp 2.500.000               │
└─────────────────────────────────────────────┘
```

**Implementation Details:**

```typescript
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const doc = new jsPDF();

// 1. Header
doc.setFontSize(18);
doc.text(`Laporan Keuangan - FATpig`, 14, 20);

// 2. Table
autoTable(doc, {
  startY: 50,
  head: [["Tanggal", "Kategori", "Keterangan", "Pemasukan", "Pengeluaran"]],
  body: tableData,
  theme: "grid",
  headStyles: { fillColor: [55, 48, 163] },  // Purple
});

// 3. Footer (after table)
const finalY = (doc as any).lastAutoTable.finalY + 10;
doc.text(`Total Pemasukan: ${formatRupiah(totalMasuk)}`, 14, finalY);

// 4. Download
doc.save(`Laporan_FATpig_${date}.pdf`);
```

---

#### `exportExcel(transaksiList)`

Generate Excel file with transaction data.

**Example:**
```typescript
ExportService.exportExcel(transactions);
// Downloads: Laporan_FATpig_2025-12-28.xlsx
```

**Excel Structure:**

| Tanggal | Jam | Keterangan | Kategori | Tipe | Nominal | AkunID |
|---------|-----|------------|----------|------|---------|--------|
| 28/12/2025 | 10:30:00 | Lunch | Food | pengeluaran | 45000 | 1 |
| 27/12/2025 | 18:00:00 | Taxi | Transport | pengeluaran | 50000 | 2 |

**Implementation:**

```typescript
import * as XLSX from "xlsx";

// 1. Format data
const dataToExport = transaksiList.map((t) => ({
  Tanggal: new Date(t.created_at).toLocaleDateString("id-ID"),
  Jam: new Date(t.created_at).toLocaleTimeString("id-ID"),
  Keterangan: t.keterangan,
  Kategori: t.kategori,
  Tipe: t.tipe,
  Nominal: t.nominal,
  AkunID: t.rekening_id,
}));

// 2. Create worksheet
const worksheet = XLSX.utils.json_to_sheet(dataToExport);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Transaksi");

// 3. Download
XLSX.writeFile(workbook, `Laporan_FATpig_${date}.xlsx`);
```

---

## 🔄 sisaLimitService - Envelope Limit Management

Location: [src/services/sisaLimitService.ts](../fatpig-web/src/services/sisaLimitService.ts)

### Overview

Manages envelope limit resets and "Sisa Amplop" accumulation logic. This service checks server-side cron job history to determine if limits need resetting.

### Database Schema

```sql
CREATE TABLE user_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  tipe VARCHAR(50),  -- e.g., "Limit Reset Harian"
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API

#### `getLastResetHistoryEntry(userId, resetType)`

Get last reset history for a specific limit type.

**Parameters:**
- `userId` - User UUID
- `resetType` - "Harian" | "Mingguan" | "Weekday" | "Weekend"

**Returns:** Last reset date or null

**Example:**
```typescript
import { SisaLimitService } from '@/services/sisaLimitService';

const lastReset = await SisaLimitService.getLastResetHistoryEntry(
  userId,
  "Harian"
);

if (lastReset) {
  console.log("Last daily reset:", lastReset);
}
```

---

#### `canResetLimit(limitType, limitSetDate)`

Check if enough time has passed to reset limit.

**Logic:**

| Limit Type | Reset Condition |
|------------|----------------|
| **Harian** | Different day |
| **Mingguan** | Different week (Monday) |
| **Weekday** | Different weekday |
| **Weekend** | Different weekend day |

**Example:**
```typescript
const canReset = SisaLimitService.canResetLimit(
  "Harian",
  "2025-12-27T10:00:00Z"
);

if (canReset) {
  // Trigger limit reset
  await resetLimits();
}
```

### Server-Side Cron Job

Location: [supabase/migrations/001_sisa_accumulation_cron.sql](../fatpig-web/supabase/migrations/001_sisa_accumulation_cron.sql)

**Purpose:** Automatically reset envelope limits and accumulate remainders.

**Schedule:**
- Runs **every midnight** (00:00 UTC)
- Checks all envelopes with limits
- Calculates spent vs limit
- Creates "Sisa-*" envelopes for remainders

**Logic:**
```sql
-- Simplified pseudo-code
FOR EACH envelope WITH limit DO
  spent = SUM(transactions WHERE kategori = envelope.kategori)
  sisa = envelope.batas_nominal - spent
  
  IF sisa > 0 THEN
    INSERT INTO pos_anggaran (kategori, jumlah, is_sisa_amplop)
    VALUES ('Sisa-' || envelope.kategori, sisa, TRUE)
  END IF
  
  -- Update limit_set_date
  UPDATE pos_anggaran SET limit_set_date = NOW()
END FOR
```

### Client-Side Integration

```typescript
useEffect(() => {
  const checkLimitResets = async () => {
    const envelopes = await fetchEnvelopes();
    
    for (const envelope of envelopes) {
      if (envelope.tipe_batas !== "Tidak Ada") {
        const canReset = SisaLimitService.canResetLimit(
          envelope.tipe_batas,
          envelope.limit_set_date
        );
        
        if (canReset) {
          // Show notification or trigger manual reset
          console.log(`Limit ${envelope.kategori} perlu direset`);
        }
      }
    }
  };
  
  checkLimitResets();
}, []);
```

---

## 🔄 Service Integration Example

Complete example of using multiple services together:

```typescript
// Transaction creation with AI + Overbudget check
const handleCreateTransaction = async (userInput: string) => {
  try {
    // 1. Parse with AI
    const aiResult = await AIService.parseTransaction(
      userInput,
      categories
    );
    
    // 2. Check overbudget
    const overbudgetCheck = BudgetService.checkOverbudget(
      aiResult.kategori,
      aiResult.nominal,
      envelopes,
      transactions
    );
    
    if (overbudgetCheck.isOver) {
      const proceed = confirm(overbudgetCheck.message + "\n\nLanjutkan?");
      if (!proceed) return;
    }
    
    // 3. Save to database
    const { data, error } = await supabase
      .from("transaksi")
      .insert({
        user_id: userId,
        keterangan: aiResult.keterangan,
        nominal: aiResult.nominal,
        kategori: aiResult.kategori,
        rekening_id: selectedAccountId,
        tipe: aiResult.tipe,
        created_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    alert("Transaksi berhasil!");
    
  } catch (error) {
    console.error(error);
    alert("Gagal membuat transaksi");
  }
};
```

---

## 📚 Next Steps

- See **[REACT_UI_COMPONENTS.md](./REACT_UI_COMPONENTS.md)** for UI patterns
- See **[REACT_TUTORIALS.md](./REACT_TUTORIALS.md)** for implementation guides
- See **[REACT_FUTURE_FEATURES.md](./REACT_FUTURE_FEATURES.md)** for Voice & OCR

---

**Build with services! 🐷🛠️**
