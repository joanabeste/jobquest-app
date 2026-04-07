'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { INDUSTRY_OPTIONS, CorporateDesign, DEFAULT_CORPORATE_DESIGN, SuccessPageConfig, DEFAULT_SUCCESS_PAGE, SuccessJob, SuccessLink } from '@/lib/types';
import { Building2, Save, CheckCircle, Palette, Type, Globe, Upload, SlidersHorizontal, Link2, Trophy, Plus, X, ExternalLink, Sparkles, Image as ImageIcon } from 'lucide-react';
import ImageCropModal from '@/components/shared/ImageCropModal';
import MediaLibrary from '@/components/shared/MediaLibrary';
import ImportFromWebsiteModal, { ExtractedProfile } from '@/components/company/ImportFromWebsiteModal';
import { FONT_OPTIONS, fontFamilyFor } from '@/lib/fonts';

type Tab = 'company' | 'design' | 'success';

export default function SettingsCompanyPage() {
  const { company, updateCompany, can } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cropState, setCropState] = useState<{ src: string; target: 'logo' | 'favicon' } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [libraryFor, setLibraryFor] = useState<'logo' | 'favicon' | 'manage' | null>(null);

  function handleImportApply(data: ExtractedProfile) {
    setForm((prev) => ({
      ...prev,
      name: data.name ?? prev.name,
      description: data.description ?? prev.description,
      industry: data.industry ?? prev.industry,
      location: data.location ?? prev.location,
      logo: data.logo ?? prev.logo,
      privacyUrl: data.privacyUrl ?? prev.privacyUrl,
      imprintUrl: data.imprintUrl ?? prev.imprintUrl,
      careerPageUrl: data.careerPageUrl ?? prev.careerPageUrl,
    }));
    if (data.design) {
      setDesign((prev) => ({
        ...prev,
        primaryColor: data.design?.primaryColor ?? prev.primaryColor,
        accentColor: data.design?.accentColor ?? prev.accentColor,
        headingFontName: data.design?.headingFontName ?? prev.headingFontName,
        bodyFontName: data.design?.bodyFontName ?? prev.bodyFontName,
        faviconUrl: data.design?.faviconUrl ?? prev.faviconUrl,
      }));
    }
    setImportOpen(false);
  }

  useEffect(() => {
    if (!can('edit_company')) {
      router.replace('/dashboard');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>('company');
  const sp = company?.successPage;
  const [successPage, setSuccessPage] = useState<SuccessPageConfig>({
    ...DEFAULT_SUCCESS_PAGE,
    ...sp,
  });
  const cd = company?.corporateDesign ?? DEFAULT_CORPORATE_DESIGN;

  const [form, setForm] = useState({
    name: company?.name || '',
    description: company?.description || '',
    industry: company?.industry || '',
    location: company?.location || '',
    logo: company?.logo || '',
    privacyUrl: company?.privacyUrl || '',
    imprintUrl: company?.imprintUrl || '',
    careerPageUrl: company?.careerPageUrl || '',
  });

  const [design, setDesign] = useState<CorporateDesign>({
    primaryColor: cd.primaryColor ?? DEFAULT_CORPORATE_DESIGN.primaryColor,
    accentColor: cd.accentColor ?? DEFAULT_CORPORATE_DESIGN.accentColor,
    textColor: cd.textColor ?? DEFAULT_CORPORATE_DESIGN.textColor,
    headingColor: cd.headingColor ?? DEFAULT_CORPORATE_DESIGN.headingColor,
    borderRadius: cd.borderRadius ?? DEFAULT_CORPORATE_DESIGN.borderRadius,
    headingFontName: cd.headingFontName ?? DEFAULT_CORPORATE_DESIGN.headingFontName,
    headingFontCustomName: cd.headingFontCustomName,
    headingFontData: cd.headingFontData,
    headingFontSize: cd.headingFontSize ?? DEFAULT_CORPORATE_DESIGN.headingFontSize,
    headingFontWeight: cd.headingFontWeight ?? DEFAULT_CORPORATE_DESIGN.headingFontWeight,
    headingTextTransform: cd.headingTextTransform ?? 'none',
    headingLetterSpacing: cd.headingLetterSpacing ?? 0,
    bodyFontName: cd.bodyFontName ?? DEFAULT_CORPORATE_DESIGN.bodyFontName,
    bodyFontCustomName: cd.bodyFontCustomName,
    bodyFontData: cd.bodyFontData,
    bodyFontSize: cd.bodyFontSize ?? DEFAULT_CORPORATE_DESIGN.bodyFontSize,
    bodyFontWeight: cd.bodyFontWeight ?? DEFAULT_CORPORATE_DESIGN.bodyFontWeight,
    bodyTextTransform: cd.bodyTextTransform ?? 'none',
    bodyLetterSpacing: cd.bodyLetterSpacing ?? 0,
    faviconUrl: cd.faviconUrl,
  });

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Logo & Favicon werden jetzt komplett über die Mediathek verwaltet:
  // Auswahl im Picker → Crop-Modal → Speichern. Direkter File-Input entfällt,
  // damit jedes Bild garantiert in der Mediathek landet.

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateCompany({ ...company, name: form.name, description: form.description || undefined, industry: form.industry, location: form.location, logo: form.logo || undefined, privacyUrl: form.privacyUrl, imprintUrl: form.imprintUrl, careerPageUrl: form.careerPageUrl || undefined, corporateDesign: design, successPage });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setSaving(false);
    }
  }

  if (!company) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'company', label: 'Firmendaten', icon: <Building2 size={15} /> },
    { id: 'design', label: 'Corporate Design', icon: <Palette size={15} /> },
    { id: 'success', label: 'Erfolgsseite', icon: <Trophy size={15} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {importOpen && (
        <ImportFromWebsiteModal
          onClose={() => setImportOpen(false)}
          onApply={handleImportApply}
        />
      )}
      <MediaLibrary
        open={libraryFor !== null}
        mode={libraryFor === 'manage' ? 'manage' : 'pick'}
        title={libraryFor === 'manage' ? 'Mediathek' : libraryFor === 'favicon' ? 'Favicon aus Mediathek' : 'Logo aus Mediathek'}
        onClose={() => setLibraryFor(null)}
        onSelect={(url) => {
          if (libraryFor === 'logo' || libraryFor === 'favicon') {
            setCropState({ src: url, target: libraryFor });
          }
          setLibraryFor(null);
        }}
      />
      {cropState && (
        <ImageCropModal
          src={cropState.src}
          title={cropState.target === 'favicon' ? 'Favicon zuschneiden' : 'Logo zuschneiden'}
          onConfirm={(base64: string) => {
            if (cropState.target === 'logo') handleChange('logo', base64);
            else setDesign((d) => ({ ...d, faviconUrl: base64 }));
            setCropState(null);
          }}
          onCancel={() => setCropState(null)}
        />
      )}
      <div className="flex items-center gap-4 mb-8 max-w-3xl mx-auto">
        {form.logo ? (
          <img src={form.logo} alt="Logo" className="h-14 w-auto max-w-[160px] rounded-2xl object-contain border border-slate-200 p-1 bg-white shadow-sm" />
        ) : (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm"
            style={{ backgroundColor: design.primaryColor }}>
            {form.name.charAt(0) || 'J'}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">{form.name || 'Firmenprofil'}</h1>
          <p className="text-slate-500 text-sm mt-0.5">Firmenprofil &amp; Corporate Design verwalten</p>
        </div>
        <button
          type="button"
          onClick={() => setLibraryFor('manage')}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
        >
          <ImageIcon size={15} />
          Mediathek öffnen
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 max-w-3xl mx-auto">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {tab.icon}
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'company' && (
          <div className="card p-6 space-y-5 max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-slate-900">Unternehmensdaten</h2>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
              >
                <Sparkles size={14} />
                Von Website importieren
              </button>
            </div>
            <div>
              <label className="label">Firmenname <RequiredMark /></label>
              <input type="text" className="input-field" value={form.name}
                onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
            <div>
              <label className="label">Unternehmensbeschreibung</label>
              <AutoTextarea
                value={form.description}
                onChange={(v) => handleChange('description', v)}
                placeholder="Was macht euer Unternehmen besonders? Werte, Mission, Größe, Ausbildungskultur…"
                minRows={4}
              />
              <p className="text-xs text-slate-400 mt-1.5">Wird bei KI-generierten JobQuests berücksichtigt.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Branche <RequiredMark /></label>
                <select className="input-field" value={form.industry}
                  onChange={(e) => handleChange('industry', e.target.value)} required>
                  <option value="">Bitte wählen</option>
                  {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Standort <RequiredMark /></label>
                <input type="text" className="input-field" value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Firmenlogo</label>
              <div className="flex items-center gap-4">
                {form.logo ? (
                  <div className="relative group">
                    <img src={form.logo} alt="Logo"
                      className="h-16 w-auto max-w-[180px] rounded-xl object-contain border border-slate-200 bg-white p-1.5 shadow-sm" />
                    <button type="button" onClick={() => handleChange('logo', '')}
                      title="Logo entfernen"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center shadow-sm transition opacity-0 group-hover:opacity-100">
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-300 flex-shrink-0">
                    <ImageIcon size={20} />
                  </div>
                )}
                <button type="button" onClick={() => setLibraryFor('logo')}
                  className="btn-secondary text-sm flex items-center gap-2">
                  <ImageIcon size={14} />
                  {form.logo ? 'Anderes Logo wählen' : 'Logo aus Mediathek'}
                </button>
              </div>
            </div>
            <div className="pt-5 mt-1 border-t border-slate-100">
              <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-3 text-sm">
                <Link2 size={14} className="text-slate-400" /> Links
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Karriereseite-URL</label>
                  <input type="url" className="input-field" placeholder="https://www.firma.de/karriere"
                    value={form.careerPageUrl} onChange={(e) => handleChange('careerPageUrl', e.target.value)} />
                  <p className="text-xs text-slate-400 mt-1.5">Als <code className="bg-slate-100 px-1 rounded text-[11px]">@karriereseiteUrl</code> in E-Mail-Vorlagen verfügbar.</p>
                </div>
                <div>
                  <label className="label">Datenschutz-URL</label>
                  <input type="url" className="input-field" placeholder="https://www.firma.de/datenschutz"
                    value={form.privacyUrl} onChange={(e) => handleChange('privacyUrl', e.target.value)} />
                  <p className="text-xs text-slate-400 mt-1.5">Wird im Footer aller öffentlichen Seiten verlinkt.</p>
                </div>
                <div>
                  <label className="label">Impressum-URL</label>
                  <input type="url" className="input-field" placeholder="https://www.firma.de/impressum"
                    value={form.imprintUrl} onChange={(e) => handleChange('imprintUrl', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'design' && (
          <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          <div className="space-y-4 lg:col-span-2">
            <div className="card p-6">
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Type size={17} className="text-slate-400" /> Schriftarten
                </h2>
                <p className="text-xs text-slate-400">Wie Texte in Funnels und auf Karten erscheinen</p>
              </div>
              <div className="space-y-6">
                <FontPicker
                  label="Überschriften"
                  fontName={design.headingFontName}
                  customFontName={design.headingFontCustomName}
                  customFontData={design.headingFontData}
                  primaryColor={design.primaryColor}
                  onSelectFont={(name) => setDesign((d) => ({ ...d, headingFontName: name, headingFontCustomName: undefined, headingFontData: undefined }))}
                  onUploadFont={(name, data) => setDesign((d) => ({ ...d, headingFontName: name, headingFontCustomName: name, headingFontData: data }))}
                  onClearCustomFont={() => setDesign((d) => ({ ...d, headingFontName: 'system', headingFontCustomName: undefined, headingFontData: undefined }))}
                />
                <div
                  className="px-4 py-5 rounded-xl bg-slate-50 border border-slate-100 truncate"
                  style={{
                    fontFamily: design.headingFontData
                      ? `'${design.headingFontName}', system-ui, sans-serif`
                      : fontFamilyFor(design.headingFontName),
                    fontSize: `${design.headingFontSize ?? 22}px`,
                    fontWeight: design.headingFontWeight ?? 700,
                    letterSpacing: `${(design.headingLetterSpacing ?? 0) / 1000}em`,
                    textTransform: design.headingTextTransform ?? 'none',
                    color: design.headingColor,
                    lineHeight: 1.2,
                  }}
                >
                  Deine Überschrift in Aktion
                </div>
                <TypoControls
                  size={design.headingFontSize ?? 22}
                  sizeMin={14} sizeMax={40}
                  weight={design.headingFontWeight ?? 700}
                  transform={design.headingTextTransform ?? 'none'}
                  letterSpacing={design.headingLetterSpacing ?? 0}
                  primaryColor={design.primaryColor}
                  weightOptions={[300, 400, 500, 600, 700, 800]}
                  onSize={(v) => setDesign((d) => ({ ...d, headingFontSize: v }))}
                  onWeight={(v) => setDesign((d) => ({ ...d, headingFontWeight: v }))}
                  onTransform={(v) => setDesign((d) => ({ ...d, headingTextTransform: v }))}
                  onLetterSpacing={(v) => setDesign((d) => ({ ...d, headingLetterSpacing: v }))}
                />

                <div className="border-t border-slate-100" />

                <FontPicker
                  label="Fließtext"
                  fontName={design.bodyFontName}
                  customFontName={design.bodyFontCustomName}
                  customFontData={design.bodyFontData}
                  primaryColor={design.primaryColor}
                  onSelectFont={(name) => setDesign((d) => ({ ...d, bodyFontName: name, bodyFontCustomName: undefined, bodyFontData: undefined }))}
                  onUploadFont={(name, data) => setDesign((d) => ({ ...d, bodyFontName: name, bodyFontCustomName: name, bodyFontData: data }))}
                  onClearCustomFont={() => setDesign((d) => ({ ...d, bodyFontName: 'system', bodyFontCustomName: undefined, bodyFontData: undefined }))}
                />
                <div
                  className="px-4 py-5 rounded-xl bg-slate-50 border border-slate-100"
                  style={{
                    fontFamily: design.bodyFontData
                      ? `'${design.bodyFontName}', system-ui, sans-serif`
                      : fontFamilyFor(design.bodyFontName),
                    fontSize: `${design.bodyFontSize ?? 14}px`,
                    fontWeight: design.bodyFontWeight ?? 400,
                    letterSpacing: `${(design.bodyLetterSpacing ?? 0) / 1000}em`,
                    textTransform: design.bodyTextTransform ?? 'none',
                    color: design.textColor,
                    lineHeight: 1.55,
                  }}
                >
                  Hier siehst du, wie dein Fließtext in Karten und Funnels aussieht — mit deinen Einstellungen für Größe, Gewicht und Buchstabenabstand.
                </div>
                <TypoControls
                  size={design.bodyFontSize ?? 14}
                  sizeMin={12} sizeMax={20}
                  weight={design.bodyFontWeight ?? 400}
                  transform={design.bodyTextTransform ?? 'none'}
                  letterSpacing={design.bodyLetterSpacing ?? 0}
                  primaryColor={design.primaryColor}
                  weightOptions={[300, 400, 500, 600, 700]}
                  onSize={(v) => setDesign((d) => ({ ...d, bodyFontSize: v }))}
                  onWeight={(v) => setDesign((d) => ({ ...d, bodyFontWeight: v }))}
                  onTransform={(v) => setDesign((d) => ({ ...d, bodyTextTransform: v }))}
                  onLetterSpacing={(v) => setDesign((d) => ({ ...d, bodyLetterSpacing: v }))}
                />
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Palette size={17} className="text-slate-400" /> Farben
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <ColorPicker label="Hauptfarbe" desc="Header, Buttons, Progress-Bar" value={design.primaryColor} onChange={(v) => setDesign((d) => ({ ...d, primaryColor: v }))} />
                <ColorPicker label="Akzentfarbe" desc="Sekundäre Akzente" value={design.accentColor} onChange={(v) => setDesign((d) => ({ ...d, accentColor: v }))} />
                <ColorPicker label="Überschriften-Farbe" desc="Titel und Zwischenüberschriften" value={design.headingColor} onChange={(v) => setDesign((d) => ({ ...d, headingColor: v }))} />
                <ColorPicker label="Textfarbe" desc="Fließtext und Beschriftungen" value={design.textColor} onChange={(v) => setDesign((d) => ({ ...d, textColor: v }))} />
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <Globe size={17} className="text-slate-400" /> Favicon (Browser-Tab-Icon)
              </h2>
              <div className="flex items-center gap-4">
                {design.faviconUrl ? (
                  <div className="relative group flex-shrink-0">
                    <img src={design.faviconUrl} alt="Favicon" className="w-12 h-12 rounded-lg object-contain border border-slate-200 bg-white p-1 shadow-sm" />
                    <button type="button" onClick={() => setDesign((d) => ({ ...d, faviconUrl: undefined }))}
                      title="Favicon entfernen"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center shadow-sm transition opacity-0 group-hover:opacity-100">
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-300 flex-shrink-0">
                    <Globe size={16} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setLibraryFor('favicon')}
                  className="btn-secondary text-sm flex items-center gap-2 w-fit"
                >
                  <ImageIcon size={14} />
                  {design.faviconUrl ? 'Anderes Bild wählen' : 'Favicon aus Mediathek'}
                </button>
                <p className="text-xs text-slate-400 ml-auto max-w-[180px] text-right">Empfohlen: PNG oder ICO, 32×32 oder 64×64 px</p>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
                <SlidersHorizontal size={17} className="text-slate-400" /> Eckenrundung
              </h2>
              <div className="flex items-center gap-4 flex-wrap">
                <input type="range" min={0} max={32} value={design.borderRadius}
                  onChange={(e) => setDesign((d) => ({ ...d, borderRadius: Number(e.target.value) }))}
                  className="flex-1 min-w-[140px]" style={{ accentColor: design.primaryColor }} />
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input type="number" min={0} max={32} value={design.borderRadius}
                    onChange={(e) => setDesign((d) => ({ ...d, borderRadius: Math.min(32, Math.max(0, Number(e.target.value))) }))}
                    className="input-field w-16 text-center font-mono text-sm" />
                  <span className="text-sm text-slate-500">px</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="w-12 h-12 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400 font-medium flex-shrink-0 transition-all duration-200"
                    style={{ borderRadius: `${design.borderRadius}px` }}>Karte</div>
                  <span className="px-3 py-1.5 text-xs text-white font-semibold inline-block transition-all duration-200"
                    style={{ backgroundColor: design.primaryColor, borderRadius: `${design.borderRadius}px` }}>Button</span>
                  <span className="px-3 py-1.5 text-xs font-medium border-2 inline-block transition-all duration-200"
                    style={{ borderColor: design.primaryColor, color: design.primaryColor, borderRadius: `${design.borderRadius}px` }}>Option</span>
                </div>
              </div>
            </div>

          </div>
          <aside className="hidden lg:block lg:col-span-1">
            <div className="sticky top-6">
              <DesignPreview name={form.name || company.name} logo={form.logo || company.logo} design={design} />
            </div>
          </aside>
          {/* Mobile preview below controls */}
          <div className="lg:hidden mt-4">
            <DesignPreview name={form.name || company.name} logo={form.logo || company.logo} design={design} />
          </div>
          </div>
        )}

        {activeTab === 'success' && (
          <div className="space-y-5 max-w-3xl mx-auto">
            {/* Bestätigungstext */}
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Trophy size={17} className="text-slate-400" /> Bestätigungstext
              </h2>
              <div>
                <label className="label">Überschrift</label>
                <input type="text" className="input-field" value={successPage.headline}
                  onChange={(e) => setSuccessPage((s) => ({ ...s, headline: e.target.value }))} />
              </div>
              <div>
                <label className="label">Text</label>
                <textarea className="input-field resize-none" rows={2} value={successPage.text}
                  onChange={(e) => setSuccessPage((s) => ({ ...s, text: e.target.value }))} />
              </div>
            </div>

            {/* Ausbildungsberufe */}
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Ausbildungsberufe anzeigen</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={successPage.showJobs}
                    onChange={(e) => setSuccessPage((s) => ({ ...s, showJobs: e.target.checked }))}
                    className="w-4 h-4 rounded accent-violet-600" />
                  <span className="text-sm text-slate-600">Aktivieren</span>
                </label>
              </div>
              {successPage.showJobs && (
                <>
                  <div>
                    <label className="label">Überschrift</label>
                    <input type="text" className="input-field" value={successPage.jobsHeadline}
                      onChange={(e) => setSuccessPage((s) => ({ ...s, jobsHeadline: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    {successPage.jobs.map((job: SuccessJob) => (
                      <div key={job.id} className="flex gap-2">
                        <input type="text" className="input-field flex-1" placeholder="Berufsbezeichnung"
                          value={job.title} onChange={(e) => setSuccessPage((s) => ({ ...s, jobs: s.jobs.map((j) => j.id === job.id ? { ...j, title: e.target.value } : j) }))} />
                        <input type="url" className="input-field flex-1" placeholder="Link (optional)"
                          value={job.url ?? ''} onChange={(e) => setSuccessPage((s) => ({ ...s, jobs: s.jobs.map((j) => j.id === job.id ? { ...j, url: e.target.value || undefined } : j) }))} />
                        <button type="button" onClick={() => setSuccessPage((s) => ({ ...s, jobs: s.jobs.filter((j) => j.id !== job.id) }))}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button"
                      onClick={() => setSuccessPage((s) => ({ ...s, jobs: [...s.jobs, { id: crypto.randomUUID(), title: '', url: '' }] }))}
                      className="flex items-center gap-1.5 text-sm text-violet-600 font-medium hover:text-violet-700 mt-1">
                      <Plus size={15} /> Beruf hinzufügen
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* CTA-Links */}
            <div className="card p-6 space-y-4">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <ExternalLink size={17} className="text-slate-400" /> CTA-Links / Buttons
              </h2>
              <p className="text-xs text-slate-400">Bis zu 3 Buttons die auf der Erfolgsseite angezeigt werden.</p>
              <div className="space-y-2">
                {successPage.links.map((link: SuccessLink) => (
                  <div key={link.id} className="flex gap-2">
                    <input type="text" className="input-field flex-1" placeholder="Button-Beschriftung"
                      value={link.label} onChange={(e) => setSuccessPage((s) => ({ ...s, links: s.links.map((l) => l.id === link.id ? { ...l, label: e.target.value } : l) }))} />
                    <input type="url" className="input-field flex-1" placeholder="https://…"
                      value={link.url} onChange={(e) => setSuccessPage((s) => ({ ...s, links: s.links.map((l) => l.id === link.id ? { ...l, url: e.target.value } : l) }))} />
                    <button type="button" onClick={() => setSuccessPage((s) => ({ ...s, links: s.links.filter((l) => l.id !== link.id) }))}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {successPage.links.length < 3 && (
                  <button type="button"
                    onClick={() => setSuccessPage((s) => ({ ...s, links: [...s.links, { id: crypto.randomUUID(), label: '', url: '' }] }))}
                    className="flex items-center gap-1.5 text-sm text-violet-600 font-medium hover:text-violet-700 mt-1">
                    <Plus size={15} /> Link hinzufügen
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {saveError && (
          <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <span className="flex-shrink-0 mt-0.5">⚠️</span>
            <span>{saveError}</span>
          </div>
        )}

        {/* Sticky save bar */}
        <div className="sticky bottom-4 mt-6 z-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-white/90 backdrop-blur border border-slate-200 shadow-lg">
            <p className="text-xs text-slate-500 hidden sm:block">
              Änderungen am Corporate Design werden sofort auf alle veröffentlichten JobQuests angewendet.
            </p>
            <div className="flex items-center gap-3 ml-auto">
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle size={16} />
                  Gespeichert
                </span>
              )}
              <button type="submit" disabled={saving}
                className="btn-primary disabled:opacity-60"
                style={{ backgroundColor: design.primaryColor }}>
                <Save size={16} />
                {saving ? 'Speichern…' : 'Änderungen speichern'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function FontPicker({ label, fontName, customFontName, customFontData, primaryColor, onSelectFont, onUploadFont, onClearCustomFont }: {
  label: string; fontName: string; customFontName?: string; customFontData?: string; primaryColor: string;
  onSelectFont: (name: string) => void; onUploadFont: (name: string, data: string) => void; onClearCustomFont: () => void;
}) {
  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    const reader = new FileReader();
    reader.onload = () => onUploadFont(name, reader.result as string);
    reader.readAsDataURL(file);
  }
  const isCustomActive = !!customFontData;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <select
          value={isCustomActive ? '' : fontName}
          onChange={(e) => onSelectFont(e.target.value)}
          disabled={isCustomActive}
          className="input-field flex-1"
          style={{ fontFamily: isCustomActive ? undefined : fontFamilyFor(fontName), borderColor: isCustomActive ? undefined : primaryColor + '40' }}
        >
          {(['sans', 'condensed', 'serif', 'display'] as const).map((cat) => {
            const opts = FONT_OPTIONS.filter((f) => f.category === cat);
            const groupLabel = cat === 'sans' ? 'Sans-Serif' : cat === 'condensed' ? 'Schmal / Condensed' : cat === 'serif' ? 'Serif' : 'Display';
            return (
              <optgroup key={cat} label={groupLabel}>
                {opts.map((font) => (
                  <option key={font.value} value={font.value} style={{ fontFamily: font.cssFamily }}>
                    {font.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <div
          className="flex-shrink-0 w-16 h-10 rounded-lg border-2 flex items-center justify-center bg-white text-xl font-bold text-slate-900"
          style={{ fontFamily: isCustomActive ? `'${customFontName}', system-ui, sans-serif` : fontFamilyFor(fontName), borderColor: primaryColor + '40' }}
        >
          Aa
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-300 bg-white cursor-pointer text-xs text-slate-600 transition-all">
          <Upload size={12} />
          Eigene Schriftart hochladen
          <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleUpload} className="hidden" />
        </label>
        {isCustomActive && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg border-2"
              style={{ borderColor: primaryColor, color: primaryColor, backgroundColor: primaryColor + '12' }}>
              {customFontName} ✓
            </span>
            <button type="button" onClick={onClearCustomFont} className="text-xs text-red-500 hover:text-red-700">Entfernen</button>
          </div>
        )}
      </div>
    </div>
  );
}

function RequiredMark() {
  return <span className="text-violet-500" aria-label="Pflichtfeld">*</span>;
}

function AutoTextarea({
  value, onChange, placeholder, minRows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
  useEffect(() => { resize(); }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange(e.target.value); }}
      onInput={resize}
      placeholder={placeholder}
      rows={minRows}
      className="input-field resize-none overflow-hidden leading-relaxed"
    />
  );
}

function TypoControls({
  size, sizeMin, sizeMax, weight, transform, letterSpacing, primaryColor, weightOptions,
  onSize, onWeight, onTransform, onLetterSpacing,
}: {
  size: number; sizeMin: number; sizeMax: number;
  weight: number;
  transform: 'none' | 'uppercase';
  letterSpacing: number;
  primaryColor: string;
  weightOptions: number[];
  onSize: (v: number) => void;
  onWeight: (v: number) => void;
  onTransform: (v: 'none' | 'uppercase') => void;
  onLetterSpacing: (v: number) => void;
}) {
  const weightLabels: Record<number, string> = {
    300: 'Leicht (300)', 400: 'Normal (400)', 500: 'Medium (500)',
    600: 'Halbfett (600)', 700: 'Fett (700)', 800: 'Extra fett (800)',
  };
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Größe</label>
        <div className="flex items-center gap-2">
          <input type="range" min={sizeMin} max={sizeMax} value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            className="flex-1" style={{ accentColor: primaryColor }} />
          <span className="text-xs text-slate-500 font-mono w-10 text-right flex-shrink-0">{size}px</span>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Gewicht</label>
        <select value={weight}
          onChange={(e) => onWeight(Number(e.target.value))}
          className="input-field text-xs w-full">
          {weightOptions.map((w) => <option key={w} value={w}>{weightLabels[w] ?? String(w)}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Schreibweise</label>
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
          <button type="button" title="Normalschrift"
            onClick={() => onTransform('none')}
            className={`flex-1 py-1.5 transition-colors ${transform === 'none' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>Aa</button>
          <button type="button" title="GROSSBUCHSTABEN"
            onClick={() => onTransform('uppercase')}
            className={`flex-1 py-1.5 transition-colors ${transform === 'uppercase' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>AA</button>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Buchstabenabstand</label>
        <div className="flex items-center gap-2">
          <input type="range" min={-50} max={200} step={5} value={letterSpacing}
            onChange={(e) => onLetterSpacing(Number(e.target.value))}
            className="flex-1" style={{ accentColor: primaryColor }} />
          <span className="text-xs text-slate-500 font-mono w-12 text-right flex-shrink-0">{(letterSpacing / 1000).toFixed(2)}em</span>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({ label, desc, value, onChange }: { label: string; desc: string; value: string; onChange: (v: string) => void }) {
  const colorRef = useRef<HTMLInputElement>(null);
  function handleHexChange(raw: string) {
    let v = raw.trim();
    if (v && !v.startsWith('#')) v = '#' + v;
    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
  }
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-700">{label}</label>
        <span className="text-[10px] text-slate-400 truncate ml-2">{desc}</span>
      </div>
      <div className="flex items-stretch rounded-lg border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-violet-200 focus-within:border-violet-300 transition">
        <button
          type="button"
          onClick={() => colorRef.current?.click()}
          aria-label={`${label} ändern`}
          className="w-11 flex-shrink-0 cursor-pointer relative border-r border-slate-200"
          style={{ backgroundColor: value }}
        >
          <input
            ref={colorRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </button>
        <input
          type="text"
          value={value}
          onChange={(e) => handleHexChange(e.target.value)}
          className="flex-1 min-w-0 px-3 font-mono text-sm text-slate-700 outline-none bg-transparent"
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function DesignPreview({ name, logo, design }: { name: string; logo?: string; design: CorporateDesign }) {
  const headingFont = design.headingFontData
    ? `'${design.headingFontName}', system-ui, sans-serif`
    : fontFamilyFor(design.headingFontName);
  const bodyFont = design.bodyFontData
    ? `'${design.bodyFontName}', system-ui, sans-serif`
    : fontFamilyFor(design.bodyFontName);
  const br = `${design.borderRadius}px`;
  return (
    <div className="card p-6">
      <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
        <Globe size={17} className="text-slate-400" /> Live-Vorschau
        <span className="text-xs font-normal text-slate-400 ml-1">So sieht deine öffentliche JobQuest aus</span>
      </h2>
      {design.headingFontData && <style>{`@font-face{font-family:'${design.headingFontName}';src:url('${design.headingFontData}')}`}</style>}
      {design.bodyFontData && <style>{`@font-face{font-family:'${design.bodyFontName}';src:url('${design.bodyFontData}')}`}</style>}
      <div className="max-w-xs mx-auto rounded-2xl overflow-hidden shadow-lg border border-slate-200" style={{ fontFamily: bodyFont, color: design.textColor, letterSpacing: `${(design.bodyLetterSpacing ?? 0) / 1000}em` }}>
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: design.primaryColor }}>
          {logo ? <img src={logo} alt={name} className="h-8 w-auto max-w-[100px] rounded-lg object-contain bg-white/20 p-0.5" />
            : <div className="w-8 h-8 rounded-lg bg-white/25 flex items-center justify-center font-bold text-white text-sm">{name.charAt(0) || 'J'}</div>}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">Meine JobQuest</p>
            <p className="text-white/70 text-xs">{name || 'Dein Unternehmen'}</p>
          </div>
          <span className="text-white/60 text-xs">1 / 5</span>
        </div>
        <div className="h-1 bg-slate-200"><div className="h-1 w-1/4" style={{ backgroundColor: design.primaryColor }} /></div>
        <div className="bg-slate-50 p-4 space-y-3">
          <div className="bg-white p-4 shadow-sm" style={{ borderRadius: br }}>
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: design.primaryColor }}>🌄 Szene</span>
            <p className="font-semibold mt-1 text-sm" style={{ fontFamily: headingFont, color: design.headingColor, letterSpacing: `${(design.headingLetterSpacing ?? 0) / 1000}em` }}>Ein Tag im Betrieb</p>
            <p className="text-xs mt-1 opacity-60">Erlebe einen typischen Arbeitstag bei uns…</p>
          </div>
          <div className="bg-white p-3 shadow-sm space-y-2" style={{ borderRadius: br }}>
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: design.primaryColor }}>❓ Quiz</span>
            <p className="text-sm font-medium" style={{ fontFamily: headingFont, color: design.headingColor, letterSpacing: `${(design.headingLetterSpacing ?? 0) / 1000}em` }}>Was ist dir wichtig?</p>
            <div className="space-y-1.5">
              <div className="border-2 px-3 py-2 text-xs font-medium"
                style={{ borderColor: design.primaryColor, color: design.primaryColor, backgroundColor: design.primaryColor + '12', borderRadius: br }}>Teamarbeit ✓</div>
              <div className="border-2 border-slate-200 px-3 py-2 text-xs opacity-50" style={{ borderRadius: br }}>Eigenverantwortung</div>
            </div>
          </div>
        </div>
        <div className="bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-between">
          <span className="text-xs opacity-40">← Zurück</span>
          <button className="flex items-center gap-1.5 px-4 py-2 text-xs text-white font-semibold"
            style={{ backgroundColor: design.primaryColor, borderRadius: br }}>Weiter →</button>
        </div>
      </div>
      <div className="flex justify-center gap-6 mt-3 text-xs text-slate-400">
        <span>Überschrift: <span className="font-medium text-slate-600" style={{ fontFamily: headingFont }}>
          {design.headingFontData ? design.headingFontCustomName : (FONT_OPTIONS.find((f) => f.value === design.headingFontName)?.label ?? design.headingFontName)}
        </span></span>
        <span>Fließtext: <span className="font-medium text-slate-600" style={{ fontFamily: bodyFont }}>
          {design.bodyFontData ? design.bodyFontCustomName : (FONT_OPTIONS.find((f) => f.value === design.bodyFontName)?.label ?? design.bodyFontName)}
        </span></span>
      </div>
    </div>
  );
}

// ─── Logo crop modal ──────────────────────────────────────────────────────────
// LogoCropModal moved to components/shared/ImageCropModal.tsx for reuse.
