export type ModuleType =
  | 'scene'
  | 'dialog'
  | 'decision'
  | 'quiz'
  | 'info'
  | 'freetext'
  | 'image'
  | 'video'
  | 'audio'
  | 'file';

export interface BaseModule {
  id: string;
  type: ModuleType;
}

export interface SceneModule extends BaseModule {
  type: 'scene';
  title: string;
  description: string;
  imageUrl?: string;
}

export interface DialogLine {
  id: string;
  speaker: string;
  text: string;
}
export interface DialogModule extends BaseModule {
  type: 'dialog';
  title?: string;
  lines: DialogLine[];
}

export interface DecisionOption {
  id: string;
  text: string;
  reaction: string;
  branchModules?: QuestModule[];
}

export interface DecisionModule extends BaseModule {
  type: 'decision';
  question: string;
  options: DecisionOption[];
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
  feedback: string;
}

export interface QuizModule extends BaseModule {
  type: 'quiz';
  question: string;
  options: QuizOption[];
}

export interface InfoModule extends BaseModule {
  type: 'info';
  title: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface FreetextModule extends BaseModule {
  type: 'freetext';
  text: string;
}

export interface ImageModule extends BaseModule {
  type: 'image';
  imageUrl: string;
  caption?: string;
}

export interface VideoModule extends BaseModule {
  type: 'video';
  videoUrl: string;
  caption?: string;
}

export interface AudioModule extends BaseModule {
  type: 'audio';
  audioUrl: string;
  title?: string;
}

export interface FileModule extends BaseModule {
  type: 'file';
  fileUrl: string;
  filename: string;
  description?: string;
}

export type QuestModule =
  | SceneModule
  | DialogModule
  | DecisionModule
  | QuizModule
  | InfoModule
  | FreetextModule
  | ImageModule
  | VideoModule
  | AudioModule
  | FileModule;

export interface CorporateDesign {
  primaryColor: string;           // Hauptfarbe (Header, Buttons, Progress)
  accentColor: string;            // Akzentfarbe (sekundäre Elemente)
  textColor: string;              // Schriftfarbe (Fließtext)
  headingColor: string;           // Farbe für Überschriften
  borderRadius: number;           // Eckenrundung in px
  headingFontName: string;        // Schriftart für Überschriften (Google Font oder "system")
  headingFontCustomName?: string; // Anzeigename der hochgeladenen Überschriften-Schrift
  headingFontData?: string;       // Base64-DataURL der hochgeladenen Überschriften-Schrift
  headingFontSize?: number;        // Schriftgröße Überschriften in px (default: 22)
  headingFontWeight?: number;      // Schriftgewicht Überschriften (300–800, default: 700)
  headingTextTransform?: 'none' | 'uppercase'; // Großschreibung Überschriften (default: none)
  bodyFontName: string;            // Schriftart für Fließtext (Google Font oder "system")
  bodyFontCustomName?: string;     // Anzeigename der hochgeladenen Fließtext-Schrift
  bodyFontData?: string;           // Base64-DataURL der hochgeladenen Fließtext-Schrift
  bodyFontSize?: number;           // Schriftgröße Fließtext in px (default: 14)
  bodyFontWeight?: number;         // Schriftgewicht Fließtext (300–700, default: 400)
  bodyTextTransform?: 'none' | 'uppercase'; // Großschreibung Fließtext (default: none)
}

export const DEFAULT_CORPORATE_DESIGN: CorporateDesign = {
  primaryColor: '#7c3aed',
  accentColor: '#f59e0b',
  textColor: '#1e293b',
  headingColor: '#0f172a',
  borderRadius: 12,
  headingFontName: 'system',
  headingFontSize: 22,
  headingFontWeight: 700,
  bodyFontName: 'system',
  bodyFontSize: 14,
  bodyFontWeight: 400,
};

export interface Company {
  id: string;
  name: string;
  industry: string;
  location: string;
  logo?: string;
  privacyUrl?: string;
  imprintUrl?: string;
  contactName: string;
  contactEmail: string;
  password: string;
  createdAt: string;
  corporateDesign?: CorporateDesign;
}

export interface LeadFormConfig {
  headline: string;
  subtext: string;
  buttonText: string;
  showPhone: boolean;
  privacyText: string;         // {{company}} wird durch Firmennamen ersetzt
  thankYouHeadline: string;
  thankYouText: string;
}

export const DEFAULT_LEAD_CONFIG: LeadFormConfig = {
  headline: 'Interessiert?',
  subtext: 'Hinterlasse deine Kontaktdaten – wir melden uns bei dir.',
  buttonText: 'Jetzt bewerben',
  showPhone: true,
  privacyText: 'Ich stimme zu, dass {{company}} meine Kontaktdaten gemäß Datenschutzerklärung verarbeitet.',
  thankYouHeadline: 'Vielen Dank!',
  thankYouText: 'Deine Bewerbung ist bei uns eingegangen.',
};

export interface JobQuest {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  modules: QuestModule[];
  leadConfig?: LeadFormConfig;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface Lead {
  id: string;
  jobQuestId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gdprConsent: boolean;
  submittedAt: string;
  customFields?: Record<string, string>;
}

export interface AnalyticsEvent {
  id: string;
  jobQuestId: string;
  type: 'view' | 'start' | 'complete';
  sessionId: string;
  duration?: number;
  timestamp: string;
}

export const MODULE_LABELS: Record<ModuleType, string> = {
  scene: 'Szene',
  dialog: 'Dialog',
  decision: 'Entscheidung',
  quiz: 'Quiz',
  info: 'Info',
  freetext: 'Freitext',
  image: 'Bild',
  video: 'Video',
  audio: 'Audio',
  file: 'Datei',
};

export const MODULE_ICONS: Record<ModuleType, string> = {
  scene: '🌄', dialog: '💬', decision: '🔀', quiz: '❓',
  info: 'ℹ️', freetext: '📝', image: '🖼️', video: '🎬', audio: '🎧', file: '📎',
};

// ─── Berufscheck ────────────────────────────────────────────────────────────

export interface Dimension {
  id: string;
  name: string;
  description?: string;
  color?: string; // hex for the result bar
}

export type BerufsCheckBlockType =
  | 'intro'
  | 'vorname'
  | 'selbsteinschaetzung'
  | 'frage'
  | 'ergebnisfrage'
  | 'text'
  | 'lead'
  | 'ergebnis'
  | 'button';

export type FrageType = 'single_choice' | 'slider';

export interface FrageOption {
  id: string;
  text: string;
  scores: Record<string, number>; // dimensionId -> score
}

interface BaseBlock {
  id: string;
  type: BerufsCheckBlockType;
}

export interface IntroBlock extends BaseBlock {
  type: 'intro';
  headline: string;
  subtext: string;
  imageUrl?: string;
  buttonText: string;
}

export interface VornameBlock extends BaseBlock {
  type: 'vorname';
  question: string;
  placeholder?: string;
  buttonText: string;
}

export interface SelbsteinschaetzungBlock extends BaseBlock {
  type: 'selbsteinschaetzung';
  question: string;
  description?: string;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  sliderLabelMin?: string;
  sliderLabelMax?: string;
  sliderDimensionId?: string;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  headline?: string;
  content: string;
  buttonText: string;
}

export interface ErgebnisfrageBlock extends BaseBlock {
  type: 'ergebnisfrage';
  question: string;
  description?: string;
  options: FrageOption[];
}

export interface FrageBlock extends BaseBlock {
  type: 'frage';
  frageType: FrageType;
  question: string;
  // single_choice
  options?: FrageOption[];
  // slider
  sliderMin?: number;
  sliderMax?: number;
  sliderStep?: number;
  sliderLabelMin?: string;
  sliderLabelMax?: string;
  sliderDimensionId?: string; // dimension this slider maps to
}

export interface LeadBlock extends BaseBlock {
  type: 'lead';
  headline: string;
  subtext: string;
  showPhone: boolean;
  buttonText: string;
  privacyText: string;
}

export interface ErgebnisBlock extends BaseBlock {
  type: 'ergebnis';
  headline: string;      // supports {{name}}
  subtext: string;
  showDimensionBars: boolean;
}

export interface ButtonBlock extends BaseBlock {
  type: 'button';
  text: string;
  url: string;
  style: 'primary' | 'secondary';
}

export type BerufsCheckBlock =
  | IntroBlock
  | VornameBlock
  | SelbsteinschaetzungBlock
  | FrageBlock
  | ErgebnisfrageBlock
  | TextBlock
  | LeadBlock
  | ErgebnisBlock
  | ButtonBlock;

export interface CareerCheck {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  blocks: BerufsCheckBlock[];
  dimensions: Dimension[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CareerCheckLead {
  id: string;
  careerCheckId: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  gdprConsent: boolean;
  scores: Record<string, number>; // dimensionId -> total score
  submittedAt: string;
}

export const BLOCK_LABELS: Record<BerufsCheckBlockType, string> = {
  intro: 'Intro',
  vorname: 'Vorname',
  selbsteinschaetzung: 'Selbsteinschätzung',
  frage: 'Frage',
  ergebnisfrage: 'Ergebnisfrage',
  text: 'Text',
  lead: 'Kontaktformular',
  ergebnis: 'Ergebnis',
  button: 'Button',
};

export const DIMENSION_COLORS = [
  '#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626',
  '#7c3aed', '#0891b2', '#65a30d', '#ea580c', '#9333ea',
];

// ─── Formular ────────────────────────────────────────────────────────────────

export type FormContentBlockType = 'hero' | 'text_section' | 'image_section';

export interface FormHeroBlock {
  id: string;
  type: 'hero';
  headline: string;
  subtext: string;
  imageUrl?: string;
  ctaText: string;
}

export interface FormTextSectionBlock {
  id: string;
  type: 'text_section';
  headline?: string;
  content: string;
}

export interface FormImageSectionBlock {
  id: string;
  type: 'image_section';
  imageUrl?: string;
  caption?: string;
}

export type FormContentBlock = FormHeroBlock | FormTextSectionBlock | FormImageSectionBlock;

export type FormFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio';

export const FORM_FIELD_LABELS: Record<FormFieldType, string> = {
  text: 'Textfeld',
  email: 'E-Mail',
  phone: 'Telefon',
  textarea: 'Mehrzeiliger Text',
  select: 'Auswahlliste',
  radio: 'Einfachauswahl',
};

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface FormConfig {
  headline: string;
  submitButtonText: string;
  thankYouHeadline: string;
  thankYouText: string;
  privacyText: string;
}

export const DEFAULT_FORM_CONFIG: FormConfig = {
  headline: 'Interessiert?',
  submitButtonText: 'Jetzt bewerben',
  thankYouHeadline: 'Vielen Dank!',
  thankYouText: 'Wir werden uns in Kürze bei dir melden.',
  privacyText: 'Ich stimme zu, dass {{company}} meine Daten gemäß Datenschutzerklärung verarbeitet.',
};

export interface FormPage {
  id: string;
  companyId: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  contentBlocks: FormContentBlock[];
  formSteps: FormStep[];
  formConfig: FormConfig;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface FormSubmission {
  id: string;
  formPageId: string;
  companyId: string;
  answers: Record<string, string>;
  gdprConsent: boolean;
  submittedAt: string;
}

// ─── Workspace / Roles ───────────────────────────────────────────────────────

// platform_admin is a hidden developer/support role – never shown in regular UI
export type WorkspaceRole = 'platform_admin' | 'superadmin' | 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
  id: string;
  companyId: string;
  name: string;
  email: string;
  password: string;
  role: WorkspaceRole;
  invitedBy?: string; // memberId of the inviting user
  createdAt: string;
  status: 'active' | 'pending';
}

// Visible roles only (platform_admin intentionally excluded from UI)
export const VISIBLE_ROLES: Exclude<WorkspaceRole, 'platform_admin'>[] = [
  'superadmin', 'admin', 'editor', 'viewer',
];

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  platform_admin: 'Developer',
  superadmin: 'Inhaber',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Betrachter',
};

export const ROLE_COLORS: Record<WorkspaceRole, string> = {
  platform_admin: 'bg-slate-900 text-slate-100',
  superadmin: 'bg-violet-100 text-violet-700',
  admin: 'bg-blue-100 text-blue-700',
  editor: 'bg-emerald-100 text-emerald-700',
  viewer: 'bg-slate-100 text-slate-600',
};

export type Permission =
  | 'create_content'
  | 'edit_content'
  | 'delete_content'
  | 'publish_content'
  | 'view_leads'
  | 'export_leads'
  | 'edit_company'
  | 'manage_members'
  | 'view_team';

const ALL_PERMISSIONS: Permission[] = [
  'create_content', 'edit_content', 'delete_content', 'publish_content',
  'view_leads', 'export_leads', 'edit_company', 'manage_members', 'view_team',
];

export const ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  platform_admin: ALL_PERMISSIONS,
  superadmin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  editor: ['create_content', 'edit_content', 'view_leads', 'export_leads'],
  viewer: ['view_leads'],
};

export function can(role: WorkspaceRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const DEV_PASSWORD = 'jq-dev-2026';

export const INDUSTRY_OPTIONS = [
  'Handwerk',
  'IT & Technologie',
  'Gesundheit & Pflege',
  'Einzelhandel',
  'Industrie & Produktion',
  'Logistik & Transport',
  'Gastronomie & Hotellerie',
  'Banken & Versicherungen',
  'Öffentlicher Dienst',
  'Bildung & Soziales',
  'Medien & Marketing',
  'Sonstiges',
];
