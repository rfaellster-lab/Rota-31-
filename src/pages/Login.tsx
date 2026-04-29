/**
 * @file Login.tsx
 * @description Tela de autenticação (login + cadastro + reset)
 * @created 2026-04-29
 */

import { useState, FormEvent } from 'react';
import { Loader2, Mail, Lock, AlertCircle, CheckCircle2, User as UserIcon, Phone } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import PromoSlot from '../components/PromoSlot';

type Mode = 'signin' | 'signup' | 'reset';

export default function Login() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const friendlyError = (raw: string): string => {
    if (raw.includes('invalid-credential') || raw.includes('wrong-password')) return 'E-mail ou senha incorretos.';
    if (raw.includes('user-not-found')) return 'Usuário não cadastrado.';
    if (raw.includes('email-already-in-use')) return 'Este e-mail já está cadastrado.';
    if (raw.includes('weak-password')) return 'Senha muito fraca (mínimo 6 caracteres).';
    if (raw.includes('invalid-email')) return 'E-mail inválido.';
    if (raw.includes('too-many-requests')) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (raw.includes('network-request-failed')) return 'Sem conexão com o servidor.';
    return raw;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error('As senhas não coincidem.');
        if (password.length < 6) throw new Error('Senha mínima de 6 caracteres.');
        const fullName = phone ? `${name} (${phone})` : name;
        await signUp(email, password, fullName || undefined);
      } else if (mode === 'reset') {
        await resetPassword(email);
        setSuccess('E-mail de redefinição enviado. Verifique sua caixa de entrada.');
      }
    } catch (e: any) {
      setError(friendlyError(e.code || e.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1F2937] via-slate-800 to-slate-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 sm:p-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Rota 31" className="h-24 w-auto mb-3" />
          <h1 className="text-2xl font-black text-[#1F2937]">Rota 31 Express</h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'signin' && 'Acesse o painel de aprovações'}
            {mode === 'signup' && 'Criar nova conta'}
            {mode === 'reset' && 'Recuperar senha'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nome completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Seu nome"
                    className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:border-[#F26522] focus:ring-2 focus:ring-[#F26522]/20 outline-none transition-shadow"
                    autoComplete="name" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Telefone (opcional)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:border-[#F26522] focus:ring-2 focus:ring-[#F26522]/20 outline-none transition-shadow"
                    autoComplete="tel" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:border-[#F26522] focus:ring-2 focus:ring-[#F26522]/20 outline-none transition-shadow"
                autoComplete="email"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:border-[#F26522] focus:ring-2 focus:ring-[#F26522]/20 outline-none transition-shadow"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                />
              </div>
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={() => { setMode('reset'); setError(null); setSuccess(null); }}
                  className="text-xs text-[#F26522] hover:underline mt-1.5 font-semibold"
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Confirme a senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6} placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-lg focus:border-[#F26522] focus:ring-2 focus:ring-[#F26522]/20 outline-none transition-shadow"
                  autoComplete="new-password" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2 items-start">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex gap-2 items-start">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#F26522] hover:bg-[#d9561c] text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === 'signin' && 'Entrar'}
            {mode === 'signup' && 'Criar conta'}
            {mode === 'reset' && 'Enviar e-mail de recuperação'}
          </button>
        </form>

        {/* Toggle */}
        <div className="mt-6 text-center text-sm text-slate-600">
          {mode === 'signin' && (
            <>
              Primeira vez?{' '}
              <button onClick={() => { setMode('signup'); setError(null); setSuccess(null); }} className="text-[#F26522] hover:underline font-bold">
                Criar conta
              </button>
            </>
          )}
          {mode === 'signup' && (
            <>
              Já tem conta?{' '}
              <button onClick={() => { setMode('signin'); setError(null); setSuccess(null); }} className="text-[#F26522] hover:underline font-bold">
                Entrar
              </button>
            </>
          )}
          {mode === 'reset' && (
            <button onClick={() => { setMode('signin'); setError(null); setSuccess(null); }} className="text-[#F26522] hover:underline font-bold">
              Voltar para login
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-400 text-center mt-8 uppercase tracking-wider">
          Rota 31 Express · v0.1
        </p>
        <PromoSlot placement="login" variant="login" />
      </div>
    </div>
  );
}
