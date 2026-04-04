'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { questStorage, leadStorage, careerCheckStorage, careerCheckLeadStorage, formPageStorage, formSubmissionStorage } from '@/lib/storage';
import { JobQuest, CareerCheck, FormPage, DEFAULT_FORM_CONFIG } from '@/lib/types';
import { generateSlug, formatDateShort } from '@/lib/utils';
import { useContentList } from '@/hooks/useContentList';
import { useToast } from '@/components/ui/Toast';
import {
  Plus,
  Edit2,
  Eye,
  BarChart2,
  Copy,
  Trash2,
  Users,
  Globe,
  FileText,
  Search,
  SortAsc,
  CheckSquare,
  ClipboardList,
  Link2,
  Check,
  AlertTriangle,
} from 'lucide-react';

type ActiveTab = 'jobquests' | 'berufschecks' | 'formulare';

export default function DashboardPage() {
  const { company, can } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>('jobquests');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated');

  const questList = useContentList<JobQuest>({
    storage: questStorage,
    getCount: (id) => leadStorage.getByQuest(id).then((l) => l.length),
  });
  const checkList = useContentList<CareerCheck>({
    storage: careerCheckStorage,
    getCount: (id) => careerCheckLeadStorage.getByCheck(id).then((l) => l.length),
  });
  const formList = useContentList<FormPage>({
    storage: formPageStorage,
    getCount: (id) => formSubmissionStorage.getByForm(id).then((s) => s.length),
  });

  useEffect(() => {
    if (!company) return;
    questList.reload();
    checkList.reload();
    formList.reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  useEffect(() => { setSearch(''); }, [activeTab]);

  async function handleCreateQuest() {
    if (!company) return;
    try {
      const id = crypto.randomUUID();
      const newQuest: JobQuest = {
        id, companyId: company.id, title: 'Neue JobQuest',
        slug: generateSlug('neue-jobquest'), status: 'draft', modules: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await questStorage.save(newQuest);
      router.push(`/editor/${id}`);
    } catch (err) {
      console.error('[createQuest]', err);
      toast.error(`JobQuest konnte nicht erstellt werden: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleCreateCheck() {
    if (!company) return;
    try {
      const id = crypto.randomUUID();
      const newCheck: CareerCheck = {
        id, companyId: company.id, title: 'Neuer Berufscheck',
        slug: generateSlug('neuer-berufscheck'), status: 'draft', blocks: [], dimensions: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await careerCheckStorage.save(newCheck);
      router.push(`/berufscheck-editor/${id}`);
    } catch {
      toast.error('Berufscheck konnte nicht erstellt werden. Bitte erneut versuchen.');
    }
  }

  async function handleCreateForm() {
    if (!company) return;
    try {
      const id = crypto.randomUUID();
      const newForm: FormPage = {
        id, companyId: company.id, title: 'Neues Formular',
        slug: generateSlug('neues-formular'), status: 'draft',
        contentBlocks: [], formSteps: [], formConfig: DEFAULT_FORM_CONFIG,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await formPageStorage.save(newForm);
      router.push(`/formular-editor/${id}`);
    } catch {
      toast.error('Formular konnte nicht erstellt werden. Bitte erneut versuchen.');
    }
  }

  // ── Filtered lists ────────────────────────────────────────────────────────
  function sortItems<T extends { title: string; createdAt: string; updatedAt: string }>(items: T[]) {
    return [...items]
      .filter((i) => i.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'created') return b.createdAt.localeCompare(a.createdAt);
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }

  const filteredQuests = sortItems(questList.items);
  const filteredChecks = sortItems(checkList.items);
  const filteredForms = sortItems(formList.items);

  const publishedQuestCount = questList.items.filter((q) => q.status === 'published').length;
  const publishedCheckCount = checkList.items.filter((c) => c.status === 'published').length;
  const publishedFormCount = formList.items.filter((f) => f.status === 'published').length;
  const totalLeads = Object.values(questList.counts).reduce((a, b) => a + b, 0)
    + Object.values(checkList.counts).reduce((a, b) => a + b, 0)
    + Object.values(formList.counts).reduce((a, b) => a + b, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Verwalte deine Inhalte und analysiere Ergebnisse</p>
        </div>
        {can('create_content') && (
          <div className="flex items-center gap-2">
            {activeTab === 'jobquests' ? (
              <button onClick={handleCreateQuest} className="btn-primary">
                <Plus size={16} />
                Neue JobQuest
              </button>
            ) : activeTab === 'berufschecks' ? (
              <button onClick={handleCreateCheck} className="btn-primary">
                <Plus size={16} />
                Neuer Berufscheck
              </button>
            ) : (
              <button onClick={handleCreateForm} className="btn-primary">
                <Plus size={16} />
                Neues Formular
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'JobQuests', value: questList.items.length, icon: FileText, color: 'violet', tab: 'jobquests' as ActiveTab },
          { label: 'Berufschecks', value: checkList.items.length, icon: CheckSquare, color: 'indigo', tab: 'berufschecks' as ActiveTab },
          { label: 'Formulare', value: formList.items.length, icon: ClipboardList, color: 'emerald', tab: 'formulare' as ActiveTab },
          { label: 'Kontakte gesamt', value: totalLeads, icon: Users, color: 'blue', tab: null },
        ].map(({ label, value, icon: Icon, color, tab }) => {
          const inner = (
            <>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                color === 'violet' ? 'bg-violet-100' :
                color === 'indigo' ? 'bg-indigo-100' :
                color === 'emerald' ? 'bg-emerald-100' : 'bg-blue-100'
              }`}>
                <Icon size={20} className={
                  color === 'violet' ? 'text-violet-600' :
                  color === 'indigo' ? 'text-indigo-600' :
                  color === 'emerald' ? 'text-emerald-600' : 'text-blue-600'
                } />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-sm text-slate-500">{label}</p>
              </div>
            </>
          );
          if (tab) {
            return (
              <button key={label} onClick={() => setActiveTab(tab)}
                className="card p-5 flex items-center gap-4 text-left hover:shadow-md transition-shadow cursor-pointer w-full">
                {inner}
              </button>
            );
          }
          return (
            <Link key={label} href="/leads" className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
              {inner}
            </Link>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('jobquests')}
          className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'jobquests'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          JobQuests
          {publishedQuestCount > 0 && (
            <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
              {publishedQuestCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('berufschecks')}
          className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'berufschecks'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Checks
          {publishedCheckCount > 0 && (
            <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
              {publishedCheckCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('formulare')}
          className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'formulare'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Formulare
          {publishedFormCount > 0 && (
            <span className="ml-1.5 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">
              {publishedFormCount}
            </span>
          )}
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
            activeTab === 'jobquests' ? 'JobQuests durchsuchen…' :
            activeTab === 'berufschecks' ? 'Berufschecks durchsuchen…' :
            'Formulare durchsuchen…'
          }
            className="input-field pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <SortAsc size={15} className="text-slate-400" />
          <select
            className="input-field w-auto"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="updated">Zuletzt aktualisiert</option>
            <option value="created">Erstellungsdatum</option>
            <option value="title">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'jobquests' ? (
        <QuestList
          quests={filteredQuests}
          allQuests={questList.items}
          leadCounts={questList.counts}
          setDeleteConfirm={questList.setDeleteConfirm}
          onDuplicate={questList.handleDuplicate}
          onCreate={handleCreateQuest}
          search={search}
          canCreate={can('create_content')}
          canDelete={can('delete_content')}
        />
      ) : activeTab === 'berufschecks' ? (
        <CheckList
          checks={filteredChecks}
          allChecks={checkList.items}
          leadCounts={checkList.counts}
          setDeleteConfirm={checkList.setDeleteConfirm}
          onDuplicate={checkList.handleDuplicate}
          onCreate={handleCreateCheck}
          search={search}
          canCreate={can('create_content')}
          canDelete={can('delete_content')}
        />
      ) : (
        <FormList
          forms={filteredForms}
          allForms={formList.items}
          submissionCounts={formList.counts}
          setDeleteConfirm={formList.setDeleteConfirm}
          onDuplicate={formList.handleDuplicate}
          onCreate={handleCreateForm}
          search={search}
          canCreate={can('create_content')}
          canDelete={can('delete_content')}
        />
      )}

      {/* Delete confirmation modals */}
      {questList.deleteConfirm && (
        <DeleteConfirmModal
          title={questList.deleteConfirm.title}
          onConfirm={() => questList.handleDelete(questList.deleteConfirm!.id)}
          onCancel={() => questList.setDeleteConfirm(null)}
        />
      )}
      {checkList.deleteConfirm && (
        <DeleteConfirmModal
          title={checkList.deleteConfirm.title}
          onConfirm={() => checkList.handleDelete(checkList.deleteConfirm!.id)}
          onCancel={() => checkList.setDeleteConfirm(null)}
        />
      )}
      {formList.deleteConfirm && (
        <DeleteConfirmModal
          title={formList.deleteConfirm.title}
          onConfirm={() => formList.handleDelete(formList.deleteConfirm!.id)}
          onCancel={() => formList.setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteConfirmModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-1">Unwiderruflich löschen?</h2>
            <p className="text-sm text-slate-600">
              <span className="font-medium">&ldquo;{title}&rdquo;</span> wird permanent gelöscht.
              Alle zugehörigen Kontakte werden ebenfalls unwiderruflich entfernt.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Endgültig löschen
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Copy link button ──────────────────────────────────────────────────────────
function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}${path}`).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      title="Link kopieren">
      {copied ? <Check size={14} className="text-green-600" /> : <Link2 size={14} />}
    </button>
  );
}

// ── JobQuest list ─────────────────────────────────────────────────────────────
function QuestList({
  quests, allQuests, leadCounts, setDeleteConfirm,
  onDuplicate, onCreate, search, canCreate, canDelete,
}: {
  quests: JobQuest[];
  allQuests: JobQuest[];
  leadCounts: Record<string, number>;
  setDeleteConfirm: (value: { id: string; title: string } | null) => void;
  onDuplicate: (q: JobQuest) => void;
  onCreate: () => void;
  search: string;
  canCreate: boolean;
  canDelete: boolean;
}) {
  if (quests.length === 0) {
    return (
      <div className="card p-16 text-center">
        {allQuests.length === 0 ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-violet-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Noch keine JobQuests</h2>
            <p className="text-slate-500 text-sm mb-6">Erstelle deine erste interaktive Berufserkundungsreise</p>
            {canCreate && (
              <button onClick={onCreate} className="btn-primary mx-auto">
                <Plus size={16} />
                Erste JobQuest erstellen
              </button>
            )}
          </>
        ) : (
          <p className="text-slate-500">Keine JobQuests für &ldquo;{search}&rdquo; gefunden.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quests.map((quest) => (
        <div key={quest.id} className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 truncate">{quest.title}</h3>
                {quest.status === 'published' ? (
                  <span className="badge-published">Veröffentlicht</span>
                ) : (
                  <span className="badge-draft">Entwurf</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {leadCounts[quest.id] || 0} Kontakte
                </span>
                <span>Erstellt {formatDateShort(quest.createdAt)}</span>
                <span>Aktualisiert {formatDateShort(quest.updatedAt)}</span>
                {quest.status === 'published' && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Globe size={11} />
                    /jobquest/{quest.slug}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link href={`/editor/${quest.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Bearbeiten">
                <Edit2 size={14} />
                <span className="hidden sm:block">Bearbeiten</span>
              </Link>
              {quest.status === 'published' && (
                <>
                  <Link href={`/jobquest/${quest.slug}`} target="_blank"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Vorschau">
                    <Eye size={14} />
                    <span className="hidden sm:block">Vorschau</span>
                  </Link>
                  <CopyLinkButton path={`/jobquest/${quest.slug}`} />
                </>
              )}
              <Link href={`/jobquest/${quest.id}/stats`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Statistiken">
                <BarChart2 size={14} />
                <span className="hidden sm:block">Statistiken</span>
              </Link>
              {canCreate && (
                <button onClick={() => onDuplicate(quest)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Duplizieren">
                  <Copy size={14} />
                </button>
              )}
              {canDelete && (
                <button onClick={() => setDeleteConfirm({ id: quest.id, title: quest.title })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Löschen">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Formular list ─────────────────────────────────────────────────────────────
function FormList({
  forms, allForms, submissionCounts, setDeleteConfirm,
  onDuplicate, onCreate, search, canCreate, canDelete,
}: {
  forms: FormPage[];
  allForms: FormPage[];
  submissionCounts: Record<string, number>;
  setDeleteConfirm: (value: { id: string; title: string } | null) => void;
  onDuplicate: (f: FormPage) => void;
  onCreate: () => void;
  search: string;
  canCreate: boolean;
  canDelete: boolean;
}) {
  if (forms.length === 0) {
    return (
      <div className="card p-16 text-center">
        {allForms.length === 0 ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Noch keine Formulare</h2>
            <p className="text-slate-500 text-sm mb-6">Erstelle eine Landingpage mit integriertem Anfrageformular</p>
            {canCreate && (
              <button onClick={onCreate} className="btn-primary mx-auto">
                <Plus size={16} />
                Erstes Formular erstellen
              </button>
            )}
          </>
        ) : (
          <p className="text-slate-500">Keine Formulare für &ldquo;{search}&rdquo; gefunden.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {forms.map((form) => (
        <div key={form.id} className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 truncate">{form.title}</h3>
                {form.status === 'published' ? (
                  <span className="badge-published">Veröffentlicht</span>
                ) : (
                  <span className="badge-draft">Entwurf</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {submissionCounts[form.id] || 0} Einreichungen
                </span>
                <span>{form.contentBlocks.length} Inhaltsblöcke</span>
                <span>{form.formSteps.length} Formular-Schritte</span>
                <span>Aktualisiert {formatDateShort(form.updatedAt)}</span>
                {form.status === 'published' && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Globe size={11} />
                    /formular/{form.slug}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link href={`/formular-editor/${form.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Bearbeiten">
                <Edit2 size={14} />
                <span className="hidden sm:block">Bearbeiten</span>
              </Link>
              {form.status === 'published' && (
                <>
                  <Link href={`/formular/${form.slug}`} target="_blank"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Vorschau">
                    <Eye size={14} />
                    <span className="hidden sm:block">Vorschau</span>
                  </Link>
                  <CopyLinkButton path={`/formular/${form.slug}`} />
                </>
              )}
              {canCreate && (
                <button onClick={() => onDuplicate(form)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Duplizieren">
                  <Copy size={14} />
                </button>
              )}
              {canDelete && (
                <button onClick={() => setDeleteConfirm({ id: form.id, title: form.title })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Löschen">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Berufscheck list ──────────────────────────────────────────────────────────
function CheckList({
  checks, allChecks, leadCounts, setDeleteConfirm,
  onDuplicate, onCreate, search, canCreate, canDelete,
}: {
  checks: CareerCheck[];
  allChecks: CareerCheck[];
  leadCounts: Record<string, number>;
  setDeleteConfirm: (value: { id: string; title: string } | null) => void;
  onDuplicate: (c: CareerCheck) => void;
  onCreate: () => void;
  search: string;
  canCreate: boolean;
  canDelete: boolean;
}) {
  if (checks.length === 0) {
    return (
      <div className="card p-16 text-center">
        {allChecks.length === 0 ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={28} className="text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Noch keine Berufschecks</h2>
            <p className="text-slate-500 text-sm mb-6">Erstelle deinen ersten interaktiven Berufseignungstest</p>
            {canCreate && (
              <button onClick={onCreate} className="btn-primary mx-auto">
                <Plus size={16} />
                Ersten Berufscheck erstellen
              </button>
            )}
          </>
        ) : (
          <p className="text-slate-500">Keine Berufschecks für &ldquo;{search}&rdquo; gefunden.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checks.map((check) => (
        <div key={check.id} className="card p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 truncate">{check.title}</h3>
                {check.status === 'published' ? (
                  <span className="badge-published">Veröffentlicht</span>
                ) : (
                  <span className="badge-draft">Entwurf</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {leadCounts[check.id] || 0} Kontakte
                </span>
                <span>{check.dimensions.length} Dimensionen</span>
                <span>{check.blocks.length} Blöcke</span>
                <span>Aktualisiert {formatDateShort(check.updatedAt)}</span>
                {check.status === 'published' && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Globe size={11} />
                    /berufscheck/{check.slug}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Link href={`/berufscheck-editor/${check.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Bearbeiten">
                <Edit2 size={14} />
                <span className="hidden sm:block">Bearbeiten</span>
              </Link>
              {check.status === 'published' && (
                <>
                  <Link href={`/berufscheck/${check.slug}`} target="_blank"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Vorschau">
                    <Eye size={14} />
                    <span className="hidden sm:block">Vorschau</span>
                  </Link>
                  <CopyLinkButton path={`/berufscheck/${check.slug}`} />
                </>
              )}
              <Link href={`/berufscheck-leads/${check.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Kontakte ansehen">
                <Users size={14} />
                <span className="hidden sm:block">Kontakte</span>
              </Link>
              {canCreate && (
                <button onClick={() => onDuplicate(check)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Duplizieren">
                  <Copy size={14} />
                </button>
              )}
              {canDelete && (
                <button onClick={() => setDeleteConfirm({ id: check.id, title: check.title })}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Löschen">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
