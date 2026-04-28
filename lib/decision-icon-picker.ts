/**
 * Wählt ein passendes Lucide-Icon (DECISION_ICONS) für eine Decision-Option
 * basierend auf dem Antwort-Text. Greift, wenn das KI-Modell mehrere Optionen
 * mit demselben Icon belegt hat oder gar keins gesetzt hat — der Picker
 * sucht nach Keywords im Text und vergibt etwas Inhaltsbezogenes
 * (z.B. "Musik laut aufdrehen" → Music2, "Käse zurücklegen" → ShoppingCart).
 *
 * Nur Icons, die in DECISION_ICONS registriert sind, werden vorgeschlagen.
 */

interface KeywordRule {
  // Suchpattern — Wortgrenzen werden vom Picker selbst angehängt.
  match: RegExp;
  icon: string;
}

const KEYWORD_RULES: KeywordRule[] = [
  // Reden / Gespräch
  { match: /\b(frag(en|st|e)?|spreche?|gespräch|red(e|en)|erkläre?|erklären|sag(e|en)|mitteil)\w*/i, icon: 'MessageCircle' },
  { match: /\b(zuhör|aufmerksam|nachfrag)\w*/i, icon: 'MessageSquare' },

  // Beobachten / Abwarten
  { match: /\b(beobacht|wart(e|en)|schau(e|en)|seh(en|e)|guck)\w*/i, icon: 'Eye' },
  { match: /\b(zeit|spät|stund|minut|moment|geduld)\w*/i, icon: 'Clock' },

  // Ignorieren / Wegschauen
  { match: /\b(ignorier|wegschau|nicht\s*kümmer|wegseh)\w*/i, icon: 'EyeOff' },

  // Hilfe / Eingreifen / Hand anlegen
  { match: /\b(hilf|unterstütz|begleit|fördern)\w*/i, icon: 'HandHelping' },
  { match: /\b(hand|fass|berühr|greif|halt(e|en))\w*/i, icon: 'Hand' },

  // Sicherheit / Schutz / Gefahr / Stop
  { match: /\b(schütz|sicher(heit)?|abwend|verhinder)\w*/i, icon: 'ShieldCheck' },
  { match: /\b(gefahr|verletz|fahrläss|unverantwort|verbrenn|stürz)\w*/i, icon: 'AlertTriangle' },
  { match: /\b(stop+|halt|abbrech|sofort)\w*/i, icon: 'StopCircle' },

  // Zustimmen / Loben / Freude
  { match: /\b(zustimm|einverstand|gerne|toll|super|prima|klasse|freu(e|en)?)\w*/i, icon: 'ThumbsUp' },
  { match: /\b(traurig|trau(e|er)|frust|enttäusch)\w*/i, icon: 'Frown' },
  { match: /\b(freude|spaß|lustig|fröhlich)\w*/i, icon: 'Smile' },

  // Geld / Einkauf
  { match: /\b(bezahl|geld|teuer|kosten|euro|preis|budget|geldbeutel)\w*/i, icon: 'Wallet' },
  { match: /\b(einkauf|kauf(e|en)?|supermarkt|wagen|warenkorb|käse|lebensmittel)\w*/i, icon: 'ShoppingCart' },
  { match: /\b(rechnung|kassenzettel|beleg|quittung)\w*/i, icon: 'Receipt' },

  // Anrufen / Kontaktieren
  { match: /\b(anruf|telefonier|anwähl|notruf|holen.*hilfe|hilfe.*holen|alarm)\w*/i, icon: 'Phone' },
  { match: /\b(team|kolleg|gruppe|gemeinsam|zusammen)\w*/i, icon: 'Users' },
  { match: /\b(benachrichtig|alarmier|melden)\w*/i, icon: 'Bell' },

  // Erklären / Lernen / Vorschlag / Idee
  { match: /\b(idee|vorschlag|tipp|empfehlen|anregung)\w*/i, icon: 'Lightbulb' },
  { match: /\b(lernen|wissen|buch|lehr|aufklär|hinweis)\w*/i, icon: 'BookOpen' },

  // Musik / Geräusche / Lautstärke
  { match: /\b(musik|lied|song|melodie|radio)\w*/i, icon: 'Music2' },
  { match: /\b(laut|brüll|schrei)\w*/i, icon: 'Volume2' },
  { match: /\b(leise|ruhig|still)\w*/i, icon: 'VolumeX' },

  // Essen / Trinken / Mahlzeit
  { match: /\b(essen|mahlzeit|kochen|lecker|gericht|speise)\w*/i, icon: 'Utensils' },
  { match: /\b(kaffee|tee)\w*/i, icon: 'Coffee' },

  // Aktivität / Bewegung / Freizeit
  { match: /\b(aktivität|durchführ|durchgeführt|tätig|beschäftig|gemacht)\w*/i, icon: 'ClipboardCheck' },
  { match: /\b(freizeit|spiel|spaziergang|ausflug)\w*/i, icon: 'Sparkles' },

  // Pflege / Gesundheit
  { match: /\b(pflege|medikament|medizin|tablette)\w*/i, icon: 'Pill' },
  { match: /\b(verband|wunde|spritze|impf)\w*/i, icon: 'HeartPulse' },
  { match: /\b(gefühl|empfind|stimmung|emotion)\w*/i, icon: 'Heart' },

  // Suchen / Prüfen
  { match: /\b(suche?|finde?|prüf|check|nachschau|recherchier)\w*/i, icon: 'Search' },

  // Dokumentation / Schreiben / Notiz
  { match: /\b(dokument|notiz|aufschreib|protokoll|tagebuch|aufzeichn)\w*/i, icon: 'Clipboard' },

  // Erfolg / Auszeichnung
  { match: /\b(erfolg|sieg|gewinn|preis|trophäe|auszeichn)\w*/i, icon: 'Award' },

  // Entscheiden / Selbst handeln
  { match: /\b(selbst.*entscheid|allein.*entscheid|über.*kopf|entscheidung)\w*/i, icon: 'Hand' },

  // Lehnt ab / Verbietet
  { match: /\b(lehne?\s*ab|verbiet|untersag|nein\s*sag)\w*/i, icon: 'Ban' },
];

/**
 * Versucht, ein passendes Icon für einen Antwort-Text zu finden.
 * Gibt `null` zurück, wenn kein Keyword matched.
 */
export function pickIconForText(text: string): string | null {
  if (!text) return null;
  for (const rule of KEYWORD_RULES) {
    if (rule.match.test(text)) return rule.icon;
  }
  return null;
}

/**
 * Stellt sicher, dass innerhalb eines quest_decision-Blocks JEDE Option ein
 * unterschiedliches Icon hat. Bei Duplikaten wird zunächst per Keyword-Picker
 * ein inhaltsbezogenes Alternativ-Icon gesucht. Wenn das schon vergeben ist,
 * fällt es auf einen passenden Pool (negativ/positiv/neutral) zurück.
 */
const FALLBACK_NEGATIVE = ['XCircle', 'ThumbsDown', 'AlertTriangle', 'OctagonAlert', 'StopCircle', 'Ban', 'Frown', 'EyeOff', 'ShieldX', 'AlertCircle'] as const;
const FALLBACK_POSITIVE = ['CheckCircle', 'ThumbsUp', 'Smile', 'Heart', 'Sparkles', 'ShieldCheck', 'HandHelping', 'Star', 'Award'] as const;
const FALLBACK_NEUTRAL  = ['MessageCircle', 'MessageSquare', 'Hand', 'Eye', 'Clock', 'Hourglass', 'Lightbulb', 'BookOpen', 'Phone', 'Bell', 'HelpCircle', 'ClipboardCheck', 'Search', 'Wallet', 'ShoppingCart', 'Receipt', 'Music2', 'Utensils', 'Sparkles'] as const;

export function diversifyDecisionIcons<T extends { emoji?: string; isWrong?: boolean; text?: string }>(options: T[]): T[] {
  const used = new Set<string>();
  return options.map((opt) => {
    const original = opt.emoji;
    const text = opt.text ?? '';

    // Schritt 1: Wenn Original-Icon noch nicht vergeben ist UND es zum Text passt
    // (oder gar kein Keyword im Text greift), behalten wir es.
    if (original && !used.has(original)) {
      used.add(original);
      return opt;
    }

    // Schritt 2: Inhaltsbezogenes Icon aus dem Text raten.
    const picked = pickIconForText(text);
    if (picked && !used.has(picked)) {
      used.add(picked);
      return { ...opt, emoji: picked };
    }

    // Schritt 3: Pool-Fallback je nach isWrong.
    const pool = opt.isWrong ? FALLBACK_NEGATIVE : FALLBACK_POSITIVE;
    let alt: string | undefined = pool.find((c) => !used.has(c));
    if (!alt) alt = FALLBACK_NEUTRAL.find((c) => !used.has(c));
    if (!alt) return opt; // alle Pools verbraucht — Original behalten
    used.add(alt);
    return { ...opt, emoji: alt };
  });
}

/**
 * Wendet `diversifyDecisionIcons` auf alle quest_decision-Blöcke einer
 * Pages-Liste an. Toleriert lose Page-Strukturen (Record<string, unknown>),
 * weil Aufrufer KI-Output unbearbeitet durchschleifen.
 *
 * Geteilt von refine-quest, generate-quest und dialog-pass.
 */
type LooseNode = { type?: unknown; props?: Record<string, unknown> } & Record<string, unknown>;
type LoosePage = { nodes?: unknown } & Record<string, unknown>;

export function diversifyDecisionIconsInPages<P extends Record<string, unknown>>(pages: P[]): P[] {
  return pages.map((page) => {
    const p = page as LoosePage;
    if (!Array.isArray(p.nodes)) return page;
    const nodes = (p.nodes as LooseNode[]).map((node) => {
      if (node?.type !== 'quest_decision') return node;
      const props = node.props;
      if (!props || !Array.isArray(props.options)) return node;
      const diversified = diversifyDecisionIcons(props.options as Array<{ emoji?: string; isWrong?: boolean; text?: string }>);
      return { ...node, props: { ...props, options: diversified } };
    });
    return { ...page, nodes } as P;
  });
}
