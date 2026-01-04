# FATpig Developer Documentation

> **F**inancial **A**llocation **T**racker with **P**ersonal **I**ntelligence **G**ateway

A comprehensive personal finance application with envelope budgeting, AI-powered transaction input, and multi-platform support.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Documentation Index](#documentation-index)
6. [Changelog](#changelog)

---

## Quick Start

### Prerequisites

- Python 3.11+
- Supabase account (PostgreSQL database)
- Google Gemini API key (for AI features)
- Brevo account (for email OTP)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd fatpig

# Choose platform directory
cd web/  # or android/ or windows/

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables (see below)

# Run application
python main.py  # or main_refactored.py for android/windows
```

### First Run Checklist

1. ✅ Set all required environment variables
2. ✅ Ensure Supabase tables are created (see [DATABASE_API.md](DATABASE_API.md))
3. ✅ Test database connection
4. ✅ Run application on port 8000 (web) or as desktop app

---

## Technology Stack

| Layer            | Technology    | Version           | Purpose                              |
| ---------------- | ------------- | ----------------- | ------------------------------------ |
| **UI Framework** | Flet          | ≥0.21.0           | Python UI framework (Flutter-based)  |
| **Database**     | Supabase      | ≥2.0.0            | PostgreSQL cloud database            |
| **AI**           | Google Gemini | gemini-pro-latest | Natural language transaction parsing |
| **Auth**         | bcrypt        | ≥4.0.0            | Password hashing                     |
| **Email**        | Brevo API     | -                 | OTP email delivery                   |
| **Export**       | ReportLab     | ≥4.0.0            | PDF generation                       |
| **Export**       | OpenPyXL      | ≥3.1.0            | Excel generation                     |
| **HTTP**         | httpx         | ≥0.27.0           | Async HTTP client                    |
| **Server**       | uvicorn       | ≥0.30.0           | ASGI server (web only)               |

### Why Flet?

Flet enables building multi-platform apps (Web, Android, Windows, iOS) from a single Python codebase with Flutter's Material Design components.

---

## Project Structure

```
fatpig/
├── docs/                    # 📚 Developer documentation (you are here)
│
├── web/                     # 🌐 Web deployment version
│   ├── main.py              # Entry point (uvicorn server)
│   ├── database.py          # All Supabase services (~2,800 lines)
│   ├── ai_service.py        # Gemini AI integration
│   ├── export_service.py    # PDF/Excel export
│   ├── email_service.py     # Brevo OTP emails
│   ├── data_service.py      # UI-Database bridge layer
│   ├── theme_manager.py     # Theme & dark mode management
│   ├── ui_components.py     # Reusable UI components
│   └── config.py            # Configuration constants
│
├── android/                 # 📱 Android APK build
│   ├── main_refactored.py   # Entry point (~3,900 lines)
│   └── ...                  # Same services as web/
│
├── windows/                 # 🖥️ Windows EXE build
│   ├── main_refactored.py   # Entry point
│   └── ...                  # Same services as web/
│
├── fatpig-flet/             # 🆕 New modular architecture
│   ├── main.py              # Clean entry point
│   ├── components/          # Reusable UI components
│   │   ├── account_card.py
│   │   ├── envelope_card.py
│   │   ├── bottom_nav.py
│   │   └── glass.py
│   ├── pages/               # Page views
│   │   ├── dashboard_page.py
│   │   ├── transactions_page.py
│   │   ├── budget_page.py
│   │   └── settings_page.py
│   └── utils/               # Utilities
│       ├── formatters.py
│       └── mock_data.py
│
└── src/                     # 📝 Original React source & conversion docs
    ├── components/          # React components (reference)
    └── *.md                 # Conversion guides
```

### Platform Relationship

| Aspect             | Description                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------- |
| **Code Sharing**   | Service files (`database.py`, `ai_service.py`, etc.) are manually synced across platforms |
| **UI Code**        | Platform-specific adjustments in main entry files                                         |
| **Build Process**  | Flet CLI: `flet build apk`, `flet build windows`, `flet run --web`                        |
| **Feature Parity** | All platforms share identical features                                                    |

---

## Environment Variables

### Required Variables

| Variable       | Required | Description              | Example                   |
| -------------- | -------- | ------------------------ | ------------------------- |
| `SUPABASE_URL` | ✅ Yes   | Supabase project URL     | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | ✅ Yes   | Supabase anon/public key | `eyJhbGciOiJIUzI1NiIs...` |

### Optional Variables (Feature-Dependent)

| Variable             | Required For   | Description                 |
| -------------------- | -------------- | --------------------------- |
| `GEMINI_API_KEY`     | AI features    | Google Gemini API key       |
| `BREVO_API_KEY`      | Email OTP      | Brevo (Sendinblue) API key  |
| `BREVO_SENDER_EMAIL` | Email OTP      | Sender email address        |
| `BREVO_SENDER_NAME`  | Email OTP      | Sender display name         |
| `PORT`               | Web deployment | Server port (default: 8000) |

### Setting Environment Variables

**Windows (PowerShell):**

```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_KEY = "your-anon-key"
$env:GEMINI_API_KEY = "your-gemini-key"
```

**Linux/Mac:**

```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-anon-key"
export GEMINI_API_KEY="your-gemini-key"
```

**Docker:**

```dockerfile
ENV SUPABASE_URL=https://your-project.supabase.co
ENV SUPABASE_KEY=your-anon-key
```

---

## Documentation Index

| Document                               | Description                     | Key Topics                                     |
| -------------------------------------- | ------------------------------- | ---------------------------------------------- |
| [DATABASE_API.md](DATABASE_API.md)     | Database schema & API reference | ERD, 8 tables, 100+ method signatures          |
| [BUSINESS_LOGIC.md](BUSINESS_LOGIC.md) | Core business algorithms        | Free balance, limits, Sisa Amplop accumulation |
| [AI_EXPORT_API.md](AI_EXPORT_API.md)   | AI & export services            | Gemini prompts, PDF/Excel generation           |
| [AUTHENTICATION.md](AUTHENTICATION.md) | Authentication system           | Login, register, OTP, session management       |
| [UI_COMPONENTS.md](UI_COMPONENTS.md)   | UI layer documentation          | Theme manager, glass cards, formatters         |
| [TUTORIALS.md](TUTORIALS.md)           | Implementation tutorials        | 6 step-by-step feature guides                  |

---

## Changelog

### Version History

#### v1.3.0 (December 2024) - Multi-Platform Release

- ✅ Android APK build support (~54MB per APK)
- ✅ Windows EXE build support
- ✅ Web deployment to Koyeb
- ✅ iOS support via Apple Shortcuts integration
- ✅ Docker containerization

#### v1.2.0 (November 2024) - Sisa Amplop Fix

- 🐛 **BREAKING**: Fixed double-counting in Sisa Amplop logic
- 🐛 Fixed overbudget not refunding to main envelope
- 🐛 Fixed `hitung_uang_bebas()` to include Sisa envelopes
- ✅ Added `adjust_data_lama()` migration function
- ✅ Added `limit_set_date` field for accurate accumulation start

**Migration Required:** Run `SisaLimitService.adjust_data_lama(user_id)` for existing users.

#### v1.1.0 (October 2024) - Limit System

- ✅ Added envelope limit types: Harian, Mingguan, Weekday, Weekend
- ✅ Added automatic limit calculation based on remaining period
- ✅ Added Sisa Amplop (remaining envelope) accumulation
- ✅ Added overbudget warnings with force-continue option
- ✅ Added daily/weekly accumulation processing

#### v1.0.0 (September 2024) - Initial Release

- ✅ Multi-rekening (multi-account) system
- ✅ Envelope budgeting (Amplop)
- ✅ Transaction management
- ✅ Google Gemini AI text parsing
- ✅ Voice input (desktop only)
- ✅ Receipt OCR
- ✅ PDF & Excel export
- ✅ Email OTP authentication
- ✅ 5 color themes with dark/light mode

### Breaking Changes Log

| Version | Change                                          | Migration                    |
| ------- | ----------------------------------------------- | ---------------------------- |
| v1.2.0  | Sisa Amplop now reduces main envelope           | Run `adjust_data_lama()`     |
| v1.1.0  | Added `limit_set_date` column to `pos_anggaran` | Add column with NULL default |

---

## Support & Contributing

### Reporting Issues

When reporting bugs, please include:

1. Platform (Web/Android/Windows)
2. Python version
3. Flet version
4. Error message/traceback
5. Steps to reproduce

### Development Guidelines

1. Follow existing code style (PEP 8)
2. Add JSDoc-style docstrings to new functions
3. Update relevant documentation
4. Test on all platforms before submitting

---

## License

This project is proprietary software developed by Thinnur (Fathin).

---

_Last updated: December 2024_
