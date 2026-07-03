import {
  DEFAULT_FAQ_PROJECT_KEY,
  faqProjectHref,
  faqProjectToursHref,
  formatFaqProjectSubtitle,
  formatFaqProjectTitle,
  parseFaqProjectParam,
} from './faq-project';

export {
  DEFAULT_FAQ_PROJECT_KEY,
  faqProjectHref,
  faqProjectToursHref,
  formatFaqProjectSubtitle,
  formatFaqProjectTitle,
};

export function projectsIndexHref(): string {
  return '/dashboard/projects';
}

export function projectHubHref(projectKey: string): string {
  return `/dashboard/projects/${encodeURIComponent(projectKey)}`;
}

export function blueprintProjectHref(projectKey?: string): string {
  const trimmed = projectKey?.trim();
  if (!trimmed) {
    return '/dashboard/blueprints';
  }
  return `/dashboard/blueprints?projectKey=${encodeURIComponent(trimmed)}`;
}

export function parseProjectParam(raw: string): string {
  return parseFaqProjectParam(raw);
}

export function formatProjectSubtitle(projectKey: string): string {
  return formatFaqProjectSubtitle(projectKey);
}

export function formatProjectTitle(projectKey: string): string {
  return formatFaqProjectTitle(projectKey);
}

export function tourCreateHref(projectKey?: string): string {
  const trimmed = projectKey?.trim();
  if (!trimmed || trimmed === DEFAULT_FAQ_PROJECT_KEY) {
    return '/dashboard/tours/create';
  }
  return `/dashboard/tours/create?flowVersion=${encodeURIComponent(trimmed)}`;
}

export function toursListReturnHref(flowVersion?: string, newTourId?: string): string {
  const trimmed = flowVersion?.trim();
  const base = trimmed ? faqProjectToursHref(trimmed) : '/dashboard/tours';
  if (!newTourId) {
    return base;
  }
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}new=${encodeURIComponent(newTourId)}`;
}
