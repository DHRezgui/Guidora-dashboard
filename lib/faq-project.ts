export const DEFAULT_FAQ_PROJECT_KEY = 'default';

export function formatFaqProjectTitle(key: string): string {
  if (key === DEFAULT_FAQ_PROJECT_KEY) return 'FAQ générique';
  return key;
}

export function formatFaqProjectSubtitle(key: string): string {
  if (key === DEFAULT_FAQ_PROJECT_KEY) {
    return 'Corpus par défaut — sans flowVersion SDK spécifique';
  }
  return `Aligné sur le flowVersion SDK : ${key}`;
}

export function faqProjectHref(projectKey: string): string {
  return `/dashboard/faq/${encodeURIComponent(projectKey)}`;
}

export function faqProjectToursHref(projectKey?: string): string {
  const trimmed = projectKey?.trim();
  if (!trimmed) {
    return '/dashboard/tours';
  }
  return `/dashboard/tours?flowVersion=${encodeURIComponent(trimmed)}`;
}

export function parseFaqProjectParam(raw: string): string {
  try {
    return decodeURIComponent(raw).trim() || DEFAULT_FAQ_PROJECT_KEY;
  } catch {
    return raw.trim() || DEFAULT_FAQ_PROJECT_KEY;
  }
}
