# FATpig React - UI Components & Theming

> **Complete guide to React components, Zustand state management, and the 5-theme design system**

---

## 📖 Table of Contents

- [Overview](#overview)
- [Component Architecture](#component-architecture)
- [AppLayout Component](#applayout-component)
- [GlassCard Component](#glasscard-component)
- [Theme System](#theme-system)
- [State Management (Zustand)](#state-management-zustand)
- [Styling with Tailwind CSS](#styling-with-tailwind-css)
- [Responsive Design](#responsive-design)
- [Animation with Framer Motion](#animation-with-framer-motion)

---

## 🎯 Overview

FATpig React uses a **component-based architecture** with:
- **Tailwind CSS** for utility-first styling
- **Glassmorphism design language** for modern aesthetics
- **5 color themes** (purple, green, blue, pink, orange) + dark mode
- **Zustand** for global state management
- **Framer Motion** for smooth animations

### Design Philosophy

- 🎨 **Glassmorphism** - Translucent backgrounds with backdrop blur
- 🌓 **Dark Mode First** - Full support for light/dark themes
- 📱 **Mobile-First** - Responsive from 320px to 4K screens
- ⚡ **Performance** - Minimal re-renders with Zustand
- ♿ **Accessible** - Semantic HTML and ARIA labels

---

## 🏗 Component Architecture

```
src/components/
├── layout/
│   └── AppLayout.tsx          # Main app shell (sidebar + navbar)
├── ui/
│   └── GlassCard.tsx          # Reusable glassmorphism card
└── budget/
    └── (budget-specific components)
```

### Component Hierarchy

```
<App>
  └── <AppLayout>                    # Sidebar + Bottom Nav
        ├── <Dashboard>              # Page
        │     ├── <GlassCard>        # Card wrapper
        │     │     └── Content
        │     └── <GlassCard>
        ├── <Transaksi>
        └── <Anggaran>
</App>
```

---

## 🖼 AppLayout Component

Location: [src/components/layout/AppLayout.tsx](../fatpig-web/src/components/layout/AppLayout.tsx)

### Purpose

Main application layout with:
- **Desktop:** Left sidebar (fixed, 288px width)
- **Mobile:** Bottom navigation bar
- **Universal:** Theme switcher, dark mode toggle, logout

### Props

```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}
```

### Usage

```tsx
import { AppLayout } from '@/components/layout/AppLayout';

function Dashboard() {
  return (
    <AppLayout>
      <div className="p-6">
        <h1>Dashboard Content</h1>
      </div>
    </AppLayout>
  );
}
```

### Features

#### 1. Responsive Sidebar

**Desktop (md+):**
```tsx
<aside className="hidden md:flex w-72 fixed inset-y-0 left-0 z-50
  bg-[#F2F2F7]/50 dark:bg-black/50 backdrop-blur-xl
  border-r border-gray-200/50 dark:border-white/10">
  {/* Menu items */}
</aside>
```

**Mobile (<md):**
```tsx
<nav className="md:hidden fixed bottom-0 left-0 right-0 z-50
  bg-white/80 dark:bg-black/80 backdrop-blur-xl
  border-t border-gray-200/50 dark:border-white/10">
  {/* Bottom nav icons */}
</nav>
```

#### 2. Menu Items

```typescript
const menuItems = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: Wallet, label: "Dompet", path: "/transaksi" },
  { icon: PieChart, label: "Budget", path: "/anggaran" },
  { icon: Settings, label: "Settings", path: "/pengaturan" },
];
```

#### 3. Active Route Highlighting

```tsx
{menuItems.map((item) => {
  const Icon = item.icon;
  const isActive = location.pathname === item.path;
  
  return (
    <button
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl
        transition-all duration-200
        ${isActive 
          ? 'bg-primary/10 text-primary' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100'
        }
      `}
    >
      <Icon size={20} />
      <span>{item.label}</span>
    </button>
  );
})}
```

#### 4. Theme Switcher

```tsx
<div className="flex gap-2 mb-4">
  {Object.keys(THEMES).map((theme) => (
    <button
      onClick={() => setTheme(theme)}
      className={`
        w-8 h-8 rounded-full border-2
        ${currentTheme === theme 
          ? 'border-primary scale-110' 
          : 'border-transparent'
        }
      `}
      style={{ backgroundColor: THEMES[theme].primary }}
    />
  ))}
</div>
```

#### 5. Dark Mode Toggle

```tsx
<button 
  onClick={toggleMode}
  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
>
  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
</button>
```

---

## 💎 GlassCard Component

Location: [src/components/ui/GlassCard.tsx](../fatpig-web/src/components/ui/GlassCard.tsx)

### Purpose

Reusable card component with **glassmorphism effect**.

### Props

```typescript
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;         // Additional Tailwind classes
  hoverEffect?: boolean;       // Enable hover scale effect
  onClick?: () => void;        // Click handler
}
```

### Usage

```tsx
import { GlassCard } from '@/components/ui/GlassCard';

// Basic card
<GlassCard>
  <p>Card content</p>
</GlassCard>

// Clickable card with hover effect
<GlassCard hoverEffect onClick={() => navigate('/detail')}>
  <h3>Account Name</h3>
  <p>Rp 1,000,000</p>
</GlassCard>

// Custom styling
<GlassCard className="p-6 mb-4">
  <h2>Custom padding</h2>
</GlassCard>
```

### Visual Effect

```tsx
<div className={`
  relative overflow-hidden
  backdrop-blur-2xl                              // Blur background
  bg-white/70 dark:bg-[#1C1C1E]/80              // Semi-transparent
  border border-white/40 dark:border-white/10   // Subtle border
  shadow-sm dark:shadow-none                    // Light shadow
  rounded-[28px]                                // Rounded corners
  transition-all duration-300 ease-out
  ${hoverEffect 
    ? 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
    : ''
  }
`}>
  {/* Glossy highlight effect */}
  <div className="absolute top-0 left-0 right-0 h-[1px] 
    bg-gradient-to-r from-transparent via-white/50 to-transparent 
    opacity-50">
  </div>
  
  {children}
</div>
```

### Examples

#### Account Card
```tsx
<GlassCard hoverEffect className="p-6">
  <div className="flex justify-between items-center">
    <div>
      <p className="text-sm text-gray-500">BCA Savings</p>
      <p className="text-2xl font-bold">Rp 5,000,000</p>
    </div>
    <Wallet className="text-primary" size={32} />
  </div>
</GlassCard>
```

#### Stat Card
```tsx
<GlassCard className="p-6 text-center">
  <p className="text-sm text-gray-500 mb-2">Safe to Spend</p>
  <p className="text-3xl font-bold text-green-500">
    Rp 2,000,000
  </p>
</GlassCard>
```

---

## 🎨 Theme System

Location: [src/store/themeStore.ts](../fatpig-web/src/store/themeStore.ts)

### 5 Color Themes

```typescript
export const THEMES: Record<string, { primary: string; accent: string }> = {
  ungu: { primary: "#6366f1", accent: "#818cf8" },   // Indigo (Default)
  hijau: { primary: "#10b981", accent: "#34d399" },  // Emerald
  biru: { primary: "#3b82f6", accent: "#60a5fa" },   // Blue
  pink: { primary: "#ec4899", accent: "#f472b6" },   // Pink
  orange: { primary: "#f97316", accent: "#fb923c" },  // Orange
};
```

### Theme Variables in CSS

Themes are applied via CSS custom properties:

```css
/* tailwind.config.js */
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

### Using Theme Colors

```tsx
// Text color
<p className="text-primary">Primary colored text</p>

// Background color
<div className="bg-primary/10">Light primary background</div>

// Border color
<button className="border-2 border-primary">Button</button>

// Inline style (for dynamic colors)
<div style={{ backgroundColor: THEMES[currentTheme].primary }}>
  Dynamic color
</div>
```

### Dark Mode

Dark mode uses Tailwind's `dark:` variant:

```tsx
<div className="
  bg-white dark:bg-black 
  text-gray-900 dark:text-white
  border-gray-200 dark:border-gray-800
">
  Adapts to dark mode
</div>
```

---

## 📦 State Management (Zustand)

### Theme Store

```typescript
interface ThemeState {
  currentTheme: "ungu" | "hijau" | "biru" | "pink" | "orange";
  isDarkMode: boolean;
  setTheme: (theme: string) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: "ungu",
      isDarkMode: false,
      setTheme: (theme) => set({ currentTheme: theme }),
      toggleMode: () => set((state) => {
        const newMode = !state.isDarkMode;
        
        // Update DOM
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
        // Apply dark mode on page load
        if (state?.isDarkMode) {
          document.documentElement.classList.add("dark");
        }
      },
    }
  )
);
```

### Usage in Components

```tsx
import { useThemeStore, THEMES } from '@/store/themeStore';

function MyComponent() {
  const { currentTheme, isDarkMode, setTheme, toggleMode } = useThemeStore();
  const themeColors = THEMES[currentTheme];
  
  return (
    <div>
      <p>Current theme: {currentTheme}</p>
      <p>Dark mode: {isDarkMode ? 'On' : 'Off'}</p>
      
      <button onClick={() => setTheme('hijau')}>
        Switch to Green
      </button>
      
      <button onClick={toggleMode}>
        Toggle Dark Mode
      </button>
    </div>
  );
}
```

### UI Store

```typescript
interface UIStore {
  showNavbar: boolean;
  toggleNavbar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  showNavbar: true,
  toggleNavbar: () => set((state) => ({ showNavbar: !state.showNavbar })),
}));
```

**Use case:** Hide navbar when user scrolls down (optional feature).

---

## 🎨 Styling with Tailwind CSS

### Tailwind Config

Location: [tailwind.config.js](../fatpig-web/tailwind.config.js)

```javascript
module.exports = {
  darkMode: 'class',  // Enable dark: variant
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '28px',  // For GlassCard
      },
    },
  },
  plugins: [],
}
```

### Common Utility Patterns

#### Glassmorphism Effect
```tsx
className="backdrop-blur-2xl bg-white/70 dark:bg-black/80 
  border border-white/40 dark:border-white/10"
```

#### Smooth Transitions
```tsx
className="transition-all duration-300 ease-out"
```

#### Hover Effects
```tsx
className="hover:scale-105 active:scale-95 cursor-pointer"
```

#### Responsive Padding
```tsx
className="p-4 md:p-6 lg:p-8"
```

#### Grid Layout
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
```

---

## 📱 Responsive Design

### Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm:` | 640px | Small tablets |
| `md:` | 768px | Tablets, show sidebar |
| `lg:` | 1024px | Small laptops |
| `xl:` | 1280px | Large screens |
| `2xl:` | 1536px | Ultra-wide screens |

### Layout Strategy

**Mobile (<768px):**
- Stack vertically
- Bottom navigation bar
- Full-width cards
- Smaller text sizes

**Desktop (≥768px):**
- Left sidebar navigation
- Multi-column grids
- Larger cards
- More whitespace

### Example

```tsx
<div className="
  flex flex-col md:flex-row 
  gap-4 md:gap-6
  p-4 md:p-6 lg:p-8
">
  <div className="
    w-full md:w-1/2 lg:w-1/3
    text-sm md:text-base
  ">
    Responsive content
  </div>
</div>
```

---

## ✨ Animation with Framer Motion

### Installation

Already included in dependencies:
```json
"framer-motion": "^12.23.26"
```

### Basic Animation

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  Animated content
</motion.div>
```

### Stagger Children

```tsx
<motion.div
  variants={{
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }}
  initial="hidden"
  animate="visible"
>
  {items.map((item) => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    >
      {item.name}
    </motion.div>
  ))}
</motion.div>
```

### Hover Animation

```tsx
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className="px-6 py-3 bg-primary text-white rounded-xl"
>
  Click me
</motion.button>
```

---

## 🎯 Component Best Practices

### 1. Use TypeScript Interfaces

```tsx
interface CardProps {
  title: string;
  amount: number;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ title, amount, icon, onClick }) => {
  // ...
}
```

### 2. Extract Repeated Styles

```tsx
// Bad
<div className="backdrop-blur-2xl bg-white/70 dark:bg-black/80 border border-white/40">
<div className="backdrop-blur-2xl bg-white/70 dark:bg-black/80 border border-white/40">

// Good
<GlassCard>Content 1</GlassCard>
<GlassCard>Content 2</GlassCard>
```

### 3. Use Conditional Classes

```tsx
import clsx from 'clsx';

<div className={clsx(
  'base-class',
  isActive && 'active-class',
  isError && 'error-class',
  className
)}>
```

### 4. Memoize Heavy Components

```tsx
import { memo } from 'react';

export const ExpensiveComponent = memo(({ data }) => {
  // Heavy rendering logic
});
```

---

## 📚 Next Steps

- See **[REACT_TUTORIALS.md](./REACT_TUTORIALS.md)** for step-by-step implementation
- See **[REACT_SERVICES.md](./REACT_SERVICES.md)** for business logic
- See **[REACT_VS_PYTHON.md](./REACT_VS_PYTHON.md)** for comparison

---

**Design beautiful UIs! 🐷🎨**
