'use client';

import { useState, FormEvent, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { INDUSTRY_OPTIONS, CorporateDesign, DEFAULT_CORPORATE_DESIGN } from '@/lib/types';
import { Building2, Save, CheckCircle, Palette, Type, Globe, Upload, SlidersHorizontal, Link2 } from 'lucide-react';

const FONT_OPTIONS = [
  { label: 'Standard (System)', value: 'system', preview: 'system-ui, sans-serif' },
  { label: 'Inter', value: 'Inter', preview: "'Inter', sans-serif" },
  { label: 'Roboto', value: 'Roboto', preview: "'Roboto', sans-serif" },
  { label: 'Montserrat', value: 'Montserrat', preview: "'Montserrat', sans-serif" },
  { label: 'Poppins', value: 'Poppins', preview: "'Poppins', sans-serif" },
  { label: 'Nunito', value: 'Nunito', preview: "'Nunito', sans-serif" },
  { label: 'Open Sans', value: 'Open Sans', preview: "'Open Sans', sans-serif" },
  { label: 'Playfair Display', value: 'Playfair Display', preview: "'Playfair Display', serif" },
];

type Tab = 'company' | 'design';

export default function SettingsCompanyPage() {
  const { company, updateCompany, can } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!can('edit_company')) {
      router.replace('/dashboard');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>('company');
  const cd = company?.corporateDesign ?? DEFAULT_CORPORATE_DESIGN;

  const [form, setForm] = useState({
    name: company?.name || '',
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
    bodyFontName: cd.bodyFontName ?? DEFAULT_CORPORATE_DESIGN.bodyFontName,
    bodyFontCustomName: cd.bodyFontCustomName,
    bodyFontData: cd.bodyFontData,
    bodyFontSize: cd.bodyFontSize ?? DEFAULT_CORPORATE_DESIGN.bodyFontSize,
    bodyFontWeight: cd.bodyFontWeight ?? DEFAULT_CORPORATE_DESIGN.bodyFontWeight,
    bodyTextTransform: cd.bodyTextTransform ?? 'none',
  });

  useEffect(() => {
    FONT_OPTIONS.filter((f) => f.value !== 'system').forEach((f) => {
      const id = `gfont-${f.value.replace(/ /g, '-')}`;
      if (document.getElementById(id)) return;
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${f.value.replace(/ /g, '+')}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(link);
    });
  }, []);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company) return;
    updateCompany({ ...company, name: form.name, industry: form.industry, location: form.location, logo: form.logo || undefined, privacyUrl: form.privacyUrl, imprintUrl: form.imprintUrl, careerPageUrl: form.careerPageUrl || undefined, corporateDesign: design });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!company) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'company', label: 'Firmendaten', icon: <Building2 size={15} /> },
    { id: 'design', label: 'Corporate Design', icon: <Palette size={15} /> },
  ];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {cropSrc && (
        <LogoCropModal
          src={cropSrc}
          onConfirm={(base64) => { handleChange('logo', base64); setCropSrc(null); }}
          onCancel={() => setCropSrc(null)}
        />
      )}
      <div className="flex items-center gap-4 mb-8">
        {form.logo ? (
          <img src={form.logo} alt="Logo" className="h-14 w-14 rounded-2xl object-contain border border-slate-200 p-1 bg-white shadow-sm" />
        ) : (
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-sm"
            style={{ backgroundColor: design.primaryColor }}>
            {form.name.charAt(0) || 'J'}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{form.name || 'Firmenprofil'}</h1>
          <p className="text-slate-500 text-sm mt-0.5">Firmenprofil &amp; Corporate Design verwalten</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
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
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-slate-900 mb-1">Unternehmensdaten</h2>
            <div>
              <label className="label">Firmenname *</label>
              <input type="text" className="input-field" value={form.name}
                onChange={(e) => handleChange('name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Branche *</label>
                <select className="input-field" value={form.industry}
                  onChange={(e) => handleChange('industry', e.target.value)} required>
                  <option value="">Bitte wählen</option>
                  {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Standort *</label>
                <input type="text" className="input-field" value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="label">Firmenlogo</label>
              <div className="flex items-center gap-3">
                {form.logo && (
                  <img src={form.logo} alt="Logo" className="h-10 w-10 rounded-lg object-contain border border-slate-200 p-0.5" />
                )}
                <input type="file" accept="image/*" onChange={handleLogoChange}
                  className="block text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                {form.logo && (
                  <button type="button" onClick={() => handleChange('logo', '')}
                    className="text-xs text-red-500 hover:text-red-700">
                    Entfernen
                  </button>
                )}
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-3 text-sm">
                <Link2 size={14} className="text-slate-400" /> Links
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="label">Karriereseite-URL</label>
                  <input type="url" className="input-field" placeholder="https://www.firma.de/karriere"
                    value={form.careerPageUrl} onChange={(e) => handleChange('careerPageUrl', e.target.value)} />
                  <p className="text-xs text-slate-400 mt-1">Als <code className="bg-slate-100 px-1 rounded text-[11px]">@karriereseiteUrl</code> in E-Mail-Vorlagen verfügbar.</p>
                </div>
                <div>
                  <label className="label">Datenschutz-URL</label>
                  <input type="url" className="input-field" placeholder="https://www.firma.de/datenschutz"
                    value={form.privacyUrl} onChange={(e) => handleChange('privacyUrl', e.target.value)} />
                  <p className="text-xs text-slate-400 mt-1">Wird im Footer aller öffentlichen Seiten verlinkt.</p>
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
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-5">
                <Type size={17} className="text-slate-400" /> Schriftarten
              </h2>
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
                <div className="grid grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Größe</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min={14} max={40} value={design.headingFontSize ?? 22}
                        onChange={(e) => setDesign((d) => ({ ...d, headingFontSize: Number(e.target.value) }))}
                        className="flex-1" style={{ accentColor: design.primaryColor }} />
                      <span className="text-xs text-slate-500 font-mono w-10 text-right flex-shrink-0">{design.headingFontSize ?? 22}px</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Gewicht</label>
                    <select value={design.headingFontWeight ?? 700}
                      onChange={(e) => setDesign((d) => ({ ...d, headingFontWeight: Number(e.target.value) }))}
                      className="input-field text-xs w-full">
                      <option value={300}>Leicht (300)</option>
                      <option value={400}>Normal (400)</option>
                      <option value={500}>Medium (500)</option>
                      <option value={600}>Halbfett (600)</option>
                      <option value={700}>Fett (700)</option>
                      <option value={800}>Extra fett (800)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Schreibweise</label>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                      {(['none', 'uppercase'] as const).map((val) => (
                        <button key={val} type="button"
                          onClick={() => setDesign((d) => ({ ...d, headingTextTransform: val }))}
                          className={`flex-1 py-1.5 transition-colors ${(design.headingTextTransform ?? 'none') === val ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                          {val === 'none' ? 'Aa' : 'AA'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

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
                <div className="grid grid-cols-3 gap-4 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Größe</label>
                    <div className="flex items-center gap-2">
                      <input type="range" min={12} max={20} value={design.bodyFontSize ?? 14}
                        onChange={(e) => setDesign((d) => ({ ...d, bodyFontSize: Number(e.target.value) }))}
                        className="flex-1" style={{ accentColor: design.primaryColor }} />
                      <span className="text-xs text-slate-500 font-mono w-10 text-right flex-shrink-0">{design.bodyFontSize ?? 14}px</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Gewicht</label>
                    <select value={design.bodyFontWeight ?? 400}
                      onChange={(e) => setDesign((d) => ({ ...d, bodyFontWeight: Number(e.target.value) }))}
                      className="input-field text-xs w-full">
                      <option value={300}>Leicht (300)</option>
                      <option value={400}>Normal (400)</option>
                      <option value={500}>Medium (500)</option>
                      <option value={600}>Halbfett (600)</option>
                      <option value={700}>Fett (700)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Schreibweise</label>
                    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
                      {(['none', 'uppercase'] as const).map((val) => (
                        <button key={val} type="button"
                          onClick={() => setDesign((d) => ({ ...d, bodyTextTransform: val }))}
                          className={`flex-1 py-1.5 transition-colors ${(design.bodyTextTransform ?? 'none') === val ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                          {val === 'none' ? 'Aa' : 'AA'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
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
                <SlidersHorizontal size={17} className="text-slate-400" /> Eckenrundung
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input type="range" min={0} max={32} value={design.borderRadius}
                    onChange={(e) => setDesign((d) => ({ ...d, borderRadius: Number(e.target.value) }))}
                    className="flex-1" style={{ accentColor: design.primaryColor }} />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input type="number" min={0} max={32} value={design.borderRadius}
                      onChange={(e) => setDesign((d) => ({ ...d, borderRadius: Math.min(32, Math.max(0, Number(e.target.value))) }))}
                      className="input-field w-16 text-center font-mono text-sm" />
                    <span className="text-sm text-slate-500">px</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1 flex-wrap">
                  <div className="w-20 h-20 bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-medium flex-shrink-0 transition-all duration-200"
                    style={{ borderRadius: `${design.borderRadius}px` }}>Karte</div>
                  <div className="flex flex-col gap-2">
                    <span className="px-5 py-2 text-xs text-white font-semibold inline-block transition-all duration-200"
                      style={{ backgroundColor: design.primaryColor, borderRadius: `${design.borderRadius}px` }}>Button</span>
                    <span className="px-3 py-1.5 text-xs font-medium border-2 inline-block transition-all duration-200"
                      style={{ borderColor: design.primaryColor, color: design.primaryColor, borderRadius: `${design.borderRadius}px` }}>Option</span>
                  </div>
                  <span className="text-2xl font-mono font-bold text-slate-300 ml-auto">{design.borderRadius}px</span>
                </div>
              </div>
            </div>

            <DesignPreview name={form.name || company.name} logo={form.logo || company.logo} design={design} />
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button type="submit" className="btn-primary" style={{ backgroundColor: design.primaryColor }}>
            <Save size={16} />
            Änderungen speichern
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <CheckCircle size={16} />
              Gespeichert!
            </span>
          )}
        </div>
      </form>

      <p className="mt-4 text-xs text-slate-400">
        Änderungen am Corporate Design werden sofort auf alle veröffentlichten JobQuests angewendet.
      </p>
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FONT_OPTIONS.map((font) => {
          const isActive = fontName === font.value && !isCustomActive;
          return (
            <button key={font.value} type="button" onClick={() => onSelectFont(font.value)}
              className={`p-2.5 rounded-xl border-2 text-left transition-all ${isActive ? '' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
              style={isActive ? { borderColor: primaryColor, backgroundColor: primaryColor + '12' } : {}}>
              <p className="text-lg font-bold text-slate-900 leading-none mb-1" style={{ fontFamily: font.preview }}>Aa</p>
              <p className="text-xs text-slate-500 truncate">{font.label}</p>
              {isActive && <span className="text-xs font-semibold mt-0.5 block" style={{ color: primaryColor }}>✓</span>}
            </button>
          );
        })}
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

function ColorPicker({ label, desc, value, onChange }: { label: string; desc: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white flex-shrink-0" />
        <input type="text" value={value}
          onChange={(e) => { const v = e.target.value; if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v); }}
          className="input-field font-mono text-sm" maxLength={7} />
      </div>
      <p className="text-xs text-slate-400 mt-1">{desc}</p>
    </div>
  );
}

function DesignPreview({ name, logo, design }: { name: string; logo?: string; design: CorporateDesign }) {
  const headingFont = design.headingFontData ? `'${design.headingFontName}', system-ui, sans-serif`
    : design.headingFontName === 'system' ? 'system-ui, -apple-system, sans-serif'
    : `'${design.headingFontName}', sans-serif`;
  const bodyFont = design.bodyFontData ? `'${design.bodyFontName}', system-ui, sans-serif`
    : design.bodyFontName === 'system' ? 'system-ui, -apple-system, sans-serif'
    : `'${design.bodyFontName}', sans-serif`;
  const br = `${design.borderRadius}px`;
  return (
    <div className="card p-6">
      <h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
        <Globe size={17} className="text-slate-400" /> Live-Vorschau
        <span className="text-xs font-normal text-slate-400 ml-1">So sieht deine öffentliche JobQuest aus</span>
      </h2>
      {design.headingFontData && <style>{`@font-face{font-family:'${design.headingFontName}';src:url('${design.headingFontData}')}`}</style>}
      {design.bodyFontData && <style>{`@font-face{font-family:'${design.bodyFontName}';src:url('${design.bodyFontData}')}`}</style>}
      <div className="max-w-xs mx-auto rounded-2xl overflow-hidden shadow-lg border border-slate-200" style={{ fontFamily: bodyFont, color: design.textColor }}>
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: design.primaryColor }}>
          {logo ? <img src={logo} alt={name} className="h-8 w-8 rounded-lg object-contain bg-white/20 p-0.5" />
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
            <p className="font-semibold mt-1 text-sm" style={{ fontFamily: headingFont, color: design.headingColor }}>Ein Tag im Betrieb</p>
            <p className="text-xs mt-1 opacity-60">Erlebe einen typischen Arbeitstag bei uns…</p>
          </div>
          <div className="bg-white p-3 shadow-sm space-y-2" style={{ borderRadius: br }}>
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: design.primaryColor }}>❓ Quiz</span>
            <p className="text-sm font-medium" style={{ fontFamily: headingFont, color: design.headingColor }}>Was ist dir wichtig?</p>
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
function LogoCropModal({ src, onConfirm, onCancel }: {
  src: string;
  onConfirm: (base64: string) => void;
  onCancel: () => void;
}) {
  const PREVIEW = 280;
  const imgRef = useRef<HTMLImageElement>(null);
  const [natW, setNatW] = useState(0);
  const [natH, setNatH] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [ox, setOx] = useState(0.5);
  const [oy, setOy] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const [last, setLast] = useState({ x: 0, y: 0 });

  function onLoad() {
    const img = imgRef.current!;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setNatW(nw);
    setNatH(nh);
    const aspect = nw / nh;
    setZoom(Math.max(aspect >= 1 ? aspect : 1 / aspect, 1));
  }

  const aspect = natW && natH ? natW / natH : 1;
  let dw: number, dh: number;
  if (aspect >= 1) {
    dw = PREVIEW * zoom;
    dh = dw / aspect;
  } else {
    dh = PREVIEW * zoom;
    dw = dh * aspect;
  }
  const ovx = Math.max(0, dw - PREVIEW);
  const ovy = Math.max(0, dh - PREVIEW);
  const imgL = -(ovx * ox);
  const imgT = -(ovy * oy);

  function onDown(e: React.MouseEvent) {
    setDragging(true);
    setLast({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  }
  function onMove(e: React.MouseEvent) {
    if (!dragging) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    setLast({ x: e.clientX, y: e.clientY });
    if (ovx > 0) setOx((v) => Math.max(0, Math.min(1, v - dx / ovx)));
    if (ovy > 0) setOy((v) => Math.max(0, Math.min(1, v - dy / ovy)));
  }
  function onUp() { setDragging(false); }

  function handleConfirm() {
    const img = imgRef.current;
    if (!img || !natW) return;
    const scaleX = natW / dw;
    const scaleY = natH / dh;
    const sx = Math.max(0, (-imgL) * scaleX);
    const sy = Math.max(0, (-imgT) * scaleY);
    const sw = Math.min(PREVIEW * scaleX, natW - sx);
    const sh = Math.min(PREVIEW * scaleY, natH - sy);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 400, 400);
    onConfirm(canvas.toDataURL('image/png'));
  }

  const maxZoom = Math.max(4, aspect >= 1 ? aspect * 2 : (1 / aspect) * 2);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl">
        <h3 className="font-semibold text-slate-900 mb-4 text-center text-base">Logo zuschneiden</h3>

        {/* Crop viewport */}
        <div
          className="relative overflow-hidden mx-auto rounded-xl select-none"
          style={{ width: PREVIEW, height: PREVIEW, cursor: dragging ? 'grabbing' : 'grab', background: '#e2e8f0' }}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
        >
          { }
          <img
            ref={imgRef}
            src={src}
            alt=""
            onLoad={onLoad}
            draggable={false}
            style={{ position: 'absolute', width: dw, height: dh, left: imgL, top: imgT, pointerEvents: 'none' }}
          />
          {/* Rule-of-thirds grid */}
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: `${PREVIEW / 3}px ${PREVIEW / 3}px`,
          }} />
          <div className="absolute inset-0 rounded-xl ring-2 ring-white pointer-events-none" />
        </div>

        {/* Zoom */}
        <div className="mt-4 px-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Zoom</span>
            <span className="text-xs text-slate-400 font-mono">{zoom.toFixed(1)}×</span>
          </div>
          <input type="range" min={1} max={maxZoom} step={0.01} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-violet-600" />
        </div>
        <p className="text-[11px] text-slate-400 text-center mt-2">Bild verschieben + Zoom anpassen, dann bestätigen</p>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition-colors">
            Abbrechen
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
