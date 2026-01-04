# Implementation Tutorials

Step-by-step guides for implementing key features in FATpig application.

---

## Table of Contents

1. [Add Transaction with AI Parsing](#1-add-transaction-with-ai-parsing)
2. [Create Envelope with Daily Limit](#2-create-envelope-with-daily-limit)
3. [Trigger & Debug Sisa Accumulation](#3-trigger--debug-sisa-accumulation)
4. [Multi-Account Transfer](#4-multi-account-transfer)
5. [Export Filtered Report to PDF](#5-export-filtered-report-to-pdf)
6. [Add New Color Theme](#6-add-new-color-theme)

---

## 1. Add Transaction with AI Parsing

### Objective

Allow users to input transactions using natural language (e.g., "Makan siang 25rb") and automatically parse to structured data.

### Prerequisites

- Google Gemini API key configured
- Categories already exist for user
- Account (rekening) already exists

### Step 1: Setup AI Service

```python
# ai_service.py

import json
import threading
import google.generativeai as genai
from config import GEMINI_API_KEY

# Initialize Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def extract_json(text: str) -> dict | None:
    """Extract JSON from AI response."""
    try:
        start = text.find('{')
        end = text.rfind('}') + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
    except:
        pass
    return None


class TextParserService:

    @staticmethod
    def parse(text: str, kategori_list: list[str], callback) -> None:
        """Parse natural language to transaction data."""

        def run():
            try:
                prompt = f"""Ekstrak data transaksi dari teks: '{text}'.
Kategori tersedia: {', '.join(kategori_list)}.
Response JSON saja: {{"nominal": int, "kategori": str, "keterangan": str}}
- nominal: angka (rb=000, jt=000000)
- kategori: pilih dari yang tersedia
- keterangan: deskripsi singkat"""

                model = genai.GenerativeModel('models/gemini-pro-latest')
                response = model.generate_content(prompt)
                result = extract_json(response.text)

                callback(result if result else {"error": "Gagal parsing"})
            except Exception as e:
                callback({"error": str(e)})

        threading.Thread(target=run, daemon=True).start()
```

### Step 2: Create Transaction Form UI

```python
# In your page file

import flet as ft
from ai_service import TextParserService
from data_service import get_categories, save_transaction, get_accounts
from ui_components import create_input, create_dropdown, create_button, format_rupiah

def build_add_transaction_sheet(page, theme_manager, on_save):
    """Build add transaction bottom sheet."""
    colors = theme_manager.get_colors()
    user_id = get_user_id(page)

    # Get data
    categories = get_categories(user_id)
    accounts = get_accounts(user_id)

    # Form state
    state = {
        "nominal": 0,
        "kategori": categories[0] if categories else "",
        "keterangan": "",
        "rekening_id": accounts[0]["id"] if accounts else None,
        "is_parsing": False,
    }

    # UI References
    ai_input = ft.TextField(
        label="Ketik transaksi (AI)",
        hint_text="Contoh: Makan siang 25rb",
        border_color=colors["BORDER"],
        focused_border_color=colors["ACCENT"],
        border_radius=12,
    )

    nominal_input = ft.TextField(
        label="Nominal",
        prefix_text="Rp ",
        keyboard_type=ft.KeyboardType.NUMBER,
        border_color=colors["BORDER"],
        focused_border_color=colors["ACCENT"],
        border_radius=12,
    )

    kategori_dropdown = ft.Dropdown(
        label="Kategori",
        value=state["kategori"],
        options=[ft.dropdown.Option(cat) for cat in categories],
        border_color=colors["BORDER"],
        border_radius=12,
    )

    keterangan_input = ft.TextField(
        label="Keterangan",
        border_color=colors["BORDER"],
        focused_border_color=colors["ACCENT"],
        border_radius=12,
    )

    rekening_dropdown = ft.Dropdown(
        label="Dari Rekening",
        value=str(state["rekening_id"]) if state["rekening_id"] else None,
        options=[ft.dropdown.Option(str(acc["id"]), acc["nama"]) for acc in accounts],
        border_color=colors["BORDER"],
        border_radius=12,
    )

    status_text = ft.Text("", color=colors["TEXT_SECONDARY"], size=12)

    # AI Parse Handler
    def on_ai_parse(e):
        text = ai_input.value
        if not text:
            return

        status_text.value = "🔄 Parsing dengan AI..."
        status_text.update()

        def on_result(result):
            if "error" in result:
                status_text.value = f"❌ {result['error']}"
            else:
                # Fill form with parsed data
                nominal_input.value = format_rupiah(result["nominal"]).replace("Rp ", "")
                kategori_dropdown.value = result["kategori"]
                keterangan_input.value = result["keterangan"]

                state["nominal"] = result["nominal"]
                state["kategori"] = result["kategori"]
                state["keterangan"] = result["keterangan"]

                status_text.value = f"✅ Parsed: {format_rupiah(result['nominal'])} - {result['kategori']}"

            nominal_input.update()
            kategori_dropdown.update()
            keterangan_input.update()
            status_text.update()

        TextParserService.parse(text, categories, on_result)

    # Save Handler
    def on_submit(e):
        # Get values from form
        nominal_text = nominal_input.value.replace(".", "").replace(" ", "")
        nominal = int(nominal_text) if nominal_text.isdigit() else 0

        if nominal <= 0:
            status_text.value = "❌ Nominal harus lebih dari 0"
            status_text.update()
            return

        result = save_transaction(
            user_id=user_id,
            keterangan=keterangan_input.value or "Transaksi",
            nominal=nominal,
            kategori=kategori_dropdown.value,
            rekening_id=int(rekening_dropdown.value) if rekening_dropdown.value else None
        )

        if result.get("success"):
            on_save()  # Callback to refresh parent
            page.close_bottom_sheet()
        else:
            status_text.value = f"❌ {result.get('message', 'Gagal menyimpan')}"
            status_text.update()

    # Build sheet content
    return ft.BottomSheet(
        content=ft.Container(
            content=ft.Column([
                ft.Text("Tambah Transaksi", size=20, weight=ft.FontWeight.BOLD, color=colors["TEXT"]),
                ft.Divider(color=colors["BORDER"]),

                # AI Input Section
                ft.Row([
                    ft.Container(ai_input, expand=True),
                    ft.IconButton(
                        icon=ft.Icons.AUTO_AWESOME,
                        icon_color=colors["ACCENT"],
                        tooltip="Parse dengan AI",
                        on_click=on_ai_parse,
                    ),
                ]),
                status_text,

                ft.Divider(color=colors["BORDER"]),

                # Manual Form
                nominal_input,
                kategori_dropdown,
                keterangan_input,
                rekening_dropdown,

                ft.Container(height=16),

                create_button(
                    text="Simpan Transaksi",
                    colors=colors,
                    icon=ft.Icons.SAVE,
                    expand=True,
                    on_click=on_submit,
                ),
            ], spacing=12, scroll=ft.ScrollMode.AUTO),
            padding=20,
            bgcolor=colors["SURFACE"],
        ),
        open=True,
    )
```

### Step 3: Integrate with Dashboard

```python
# In dashboard_page.py

def build_dashboard(page, theme_manager):
    colors = theme_manager.get_colors()

    def refresh_data():
        # Rebuild dashboard
        page.controls.clear()
        build_dashboard(page, theme_manager)
        page.update()

    def show_add_transaction():
        sheet = build_add_transaction_sheet(page, theme_manager, on_save=refresh_data)
        page.show_bottom_sheet(sheet)

    # FAB Button
    fab = ft.FloatingActionButton(
        icon=ft.Icons.ADD,
        bgcolor=colors["ACCENT"],
        on_click=lambda e: show_add_transaction(),
    )

    page.floating_action_button = fab
    # ... rest of dashboard
```

### Expected Output

```
User input: "Makan siang warteg 25rb"

AI Parsed result:
{
    "nominal": 25000,
    "kategori": "Makan",
    "keterangan": "Makan siang warteg"
}

Form auto-filled and ready to save.
```

---

## 2. Create Envelope with Daily Limit

### Objective

Create a budget envelope with automatic daily limit calculation.

### Prerequisites

- User logged in
- Category exists

### Step 1: Understand Limit Calculation

```python
# The auto-limit formula
def hitung_limit_otomatis(jumlah: int, tipe_batas: str) -> int:
    """
    jumlah = 600000 (envelope balance)
    tipe_batas = "Harian"

    Today: Dec 26
    Days left in Dec: 6 (26, 27, 28, 29, 30, 31)

    Daily limit = 600000 / 6 = 100000
    """
    today = datetime.now()
    last_day = get_last_day_of_month(today)
    remaining_days = (last_day - today).days + 1

    if tipe_batas == "Harian":
        return jumlah // max(remaining_days, 1)
    # ... other types
```

### Step 2: Create Envelope Form

```python
# budget_page.py

def build_add_envelope_form(page, theme_manager, on_save):
    """Build form to create new envelope."""
    colors = theme_manager.get_colors()
    user_id = get_user_id(page)
    categories = get_categories(user_id)

    # Form fields
    kategori_dropdown = ft.Dropdown(
        label="Kategori",
        options=[ft.dropdown.Option(cat) for cat in categories],
        border_radius=12,
    )

    jumlah_input = ft.TextField(
        label="Alokasi Dana",
        prefix_text="Rp ",
        keyboard_type=ft.KeyboardType.NUMBER,
        on_change=on_jumlah_change,  # Auto-format
        border_radius=12,
    )

    tipe_batas_dropdown = ft.Dropdown(
        label="Tipe Limit",
        value="Tidak Ada",
        options=[
            ft.dropdown.Option("Tidak Ada"),
            ft.dropdown.Option("Harian"),
            ft.dropdown.Option("Mingguan"),
            ft.dropdown.Option("Weekday"),
            ft.dropdown.Option("Weekend"),
        ],
        on_change=lambda e: update_limit_preview(),
        border_radius=12,
    )

    limit_preview = ft.Text("", size=12, color=colors["TEXT_SECONDARY"])

    def update_limit_preview():
        """Show calculated limit preview."""
        jumlah_text = jumlah_input.value.replace(".", "").replace(" ", "")
        jumlah = int(jumlah_text) if jumlah_text.isdigit() else 0
        tipe = tipe_batas_dropdown.value

        if tipe == "Tidak Ada" or jumlah == 0:
            limit_preview.value = ""
        else:
            # Calculate preview
            limit = hitung_limit_otomatis(jumlah, tipe)
            period_label = {
                "Harian": "per hari",
                "Mingguan": "per minggu",
                "Weekday": "per weekday",
                "Weekend": "per weekend",
            }
            limit_preview.value = f"💡 Limit: {format_rupiah(limit)} {period_label[tipe]}"

        limit_preview.update()

    def on_jumlah_change(e):
        # Auto-format number
        text = e.control.value
        digits = ''.join(filter(str.isdigit, text))
        if digits:
            formatted = f"{int(digits):,}".replace(",", ".")
            if e.control.value != formatted:
                e.control.value = formatted
                e.control.update()
        update_limit_preview()

    def on_submit(e):
        kategori = kategori_dropdown.value
        jumlah_text = jumlah_input.value.replace(".", "")
        jumlah = int(jumlah_text) if jumlah_text.isdigit() else 0
        tipe_batas = tipe_batas_dropdown.value

        if not kategori:
            show_error("Pilih kategori")
            return

        if jumlah <= 0:
            show_error("Masukkan jumlah alokasi")
            return

        # Save envelope
        result = save_envelope(
            user_id=user_id,
            kategori=kategori,
            jumlah=jumlah,
            tipe_batas=tipe_batas
        )

        if result.get("success"):
            on_save()
        else:
            show_error(result.get("message"))

    return ft.Column([
        ft.Text("Buat Amplop Baru", size=18, weight=ft.FontWeight.BOLD),
        kategori_dropdown,
        jumlah_input,
        tipe_batas_dropdown,
        limit_preview,
        ft.Container(height=12),
        create_button("Simpan", colors, on_click=on_submit, expand=True),
    ], spacing=12)
```

### Step 3: Database Operation

```python
# data_service.py

def save_envelope(user_id: int, kategori: str, jumlah: int, tipe_batas: str) -> dict:
    """
    Save envelope with auto-calculated limit.
    """
    try:
        # This calls BudgetService.upsert which:
        # 1. Calculates batas_nominal via hitung_limit_otomatis
        # 2. Sets limit_set_date if first time setting limit
        # 3. Inserts or updates pos_anggaran record

        BudgetService.upsert(
            user_id=user_id,
            kategori=kategori,
            jumlah=jumlah,
            tipe_batas=tipe_batas
        )

        return {"success": True}
    except Exception as e:
        return {"success": False, "message": str(e)}
```

### Expected Output

```
Input:
- Kategori: Makan
- Alokasi: Rp 600.000
- Tipe Limit: Harian

Preview shows: "💡 Limit: Rp 100.000 per hari"

Saved to database:
- kategori: "Makan"
- jumlah: 600000
- batas_nominal: 100000
- tipe_batas: "Harian"
- limit_set_date: "2024-12-26T..."
```

---

## 3. Trigger & Debug Sisa Accumulation

### Objective

Understand how Sisa Amplop accumulation works and how to debug it.

### Step 1: Manual Trigger

```python
# Accumulation is automatically called on login, but can be triggered manually

from database import SisaLimitService

def trigger_accumulation(user_id: int) -> dict:
    """
    Manually trigger accumulation for debugging.
    """
    result = SisaLimitService.proses_akumulasi_all(user_id)
    return result
```

### Step 2: View Accumulation History

```python
# data_service.py

def get_accumulation_history(user_id: int, kategori: str = None) -> list:
    """
    Get accumulation log for debugging.
    """
    return SisaLimitService.get_history(user_id, kategori, limit=50)

# Usage
history = get_accumulation_history(user_id, "Makan")
for log in history:
    print(f"""
    Date: {log['tanggal']}
    Category: {log['kategori']}
    Type: {log['tipe_limit']}
    Limit: {log['batas_harian']}
    Spent: {log['total_pakai']}
    Sisa: {log['sisa']} {'(underspent)' if log['sisa'] > 0 else '(overspent)'}
    """)
```

### Step 3: Debug Accumulation Flow

```python
# database.py - Add debug logging

def proses_akumulasi_harian_debug(user_id: int) -> dict:
    """
    Process daily accumulation with detailed debug output.
    """
    results = {
        "processed": [],
        "skipped": [],
        "errors": [],
    }

    today = datetime.now().date()
    envelopes = get_amplop_with_limit(user_id)

    print(f"=== Accumulation Debug for User {user_id} ===")
    print(f"Today: {today}")
    print(f"Envelopes with limit: {len(envelopes)}")

    for envelope in envelopes:
        if envelope['tipe_batas'] not in ["Harian", "Weekday", "Weekend"]:
            continue

        kategori = envelope['kategori']
        tipe = envelope['tipe_batas']
        limit = envelope['batas_nominal']
        limit_set_date = envelope.get('limit_set_date')

        print(f"\n--- Processing: {kategori} ---")
        print(f"Type: {tipe}, Limit: {limit}")
        print(f"Limit set date: {limit_set_date}")

        for days_ago in range(1, 8):  # Last 7 days for debug
            check_date = today - timedelta(days=days_ago)

            # Skip checks
            if limit_set_date:
                limit_date = limit_set_date.date() if hasattr(limit_set_date, 'date') else limit_set_date
                if check_date < limit_date:
                    print(f"  {check_date}: SKIP - before limit_set_date")
                    continue

            if is_already_processed(user_id, kategori, check_date, tipe):
                print(f"  {check_date}: SKIP - already processed")
                continue

            # Day type check
            is_weekday = check_date.weekday() < 5
            if tipe == "Weekday" and not is_weekday:
                print(f"  {check_date}: SKIP - not a weekday")
                continue
            if tipe == "Weekend" and is_weekday:
                print(f"  {check_date}: SKIP - not a weekend")
                continue

            # Calculate spending
            spent = get_spending_on_date(user_id, kategori, check_date)
            sisa = limit - spent

            print(f"  {check_date}: Limit={limit}, Spent={spent}, Sisa={sisa}")

            # Process
            if sisa > 0:
                print(f"    → Underspent: Main -{sisa}, Sisa +{sisa}")
                # kurangi_amplop_utama(user_id, kategori, sisa)
                # transfer_ke_sisa_amplop(user_id, kategori, sisa)
            elif sisa < 0:
                print(f"    → Overspent: Sisa {sisa}, Main +{abs(sisa)}")
                # transfer_ke_sisa_amplop(user_id, kategori, sisa)
                # tambah_amplop_utama(user_id, kategori, abs(sisa))
            else:
                print(f"    → Exact spend, no change")

            results["processed"].append({
                "date": check_date,
                "kategori": kategori,
                "sisa": sisa,
            })

    return results
```

### Step 4: Fix Common Issues

```python
# Issue 1: Accumulation not running
# Check: limit_set_date must be set

def check_envelope_setup(user_id: int, kategori: str):
    envelope = BudgetService.get_by_kategori(user_id, kategori)

    print(f"Envelope: {kategori}")
    print(f"  tipe_batas: {envelope.get('tipe_batas')}")
    print(f"  batas_nominal: {envelope.get('batas_nominal')}")
    print(f"  limit_set_date: {envelope.get('limit_set_date')}")

    if envelope.get('tipe_batas') == "Tidak Ada":
        print("  ❌ No limit set - accumulation won't run")
    elif not envelope.get('limit_set_date'):
        print("  ❌ limit_set_date not set - need to update envelope")
    else:
        print("  ✅ Ready for accumulation")


# Issue 2: Double processing
# Check: sisa_limit_log for duplicates

def check_duplicate_logs(user_id: int, kategori: str, date: str):
    logs = supabase.table('sisa_limit_log')\
        .select('*')\
        .eq('user_id', user_id)\
        .eq('kategori', kategori)\
        .eq('tanggal', date)\
        .execute()

    if len(logs.data) > 1:
        print(f"⚠️ Duplicate logs found: {len(logs.data)}")
        for log in logs.data:
            print(f"  ID: {log['id']}, Sisa: {log['sisa']}")


# Issue 3: Wrong Sisa amount
# Verify with manual calculation

def verify_sisa_calculation(user_id: int, kategori: str, date: str):
    # Get envelope
    envelope = BudgetService.get_by_kategori(user_id, kategori)
    limit = envelope['batas_nominal']

    # Get spending on date
    spent = get_spending_on_date(user_id, kategori, date)

    # Get logged sisa
    log = supabase.table('sisa_limit_log')\
        .select('*')\
        .eq('user_id', user_id)\
        .eq('kategori', kategori)\
        .eq('tanggal', date)\
        .single()\
        .execute()

    logged_sisa = log.data['sisa'] if log.data else "NOT LOGGED"
    calculated_sisa = limit - spent

    print(f"Date: {date}")
    print(f"Limit: {limit}")
    print(f"Spent: {spent}")
    print(f"Calculated Sisa: {calculated_sisa}")
    print(f"Logged Sisa: {logged_sisa}")

    if logged_sisa != "NOT LOGGED" and logged_sisa != calculated_sisa:
        print("⚠️ MISMATCH!")
```

---

## 4. Multi-Account Transfer

### Objective

Transfer money between accounts (e.g., Cash → SeaBank).

### Step 1: Transfer Service

```python
# database.py - MultiRekeningService

@staticmethod
def transfer(user_id: int, dari_id: int, ke_id: int,
             nominal: int, keterangan: str = "") -> dict:
    """
    Transfer between accounts.
    """
    try:
        # Get source account
        source = MultiRekeningService.get_by_id(dari_id)
        if not source:
            return {"success": False, "message": "Rekening asal tidak ditemukan"}

        # Check balance
        if source['saldo'] < nominal:
            return {"success": False, "message": "Saldo tidak cukup"}

        # Get destination account
        dest = MultiRekeningService.get_by_id(ke_id)
        if not dest:
            return {"success": False, "message": "Rekening tujuan tidak ditemukan"}

        # Perform transfer
        MultiRekeningService.kurangi_saldo(dari_id, nominal)
        MultiRekeningService.tambah_saldo(ke_id, nominal)

        # Log transfer
        supabase.table('transfer_rekening').insert({
            "user_id": user_id,
            "dari_rekening_id": dari_id,
            "ke_rekening_id": ke_id,
            "nominal": nominal,
            "keterangan": keterangan,
        }).execute()

        return {"success": True}

    except Exception as e:
        return {"success": False, "message": str(e)}
```

### Step 2: Transfer Form UI

```python
# settings_page.py or separate transfer_page.py

def build_transfer_form(page, theme_manager, on_success):
    """Build transfer between accounts form."""
    colors = theme_manager.get_colors()
    user_id = get_user_id(page)
    accounts = get_accounts(user_id)

    if len(accounts) < 2:
        return ft.Text("Butuh minimal 2 rekening untuk transfer", color=colors["TEXT"])

    # Form state
    dari_dropdown = ft.Dropdown(
        label="Dari Rekening",
        options=[
            ft.dropdown.Option(str(acc["id"]), f"{acc['nama']} ({format_rupiah(acc['saldo'])})")
            for acc in accounts
        ],
        border_radius=12,
    )

    ke_dropdown = ft.Dropdown(
        label="Ke Rekening",
        options=[
            ft.dropdown.Option(str(acc["id"]), acc["nama"])
            for acc in accounts
        ],
        border_radius=12,
    )

    nominal_input = ft.TextField(
        label="Nominal Transfer",
        prefix_text="Rp ",
        keyboard_type=ft.KeyboardType.NUMBER,
        border_radius=12,
    )

    keterangan_input = ft.TextField(
        label="Keterangan (opsional)",
        border_radius=12,
    )

    status_text = ft.Text("", size=12)

    def on_submit(e):
        dari_id = dari_dropdown.value
        ke_id = ke_dropdown.value

        if not dari_id or not ke_id:
            status_text.value = "❌ Pilih rekening asal dan tujuan"
            status_text.color = colors["DANGER"]
            status_text.update()
            return

        if dari_id == ke_id:
            status_text.value = "❌ Rekening asal dan tujuan harus berbeda"
            status_text.color = colors["DANGER"]
            status_text.update()
            return

        nominal_text = nominal_input.value.replace(".", "").replace(" ", "")
        nominal = int(nominal_text) if nominal_text.isdigit() else 0

        if nominal <= 0:
            status_text.value = "❌ Masukkan nominal transfer"
            status_text.color = colors["DANGER"]
            status_text.update()
            return

        # Execute transfer
        result = transfer_account(
            user_id=user_id,
            dari_id=int(dari_id),
            ke_id=int(ke_id),
            nominal=nominal,
            keterangan=keterangan_input.value
        )

        if result.get("success"):
            status_text.value = "✅ Transfer berhasil!"
            status_text.color = colors["SUCCESS"]
            status_text.update()
            on_success()
        else:
            status_text.value = f"❌ {result.get('message')}"
            status_text.color = colors["DANGER"]
            status_text.update()

    return ft.Container(
        content=ft.Column([
            ft.Text("Transfer Antar Rekening", size=18, weight=ft.FontWeight.BOLD, color=colors["TEXT"]),
            ft.Divider(color=colors["BORDER"]),
            dari_dropdown,
            ft.Icon(ft.Icons.ARROW_DOWNWARD, color=colors["TEXT_SECONDARY"]),
            ke_dropdown,
            nominal_input,
            keterangan_input,
            status_text,
            ft.Container(height=12),
            create_button("Transfer", colors, icon=ft.Icons.SEND, expand=True, on_click=on_submit),
        ], spacing=12),
        padding=20,
        bgcolor=colors["SURFACE"],
        border_radius=16,
    )
```

### Step 3: Data Service Bridge

```python
# data_service.py

def transfer_account(user_id: int, dari_id: int, ke_id: int,
                     nominal: int, keterangan: str = "") -> dict:
    """
    Transfer money between accounts.
    """
    return MultiRekeningService.transfer(
        user_id=user_id,
        dari_id=dari_id,
        ke_id=ke_id,
        nominal=nominal,
        keterangan=keterangan
    )


def get_transfer_history(user_id: int) -> list:
    """
    Get transfer history with account names.
    """
    transfers = MultiRekeningService.get_transfer_history(user_id)
    accounts = {acc["id"]: acc["nama"] for acc in get_accounts(user_id)}

    for t in transfers:
        t["dari_nama"] = accounts.get(t["dari_rekening_id"], "Unknown")
        t["ke_nama"] = accounts.get(t["ke_rekening_id"], "Unknown")

    return transfers
```

---

## 5. Export Filtered Report to PDF

### Objective

Export transactions within a date range to PDF file.

### Step 1: Date Range Picker

```python
# transactions_page.py

def build_export_section(page, theme_manager, user_id):
    """Build export controls with date picker."""
    colors = theme_manager.get_colors()

    # Date state
    state = {
        "start_date": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d"),
        "end_date": datetime.now().strftime("%Y-%m-%d"),
    }

    start_button = ft.ElevatedButton(
        text=f"Dari: {state['start_date']}",
        icon=ft.Icons.CALENDAR_TODAY,
        on_click=lambda e: show_date_picker("start"),
    )

    end_button = ft.ElevatedButton(
        text=f"Sampai: {state['end_date']}",
        icon=ft.Icons.CALENDAR_TODAY,
        on_click=lambda e: show_date_picker("end"),
    )

    def show_date_picker(field):
        def on_pick(e):
            if e.data:
                date_str = e.data.split("T")[0]
                state[f"{field}_date"] = date_str

                if field == "start":
                    start_button.text = f"Dari: {date_str}"
                    start_button.update()
                else:
                    end_button.text = f"Sampai: {date_str}"
                    end_button.update()

        page.open(ft.DatePicker(on_change=on_pick))

    def on_export_pdf(e):
        export_to_pdf(
            user_id=user_id,
            start_date=state["start_date"],
            end_date=state["end_date"],
            page=page
        )

    def on_export_excel(e):
        export_to_excel(
            user_id=user_id,
            start_date=state["start_date"],
            end_date=state["end_date"],
            page=page
        )

    return ft.Column([
        ft.Text("Export Laporan", size=16, weight=ft.FontWeight.BOLD, color=colors["TEXT"]),
        ft.Row([start_button, end_button], spacing=12),
        ft.Row([
            ft.ElevatedButton(
                "Export PDF",
                icon=ft.Icons.PICTURE_AS_PDF,
                bgcolor=colors["DANGER"],
                color="#FFFFFF",
                on_click=on_export_pdf,
            ),
            ft.ElevatedButton(
                "Export Excel",
                icon=ft.Icons.TABLE_CHART,
                bgcolor=colors["SUCCESS"],
                color="#FFFFFF",
                on_click=on_export_excel,
            ),
        ], spacing=12),
    ], spacing=12)
```

### Step 2: Export Functions

```python
# data_service.py

import base64
from export_service import ExportService
from database import TransaksiService

def export_to_pdf(user_id: int, start_date: str, end_date: str, page: ft.Page):
    """
    Export transactions to PDF and trigger download.
    """
    # Get user name
    user = get_user_session(page)
    user_name = user.get("nama", "User") if user else "User"

    # Get export data
    data = TransaksiService.get_export_data(user_id, start_date, end_date)
    data["user_name"] = user_name

    if not data["transactions"]:
        show_snackbar(page, "Tidak ada transaksi di periode ini", "warning")
        return

    # Generate PDF bytes
    pdf_bytes = ExportService.export_pdf_bytes(data)

    # Trigger download
    b64 = base64.b64encode(pdf_bytes).decode()
    filename = f"FATpig_Report_{start_date}_to_{end_date}.pdf"

    # For web: use data URL
    page.launch_url(
        f"data:application/pdf;base64,{b64}",
        web_window_name="_blank"
    )

    show_snackbar(page, "PDF berhasil dibuat!", "success")


def export_to_excel(user_id: int, start_date: str, end_date: str, page: ft.Page):
    """
    Export transactions to Excel and trigger download.
    """
    user = get_user_session(page)
    user_name = user.get("nama", "User") if user else "User"

    data = TransaksiService.get_export_data(user_id, start_date, end_date)
    data["user_name"] = user_name

    if not data["transactions"]:
        show_snackbar(page, "Tidak ada transaksi di periode ini", "warning")
        return

    excel_bytes = ExportService.export_excel_bytes(data)

    b64 = base64.b64encode(excel_bytes).decode()

    page.launch_url(
        f"data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,{b64}",
        web_window_name="_blank"
    )

    show_snackbar(page, "Excel berhasil dibuat!", "success")
```

### Step 3: Get Export Data

```python
# database.py - TransaksiService

@staticmethod
def get_export_data(user_id: int, start_date: str, end_date: str) -> dict:
    """
    Get complete data package for export.
    """
    # Get transactions
    transactions = supabase.table('transaksi')\
        .select('*')\
        .eq('user_id', user_id)\
        .gte('created_at', f"{start_date}T00:00:00")\
        .lte('created_at', f"{end_date}T23:59:59")\
        .order('created_at', desc=True)\
        .execute().data

    # Calculate summary
    total = sum(t['nominal'] for t in transactions)

    # Group by category
    by_category = {}
    for t in transactions:
        cat = t['kategori']
        by_category[cat] = by_category.get(cat, 0) + t['nominal']

    by_category_list = [
        {"kategori": k, "total": v}
        for k, v in sorted(by_category.items(), key=lambda x: -x[1])
    ]

    return {
        "transactions": transactions,
        "summary": {
            "total": total,
            "count": len(transactions),
        },
        "by_category": by_category_list,
        "period": {
            "start": start_date,
            "end": end_date,
        },
    }
```

---

## 6. Add New Color Theme

### Objective

Add a new color theme (e.g., "Red/Merah") to the application.

### Step 1: Define Theme Colors

```python
# theme_manager.py

# Add to THEMES dictionary
THEMES = {
    # ... existing themes ...

    "merah": {
        "name": "Red",
        "PRIMARY": "#B91C1C",      # Red 700
        "ACCENT": "#EF4444",       # Red 500
        "GLOW": "#F87171",         # Red 400
        "GRADIENT_LIGHT": ("#EF4444", "#DC2626"),
        "GRADIENT_DARK": ("#B91C1C", "#991B1B"),
    },
}
```

### Step 2: Create Theme Preview

```python
# Add to theme selector in settings

def build_theme_selector(theme_manager, colors):
    """Build theme color picker."""
    options = theme_manager.get_theme_options()

    def on_select(theme_id):
        def handler(e):
            theme_manager.set_theme(theme_id)
        return handler

    theme_circles = []
    for opt in options:
        is_selected = opt["id"] == theme_manager.theme

        circle = ft.Container(
            width=48,
            height=48,
            border_radius=24,
            bgcolor=opt["color"],
            border=ft.border.all(
                3 if is_selected else 1,
                colors["TEXT"] if is_selected else colors["BORDER"]
            ),
            content=ft.Icon(
                ft.Icons.CHECK,
                color="#FFFFFF",
                size=20,
            ) if is_selected else None,
            alignment=ft.alignment.center,
            on_click=on_select(opt["id"]),
            tooltip=opt["name"],
        )
        theme_circles.append(circle)

    return ft.Column([
        ft.Text("Tema Warna", size=16, weight=ft.FontWeight.BOLD, color=colors["TEXT"]),
        ft.Row(theme_circles, spacing=12, wrap=True),
    ], spacing=12)
```

### Step 3: Persist Theme Choice

```python
# When user selects theme, save to database too

def update_user_theme(page, theme_manager, theme_id):
    """Update theme in UI and database."""
    # Update ThemeManager (saves to client storage)
    theme_manager.set_theme(theme_id)

    # Update database
    user_id = get_user_id(page)
    if user_id:
        UserService.set_tema(user_id, theme_id)

    # Update session
    update_user_session(page, {"tema": theme_id})
```

### Step 4: Apply on Login

```python
# In login flow, apply user's saved theme

def on_login_success(page, user):
    # Get user's theme preference from database
    tema = user.get("tema", "ungu")
    dark_mode = user.get("dark_mode", False)

    # Apply to theme manager
    theme_manager = ThemeManager(page)
    theme_manager.set_theme(tema)
    theme_manager.set_mode("dark" if dark_mode else "light")
    theme_manager.apply_to_page()
```

### Step 5: Full Theme Colors Reference

```python
# Complete theme with all color variations

"merah": {
    "name": "Red",

    # Brand colors
    "PRIMARY": "#B91C1C",      # Main brand - Red 700
    "ACCENT": "#EF4444",       # Highlight - Red 500
    "GLOW": "#F87171",         # Glow effect - Red 400

    # Gradients
    "GRADIENT_LIGHT": ("#EF4444", "#DC2626"),  # Red 500 → 600
    "GRADIENT_DARK": ("#B91C1C", "#991B1B"),   # Red 700 → 800

    # For consistency with other themes:
    # - PRIMARY: Used for headers, important elements
    # - ACCENT: Used for buttons, links, interactive elements
    # - GLOW: Used for shadows, glows, hover effects
},
```

### Expected Result

After adding the theme:

1. Theme appears in settings theme selector
2. Clicking selects and applies immediately
3. Persists across sessions (client storage)
4. Syncs to database for cross-device
5. All UI elements use new colors

---

## Quick Reference

### Common Patterns

```python
# Get current user
user_id = get_user_id(page)

# Get theme colors
colors = theme_manager.get_colors()

# Show snackbar
snackbar.success("Saved!")
snackbar.error("Failed!")

# Refresh page
page.controls.clear()
build_page(page)
page.update()

# Format money
format_rupiah(25000)  # "Rp 25.000"

# Parse money
parse_number("25.000")  # 25000
```

### Service Call Pattern

```python
# Always handle success/failure
result = some_service_call()
if result.get("success"):
    # Handle success
    show_success_message()
    refresh_data()
else:
    # Handle failure
    show_error(result.get("message", "Unknown error"))
```

### Async AI Call Pattern

```python
# AI services use callbacks
def on_ai_result(result):
    if "error" in result:
        handle_error(result["error"])
    else:
        handle_success(result)

TextParserService.parse(text, categories, on_ai_result)
# Code continues immediately, result comes via callback
```

---

_Back to [README.md](README.md) - Documentation Index_
