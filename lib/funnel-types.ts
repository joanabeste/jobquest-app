
// ─── Funnel / Block-Editor Data Model ────────────────────────────────────────

export type FunnelBlockType =
  // Generic
  | 'heading' | 'paragraph' | 'button' | 'image' | 'spacer' | 'video'
  // JobQuest
  | 'quest_scene' | 'quest_dialog' | 'quest_decision' | 'quest_quiz' | 'quest_info' | 'quest_freetext'
  | 'quest_file' | 'quest_lead' | 'quest_spinner' | 'quest_rating' | 'quest_hotspot' | 'quest_zuordnung'
  // BerufsCheck
  | 'check_intro' | 'check_vorname' | 'check_frage' | 'check_ergebnisfrage' | 'check_selbst' | 'check_statements' | 'check_lead' | 'check_ergebnis' | 'check_swipe_deck'
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
export interface VisibilityCondition {
  /** ID of an answered block on a previous page (e.g. a check_frage). */
  sourceBlockId: string;
  /** Page is visible only if the answer matches one of these values. */
  equals: string[];
}

export interface FunnelPage {
  id: string;
  name: string;
  nodes: FunnelNode[];
  nextPageId?: string;
  /** Optional gate – if set, the page is auto-skipped when the condition is unmet. */
  visibleIf?: VisibilityCondition;
  /** Hide the location badge (page name with map pin) in the player. Default: false (visible). */
  hideLocationHint?: boolean;
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

// ─── Lead / Form field definition ────────────────────────────────────────────
// Note: LeadFieldType is distinct from FormFieldType (lib/types.ts) — lead
// capture forms support 'tel' and 'checkbox', static forms use 'phone'/'radio'.
export type LeadFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'checkbox' | 'checkbox_group' | 'select';

export interface LeadFieldDef {
  id: string;
  type: LeadFieldType;
  label: string;
  /** Variable name used in email templates, e.g. "vorname" → @vorname */
  variable?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
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
// IMPORTANT: blocks with nested items (lines, options, fields) must generate
// fresh UUIDs on each use to avoid duplicate React keys and editor state bugs.
// Call getDefaultProps(type) when creating a new block — never spread the
// static DEFAULT_BLOCK_PROPS directly for these block types.

function uid() { return crypto.randomUUID(); }

function contactLeadDefault() {
  return {
    headline: 'Interessiert?',
    subtext: 'Hinterlasse deine Kontaktdaten – wir melden uns bei dir.',
    buttonText: 'Jetzt bewerben',
    thankYouHeadline: 'Vielen Dank!',
    thankYouText: 'Wir melden uns bei dir.',
    thankYouButtonText: '',
    thankYouButtonUrl: '',
    fields: [
      { id: uid(), type: 'text',     label: 'Vorname',   placeholder: 'Vorname',                  required: true,  variable: 'vorname'     },
      { id: uid(), type: 'text',     label: 'Nachname',  placeholder: 'Nachname',                 required: false, variable: 'nachname'    },
      { id: uid(), type: 'email',    label: 'E-Mail',    placeholder: 'E-Mail-Adresse',           required: true,  variable: 'email'       },
      { id: uid(), type: 'tel',      label: 'Telefon',   placeholder: 'Telefonnummer', required: false, variable: 'telefon'     },
      { id: uid(), type: 'checkbox', label: 'Ich stimme zu, dass <a href="@datenschutzUrl" target="_blank" rel="noopener noreferrer">@companyName</a> meine Daten speichert und mich kontaktiert. <a href="@impressumUrl" target="_blank" rel="noopener noreferrer">Impressum</a>', required: true, variable: 'datenschutz' },
    ],
  };
}

/**
 * Returns default props for a block type with freshly generated IDs.
 * Use this whenever creating a new block — not the static DEFAULT_BLOCK_PROPS.
 */
export function getDefaultProps(type: FunnelBlockType): Record<string, unknown> {
  switch (type) {
    case 'quest_dialog':        return { title: '', lines: [{ id: uid(), speaker: 'Recruiter', text: 'Hallo!' }] };
    case 'quest_decision':      return { question: 'Was würdest du tun?', options: [{ id: uid(), text: 'Option A', emoji: '', reaction: 'Gute Wahl!' }] };
    case 'quest_quiz':          return { question: 'Frage?', options: [{ id: uid(), text: 'Antwort A', correct: true, feedback: 'Richtig!' }] };
    case 'quest_lead':          return contactLeadDefault();
    case 'quest_hotspot':       return { imageUrl: '', hotspots: [{ id: uid(), x: 50, y: 50, label: 'Entdecke mich', description: '', icon: '' }], requireAll: true, doneText: 'Weiter erkunden' };
    case 'quest_zuordnung':     return { question: 'Ordne die Begriffe den richtigen Erklärungen zu:', pairs: [{ id: uid(), left: 'Begriff 1', right: 'Erklärung A' }, { id: uid(), left: 'Begriff 2', right: 'Erklärung B' }, { id: uid(), left: 'Begriff 3', right: 'Erklärung C' }], shuffleRight: true, showFeedback: true, feedbackText: 'Gut gemacht!' };
    case 'check_frage':         return { frageType: 'single_choice', question: 'Frage?', options: [{ id: uid(), text: 'Option A', scores: {} }], allowSkip: false };
    case 'check_ergebnisfrage': return { question: 'Ergebnisfrage?', options: [{ id: uid(), text: 'Option A', scores: {} }] };
    case 'check_swipe_deck':    return {
      question: 'Wie gefällt dir das?',
      allowSkip: true,
      cards: [
        {
          id: uid(),
          text: 'Du sollst eine Maschine reparieren.',
          imageUrl: '',
          optionPositive: { label: 'Klingt gut', emoji: '👍', scores: {} },
          optionNeutral:  { label: 'Geht so',    emoji: '😐', scores: {} },
          optionNegative: { label: 'Eher nicht', emoji: '👎', scores: {} },
        },
      ],
    };
    case 'check_lead':          return contactLeadDefault();
    case 'check_statements':    return {
      question: 'Was trifft auf dich zu?',
      statements: [
        { id: uid(), text: 'Ich helfe gerne Menschen', dimensionId: '', points: 2 },
        { id: uid(), text: 'Ich organisiere gerne', dimensionId: '', points: 2 },
      ],
    };
    case 'form_config':         return contactLeadDefault();
    // All other block types have no nested items with IDs — safe to return static values.
    default:                    return DEFAULT_BLOCK_PROPS[type];
  }
}

// Static defaults — safe for catalog display. Do NOT use for block creation
// if the block type has nested items with IDs (see getDefaultProps above).
export const DEFAULT_BLOCK_PROPS: Record<FunnelBlockType, Record<string, unknown>> = {
  heading:             { text: 'Überschrift', level: 2 },
  paragraph:           { text: '<p>Dein Text hier…</p>' },
  button:              { text: 'Weiter', url: '', variant: 'primary' },
  image:               { src: '', alt: '', caption: '' },
  spacer:              { height: 32 },
  video:               { url: '', caption: '' },
  quest_scene:         { title: 'Willkommen!', subtext: 'Erlebe virtuell einen typischen Arbeitstag als:', accentText: 'BERUFSBEZEICHNUNG', description: 'In wenigen Minuten bekommst du einen kleinen Einblick in den Arbeitsalltag und kannst selbst Entscheidungen treffen.', imageUrl: '', buttonText: 'Alles klar, verstanden!', bulletPoints: [] },
  quest_dialog:        { title: '', lines: [] },
  quest_decision:      { question: 'Was würdest du tun?', options: [] },
  quest_quiz:          { question: 'Frage?', options: [] },
  quest_info:          { title: 'Info', text: 'Informationstext' },
  quest_freetext:      { text: 'Freitext' },
  quest_file:          { title: 'Datei', fileUrl: '', fileName: 'dokument.pdf', buttonText: 'Herunterladen' },
  quest_spinner:       { text: 'Einen Moment…', doneText: 'Geschafft!' },
  quest_rating:        { question: 'Wie war dein Erlebnis?', emoji: '⭐', count: 5 },
  quest_hotspot:       { imageUrl: '', hotspots: [], requireAll: true, doneText: 'Weiter erkunden' },
  quest_zuordnung:     { question: 'Ordne die Begriffe den richtigen Erklärungen zu:', pairs: [], shuffleRight: true, showFeedback: true, feedbackText: 'Gut gemacht!' },
  quest_lead:          { headline: 'Interessiert?', subtext: 'Hinterlasse deine Kontaktdaten – wir melden uns bei dir.', buttonText: 'Jetzt bewerben', privacyText: 'Ich stimme zu, dass @companyName meine Daten speichert und mich kontaktiert.', thankYouHeadline: 'Vielen Dank!', thankYouText: 'Wir melden uns bei dir.', thankYouButtonText: '', thankYouButtonUrl: '', fields: [] },
  check_intro:         { headline: 'Bist du geeignet?', subtext: 'Mache jetzt den Check.', imageUrl: '', buttonText: 'Jetzt starten' },
  check_vorname:       { question: 'Wie heißt du?', placeholder: 'Dein Vorname', buttonText: 'Weiter' },
  check_frage:         { frageType: 'single_choice', question: 'Frage?', options: [], allowSkip: false },
  check_ergebnisfrage: { question: 'Ergebnisfrage?', options: [] },
  check_selbst:        { question: 'Wie schätzt du dich ein?', sliderMin: 0, sliderMax: 10, sliderStep: 1, sliderLabelMin: 'Gar nicht', sliderLabelMax: 'Sehr' },
  check_statements:    { question: 'Was trifft auf dich zu?', statements: [] },
  check_swipe_deck:    { question: 'Swipe dich durch die Szenarien', allowSkip: true, cards: [] },
  check_lead:          { headline: 'Interessiert?', subtext: 'Hinterlasse deine Kontaktdaten – wir melden uns bei dir.', buttonText: 'Jetzt bewerben', privacyText: 'Ich stimme zu, dass @companyName meine Daten speichert und mich kontaktiert.', thankYouHeadline: 'Vielen Dank!', thankYouText: 'Wir melden uns bei dir.', thankYouButtonText: '', thankYouButtonUrl: '', fields: [] },
  check_ergebnis:      { headline: 'Dein Ergebnis, @firstName!', subtext: 'Basierend auf deinen Antworten.', layout: 'simple', showDimensionBars: true, groups: [] },
  form_hero:           { headline: 'Jetzt anfragen', subtext: 'Wir melden uns bei dir.', imageUrl: '', ctaText: 'Jetzt anfragen' },
  form_text:           { headline: '', content: 'Ihr Text hier…' },
  form_image:          { imageUrl: '', caption: '' },
  form_step:           { title: 'Deine Angaben', description: '', fields: [] },
  form_config:         { headline: 'Interessiert?', subtext: 'Hinterlasse deine Kontaktdaten – wir melden uns bei dir.', buttonText: 'Jetzt bewerben', privacyText: 'Ich stimme zu, dass @companyName meine Daten speichert und mich kontaktiert.', thankYouHeadline: 'Vielen Dank!', thankYouText: 'Wir melden uns bei dir.', thankYouButtonText: '', thankYouButtonUrl: '', fields: [] },
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
    { type: 'quest_file',     label: 'Datei',         description: 'Downloadbarer Anhang (PDF etc.)',      category: 'Medien',      defaultProps: DEFAULT_BLOCK_PROPS.quest_file },
    { type: 'quest_hotspot',  label: 'Hotspot',       description: 'Klickbare Punkte auf einem Bild',      category: 'Interaktion', defaultProps: DEFAULT_BLOCK_PROPS.quest_hotspot },
    { type: 'quest_zuordnung', label: 'Zuordnung',    description: 'Begriffe mit Definitionen verbinden',  category: 'Interaktion', defaultProps: DEFAULT_BLOCK_PROPS.quest_zuordnung },
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
    { type: 'check_statements',    label: 'Schnell-Check',      description: 'Aussagen per Checkbox',        category: 'Eingabe',   defaultProps: DEFAULT_BLOCK_PROPS.check_statements },
    { type: 'check_swipe_deck',    label: 'Swipe-Karten',       description: 'Tinder-Style Szenario-Stack',  category: 'Eingabe',   defaultProps: DEFAULT_BLOCK_PROPS.check_swipe_deck },
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
  quest_file: 'Datei', quest_lead: 'Kontaktformular', quest_spinner: 'Ladescreen', quest_rating: 'Bewertung', quest_hotspot: 'Hotspot', quest_zuordnung: 'Zuordnung',
  check_intro: 'Intro', check_vorname: 'Name', check_frage: 'Frage', check_ergebnisfrage: 'Ergebnisfrage', check_selbst: 'Selbsteinschätzung', check_statements: 'Schnell-Check', check_swipe_deck: 'Swipe-Karten', check_lead: 'Kontaktformular', check_ergebnis: 'Ergebnis',
  form_hero: 'Hero', form_text: 'Textabschnitt', form_image: 'Bild', form_step: 'Formular-Schritt', form_config: 'Einstellungen',
};
