import { FileText, CheckSquare, ClipboardList, Users, type LucideIcon } from 'lucide-react';
import {
  questStorage, leadStorage,
  careerCheckStorage, careerCheckLeadStorage,
  formPageStorage, formSubmissionStorage,
} from '@/lib/storage';
import { generateSlug, formatDateShort } from '@/lib/utils';
import {
  type Company,
  type JobQuest, type CareerCheck, type FormPage,
  type CompanyPlan,
  DEFAULT_FORM_CONFIG,
} from '@/lib/types';

export type ContentTypeKey = 'jobquests' | 'berufschecks' | 'formulare';
export type ContentColor = 'violet' | 'indigo' | 'emerald';

export interface BaseContentItem {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface ContentTypeConfig<T extends BaseContentItem> {
  key: ContentTypeKey;
  label: string;                       // "JobQuests"
  createLabel: string;                 // "Neue JobQuest"
  emptyTitle: string;
  emptyText: string;
  emptyCreateLabel: string;            // "Erste JobQuest erstellen"
  cacheKey: string;
  icon: LucideIcon;
  color: ContentColor;
  /** Editor path prefix, e.g. '/editor' → /editor/<id> */
  editorPathPrefix: string;
  /** Public path prefix, e.g. '/jobquest' → /jobquest/<slug> */
  publicPathPrefix: string;
  /** Plan field that limits this content type. */
  planLimit: keyof Pick<CompanyPlan, 'maxJobQuests' | 'maxBerufschecks' | 'maxFormulare'>;
  storage: {
    getAll: () => Promise<T[]>;
    save: (item: T) => Promise<void>;
    delete: (id: string) => Promise<void>;
    duplicate: (id: string, newId: string, newSlug: string) => Promise<T | null>;
  };
  countsStorage: { getCounts: () => Promise<Record<string, number>> };
  /** Label used in row meta and stat card, e.g. "Kontakte" / "Einreichungen". */
  countLabel: string;
  /** Build a fresh item for "Create new". */
  createDefault: (company: Company, id: string) => T;
  /** Optional extra meta entries (e.g. dimensions count) shown in the row meta line. */
  itemMeta?: (item: T) => string[];
  /** Optional extra row actions (e.g. /berufscheck-leads link). */
  extraAction?: { href: (item: T) => string; title: string; label: string; icon: LucideIcon };
  /** Optional stats link target — if set, a stats button is shown for the row. */
  statsHref?: (item: T) => string;
}

export const questConfig: ContentTypeConfig<JobQuest> = {
  key: 'jobquests',
  label: 'JobQuests',
  createLabel: 'Neue JobQuest',
  emptyTitle: 'Noch keine JobQuests',
  emptyText: 'Erstelle deine erste interaktive Berufserkundungsreise',
  emptyCreateLabel: 'Erste JobQuest erstellen',
  cacheKey: 'quests',
  icon: FileText,
  color: 'violet',
  editorPathPrefix: '/editor',
  publicPathPrefix: '/jobquest',
  planLimit: 'maxJobQuests',
  storage: questStorage,
  countsStorage: leadStorage,
  countLabel: 'Kontakte',
  createDefault: (company, id) => ({
    id, companyId: company.id, title: 'Neue JobQuest',
    slug: generateSlug('neue-jobquest'), status: 'draft', modules: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }),
  itemMeta: (q) => [`Erstellt ${formatDateShort(q.createdAt)}`],
  statsHref: (q) => `/jobquest/${q.id}/stats`,
};

export const checkConfig: ContentTypeConfig<CareerCheck> = {
  key: 'berufschecks',
  label: 'Berufschecks',
  createLabel: 'Neuer Berufscheck',
  emptyTitle: 'Noch keine Berufschecks',
  emptyText: 'Erstelle deinen ersten interaktiven Berufseignungstest',
  emptyCreateLabel: 'Ersten Berufscheck erstellen',
  cacheKey: 'career-checks',
  icon: CheckSquare,
  color: 'indigo',
  editorPathPrefix: '/berufscheck-editor',
  publicPathPrefix: '/berufscheck',
  planLimit: 'maxBerufschecks',
  storage: careerCheckStorage,
  countsStorage: careerCheckLeadStorage,
  countLabel: 'Kontakte',
  createDefault: (company, id) => ({
    id, companyId: company.id, title: 'Neuer Berufscheck',
    slug: generateSlug('neuer-berufscheck'), status: 'draft', blocks: [], dimensions: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }),
  itemMeta: (c) => [`${c.dimensions.length} Dimensionen`, `${c.blocks.length} Blöcke`],
  extraAction: {
    href: (c) => `/berufscheck-leads/${c.id}`,
    title: 'Kontakte ansehen',
    label: 'Kontakte',
    icon: Users,
  },
};

export const formConfig: ContentTypeConfig<FormPage> = {
  key: 'formulare',
  label: 'Formulare',
  createLabel: 'Neues Formular',
  emptyTitle: 'Noch keine Formulare',
  emptyText: 'Erstelle eine Landingpage mit integriertem Anfrageformular',
  emptyCreateLabel: 'Erstes Formular erstellen',
  cacheKey: 'form-pages',
  icon: ClipboardList,
  color: 'emerald',
  editorPathPrefix: '/formular-editor',
  publicPathPrefix: '/formular',
  planLimit: 'maxFormulare',
  storage: formPageStorage,
  countsStorage: formSubmissionStorage,
  countLabel: 'Einreichungen',
  createDefault: (company, id) => ({
    id, companyId: company.id, title: 'Neues Formular',
    slug: generateSlug('neues-formular'), status: 'draft',
    contentBlocks: [], formSteps: [], formConfig: DEFAULT_FORM_CONFIG,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }),
  itemMeta: (f) => [`${f.contentBlocks.length} Inhaltsblöcke`, `${f.formSteps.length} Formular-Schritte`],
};
