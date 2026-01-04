# FATpig React - Database API Documentation

> **Complete guide to database schema, TypeScript types, and Supabase query patterns**

---

## 📖 Table of Contents

- [Overview](#overview)
- [Database Schema (ERD)](#database-schema-erd)
- [TypeScript Interfaces](#typescript-interfaces)
- [Supabase Client Setup](#supabase-client-setup)
- [Query Patterns](#query-patterns)
- [Row Level Security (RLS)](#row-level-security-rls)
- [Common Operations](#common-operations)

---

## 🎯 Overview

FATpig React uses **Supabase** (PostgreSQL) as its database with:
- **Built-in authentication** - No custom user table needed
- **Row Level Security (RLS)** - Users can only access their own data
- **Real-time subscriptions** - Optional live updates
- **TypeScript-first** - Strongly typed interfaces

### Key Differences from Python Version
| Aspect | Python Version | React Version |
|--------|----------------|---------------|
| **User ID Type** | `INTEGER` | `UUID` (from Supabase Auth) |
| **Auth Table** | Custom `users` table | `auth.users` (Supabase managed) |
| **ORM** | Direct SQL with Python classes | Supabase JS client |
| **Password Hashing** | bcrypt manually | Handled by Supabase |

---

## 🗂 Database Schema (ERD)

### Tables Overview
1. **`user_profiles`** - Extended user information
2. **`rekening`** - Financial accounts (cash, bank, e-wallet)
3. **`pos_anggaran`** - Budget envelopes (amplop)
4. **`transaksi`** - Transactions (income/expenses)

### Entity Relationship Diagram

```
┌─────────────────────┐
│   auth.users        │  (Managed by Supabase)
│─────────────────────│
│ id (UUID)           │
│ email               │
│ encrypted_password  │
│ created_at          │
└─────────┬───────────┘
          │
          │ 1:1
          ▼
┌─────────────────────┐
│   user_profiles     │
│─────────────────────│
│ id (UUID) PK, FK    │ ◄─┐
│ email               │   │
│ nama                │   │
│ tema                │   │
│ dark_mode           │   │
│ avatar              │   │
│ akumulasi_sisa      │   │
└─────────────────────┘   │
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          │ 1:N           │ 1:N           │ 1:N
          ▼               ▼               ▼
┌─────────────┐  ┌───────────────┐  ┌──────────────┐
│  rekening   │  │ pos_anggaran  │  │  transaksi   │
│─────────────│  │───────────────│  │──────────────│
│ id PK       │  │ id PK         │  │ id PK        │
│ user_id FK  │  │ user_id FK    │  │ user_id FK   │
│ nama        │  │ kategori      │  │ keterangan   │
│ tipe        │  │ jumlah        │  │ nominal      │
│ saldo       │  │ batas_nominal │  │ kategori     │
└─────────────┘  │ tipe_batas    │  │ rekening_id  │
                 │ is_sisa_amplop│  │ tipe         │
                 │ limit_set_date│  │ created_at   │
                 └───────────────┘  └──────────────┘
```

---

## 📝 TypeScript Interfaces

Location: [src/types/database.ts](../fatpig-web/src/types/database.ts)

### 1. UserProfile

```typescript
export interface UserProfile {
  id: string;              // UUID from Supabase Auth
  email: string;
  nama: string;
  tema: "ungu" | "hijau" | "biru" | "pink" | "orange";
  dark_mode: boolean;
  avatar: string;          // URL or emoji
  akumulasi_sisa: boolean; // Enable envelope remainder accumulation
}
```

**Usage:**
```typescript
import type { UserProfile } from '@/types/database';

const profile: UserProfile = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "user@example.com",
  nama: "John Doe",
  tema: "ungu",
  dark_mode: false,
  avatar: "👤",
  akumulasi_sisa: true
};
```

---

### 2. Rekening (Account)

```typescript
export interface Rekening {
  id: number;              // Auto-increment
  user_id: string;         // UUID FK
  nama: string;            // e.g., "BCA Savings", "Cash Wallet"
  tipe: "cash" | "bank" | "ewallet";
  saldo: number;           // Current balance (in IDR)
}
```

**Account Types:**
- `cash` - Physical cash
- `bank` - Bank accounts (BCA, Mandiri, etc.)
- `ewallet` - E-wallets (GoPay, OVO, Dana)

**Example:**
```typescript
const account: Rekening = {
  id: 1,
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  nama: "BCA Savings",
  tipe: "bank",
  saldo: 5000000  // Rp 5,000,000
};
```

---

### 3. PosAnggaran (Budget Envelope)

```typescript
export interface PosAnggaran {
  id: number;
  user_id: string;
  kategori: string;                          // Category name (e.g., "Groceries")
  jumlah: number;                            // Allocated amount
  terpakai?: number;                         // Calculated in frontend (not in DB)
  batas_nominal: number;                     // Spending limit
  tipe_batas: "Tidak Ada" | "Harian" | "Mingguan" | "Weekday" | "Weekend";
  is_sisa_amplop: boolean;                   // Is this a "Sisa-*" envelope?
  limit_set_date: string | null;             // ISO 8601 date when limit was set
}
```

**Limit Types:**
- `"Tidak Ada"` - No limit
- `"Harian"` - Daily limit (resets every day)
- `"Mingguan"` - Weekly limit (resets every Monday)
- `"Weekday"` - Only applies Mon-Fri
- `"Weekend"` - Only applies Sat-Sun

**Example:**
```typescript
const envelope: PosAnggaran = {
  id: 1,
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  kategori: "Groceries",
  jumlah: 2000000,        // Rp 2,000,000 allocated
  batas_nominal: 50000,   // Rp 50,000 daily limit
  tipe_batas: "Harian",
  is_sisa_amplop: false,
  limit_set_date: "2025-12-01T00:00:00Z"
};
```

---

### 4. Transaksi (Transaction)

```typescript
export interface Transaksi {
  id: number;
  user_id: string;
  keterangan: string;                        // Description
  nominal: number;                           // Amount (always positive)
  kategori: string;                          // Must match a PosAnggaran.kategori
  rekening_id: number | null;                // FK to rekening (can be null)
  tipe: "pengeluaran" | "pemasukan";         // Expense or Income
  created_at: string;                        // ISO 8601 timestamp
}
```

**Transaction Types:**
- `"pengeluaran"` - Expense (decreases balance)
- `"pemasukan"` - Income (increases balance)

**Example:**
```typescript
const transaction: Transaksi = {
  id: 1,
  user_id: "550e8400-e29b-41d4-a716-446655440000",
  keterangan: "Lunch at restaurant",
  nominal: 45000,
  kategori: "Food",
  rekening_id: 1,
  tipe: "pengeluaran",
  created_at: "2025-12-28T12:30:00Z"
};
```

---

## 🔌 Supabase Client Setup

Location: [src/lib/supabase.ts](../fatpig-web/src/lib/supabase.ts)

### Basic Setup

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase Environment Variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Environment Variables Required

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_KEY=your-anon-key
```

---

## 🔍 Query Patterns

### SELECT Queries

#### Get All Accounts for Current User
```typescript
const { data: rekening, error } = await supabase
  .from("rekening")
  .select("*")
  .eq("user_id", userId)
  .order("id", { ascending: true });
```

#### Get Single Record by ID
```typescript
const { data: account, error } = await supabase
  .from("rekening")
  .select("*")
  .eq("id", accountId)
  .single();
```

#### Get with Filter
```typescript
const { data: envelopes, error } = await supabase
  .from("pos_anggaran")
  .select("*")
  .eq("user_id", userId)
  .eq("is_sisa_amplop", false);  // Exclude Sisa-* envelopes
```

#### Get Transactions with Date Range
```typescript
const { data: transactions, error } = await supabase
  .from("transaksi")
  .select("*")
  .eq("user_id", userId)
  .gte("created_at", startDate)
  .lte("created_at", endDate)
  .order("created_at", { ascending: false });
```

---

### INSERT Queries

#### Create New Account
```typescript
const { data, error } = await supabase
  .from("rekening")
  .insert({
    user_id: userId,
    nama: "New Account",
    tipe: "bank",
    saldo: 1000000
  })
  .select()
  .single();
```

#### Create Transaction with AI Parsing
```typescript
const aiResult = await AIService.parseTransaction(input, categories);

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
  })
  .select()
  .single();
```

---

### UPDATE Queries

#### Update Account Balance
```typescript
const { error } = await supabase
  .from("rekening")
  .update({ saldo: newBalance })
  .eq("id", accountId);
```

#### Update User Profile Theme
```typescript
const { error } = await supabase
  .from("user_profiles")
  .update({ tema: "hijau", dark_mode: true })
  .eq("id", userId);
```

#### Increment Balance (Atomic)
```typescript
// Not natively supported - must fetch first then update
const { data: account } = await supabase
  .from("rekening")
  .select("saldo")
  .eq("id", accountId)
  .single();

const { error } = await supabase
  .from("rekening")
  .update({ saldo: account.saldo + amount })
  .eq("id", accountId);
```

---

### DELETE Queries

#### Delete Transaction
```typescript
const { error } = await supabase
  .from("transaksi")
  .delete()
  .eq("id", transactionId)
  .eq("user_id", userId);  // RLS ensures ownership
```

#### Delete Envelope (with cascade to Sisa-*)
```typescript
// First delete associated Sisa-* envelope
await supabase
  .from("pos_anggaran")
  .delete()
  .eq("kategori", `Sisa-${categoryName}`)
  .eq("user_id", userId);

// Then delete main envelope
await supabase
  .from("pos_anggaran")
  .delete()
  .eq("id", envelopeId)
  .eq("user_id", userId);
```

---

## 🔒 Row Level Security (RLS)

### Enable RLS on All Tables

```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rekening ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_anggaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaksi ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

#### user_profiles
```sql
-- Users can only view/edit their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

#### rekening
```sql
-- Users can only access their own accounts
CREATE POLICY "Users can manage own accounts"
  ON rekening FOR ALL
  USING (auth.uid() = user_id);
```

#### pos_anggaran
```sql
-- Users can only manage their own budget envelopes
CREATE POLICY "Users can manage own envelopes"
  ON pos_anggaran FOR ALL
  USING (auth.uid() = user_id);
```

#### transaksi
```sql
-- Users can only manage their own transactions
CREATE POLICY "Users can manage own transactions"
  ON transaksi FOR ALL
  USING (auth.uid() = user_id);
```

---

## 💡 Common Operations

### 1. Calculate Total Balance Across All Accounts

```typescript
const { data: accounts } = await supabase
  .from("rekening")
  .select("saldo")
  .eq("user_id", userId);

const totalBalance = accounts?.reduce((sum, acc) => sum + acc.saldo, 0) || 0;
```

### 2. Calculate Total Allocated (Budget Sum)

```typescript
const { data: envelopes } = await supabase
  .from("pos_anggaran")
  .select("jumlah")
  .eq("user_id", userId)
  .eq("is_sisa_amplop", false);

const totalAllocated = envelopes?.reduce((sum, env) => sum + env.jumlah, 0) || 0;
```

### 3. Calculate Safe-to-Spend (Free Balance)

```typescript
const safeToSpend = totalBalance - totalAllocated;
```

### 4. Get Transactions by Month

```typescript
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

const { data: transactions } = await supabase
  .from("transaksi")
  .select("*")
  .eq("user_id", userId)
  .gte("created_at", startOfMonth.toISOString());
```

### 5. Get Spent Amount for Envelope (Daily Limit)

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const { data: transactions } = await supabase
  .from("transaksi")
  .select("nominal")
  .eq("user_id", userId)
  .eq("kategori", categoryName)
  .gte("created_at", today.toISOString());

const spent = transactions?.reduce((sum, t) => sum + t.nominal, 0) || 0;
```

### 6. Transfer Between Accounts

```typescript
// Decrease source account
await supabase
  .from("rekening")
  .update({ saldo: sourceBalance - amount })
  .eq("id", sourceAccountId);

// Increase destination account
await supabase
  .from("rekening")
  .update({ saldo: destBalance + amount })
  .eq("id", destAccountId);

// Record as internal transfer (optional)
await supabase.from("transaksi").insert({
  user_id: userId,
  keterangan: `Transfer to ${destAccountName}`,
  nominal: amount,
  kategori: "Transfer",
  rekening_id: sourceAccountId,
  tipe: "pengeluaran"
});
```

---

## 📚 Next Steps

- See **[REACT_AUTHENTICATION.md](./REACT_AUTHENTICATION.md)** for auth patterns
- See **[REACT_SERVICES.md](./REACT_SERVICES.md)** for business logic
- See **[REACT_TUTORIALS.md](./REACT_TUTORIALS.md)** for implementation guides

---

**Happy Querying! 🐷💾**
