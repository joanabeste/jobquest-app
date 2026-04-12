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
  faviconUrl?: string;            // Favicon als Base64-DataURL oder externe URL
  headingFontName: string;        // Schriftart für Überschriften (Google Font oder "system")
  headingFontCustomName?: string; // Anzeigename der hochgeladenen Überschriften-Schrift
  headingFontData?: string;       // Base64-DataURL der hochgeladenen Überschriften-Schrift
  headingFontSize?: number;        // Schriftgröße Überschriften in px (default: 22)
  headingFontWeight?: number;      // Schriftgewicht Überschriften (300–800, default: 700)
  headingTextTransform?: 'none' | 'uppercase'; // Großschreibung Überschriften (default: none)
  headingLetterSpacing?: number;   // Buchstabenabstand Überschriften in em*1000 (-50 bis 200, default: 0)
  bodyFontName: string;            // Schriftart für Fließtext (Google Font oder "system")
  bodyFontCustomName?: string;     // Anzeigename der hochgeladenen Fließtext-Schrift
  bodyFontData?: string;           // Base64-DataURL der hochgeladenen Fließtext-Schrift
  bodyFontSize?: number;           // Schriftgröße Fließtext in px (default: 14)
  bodyFontWeight?: number;         // Schriftgewicht Fließtext (300–700, default: 400)
  bodyTextTransform?: 'none' | 'uppercase'; // Großschreibung Fließtext (default: none)
  bodyLetterSpacing?: number;      // Buchstabenabstand Fließtext in em*1000 (-50 bis 200, default: 0)
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

export interface SuccessJob {
  id: string;
  title: string;
  url?: string;
  group?: string;  // Optional: Gruppenname (z.B. "Pflege & Begleitung", "Handwerk & Technik")
}

export interface SuccessLink {
  id: string;
  label: string;
  url: string;
}

export interface MediaAsset {
  id: string;
  companyId: string;
  url: string;
  filename: string;
  sizeBytes?: number;
  mimeType?: string;
  createdAt: string;
}

export interface SuccessPageConfig {
  headline: string;
  text: string;
  showJobs: boolean;
  jobsHeadline: string;
  jobs: SuccessJob[];
  showQuests: boolean;
  questsHeadline: string;
  featuredQuestIds: string[];
  links: SuccessLink[];
}

export const DEFAULT_SUCCESS_PAGE: SuccessPageConfig = {
  headline: 'Vielen Dank für dein Interesse!',
  text: 'Wir freuen uns auf dich und werden uns in Kürze bei dir melden.',
  showJobs: false,
  jobsHeadline: 'Unsere Ausbildungsberufe',
  jobs: [],
  showQuests: false,
  questsHeadline: 'Weitere Quests entdecken',
  featuredQuestIds: [],
  links: [],
};

// ─── Feature Flags ───────────────────────────────────────────────────────────
export interface CompanyFeatures {
  heyflowImport?: boolean;
}

// ─── Plan / Kontingent ────────────────────────────────────────────────────────
export type ContentType = 'jobquests' | 'berufschecks' | 'formulare';

export interface CompanyPlan {
  maxJobQuests: number;      // 0 = Feature deaktiviert
  maxBerufschecks: number;
  maxFormulare: number;
}

export const DEFAULT_PLAN: CompanyPlan = {
  maxJobQuests: 1,
  maxBerufschecks: 0,
  maxFormulare: 0,
};

export interface ShowcaseItem {
  id: string;                                // own id (uuid) – stable across reorders
  type: 'jobquest' | 'berufscheck';
  contentId: string;                         // id of the JobQuest or CareerCheck
}

export interface ShowcaseConfig {
  enabled: boolean;
  headline?: string;
  subtext?: string;
  imageUrl?: string;
  questsHeadline?: string;
  questsSubtext?: string;
  checksHeadline?: string;
  checksSubtext?: string;
  items: ShowcaseItem[];
}

export const DEFAULT_SHOWCASE: ShowcaseConfig = {
  enabled: false,
  headline: '',
  subtext: '',
  items: [],
};

export interface Company {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  industry?: string;
  location?: string;
  logo?: string;
  privacyUrl?: string;
  imprintUrl?: string;
  careerPageUrl?: string;
  contactName: string;
  contactEmail: string;
  createdAt: string;
  corporateDesign?: CorporateDesign;
  successPage?: SuccessPageConfig;
  showcase?: ShowcaseConfig;
  plan?: CompanyPlan;
  features?: CompanyFeatures;
  customDomain?: string;
  domainVerified?: boolean;
}

export interface LeadFormConfig {
  headline: string;
  subtext: string;
  buttonText: string;
  showPhone: boolean;
  privacyText: string;         // @companyName wird durch Firmennamen ersetzt
  thankYouHeadline: string;
  thankYouText: string;
}

export const DEFAULT_LEAD_CONFIG: LeadFormConfig = {
  headline: 'Interessiert?',
  subtext: 'Hinterlasse deine Kontaktdaten – wir melden uns bei dir.',
  buttonText: 'Jetzt bewerben',
  showPhone: true,
  privacyText: 'Ich stimme zu, dass @companyName meine Kontaktdaten gemäß Datenschutzerklärung verarbeitet.',
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
  cardImage?: string;
  useCustomDomain?: boolean;
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
  emailSent?: boolean;
}

export interface AnalyticsEvent {
  id: string;
  // Exactly one of jobQuestId / careerCheckId / formPageId is set per event.
  jobQuestId?: string;
  careerCheckId?: string;
  formPageId?: string;
  type: 'view' | 'start' | 'complete' | 'page_view';
  sessionId: string;
  moduleId?: string;
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
  headline: string;      // supports @firstName
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
  cardImage?: string;
  useCustomDomain?: boolean;
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
  headline: 'Mehr Informationen erhalten',
  submitButtonText: 'Weitere Ausbildungsinformationen',
  thankYouHeadline: 'Vielen Dank!',
  thankYouText: 'Wir senden dir die Informationen in Kürze zu.',
  privacyText: 'Ich stimme zu, dass @companyName meine Daten gemäß Datenschutzerklärung verarbeitet.',
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
  useCustomDomain?: boolean;
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
export type WorkspaceRole = 'platform_admin' | 'admin' | 'editor' | 'viewer';

export interface WorkspaceMember {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  invitedBy?: string; // memberId of the inviting user
  createdAt: string;
  status: 'active' | 'pending';
}

// Visible roles only (platform_admin intentionally excluded from UI)
export const VISIBLE_ROLES: Exclude<WorkspaceRole, 'platform_admin'>[] = [
  'admin', 'editor', 'viewer',
];

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  platform_admin: 'Developer',
  admin: 'Administrator',
  editor: 'Redakteur',
  viewer: 'Betrachter',
};

export const ROLE_COLORS: Record<WorkspaceRole, string> = {
  platform_admin: 'bg-slate-900 text-slate-100',
  admin: 'bg-violet-100 text-violet-700',
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
  admin: ALL_PERMISSIONS,
  editor: ['create_content', 'edit_content', 'publish_content', 'view_leads', 'export_leads'],
  viewer: ['view_leads', 'view_team'],
};

export function can(role: WorkspaceRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}


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
