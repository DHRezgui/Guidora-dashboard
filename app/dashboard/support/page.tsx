'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RoleRouteGuard } from '@/components/dashboard/RoleRouteGuard';
import { PhoenixConfirmModal } from '@/components/dashboard/PhoenixConfirmModal';
import { SearchableProjectKeyFilter } from '@/components/dashboard/searchable-project-key-filter';
import { CatalogListPagination } from '@/components/dashboard/catalog-list-pagination';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getErrorMessage,
  authService,
  projectService,
  supportTicketService,
  tourService,
  type SupportTicketAdminReply,
  type SupportTicketHistoryEntry,
  type SupportTicketRow,
  type User,
} from '@/lib/api';
import { canDeleteSupportTickets, getDashboardRole } from '@/lib/dashboard-roles';
import { DEFAULT_FAQ_PROJECT_KEY, formatProjectTitle } from '@/lib/project';
import {
  BLUEPRINT_SELECT_CONTENT_CLASS,
  BLUEPRINT_SELECT_TRIGGER_CLASS,
  PHOENIX_FIELD_CLASS,
  PHOENIX_INSET_PANEL_CLASS,
  PHOENIX_LABEL_CLASS,
} from '@/app/dashboard/blueprints/blueprint-shared';
import {
  PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
  PHOENIX_PRIMARY_BUTTON_CLASS,
  PHOENIX_SECRET_CODE_BLOCK_CLASS,
} from '@/lib/phoenix-ui';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type StatusFilter = 'active' | 'all' | SupportTicketRow['status'];

const SUPPORT_TICKETS_PAGE_SIZE = 5;
const REPLY_BODY_PREVIEW_CHARS = 160;
const REPLY_HISTORY_PREVIEW_COUNT = 2;

const STATUS_LABELS: Record<SupportTicketRow['status'], string> = {
  OPEN: 'Ouvert',
  IN_PROGRESS: 'En cours',
  RESOLVED: 'Résolu',
  CLOSED: 'Archivé',
};

const PRIORITY_LABELS: Record<SupportTicketRow['priority'], string> = {
  LOW: 'Basse',
  MEDIUM: 'Moyenne',
  HIGH: 'Haute',
  URGENT: 'Urgente',
};

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'active', label: 'Actifs' },
  { value: 'OPEN', label: 'Ouvert' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'RESOLVED', label: 'Résolu' },
  { value: 'CLOSED', label: 'Archivé' },
  { value: 'all', label: 'Tous' },
];

const STATUS_BADGE_CLASS: Record<SupportTicketRow['status'], string> = {
  OPEN: 'border-amber-400/40 bg-amber-500/10 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100',
  IN_PROGRESS:
    'border-sky-400/40 bg-sky-500/10 text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-100',
  RESOLVED:
    'border-emerald-400/40 bg-emerald-500/10 text-emerald-900 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-100',
  CLOSED:
    'border-slate-300/70 bg-slate-100/80 text-slate-700 dark:border-white/15 dark:bg-slate-800/50 dark:text-slate-300',
};

const PHOENIX_SELECT_TRIGGER =
  'h-9 min-w-[8.5rem] rounded-lg border-slate-300 bg-white/90 text-xs font-medium text-slate-700 transition-colors hover:border-orange-400/40 focus-visible:ring-orange-400/20 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 [&_svg]:text-orange-600/80 dark:[&_svg]:text-orange-300/90';

const PHOENIX_SELECT_ITEM =
  'text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:bg-orange-500/25 dark:focus:text-white';

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function truncateReplyBody(
  body: string,
  max = REPLY_BODY_PREVIEW_CHARS,
): { text: string; truncated: boolean } {
  const trimmed = body.trim();
  if (trimmed.length <= max) return { text: trimmed, truncated: false };
  return { text: `${trimmed.slice(0, max).trimEnd()}…`, truncated: true };
}

function shouldOpenReplyHistoryByDefault(replies: SupportTicketAdminReply[]): boolean {
  if (replies.length === 0 || replies.length > REPLY_HISTORY_PREVIEW_COUNT) return false;
  return replies.every((r) => (r.body?.trim().length ?? 0) <= REPLY_BODY_PREVIEW_CHARS * 1.5);
}

function replyAuthorLabel(reply: SupportTicketAdminReply): string {
  if (reply.authorName || reply.authorEmail) {
    return ` · ${reply.authorName || reply.authorEmail}`;
  }
  return '';
}

type DetailChip = { label: string; value: string };

type HelpEpisodeView = {
  trigger?: string;
  frictionAtTrigger?: number;
  riskAtTrigger?: number;
  timeOnPageAtTrigger?: number;
  pageTimeAtTrigger?: number;
  idleSecondsAtTrigger?: number;
  capturedAt?: string;
};

function episodeTriggerLabel(trigger: string): string {
  if (trigger === 'proactiveToast') return 'Suggestion d’aide automatique';
  if (trigger === 'manualFaq') return 'Ouverture manuelle de l’aide';
  if (trigger === 'tour') return 'Parcours guidé';
  return trigger;
}

function assistanceStateLabel(state: string): string {
  if (state === 'faq') return 'Aide / FAQ ouverte';
  if (state === 'tour') return 'Parcours guidé en cours';
  if (state === 'proactiveToast') return 'Suggestion d’aide affichée';
  if (state === 'none') return 'Aucune aide ouverte';
  return state;
}

function readHelpEpisode(sessionData: Record<string, unknown> | undefined): HelpEpisodeView | null {
  const raw = sessionData?.episode;
  if (!raw || typeof raw !== 'object') return null;
  return raw as HelpEpisodeView;
}

function buildEpisodeChips(sessionData: Record<string, unknown> | undefined): DetailChip[] {
  const episode = readHelpEpisode(sessionData);
  if (!episode?.trigger) return [];
  const chips: DetailChip[] = [
    { label: 'Ouverture de l’aide', value: episodeTriggerLabel(episode.trigger) },
  ];
  if (typeof episode.frictionAtTrigger === 'number') {
    chips.push({
      label: 'Niveau de difficulté',
      value: `${Math.round(episode.frictionAtTrigger * 100)}%`,
    });
  }
  if (typeof episode.riskAtTrigger === 'number') {
    chips.push({
      label: 'Risque d’abandon',
      value: `${Math.round(episode.riskAtTrigger * 100)}%`,
    });
  }
  const timeAtTrigger =
    typeof episode.timeOnPageAtTrigger === 'number'
      ? episode.timeOnPageAtTrigger
      : typeof episode.pageTimeAtTrigger === 'number'
        ? episode.pageTimeAtTrigger
        : null;
  if (timeAtTrigger != null) {
    chips.push({ label: 'Temps passé', value: `${timeAtTrigger}s` });
  }
  if (typeof episode.idleSecondsAtTrigger === 'number') {
    chips.push({ label: 'Inactivité', value: `${episode.idleSecondsAtTrigger}s` });
  }
  return chips;
}

function buildSubmitChips(ticket: SupportTicketRow): DetailChip[] {
  const chips: DetailChip[] = [];
  if (ticket.pageUrl) chips.push({ label: 'Page', value: ticket.pageUrl });
  const sessionData = ticket.sessionData;
  if (!sessionData) return chips;
  if (typeof sessionData.browser === 'string' && sessionData.browser.trim()) {
    chips.push({ label: 'Navigateur', value: sessionData.browser.trim() });
  }
  if (typeof sessionData.assistanceState === 'string') {
    chips.push({
      label: 'Aide ouverte',
      value: assistanceStateLabel(sessionData.assistanceState),
    });
  }
  if (typeof sessionData.frictionScore === 'number') {
    chips.push({
      label: 'Niveau de difficulté',
      value: `${Math.round(sessionData.frictionScore * 100)}%`,
    });
  }
  if (typeof sessionData.abandonmentRisk === 'number') {
    chips.push({
      label: 'Risque d’abandon',
      value: `${Math.round(sessionData.abandonmentRisk * 100)}%`,
    });
  }
  const timeOnPage =
    typeof sessionData.timeOnPage === 'number'
      ? sessionData.timeOnPage
      : typeof sessionData.pageTime === 'number'
        ? sessionData.pageTime
        : null;
  if (timeOnPage != null) {
    chips.push({ label: 'Temps passé', value: `${timeOnPage}s` });
  }
  if (typeof sessionData.faqSearchCount === 'number' && sessionData.faqSearchCount > 0) {
    chips.push({ label: 'Recherches dans l’aide', value: String(sessionData.faqSearchCount) });
  }
  if (typeof sessionData.faqLastQuery === 'string' && sessionData.faqLastQuery.trim()) {
    chips.push({ label: 'Dernière recherche', value: sessionData.faqLastQuery.trim() });
  }
  if (typeof sessionData.activeTourId === 'string' && sessionData.activeTourId.trim()) {
    const step =
      typeof sessionData.activeTourStep === 'number'
        ? ` · étape ${sessionData.activeTourStep + 1}`
        : '';
    chips.push({
      label: 'Parcours en cours',
      value: `${sessionData.activeTourId.trim()}${step}`,
    });
  }
  if (
    typeof sessionData.lastCompletedTourName === 'string' &&
    sessionData.lastCompletedTourName.trim()
  ) {
    chips.push({
      label: 'Dernier parcours terminé',
      value: sessionData.lastCompletedTourName.trim(),
    });
  } else if (
    typeof sessionData.lastCompletedTourId === 'string' &&
    sessionData.lastCompletedTourId.trim()
  ) {
    chips.push({
      label: 'Dernier parcours terminé',
      value: sessionData.lastCompletedTourId.trim(),
    });
  }
  return chips;
}

function renderContextChips(ticketId: string, chips: DetailChip[], section: string) {
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <div
          key={`${ticketId}-${section}-${chip.label}`}
          className="max-w-full rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-1.5 dark:border-white/10 dark:bg-slate-900/45"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {chip.label}
          </p>
          <p className="mt-0.5 break-all text-xs font-medium text-slate-800 dark:text-slate-100">
            {chip.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function splitSessionDataForDisplay(sessionData: Record<string, unknown> | undefined): {
  diagnostic: Record<string, unknown>;
  sdkConfig: Record<string, unknown> | null;
  hasExtra: boolean;
} {
  if (!sessionData || typeof sessionData !== 'object') {
    return { diagnostic: {}, sdkConfig: null, hasExtra: false };
  }
  const { supportBrand, ...rest } = sessionData;
  const sdkConfig =
    supportBrand && typeof supportBrand === 'object'
      ? (supportBrand as Record<string, unknown>)
      : null;
  return {
    diagnostic: rest,
    sdkConfig,
    hasExtra: Object.keys(rest).length > 0 || Boolean(sdkConfig),
  };
}

function memberDisplayName(member: Pick<User, 'firstName' | 'lastName' | 'email'>): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
  return name || member.email;
}

/** Liste déroulante : toujours l’e-mail pour distinguer les homonymes. */
function memberOptionLabel(member: User): string {
  const name = memberDisplayName(member);
  const email = member.email?.trim() || '';
  const role = member.role;
  if (!email || name.toLowerCase() === email.toLowerCase()) {
    return role ? `${email} (${role})` : email;
  }
  return role ? `${name} · ${email} (${role})` : `${name} · ${email}`;
}

/** Valeur affichée dans le trigger (compacte mais unique). */
function assigneeLabel(ticket: SupportTicketRow, members: User[]): string {
  if (!ticket.assignedTo) return 'Non assigné';
  const member = members.find((m) => m.id === ticket.assignedTo);
  if (member) {
    const name = memberDisplayName(member);
    const email = member.email?.trim();
    if (email && name.toLowerCase() !== email.toLowerCase()) {
      return `${name} · ${email}`;
    }
    return email || name;
  }
  if (ticket.assigneeName?.trim() && ticket.assigneeEmail?.trim()) {
    return `${ticket.assigneeName.trim()} · ${ticket.assigneeEmail.trim()}`;
  }
  if (ticket.assigneeName?.trim()) return ticket.assigneeName.trim();
  if (ticket.assigneeEmail?.trim()) return ticket.assigneeEmail.trim();
  return 'Assigné';
}

function historyActorLabel(entry: SupportTicketHistoryEntry): string {
  if (entry.actorName && entry.actorEmail) return `${entry.actorName} · ${entry.actorEmail}`;
  return entry.actorName || entry.actorEmail || 'Système';
}

function historyEntryTitle(entry: SupportTicketHistoryEntry): string {
  switch (entry.kind) {
    case 'created':
      return 'Ticket créé';
    case 'takeover':
      return 'Prise en charge';
    case 'assignment':
      return 'Assignation';
    case 'unassign':
      return 'Désassignation';
    case 'archive':
      return 'Archivage';
    case 'unarchive':
      return 'Désarchivage';
    case 'reopen':
      return 'Réouverture';
    case 'status':
      return 'Changement de statut';
    default:
      return 'Événement';
  }
}

function historyEntryDetail(entry: SupportTicketHistoryEntry): string {
  if (
    entry.kind === 'assignment' ||
    entry.kind === 'takeover' ||
    entry.kind === 'unassign'
  ) {
    const from = entry.fromAssigneeLabel || 'Non assigné';
    const to = entry.toAssigneeLabel || 'Non assigné';
    return `${from} → ${to}`;
  }
  const from = entry.fromStatus ? STATUS_LABELS[entry.fromStatus] : '—';
  const to = entry.toStatus ? STATUS_LABELS[entry.toStatus] : '—';
  return `${from} → ${to}`;
}

function ticketContactEmail(ticket: SupportTicketRow): string | null {
  if (ticket.contactEmail?.trim()) return ticket.contactEmail.trim();
  const fromSession =
    typeof ticket.sessionData?.contactEmail === 'string'
      ? ticket.sessionData.contactEmail.trim()
      : '';
  return fromSession || null;
}

export default function SupportTicketsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectFromUrl = searchParams.get('projectKey')?.trim() || '';
  // On ne veut plus afficher "FAQ générique" dans le filtre : la clé `default` doit rester
  // uniquement une valeur technique côté backend (et non un projet UI).
  const normalizedProjectFromUrl =
    projectFromUrl && projectFromUrl === DEFAULT_FAQ_PROJECT_KEY ? '' : projectFromUrl;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SupportTicketRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [projectFilter, setProjectFilter] = useState(normalizedProjectFromUrl);
  const [projectKeys, setProjectKeys] = useState<string[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyHistoryOpen, setReplyHistoryOpen] = useState<Record<string, boolean>>({});
  const [replyHistoryShowAll, setReplyHistoryShowAll] = useState<Record<string, boolean>>({});
  const [replyBodyExpanded, setReplyBodyExpanded] = useState<Record<string, boolean>>({});
  const [contextAdvancedOpen, setContextAdvancedOpen] = useState<Record<string, boolean>>({});
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [takeOverModal, setTakeOverModal] = useState<{
    ticketId: string;
    step: 'forceUnlock' | 'collabs';
    forceUnlock: boolean;
    /** Target assignee (self take-over or select reassignment). Null = unassign. */
    nextAssignedTo: string | null;
  } | null>(null);
  const [canDeleteTickets, setCanDeleteTickets] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [historyTicketId, setHistoryTicketId] = useState<string | null>(null);
  const [historyScope, setHistoryScope] = useState<'assignment' | 'status'>('assignment');
  const [historyItems, setHistoryItems] = useState<SupportTicketHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    setCanDeleteTickets(canDeleteSupportTickets(getDashboardRole(user)));
    setCurrentUserId(user?.id ?? null);
  }, []);

  const hasTakeOverCooldown = items.some((t) => Boolean(t.capabilities?.takeOverAvailableAt));
  useEffect(() => {
    if (!hasTakeOverCooldown) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasTakeOverCooldown]);

  const replaceTicket = useCallback((ticket: SupportTicketRow) => {
    setItems((prev) => prev.map((item) => (item.id === ticket.id ? ticket : item)));
  }, []);

  useEffect(() => {
    setProjectFilter(normalizedProjectFromUrl);
  }, [normalizedProjectFromUrl]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, projectFilter]);

  const totalPages = Math.max(1, Math.ceil(count / SUPPORT_TICKETS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const loadMeta = useCallback(async () => {
    try {
      const [projectsRes, membersRes] = await Promise.all([
        projectService.list(),
        tourService.getOrganizationMembers(),
      ]);
      const keys = (projectsRes.projects ?? [])
        .map((p) => p.projectKey)
        .filter(Boolean)
        .filter((k) => k !== DEFAULT_FAQ_PROJECT_KEY);
      setProjectKeys(
        [...new Set(keys)].sort((a, b) => a.localeCompare(b)),
      );
      setMembers(membersRes.users ?? []);
    } catch {
      // non-blocking — tickets can still load
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const listParams: Parameters<typeof supportTicketService.list>[0] = {
        projectKey: projectFilter || undefined,
        limit: SUPPORT_TICKETS_PAGE_SIZE,
        offset: (safePage - 1) * SUPPORT_TICKETS_PAGE_SIZE,
      };
      if (statusFilter === 'active') {
        listParams.activeOnly = true;
      } else if (statusFilter !== 'all') {
        listParams.status = statusFilter;
      }
      const response = await supportTicketService.list(listParams);
      setItems(response.items ?? []);
      setCount(response.count ?? 0);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de charger les tickets support'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, projectFilter, safePage]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    void load();
  }, [load]);

  const queueSummary = useMemo(() => {
    if (loading) return 'Chargement…';
    const ticketLabel = `${count} ticket${count !== 1 ? 's' : ''}`;
    const filterHint =
      statusFilter === 'active'
        ? ' actifs'
        : statusFilter === 'all'
          ? ''
          : ` · ${STATUS_LABELS[statusFilter].toLowerCase()}`;
    const pageHint =
      count > SUPPORT_TICKETS_PAGE_SIZE ? ` · page ${safePage}/${totalPages}` : '';
    return `${ticketLabel}${filterHint}${pageHint}`;
  }, [loading, count, statusFilter, safePage, totalPages]);

  const setProjectInUrl = (next: string) => {
    const value = next.trim();
    const normalizedValue = value === DEFAULT_FAQ_PROJECT_KEY ? '' : value;
    setProjectFilter(normalizedValue);
    const params = new URLSearchParams(searchParams.toString());
    if (normalizedValue) params.set('projectKey', normalizedValue);
    else params.delete('projectKey');
    const qs = params.toString();
    router.replace(qs ? `/dashboard/support?${qs}` : '/dashboard/support');
  };

  const handleResolve = async (ticketId: string) => {
    setResolvingId(ticketId);
    try {
      const res = await supportTicketService.resolve(ticketId);
      toast.success('Ticket marqué comme résolu');
      if (replyOpenId === ticketId) setReplyOpenId(null);
      if (res.ticket) replaceTicket(res.ticket);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de résoudre le ticket'));
    } finally {
      setResolvingId(null);
    }
  };

  const openReplyPanel = async (ticket: SupportTicketRow) => {
    if (replyOpenId === ticket.id) {
      setReplyOpenId(null);
      try {
        const res = await supportTicketService.releaseEditLock(ticket.id);
        if (res.ticket) replaceTicket(res.ticket);
      } catch {
        // non-blocking
      }
      return;
    }
    if (ticket.capabilities?.mustSelfAssignToAct) {
      toast.error('Assignez-vous ce ticket avant de répondre.');
      return;
    }
    if (!ticket.capabilities?.canReply) {
      toast.error('Vous n’avez pas le droit de répondre sur ce ticket.');
      return;
    }
    try {
      const locked = await supportTicketService.acquireEditLock(ticket.id);
      if (locked.ticket) replaceTicket(locked.ticket);
      setReplyOpenId(ticket.id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de verrouiller le ticket'));
    }
  };

  const handleReply = async (ticketId: string) => {
    const message = (replyDrafts[ticketId] ?? '').trim();
    if (message.length < 5) {
      toast.error('La réponse doit contenir au moins 5 caractères.');
      return;
    }
    setReplyingId(ticketId);
    try {
      const res = await supportTicketService.reply(ticketId, { message });
      toast.success('Réponse envoyée par e-mail');
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[ticketId];
        return next;
      });
      setReplyOpenId(null);
      if (res.ticket) replaceTicket(res.ticket);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible d’envoyer la réponse'));
    } finally {
      setReplyingId(null);
    }
  };

  const handleUpdate = async (
    ticketId: string,
    payload: {
      status?: SupportTicketRow['status'];
      priority?: SupportTicketRow['priority'];
      assignedTo?: string | null;
      forceUnlock?: boolean;
      keepCollaborators?: boolean;
    },
  ) => {
    if (updatingId === ticketId) return;
    setUpdatingId(ticketId);
    try {
      const res = await supportTicketService.update(ticketId, payload);
      toast.success(
        payload.assignedTo !== undefined && payload.assignedTo === currentUserId
          ? 'Ticket pris en charge'
          : 'Ticket mis à jour',
      );
      if (payload.status === 'RESOLVED' || payload.status === 'CLOSED') {
        if (replyOpenId === ticketId) setReplyOpenId(null);
      }
      setTakeOverModal(null);
      if (res.ticket) replaceTicket(res.ticket);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de mettre à jour le ticket'));
      await load();
    } finally {
      setUpdatingId(null);
    }
  };

  /**
   * Any assignee change that would clear collabs (take-over or select) asks first.
   * Modal only when collaborators are present.
   */
  const requestAssignmentChange = (
    ticket: SupportTicketRow,
    nextAssignedTo: string | null,
    options: { forceUnlock?: boolean } = {},
  ) => {
    if (updatingId === ticket.id) return;
    const prev = ticket.assignedTo ?? null;
    if (prev === nextAssignedTo) return;

    const caps = ticket.capabilities;
    const lockHeldByOther = Boolean(ticket.editLock) && !ticket.editLock?.heldByMe;
    const collabCount = (ticket.collaborators ?? []).length;
    const isSelfTakeOver =
      nextAssignedTo != null &&
      nextAssignedTo === currentUserId &&
      Boolean(prev) &&
      prev !== currentUserId &&
      (Boolean(caps?.canTakeOver) ||
        Boolean(caps?.canForceTakeOver) ||
        Boolean(caps?.assigneeInactive));

    if (lockHeldByOther) {
      if (isSelfTakeOver || options.forceUnlock) {
        setTakeOverModal({
          ticketId: ticket.id,
          step: 'forceUnlock',
          forceUnlock: true,
          nextAssignedTo,
        });
        return;
      }
      toast.error('Ticket verrouillé — forcez le déverrouillage d’abord.');
      return;
    }

    if (collabCount > 0) {
      setTakeOverModal({
        ticketId: ticket.id,
        step: 'collabs',
        forceUnlock: Boolean(options.forceUnlock),
        nextAssignedTo,
      });
      return;
    }

    void handleUpdate(ticket.id, {
      assignedTo: nextAssignedTo,
      ...(options.forceUnlock ? { forceUnlock: true } : {}),
    });
  };

  const handleSelfAssign = (ticketId: string) => {
    if (!currentUserId) return;
    const ticket = items.find((t) => t.id === ticketId);
    if (!ticket) return;
    requestAssignmentChange(ticket, currentUserId);
  };

  const executeAssignmentFromModal = async (keepCollaborators: boolean) => {
    if (!takeOverModal) return;
    await handleUpdate(takeOverModal.ticketId, {
      assignedTo: takeOverModal.nextAssignedTo,
      ...(takeOverModal.forceUnlock ? { forceUnlock: true } : {}),
      ...(keepCollaborators ? { keepCollaborators: true } : {}),
    });
  };

  const takeOverTarget = useMemo(
    () =>
      takeOverModal
        ? items.find((ticket) => ticket.id === takeOverModal.ticketId) ?? null
        : null,
    [takeOverModal, items],
  );

  const openHistory = async (
    ticketId: string,
    scope: 'assignment' | 'status',
  ) => {
    const same = historyTicketId === ticketId && historyScope === scope;
    if (same) {
      setHistoryTicketId(null);
      setHistoryItems([]);
      return;
    }
    setHistoryTicketId(ticketId);
    setHistoryScope(scope);
    setHistoryLoading(true);
    try {
      const res = await supportTicketService.history(ticketId, scope);
      setHistoryItems(res.items ?? []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de charger l’historique'));
      setHistoryTicketId(null);
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleArchive = async (ticketId: string) => {
    setArchivingId(ticketId);
    try {
      const res = await supportTicketService.archive(ticketId);
      toast.success('Ticket archivé');
      if (replyOpenId === ticketId) setReplyOpenId(null);
      if (res.ticket) replaceTicket(res.ticket);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible d’archiver le ticket'));
    } finally {
      setArchivingId(null);
    }
  };

  const handleUnarchive = async (ticketId: string) => {
    setArchivingId(ticketId);
    try {
      const res = await supportTicketService.unarchive(ticketId);
      toast.success('Ticket désarchivé');
      if (res.ticket) replaceTicket(res.ticket);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de désarchiver le ticket'));
    } finally {
      setArchivingId(null);
    }
  };

  const handleReopen = async (ticketId: string) => {
    setArchivingId(ticketId);
    try {
      const res = await supportTicketService.reopen(ticketId);
      toast.success('Ticket réouvert');
      if (res.ticket) replaceTicket(res.ticket);
      else await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de réouvrir le ticket'));
    } finally {
      setArchivingId(null);
    }
  };

  const deleteTarget = useMemo(
    () => (deleteTargetId ? items.find((ticket) => ticket.id === deleteTargetId) ?? null : null),
    [deleteTargetId, items],
  );

  const handleDeleteRequest = (ticketId: string) => {
    setDeleteTargetId(ticketId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    const ticketId = deleteTargetId;
    setDeletingId(ticketId);
    try {
      await supportTicketService.remove(ticketId);
      toast.success('Ticket supprimé');
      setDeleteTargetId(null);
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de supprimer le ticket'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleForceUnlock = async (ticketId: string) => {
    try {
      const res = await supportTicketService.releaseEditLock(ticketId);
      toast.success('Verrou libéré');
      if (res.ticket) replaceTicket(res.ticket);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de libérer le verrou'));
    }
  };

  const handleToggleCollaborator = async (
    ticket: SupportTicketRow,
    memberId: string,
    access: 'read' | 'write' | null,
  ) => {
    const current = ticket.collaborators ?? [];
    let next = current
      .filter((c) => c.userId !== memberId)
      .map((c) => ({ userId: c.userId, access: c.access }));
    if (access) {
      next = [...next, { userId: memberId, access }];
    }
    setUpdatingId(ticket.id);
    try {
      const res = await supportTicketService.setCollaborators(ticket.id, next);
      toast.success('Collaboration mise à jour');
      if (res.ticket) replaceTicket(res.ticket);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Impossible de mettre à jour les collaborateurs'));
    } finally {
      setUpdatingId(null);
    }
  };

  // Renew edit lock while a reply panel is open (skip informational tickets)
  useEffect(() => {
    if (!replyOpenId) return;
    const openTicket = items.find((t) => t.id === replyOpenId);
    const informational =
      Boolean(openTicket?.capabilities?.isInformational) ||
      openTicket?.status === 'RESOLVED' ||
      openTicket?.status === 'CLOSED';
    if (informational) {
      setReplyOpenId(null);
      void supportTicketService.releaseEditLock(replyOpenId).catch(() => {
        // non-blocking
      });
      return;
    }
    const timer = window.setInterval(() => {
      void supportTicketService
        .renewEditLock(replyOpenId)
        .then((res) => {
          if (res.ticket) replaceTicket(res.ticket);
        })
        .catch(() => {
          // expired / stolen / informational — close panel on next action
        });
    }, 90_000);
    return () => window.clearInterval(timer);
  }, [replyOpenId, replaceTicket, items]);

  return (
    <RoleRouteGuard access="support">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Tickets support
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Gérez les demandes d’aide des utilisateurs de votre organisation
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className={cn(PHOENIX_MODAL_CANCEL_BUTTON_CLASS, 'h-10 px-4')}
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.refresh className="mr-2 h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">File d’attente</h2>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {queueSummary}
            </p>
          </div>

          <div className={cn(PHOENIX_INSET_PANEL_CLASS, 'overflow-visible p-4')}>
            <div className="flex flex-col gap-3 overflow-visible lg:flex-row lg:items-end lg:justify-between">
              <div className="relative z-20 min-w-[240px] max-w-md flex-1">
                <SearchableProjectKeyFilter
                  projectKeys={projectKeys}
                  value={projectFilter}
                  onValueChange={setProjectInUrl}
                  disabled={loading}
                />
              </div>

              <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white/60 p-1 dark:border-white/10 dark:bg-slate-900/50">
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                      statusFilter === option.value
                        ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/40 py-16 backdrop-blur-xl">
              <Icons.spinner className="h-6 w-6 animate-spin text-orange-400" />
              <span className="ml-3 text-sm text-slate-400">Chargement des tickets…</span>
            </div>
          ) : null}

          {!loading && items.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl border border-dashed border-orange-400/25 bg-gradient-to-br from-orange-500/[0.06] via-slate-900/50 to-pink-500/[0.05] px-6 py-14 text-center backdrop-blur-xl">
              <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-orange-500/15 blur-3xl" />
              <div className="relative">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10 shadow-[0_0_30px_rgba(249,115,22,0.2)]">
                  <Icons.support className="h-7 w-7 text-orange-300" />
                </div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  Aucun ticket pour ce filtre
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
                  Changez de projet ou de statut, ou attendez qu’un administrateur vous assigne une demande.
                </p>
              </div>
            </div>
          ) : null}

          {!loading && items.length > 0 ? (
            <>
            <div
              className="space-y-3 rounded-2xl border-2 border-dashed border-slate-300/70 bg-slate-50/40 p-4 sm:p-5 dark:border-white/20 dark:bg-slate-900/25"
              aria-label="Liste des tickets support"
            >
              {items.map((ticket) => {
                const expanded = expandedId === ticket.id;
                const replyOpen = replyOpenId === ticket.id;
                const caps = ticket.capabilities;
                const projectKey = ticket.projectKey || DEFAULT_FAQ_PROJECT_KEY;
                const episodeChips = buildEpisodeChips(
                  ticket.sessionData as Record<string, unknown> | undefined,
                );
                const submitChips = buildSubmitChips(ticket);
                const contactEmail = ticketContactEmail(ticket);
                const adminReplies = ticket.adminReplies ?? [];
                const hasDetails =
                  episodeChips.length > 0 ||
                  submitChips.length > 0 ||
                  Boolean(ticket.sessionData) ||
                  (Array.isArray(ticket.sessionData?.navigationHistory) &&
                    (ticket.sessionData.navigationHistory as unknown[]).length > 0);
                const canResolve =
                  Boolean(caps?.canResolve) &&
                  (ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS');
                const canArchive = Boolean(caps?.canArchive);
                const canUnarchive = Boolean(caps?.canUnarchive);
                const canReopen = Boolean(caps?.canReopen);
                const canReply = Boolean(caps?.canReply) && Boolean(contactEmail);
                const canDelete = Boolean(caps?.canDelete) && canDeleteTickets;
                const isInformational =
                  Boolean(caps?.isInformational) ||
                  ticket.status === 'RESOLVED' ||
                  ticket.status === 'CLOSED';
                const canAssignToAnyone = Boolean(caps?.canAssignToAnyone) && !isInformational;
                const canUnassign = Boolean(caps?.canUnassign) && !isInformational;
                const lockHeldByOther =
                  Boolean(ticket.editLock) && !ticket.editLock?.heldByMe;
                const takeOverAvailableAt = caps?.takeOverAvailableAt
                  ? Date.parse(caps.takeOverAvailableAt)
                  : null;
                const assigneeInactive = Boolean(caps?.assigneeInactive);
                const takeOverCooling =
                  !assigneeInactive &&
                  takeOverAvailableAt != null &&
                  takeOverAvailableAt > nowMs;
                const showTakeOver =
                  Boolean(caps?.canTakeOver) ||
                  Boolean(caps?.canForceTakeOver) ||
                  takeOverAvailableAt != null;
                const canClickTakeOver =
                  Boolean(caps?.canTakeOver) ||
                  Boolean(caps?.canForceTakeOver) ||
                  (takeOverAvailableAt != null && !takeOverCooling);
                const takeOverWaitSec = takeOverCooling
                  ? Math.max(1, Math.ceil((takeOverAvailableAt! - nowMs) / 1000))
                  : 0;
                const canForceTakeOver =
                  Boolean(caps?.canForceTakeOver) ||
                  (lockHeldByOther && canClickTakeOver && !takeOverCooling);
                const canEditFields = Boolean(caps?.canEditFields) && !isInformational;
                const canEditStatus =
                  Boolean(caps?.canEditStatus ?? caps?.canResolve) && !isInformational;
                const canManageCollab =
                  Boolean(caps?.canManageCollaborators) && !isInformational;
                const developerMembers = members.filter((m) => m.role === 'DEVELOPER');
                const busy =
                  updatingId === ticket.id ||
                  resolvingId === ticket.id ||
                  replyingId === ticket.id ||
                  archivingId === ticket.id ||
                  deletingId === ticket.id;

                return (
                  <article
                    key={ticket.id}
                    className={cn(
                      PHOENIX_INSET_PANEL_CLASS,
                      'overflow-hidden p-0 transition-colors hover:border-orange-300/35 dark:hover:border-orange-400/20',
                    )}
                  >
                    {/* Top strip: status + project */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/70 bg-slate-50/80 px-4 py-2.5 sm:px-5 dark:border-white/10 dark:bg-slate-950/40">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          STATUS_BADGE_CLASS[ticket.status],
                        )}
                      >
                        {STATUS_LABELS[ticket.status]}
                      </span>
                      <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-900 dark:border-orange-400/25 dark:bg-orange-500/15 dark:text-orange-100">
                        {formatProjectTitle(projectKey)}
                      </span>
                      {adminReplies.length > 0 ? (
                        <span className="rounded-full border border-sky-400/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-900 dark:border-sky-400/30 dark:bg-sky-500/15 dark:text-sky-100">
                          {adminReplies.length} réponse{adminReplies.length > 1 ? 's' : ''}
                        </span>
                      ) : null}
                      <span className="ml-auto text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                        {formatDate(ticket.createdAt)}
                      </span>
                    </div>

                    <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
                      {/* Subject — clearly the ticket title */}
                      <header className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-600/90 dark:text-orange-400/90">
                          Sujet
                        </p>
                        <h3 className="mt-1 text-lg font-semibold leading-snug tracking-tight text-slate-900 break-words dark:text-white">
                          {ticket.subject}
                        </h3>
                      </header>

                      {/* Message in a modern framed panel */}
                      <section
                        aria-label="Message du demandeur"
                        className="rounded-xl border border-slate-200/90 bg-gradient-to-br from-white/90 to-slate-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:from-slate-900/80 dark:to-slate-950/70 dark:shadow-none"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-3.5 py-2 dark:border-white/10">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Message
                          </p>
                          {hasDetails ? (
                            <button
                              type="button"
                              onClick={() => setExpandedId(expanded ? null : ticket.id)}
                              className={cn(
                                'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors',
                                expanded
                                  ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300'
                                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-200',
                              )}
                            >
                              <Icons.eye className="h-3.5 w-3.5" />
                              {expanded ? 'Masquer le contexte' : 'Voir le contexte'}
                            </button>
                          ) : null}
                        </div>
                        <div className="relative px-3.5 py-3">
                          <div
                            className="pointer-events-none absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-orange-400/50 dark:bg-orange-400/40"
                            aria-hidden
                          />
                          <p className="pl-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap break-words dark:text-slate-200">
                            {ticket.description}
                          </p>
                        </div>
                      </section>

                      {/* Contact meta */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {contactEmail ? (
                          <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-1.5 text-slate-600 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-300">
                            <Icons.mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="min-w-0 truncate font-medium">{contactEmail}</span>
                          </span>
                        ) : (
                          <span className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-amber-800 dark:text-amber-200">
                            Pas d’e-mail — réponse impossible
                          </span>
                        )}
                      </div>

                      {/* Lock / assign hints — show even on informational if lock is stuck */}
                      {lockHeldByOther ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                          <span>
                            En cours de traitement par{' '}
                            <strong>
                              {ticket.editLock?.lockedByName ||
                                ticket.editLock?.lockedByEmail ||
                                'un autre membre'}
                            </strong>
                            {isInformational
                              ? ' — déverrouillez pour désarchiver / réouvrir si besoin.'
                              : null}
                          </span>
                          {caps?.canForceUnlock ? (
                            <button
                              type="button"
                              className="font-semibold underline-offset-2 hover:underline"
                              onClick={() => void handleForceUnlock(ticket.id)}
                            >
                              Forcer le déverrouillage
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                      {caps?.mustSelfAssignToAct && !isInformational ? (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-950 dark:text-orange-100">
                          <span>Assignez-vous ce ticket pour répondre ou le traiter.</span>
                          <Button
                            type="button"
                            size="sm"
                            className={cn(PHOENIX_PRIMARY_BUTTON_CLASS, 'h-8 px-3 text-xs')}
                            disabled={busy}
                            onClick={() => handleSelfAssign(ticket.id)}
                          >
                            M’assigner
                          </Button>
                        </div>
                      ) : null}
                      {assigneeInactive && showTakeOver ? (
                        <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
                          Assigné désactivé — prise en charge disponible immédiatement.
                        </div>
                      ) : null}

                      {isInformational ? (
                        <p className="rounded-lg border border-slate-200/70 bg-slate-50/80 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-300">
                          Vue documentation — répondez ou modifiez la gestion uniquement après{' '}
                          {ticket.status === 'CLOSED' ? 'désarchivage' : 'réouverture'}.
                        </p>
                      ) : null}

                      {/* Actions: reply / resolve | archive / unarchive / reopen / delete */}
                      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
                        <div className="flex flex-wrap items-center gap-2">
                          {!isInformational && (canReply || caps?.mustSelfAssignToAct) ? (
                            <Button
                              type="button"
                              size="sm"
                              className={cn(PHOENIX_PRIMARY_BUTTON_CLASS, 'h-9 px-3.5 text-xs')}
                              disabled={busy || lockHeldByOther || Boolean(caps?.mustSelfAssignToAct)}
                              onClick={() => void openReplyPanel(ticket)}
                            >
                              <Icons.mail className="mr-1.5 h-3.5 w-3.5" />
                              {replyOpen ? 'Annuler' : 'Répondre'}
                            </Button>
                          ) : null}
                          {!isInformational && canResolve ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className={cn(PHOENIX_MODAL_CANCEL_BUTTON_CLASS, 'h-9 px-3 text-xs')}
                              disabled={busy || lockHeldByOther}
                              onClick={() => void handleResolve(ticket.id)}
                            >
                              {resolvingId === ticket.id ? (
                                <Icons.spinner className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Icons.check className="mr-1.5 h-3.5 w-3.5" />
                                  Marquer résolu
                                </>
                              )}
                            </Button>
                          ) : null}
                        </div>

                        {(canArchive || canUnarchive || canReopen || canDelete) && (
                          <div className="ml-auto flex flex-wrap items-center gap-2">
                            {canArchive ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(PHOENIX_MODAL_CANCEL_BUTTON_CLASS, 'h-9 px-3 text-xs')}
                                disabled={busy || lockHeldByOther}
                                onClick={() => void handleArchive(ticket.id)}
                              >
                                {archivingId === ticket.id ? (
                                  <Icons.spinner className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Archiver'
                                )}
                              </Button>
                            ) : null}
                            {canUnarchive ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(PHOENIX_MODAL_CANCEL_BUTTON_CLASS, 'h-9 px-3 text-xs')}
                                disabled={busy || lockHeldByOther}
                                onClick={() => void handleUnarchive(ticket.id)}
                              >
                                {archivingId === ticket.id ? (
                                  <Icons.spinner className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Désarchiver'
                                )}
                              </Button>
                            ) : null}
                            {canReopen ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(PHOENIX_MODAL_CANCEL_BUTTON_CLASS, 'h-9 px-3 text-xs')}
                                disabled={busy || lockHeldByOther}
                                onClick={() => void handleReopen(ticket.id)}
                              >
                                {archivingId === ticket.id ? (
                                  <Icons.spinner className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Réouvrir'
                                )}
                              </Button>
                            ) : null}
                            {canDelete ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  PHOENIX_MODAL_CANCEL_BUTTON_CLASS,
                                  'h-9 px-3 text-xs text-red-600 hover:border-red-400/50 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
                                )}
                                disabled={busy || lockHeldByOther}
                                onClick={() => handleDeleteRequest(ticket.id)}
                              >
                                {deletingId === ticket.id ? (
                                  <Icons.spinner className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Icons.trash className="mr-1.5 h-3.5 w-3.5" />
                                    Supprimer
                                  </>
                                )}
                              </Button>
                            ) : null}
                          </div>
                        )}
                      </div>

                    {replyOpen && contactEmail ? (
                      <div className="space-y-3 rounded-xl border border-orange-400/25 bg-orange-500/[0.04] p-3.5 dark:bg-orange-500/[0.06]">
                        <div className="space-y-1.5">
                          <Label className={PHOENIX_LABEL_CLASS}>
                            Réponse e-mail · {contactEmail}
                          </Label>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Seul le corps est édité — en-tête et signature e-mail sont ajoutés
                            automatiquement.
                          </p>
                          <textarea
                            className={cn(
                              'min-h-[100px] w-full px-3 py-2 text-sm',
                              PHOENIX_FIELD_CLASS,
                            )}
                            placeholder="Écrivez votre réponse au client…"
                            value={replyDrafts[ticket.id] ?? ''}
                            disabled={busy}
                            onChange={(event) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [ticket.id]: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            className={cn(PHOENIX_PRIMARY_BUTTON_CLASS, 'h-9 px-4 text-xs')}
                            disabled={busy || (replyDrafts[ticket.id] ?? '').trim().length < 5}
                            onClick={() => void handleReply(ticket.id)}
                          >
                            {replyingId === ticket.id ? (
                              <Icons.spinner className="h-4 w-4 animate-spin" />
                            ) : (
                              'Envoyer la réponse'
                            )}
                          </Button>
                        </div>

                        {adminReplies.length > 0 ? (
                          <div className="border-t border-orange-400/20 pt-3 dark:border-orange-400/15">
                            {(() => {
                              const historyOpen =
                                replyHistoryOpen[ticket.id] ??
                                shouldOpenReplyHistoryByDefault(adminReplies);
                              const showAll = Boolean(replyHistoryShowAll[ticket.id]);
                              const visibleReplies = showAll
                                ? adminReplies
                                : adminReplies.slice(-REPLY_HISTORY_PREVIEW_COUNT);
                              const hiddenCount = Math.max(
                                0,
                                adminReplies.length - visibleReplies.length,
                              );
                              const last = adminReplies[adminReplies.length - 1];
                              return (
                                <div className="space-y-2">
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-orange-500/10"
                                    onClick={() =>
                                      setReplyHistoryOpen((prev) => ({
                                        ...prev,
                                        [ticket.id]: !historyOpen,
                                      }))
                                    }
                                  >
                                    <span className={PHOENIX_LABEL_CLASS}>
                                      Déjà envoyé ({adminReplies.length})
                                      {!historyOpen && last
                                        ? ` · dernière ${formatDate(last.sentAt)}`
                                        : ''}
                                    </span>
                                    <Icons.chevronDown
                                      className={cn(
                                        'h-4 w-4 shrink-0 text-slate-400 transition-transform',
                                        historyOpen && 'rotate-180',
                                      )}
                                    />
                                  </button>

                                  {historyOpen ? (
                                    <>
                                      <div className="max-h-40 space-y-2 overflow-y-auto pr-0.5">
                                        {visibleReplies.map((reply, index) => {
                                          const absoluteIndex =
                                            showAll
                                              ? index
                                              : adminReplies.length - visibleReplies.length + index;
                                          const bodyKey = `${ticket.id}:${absoluteIndex}:${reply.sentAt}`;
                                          const preview = truncateReplyBody(reply.body);
                                          const bodyOpen = Boolean(replyBodyExpanded[bodyKey]);
                                          const displayText =
                                            bodyOpen || !preview.truncated
                                              ? reply.body.trim()
                                              : preview.text;
                                          return (
                                            <div
                                              key={bodyKey}
                                              className="rounded-lg border border-slate-200/80 bg-white/80 px-3 py-2 dark:border-white/10 dark:bg-slate-950/50"
                                            >
                                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                {formatDate(reply.sentAt)}
                                                {replyAuthorLabel(reply)}
                                              </p>
                                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                                                {displayText}
                                              </p>
                                              {preview.truncated ? (
                                                <button
                                                  type="button"
                                                  className="mt-1 text-[11px] font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-300"
                                                  onClick={() =>
                                                    setReplyBodyExpanded((prev) => ({
                                                      ...prev,
                                                      [bodyKey]: !bodyOpen,
                                                    }))
                                                  }
                                                >
                                                  {bodyOpen ? 'Réduire' : 'Voir plus'}
                                                </button>
                                              ) : null}
                                            </div>
                                          );
                                        })}
                                      </div>
                                      {adminReplies.length > REPLY_HISTORY_PREVIEW_COUNT ? (
                                        <button
                                          type="button"
                                          className="text-[11px] font-medium text-orange-700 underline-offset-2 hover:underline dark:text-orange-300"
                                          onClick={() =>
                                            setReplyHistoryShowAll((prev) => ({
                                              ...prev,
                                              [ticket.id]: !showAll,
                                            }))
                                          }
                                        >
                                          {showAll
                                            ? 'Voir seulement les 2 dernières'
                                            : `Voir tout l’historique (${hiddenCount} de plus)`}
                                        </button>
                                      ) : null}
                                    </>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {expanded ? (
                      <div className="space-y-3 rounded-xl border border-dashed border-slate-300/80 bg-slate-50/60 p-3.5 dark:border-white/15 dark:bg-slate-950/35">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Contexte utilisateur
                        </p>
                        {episodeChips.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                              Quand l’aide s’est ouverte
                            </p>
                            {renderContextChips(ticket.id, episodeChips, 'episode')}
                          </div>
                        ) : null}
                        {submitChips.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                              Au moment du ticket
                            </p>
                            {renderContextChips(ticket.id, submitChips, 'submit')}
                          </div>
                        ) : null}
                        {Array.isArray(ticket.sessionData?.navigationHistory) &&
                        (ticket.sessionData.navigationHistory as unknown[]).length > 0 ? (
                          <div className="space-y-1.5">
                            <p className={PHOENIX_LABEL_CLASS}>Pages consultées récemment</p>
                            <ol className="list-decimal space-y-1 pl-4 text-xs text-slate-700 dark:text-slate-200">
                              {(ticket.sessionData.navigationHistory as string[])
                                .filter((u) => typeof u === 'string' && u.trim())
                                .slice(-5)
                                .map((url, index) => (
                                  <li key={`${ticket.id}-nav-${index}`} className="break-all">
                                    {url}
                                  </li>
                                ))}
                            </ol>
                          </div>
                        ) : null}
                        {(() => {
                          const split = splitSessionDataForDisplay(
                            ticket.sessionData as Record<string, unknown> | undefined,
                          );
                          if (!split.hasExtra) return null;
                          const advancedOpen = Boolean(contextAdvancedOpen[ticket.id]);
                          return (
                            <div className="space-y-2 border-t border-slate-200/70 pt-3 dark:border-white/10">
                              <button
                                type="button"
                                className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-medium text-slate-600 hover:text-orange-700 dark:text-slate-300 dark:hover:text-orange-300"
                                onClick={() =>
                                  setContextAdvancedOpen((prev) => ({
                                    ...prev,
                                    [ticket.id]: !advancedOpen,
                                  }))
                                }
                              >
                                <span>Détails techniques (avancé)</span>
                                <Icons.chevronDown
                                  className={cn(
                                    'h-4 w-4 shrink-0 transition-transform',
                                    advancedOpen && 'rotate-180',
                                  )}
                                />
                              </button>
                              {advancedOpen ? (
                                <div className="space-y-2">
                                  {typeof ticket.sessionData?.sessionId === 'string' ? (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                      Identifiant de session ·{' '}
                                      <span className="break-all font-mono text-slate-700 dark:text-slate-200">
                                        {ticket.sessionData.sessionId}
                                      </span>
                                    </p>
                                  ) : null}
                                  {split.sdkConfig ? (
                                    <div className="space-y-1">
                                      <p className={PHOENIX_LABEL_CLASS}>Personnalisation e-mails</p>
                                      <pre className={PHOENIX_SECRET_CODE_BLOCK_CLASS}>
                                        {JSON.stringify(split.sdkConfig, null, 2)}
                                      </pre>
                                    </div>
                                  ) : null}
                                  <div className="space-y-1">
                                    <p className={PHOENIX_LABEL_CLASS}>Données brutes</p>
                                    <pre className={PHOENIX_SECRET_CODE_BLOCK_CLASS}>
                                      {JSON.stringify(split.diagnostic, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}
                    </div>

                    <div className="border-t border-slate-200/70 bg-slate-50/70 px-4 py-3.5 sm:px-5 dark:border-white/10 dark:bg-slate-950/35">
                      <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                        Gestion{isInformational ? ' (lecture seule)' : ''}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className={PHOENIX_LABEL_CLASS}>Priorité</Label>
                        {canEditFields ? (
                          <Select
                          value={ticket.priority}
                          disabled={busy || lockHeldByOther}
                          onValueChange={(value) => {
                            if (!value) return;
                            void handleUpdate(ticket.id, {
                              priority: value as SupportTicketRow['priority'],
                            });
                          }}
                        >
                          <SelectTrigger className={PHOENIX_SELECT_TRIGGER}>
                            <SelectValue>{PRIORITY_LABELS[ticket.priority]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent
                            alignItemWithTrigger={false}
                            side="bottom"
                            sideOffset={4}
                            align="start"
                            className={BLUEPRINT_SELECT_CONTENT_CLASS}
                          >
                            {(Object.keys(PRIORITY_LABELS) as SupportTicketRow['priority'][]).map(
                              (priority) => (
                                <SelectItem
                                  key={priority}
                                  value={priority}
                                  className={PHOENIX_SELECT_ITEM}
                                >
                                  {PRIORITY_LABELS[priority]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        ) : (
                          <p className="rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
                            {PRIORITY_LABELS[ticket.priority]}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label className={PHOENIX_LABEL_CLASS}>Assigné</Label>
                          <button
                            type="button"
                            title="Historique d’ownership"
                            aria-label="Historique d’ownership"
                            className={cn(
                              'rounded p-0.5 text-slate-400 transition-colors hover:text-orange-500',
                              historyTicketId === ticket.id && historyScope === 'assignment'
                                ? 'text-orange-500'
                                : '',
                            )}
                            onClick={() => void openHistory(ticket.id, 'assignment')}
                          >
                            <Icons.history className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {canAssignToAnyone ? (
                          <Select
                            value={ticket.assignedTo ?? '__none__'}
                            disabled={busy || lockHeldByOther}
                            onValueChange={(value) => {
                              if (!value) return;
                              requestAssignmentChange(
                                ticket,
                                value === '__none__' ? null : value,
                              );
                            }}
                          >
                            <SelectTrigger className={cn(PHOENIX_SELECT_TRIGGER, 'w-full min-w-0')}>
                              <SelectValue>{assigneeLabel(ticket, members)}</SelectValue>
                            </SelectTrigger>
                            <SelectContent
                              alignItemWithTrigger={false}
                              side="bottom"
                              sideOffset={4}
                              align="start"
                              className={cn(BLUEPRINT_SELECT_CONTENT_CLASS, 'min-w-[min(100vw-2rem,22rem)]')}
                            >
                              {canUnassign ? (
                                <SelectItem value="__none__" className={PHOENIX_SELECT_ITEM}>
                                  Non assigné
                                </SelectItem>
                              ) : null}
                              {members
                                .filter((m) => m.role === 'ADMIN' || m.role === 'DEVELOPER')
                                .map((member) => (
                                  <SelectItem
                                    key={member.id}
                                    value={member.id}
                                    className={cn(PHOENIX_SELECT_ITEM, 'whitespace-normal')}
                                    title={member.email}
                                  >
                                    {memberOptionLabel(member)}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        ) : showTakeOver ? (
                          <div className="space-y-2">
                            <p className="rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
                              {assigneeLabel(ticket, members)}
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 w-full text-xs"
                              disabled={
                                busy ||
                                !currentUserId ||
                                !canClickTakeOver ||
                                takeOverCooling ||
                                (lockHeldByOther && !canForceTakeOver)
                              }
                              onClick={() => handleSelfAssign(ticket.id)}
                            >
                              {takeOverCooling
                                ? `Disponible dans ${takeOverWaitSec}s`
                                : canForceTakeOver && lockHeldByOther
                                  ? 'Forcer unlock + prendre en charge'
                                  : (ticket.collaborators?.length ?? 0) > 0
                                    ? `Prendre en charge (${ticket.collaborators!.length} collab.)`
                                    : 'Prendre en charge'}
                            </Button>
                          </div>
                        ) : (
                          <p className="rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
                            {assigneeLabel(ticket, members)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label className={PHOENIX_LABEL_CLASS}>Statut</Label>
                          <button
                            type="button"
                            title="Historique du cycle de vie"
                            aria-label="Historique du cycle de vie"
                            className={cn(
                              'rounded p-0.5 text-slate-400 transition-colors hover:text-orange-500',
                              historyTicketId === ticket.id && historyScope === 'status'
                                ? 'text-orange-500'
                                : '',
                            )}
                            onClick={() => void openHistory(ticket.id, 'status')}
                          >
                            <Icons.history className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {canEditStatus ? (
                          <Select
                          value={ticket.status}
                          disabled={busy || lockHeldByOther}
                          onValueChange={(value) => {
                            if (!value) return;
                            void handleUpdate(ticket.id, {
                              status: value as SupportTicketRow['status'],
                            });
                          }}
                        >
                          <SelectTrigger className={PHOENIX_SELECT_TRIGGER}>
                            <SelectValue>{STATUS_LABELS[ticket.status]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent
                            alignItemWithTrigger={false}
                            side="bottom"
                            sideOffset={4}
                            align="start"
                            className={BLUEPRINT_SELECT_CONTENT_CLASS}
                          >
                            {(Object.keys(STATUS_LABELS) as SupportTicketRow['status'][]).map(
                              (status) => (
                                <SelectItem key={status} value={status} className={PHOENIX_SELECT_ITEM}>
                                  {STATUS_LABELS[status]}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                        ) : (
                          <p className="rounded-lg border border-slate-200/80 bg-white/70 px-2.5 py-2 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-200">
                            {STATUS_LABELS[ticket.status]}
                          </p>
                        )}
                      </div>
                      </div>

                      {historyTicketId === ticket.id ? (
                        <div className="mt-3 rounded-xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-900/45">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                              Historique —{' '}
                              {historyScope === 'assignment' ? 'ownership' : 'cycle de vie'}
                            </p>
                            <button
                              type="button"
                              className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                              onClick={() => {
                                setHistoryTicketId(null);
                                setHistoryItems([]);
                              }}
                            >
                              Fermer
                            </button>
                          </div>
                          {historyLoading ? (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Icons.spinner className="h-3.5 w-3.5 animate-spin" />
                              Chargement…
                            </div>
                          ) : historyItems.length === 0 ? (
                            <p className="text-xs text-slate-500">Aucun événement enregistré.</p>
                          ) : (
                            <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                              {historyItems.map((entry) => (
                                <li
                                  key={entry.id}
                                  className="rounded-lg border border-slate-200/70 px-2.5 py-1.5 text-xs dark:border-white/10"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-medium text-slate-800 dark:text-slate-100">
                                      {historyEntryTitle(entry)}
                                    </p>
                                    <span className="shrink-0 tabular-nums text-[10px] text-slate-500">
                                      {formatDate(entry.at)}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-slate-600 dark:text-slate-300">
                                    {historyEntryDetail(entry)}
                                  </p>
                                  <p className="mt-0.5 text-[10px] text-slate-500">
                                    par {historyActorLabel(entry)}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}

                      {canManageCollab && ticket.assignedTo ? (
                        <div className="mt-3 space-y-2 border-t border-slate-200/60 pt-3 dark:border-white/10">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Collaboration (développeurs)
                          </p>
                          {(() => {
                            const activeCollabs = ticket.collaborators ?? [];
                            const activeIds = new Set(activeCollabs.map((c) => c.userId));
                            const addableDevelopers = developerMembers.filter(
                              (m) => m.id !== ticket.assignedTo && !activeIds.has(m.id),
                            );
                            return (
                              <div className="space-y-2">
                                {activeCollabs.length === 0 ? (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Aucun collaborateur pour l’instant.
                                  </p>
                                ) : (
                                  <ul className="flex flex-col gap-1">
                                    {activeCollabs.map((collab) => {
                                      const member = members.find((m) => m.id === collab.userId);
                                      const label = member
                                        ? memberOptionLabel(member)
                                        : collab.userId;
                                      return (
                                        <li
                                          key={collab.userId}
                                          className="flex items-center gap-2 rounded-md border border-slate-200/70 bg-white/50 px-2 py-1 text-xs dark:border-white/10 dark:bg-slate-900/40"
                                        >
                                          <span
                                            className="min-w-0 flex-1 truncate font-medium text-slate-800 dark:text-slate-100"
                                            title={label}
                                          >
                                            {label}
                                          </span>
                                          <div className="flex shrink-0 items-center gap-0.5">
                                            {(['read', 'write'] as const).map((mode) => (
                                              <button
                                                key={mode}
                                                type="button"
                                                disabled={busy}
                                                onClick={() =>
                                                  void handleToggleCollaborator(
                                                    ticket,
                                                    collab.userId,
                                                    mode,
                                                  )
                                                }
                                                className={cn(
                                                  'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                                                  collab.access === mode
                                                    ? 'bg-orange-500/20 text-orange-900 dark:text-orange-100'
                                                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
                                                )}
                                              >
                                                {mode === 'read' ? 'Lecture' : 'Écriture'}
                                              </button>
                                            ))}
                                            <button
                                              type="button"
                                              disabled={busy}
                                              aria-label="Retirer le collaborateur"
                                              title="Retirer"
                                              onClick={() =>
                                                void handleToggleCollaborator(
                                                  ticket,
                                                  collab.userId,
                                                  null,
                                                )
                                              }
                                              className="ml-0.5 rounded p-0.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                                            >
                                              <Icons.close className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}

                                {developerMembers.length === 0 ? (
                                  <p className="text-xs text-slate-500">
                                    Aucun développeur dans l’organisation.
                                  </p>
                                ) : addableDevelopers.length === 0 ? (
                                  activeCollabs.length > 0 ? (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                      Tous les développeurs sont déjà collaborateurs.
                                    </p>
                                  ) : null
                                ) : (
                                  <Select
                                    key={`add-collab-${ticket.id}-${activeCollabs.length}`}
                                    disabled={busy || lockHeldByOther}
                                    onValueChange={(value) => {
                                      if (!value) return;
                                      void handleToggleCollaborator(ticket, value, 'read');
                                    }}
                                  >
                                    <SelectTrigger
                                      className={cn(PHOENIX_SELECT_TRIGGER, 'h-8 w-full text-xs')}
                                    >
                                      <SelectValue placeholder="Ajouter un développeur…" />
                                    </SelectTrigger>
                                    <SelectContent
                                      alignItemWithTrigger={false}
                                      side="bottom"
                                      sideOffset={4}
                                      align="start"
                                      className={cn(
                                        BLUEPRINT_SELECT_CONTENT_CLASS,
                                        'max-h-56 min-w-[min(100vw-2rem,22rem)]',
                                      )}
                                    >
                                      {addableDevelopers.map((member) => (
                                        <SelectItem
                                          key={member.id}
                                          value={member.id}
                                          className={cn(PHOENIX_SELECT_ITEM, 'whitespace-normal text-xs')}
                                          title={member.email}
                                        >
                                          {memberOptionLabel(member)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      ) : showTakeOver && (ticket.collaborators?.length ?? 0) > 0 ? (
                        <div className="mt-3 space-y-2 border-t border-slate-200/60 pt-3 dark:border-white/10">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Collaboration (lecture seule)
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {(ticket.collaborators ?? []).length} collaborateur
                            {(ticket.collaborators ?? []).length > 1 ? 's' : ''} — un choix
                            vider / conserver sera proposé à la prise en charge ou
                            réaffectation.
                          </p>
                          <ul className="flex flex-col gap-1">
                            {(ticket.collaborators ?? []).map((collab) => {
                              const member = members.find((m) => m.id === collab.userId);
                              const label = member
                                ? memberOptionLabel(member)
                                : collab.userId;
                              return (
                                <li
                                  key={collab.userId}
                                  className="rounded-md border border-slate-200/70 bg-white/50 px-2 py-1 text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-100"
                                >
                                  {label}{' '}
                                  <span className="text-slate-400">
                                    ({collab.access === 'write' ? 'écriture' : 'lecture'})
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
              <CatalogListPagination
                totalItems={count}
                pageSize={SUPPORT_TICKETS_PAGE_SIZE}
                currentPage={safePage}
                totalPages={totalPages}
                onPrevious={() => setPage((prev) => Math.max(1, prev - 1))}
                onNext={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                itemLabel="ticket"
              />
            </>
          ) : null}
        </section>
      </div>

      <PhoenixConfirmModal
        open={deleteTargetId != null}
        variant="danger"
        title="Supprimer ce ticket"
        description={
          <>
            {deleteTarget ? (
              <p>
                Supprimer{' '}
                <strong className="font-semibold text-slate-900 dark:text-white">
                  {deleteTarget.subject}
                </strong>{' '}
                ? Il disparaîtra de la file d’attente.
              </p>
            ) : (
              <p>Ce ticket disparaîtra de la file d’attente.</p>
            )}
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Action réservée à l’administrateur de l’organisation. Cette action est irréversible.
            </p>
          </>
        }
        confirmLabel="Supprimer"
        loading={deletingId === deleteTargetId}
        loadingLabel="Suppression…"
        onClose={() => {
          if (deletingId == null) setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      <PhoenixConfirmModal
        open={takeOverModal?.step === 'forceUnlock'}
        title="Forcer le déverrouillage"
        description={
          <>
            <p>
              Ce ticket est verrouillé par{' '}
              <strong className="font-semibold text-slate-900 dark:text-white">
                {takeOverTarget?.editLock?.lockedByName ||
                  takeOverTarget?.editLock?.lockedByEmail ||
                  'un autre membre'}
              </strong>
              .
            </p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Continuer libère le verrou et lance le changement d’assigné.
            </p>
          </>
        }
        confirmLabel="Continuer"
        loading={updatingId === takeOverModal?.ticketId}
        loadingLabel="Mise à jour…"
        maxWidthClassName="max-w-md"
        onClose={() => {
          if (updatingId == null) setTakeOverModal(null);
        }}
        onConfirm={() => {
          if (!takeOverModal) return;
          const ticket = items.find((t) => t.id === takeOverModal.ticketId);
          const collabCount = (ticket?.collaborators ?? []).length;
          if (collabCount > 0) {
            setTakeOverModal({
              ...takeOverModal,
              step: 'collabs',
              forceUnlock: true,
            });
            return;
          }
          void handleUpdate(takeOverModal.ticketId, {
            assignedTo: takeOverModal.nextAssignedTo,
            forceUnlock: true,
          });
        }}
      />

      <PhoenixConfirmModal
        open={takeOverModal?.step === 'collabs'}
        title="Collaborateurs sur ce ticket"
        icon="users"
        description={
          <>
            <p>
              Ce ticket a {(takeOverTarget?.collaborators ?? []).length} collaborateur
              {(takeOverTarget?.collaborators ?? []).length > 1 ? 's' : ''}. Par défaut,
              le changement d’assigné vide la liste.
            </p>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Vous pouvez aussi conserver les collaborateurs existants.
            </p>
          </>
        }
        confirmLabel={
          takeOverModal?.nextAssignedTo === currentUserId
            ? 'Vider et prendre en charge'
            : takeOverModal?.nextAssignedTo == null
              ? 'Vider et désassigner'
              : 'Vider et réassigner'
        }
        secondaryLabel="Conserver les collaborateurs"
        loading={updatingId === takeOverModal?.ticketId}
        loadingLabel="Mise à jour…"
        maxWidthClassName="max-w-md"
        onClose={() => {
          if (updatingId == null) setTakeOverModal(null);
        }}
        onConfirm={() => {
          void executeAssignmentFromModal(false);
        }}
        onSecondary={() => {
          void executeAssignmentFromModal(true);
        }}
      />
    </RoleRouteGuard>
  );
}
