
// ─── Funnel / Block-Editor Data Model ────────────────────────────────────────

export type FunnelBlockType =
  // Generic
  | 'heading' | 'paragraph' | 'button' | 'image' | 'spacer' | 'video'
  // JobQuest
  | 'quest_scene' | 'quest_dialog' | 'quest_decision' | 'quest_quiz' | 'quest_info' | 'quest_freetext'
  | 'quest_file' | 'quest_lead' | 'quest_spinner' | 'quest_rating' | 'quest_vorname'
  // BerufsCheck
  | 'check_intro' | 'check_vorname' | 'check_frage' | 'check_ergebnisfrage' | 'check_selbst' | 'check_lead' | 'check_ergebnis'
  // Formular
  | 'form_hero' | 'form_text' | 'form_image' | 'form_step' | 'form_config';

export type FunnelContentType = 'quest' | 'check' | 'form';

// ─── Style ───────────────────────────────────────────────────────────────────
export interface FunnelStyle {
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  backgroundColor?: string;
  borderRadius?: number;
  textAlign?: 'left' | 'center' | 'right';
  gap?: number; // column gap for layouts
}

// ─── Nodes ───────────────────────────────────────────────────────────────────
export interface BlockNode {
  id: string;
  kind: 'block';
  type: FunnelBlockType;
  props: Record<string, unknown>;
  style?: FunnelStyle;
}

export interface Column {
  id: string;
  nodes: FunnelNode[];
}

export interface LayoutNode {
  id: string;
  kind: 'layout';
  columns: Column[];
  style?: FunnelStyle;
}

export type FunnelNode = BlockNode | LayoutNode;

// ─── Page & Doc ──────────────────────────────────────────────────────────────
export interface FunnelPage {
  id: string;
  name: string;
  nodes: FunnelNode[];
  nextPageId?: string;
}

// ─── Email Config ─────────────────────────────────────────────────────────────
export interface EmailAttachment {
  url: string;
  filename: string;
}

export interface EmailConfig {
  // Bestätigungs-E-Mail → an die Person die das Formular absendet
  confirmationEnabled: boolean;
  confirmationSubject: string;
  confirmationBodyMode: 'html' | 'text';
  confirmationBody: string;
  confirmationAttachment?: EmailAttachment;

  // Benachrichtigungs-E-Mail → an interne Empfänger (z.B. HR)
  notificationEnabled: boolean;
  notificationRecipient: string;
  notificationSubject: string;
  notificationBodyMode: 'html' | 'text';
  notificationBody: string;
}

export interface FunnelDoc {
  id: string;
  contentId: string;
  contentType: FunnelContentType;
  pages: FunnelPage[];
  emailConfig?: EmailConfig;
  createdAt: string;
  updatedAt: string;
}

// ─── Insert Target ───────────────────────────────────────────────────────────
export type InsertTarget =
  | { location: 'root'; afterId: string | null }
  | { location: 'column'; columnId: string; afterId: string | null };

// ─── Block Type Config (for library) ─────────────────────────────────────────
export interface BlockTypeConfig {
  type: FunnelBlockType;
  label: string;
  description: string;
  category: string;
  defaultProps: Record<string, unknown>;
}

// ─── Default props per block type ─────────────────────────────────────────────
// Shared contact/lead defaults used across Quest, Check and Form
const CONTACT_LEAD_DEFAULT = {
  headline: 'Interessiert?',
  subtext: 'Hinterlasse deine Kontaktdaten – wir melden uns bei dir.',
  buttonText: 'Jetzt bewerben',
  privacyText: 'Ich stimme zu, dass @companyName meine Daten speichert und mich kontaktiert.',
  fields: [
    { id: crypto.randomUUID(), type: 'text', label: 'Vorname', placeholder: 'Vorname', required: true },
    { id: crypto.randomUUID(), type: 'text', label: 'Nachname', placeholder: 'Nachname', required: false },
    { id: crypto.randomUUID(), type: 'email', label: 'E-Mail', placeholder: 'E-Mail-Adresse', required: true },
    { id: crypto.randomUUID(), type: 'tel', label: 'Telefon', placeholder: 'Telefonnummer (optional)', required: false },
  ],
};

export const DEFAULT_BLOCK_PROPS: Record<FunnelBlockType, Record<string, unknown>> = {
  heading:             { text: 'Überschrift', level: 2 },
  paragraph:           { text: '<p>Dein Text hier…</p>' },
  button:              { text: 'Weiter', url: '', variant: 'primary' },
  image:               { src: '', alt: '', caption: '' },
  spacer:              { height: 32 },
  video:               { url: '', caption: '' },
  quest_scene:         { title: 'Willkommen!', subtext: 'Erlebe virtuell einen typischen Arbeitstag als:', accentText: 'BERUFSBEZEICHNUNG', description: 'In wenigen Minuten bekommst du einen kleinen Einblick in den Arbeitsalltag und kannst selbst Entscheidungen treffen.', imageUrl: '', buttonText: 'Alles klar, verstanden!', bulletPoints: [] },
  quest_dialog:        { title: '', lines: [{ id: crypto.randomUUID(), speaker: 'Recruiter', text: 'Hallo!' }] },
  quest_decision:      { question: 'Was würdest du tun?', options: [{ id: crypto.randomUUID(), text: 'Option A', emoji: '', reaction: 'Gute Wahl!' }] },
  quest_quiz:          { question: 'Frage?', options: [{ id: crypto.randomUUID(), text: 'Antwort A', correct: true, feedback: 'Richtig!' }] },
  quest_info:          { title: 'Info', text: 'Informationstext' },
  quest_freetext:      { text: 'Freitext' },
  quest_file:          { title: 'Datei', fileUrl: '', fileName: 'dokument.pdf', buttonText: 'Herunterladen' },
  quest_spinner:       { text: 'Einen Moment…', doneText: 'Geschafft!' },
  quest_rating:        { question: 'Wie war dein Erlebnis?', emoji: '⭐', count: 5 },
  quest_vorname:       { question: 'Wie heißt du?', placeholder: 'Dein Vorname…' },
  quest_lead:          CONTACT_LEAD_DEFAULT,
  check_intro:         { headline: 'Bist du geeignet?', subtext: 'Mache jetzt den Check.', imageUrl: '', buttonText: 'Jetzt starten' },
  check_vorname:       { question: 'Wie heißt du?', placeholder: 'Dein Vorname', buttonText: 'Weiter' },
  check_frage:         { frageType: 'single_choice', question: 'Frage?', options: [{ id: crypto.randomUUID(), text: 'Option A', scores: {} }] },
  check_ergebnisfrage: { question: 'Ergebnisfrage?', options: [{ id: crypto.randomUUID(), text: 'Option A', scores: {} }] },
  check_selbst:        { question: 'Wie schätzt du dich ein?', sliderMin: 0, sliderMax: 10, sliderStep: 1, sliderLabelMin: 'Gar nicht', sliderLabelMax: 'Sehr' },
  check_lead:          CONTACT_LEAD_DEFAULT,
  check_ergebnis:      { headline: 'Dein Ergebnis, @firstName!', subtext: 'Basierend auf deinen Antworten.', showDimensionBars: true },
  form_hero:           { headline: 'Jetzt anfragen', subtext: 'Wir melden uns bei dir.', imageUrl: '', ctaText: 'Jetzt anfragen' },
  form_text:           { headline: '', content: 'Ihr Text hier…' },
  form_image:          { imageUrl: '', caption: '' },
  form_step:           { title: 'Deine Angaben', description: '', fields: [] },
  form_config:         CONTACT_LEAD_DEFAULT,
};

// ─── Block type catalog per content type ─────────────────────────────────────
// Define a shared set of basic content blocks so all editors expose the same
// basic building blocks in the same order.
const BASIC_CONTENT: BlockTypeConfig[] = [
  { type: 'heading',    label: 'Überschrift', description: 'H1 / H2 / H3',                        category: 'Inhalt',       defaultProps: DEFAULT_BLOCK_PROPS.heading },
  { type: 'paragraph',  label: 'Text',        description: 'Fließtext mit Formatierung',           category: 'Inhalt',       defaultProps: DEFAULT_BLOCK_PROPS.paragraph },
  { type: 'button',     label: 'Button',      description: 'Call-to-Action-Button',                category: 'Interaktion',  defaultProps: DEFAULT_BLOCK_PROPS.button },
  { type: 'image',      label: 'Bild',        description: 'Bild mit optionaler Bildunterschrift', category: 'Medien',       defaultProps: DEFAULT_BLOCK_PROPS.image },
  { type: 'video',      label: 'Video',       description: 'Eingebettetes Video',                  category: 'Medien',       defaultProps: DEFAULT_BLOCK_PROPS.video },
  { type: 'spacer',     label: 'Abstand',     description: 'Vertikaler Freiraum',                  category: 'Logik',        defaultProps: DEFAULT_BLOCK_PROPS.spacer },
];

export const BLOCK_CATALOG: Record<FunnelContentType, BlockTypeConfig[]> = {
  quest: [
    { type: 'quest_scene',    label: 'Szene',         description: 'Bild + Titel + Beschreibung',          category: 'Inhalt',      defaultProps: DEFAULT_BLOCK_PROPS.quest_scene },
    { type: 'quest_info',     label: 'Info',          description: 'Informationsblock mit Rich Text',       category: 'Inhalt',      defaultProps: DEFAULT_BLOCK_PROPS.quest_info },
    { type: 'quest_freetext', label: 'Freitext',      description: 'Freier Textbereich',                   category: 'Inhalt',      defaultProps: DEFAULT_BLOCK_PROPS.quest_freetext },
    { type: 'quest_dialog',   label: 'Dialog',        description: 'Sprechblasen-Dialog',                  category: 'Interaktion', defaultProps: DEFAULT_BLOCK_PROPS.quest_dialog },
    { type: 'quest_decision', label: 'Entscheidung',  description: 'Verzweigung mit Optionen',             category: 'Interaktion', defaultProps: DEFAULT_BLOCK_PROPS.quest_decision },
    { type: 'quest_quiz',     label: 'Quiz',          description: 'Multiple-Choice-Frage',                category: 'Interaktion', defaultProps: DEFAULT_BLOCK_PROPS.quest_quiz },
    { type: 'quest_rating',   label: 'Bewertung',     description: 'Sterne oder Emoji-Bewertung',          category: 'Interaktion', defaultProps: DEFAULT_BLOCK_PROPS.quest_rating },
    { type: 'quest_vorname',  label: 'Vorname',       description: 'Namenseingabe – als @firstName nutzbar', category: 'Eingabe',     defaultProps: DEFAULT_BLOCK_PROPS.quest_vorname },
    { type: 'quest_file',     label: 'Datei',         description: 'Downloadbarer Anhang (PDF etc.)',      category: 'Medien',      defaultProps: DEFAULT_BLOCK_PROPS.quest_file },
    { type: 'quest_spinner',  label: 'Ladescreen',    description: 'Ladeanimation, geht automatisch weiter', category: 'Logik',    defaultProps: DEFAULT_BLOCK_PROPS.quest_spinner },
    { type: 'quest_lead',     label: 'Kontaktformular', description: 'Fester Abschluss – Lead-Erfassung', category: 'Abschluss',   defaultProps: DEFAULT_BLOCK_PROPS.quest_lead },
    ...BASIC_CONTENT,
  ],
  check: [
    { type: 'check_intro',         label: 'Intro',              description: 'Einstiegsscreen mit Bild',      category: 'Inhalt',    defaultProps: DEFAULT_BLOCK_PROPS.check_intro },
    { type: 'check_vorname',       label: 'Name',               description: 'Namenseingabe',                 category: 'Eingabe',   defaultProps: DEFAULT_BLOCK_PROPS.check_vorname },
    { type: 'check_frage',         label: 'Frage',              description: 'Einzel- oder Slider-Frage',    category: 'Eingabe',   defaultProps: DEFAULT_BLOCK_PROPS.check_frage },
    { type: 'check_ergebnisfrage', label: 'Ergebnisfrage',      description: 'Frage mit Dimensions-Score',   category: 'Eingabe',   defaultProps: DEFAULT_BLOCK_PROPS.check_ergebnisfrage },
    { type: 'check_selbst',        label: 'Selbsteinschätzung', description: 'Slider-Einschätzung',          category: 'Eingabe',   defaultProps: DEFAULT_BLOCK_PROPS.check_selbst },
    { type: 'check_ergebnis',      label: 'Ergebnis',           description: 'Ergebnisanzeige',              category: 'Abschluss', defaultProps: DEFAULT_BLOCK_PROPS.check_ergebnis },
    { type: 'check_lead',          label: 'Kontaktformular',    description: 'Lead-Erfassung',               category: 'Abschluss', defaultProps: DEFAULT_BLOCK_PROPS.check_lead },
    ...BASIC_CONTENT,
  ],
  form: [
    { type: 'form_hero',    label: 'Hero',             description: 'Haupt-Banner mit CTA',      category: 'Inhalt',    defaultProps: DEFAULT_BLOCK_PROPS.form_hero },
    { type: 'form_text',    label: 'Textabschnitt',    description: 'Überschrift + Fließtext',   category: 'Inhalt',    defaultProps: DEFAULT_BLOCK_PROPS.form_text },
    { type: 'form_image',   label: 'Bild',             description: 'Vollbreites Bild',          category: 'Medien',    defaultProps: DEFAULT_BLOCK_PROPS.form_image },
    { type: 'form_step',    label: 'Formular-Schritt', description: 'Eingabefelder',             category: 'Eingabe',   defaultProps: DEFAULT_BLOCK_PROPS.form_step },
    { type: 'form_config',  label: 'Einstellungen',    description: 'Danke-Seite & Datenschutz', category: 'Abschluss', defaultProps: DEFAULT_BLOCK_PROPS.form_config },
    ...BASIC_CONTENT,
  ],
};

export const BLOCK_LABELS: Record<FunnelBlockType, string> = {
  heading: 'Überschrift', paragraph: 'Text', button: 'Button', image: 'Bild', spacer: 'Abstand', video: 'Video',
  quest_scene: 'Szene', quest_dialog: 'Dialog', quest_decision: 'Entscheidung', quest_quiz: 'Quiz', quest_info: 'Info', quest_freetext: 'Freitext',
  quest_file: 'Datei', quest_lead: 'Kontaktformular', quest_spinner: 'Ladescreen', quest_rating: 'Bewertung', quest_vorname: 'Vorname',
  check_intro: 'Intro', check_vorname: 'Name', check_frage: 'Frage', check_ergebnisfrage: 'Ergebnisfrage', check_selbst: 'Selbsteinschätzung', check_lead: 'Kontaktformular', check_ergebnis: 'Ergebnis',
  form_hero: 'Hero', form_text: 'Textabschnitt', form_image: 'Bild', form_step: 'Formular-Schritt', form_config: 'Einstellungen',
};
