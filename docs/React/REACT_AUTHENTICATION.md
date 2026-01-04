# FATpig React - Authentication & Authorization

> **Complete guide to Supabase authentication, protected routes, and session management**

---

## 📖 Table of Contents

- [Overview](#overview)
- [Authentication Flow](#authentication-flow)
- [Supabase Auth Setup](#supabase-auth-setup)
- [Registration](#registration)
- [Login](#login)
- [Protected Routes](#protected-routes)
- [Session Management](#session-management)
- [Profile Synchronization](#profile-synchronization)
- [Logout](#logout)
- [Error Handling](#error-handling)

---

## 🎯 Overview

FATpig React uses **Supabase Authentication** for secure user management. This eliminates the need for:
- ❌ Custom password hashing
- ❌ Manual session storage
- ❌ Email verification code generation
- ❌ Token management

**Key Differences from Python Version:**

| Aspect | Python/Flet | React/Supabase |
|--------|-------------|----------------|
| **Password Storage** | Manual bcrypt | Supabase managed |
| **Email Verification** | Custom OTP via Brevo | Supabase built-in (optional) |
| **Session Storage** | `page.client_storage` | Zustand + localStorage |
| **User ID** | Auto-increment `INT` | UUID `string` |
| **Auth Provider** | Custom service class | Supabase Auth API |

---

## 🔐 Authentication Flow

### Registration Flow
```
User fills form → Supabase creates auth.users record → 
Create user_profiles record → Auto-login → Redirect to Dashboard
```

### Login Flow
```
User enters credentials → Supabase validates → 
Check session → Fetch profile → Store in Zustand → Redirect to Dashboard
```

### Protected Route Flow
```
User navigates → Check session → If valid, render page → 
If invalid, redirect to Login
```

---

## 🛠 Supabase Auth Setup

### 1. Enable Email Auth in Supabase Dashboard

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. (Optional) Configure email templates
4. (Optional) Enable **Confirm email** for extra security

### 2. Configure Redirect URLs

Add your app URL to allowed redirects:
- Development: `http://localhost:5173`
- Production: `https://yourapp.com`

Location: **Authentication** → **URL Configuration**

### 3. Database Trigger for Profile Creation

Create a trigger to auto-create `user_profiles` after signup:

```sql
-- Function to create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, nama, tema, dark_mode, avatar, akumulasi_sisa)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama', 'User'),
    'ungu',
    false,
    '👤',
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 📝 Registration

Location: [src/pages/Register.tsx](../fatpig-web/src/pages/Register.tsx)

### Component Structure

```typescript
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nama: nama  // Store name in metadata
          }
        }
      });

      if (authError) throw authError;

      // 2. Create profile (or rely on database trigger)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user!.id,
          email: email,
          nama: nama,
          tema: 'ungu',
          dark_mode: false,
          avatar: '👤',
          akumulasi_sisa: true
        });

      if (profileError) throw profileError;

      // 3. Auto-login after registration
      alert('Registration successful! Logging you in...');
      navigate('/');

    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Form JSX...
  );
};
```

### Key Points

1. **signUp()** creates user in `auth.users` table
2. **options.data** stores custom metadata (like `nama`)
3. **Profile creation** can be manual or via database trigger
4. **Auto-login** happens after successful registration

### Validation Rules

- Email: Must be valid format
- Password: Minimum 6 characters (configurable in Supabase)
- Name: Required field

---

## 🔑 Login

Location: [src/pages/Login.tsx](../fatpig-web/src/pages/Login.tsx)

### Component Structure

```typescript
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Sign in with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      // 2. Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) throw profileError;

      // 3. Store in app state (optional - can use Supabase session)
      // localStorage.setItem('user', JSON.stringify(profile));

      // 4. Redirect to dashboard
      navigate('/');

    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Form JSX...
  );
};
```

### Session Persistence

Supabase automatically stores the session in **localStorage** under the key:
```
sb-<project-ref>-auth-token
```

This persists across page refreshes.

---

## 🛡 Protected Routes

### Pattern 1: Route Wrapper Component

Create a `<ProtectedRoute>` component:

```typescript
// src/components/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

### Usage in App.tsx

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/transaksi" element={
          <ProtectedRoute>
            <Transaksi />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
```

---

### Pattern 2: Check Session in Layout

Alternatively, check session in `<AppLayout>`:

```typescript
// src/components/layout/AppLayout.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export const AppLayout = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      }
    });
  }, [navigate]);

  return (
    <div>
      {/* Sidebar, Navbar, etc. */}
      {children}
    </div>
  );
};
```

---

## 💾 Session Management

### Get Current User

```typescript
const { data: { user } } = await supabase.auth.getUser();
console.log(user?.id);  // UUID
console.log(user?.email);
```

### Get Current Session

```typescript
const { data: { session } } = await supabase.auth.getSession();
console.log(session?.access_token);
console.log(session?.user);
```

### Listen for Auth Changes

```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log('Auth event:', event);  // 'SIGNED_IN', 'SIGNED_OUT', etc.
      
      if (event === 'SIGNED_IN') {
        // User logged in
      }
      
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      }
    }
  );

  return () => subscription.unsubscribe();
}, []);
```

### Session Expiration

Sessions expire after **1 hour** by default. Supabase automatically refreshes them if the user is active.

To manually refresh:
```typescript
const { data, error } = await supabase.auth.refreshSession();
```

---

## 🔄 Profile Synchronization

### Fetch Profile After Login

```typescript
const { data: { user } } = await supabase.auth.getUser();

const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user!.id)
  .single();

// Store in state or context
setUserProfile(profile);
```

### Update Profile

```typescript
const { error } = await supabase
  .from('user_profiles')
  .update({
    nama: 'New Name',
    tema: 'hijau',
    dark_mode: true
  })
  .eq('id', userId);
```

### Sync Theme with Zustand

```typescript
// src/store/themeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  currentTheme: string;
  isDarkMode: boolean;
  setTheme: (theme: string) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      currentTheme: 'ungu',
      isDarkMode: false,
      setTheme: (theme) => set({ currentTheme: theme }),
      toggleMode: () => set((state) => ({ isDarkMode: !state.isDarkMode }))
    }),
    {
      name: 'fatpig-theme'
    }
  )
);
```

---

## 🚪 Logout

### Simple Logout

```typescript
const handleLogout = async () => {
  await supabase.auth.signOut();
  navigate('/login');
};
```

### Logout with State Cleanup

```typescript
const handleLogout = async () => {
  try {
    // 1. Clear Supabase session
    await supabase.auth.signOut();
    
    // 2. Clear local storage (if needed)
    localStorage.removeItem('user');
    
    // 3. Reset app state (Zustand, etc.)
    useThemeStore.getState().reset?.();
    
    // 4. Redirect to login
    navigate('/login');
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
```

---

## ⚠️ Error Handling

### Common Auth Errors

| Error Code | Message | Solution |
|------------|---------|----------|
| `invalid_credentials` | Invalid email or password | Check email/password |
| `email_exists` | Email already registered | Use different email |
| `weak_password` | Password too weak | Use 6+ characters |
| `rate_limit_exceeded` | Too many requests | Wait before retrying |

### Error Handling Pattern

```typescript
try {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      setError('Email atau password salah');
    } else if (error.message.includes('Email not confirmed')) {
      setError('Silakan konfirmasi email Anda terlebih dahulu');
    } else {
      setError(error.message);
    }
    return;
  }

  // Success handling...
} catch (err: any) {
  setError('Terjadi kesalahan. Silakan coba lagi.');
  console.error(err);
}
```

---

## 🔮 Future Enhancements

### Email Verification

Enable in Supabase Dashboard → Authentication → Email Templates

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://yourapp.com/verify-email'
  }
});
```

### Password Reset

```typescript
// Send reset email
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://yourapp.com/reset-password'
});

// Update password (after clicking link)
const { error } = await supabase.auth.updateUser({
  password: newPassword
});
```

### OAuth Providers (Google, GitHub, etc.)

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google'
});
```

---

## 📚 Next Steps

- See **[REACT_SERVICES.md](./REACT_SERVICES.md)** for business logic
- See **[REACT_UI_COMPONENTS.md](./REACT_UI_COMPONENTS.md)** for UI patterns
- See **[REACT_TUTORIALS.md](./REACT_TUTORIALS.md)** for implementation guides

---

**Secure your app! 🐷🔒**
