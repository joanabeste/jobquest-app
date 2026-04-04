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
