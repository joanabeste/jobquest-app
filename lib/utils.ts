import { Company, QuestModule, SceneModule, DialogModule, DecisionModule, QuizModule, InfoModule, FreetextModule, ModuleType } from './types';

export function createModule(type: ModuleType): QuestModule {
  const base = { id: crypto.randomUUID(), type };
  switch (type) {
    case 'scene':    return { ...base, type: 'scene', title: '', description: '' };
    case 'dialog':   return { ...base, type: 'dialog', lines: [{ id: crypto.randomUUID(), speaker: '', text: '' }] };
    case 'decision': return { ...base, type: 'decision', question: '', options: [{ id: crypto.randomUUID(), text: '', reaction: '' }, { id: crypto.randomUUID(), text: '', reaction: '' }] };
    case 'quiz':     return { ...base, type: 'quiz', question: '', options: [{ id: crypto.randomUUID(), text: '', correct: true, feedback: '' }, { id: crypto.randomUUID(), text: '', correct: false, feedback: '' }] };
    case 'info':     return { ...base, type: 'info', title: '', text: '' };
    case 'freetext': return { ...base, type: 'freetext', text: '' };
    case 'image':    return { ...base, type: 'image', imageUrl: '' };
    case 'video':    return { ...base, type: 'video', videoUrl: '' };
    case 'audio':    return { ...base, type: 'audio', audioUrl: '' };
    case 'file':     return { ...base, type: 'file', fileUrl: '', filename: '' };
    default:         return base as QuestModule;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateSlug(title: string): string {
  const base = slugify(title) || 'quest';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('de-DE');
}

export function getModuleTitle(module: QuestModule): string {
  switch (module.type) {
    case 'scene':
      return (module as SceneModule).title || 'Szene';
    case 'dialog':
      return (module as DialogModule).title || 'Dialog';
    case 'decision':
      return (module as DecisionModule).question?.slice(0, 40) || 'Entscheidung';
    case 'quiz':
      return (module as QuizModule).question?.slice(0, 40) || 'Quiz';
    case 'info':
      return (module as InfoModule).title || 'Info';
    case 'freetext':
      return (module as FreetextModule).text?.slice(0, 40) || 'Freitext';
    case 'image':
      return 'Bild-Block';
    case 'video':
      return 'Video-Block';
    case 'audio':
      return 'Audio-Block';
    case 'file':
      return 'Datei-Block';
    default:
      return 'Modul';
  }
}

export function generateMockStory(company: Company, jobTitle: string): QuestModule[] {
  const modules: QuestModule[] = [
    {
      id: crypto.randomUUID(),
      type: 'scene',
      title: `Ein Tag als ${jobTitle} bei ${company.name}`,
      description: `Willkommen! Begleite uns auf einer spannenden Reise durch den Berufsalltag als ${jobTitle} bei ${company.name} in ${company.location}. Entdecke, was dich erwartet und ob dieser Beruf zu dir passt!`,
    } as SceneModule,
    {
      id: crypto.randomUUID(),
      type: 'dialog',
      title: 'Begrüßung',
      lines: [
        {
          id: crypto.randomUUID(),
          speaker: 'Ausbilder:in',
          text: `Herzlich willkommen bei ${company.name}! Schön, dass du heute dabei bist. Ich zeige dir, wie dein Alltag als ${jobTitle} aussieht.`,
        },
        {
          id: crypto.randomUUID(),
          speaker: 'Du',
          text: 'Vielen Dank! Ich freue mich sehr, alles kennenzulernen.',
        },
        {
          id: crypto.randomUUID(),
          speaker: 'Ausbilder:in',
          text: `Dann lass uns starten! Als ${jobTitle} erwartet dich jeden Tag etwas Neues. Teamarbeit, spannende Aufgaben und viel Abwechslung gehören dazu.`,
        },
      ],
    } as DialogModule,
    {
      id: crypto.randomUUID(),
      type: 'info',
      title: `${company.name} stellt sich vor`,
      text: `${company.name} ist ein erfolgreiches Unternehmen in der Branche ${company.industry}, ansässig in ${company.location}. Wir bieten dir eine moderne Ausbildung mit hervorragenden Zukunftsperspektiven, einem starken Team und echter Wertschätzung. Bei uns bist du nicht nur Azubi – du bist Teil der Familie!`,
    } as InfoModule,
    {
      id: crypto.randomUUID(),
      type: 'quiz',
      question: `Was glaubst du – welche Eigenschaft ist für eine Ausbildung als ${jobTitle} besonders wichtig?`,
      options: [
        {
          id: crypto.randomUUID(),
          text: 'Teamfähigkeit und Kommunikationsbereitschaft',
          correct: true,
          feedback: '✅ Richtig! Teamarbeit und gute Kommunikation sind entscheidend.',
        },
        {
          id: crypto.randomUUID(),
          text: 'Lieber immer alleine arbeiten',
          correct: false,
          feedback: '❌ Das stimmt nicht ganz. Im Team zu arbeiten ist sehr wichtig!',
        },
        {
          id: crypto.randomUUID(),
          text: 'Nur auf Anweisung warten',
          correct: false,
          feedback: '❌ Eigeninitiative wird sehr geschätzt – trau dich!',
        },
      ],
    } as QuizModule,
    {
      id: crypto.randomUUID(),
      type: 'decision',
      question: 'Du bekommst eine neue, komplexe Aufgabe, die du noch nicht kennst. Was tust du?',
      options: [
        {
          id: crypto.randomUUID(),
          text: 'Ich frage mein:e Ausbilder:in um Hilfe',
          reaction: '👍 Super! Nachfragen zeigt Eigeninitiative und ist immer erwünscht. So lernst du am schnellsten!',
        },
        {
          id: crypto.randomUUID(),
          text: 'Ich versuche es zuerst selbst und frage bei Bedarf',
          reaction: '💪 Klasse! Eigene Versuche und Nachfragen bei Bedarf – genau das richtige Vorgehen!',
        },
        {
          id: crypto.randomUUID(),
          text: 'Ich warte, bis mir jemand hilft',
          reaction: '😕 Hmm, besser wäre es, aktiv Unterstützung zu suchen. Keine Scheu – Fragen ist immer okay!',
        },
      ],
    } as DecisionModule,
    {
      id: crypto.randomUUID(),
      type: 'scene',
      title: 'Dein Arbeitsalltag',
      description: `Als ${jobTitle} bei ${company.name} startest du deinen Tag um 8:00 Uhr. Nach einem kurzen Team-Meeting bearbeitest du deine Aufgaben, lernst neue Fähigkeiten und wächst jeden Tag über dich hinaus. Die Mittagspause verbringst du mit deinen Kolleg:innen – bei uns ist das Betriebsklima toll!`,
    } as SceneModule,
    {
      id: crypto.randomUUID(),
      type: 'freetext',
      text: `Nach deiner erfolgreich abgeschlossenen Ausbildung als ${jobTitle} bei ${company.name} hast du hervorragende Karrierechancen. Viele unserer Absolvent:innen werden direkt übernommen oder starten eine erfolgreiche Karriere in der Branche. Wir investieren in deine Zukunft – mit Schulungen, Weiterbildungen und einem starken Netzwerk. Bewirb dich jetzt und starte deine Karriere bei uns!`,
    } as FreetextModule,
  ];

  return modules;
}

export function exportLeadsAsCSV(leads: { firstName: string; lastName: string; email: string; phone?: string; gdprConsent: boolean; submittedAt: string }[]): void {
  const headers = ['Vorname', 'Nachname', 'E-Mail', 'Telefon', 'DSGVO-Einwilligung', 'Eingegangen am'];
  const rows = leads.map((l) => [
    l.firstName,
    l.lastName,
    l.email,
    l.phone || '',
    l.gdprConsent ? 'Ja' : 'Nein',
    formatDateTime(l.submittedAt),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
