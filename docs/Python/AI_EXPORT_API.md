# AI Service & Export API Reference

Complete documentation for AI-powered transaction parsing and report export services.

---

## Table of Contents

1. [AI Service Overview](#1-ai-service-overview)
2. [TextParserService](#2-textparserservice)
3. [VoiceService](#3-voiceservice)
4. [VisionService](#4-visionservice)
5. [AIAssistant Class](#5-aiassistant-class)
6. [Export Service](#6-export-service)
7. [Email Service](#7-email-service)

---

## 1. AI Service Overview

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AIAssistant                          │
│  (High-level wrapper with state management)             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ TextParser  │  │   Voice     │  │   Vision    │     │
│  │  Service    │  │  Service    │  │  Service    │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          │                              │
│                          ▼                              │
│              ┌───────────────────┐                      │
│              │   Google Gemini   │                      │
│              │   (gemini-pro)    │                      │
│              └───────────────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Configuration

```python
# config.py
import os
import google.generativeai as genai

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Initialize Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('models/gemini-pro-latest')
```

### Common Output Format

All AI parsing services return the same JSON structure:

```python
{
    "nominal": int,       # Amount in Rupiah (e.g., 25000)
    "kategori": str,      # Matched category name (e.g., "Makan")
    "keterangan": str     # Transaction description (e.g., "Makan siang warteg")
}
```

---

## 2. TextParserService

Natural language text parsing to transaction data.

### Class Definition

```python
class TextParserService:
    """
    Parses free-form Indonesian text into structured transaction data.
    Uses Google Gemini for natural language understanding.

    Location: ai_service.py
    """
```

### Methods

#### `parse`

```python
@staticmethod
def parse(text: str, kategori_list: list[str], callback: Callable[[dict], None]) -> None:
    """
    Parse natural language text to transaction data.

    @param {str} text - Natural language input
        Examples:
        - "Makan siang 25rb"
        - "Gojek ke kantor 15.000"
        - "Beli kopi starbucks lima puluh ribu"
        - "Transport grab 32k"

    @param {list[str]} kategori_list - Available categories for matching
        Example: ["Makan", "Transport", "Belanja", "Hiburan", "Lainnya"]

    @param {Callable} callback - Function called with result
        Signature: callback(result: dict) -> None
        Result format: {"nominal": int, "kategori": str, "keterangan": str}
        On error: {"error": str}

    @returns {None} - Result via callback (async operation)

    @example
    def handle_result(result):
        if "error" in result:
            print(f"Error: {result['error']}")
        else:
            print(f"Amount: Rp {result['nominal']:,}")
            print(f"Category: {result['kategori']}")
            print(f"Description: {result['keterangan']}")

    TextParserService.parse(
        text="Makan siang warteg 25rb",
        kategori_list=["Makan", "Transport", "Belanja"],
        callback=handle_result
    )
    # Output:
    # Amount: Rp 25,000
    # Category: Makan
    # Description: Makan siang warteg
    """
```

### Gemini Prompt

```python
PARSE_PROMPT = """Ekstrak data transaksi dari teks berikut: '{text}'.

Kategori yang tersedia: {categories}.

Berikan response dalam format JSON saja: {{"nominal": int, "kategori": str, "keterangan": str}}

Rules:
- nominal: jumlah uang dalam angka (konversi rb=000, jt=000000, k=000)
- kategori: pilih dari kategori yang tersedia yang paling sesuai
- keterangan: deskripsi transaksi yang jelas dan ringkas

Contoh konversi:
- "25rb" -> 25000
- "1.5jt" -> 1500000
- "50k" -> 50000
- "lima puluh ribu" -> 50000

Contoh output:
- "Makan siang 25rb" -> {{"nominal": 25000, "kategori": "Makan", "keterangan": "Makan siang"}}
- "Gojek ke kantor 15.000" -> {{"nominal": 15000, "kategori": "Transport", "keterangan": "Gojek ke kantor"}}
- "Beli baju 200rb" -> {{"nominal": 200000, "kategori": "Belanja", "keterangan": "Beli baju"}}
"""
```

### Implementation

```python
import threading
import json
import google.generativeai as genai

class TextParserService:

    @staticmethod
    def parse(text: str, kategori_list: list[str], callback: Callable[[dict], None]) -> None:

        def run():
            try:
                # Build prompt
                prompt = f"""Ekstrak data transaksi dari teks berikut: '{text}'.
Kategori yang tersedia: {', '.join(kategori_list)}.
Berikan response dalam format JSON saja: {{"nominal": int, "kategori": str, "keterangan": str}}
- nominal: jumlah uang dalam angka (konversi rb=000, jt=000000)
- kategori: pilih dari kategori yang tersedia yang paling sesuai
- keterangan: deskripsi transaksi yang jelas

Contoh:
- "Makan siang 25rb" -> {{"nominal": 25000, "kategori": "Makan", "keterangan": "Makan siang"}}
- "Gojek ke kantor 15.000" -> {{"nominal": 15000, "kategori": "Transport", "keterangan": "Gojek ke kantor"}}"""

                # Call Gemini
                model = genai.GenerativeModel('models/gemini-pro-latest')
                response = model.generate_content(prompt)

                # Extract JSON from response
                result = extract_json(response.text)

                if result:
                    callback(result)
                else:
                    callback({"error": "Gagal parsing response AI"})

            except Exception as e:
                callback({"error": str(e)})

        # Run in background thread
        threading.Thread(target=run, daemon=True).start()
```

### JSON Extraction Utility

```python
def extract_json(text: str) -> dict | None:
    """
    Extract JSON object from AI response that may contain extra text.

    @param {str} text - AI response text
    @returns {dict|None} Parsed JSON or None if not found

    @example
    text = "Here's the transaction data: {\"nominal\": 25000, \"kategori\": \"Makan\"}"
    result = extract_json(text)
    # {"nominal": 25000, "kategori": "Makan"}
    """
    try:
        # Find JSON boundaries
        start = text.find('{')
        end = text.rfind('}') + 1

        if start != -1 and end > start:
            json_str = text[start:end]
            return json.loads(json_str)
    except json.JSONDecodeError:
        pass

    return None
```

---

## 3. VoiceService

Voice input recognition and transaction parsing.

### Class Definition

```python
class VoiceService:
    """
    Processes voice input via microphone and parses to transaction.
    Uses SpeechRecognition library + Google Gemini.

    Note: Not available on web platform (requires microphone access).

    Location: ai_service.py
    """
```

### Methods

#### `is_available`

```python
@staticmethod
def is_available() -> bool:
    """
    Check if voice service is available on current platform.

    @returns {bool} True if microphone and speech recognition available

    @note Returns False on web platform

    @example
    if VoiceService.is_available():
        show_voice_button()
    else:
        hide_voice_button()
    """
```

#### `process`

```python
@staticmethod
def process(kategori_list: list[str], callback: Callable[[dict], None]) -> None:
    """
    Record voice input and parse to transaction data.

    @param {list[str]} kategori_list - Available categories for matching
    @param {Callable} callback - Function called with result
        Signature: callback(result: dict) -> None

    @returns {None} - Result via callback

    @flow
    1. Start microphone recording
    2. Listen for speech (with timeout)
    3. Convert speech to text (Google Speech Recognition)
    4. Parse text with TextParserService
    5. Return result via callback

    @callback_results
    Success: {"nominal": int, "kategori": str, "keterangan": str, "raw_text": str}
    Error: {"error": str}

    @example
    def handle_voice(result):
        if "error" in result:
            show_error(result["error"])
        else:
            print(f"You said: {result['raw_text']}")
            print(f"Parsed: Rp {result['nominal']:,} for {result['kategori']}")

    VoiceService.process(
        kategori_list=["Makan", "Transport"],
        callback=handle_voice
    )
    """
```

### Implementation

```python
import speech_recognition as sr

class VoiceService:

    @staticmethod
    def is_available() -> bool:
        try:
            import speech_recognition
            # Check if running on web
            import flet as ft
            return ft.Page is not None  # Will fail proper check on web
        except:
            return False

    @staticmethod
    def process(kategori_list: list[str], callback: Callable[[dict], None]) -> None:

        def run():
            try:
                recognizer = sr.Recognizer()

                with sr.Microphone() as source:
                    # Adjust for ambient noise
                    recognizer.adjust_for_ambient_noise(source, duration=0.5)

                    # Listen with timeout
                    audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)

                # Convert speech to text
                text = recognizer.recognize_google(audio, language="id-ID")

                # Parse with TextParserService
                def inner_callback(result):
                    result["raw_text"] = text
                    callback(result)

                TextParserService.parse(text, kategori_list, inner_callback)

            except sr.WaitTimeoutError:
                callback({"error": "Tidak ada suara terdeteksi"})
            except sr.UnknownValueError:
                callback({"error": "Tidak dapat mengenali ucapan"})
            except Exception as e:
                callback({"error": str(e)})

        threading.Thread(target=run, daemon=True).start()
```

---

## 4. VisionService

Receipt/image OCR and transaction parsing.

### Class Definition

```python
class VisionService:
    """
    Processes receipt/struk images and extracts transaction data.
    Uses Google Gemini Vision for OCR and parsing.

    Location: ai_service.py
    """
```

### Methods

#### `process_image`

```python
@staticmethod
def process_image(image_path: str, kategori_list: list[str],
                  callback: Callable[[dict], None]) -> None:
    """
    Process receipt image and extract transaction data.

    @param {str} image_path - Path to image file
        Supported formats: JPG, PNG, WEBP

    @param {list[str]} kategori_list - Available categories for matching

    @param {Callable} callback - Function called with result
        Signature: callback(result: dict) -> None

    @returns {None} - Result via callback

    @callback_results
    Success: {"nominal": int, "kategori": str, "keterangan": str}
    Error: {"error": str}

    @example
    def handle_image(result):
        if "error" in result:
            show_error(result["error"])
        else:
            print(f"Receipt total: Rp {result['nominal']:,}")
            print(f"Category: {result['kategori']}")

    VisionService.process_image(
        image_path="/path/to/receipt.jpg",
        kategori_list=["Makan", "Belanja"],
        callback=handle_image
    )
    """
```

### Gemini Vision Prompt

```python
VISION_PROMPT = """Analisis struk/receipt ini dan ekstrak informasi transaksi.

Kategori yang tersedia: {categories}.

Berikan response dalam format JSON saja: {{"nominal": int, "kategori": str, "keterangan": str}}

Rules:
- nominal: total harga/pembayaran (angka saja tanpa Rp atau titik)
- kategori: pilih dari kategori yang tersedia yang paling sesuai
- keterangan: deskripsi singkat pembelian (nama toko + item utama)

Contoh output:
- Struk Indomaret -> {{"nominal": 45000, "kategori": "Belanja", "keterangan": "Belanja Indomaret"}}
- Struk McD -> {{"nominal": 75000, "kategori": "Makan", "keterangan": "McD Paket Hemat"}}
- Struk SPBU -> {{"nominal": 100000, "kategori": "Transport", "keterangan": "BBM Pertamax"}}
"""
```

### Implementation

```python
from PIL import Image
import google.generativeai as genai

class VisionService:

    @staticmethod
    def process_image(image_path: str, kategori_list: list[str],
                      callback: Callable[[dict], None]) -> None:

        def run():
            try:
                # Load image
                image = Image.open(image_path)

                # Build prompt
                prompt = f"""Analisis struk/receipt ini dan ekstrak informasi transaksi.
Kategori yang tersedia: {', '.join(kategori_list)}.
Berikan response dalam format JSON saja: {{"nominal": int, "kategori": str, "keterangan": str}}
- nominal: total harga/pembayaran (angka saja tanpa Rp)
- kategori: pilih dari kategori yang tersedia yang paling sesuai
- keterangan: deskripsi singkat pembelian"""

                # Call Gemini Vision
                model = genai.GenerativeModel('models/gemini-pro-vision')
                response = model.generate_content([prompt, image])

                # Extract JSON
                result = extract_json(response.text)

                if result:
                    callback(result)
                else:
                    callback({"error": "Gagal membaca struk"})

            except Exception as e:
                callback({"error": str(e)})

        threading.Thread(target=run, daemon=True).start()
```

---

## 5. AIAssistant Class

High-level wrapper with state management for AI services.

### Class Definition

```python
class AIAssistant:
    """
    High-level AI assistant that manages state during processing.
    Provides unified interface for text, voice, and image parsing.

    Location: ai_service.py

    @attributes
    - is_processing: bool - Whether AI is currently processing
    """
```

### Constructor

```python
def __init__(self):
    """
    Initialize AIAssistant.

    @example
    assistant = AIAssistant()
    """
    self.is_processing: bool = False
```

### Methods

#### `process_text`

```python
def process_text(self, text: str, kategori_list: list[str],
                 callback: Callable[[dict], None]) -> None:
    """
    Process text input with state management.

    @param {str} text - Natural language input
    @param {list[str]} kategori_list - Available categories
    @param {Callable} callback - Result callback

    @note Sets is_processing=True during operation

    @example
    assistant = AIAssistant()

    def on_result(result):
        print(f"Processing done: {result}")
        print(f"Is processing: {assistant.is_processing}")  # False

    assistant.process_text("Makan 25rb", ["Makan"], on_result)
    print(f"Is processing: {assistant.is_processing}")  # True
    """
```

#### `process_voice`

```python
def process_voice(self, kategori_list: list[str],
                  callback: Callable[[dict], None]) -> None:
    """
    Process voice input with state management.

    @param {list[str]} kategori_list - Available categories
    @param {Callable} callback - Result callback

    @note
    - Sets is_processing=True during operation
    - Returns error if VoiceService not available
    """
```

#### `process_image`

```python
def process_image(self, image_path: str, kategori_list: list[str],
                  callback: Callable[[dict], None]) -> None:
    """
    Process image input with state management.

    @param {str} image_path - Path to receipt image
    @param {list[str]} kategori_list - Available categories
    @param {Callable} callback - Result callback

    @note Sets is_processing=True during operation
    """
```

### Implementation

```python
class AIAssistant:

    def __init__(self):
        self.is_processing = False

    def process_text(self, text: str, kategori_list: list[str],
                     callback: Callable[[dict], None]) -> None:
        self.is_processing = True

        def wrapped_callback(result):
            self.is_processing = False
            callback(result)

        TextParserService.parse(text, kategori_list, wrapped_callback)

    def process_voice(self, kategori_list: list[str],
                      callback: Callable[[dict], None]) -> None:
        if not VoiceService.is_available():
            callback({"error": "Voice input tidak tersedia"})
            return

        self.is_processing = True

        def wrapped_callback(result):
            self.is_processing = False
            callback(result)

        VoiceService.process(kategori_list, wrapped_callback)

    def process_image(self, image_path: str, kategori_list: list[str],
                      callback: Callable[[dict], None]) -> None:
        self.is_processing = True

        def wrapped_callback(result):
            self.is_processing = False
            callback(result)

        VisionService.process_image(image_path, kategori_list, wrapped_callback)
```

---

## 6. Export Service

PDF and Excel report generation.

### Class Definition

```python
class ExportService:
    """
    Generates PDF and Excel reports from transaction data.

    Location: export_service.py

    Dependencies:
    - reportlab: PDF generation
    - openpyxl: Excel generation
    """
```

### Utility Functions

#### `format_rupiah`

```python
def format_rupiah(amount: int) -> str:
    """
    Format number to Indonesian Rupiah format.

    @param {int} amount - Amount in Rupiah
    @returns {str} Formatted string

    @example
    format_rupiah(1500000)  # "Rp 1.500.000"
    format_rupiah(25000)    # "Rp 25.000"
    """
    return f"Rp {amount:,.0f}".replace(",", ".")
```

#### `format_tanggal`

```python
def format_tanggal(iso_datetime: str) -> str:
    """
    Format ISO datetime to Indonesian date format.

    @param {str} iso_datetime - ISO format datetime
    @returns {str} Formatted date string

    @example
    format_tanggal("2024-12-26T14:30:00")  # "26 Des 2024, 14:30"
    """
    dt = datetime.fromisoformat(iso_datetime)
    months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
              "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    return f"{dt.day} {months[dt.month-1]} {dt.year}, {dt.hour:02d}:{dt.minute:02d}"
```

### Methods

#### `export_pdf`

```python
@staticmethod
def export_pdf(data: dict, output_path: str) -> str:
    """
    Export transaction report to PDF file.

    @param {dict} data - Export data from TransaksiService.get_export_data()
        Structure:
        {
            "transactions": list[dict],
            "summary": {"total": int, "count": int},
            "by_category": list[dict],
            "period": {"start": str, "end": str},
            "user_name": str
        }

    @param {str} output_path - Output file path

    @returns {str} Path to generated PDF file

    @example
    data = TransaksiService.get_export_data(user_id, "2024-12-01", "2024-12-31")
    data["user_name"] = "Fathin"

    pdf_path = ExportService.export_pdf(data, "/tmp/report.pdf")
    print(f"PDF saved to: {pdf_path}")
    """
```

#### `export_excel`

````python
@staticmethod
def export_excel(data: dict, output_path: str) -> str:
    """
    Export transaction report to Excel file.

    @param {dict} data - Export data (same as export_pdf)
    @param {str} output_path - Output file path

    @returns {str} Path to generated Excel file

    @sheets
    - "Transaksi": All transactions with date, description, amount, category
    - "Per Kategori": Summary by category
    - "Ringkasan": Total and period info

    @example
    data = TransaksiService.get_export_data(user_id, "2024-12-01", "2024-12-31")

    excel_path = ExportService.export_excel(data, "/tmp/report.xlsx")
    ```
    """
````

#### `export_pdf_bytes`

```python
@staticmethod
def export_pdf_bytes(data: dict) -> bytes:
    """
    Export report to PDF as bytes (for web download).

    @param {dict} data - Export data
    @returns {bytes} PDF file content

    @example
    pdf_bytes = ExportService.export_pdf_bytes(data)

    # For Flet web download
    page.launch_url(
        f"data:application/pdf;base64,{base64.b64encode(pdf_bytes).decode()}"
    )
    """
```

#### `export_excel_bytes`

```python
@staticmethod
def export_excel_bytes(data: dict) -> bytes:
    """
    Export report to Excel as bytes (for web download).

    @param {dict} data - Export data
    @returns {bytes} Excel file content
    """
```

### PDF Implementation

```python
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from io import BytesIO

class ExportService:

    @staticmethod
    def export_pdf(data: dict, output_path: str) -> str:
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        elements = []
        styles = getSampleStyleSheet()

        # Title
        elements.append(Paragraph(
            f"Laporan Transaksi - {data.get('user_name', 'User')}",
            styles['Title']
        ))
        elements.append(Spacer(1, 12))

        # Period
        elements.append(Paragraph(
            f"Periode: {data['period']['start']} s/d {data['period']['end']}",
            styles['Normal']
        ))
        elements.append(Spacer(1, 20))

        # Transaction table
        table_data = [["Tanggal", "Keterangan", "Kategori", "Nominal"]]

        for t in data['transactions']:
            table_data.append([
                format_tanggal(t['created_at']),
                t['keterangan'],
                t['kategori'],
                format_rupiah(t['nominal'])
            ])

        table = Table(table_data, colWidths=[100, 200, 80, 100])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))

        elements.append(table)
        elements.append(Spacer(1, 20))

        # Summary
        elements.append(Paragraph(
            f"Total: {format_rupiah(data['summary']['total'])} ({data['summary']['count']} transaksi)",
            styles['Heading2']
        ))

        doc.build(elements)
        return output_path

    @staticmethod
    def export_pdf_bytes(data: dict) -> bytes:
        buffer = BytesIO()
        # Same as export_pdf but write to buffer
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        # ... build document ...
        doc.build(elements)
        return buffer.getvalue()
```

### Excel Implementation

```python
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill
from io import BytesIO

class ExportService:

    @staticmethod
    def export_excel(data: dict, output_path: str) -> str:
        wb = Workbook()

        # Sheet 1: Transactions
        ws1 = wb.active
        ws1.title = "Transaksi"

        # Header
        headers = ["Tanggal", "Keterangan", "Kategori", "Nominal"]
        for col, header in enumerate(headers, 1):
            cell = ws1.cell(row=1, column=col, value=header)
            cell.font = Font(bold=True)
            cell.fill = PatternFill(start_color="4472C4", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")

        # Data rows
        for row, t in enumerate(data['transactions'], 2):
            ws1.cell(row=row, column=1, value=format_tanggal(t['created_at']))
            ws1.cell(row=row, column=2, value=t['keterangan'])
            ws1.cell(row=row, column=3, value=t['kategori'])
            ws1.cell(row=row, column=4, value=t['nominal'])

        # Sheet 2: By Category
        ws2 = wb.create_sheet("Per Kategori")
        ws2.cell(row=1, column=1, value="Kategori").font = Font(bold=True)
        ws2.cell(row=1, column=2, value="Total").font = Font(bold=True)

        for row, cat in enumerate(data['by_category'], 2):
            ws2.cell(row=row, column=1, value=cat['kategori'])
            ws2.cell(row=row, column=2, value=cat['total'])

        # Sheet 3: Summary
        ws3 = wb.create_sheet("Ringkasan")
        ws3.cell(row=1, column=1, value="Periode")
        ws3.cell(row=1, column=2, value=f"{data['period']['start']} - {data['period']['end']}")
        ws3.cell(row=2, column=1, value="Total Transaksi")
        ws3.cell(row=2, column=2, value=data['summary']['count'])
        ws3.cell(row=3, column=1, value="Total Pengeluaran")
        ws3.cell(row=3, column=2, value=data['summary']['total'])

        wb.save(output_path)
        return output_path

    @staticmethod
    def export_excel_bytes(data: dict) -> bytes:
        buffer = BytesIO()
        wb = Workbook()
        # ... same as export_excel ...
        wb.save(buffer)
        return buffer.getvalue()
```

---

## 7. Email Service

OTP email delivery via Brevo API.

### Configuration

```python
# config.py
BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
BREVO_SENDER_EMAIL = os.environ.get("BREVO_SENDER_EMAIL", "noreply@fatpig.app")
BREVO_SENDER_NAME = os.environ.get("BREVO_SENDER_NAME", "FATpig App")
```

### Functions

#### `generate_otp`

```python
def generate_otp(length: int = 6) -> str:
    """
    Generate random numeric OTP code.

    @param {int} length - OTP length (default: 6)
    @returns {str} OTP code

    @example
    otp = generate_otp()  # "847293"
    otp = generate_otp(4) # "5821"
    """
    import random
    return ''.join(random.choices('0123456789', k=length))
```

#### `send_otp_email`

```python
def send_otp_email(to_email: str, otp: str, purpose: str = "verification") -> dict:
    """
    Send OTP email via Brevo API.

    @param {str} to_email - Recipient email address
    @param {str} otp - OTP code to send
    @param {str} purpose - Email purpose
        - "verification": New user email verification
        - "reset_password": Password reset request

    @returns {dict} Result with success status

    @returns_format
    Success: {"success": True, "message_id": str}
    Failure: {"success": False, "error": str}

    @example
    otp = generate_otp()
    result = send_otp_email("user@example.com", otp, "verification")

    if result["success"]:
        print("OTP sent successfully")
    else:
        print(f"Failed: {result['error']}")
    """
```

### Implementation

```python
import httpx
from config import BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME

def generate_otp(length: int = 6) -> str:
    import random
    return ''.join(random.choices('0123456789', k=length))


def send_otp_email(to_email: str, otp: str, purpose: str = "verification") -> dict:
    if not BREVO_API_KEY:
        return {"success": False, "error": "BREVO_API_KEY not configured"}

    # Email templates
    templates = {
        "verification": {
            "subject": "Verifikasi Email FATpig",
            "html": f"""
                <h2>Verifikasi Email Anda</h2>
                <p>Kode OTP Anda adalah:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #4F46E5;">{otp}</h1>
                <p>Kode ini berlaku selama 10 menit.</p>
                <p>Jika Anda tidak mendaftar di FATpig, abaikan email ini.</p>
            """
        },
        "reset_password": {
            "subject": "Reset Password FATpig",
            "html": f"""
                <h2>Reset Password</h2>
                <p>Kode OTP untuk reset password:</p>
                <h1 style="font-size: 32px; letter-spacing: 5px; color: #4F46E5;">{otp}</h1>
                <p>Kode ini berlaku selama 10 menit.</p>
                <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
            """
        }
    }

    template = templates.get(purpose, templates["verification"])

    try:
        response = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json"
            },
            json={
                "sender": {
                    "name": BREVO_SENDER_NAME,
                    "email": BREVO_SENDER_EMAIL
                },
                "to": [{"email": to_email}],
                "subject": template["subject"],
                "htmlContent": template["html"]
            },
            timeout=30
        )

        if response.status_code == 201:
            return {"success": True, "message_id": response.json().get("messageId")}
        else:
            return {"success": False, "error": response.text}

    except Exception as e:
        return {"success": False, "error": str(e)}
```

---

## Quick Reference

### AI Service Usage

```python
# Text parsing
TextParserService.parse("Makan 25rb", ["Makan", "Transport"], callback)

# Voice input (desktop only)
if VoiceService.is_available():
    VoiceService.process(["Makan", "Transport"], callback)

# Image/Receipt OCR
VisionService.process_image("/path/to/receipt.jpg", ["Makan"], callback)

# Using AIAssistant wrapper
assistant = AIAssistant()
assistant.process_text("Makan 25rb", ["Makan"], callback)
```

### Export Usage

```python
# Get export data
data = TransaksiService.get_export_data(user_id, "2024-12-01", "2024-12-31")
data["user_name"] = "Fathin"

# Export to files
ExportService.export_pdf(data, "/tmp/report.pdf")
ExportService.export_excel(data, "/tmp/report.xlsx")

# Export as bytes (for web)
pdf_bytes = ExportService.export_pdf_bytes(data)
excel_bytes = ExportService.export_excel_bytes(data)
```

### Email Usage

```python
# Send verification OTP
otp = generate_otp()
UserService.save_otp(user_id, otp)
send_otp_email("user@example.com", otp, "verification")

# Send password reset OTP
otp = generate_otp()
UserService.save_otp(user_id, otp)
send_otp_email("user@example.com", otp, "reset_password")
```

---

_Next: [AUTHENTICATION.md](AUTHENTICATION.md) - Authentication system documentation_
