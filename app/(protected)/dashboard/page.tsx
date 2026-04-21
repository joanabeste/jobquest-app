'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_PLAN, type Company, type CompanyPlan } from '@/lib/types';
import { useContentList } from '@/hooks/useContentList';
import { useToast } from '@/components/ui/Toast';
import { StatCardSkeleton, ListItemSkeleton } from '@/components/ui/Skeleton';
import ConfirmModal from '@/components/shared/ConfirmModal';
import StatCard from '@/components/dashboard/StatCard';
import TabButton from '@/components/dashboard/TabButton';
import ContentListSection from '@/components/dashboard/ContentListSection';
import {
  questConfig, checkConfig, formConfig,
  type ContentTypeConfig, type ContentTypeKey, type BaseContentItem,
} from '@/lib/dashboard/contentTypes';
import { Plus, Users, Search, SortAsc } from 'lucide-react';

type SortBy = 'updated' | 'created' | 'title';

export default function DashboardPage() {
  const { company, can } = useAuth();
  const router = useRouter();
  const toast = useToast();

  // ── Hooks (one per content type) ──────────────────────────────────────────
  const questList = useContentList({
    cacheKey: questConfig.cacheKey,
    storage: questConfig.storage,
    getCounts: () => questConfig.countsStorage.getCounts(),
  });
  const checkList = useContentList({
    cacheKey: checkConfig.cacheKey,
    storage: checkConfig.storage,
    getCounts: () => checkConfig.countsStorage.getCounts(),
  });
  const formList = useContentList({
    cacheKey: formConfig.cacheKey,
    storage: formConfig.storage,
    getCounts: () => formConfig.countsStorage.getCounts(),
  });

  const plan: CompanyPlan = company?.plan ?? DEFAULT_PLAN;

  // ── Tab visibility & quotas ───────────────────────────────────────────────
  const visibleConfigs = useMemo(() => {
    return ([
      [questConfig, questList] as const,
      [checkConfig, checkList] as const,
      [formConfig, formList] as const,
    ] as const).filter(([cfg]) => plan[cfg.planLimit] > 0);
  }, [plan, questList, checkList, formList]);

  const defaultTab: ContentTypeKey = visibleConfigs[0]?.[0].key ?? 'jobquests';
  const [activeTab, setActiveTab] = useState<ContentTypeKey>(defaultTab);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updated');

  useEffect(() => {
    if (!company) return;
    questList.reload();
    checkList.reload();
    formList.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  // If the initial defaultTab was picked from DEFAULT_PLAN (before company
  // loaded) but the company's real plan doesn't allow that content type,
  // switch to the first actually-visible tab. Also handles live plan changes.
  useEffect(() => {
    const isActiveVisible = visibleConfigs.some(([cfg]) => cfg.key === activeTab);
    if (!isActiveVisible && visibleConfigs.length > 0) {
      setActiveTab(visibleConfigs[0][0].key);
    }
  }, [visibleConfigs, activeTab]);

  useEffect(() => { setSearch(''); }, [activeTab]);

  // ── Create / quota ────────────────────────────────────────────────────────
  async function handleCreate<T extends BaseContentItem>(config: ContentTypeConfig<T>) {
    if (!company) return;
    try {
      const id = crypto.randomUUID();
      await config.storage.save(config.createDefault(company, id));
      router.push(`${config.editorPathPrefix}/${id}`);
    } catch (err) {
      console.error(`[create:${config.key}]`, err);
      toast.error(`${config.createLabel} konnte nicht erstellt werden: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function quotaReached<T extends BaseContentItem>(config: ContentTypeConfig<T>, items: T[]) {
    return items.length >= plan[config.planLimit];
  }

  // ── Filter / sort ─────────────────────────────────────────────────────────
  function filterAndSort<T extends BaseContentItem>(items: T[]): T[] {
    const term = search.toLowerCase();
    return [...items]
      .filter((i) => i.title.toLowerCase().includes(term))
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'created') return b.createdAt.localeCompare(a.createdAt);
        return b.updatedAt.localeCompare(a.updatedAt);
      });
  }

  const isLoading = questList.loading || checkList.loading || formList.loading;

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalLeads =
    Object.values(questList.counts).reduce((a, b) => a + b, 0) +
    Object.values(checkList.counts).reduce((a, b) => a + b, 0) +
    Object.values(formList.counts).reduce((a, b) => a + b, 0);

  // Render helpers — generics keep config and list correlated, avoiding TS
  // union widening that would otherwise lose the type link between them.
  function renderCreateButton<T extends BaseContentItem>(
    config: ContentTypeConfig<T>,
    list: ReturnType<typeof useContentList<T>>,
  ) {
    if (!can('create_content')) return null;
    return (
      <CreateButton
        config={config}
        disabled={quotaReached(config, list.items)}
        limit={plan[config.planLimit]}
        onClick={() => handleCreate(config)}
      />
    );
  }

  function renderListSection<T extends BaseContentItem>(
    config: ContentTypeConfig<T>,
    list: ReturnType<typeof useContentList<T>>,
  ) {
    return (
      <ContentListSection
        config={config}
        filtered={filterAndSort(list.items)}
        total={list.items.length}
        counts={list.counts}
        search={search}
        canCreate={can('create_content')}
        canDelete={can('delete_content')}
        onCreate={() => handleCreate(config)}
        onDuplicate={list.handleDuplicate}
        onAskDelete={list.setDeleteConfirm}
      />
    );
  }

  const activeLabel =
    activeTab === 'jobquests' ? questConfig.label
    : activeTab === 'berufschecks' ? checkConfig.label
    : formConfig.label;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Verwalte deine Inhalte und analysiere Ergebnisse</p>
        </div>
        {activeTab === 'jobquests' && renderCreateButton(questConfig, questList)}
        {activeTab === 'berufschecks' && renderCreateButton(checkConfig, checkList)}
        {activeTab === 'formulare' && renderCreateButton(formConfig, formList)}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            {visibleConfigs.map(([cfg, list]) => (
              <StatCard
                key={cfg.key}
                label={cfg.label}
                value={`${list.items.length} / ${plan[cfg.planLimit]}`}
                icon={cfg.icon}
                color={cfg.color}
                onClick={() => setActiveTab(cfg.key)}
              />
            ))}
            <StatCard
              label="Kontakte gesamt"
              value={String(totalLeads)}
              icon={Users}
              color="blue"
              href="/leads"
            />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {visibleConfigs.map(([cfg, list]) => (
          <TabButton
            key={cfg.key}
            label={cfg.label}
            active={activeTab === cfg.key}
            badge={list.items.filter((i) => i.status === 'published').length}
            onClick={() => setActiveTab(cfg.key)}
          />
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`${activeLabel} durchsuchen…`}
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
            onChange={(e) => setSortBy(e.target.value as SortBy)}
          >
            <option value="updated">Zuletzt aktualisiert</option>
            <option value="created">Erstellungsdatum</option>
            <option value="title">Name A–Z</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}
        </div>
      ) : activeTab === 'jobquests' ? renderListSection(questConfig, questList)
        : activeTab === 'berufschecks' ? renderListSection(checkConfig, checkList)
        : renderListSection(formConfig, formList)}

      {/* Delete confirmation modals — one per list, only one ever active. */}
      {([
        [questList, questConfig] as const,
        [checkList, checkConfig] as const,
        [formList, formConfig] as const,
      ]).map(([list, cfg]) => list.deleteConfirm && (
        <ConfirmModal
          key={cfg.key}
          title="Unwiderruflich löschen?"
          description={
            <>
              <span className="font-medium">&ldquo;{list.deleteConfirm.title}&rdquo;</span> wird permanent gelöscht.
              Alle zugehörigen Kontakte werden ebenfalls unwiderruflich entfernt.
            </>
          }
          onConfirm={() => list.handleDelete(list.deleteConfirm!.id)}
          onCancel={() => list.setDeleteConfirm(null)}
        />
      ))}
    </div>
  );
}

// ── Create button (header) ───────────────────────────────────────────────────
function CreateButton<T extends BaseContentItem>({
  config, disabled, limit, onClick,
}: {
  config: ContentTypeConfig<T>;
  disabled: boolean;
  limit: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      title={disabled ? `Kontingent erreicht (${limit}/${limit})` : undefined}
    >
      <Plus size={16} />
      {config.createLabel}
    </button>
  );
}

// Re-export so tests / scripts that imported from this page still resolve.
export type { Company };
