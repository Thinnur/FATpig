# FATpig React - Financial Tracker Application

> **Modern Web Application for Personal Financial Management**  
> Built with React, TypeScript, Supabase, and Tailwind CSS

---

## 📖 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Development](#development)
- [Build & Deploy](#build--deploy)
- [Related Documentation](#related-documentation)

---

## 🎯 Overview

**FATpig React** is a comprehensive personal finance management web application that helps users track expenses, manage multiple accounts, create budget envelopes, and analyze spending patterns using AI-powered transaction parsing.

This is the **React/TypeScript version** of FATpig, built for modern web browsers with a responsive, glassmorphism-inspired UI and real-time database synchronization.

### Why FATpig React?

- 💰 **Multi-Account Management** - Track cash, bank accounts, and e-wallets separately
- 📊 **Smart Budget Envelopes (Amplop)** - Allocate funds with flexible limits (daily, weekly, weekday/weekend)
- 🤖 **AI Transaction Parsing** - Use Google Gemini to parse natural language transactions
- 📈 **Real-Time Analytics** - View safe-to-spend amounts and spending patterns instantly
- 🎨 **Beautiful UI** - 5 color themes with dark mode support
- 📱 **Fully Responsive** - Desktop sidebar + mobile bottom navigation
- 🔒 **Secure** - Supabase authentication with session management

---

## ✨ Key Features

### Financial Management
- ✅ Multi-account tracking (cash, bank, e-wallet)
- ✅ Budget envelope system with custom limits
- ✅ Transaction categorization
- ✅ Safe-to-spend calculation (Free Balance)
- ✅ Overbudget warnings before saving transactions
- ✅ Account-to-account transfers
- ✅ Sisa Amplop (envelope remainder) accumulation

### AI & Automation
- ✅ Natural language transaction parsing with Google Gemini 2.5 Flash
- ✅ Automatic category detection
- ✅ Server-side cron jobs for envelope limit resets

### Export & Reporting
- ✅ PDF export with jsPDF + autotable
- ✅ Excel export with xlsx (SheetJS)
- ✅ Customizable report periods

### UI & UX
- ✅ 5 color themes (purple, green, blue, pink, orange)
- ✅ Dark mode with system preference detection
- ✅ Glassmorphism design language
- ✅ Responsive layout (mobile-first)
- ✅ Smooth animations with Framer Motion
- ✅ 1000+ Lucide icons

---

## 🛠 Tech Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework |
| **TypeScript** | ~5.9 | Type safety |
| **Vite** | 7.2.5 (rolldown) | Build tool & dev server |

### State & Routing
| Technology | Version | Purpose |
|------------|---------|---------|
| **Zustand** | 5.0.9 | Global state management |
| **React Router** | 7.11.0 | Client-side routing |

### Backend & Database
| Technology | Version | Purpose |
|------------|---------|---------|
| **Supabase JS** | 2.89.0 | PostgreSQL database + Auth |

### AI & Data Processing
| Technology | Version | Purpose |
|------------|---------|---------|
| **Google Generative AI** | 0.24.1 | Gemini model for transaction parsing |
| **date-fns** | 4.1.0 | Date manipulation |

### UI & Styling
| Technology | Version | Purpose |
|------------|---------|---------|
| **Tailwind CSS** | 3.4.19 | Utility-first CSS framework |
| **Framer Motion** | 12.23.26 | Animations |
| **Lucide React** | 0.562.0 | Icon library |
| **clsx / tailwind-merge** | Latest | Conditional class merging |

### Export
| Technology | Version | Purpose |
|------------|---------|---------|
| **jsPDF** | 3.0.4 | PDF generation |
| **jspdf-autotable** | 5.0.2 | PDF table formatting |
| **xlsx** | 0.18.5 | Excel generation |

---

## 📋 Prerequisites

Before installing FATpig React, ensure you have:

1. **Node.js** - v18 or higher (LTS recommended)
   ```bash
   node --version  # Should be v18.x.x or higher
   ```

2. **npm** or **pnpm** or **yarn**
   ```bash
   npm --version   # Comes with Node.js
   ```

3. **Supabase Account** (free tier works)
   - Create a project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key

4. **Google AI Studio API Key** (free tier available)
   - Get your key at [ai.google.dev](https://ai.google.dev)

---

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/fatpig-react.git
cd fatpig-react/fatpig-web
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
# or
yarn install
```

### 3. Set Up Environment Variables
Create a `.env` file in the `fatpig-web` directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key-here

# Google AI (Gemini) Configuration
VITE_GEMINI_API_KEY=your-gemini-api-key-here
```

> **⚠️ Important:** Never commit the `.env` file to version control!

### 4. Set Up Database Schema
Run the Supabase migrations (see [REACT_DATABASE_API.md](./REACT_DATABASE_API.md) for schema details):

```sql
-- Execute in Supabase SQL Editor
-- See supabase/migrations/ folder for migration scripts
```

### 5. Start Development Server
```bash
npm run dev
```

The app will run at `http://localhost:5173`

---

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | ✅ Yes |
| `VITE_SUPABASE_KEY` | Supabase anon/public key | ✅ Yes |
| `VITE_GEMINI_API_KEY` | Google AI Studio API key for Gemini | ✅ Yes |

### How to Get These Values:

**Supabase:**
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project → Settings → API
3. Copy "Project URL" and "anon public" key

**Gemini API:**
1. Visit [ai.google.dev/aistudio](https://ai.google.dev/aistudio)
2. Click "Get API Key"
3. Create a new API key

---

## 📂 Project Structure

```
fatpig-web/
├── public/
│   └── manifest.json              # PWA manifest
├── src/
│   ├── components/
│   │   ├── budget/                # Budget-related components
│   │   ├── layout/
│   │   │   └── AppLayout.tsx      # Main app layout with sidebar/navbar
│   │   └── ui/
│   │       └── GlassCard.tsx      # Reusable glassmorphism card
│   ├── hooks/                     # Custom React hooks
│   ├── lib/
│   │   └── supabase.ts            # Supabase client setup
│   ├── pages/
│   │   ├── Dashboard.tsx          # Home dashboard
│   │   ├── Transaksi.tsx          # Transaction management
│   │   ├── Anggaran.tsx           # Budget/envelope management
│   │   ├── Pengaturan.tsx         # Settings page
│   │   ├── Login.tsx              # Login page
│   │   └── Register.tsx           # Registration page
│   ├── services/
│   │   ├── aiService.ts           # Google Gemini integration
│   │   ├── budgetService.ts       # Budget calculations
│   │   ├── exportService.ts       # PDF/Excel export
│   │   └── sisaLimitService.ts    # Envelope limit logic
│   ├── store/
│   │   ├── themeStore.ts          # Theme & dark mode state (Zustand)
│   │   └── uiStore.ts             # UI state (navbar visibility)
│   ├── types/
│   │   └── database.ts            # TypeScript interfaces
│   ├── utils/                     # Utility functions
│   ├── App.tsx                    # Root component with routing
│   ├── main.tsx                   # Entry point
│   └── index.css                  # Tailwind imports
├── supabase/
│   └── migrations/                # Database migration scripts
├── .env                           # Environment variables (DO NOT COMMIT)
├── package.json                   # Dependencies
├── tailwind.config.js             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
└── vite.config.ts                 # Vite configuration
```

---

## 🧑‍💻 Development

### Available Scripts

```bash
# Start dev server with hot reload
npm run dev

# Type-check TypeScript
npm run build  # (includes tsc -b check)

# Run ESLint
npm run lint

# Preview production build locally
npm run preview
```

### Development Tips

1. **Hot Module Replacement (HMR)** is enabled by default
2. Use **React DevTools** for debugging components
3. Check **Supabase Dashboard** → Table Editor for data inspection
4. View **Network tab** to debug Supabase API calls
5. Use **console.log** in services for AI debugging

---

## 📦 Build & Deploy

### Build for Production
```bash
npm run build
```
Output: `dist/` folder

### Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Or use Vercel Dashboard:
1. Import GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Deploy to Other Platforms
- **Netlify**: Drag & drop `dist/` folder
- **GitHub Pages**: Use `gh-pages` package
- **Self-hosted**: Serve `dist/` with nginx/Apache

---

## 📚 Related Documentation

- **[REACT_DATABASE_API.md](./REACT_DATABASE_API.md)** - Database schema & TypeScript types
- **[REACT_AUTHENTICATION.md](./REACT_AUTHENTICATION.md)** - Supabase auth implementation
- **[REACT_SERVICES.md](./REACT_SERVICES.md)** - Service layer documentation
- **[REACT_UI_COMPONENTS.md](./REACT_UI_COMPONENTS.md)** - Component API & theming
- **[REACT_TUTORIALS.md](./REACT_TUTORIALS.md)** - Step-by-step implementation guides
- **[REACT_VS_PYTHON.md](./REACT_VS_PYTHON.md)** - React vs Python/Flet comparison
- **[REACT_FUTURE_FEATURES.md](./REACT_FUTURE_FEATURES.md)** - Voice & OCR (coming soon)

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Supabase** for backend infrastructure
- **Google Gemini** for AI capabilities
- **Tailwind CSS** for beautiful styling
- **Lucide** for amazing icons

---

**Happy Budgeting! 🐷💰**
