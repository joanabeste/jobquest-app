'use client';

import { useState } from 'react';
import { Globe, Loader2, CheckCircle, AlertCircle, Trash2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomDomainSettings() {
  const { company } = useAuth();
  const [domain, setDomain] = useState(company?.customDomain ?? '');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dnsInfo, setDnsInfo] = useState<{ type: string; name: string; value: string; note: string } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Local domain state (company object doesn't refresh automatically after domain API calls)
  const [localDomain, setLocalDomain] = useState(company?.customDomain ?? '');
  const [localVerified, setLocalVerified] = useState(company?.domainVerified ?? false);

  const hasDomain = !!localDomain;
  const isVerified = localVerified;

  async function handleSaveDomain() {
    if (!domain.trim()) return;
    setSaving(true);
    setError(null);
    setDnsInfo(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/companies/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Fehler beim Speichern');
        return;
      }
      setDnsInfo(data.dnsInstructions);
      setSuccess('Domain gespeichert. Bitte DNS-Eintrag erstellen und dann verifizieren.');
      setLocalDomain(data.domain);
      setLocalVerified(false);
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/companies/domain/verify', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Verifizierung fehlgeschlagen');
        return;
      }
      if (data.verified) {
        setSuccess('Domain erfolgreich verifiziert!');
        setDnsInfo(null);
        setLocalVerified(true);
      } else {
        setError(data.reason ?? 'DNS noch nicht erkannt. Versuche es in einigen Minuten erneut.');
      }
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setVerifying(false);
    }
  }

  async function handleRemove() {
    if (!confirm('Domain wirklich entfernen?')) return;
    setRemoving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/companies/domain', { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Fehler beim Entfernen');
        return;
      }
      setDomain('');
      setDnsInfo(null);
      setSuccess('Domain entfernt.');
      setLocalDomain('');
      setLocalVerified(false);
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Globe size={16} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Eigene Domain</h3>
      </div>
      <p className="text-xs text-slate-500">
        Hinterlege eine eigene Domain (z.B. karriere.deinefirma.de), unter der deine Inhalte erreichbar sind.
      </p>

      {/* Domain input / status */}
      {!hasDomain || !isVerified ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="karriere.deinefirma.de"
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
            disabled={saving}
          />
          {!hasDomain ? (
            <button
              onClick={handleSaveDomain}
              disabled={saving || !domain.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Speichern
            </button>
          ) : (
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {verifying ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Verifizieren
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800 truncate">{localDomain}</p>
            <p className="text-xs text-emerald-600">Verifiziert und aktiv</p>
          </div>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Domain entfernen"
          >
            {removing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        </div>
      )}

      {/* DNS instructions */}
      {dnsInfo && !isVerified && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
          <p className="text-xs font-semibold text-amber-800">DNS-Eintrag erstellen:</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-amber-600">Typ:</span>
              <p className="font-mono font-medium text-amber-900">{dnsInfo.type}</p>
            </div>
            <div>
              <span className="text-amber-600">Name:</span>
              <p className="font-mono font-medium text-amber-900 truncate">{dnsInfo.name}</p>
            </div>
            <div>
              <span className="text-amber-600">Ziel:</span>
              <p className="font-mono font-medium text-amber-900">{dnsInfo.value}</p>
            </div>
          </div>
          <p className="text-[11px] text-amber-700">{dnsInfo.note}</p>
        </div>
      )}

      {/* Pending verification hint */}
      {hasDomain && !isVerified && !dnsInfo && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle size={14} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            Domain hinterlegt, aber noch nicht verifiziert. Erstelle den CNAME-Eintrag und klicke auf &quot;Verifizieren&quot;.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600">
          <AlertCircle size={12} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-xs text-emerald-600">
          <CheckCircle size={12} /> {success}
        </div>
      )}
    </div>
  );
}
