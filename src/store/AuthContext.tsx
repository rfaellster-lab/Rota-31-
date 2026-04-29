/**
 * @file AuthContext.tsx
 * @description Estado global de autenticação Firebase
 * @created 2026-04-29
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'operator' | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshClaims: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'operator' | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRole = async (u: User | null) => {
    if (!u) { setRole(null); return; }
    try {
      const tk = await u.getIdTokenResult(true);
      const r = (tk.claims.role as any) || ((tk.claims.admin as any) ? 'admin' : 'operator');
      setRole(r === 'admin' ? 'admin' : 'operator');
    } catch { setRole('operator'); }
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      setUser(u);
      await loadRole(u);
      // 1ª request /api/me força auto-promoção do super admin no backend
      if (u) {
        try {
          await fetch(`${(import.meta as any).env?.VITE_API_URL || '/api'}/me`, {
            headers: {
              'x-api-key': (import.meta as any).env?.VITE_API_KEY || '',
              'Authorization': `Bearer ${await u.getIdToken()}`,
            },
          });
          // refresh do token pra capturar custom claim recém-aplicado
          await u.getIdToken(true);
          await loadRole(u);
        } catch {}
      }
      setLoading(false);
    });
  }, []);

  const refreshClaims = async () => { await loadRole(user); };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, role, isAdmin: role === 'admin', loading, signIn, signUp, signOut, resetPassword, refreshClaims, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
