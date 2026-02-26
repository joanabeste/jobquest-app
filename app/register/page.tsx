'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Building2, UserPlus } from 'lucide-react';
import { INDUSTRY_OPTIONS } from '@/lib/types';

export default function RegisterPage() {
  const { register, company, isLoading } = useAuth();
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    industry: '',
    location: '',
    logo: '',
    contactName: '',
    contactEmail: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isLoading && company) router.replace('/dashboard');
  }, [company, isLoading, router]);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo darf maximal 2 MB groß sein.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => handleChange('logo', reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwörter stimmen nicht überein.');
      return;
    }
    if (form.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.');
      return;
    }

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 300));

    try {
      await register({
        name: form.name,
        industry: form.industry,
        location: form.location,
        logo: form.logo || undefined,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
        password: form.password,
      });
      router.push('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(msg === 'Email already registered'
        ? 'Diese E-Mail ist bereits registriert.'
        : `Registrierung fehlgeschlagen: ${msg}`);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-slate-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <span className="text-white font-bold text-lg">J</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">JobQuest</span>
          </div>
          <p className="text-slate-500 text-sm mt-1">Unternehmen registrieren</p>
        </div>

        <div className="card p-8">
          <div className="flex items-center gap-2 mb-6">
            <Building2 size={20} className="text-violet-600" />
            <h1 className="text-xl font-semibold text-slate-900">Firmenprofil anlegen</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Firmendaten */}
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Unternehmen</p>

              <div>
                <label className="label">Firmenname *</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Mustermann GmbH"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="label">Branche *</label>
                  <select
                    className="input-field"
                    value={form.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    required
                  >
                    <option value="">Bitte wählen</option>
                    {INDUSTRY_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Standort *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Berlin"
                    value={form.location}
                    onChange={(e) => handleChange('location', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className="label">Firmenlogo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                />
                {form.logo && (
                  <img src={form.logo} alt="Logo Vorschau" className="mt-2 h-12 object-contain rounded-lg border border-slate-200 p-1 bg-white" />
                )}
              </div>
            </div>

            {/* Ansprechpartner */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Ansprechpartner:in</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Max Mustermann"
                    value={form.contactName}
                    onChange={(e) => handleChange('contactName', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label">E-Mail *</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="max@firma.de"
                    value={form.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Passwort */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Zugangsdaten</p>

              <div className="space-y-3">
                <div>
                  <label className="label">Passwort *</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="Mindestens 6 Zeichen"
                      value={form.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="label">Passwort bestätigen *</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field"
                    placeholder="Passwort wiederholen"
                    value={form.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center py-2.5 text-base"
            >
              <UserPlus size={18} />
              {submitting ? 'Registrierung…' : 'Konto erstellen'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Bereits registriert?{' '}
            <Link href="/login" className="text-violet-600 hover:text-violet-700 font-medium">
              Jetzt anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
