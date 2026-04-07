'use client';

import { useRef, useState } from 'react';
import { X, Mail, Bell, Paperclip, ChevronDown, ChevronUp, Upload, FileText, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import type { EmailConfig, EmailAttachment } from '@/lib/funnel-types';
import { VarInput } from './VarInput';
import RichTextEditor from './RichTextEditor';
import { type VariableDef, EMAIL_VARIABLES } from '@/lib/funnel-variables';

// Convert plain text defaults to basic HTML for the visual editor
function toHtml(text: string): string {
  if (!text) return '';
  if (text.startsWith('<')) return text; // already HTML
  return text.split('\n\n')
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

const EMPTY_CONFIG: EmailConfig = {
  confirmationEnabled: false,
  confirmationSubject: 'Danke für deine Teilnahme, @firstName!',
  confirmationBodyMode: 'text',
  confirmationBody: toHtml('Hallo @firstName,\n\nvielen Dank, dass du dir die Zeit genommen hast und uns besser kennengelernt hast!\n\nDu interessierst dich für eine Ausbildung bei @companyName? Dann besuch gerne unsere Karriereseite und entdecke, was wir dir bieten können:\n@karriereseiteUrl\n\nWir freuen uns auf dich!\n\nHerzliche Grüße\n@companyName'),
  confirmationAttachment: undefined,
  notificationEnabled: false,
  notificationRecipient: '',
  notificationSubject: 'Neuer Kontakt: @firstName @lastName',
  notificationBodyMode: 'text',
  notificationBody: toHtml('Neuer Kontakt eingegangen:\n\nName: @firstName @lastName\nE-Mail: @email\nTelefon: @phone'),
};

interface Props {
  initial?: EmailConfig;
  onSave: (config: EmailConfig) => void;
  onClose: () => void;
  availableVars?: VariableDef[];
}

export default function EmailConfigModal({ initial, onSave, onClose, availableVars = EMAIL_VARIABLES }: Props) {
  const [cfg, setCfg] = useState<EmailConfig>(() => {
    if (!initial) return EMPTY_CONFIG;
    // Migrate legacy plain-text bodies to HTML for the visual editor
    return {
      ...initial,
      confirmationBody: toHtml(initial.confirmationBody ?? ''),
      notificationBody:  toHtml(initial.notificationBody ?? ''),
    };
  });
  const [confirmOpen, setConfirmOpen] = useState(true);
  const [notifOpen,   setNotifOpen]   = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  type TestState = { status: 'idle' | 'sending' | 'ok' | 'error'; message?: string; detail?: string };
  const [confirmTest, setConfirmTest] = useState<TestState>({ status: 'idle' });
  const [notifTest,   setNotifTest]   = useState<TestState>({ status: 'idle' });

  async function sendTest(kind: 'confirmation' | 'notification') {
    const setState = kind === 'confirmation' ? setConfirmTest : setNotifTest;
    setState({ status: 'sending' });
    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          config: {
            ...cfg,
            confirmationAttachment: cfg.confirmationAttachment?.url ? cfg.confirmationAttachment : undefined,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setState({
          status: 'error',
          message: data?.message || `Fehler ${res.status}: Test-E-Mail konnte nicht gesendet werden.`,
          detail: data?.detail,
        });
        return;
      }
      setState({ status: 'ok', message: data.message || 'Test-E-Mail gesendet.' });
    } catch (e) {
      setState({
        status: 'error',
        message: 'Netzwerkfehler beim Senden der Test-E-Mail.',
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  function patch(partial: Partial<EmailConfig>) {
    setCfg((prev) => ({ ...prev, ...partial }));
  }

  function patchAttachment(partial: Partial<EmailAttachment>) {
    setCfg((prev) => ({
      ...prev,
      confirmationAttachment: { url: '', filename: '', ...prev.confirmationAttachment, ...partial },
    }));
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload-attachment', { method: 'POST', body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Upload fehlgeschlagen');
      }
      const { url, filename } = await res.json();
      patchAttachment({ url, filename });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function handleSave() {
    onSave({
      ...cfg,
      confirmationAttachment: cfg.confirmationAttachment?.url ? cfg.confirmationAttachment : undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-violet-600" />
            <h2 className="text-base font-semibold text-slate-900">E-Mail-Einstellungen</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Bestätigungs-E-Mail ─────────────────────────────────────── */}
          <Section
            icon={<Mail className="w-4 h-4 text-violet-500" />}
            title="Bestätigungs-E-Mail"
            subtitle="Wird nach dem Absenden an die Bewerberin / den Bewerber geschickt"
            open={confirmOpen}
            onToggle={() => setConfirmOpen((v) => !v)}
          >
            <ToggleRow
              label="Bestätigung senden"
              checked={cfg.confirmationEnabled}
              onChange={(v) => patch({ confirmationEnabled: v })}
            />
            {cfg.confirmationEnabled && (
              <div className="space-y-3 pt-1">
                <Field label="Betreff">
                  <VarInput
                    value={cfg.confirmationSubject}
                    onChange={(v) => patch({ confirmationSubject: v })}
                    placeholder="Betreff – tippe @ für Variablen"
                    variables={availableVars}
                  />
                </Field>
                <Field label="Nachricht">
                  <BodyModeToggle mode={cfg.confirmationBodyMode} onChange={(m) => patch({ confirmationBodyMode: m })} />
                  {cfg.confirmationBodyMode === 'text' ? (
                    <RichTextEditor
                      value={cfg.confirmationBody}
                      onChange={(v) => patch({ confirmationBody: v })}
                      variables={availableVars}
                      minHeight={160}
                    />
                  ) : (
                    <textarea
                      value={cfg.confirmationBody}
                      onChange={(e) => patch({ confirmationBody: e.target.value })}
                      rows={8}
                      className="input-field font-mono text-xs leading-relaxed resize-none"
                      placeholder="<p>Hallo @firstName,</p>"
                    />
                  )}
                </Field>
                <Field label="Anhang (optional)">
                  <AttachmentField
                    attachment={cfg.confirmationAttachment}
                    uploading={uploading}
                    error={uploadError}
                    fileRef={fileRef}
                    onUpload={handleFileUpload}
                    onClear={() => patch({ confirmationAttachment: undefined })}
                  />
                </Field>
                <TestEmailRow
                  label="Test-E-Mail an dich selbst senden"
                  state={confirmTest}
                  onSend={() => sendTest('confirmation')}
                />
              </div>
            )}
          </Section>

          {/* ── Benachrichtigungs-E-Mail ─────────────────────────────────── */}
          <Section
            icon={<Bell className="w-4 h-4 text-violet-500" />}
            title="Benachrichtigungs-E-Mail"
            subtitle="Wird intern verschickt, wenn ein neuer Lead eingeht"
            open={notifOpen}
            onToggle={() => setNotifOpen((v) => !v)}
          >
            <ToggleRow
              label="Benachrichtigung senden"
              checked={cfg.notificationEnabled}
              onChange={(v) => patch({ notificationEnabled: v })}
            />
            {cfg.notificationEnabled && (
              <div className="space-y-3 pt-1">
                <Field label="Empfänger (E-Mail-Adresse)">
                  <input className="input-field" type="email" value={cfg.notificationRecipient}
                    onChange={(e) => patch({ notificationRecipient: e.target.value })} placeholder="hr@firma.de" />
                </Field>
                <Field label="Betreff">
                  <VarInput
                    value={cfg.notificationSubject}
                    onChange={(v) => patch({ notificationSubject: v })}
                    placeholder="Betreff – tippe @ für Variablen"
                    variables={availableVars}
                  />
                </Field>
                <Field label="Nachricht">
                  <BodyModeToggle mode={cfg.notificationBodyMode} onChange={(m) => patch({ notificationBodyMode: m })} />
                  {cfg.notificationBodyMode === 'text' ? (
                    <RichTextEditor
                      value={cfg.notificationBody}
                      onChange={(v) => patch({ notificationBody: v })}
                      variables={availableVars}
                      minHeight={120}
                    />
                  ) : (
                    <textarea
                      value={cfg.notificationBody}
                      onChange={(e) => patch({ notificationBody: e.target.value })}
                      rows={6}
                      className="input-field font-mono text-xs leading-relaxed resize-none"
                      placeholder="<p>Neue Bewerbung von @firstName @lastName</p>"
                    />
                  )}
                </Field>
                <TestEmailRow
                  label={`Test-E-Mail an ${cfg.notificationRecipient || 'Empfänger'} senden`}
                  state={notifTest}
                  onSend={() => sendTest('notification')}
                />
              </div>
            )}
          </Section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary">Abbrechen</button>
          <button onClick={handleSave} className="btn-primary">Speichern</button>
        </div>
      </div>
    </div>
  );
}

// ─── Attachment field ──────────────────────────────────────────────────────────
function AttachmentField({
  attachment, uploading, error, fileRef, onUpload, onClear,
}: {
  attachment?: EmailAttachment;
  uploading: boolean;
  error: string | null;
  fileRef: React.RefObject<HTMLInputElement>;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      {/* Uploaded file chip */}
      {attachment?.url ? (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          <FileText size={13} className="text-violet-500 flex-shrink-0" />
          <span className="text-xs text-slate-700 flex-1 truncate">{attachment.filename || 'Anhang'}</span>
          <button type="button" onClick={onClear} className="text-slate-400 hover:text-slate-600 p-0.5 rounded">
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors text-slate-700"
        >
          <Upload size={12} className={uploading ? 'animate-bounce' : ''} />
          {uploading ? 'Hochladen…' : 'Datei hochladen'}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.png,.jpg,.jpeg"
        className="hidden"
        onChange={onUpload}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <p className="text-xs text-slate-400 flex items-center gap-1">
        <Paperclip size={11} />
        Maximal 10 MB. PDF, Word, Excel, Bilder und ZIP werden unterstützt.
      </p>
    </div>
  );
}

// ─── Test-E-Mail Zeile ────────────────────────────────────────────────────────
function TestEmailRow({
  label, state, onSend,
}: {
  label: string;
  state: { status: 'idle' | 'sending' | 'ok' | 'error'; message?: string; detail?: string };
  onSend: () => void;
}) {
  return (
    <div className="space-y-1.5 pt-1 border-t border-slate-100">
      <button
        type="button"
        onClick={onSend}
        disabled={state.status === 'sending'}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors"
      >
        <Send size={12} className={state.status === 'sending' ? 'animate-pulse' : ''} />
        {state.status === 'sending' ? 'Sende…' : label}
      </button>
      {state.status === 'ok' && (
        <div className="flex items-start gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
          <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
          <span>{state.message}</span>
        </div>
      )}
      {state.status === 'error' && (
        <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-medium">{state.message}</div>
            {state.detail && <div className="text-red-500 mt-0.5 break-words">{state.detail}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hilfs-Komponenten ────────────────────────────────────────────────────────

function Section({ icon, title, subtitle, open, onToggle, children }: {
  icon: React.ReactNode; title: string; subtitle: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-4 py-3.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800">{title}</div>
          <div className="text-xs text-slate-400 truncate">{subtitle}</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {open && <div className="px-4 py-4 space-y-3">{children}</div>}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-slate-700">{label}</span>
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative inline-flex w-10 h-6 rounded-full transition-colors ${checked ? 'bg-violet-600' : 'bg-slate-200'}`}>
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="label">{label}</label>{children}</div>;
}

function BodyModeToggle({ mode, onChange }: { mode: 'html' | 'text'; onChange: (m: 'html' | 'text') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs mb-1.5">
      {(['text', 'html'] as const).map((m) => (
        <button key={m} onClick={() => onChange(m)}
          className={`px-3 py-1 font-medium transition-colors ${mode === m ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
          {m === 'text' ? 'Visuell' : 'HTML'}
        </button>
      ))}
    </div>
  );
}
