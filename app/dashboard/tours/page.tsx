'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DndContext, DragEndEvent, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TourPreviewSimulator from '@/components/tours/TourPreviewSimulator';
import { ToursListEmptyState } from '@/components/tours/ToursListEmptyState';
import { authService, getErrorMessage, tourService, userService } from '@/lib/api';
import { GuidedTour, User } from '@/lib/types';
import {
	buildConcatDraftDescription,
	buildUniqueConcatName,
	clearConcatWorkspaceSession,
	concatenateToursFifo,
	CONCAT_DRAFT_STORAGE_KEY,
	CONCAT_PREFILL_STORAGE_KEY,
	createDefaultConcatDraft,
	type ConcatDraftFields,
} from '@/lib/tour-concat';
import { getDashboardRole, canCreateTours, canManageTours } from '@/lib/dashboard-roles';
import { canManageTour, isSdkLabTemplateTour } from '@/lib/tour-lab';
import {
	buildTourListIndex,
	filterTourListEntries,
	resolveTourCardDisplayName,
} from '@/lib/tour-list-index';
import { TourLogoActionsMenu } from '@/components/tours/TourLogoActionsMenu';
import { TourApprovedModerationControl } from '@/components/tours/TourApprovedModerationControl';
import { TourProductionManagementControl } from '@/components/tours/TourProductionManagementControl';
import { TourEnvironmentSwitcher, type TourDeploymentTarget } from '@/components/tours/TourEnvironmentSwitcher';
import { ensureTourWithSteps, getTourStepCount, prepareTourCloneFromSource } from '@/lib/tour-details';
import {
	buildTourExportFilename,
	canExportTour,
	downloadTourExportJson,
} from '@/lib/tour-export';
import {
	canAdminTransferProductionToSandbox,
	canAdminTransferSandboxToProduction,
	canForkTour,
	getOwnershipTransferMessage,
	hasDeveloperSubmissionMessage,
	hasDeveloperViewShareMessage,
	hasDeveloperCollaborateShareMessage,
	getDeveloperShareMessage,
	getDeveloperShareMessageAt,
	isOwnershipTransferReturn,
	type TourShareMessageMode,
	formatProductionManagerShortLabel,
	resolveTourActorLabel,
	isTourCardViewOnly,
	isTourCollaborationPeerCard,
	getTourListFilterLabel,
	type TourListEnvironmentFilter,
} from '@/lib/tour-sandbox';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { reconcileAllSdkLabRunSnapshots } from '@/app/dashboard/sdk-tests/lab-run-persist';
import { readSessionUser } from '@/lib/session-user';
import {
	reconcileAutoPublishedSessionWithTours,
	removeAutoPublishedSignaturesForTour,
} from '@/lib/auto-publish-session-dedupe';
import { SandboxHintCollapsible } from '@/components/editor/SandboxHintCollapsible';

const PREVIEW_STORAGE_KEY = 'tours.previewTour.v1';
const PREVIEW_STORAGE_TTL_MS = 2 * 60 * 1000;
const CONCAT_DROP_ZONE_ID = 'concat-drop-zone';

/** Nombre de cartes parcours affichées par page dans la grille. */
const TOURS_PAGE_SIZE = 6;

const PHOENIX_CARD_BTN_BASE =
	'h-9 flex-1 gap-1.5 rounded-lg border text-sm font-medium shadow-sm backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-orange-400/25 dark:bg-slate-900/45';

/** Selects filtres — même style orange que « Politique replay » (éditeur). */
const PHOENIX_SELECT_TRIGGER_ORANGE =
	'h-10 w-full rounded-lg border border-slate-300 bg-white/90 pl-3 pr-3 text-sm font-medium text-slate-800 transition-colors hover:border-orange-400/40 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 focus-visible:ring-orange-400/20 data-[popup-open]:border-orange-400/60 lg:w-[180px] dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 [&_svg]:text-orange-600/80 dark:[&_svg]:text-orange-300/90';
const PHOENIX_SELECT_CONTENT_ORANGE =
	'rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]';
const PHOENIX_SELECT_ITEM_ORANGE =
	'text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:bg-orange-500/25 dark:focus:text-white';

function SandboxModerationButtons({
	showApprove,
	showReject,
	onApprove,
	onReject,
	disabled,
}: {
	showApprove: boolean;
	showReject: boolean;
	onApprove: () => void;
	onReject: () => void;
	disabled: boolean;
}) {
	if (!showApprove && !showReject) {
		return null;
	}

	return (
		<div className="flex items-center gap-2">
			{showApprove ? (
				<Button
					type="button"
					variant="outline"
					disabled={disabled}
					onClick={onApprove}
					className={cn(
						PHOENIX_CARD_BTN_BASE,
						'border-emerald-300/55 bg-white/90 text-emerald-800 hover:border-emerald-400/65 hover:bg-emerald-50/95 hover:text-emerald-900 hover:shadow-[0_0_20px_rgba(16,185,129,0.14)] dark:border-emerald-400/35 dark:text-emerald-200 dark:hover:bg-emerald-500/12 dark:hover:text-emerald-100',
					)}
				>
					<Icons.check className="h-3.5 w-3.5 shrink-0" />
					Approuver
				</Button>
			) : null}
			{showReject ? (
				<Button
					type="button"
					variant="outline"
					disabled={disabled}
					onClick={onReject}
					className={cn(
						PHOENIX_CARD_BTN_BASE,
						'border-rose-300/55 bg-white/90 text-rose-800 hover:border-rose-400/65 hover:bg-rose-50/95 hover:text-rose-900 hover:shadow-[0_0_20px_rgba(244,63,94,0.12)] dark:border-rose-400/35 dark:text-rose-200 dark:hover:bg-rose-500/12 dark:hover:text-rose-100',
					)}
				>
					<Icons.close className="h-3.5 w-3.5 shrink-0" />
					Rejeter
				</Button>
			) : null}
		</div>
	);
}

function parseCreatedAtMs(createdAt?: string): number | null {
	if (!createdAt) return null;
	const t = new Date(createdAt).getTime();
	return Number.isNaN(t) ? null : t;
}

/** Même granularité que l’affichage « Créé le » (jour + heure + minute). */
function createdAtMinuteKey(ms: number): string {
	const d = new Date(ms);
	return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
}

/** Tous les parcours dont la date d’affichage correspond à celle de l’ancre (ex. publication groupée). */
function getTourIdsInSameCreatedMinute(tours: GuidedTour[], anchorMs: number): Set<string> {
	const key = createdAtMinuteKey(anchorMs);
	const ids = new Set<string>();
	for (const tour of tours) {
		const id = tour.id;
		const t = parseCreatedAtMs(tour.createdAt);
		if (!id || t === null) continue;
		if (createdAtMinuteKey(t) === key) {
			ids.add(id);
		}
	}
	return ids;
}

/** Parcours les plus récents : tous ceux partageant la même minute « Créé le » que le max. */
function getNewestTourIdsForGlow(tours: GuidedTour[]): Set<string> {
	let bestTime = -Infinity;
	for (const tour of tours) {
		const t = parseCreatedAtMs(tour.createdAt);
		if (t !== null && t > bestTime) {
			bestTime = t;
		}
	}
	if (bestTime === -Infinity) {
		return new Set();
	}
	return getTourIdsInSameCreatedMinute(tours, bestTime);
}

function tourEligibleForNewGlow(tour: GuidedTour, newGlowTourIds: Set<string>): boolean {
	const id = tour.id;
	if (!id) return false;
	return newGlowTourIds.has(id);
}

function DraggableTourCard({
	tourId,
	disabled = false,
	children,
}: {
	tourId: string;
	disabled?: boolean;
	children: React.ReactNode;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: `tour-card-${tourId}`,
		data: { tourId },
		disabled,
	});

	if (disabled) {
		return <>{children}</>;
	}

	const transformStyle = transform
		? {
				transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
				zIndex: isDragging ? 50 : undefined,
			}
		: undefined;

	return (
		<div
			ref={setNodeRef}
			style={transformStyle}
			{...listeners}
			{...attributes}
			className={cn(
				'select-none',
				isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab',
			)}
			title="Glisser vers la zone concaténation"
		>
			{/*
			 * Les clics atteignent le conteneur draggable ; les boutons/liens restent interactifs.
			 */}
			<div className="pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_select]:pointer-events-auto [&_textarea]:pointer-events-auto">
				{children}
			</div>
		</div>
	);
}

function ConcatDropContainer({
	onOverChange,
	children,
}: {
	onOverChange: (isOver: boolean) => void;
	children: React.ReactNode;
}) {
	const { setNodeRef, isOver } = useDroppable({
		id: CONCAT_DROP_ZONE_ID,
	});

	useEffect(() => {
		onOverChange(isOver);
	}, [isOver, onOverChange]);

	return (
		<div ref={setNodeRef} className={`transition-colors ${isOver ? 'ring-2 ring-orange-400/50 rounded-2xl' : ''}`}>
			{children}
		</div>
	);
}

export default function ToursPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [sessionUser, setSessionUser] = useState<User | null>(null);
	const [creatorRoleByUserId, setCreatorRoleByUserId] = useState<
		Map<string, 'ADMIN' | 'DEVELOPER' | 'USER'>
	>(() => new Map());
	const [tours, setTours] = useState<GuidedTour[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [deletingIds, setDeletingIds] = useState<string[]>([]);
	const [previewTour, setPreviewTour] = useState<GuidedTour | null>(null);
	const [previewShouldAutoPlay, setPreviewShouldAutoPlay] = useState(false);
	const [stepsTour, setStepsTour] = useState<GuidedTour | null>(null);
	const [audienceTour, setAudienceTour] = useState<GuidedTour | null>(null);
	const [audienceMode, setAudienceMode] = useState<'all' | 'user' | 'segment'>('all');
	const [audienceUsers, setAudienceUsers] = useState<User[]>([]);
	const [audienceUserQuery, setAudienceUserQuery] = useState('');
	const [selectedAudienceUserId, setSelectedAudienceUserId] = useState('');
	const [isAudienceUsersLoading, setIsAudienceUsersLoading] = useState(false);
	const [segmentType, setSegmentType] = useState<'all' | 'new_users' | 'inactive_users' | 'custom_user_ids'>('inactive_users');
	const [segmentCreatedWithinDays, setSegmentCreatedWithinDays] = useState(14);
	const [segmentInactiveDays, setSegmentInactiveDays] = useState(60);
	const [segmentUserIdsRaw, setSegmentUserIdsRaw] = useState('');
	const [isApplyingAudienceAction, setIsApplyingAudienceAction] = useState(false);
	const [filterQuery, setFilterQuery] = useState('');
	const [filterInput, setFilterInput] = useState('');
	const [environmentFilter, setEnvironmentFilter] = useState<TourListEnvironmentFilter>('all');
	const [developerFilterInitialized, setDeveloperFilterInitialized] = useState(false);
	const [approvingIds, setApprovingIds] = useState<string[]>([]);
	const [rejectingIds, setRejectingIds] = useState<string[]>([]);
	const [transferringEnvIds, setTransferringEnvIds] = useState<string[]>([]);
	const [tourPendingEnvTransfer, setTourPendingEnvTransfer] = useState<{
		tour: GuidedTour;
		target: TourDeploymentTarget;
	} | null>(null);
	const [toursListPage, setToursListPage] = useState(1);
	const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
	const [concatQueue, setConcatQueue] = useState<string[]>([]);
	const [concatDraft, setConcatDraft] = useState<ConcatDraftFields>(createDefaultConcatDraft);
	const hiddenTourIdsRef = useRef<Set<string>>(new Set());
	const loadSeqRef = useRef(0);
	const actionsMenuRef = useRef<HTMLDivElement | null>(null);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);
	const [isConcatDropOver, setIsConcatDropOver] = useState(false);
	const [tourPendingDelete, setTourPendingDelete] = useState<GuidedTour | null>(null);
	const [tourPendingReject, setTourPendingReject] = useState<GuidedTour | null>(null);
	const [rejectReasonInput, setRejectReasonInput] = useState('');
	const [tourRejectionDetails, setTourRejectionDetails] = useState<GuidedTour | null>(null);
	const [tourSubmissionDetails, setTourSubmissionDetails] = useState<GuidedTour | null>(null);
	const [tourShareMessageDetails, setTourShareMessageDetails] = useState<{
		tour: GuidedTour;
		mode: TourShareMessageMode;
	} | null>(null);
	const [orgActorLabelByUserId, setOrgActorLabelByUserId] = useState<
		Map<string, Pick<User, 'firstName' | 'lastName' | 'email'>>
	>(() => new Map());
	const [highlightNewTourId, setHighlightNewTourId] = useState<string | null>(null);
	const [isPreviewLoading, setIsPreviewLoading] = useState(false);
	const [isStepsLoading, setIsStepsLoading] = useState(false);
	const [, startTourListTransition] = useTransition();

	useEffect(() => {
		setSessionUser(readSessionUser());
	}, []);

	useEffect(() => {
		if (!sessionUser?.id) {
			setOrgActorLabelByUserId(new Map());
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const response = await tourService.getOrganizationMembers();
				if (cancelled) {
					return;
				}
				const map = new Map<string, Pick<User, 'firstName' | 'lastName' | 'email'>>();
				for (const member of response.users ?? []) {
					if (member.id) {
						map.set(member.id, member);
					}
				}
				map.set(sessionUser.id, sessionUser);
				setOrgActorLabelByUserId(map);
			} catch {
				if (!cancelled) {
					const fallback = new Map<string, Pick<User, 'firstName' | 'lastName' | 'email'>>();
					fallback.set(sessionUser.id, sessionUser);
					setOrgActorLabelByUserId(fallback);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [sessionUser]);

	const dashboardRole = useMemo(() => getDashboardRole(sessionUser), [sessionUser]);
	const currentUserId = sessionUser?.id;
	const isAdmin = dashboardRole === 'ADMIN';
	const isDeveloper = dashboardRole === 'DEVELOPER';

	useEffect(() => {
		if (!sessionUser?.id) {
			setCreatorRoleByUserId(new Map());
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const map = new Map<string, 'ADMIN' | 'DEVELOPER' | 'USER'>();
				if (sessionUser.role) {
					map.set(sessionUser.id, sessionUser.role);
				}
				if (isAdmin) {
					const response = await userService.getAll(1, 500);
					for (const user of response.users || []) {
						if (user?.id && user.role) {
							map.set(user.id, user.role);
						}
					}
				} else if (isDeveloper) {
					const response = await tourService.getOrganizationMembers();
					for (const user of response.users ?? []) {
						if (user.id && user.role) {
							map.set(user.id, user.role);
						}
					}
				}
				if (cancelled) {
					return;
				}
				setCreatorRoleByUserId(map);
			} catch {
				if (!cancelled) {
					const fallback = new Map<string, 'ADMIN' | 'DEVELOPER' | 'USER'>();
					if (sessionUser.role) {
						fallback.set(sessionUser.id, sessionUser.role);
					}
					setCreatorRoleByUserId(fallback);
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [sessionUser, isAdmin, isDeveloper]);
	const canCreateNewTour = canCreateTours(dashboardRole);
	const canUseAdvancedTourTools = canManageTours(dashboardRole) || isDeveloper;

	useEffect(() => {
		if (isDeveloper && !developerFilterInitialized) {
			setEnvironmentFilter('sandbox');
			setDeveloperFilterInitialized(true);
		}
	}, [isDeveloper, developerFilterInitialized]);

	useEffect(() => {
		const fromQuery = searchParams.get('new');
		if (!fromQuery) return;
		setHighlightNewTourId((prev) => prev ?? fromQuery);
		clearConcatWorkspaceSession();
		setConcatQueue([]);
		setConcatDraft(createDefaultConcatDraft());
		router.replace('/dashboard/tours', { scroll: false });
	}, [searchParams, router]);

	const newGlowTourIds = useMemo(() => {
		if (highlightNewTourId) {
			const anchor = tours.find((t) => t.id === highlightNewTourId);
			const anchorMs = parseCreatedAtMs(anchor?.createdAt);
			if (anchorMs !== null) {
				return getTourIdsInSameCreatedMinute(tours, anchorMs);
			}
			return new Set([highlightNewTourId]);
		}
		return getNewestTourIdsForGlow(tours);
	}, [tours, highlightNewTourId]);

	const tourListIndex = useMemo(
		() => buildTourListIndex(tours, dashboardRole, currentUserId, isAdmin, creatorRoleByUserId),
		[tours, dashboardRole, currentUserId, isAdmin, creatorRoleByUserId],
	);
	const viewOnlyTourIds = useMemo(() => {
		const ids = new Set<string>();
		for (const { tour, meta } of tourListIndex.entries) {
			if (meta.isViewOnlyCard && tour.id) {
				ids.add(tour.id);
			}
		}
		return ids;
	}, [tourListIndex.entries]);
	const toursStats = tourListIndex.stats;

	const filteredTourEntries = useMemo(
		() => filterTourListEntries(tourListIndex.entries, filterQuery, environmentFilter),
		[tourListIndex.entries, filterQuery, environmentFilter],
	);

	const hasActiveTextFilter = Boolean(filterQuery.trim());
	const hasActiveEnvironmentFilter = environmentFilter !== 'all';

	const tourListFilterEmptyState = useMemo(() => {
		if (hasActiveEnvironmentFilter && !hasActiveTextFilter) {
			const envLabel = getTourListFilterLabel(environmentFilter).toLowerCase();
			return {
				icon:
					environmentFilter === 'sandbox' ? (
						<Icons.sandbox className="h-8 w-8 text-cyan-500 dark:text-cyan-300" />
					) : environmentFilter === 'lecture' ? (
						<Icons.eye className="h-8 w-8 text-sky-500 dark:text-sky-300" />
					) : environmentFilter === 'collab' ? (
						<Icons.users className="h-8 w-8 text-emerald-500 dark:text-emerald-300" />
					) : (
						<Icons.filter className="h-8 w-8 text-slate-400 dark:text-slate-300" />
					),
				title: `Aucun parcours en ${envLabel}`,
				description: (
					<p>
						Le filtre <strong>Environnement → {envLabel}</strong> ne renvoie aucun résultat. Choisissez un
						autre environnement ou réinitialisez le filtre.
					</p>
				),
				buttonLabel: 'Réinitialiser le filtre environnement',
				clearFilters: () => setEnvironmentFilter('all'),
			};
		}

		if (hasActiveTextFilter && !hasActiveEnvironmentFilter) {
			return {
				icon: <Icons.search className="h-8 w-8 text-slate-400 dark:text-slate-300" />,
				title: 'Aucun parcours ne correspond à la recherche',
				description: <p>Essayez un autre mot-clé (nom, URL, description, id…).</p>,
				buttonLabel: 'Effacer la recherche',
				clearFilters: () => {
					setFilterInput('');
					setFilterQuery('');
				},
			};
		}

		return {
			icon: <Icons.filter className="h-8 w-8 text-slate-400 dark:text-slate-300" />,
			title: 'Aucun parcours ne correspond aux filtres',
			description: (
				<p>
					Ajustez la recherche ou le filtre <strong>Environnement</strong>, ou réinitialisez tout pour tout
					afficher.
				</p>
			),
			buttonLabel: 'Réinitialiser les filtres',
			clearFilters: () => {
				setFilterInput('');
				setFilterQuery('');
				setEnvironmentFilter('all');
			},
		};
	}, [environmentFilter, hasActiveEnvironmentFilter, hasActiveTextFilter]);

	useEffect(() => {
		setToursListPage(1);
	}, [filterQuery, environmentFilter, tours.length]);

	const toursTotalPages = Math.max(1, Math.ceil(filteredTourEntries.length / TOURS_PAGE_SIZE));
	const safeToursListPage = Math.min(toursListPage, toursTotalPages);

	const paginatedTourEntries = useMemo(() => {
		const start = (safeToursListPage - 1) * TOURS_PAGE_SIZE;
		return filteredTourEntries.slice(start, start + TOURS_PAGE_SIZE);
	}, [filteredTourEntries, safeToursListPage]);

	const paginatedToursRangeLabel = useMemo(() => {
		if (filteredTourEntries.length === 0) return '';
		const start = (safeToursListPage - 1) * TOURS_PAGE_SIZE + 1;
		const end = Math.min(safeToursListPage * TOURS_PAGE_SIZE, filteredTourEntries.length);
		return `${start}–${end} sur ${filteredTourEntries.length}`;
	}, [filteredTourEntries.length, safeToursListPage]);

	const filteredAudienceUsers = useMemo(() => {
		const query = audienceUserQuery.trim().toLowerCase();
		if (!query) return audienceUsers.slice(0, 12);
		return audienceUsers
			.filter((user) => {
				const email = (user.email || '').toLowerCase();
				const firstName = (user.firstName || '').toLowerCase();
				const lastName = (user.lastName || '').toLowerCase();
				const fullName = `${firstName} ${lastName}`.trim();
				return email.includes(query) || fullName.includes(query);
			})
			.slice(0, 12);
	}, [audienceUsers, audienceUserQuery]);

	const concatTours = useMemo(() => {
		const byId = new Map((tours || []).map((tour) => [tour.id, tour]));
		return concatQueue
			.map((id) => byId.get(id))
			.filter((tour): tour is GuidedTour => Boolean(tour));
	}, [concatQueue, tours]);

	const concatSummary = useMemo(() => {
		const totalTours = concatTours.length;
		const totalSourceSteps = concatTours.reduce((sum, tour) => sum + getTourStepCount(tour), 0);
		const targetUrl = (concatDraft.targetUrl || '/').trim() || '/';
		return {
			totalTours,
			totalSourceSteps,
			targetUrl,
		};
	}, [concatTours, concatDraft.targetUrl]);
	const concatDraftHydratedRef = useRef(false);

	const formatCreatedAt = (value?: string) => {
		if (!value) return 'Date inconnue';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return 'Date inconnue';
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(date);
	};

	const getIconForStepType = (stepType: string) => {
		switch (stepType) {
			case 'tooltip':
				return Icons.messageSquare;
			case 'highlight':
				return Icons.target;
			case 'modal':
				return Icons.layout;
			case 'form':
				return Icons.clipboardList;
			case 'tutorial':
				return Icons.video;
			case 'checklist':
				return Icons.checkSquare;
			default:
				return Icons.info;
		}
	};

	const loadTours = async (attempt = 0) => {
		const currentSeq = ++loadSeqRef.current;
		try {
			const response = await tourService.getAll(undefined, { includeSteps: false });
			const fetchedTours = response.tours || [];
			if (currentSeq !== loadSeqRef.current) {
				return;
			}
			const visibleTours = fetchedTours.filter((t) => !hiddenTourIdsRef.current.has(t.id || ''));
			startTourListTransition(() => {
				setTours(visibleTours);
			});
			queueMicrotask(() => {
				reconcileAutoPublishedSessionWithTours(visibleTours, currentUserId);
				reconcileAllSdkLabRunSnapshots(visibleTours, currentUserId);
			});
		} catch (error) {
			const message = getErrorMessage(error, 'Une erreur est survenue.');
			const isTimeout = /timeout/i.test(message);
			if (attempt < 1 && isTimeout) {
				await new Promise((resolve) => setTimeout(resolve, 1500));
				return loadTours(attempt + 1);
			}
			toast.error('Impossible de charger les parcours', {
				description: isTimeout
					? 'Le serveur met trop de temps à répondre. Vérifiez que le backend (port 3020) est démarré, puis réessayez.'
					: message,
			});
		} finally {
			setIsLoading(false);
		}
	};

	const normalizeTour = (tour: GuidedTour): GuidedTour => ({
		...tour,
		steps: [...(tour.steps || [])].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)),
	});

	const persistPreviewTour = (tour: GuidedTour | null, shouldAutoPlay = false) => {
		if (typeof window === 'undefined') return;
		if (!tour) {
			window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
			return;
		}

		const payload = {
			tour,
			shouldAutoPlay,
			ts: Date.now(),
		};
		window.sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(payload));
	};

	const closePreview = () => {
		setPreviewTour(null);
		setPreviewShouldAutoPlay(false);
		persistPreviewTour(null);
	};

	const handlePreview = async (tour: GuidedTour) => {
		setIsPreviewLoading(true);
		setPreviewShouldAutoPlay(false);
		setPreviewTour({ ...tour, name: tour.name, steps: tour.steps ?? [] });
		try {
			const detailed = normalizeTour(await ensureTourWithSteps(tour));
			setPreviewTour(detailed);
			persistPreviewTour(detailed, false);
		} catch (error) {
			toast.error('Prévisualisation impossible', {
				description: getErrorMessage(error, 'Impossible de charger les étapes du parcours.'),
			});
			setPreviewTour(null);
		} finally {
			setIsPreviewLoading(false);
		}
	};

	const handleShowSteps = async (tour: GuidedTour) => {
		setIsStepsLoading(true);
		setStepsTour({ ...tour, steps: tour.steps ?? [] });
		try {
			setStepsTour(normalizeTour(await ensureTourWithSteps(tour)));
		} catch (error) {
			toast.error('Impossible d\'afficher les étapes', {
				description: getErrorMessage(error, 'Chargement du parcours interrompu.'),
			});
			setStepsTour(null);
		} finally {
			setIsStepsLoading(false);
		}
	};

	const handleExport = async (tour: GuidedTour) => {
		if (!tour.id) {
			return;
		}
		if (!canExportTour(tour, dashboardRole, currentUserId)) {
			toast.error('Export refusé', {
				description: 'Vous n’avez pas accès à ce parcours.',
			});
			return;
		}
		try {
			const response = await tourService.exportById(tour.id);
			const payload = response.export;
			if (!payload) {
				throw new Error('Réponse d’export invalide.');
			}
			downloadTourExportJson(payload, buildTourExportFilename(payload.name));
			toast.success(`Export réussi (${payload.name})`);
		} catch (error) {
			toast.error('Export impossible', {
				description: getErrorMessage(error, 'Impossible d’exporter le parcours.'),
			});
		}
	};

	const getDuplicateHref = (tour: GuidedTour) => {
		const params = new URLSearchParams();
		if (tour.id) {
			params.set('duplicateId', tour.id);
		}
		return `/dashboard/tours/create?${params.toString()}`;
	};

	const getCollaborateEditHref = (tour: GuidedTour) => {
		if (!tour.id) {
			return '/dashboard/tours/create';
		}
		return `/dashboard/tours/create?id=${encodeURIComponent(tour.id)}&access=collaborate`;
	};

	const restorePageSelection = () => {
		if (typeof document !== 'undefined') {
			document.body.style.removeProperty('user-select');
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		restorePageSelection();
		const droppedInConcatZone =
			(event.over && String(event.over.id) === CONCAT_DROP_ZONE_ID) || isConcatDropOver;
		if (!droppedInConcatZone) return;
		const fromData = event.active.data.current?.tourId;
		const fromActiveId =
			typeof event.active.id === 'string' && event.active.id.startsWith('tour-card-')
				? event.active.id.replace('tour-card-', '')
				: null;
		const draggedTourId = fromData || fromActiveId;
		if (!draggedTourId) return;
		if (!tours.some((tour) => tour.id === draggedTourId)) return;
		const draggedTour = tours.find((tour) => tour.id === draggedTourId);
		if (
			viewOnlyTourIds.has(draggedTourId) ||
			(draggedTour &&
				(isTourCardViewOnly(draggedTour, dashboardRole, currentUserId) ||
					isTourCollaborationPeerCard(draggedTour, dashboardRole, currentUserId)))
		) {
			toast.error('Concaténation impossible', {
				description: 'Ce parcours ne peut pas être concaténé (lecture seule ou collaboration).',
			});
			return;
		}

		setConcatQueue((prev) => {
			if (prev.includes(draggedTourId)) return prev;
			return [...prev, draggedTourId];
		});
	};

	const handleRemoveFromConcat = (tourId: string) => {
		setConcatQueue((prev) => prev.filter((id) => id !== tourId));
	};

	const handleMoveConcatItem = (tourId: string, direction: 'up' | 'down') => {
		setConcatQueue((prev) => {
			const index = prev.indexOf(tourId);
			if (index === -1) return prev;
			const nextIndex = direction === 'up' ? index - 1 : index + 1;
			if (nextIndex < 0 || nextIndex >= prev.length) return prev;
			const next = [...prev];
			const [item] = next.splice(index, 1);
			next.splice(nextIndex, 0, item);
			return next;
		});
	};

	const handleClearConcat = () => {
		setConcatQueue([]);
	};

	const handleResetConcatWorkspace = () => {
		clearConcatWorkspaceSession();
		setConcatQueue([]);
		setConcatDraft(createDefaultConcatDraft());
	};

	const handleGenerateConcatenatedTour = async () => {
		if (concatTours.length < 2) {
			toast.error('Ajoutez au moins deux parcours à concaténer.');
			return;
		}
		if (
			concatTours.some(
				(tour) =>
					(tour.id && viewOnlyTourIds.has(tour.id)) ||
					isTourCardViewOnly(tour, dashboardRole, currentUserId),
			)
		) {
			toast.error('Concaténation impossible', {
				description: 'Retirez les parcours en lecture seule de la file.',
			});
			return;
		}

		try {
			const detailedTours = await Promise.all(concatTours.map((tour) => ensureTourWithSteps(tour)));
			if (detailedTours.some((tour) => getTourStepCount(tour) === 0)) {
				toast.error('Un des parcours sélectionnés ne contient aucune étape.');
				return;
			}

			const concatenatedTour = concatenateToursFifo(detailedTours, {
				existingNames: tours.map((tour) => tour.name || ''),
				fallbackTargetUrl: concatDraft.targetUrl || '/',
				dedupeSteps: concatDraft.dedupeSteps,
			});
			if ((concatenatedTour.steps?.length || 0) === 0) {
				toast.error('La concaténation a produit un parcours vide. Vérifiez vos parcours source.');
				return;
			}

			const hydratedTour: GuidedTour = prepareTourCloneFromSource(
				{
					...concatenatedTour,
					name: concatDraft.name.trim() || concatenatedTour.name,
					targetUrl: concatDraft.targetUrl.trim() || concatenatedTour.targetUrl,
					priority: Number.isFinite(concatDraft.priority) ? concatDraft.priority : concatenatedTour.priority,
					isActive: concatDraft.isActive,
					description: concatDraft.description.trim() || concatenatedTour.description,
					replayPolicy: concatDraft.replayPolicy,
					replayAfterDays:
						concatDraft.replayPolicy === 'after_period' ? Math.max(0, concatDraft.replayAfterDays) : 0,
				},
				{ forceProduction: false },
			);

			if (typeof window !== 'undefined') {
				window.sessionStorage.setItem(
					CONCAT_PREFILL_STORAGE_KEY,
					JSON.stringify({
						tour: hydratedTour,
						sourceTourIds: concatTours.map((t) => t.id).filter((id): id is string => Boolean(id)),
						ts: Date.now(),
					}),
				);
			}

			router.push('/dashboard/tours/create?prefill=concat');
		} catch {
			toast.error('Impossible de préparer le pré-remplissage du parcours concaténé.');
		}
	};

	useEffect(() => {
		loadTours();
	}, []);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (!actionsMenuRef.current) return;
			const target = event.target as Node;
			if (!actionsMenuRef.current.contains(target)) {
				setActionsMenuOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	useEffect(() => {
		if (concatTours.length === 0) {
			setConcatDraft((prev) => ({
				...prev,
				name: '',
				description: '',
				targetUrl: '/',
				priority: 0,
			}));
			return;
		}

		const existingNames = tours.map((tour) => tour.name || '');
		setConcatDraft((prev) => ({
			...prev,
			targetUrl: prev.targetUrl.trim() === '' || prev.targetUrl === '/' ? '/' : prev.targetUrl,
			name: buildUniqueConcatName(concatTours, existingNames),
			description: buildConcatDraftDescription(concatTours),
			priority: Math.max(...concatTours.map((tour) => Number(tour.priority || 0)), 0),
		}));
	}, [concatTours, tours]);

	useEffect(() => {
		if (typeof window === 'undefined' || concatDraftHydratedRef.current) return;
		const raw = window.sessionStorage.getItem(CONCAT_DRAFT_STORAGE_KEY);
		if (!raw) {
			concatDraftHydratedRef.current = true;
			return;
		}
		try {
			const parsed = JSON.parse(raw) as {
				queue?: string[];
				draft?: Partial<typeof concatDraft>;
			};
			if (Array.isArray(parsed.queue)) {
				setConcatQueue(parsed.queue.filter((id): id is string => typeof id === 'string' && id.length > 0));
			}
			if (parsed.draft && typeof parsed.draft === 'object') {
				setConcatDraft((prev) => ({
					...prev,
					...parsed.draft,
					priority:
						typeof parsed.draft?.priority === 'number' && Number.isFinite(parsed.draft.priority)
							? parsed.draft.priority
							: prev.priority,
					replayAfterDays:
						typeof parsed.draft?.replayAfterDays === 'number' && Number.isFinite(parsed.draft.replayAfterDays)
							? parsed.draft.replayAfterDays
							: prev.replayAfterDays,
					dedupeSteps: parsed.draft?.dedupeSteps !== false,
				}));
			}
		} catch {
			window.sessionStorage.removeItem(CONCAT_DRAFT_STORAGE_KEY);
		} finally {
			concatDraftHydratedRef.current = true;
		}
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined' || !concatDraftHydratedRef.current) return;
		try {
			window.sessionStorage.setItem(
				CONCAT_DRAFT_STORAGE_KEY,
				JSON.stringify({
					queue: concatQueue,
					draft: concatDraft,
					ts: Date.now(),
				}),
			);
		} catch {
			// Ignore persistence errors (private mode / quota).
		}
	}, [concatQueue, concatDraft]);

	useEffect(() => {
		if (viewOnlyTourIds.size === 0) return;
		setConcatQueue((prev) => prev.filter((id) => !viewOnlyTourIds.has(id)));
	}, [viewOnlyTourIds]);

	useEffect(() => {
		if (typeof window === 'undefined' || previewTour) {
			return;
		}

		const raw = window.sessionStorage.getItem(PREVIEW_STORAGE_KEY);
		if (!raw) {
			return;
		}

		try {
			const parsed = JSON.parse(raw) as { tour?: GuidedTour; shouldAutoPlay?: boolean; ts?: number };
			if (!parsed?.tour || !parsed?.ts) {
				window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
				return;
			}

			if (Date.now() - parsed.ts > PREVIEW_STORAGE_TTL_MS) {
				window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
				return;
			}

			setPreviewTour(normalizeTour(parsed.tour));
			setPreviewShouldAutoPlay(Boolean(parsed.shouldAutoPlay));
		} catch {
			window.sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
		}
	}, [previewTour]);

	const handleToggleActive = async (tour: GuidedTour, audience: 'sandbox' | 'production') => {
		if (!tour.id) return;
		const sandboxTestActive =
			tour.environment === 'sandbox' ? Boolean(tour.isActive) : Boolean(tour.isSandboxTestActive);
		const productionActive = tour.environment === 'production' && Boolean(tour.isActive);
		const currentlyActive = audience === 'sandbox' ? sandboxTestActive : productionActive;
		const nextActive = !currentlyActive;
		try {
			const response = await tourService.toggleActive(tour.id, nextActive, audience);
			if (audience === 'sandbox') {
				// Ne pas recharger toute la liste : le backend trie par is_active DESC et ferait
				// remonter le parcours en page 1 à chaque toggle test.
				const updatedTour = response.tour;
				startTourListTransition(() => {
					setTours((prev) =>
						prev.map((item) => {
							if (item.id !== tour.id) {
								return item;
							}
							if (updatedTour) {
								return { ...item, ...updatedTour };
							}
							if (item.environment === 'sandbox') {
								return {
									...item,
									isActive: nextActive,
									sandboxTestStartedBy: nextActive ? item.sandboxTestStartedBy : null,
								};
							}
							return {
								...item,
								isSandboxTestActive: nextActive,
								sandboxTestStartedBy: nextActive ? item.sandboxTestStartedBy : null,
							};
						}),
					);
				});
				toast.success(
					nextActive ? 'Test sandbox activé' : 'Test sandbox désactivé',
					{
						description: nextActive
							? 'Visible pour vous en mode test (token sandbox ou JWT admin).'
							: 'Masqué du runtime sandbox.',
					},
				);
			} else {
				toast.success(
					nextActive ? 'Parcours activé en production' : 'Parcours désactivé en production',
					{
						description: nextActive
							? 'Visible pour les utilisateurs finaux.'
							: 'Masqué pour les utilisateurs finaux.',
					},
				);
				await loadTours();
			}
		} catch (error) {
			toast.error('Action impossible', {
				description: getErrorMessage(error, 'Impossible de modifier le statut.'),
			});
		}
	};

	const handleAdminEnvironmentTransfer = (tour: GuidedTour, target: TourDeploymentTarget) => {
		if (!tour.id) return;
		const current = tour.environment === 'production' ? 'production' : 'sandbox';
		if (current === target) return;
		if (
			target === 'sandbox' &&
			!canAdminTransferProductionToSandbox(
				tour,
				dashboardRole,
				currentUserId,
				creatorRoleByUserId,
			)
		) {
			toast.error('Retour sandbox impossible', {
				description: 'Seul le créateur administrateur peut repasser ce parcours en sandbox.',
			});
			return;
		}
		if (
			target === 'production' &&
			!canAdminTransferSandboxToProduction(tour, creatorRoleByUserId)
		) {
			toast.error('Passage en production impossible', {
				description:
					'Ce parcours est rejeté ou en attente de modération. Le développeur doit corriger et resoumettre ; approuvez-le avant de le promouvoir.',
			});
			return;
		}
		setTourPendingEnvTransfer({ tour, target });
	};

	const executeAdminEnvironmentTransfer = async (tour: GuidedTour, target: TourDeploymentTarget) => {
		if (!tour.id) return;
		setTransferringEnvIds((prev) => (prev.includes(tour.id!) ? prev : [...prev, tour.id!]));
		try {
			await tourService.update(tour.id, { environment: target });
			toast.success(
				target === 'production' ? 'Parcours en production' : 'Parcours repassé en sandbox',
				{
					description:
						target === 'production'
							? `${tour.name} est prêt pour les utilisateurs finaux (activation prod séparée).`
							: `${tour.name} est de nouveau en test sandbox.`,
				},
			);
			await loadTours();
		} catch (error) {
			toast.error('Transfert impossible', {
				description: getErrorMessage(error, "Impossible de changer l'environnement du parcours."),
			});
		} finally {
			setTransferringEnvIds((prev) => prev.filter((id) => id !== tour.id));
			setTourPendingEnvTransfer(null);
		}
	};

	const handleApproveSandbox = async (tour: GuidedTour) => {
		if (!tour.id) return;
		setApprovingIds((prev) => (prev.includes(tour.id!) ? prev : [...prev, tour.id!]));
		try {
			await tourService.approve(tour.id);
			toast.success('Parcours approuvé', {
				description: `${tour.name} reste en sandbox. Testez-le, puis passez en production via le switcher si besoin.`,
			});
			await loadTours();
		} catch (error) {
			toast.error('Approbation impossible', {
				description: getErrorMessage(error, 'Impossible d\'approuver ce parcours.'),
			});
		} finally {
			setApprovingIds((prev) => prev.filter((id) => id !== tour.id));
		}
	};

	const handleRejectSandbox = (tour: GuidedTour) => {
		setRejectReasonInput('');
		setTourPendingReject(tour);
	};

	const handleConfirmRejectSandbox = async () => {
		if (!tourPendingReject?.id) return;
		const reason = rejectReasonInput.trim();
		if (reason.length < 10) {
			toast.error('Cause du rejet insuffisante', {
				description: 'Merci de décrire la cause du rejet en au moins 10 caractères.',
			});
			return;
		}

		const tour = tourPendingReject;
		setRejectingIds((prev) => (prev.includes(tour.id!) ? prev : [...prev, tour.id!]));
		try {
			await tourService.reject(tour.id!, { reason });
			toast.success('Parcours rejeté', {
				description: `${tour.name} — le développeur verra votre retour.`,
			});
			setTourPendingReject(null);
			setRejectReasonInput('');
			await loadTours();
		} catch (error) {
			toast.error('Rejet impossible', {
				description: getErrorMessage(error, 'Impossible de rejeter ce parcours.'),
			});
		} finally {
			setRejectingIds((prev) => prev.filter((id) => id !== tour.id));
		}
	};

	const handleDelete = async (tour: GuidedTour) => {
		if (!tour.id) return;
		hiddenTourIdsRef.current.add(tour.id);
		setDeletingIds((prev) => (prev.includes(tour.id!) ? prev : [...prev, tour.id!]));
		setTours((prev) => prev.filter((item) => item.id !== tour.id));
		try {
			await tourService.remove(tour.id);
			removeAutoPublishedSignaturesForTour(normalizeTour(tour));
			toast.success(`Parcours supprimé (${tour.name})`);
			await loadTours();
		} catch (error) {
			hiddenTourIdsRef.current.delete(tour.id);
			await loadTours();
			toast.error('Suppression impossible', {
				description: getErrorMessage(error, 'Impossible de supprimer ce parcours.'),
			});
		} finally {
			setDeletingIds((prev) => prev.filter((id) => id !== tour.id));
		}
	};

	const handleConfirmDeleteTour = async () => {
		if (!tourPendingDelete) return;
		await handleDelete(tourPendingDelete);
		setTourPendingDelete(null);
	};

	const handleResetAudience = async (tour: GuidedTour) => {
		if (!tour.id) return;
		try {
			const response = await tourService.resetAudience(tour.id);
			toast.success('Audience réinitialisée', {
				description: `${response.clearedStates ?? 0} état(s) utilisateur supprimé(s).`,
			});
		} catch (error) {
			toast.error('Réinitialisation impossible', {
				description: getErrorMessage(error, 'Impossible de réinitialiser les états utilisateurs.'),
			});
		}
	};

	const handleResetUser = async (tour: GuidedTour, userId: string) => {
		if (!tour.id) return;
		if (!userId.trim()) return;
		try {
			const response = await tourService.resetUser(tour.id, userId.trim());
			toast.success('Utilisateur réinitialisé', {
				description: `${response.clearedStates ?? 0} état(s) supprimé(s) pour cet utilisateur.`,
			});
		} catch (error) {
			toast.error('Réinitialisation utilisateur impossible', {
				description: getErrorMessage(error, 'Impossible de réinitialiser cet utilisateur.'),
			});
		}
	};

	const handleResetSegment = async (
		tour: GuidedTour,
		payload: {
			segment: 'all' | 'new_users' | 'inactive_users' | 'custom_user_ids';
			createdWithinDays?: number;
			inactiveDays?: number;
			userIds?: string[];
		},
	) => {
		if (!tour.id) return;
		try {
			const response = await tourService.resetSegment(tour.id, payload);
			toast.success('Segment réinitialisé', {
				description: `${response.clearedStates ?? 0} état(s) supprimé(s) sur ${response.matchedUsers ?? 0} utilisateur(s).`,
			});
		} catch (error) {
			toast.error('Réinitialisation segment impossible', {
				description: getErrorMessage(error, 'Impossible de réinitialiser ce segment.'),
			});
		}
	};

	const handleRunReplayJob = async () => {
		try {
			const response = await tourService.runReplayJob();
			toast.success('Job replay exécuté', {
				description: `${response.updatedStates ?? 0} état(s) passés en ELIGIBLE.`,
			});
		} catch (error) {
			toast.error('Exécution du job impossible', {
				description: getErrorMessage(error, 'Impossible de lancer le job replay.'),
			});
		}
	};

	const openAudienceModal = (tour: GuidedTour) => {
		setAudienceTour(tour);
		setAudienceMode('all');
		setAudienceUsers([]);
		setAudienceUserQuery('');
		setSelectedAudienceUserId('');
		setSegmentType('inactive_users');
		setSegmentCreatedWithinDays(14);
		setSegmentInactiveDays(60);
		setSegmentUserIdsRaw('');
	};

	const closeAudienceModal = () => {
		if (isApplyingAudienceAction) return;
		setAudienceTour(null);
	};

	const applyAudienceAction = async () => {
		if (!audienceTour) return;
		setIsApplyingAudienceAction(true);
		try {
			if (audienceMode === 'all') {
				await handleResetAudience(audienceTour);
			} else if (audienceMode === 'user') {
				await handleResetUser(audienceTour, selectedAudienceUserId);
			} else {
				const payload =
					segmentType === 'new_users'
						? { segment: 'new_users' as const, createdWithinDays: Math.max(1, segmentCreatedWithinDays) }
						: segmentType === 'inactive_users'
							? { segment: 'inactive_users' as const, inactiveDays: Math.max(1, segmentInactiveDays) }
							: segmentType === 'custom_user_ids'
								? {
										segment: 'custom_user_ids' as const,
										userIds: segmentUserIdsRaw
											.split(',')
											.map((item) => item.trim())
											.filter(Boolean),
									}
								: { segment: 'all' as const };
				await handleResetSegment(audienceTour, payload);
			}
			setAudienceTour(null);
		} finally {
			setIsApplyingAudienceAction(false);
		}
	};

	useEffect(() => {
		if (!audienceTour || audienceMode !== 'user') return;
		if (audienceUsers.length > 0 || isAudienceUsersLoading) return;
		const loadUsers = async () => {
			setIsAudienceUsersLoading(true);
			try {
				const response = await userService.getAll(1, 200);
				setAudienceUsers(response.users || []);
			} catch (error) {
				toast.error('Chargement utilisateurs impossible', {
					description: getErrorMessage(error, 'Impossible de charger la liste utilisateurs.'),
				});
			} finally {
				setIsAudienceUsersLoading(false);
			}
		};
		loadUsers();
	}, [audienceTour, audienceMode, audienceUsers.length, isAudienceUsersLoading]);

	const mainColumn = (
			<div className="relative space-y-6">
				<div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
					<div className="absolute -left-16 top-6 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
					<div className="absolute right-[-70px] top-28 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
					<div className="absolute bottom-0 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
				</div>
				{/* En-tête */}
				<div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Parcours guides</h1>
						<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
							{isAdmin
								? "Gerez, modifiez et publiez vos parcours d'integration depuis votre espace."
								: isDeveloper
									? 'Parcours sandbox modifiables ; production en lecture seule jusqu’à approbation admin.'
									: 'Consultez les parcours guides de votre organisation (lecture seule).'}
						</p>
					</div>
					{canCreateNewTour ? (
					<div ref={actionsMenuRef} className="relative w-full md:w-auto">
						<div className="flex w-full md:w-auto">
							<Link href="/dashboard/tours/create" prefetch={false} className="flex-1 md:flex-none">
								<Button className="w-full rounded-r-none shadow-sm hover:scale-105 transition-transform">
									<Icons.plus className="mr-2 h-4 w-4" />
									Nouveau parcours
								</Button>
							</Link>
							<Button
								type="button"
								variant="outline"
								className="rounded-l-none border-l-0 px-3 shadow-sm hover:scale-105 transition-transform"
								onClick={() => setActionsMenuOpen((prev) => !prev)}
								aria-label="Afficher plus d'actions"
								aria-expanded={actionsMenuOpen}
							>
								<Icons.chevronDown className={`h-4 w-4 transition-transform ${actionsMenuOpen ? 'rotate-180' : ''}`} />
							</Button>
						</div>
						{actionsMenuOpen && (
							<div className="absolute right-0 z-50 mt-2 min-w-[220px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]">
								<button
									type="button"
									className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
									onClick={() => {
										setActionsMenuOpen(false);
										handleRunReplayJob();
									}}
								>
									<Icons.refresh className="h-4 w-4" />
									Lancer job replay
								</button>
							</div>
						)}
					</div>
					) : null}
				</div>

				{isDeveloper ? (
					<SandboxHintCollapsible title="Workflow sandbox" tone="orange" storageKey="tours-workflow-sandbox">
						Espace pour créer et tester vos parcours (SDK <strong>tours:sandbox</strong>) avant validation admin.
						Les clients finaux ne les voient pas tant qu&apos;ils ne sont pas approuvés.
					</SandboxHintCollapsible>
				) : null}

				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{[
						{ label: 'Total parcours', value: toursStats.total, icon: Icons.tours, tone: 'from-slate-100 to-white dark:from-slate-800/90 dark:to-slate-900/70' },
						{ label: 'Parcours sandbox', value: toursStats.sandbox, icon: Icons.sandbox, tone: 'from-cyan-100 to-white dark:from-cyan-500/20 dark:to-slate-900/70' },
						{ label: 'Parcours autogénérés', value: toursStats.autogen, icon: Icons.autogen, tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70' },
						{ label: 'Parcours actifs', value: toursStats.active, icon: Icons.active, tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70' },
					].map((item) => {
						const Icon = item.icon;
						return (
							<div
								key={item.label}
								className={`rounded-2xl border border-slate-200 bg-gradient-to-br ${item.tone} p-4 shadow-[0_10px_24px_rgba(2,6,23,0.12)] backdrop-blur-sm dark:border-white/10 dark:shadow-[0_10px_30px_rgba(2,6,23,0.35)]`}
							>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{item.label}</p>
										<p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{item.value}</p>
									</div>
									<div className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-orange-500 dark:border-white/10 dark:bg-slate-950/65 dark:text-orange-300">
										<Icon className="h-4 w-4" />
									</div>
								</div>
							</div>
						);
					})}
				</div>

				<div>
					<div className="mb-2 flex flex-wrap items-center gap-2">
						<Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
							Filtres
						</Label>
						{environmentFilter !== 'all' ? (
							<Badge variant="outline" className="border-orange-300/50 text-orange-700 dark:text-orange-200">
								Filtre : {getTourListFilterLabel(environmentFilter)}
							</Badge>
						) : null}
					</div>
					<form
						className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center"
						onSubmit={(e) => {
							e.preventDefault();
							setFilterQuery(filterInput.trim());
						}}
					>
						<Select
							value={environmentFilter}
							onValueChange={(value) => setEnvironmentFilter(value as TourListEnvironmentFilter)}
						>
							<SelectTrigger className={PHOENIX_SELECT_TRIGGER_ORANGE}>
								<SelectValue placeholder="Environnement" />
							</SelectTrigger>
							<SelectContent
								alignItemWithTrigger={false}
								side="bottom"
								sideOffset={8}
								className={PHOENIX_SELECT_CONTENT_ORANGE}
							>
								<SelectItem value="all" className={PHOENIX_SELECT_ITEM_ORANGE}>
									Tous
								</SelectItem>
								<SelectItem value="production" className={PHOENIX_SELECT_ITEM_ORANGE}>
									Production
								</SelectItem>
								<SelectItem value="sandbox" className={PHOENIX_SELECT_ITEM_ORANGE}>
									Sandbox
								</SelectItem>
								<SelectItem value="pending" className={PHOENIX_SELECT_ITEM_ORANGE}>
									En attente
								</SelectItem>
								<SelectItem value="lecture" className={PHOENIX_SELECT_ITEM_ORANGE}>
									Lecture
								</SelectItem>
								<SelectItem value="collab" className={PHOENIX_SELECT_ITEM_ORANGE}>
									Collab
								</SelectItem>
							</SelectContent>
						</Select>
						<div className="flex w-full gap-2 lg:w-1/2">
						<div className="relative flex-1">
							<Icons.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
							<input
								value={filterInput}
								onChange={(e) => setFilterInput(e.target.value)}
								placeholder="Filtrer par nom, URL, description ou id…"
								className="h-10 w-full rounded-lg border border-slate-300 bg-white/85 pl-9 pr-9 text-sm text-slate-800 shadow-sm outline-none transition-colors placeholder:text-slate-500 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-200"
							/>
							{filterInput ? (
								<button
									type="button"
									onClick={() => {
										setFilterInput('');
										setFilterQuery('');
									}}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-100 dark:hover:text-slate-600"
									aria-label="Effacer la recherche"
								>
									<Icons.close className="h-3.5 w-3.5" />
								</button>
							) : null}
						</div>
						<Button
							type="submit"
							onClick={() => setFilterQuery(filterInput.trim())}
							className="h-10 rounded-lg px-4 shadow-sm hover:scale-105 transition-transform"
						>
							Rechercher
						</Button>
						</div>
					</form>
					{!isLoading && tours.length > 0 && filterQuery.trim() ? (
						<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
							{filteredTourEntries.length} parcours affiché(s) sur {tours.length}
						</p>
					) : null}
				</div>

				{canUseAdvancedTourTools ? (
				<ConcatDropContainer onOverChange={setIsConcatDropOver}>
				<Card className="border border-slate-200/80 bg-[linear-gradient(155deg,rgba(255,255,255,0.92),rgba(248,250,252,0.84)_45%,rgba(241,245,249,0.82))] shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors dark:border-white/12 dark:bg-[linear-gradient(155deg,rgba(15,23,42,0.72),rgba(15,23,42,0.56)_45%,rgba(2,6,23,0.76))] dark:shadow-[0_20px_45px_rgba(2,6,23,0.5)]">
					<CardHeader className="pb-3">
						<CardTitle className="text-base text-slate-900 dark:text-white">Concaténer des parcours (FIFO)</CardTitle>
						<p className="text-sm text-slate-600 dark:text-slate-400">
							Glissez des cartes parcours dans la zone pour composer un nouveau parcours combiné.
						</p>
					</CardHeader>
					<CardContent className="space-y-4">
						<div
							className={`min-h-[76px] rounded-xl border-2 border-dashed p-3 backdrop-blur-sm transition-colors ${
								isConcatDropOver
									? 'border-orange-400/80 bg-orange-50/70 shadow-[0_0_0_1px_rgba(251,146,60,0.2),0_0_30px_rgba(249,115,22,0.2)] dark:bg-orange-500/12'
									: 'border-slate-300/85 bg-slate-50/70 dark:border-white/15 dark:bg-slate-950/35'
							}`}
						>
							{concatTours.length === 0 ? (
								<p className="text-sm text-slate-500 dark:text-slate-400">
									Déposez ici 2 parcours ou plus pour les concaténer.
								</p>
							) : (
								<div className="flex flex-wrap gap-2">
									{concatTours.map((tour, index) => (
										<div
											key={`${tour.id}-${index}`}
											className="inline-flex items-center gap-2 rounded-md border border-slate-300/80 bg-white/85 px-2 py-1 text-xs text-slate-700 backdrop-blur-sm dark:border-white/15 dark:bg-slate-900/65 dark:text-slate-200"
										>
											<span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
												{index + 1}
											</span>
											<span className="max-w-[160px] truncate">{tour.name}</span>
											<div className="flex items-center gap-1">
												<button
													type="button"
													onClick={() => handleMoveConcatItem(tour.id || '', 'up')}
													disabled={index === 0}
													className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
													aria-label={`Monter ${tour.name}`}
												>
													<Icons.arrowUp className="h-3 w-3" />
												</button>
												<button
													type="button"
													onClick={() => handleMoveConcatItem(tour.id || '', 'down')}
													disabled={index === concatTours.length - 1}
													className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
													aria-label={`Descendre ${tour.name}`}
												>
													<Icons.arrowDown className="h-3 w-3" />
												</button>
											</div>
											<button
												type="button"
												onClick={() => handleRemoveFromConcat(tour.id || '')}
												className="rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
												aria-label={`Retirer ${tour.name}`}
											>
												<Icons.close className="h-3 w-3" />
											</button>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
							<div className="space-y-1.5">
								<Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nom du parcours</Label>
								<input
									value={concatDraft.name}
									onChange={(e) => setConcatDraft((prev) => ({ ...prev, name: e.target.value }))}
									placeholder="Nom du nouveau parcours"
									className="h-9 w-full rounded-lg border border-slate-300/80 bg-white/85 px-3 text-sm text-slate-800 backdrop-blur-sm outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">URL cible</Label>
								<input
									value={concatDraft.targetUrl}
									onChange={(e) => setConcatDraft((prev) => ({ ...prev, targetUrl: e.target.value }))}
									placeholder="URL cible"
									className="h-9 w-full rounded-lg border border-slate-300/80 bg-white/85 px-3 text-sm text-slate-800 backdrop-blur-sm outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Priorité</Label>
								<input
									type="number"
									min={0}
									max={99}
									value={concatDraft.priority}
									onChange={(e) => setConcatDraft((prev) => ({ ...prev, priority: Number(e.target.value || 0) }))}
									placeholder="Priorité"
									className="h-9 w-full rounded-lg border border-slate-300/80 bg-white/85 px-3 text-sm text-slate-800 backdrop-blur-sm outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Statut</Label>
								<Select
									value={concatDraft.isActive ? 'active' : 'inactive'}
									onValueChange={(value) => setConcatDraft((prev) => ({ ...prev, isActive: value === 'active' }))}
								>
									<SelectTrigger className="h-9 border-slate-300/80 bg-white/85 text-slate-800 backdrop-blur-sm dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100">
										<SelectValue placeholder="Statut" />
									</SelectTrigger>
									<SelectContent
										alignItemWithTrigger={false}
										side="bottom"
										sideOffset={8}
									>
										<SelectItem value="active">Actif</SelectItem>
										<SelectItem value="inactive">Inactif</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
							<div className="space-y-1.5">
								<Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description</Label>
								<input
									value={concatDraft.description}
									onChange={(e) => setConcatDraft((prev) => ({ ...prev, description: e.target.value }))}
									placeholder="Description"
									className="h-9 w-full rounded-lg border border-slate-300/80 bg-white/85 px-3 text-sm text-slate-800 backdrop-blur-sm outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100"
								/>
							</div>
							<div className="grid grid-cols-2 gap-2">
								<div className="space-y-1.5">
									<Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Replay policy</Label>
									<Select
										value={concatDraft.replayPolicy}
										onValueChange={(value) =>
											setConcatDraft((prev) => ({
												...prev,
												replayPolicy: value as 'never' | 'after_period' | 'always_on_new_version',
											}))
										}
									>
										<SelectTrigger className="h-9 border-slate-300/80 bg-white/85 text-slate-800 backdrop-blur-sm dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100">
											<SelectValue placeholder="Replay policy" />
										</SelectTrigger>
										<SelectContent
											alignItemWithTrigger={false}
											side="bottom"
											sideOffset={8}
										>
											<SelectItem value="never">never</SelectItem>
											<SelectItem value="after_period">after_period</SelectItem>
											<SelectItem value="always_on_new_version">always_on_new_version</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1.5">
									<Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Replay jours</Label>
									<input
										type="number"
										min={0}
										value={concatDraft.replayAfterDays}
										onChange={(e) =>
											setConcatDraft((prev) => ({ ...prev, replayAfterDays: Number(e.target.value || 0) }))
										}
										placeholder="Replay jours"
										className="h-9 w-full rounded-lg border border-slate-300/80 bg-white/85 px-3 text-sm text-slate-800 backdrop-blur-sm outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100"
									/>
								</div>
							</div>
						</div>

						<div className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-slate-50/65 px-3 py-2 text-xs text-slate-600 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-300">
							<div className="inline-flex items-center gap-2">
								<button
									type="button"
									role="switch"
									aria-checked={concatDraft.dedupeSteps}
									aria-label="Dédupliquer les étapes identiques"
									onClick={() => setConcatDraft((prev) => ({ ...prev, dedupeSteps: !prev.dedupeSteps }))}
									className={`relative inline-flex h-7 w-14 items-center rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-orange-400/35 ${
										concatDraft.dedupeSteps
											? 'border-orange-500/70 bg-orange-500 shadow-[0_0_22px_rgba(249,115,22,0.35)]'
											: 'border-slate-300/80 bg-slate-300/80 dark:border-white/20 dark:bg-slate-700/70'
									}`}
								>
									<span
										className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
											concatDraft.dedupeSteps ? 'translate-x-7' : 'translate-x-0.5'
										}`}
									/>
								</button>
								<span>Dédupliquer les étapes identiques</span>
							</div>
							<span>
								Résumé: {concatSummary.totalTours} parcours, {concatSummary.totalSourceSteps} étapes source, URL finale {concatSummary.targetUrl}
							</span>
						</div>

						<div className="flex items-center justify-between">
							<p className="inline-flex items-center rounded-full border border-orange-400/45 bg-orange-500/10 px-2.5 py-1 text-xs font-semibold text-orange-600 shadow-[0_0_18px_rgba(249,115,22,0.25)] dark:border-orange-400/40 dark:bg-orange-500/15 dark:text-orange-300">
								Ordre FIFO: {concatTours.length} parcours sélectionné(s)
							</p>
							<div className="flex items-center gap-2">
								<Button variant="outline" onClick={handleClearConcat} disabled={concatTours.length === 0}>
									Vider
								</Button>
								<Button variant="outline" onClick={handleResetConcatWorkspace}>
									Retirer tout + reset champs
								</Button>
								<Button
									type="button"
									onClick={handleGenerateConcatenatedTour}
									className="h-10 rounded-lg px-4 shadow-sm transition-transform hover:scale-105 active:scale-[0.98]"
								>
									Concaténer
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
				</ConcatDropContainer>
				) : null}

				{/* Contenu */}
				{isLoading ? (
					<ToursListEmptyState
						minHeightClassName="min-h-[300px]"
						className="border-slate-200 bg-white/85 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/45"
						icon={<Icons.spinner className="h-6 w-6 animate-spin text-primary" />}
						title="Chargement de vos parcours..."
					/>
				) : tours.length === 0 ? (
					<ToursListEmptyState
						icon={
							<div className="rounded-full bg-primary/10 p-4">
								<Icons.tours className="h-8 w-8 text-primary" />
							</div>
						}
						title="Aucun parcours pour le moment"
						description={
							<p>
								Vous n&apos;avez pas encore cree de parcours guide. Creer un parcours vous permettra
								d&apos;accompagner vos utilisateurs de maniere interactive.
							</p>
						}
						action={
							canCreateNewTour ? (
								<Link href="/dashboard/tours/create" prefetch={false}>
									<Button className="gap-2">
										<Icons.plus className="h-4 w-4" />
										Creer mon premier parcours
									</Button>
								</Link>
							) : (
								<p className="text-xs text-slate-500 dark:text-slate-400">
									Contactez un administrateur pour créer un parcours.
								</p>
							)
						}
					/>
				) : filteredTourEntries.length === 0 ? (
					<ToursListEmptyState
						icon={tourListFilterEmptyState.icon}
						title={tourListFilterEmptyState.title}
						description={tourListFilterEmptyState.description}
						action={
							<Button variant="outline" onClick={tourListFilterEmptyState.clearFilters}>
								{tourListFilterEmptyState.buttonLabel}
							</Button>
						}
					/>
				) : (
					<div className="space-y-4">
						<div
							className="rounded-2xl border-2 border-dashed border-slate-300/70 bg-slate-50/40 p-5 dark:border-white/20 dark:bg-slate-900/25"
							aria-label={`Page ${safeToursListPage} — parcours ${paginatedToursRangeLabel}`}
						>
							<div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-slate-300/50 pb-3 dark:border-white/15">
								<p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
									Zone page {safeToursListPage}
								</p>
								<p className="text-sm text-slate-600 dark:text-slate-300">
									{paginatedToursRangeLabel} parcours
								</p>
							</div>
							<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{paginatedTourEntries.map(({ tour, meta }) => {
							const hasStableId = Boolean(tour.id);
							const tourIdStr = typeof tour.id === 'string' ? tour.id : '';
							const showNewGlow = Boolean(tourIdStr) && tourEligibleForNewGlow(tour, newGlowTourIds);
							const showViewOnlyActions = meta.isViewOnlyCard;
							const showCollaborationPeerActions = meta.isCollaborationPeerCard;
							const showDeveloperAwaitingActions =
								meta.isDeveloperAwaitingAdminDecision && dashboardRole === 'DEVELOPER';
							const canManageThisTour =
								meta.canManage &&
								meta.canManageProductionDeployment &&
								!showViewOnlyActions &&
								!showCollaborationPeerActions &&
								!showDeveloperAwaitingActions;
							const canDeleteThisTour =
								meta.canDelete &&
								!showViewOnlyActions &&
								!showCollaborationPeerActions &&
								!showDeveloperAwaitingActions;
							const isProductionTour = tour.environment === 'production';
							const canEditThisTour = canManageThisTour && !isProductionTour;
							const canDuplicateThisTour =
								canManageThisTour &&
								Boolean(tour.id) &&
								canForkTour(tour, dashboardRole, currentUserId);
							const canDeleteProductionSafe =
								canDeleteThisTour && !isProductionTour;
							const cardIconActionClass = (...extra: Parameters<typeof cn>) =>
								cn(
									'h-9 border-slate-300 bg-white/90 text-slate-600 transition-colors focus:ring-2 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-300',
									isProductionTour ? 'min-w-0 flex-1' : 'w-9',
									...extra,
								);
							const cardEqualFooterActionClass = (...extra: Parameters<typeof cn>) =>
								cn(
									'h-9 min-w-0 flex-1 border-slate-300 bg-white/90 text-slate-600 transition-colors focus:ring-2 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-300',
									...extra,
								);
							const isLabTour = meta.isLab;
							const isLabTemplateCard = meta.isLabTemplate;
							const showApproveButton = meta.showApprove;
							const showRejectButton = meta.showReject;
							const showApprovedModeration =
								meta.showReopenToDeveloper ||
								meta.showReassignAdmins ||
								meta.showTransferDeveloper;
							const showEnvironmentSwitcher = meta.showEnvironmentSwitcher;
							const showSandboxTestToggle = meta.showSandboxTestToggle;
							const showProductionToggle = meta.showProductionToggle;
							const showAudienceReset = meta.showAudienceReset;
							const isTransferringEnv = Boolean(tour.id && transferringEnvIds.includes(tour.id));
							const sandboxTestActive = meta.sandboxTestActive;
							const productionActive = meta.productionActive;
							const deploymentActive = meta.isSandbox ? sandboxTestActive : productionActive;
							const tourDisplayName = resolveTourCardDisplayName(tour, meta.isAutogen);
							const productionManagerFullLabel =
								meta.productionManagerUserId
									? resolveTourActorLabel(
											meta.productionManagerUserId,
											orgActorLabelByUserId,
											sessionUser,
										)
									: null;
							const productionManagerShortLabel =
								meta.productionManagerUserId
									? formatProductionManagerShortLabel(
											meta.productionManagerUserId,
											orgActorLabelByUserId,
											sessionUser,
										)
									: null;
							const cardVisuallyActive = showEnvironmentSwitcher
								? deploymentActive
								: sandboxTestActive || productionActive;
							const showDeploymentActiveToggle = showEnvironmentSwitcher;
							const cardNode = (
								<article
									title={showNewGlow ? 'Dernier parcours ajouté sur cette page' : undefined}
									className={cn(
										'group relative flex h-full flex-col overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300',
										'hover:-translate-y-0.5',
										cardVisuallyActive
											? 'border-emerald-300/50 bg-[linear-gradient(155deg,rgba(16,185,129,0.1),rgba(255,255,255,0.95)_50%,rgba(248,250,252,0.92))] shadow-[0_12px_28px_rgba(2,6,23,0.1)] hover:border-emerald-400/55 hover:shadow-[0_20px_45px_rgba(16,185,129,0.15)] dark:border-emerald-400/25 dark:bg-[linear-gradient(155deg,rgba(16,185,129,0.08),rgba(15,23,42,0.92)_45%,rgba(2,6,23,0.95))] dark:hover:shadow-[0_20px_45px_rgba(16,185,129,0.12)]'
											: 'border-orange-300/45 bg-[linear-gradient(155deg,rgba(249,115,22,0.08),rgba(255,255,255,0.95)_50%,rgba(248,250,252,0.92))] shadow-[0_12px_28px_rgba(2,6,23,0.1)] hover:border-orange-400/50 hover:shadow-[0_20px_45px_rgba(249,115,22,0.12)] dark:border-orange-400/20 dark:bg-[linear-gradient(155deg,rgba(249,115,22,0.07),rgba(15,23,42,0.92)_45%,rgba(2,6,23,0.95))] dark:hover:shadow-[0_20px_45px_rgba(249,115,22,0.1)]',
										showNewGlow &&
											!cardVisuallyActive &&
											'z-[1] ring-2 ring-orange-400/50 shadow-[0_0_24px_rgba(249,115,22,0.18)] tour-card-new-glow dark:ring-orange-400/40 dark:shadow-[0_0_28px_rgba(249,115,22,0.14)]',
									)}
								>
								<div
									className={cn(
										'h-1 w-full',
										cardVisuallyActive
											? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500'
											: 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600',
									)}
								/>
								{cardVisuallyActive ? (
									<>
										<div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-500/10 opacity-60 blur-3xl transition-opacity group-hover:opacity-100" />
										<div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-pink-500/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-80" />
									</>
								) : showNewGlow ? (
									<>
										<div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-500/10 opacity-45 blur-3xl transition-opacity group-hover:opacity-70" />
										<div className="pointer-events-none absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-pink-500/10 opacity-25 blur-2xl transition-opacity group-hover:opacity-50" />
									</>
								) : null}

								<CardHeader className="relative pb-3 pt-5">
									<div className="flex items-start justify-between gap-3">
										<div className="flex min-w-0 flex-1 items-start gap-3">
											<TourLogoActionsMenu
												tour={tour}
												role={dashboardRole}
												userId={currentUserId}
												cardVisuallyActive={cardVisuallyActive}
												onUpdated={loadTours}
											/>
											<div className="min-w-0 flex-1 space-y-1">
												<CardTitle
													className="line-clamp-2 min-h-[1.4rem] text-lg font-bold leading-snug tracking-tight text-slate-900 dark:text-white"
													title={tourDisplayName}
												>
													{tourDisplayName}
												</CardTitle>
												<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
													<span
														className={cn(
															'rounded px-1.5 py-0.5 font-mono text-[10px] font-medium',
															'bg-slate-200/90 text-slate-700 dark:bg-slate-800/90 dark:text-slate-300',
														)}
													>
														{(tour.id || '').slice(0, 8)}
													</span>
													{(!showViewOnlyActions || meta.isOwner) && (
														<span>Créé le {formatCreatedAt(tour.createdAt)}</span>
													)}
												</p>
											</div>
										</div>
										<div className="flex w-[10.5rem] shrink-0 flex-col items-end gap-1.5">
											{showEnvironmentSwitcher && tour.id ? (
												<TourEnvironmentSwitcher
													tour={tour}
													disabled={isTransferringEnv}
													canTransferToProduction={meta.canTransferToProduction}
													canTransferToSandbox={meta.canTransferToSandbox}
													onTransfer={(target) => handleAdminEnvironmentTransfer(tour, target)}
												/>
											) : null}
											{showNewGlow ? (
												<span className="inline-flex rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 p-px">
													<span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 dark:bg-slate-950/95">
														<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500" />
														<span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-[10px] font-semibold uppercase tracking-wide text-transparent">
															Nouveau
														</span>
													</span>
												</span>
											) : null}
											{showEnvironmentSwitcher ? (
												<Badge
													variant="outline"
													className={cn(
														'gap-1 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
														meta.isSandbox
															? deploymentActive
																? 'border-cyan-300/60 bg-cyan-50 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200'
																: 'border-slate-300/55 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-slate-800/55 dark:text-slate-400'
															: deploymentActive
																? 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200'
																: 'border-slate-300/55 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-slate-800/55 dark:text-slate-400',
													)}
												>
													{meta.isSandbox ? (
														<Icons.sandbox className="h-3 w-3" />
													) : null}
													{meta.isSandbox
														? deploymentActive
															? 'Sandbox actif'
															: 'Sandbox inactif'
														: deploymentActive
															? 'Prod actif'
															: 'Prod inactif'}
												</Badge>
											) : showProductionToggle && showSandboxTestToggle ? (
												<div className="flex flex-col items-end gap-1">
													<Badge
														variant="outline"
														className={cn(
															'gap-1 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
															sandboxTestActive
																? 'border-cyan-300/60 bg-cyan-50 text-cyan-800 dark:border-cyan-400/40 dark:bg-cyan-500/15 dark:text-cyan-200'
																: 'border-slate-300/55 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-slate-800/55 dark:text-slate-400',
														)}
													>
														<Icons.sandbox className="h-3 w-3" />
														{sandboxTestActive ? 'Sandbox actif' : 'Sandbox inactif'}
													</Badge>
													<Badge
														variant="outline"
														className={cn(
															'gap-1 border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
															productionActive
																? 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200'
																: 'border-slate-300/55 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-slate-800/55 dark:text-slate-400',
														)}
													>
														{productionActive ? 'Prod actif' : 'Prod inactif'}
													</Badge>
												</div>
											) : (
												<Badge
													variant="outline"
													className={cn(
														'gap-1.5 border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
														sandboxTestActive || productionActive
															? 'border-emerald-300/60 bg-emerald-50 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-500/15 dark:text-emerald-200'
															: 'border-slate-300/55 bg-slate-100 text-slate-600 dark:border-white/15 dark:bg-slate-800/55 dark:text-slate-400',
													)}
												>
													<span
														className={cn(
															'h-1.5 w-1.5 rounded-full',
															sandboxTestActive || productionActive
																? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
																: 'bg-slate-400 dark:bg-slate-500',
														)}
													/>
													{sandboxTestActive || productionActive
														? meta.isActiveTestLabel
															? 'Actif (test)'
															: 'Actif'
														: 'Inactif'}
												</Badge>
											)}
											{isLabTour ? (
												<Badge
													variant="outline"
													className="border-orange-300/50 bg-orange-50/90 text-[10px] font-semibold uppercase tracking-wide text-orange-800 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200"
												>
													Lab SDK
												</Badge>
											) : null}
											{meta.isAutogen ? (
												<Badge
													variant="outline"
													className="border-cyan-300/50 bg-cyan-50/90 text-[10px] font-semibold uppercase tracking-wide text-cyan-800 dark:border-cyan-400/30 dark:bg-cyan-500/10 dark:text-cyan-200"
												>
													Autogénéré
												</Badge>
											) : null}
											{meta.isSandbox && !showEnvironmentSwitcher ? (
												<Badge
													variant="outline"
													className="border-orange-300/50 bg-orange-50/90 text-[10px] font-semibold uppercase tracking-wide text-orange-800 dark:border-orange-400/30 dark:bg-orange-500/10 dark:text-orange-200"
												>
													Sandbox
												</Badge>
											) : null}
											{meta.showSharingLectureBadge ? (
												hasDeveloperViewShareMessage(tour) ? (
													<button
														type="button"
														onClick={() =>
															setTourShareMessageDetails({ tour, mode: 'view' })
														}
														className="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
														title={
															tour.createdBy
																? `Voir le message développeur — partagé par ${resolveTourActorLabel(tour.createdBy, orgActorLabelByUserId, sessionUser)}`
																: 'Voir le message développeur — lecture seule'
														}
													>
														<Badge
															variant="outline"
															className="cursor-pointer border-sky-300/55 bg-sky-50/90 text-[10px] font-semibold uppercase tracking-wide text-sky-900 transition-colors hover:bg-sky-100/90 dark:border-sky-400/35 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
														>
															Lecture
														</Badge>
													</button>
												) : (
													<Badge
														variant="outline"
														className="border-sky-300/55 bg-sky-50/90 text-[10px] font-semibold uppercase tracking-wide text-sky-900 dark:border-sky-400/35 dark:bg-sky-500/10 dark:text-sky-200"
													>
														Lecture
													</Badge>
												)
											) : null}
											{meta.showSharingCollabBadge ? (
												hasDeveloperCollaborateShareMessage(tour) ? (
													<button
														type="button"
														onClick={() =>
															setTourShareMessageDetails({ tour, mode: 'collaborate' })
														}
														className="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
														title={
															tour.createdBy
																? `Voir le message développeur — partagé par ${resolveTourActorLabel(tour.createdBy, orgActorLabelByUserId, sessionUser)}`
																: 'Voir le message développeur — collaboration'
														}
													>
														<Badge
															variant="outline"
															className="cursor-pointer border-emerald-300/55 bg-emerald-50/90 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 transition-colors hover:bg-emerald-100/90 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-100 dark:hover:bg-emerald-500/20"
														>
															Collab
														</Badge>
													</button>
												) : (
													<Badge
														variant="outline"
														className="border-emerald-300/55 bg-emerald-50/90 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-200"
													>
														Collab
													</Badge>
												)
											) : null}
											{meta.showPrivateOwnerBadge ? (
												<Badge
													variant="outline"
													className="border-violet-300/50 bg-violet-50/90 text-[10px] font-semibold uppercase tracking-wide text-violet-800 dark:border-violet-400/30 dark:bg-violet-500/10 dark:text-violet-200"
												>
													Privé
												</Badge>
											) : null}
											{meta.showOwnerRoleBadge ? (
												<Badge
													variant="outline"
													className="border-amber-300/55 bg-amber-50/90 text-[10px] font-semibold uppercase tracking-wide text-amber-950 dark:border-amber-400/35 dark:bg-amber-500/10 dark:text-amber-100"
												>
													Owner
												</Badge>
											) : null}
											{meta.isDeveloperModerationPending ? (
												hasDeveloperSubmissionMessage(tour) ? (
													<button
														type="button"
														onClick={() => setTourSubmissionDetails(tour)}
														className="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
														title={
															tour.createdBy
																? `Voir le message développeur — envoyé par ${resolveTourActorLabel(tour.createdBy, orgActorLabelByUserId, sessionUser)}`
																: 'Voir le message développeur'
														}
													>
														<Badge
															variant="outline"
															className="cursor-pointer border-amber-300/50 bg-amber-50/90 text-[10px] font-semibold uppercase tracking-wide text-amber-800 transition-colors hover:bg-amber-100/90 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200 dark:hover:bg-amber-500/20"
														>
															En attente
														</Badge>
													</button>
												) : (
													<Badge
														variant="outline"
														className="border-amber-300/50 bg-amber-50/90 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200"
													>
														En attente
													</Badge>
												)
											) : null}
											{meta.isDeveloperModerationRejected ? (
												<button
													type="button"
													onClick={() => setTourRejectionDetails(tour)}
													className="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50"
													title={
														tour.sandboxRejectedBy
															? `Voir la cause du rejet — envoyé par ${resolveTourActorLabel(tour.sandboxRejectedBy, orgActorLabelByUserId, sessionUser)}`
															: 'Voir la cause du rejet'
													}
												>
													<Badge
														variant="outline"
														className="cursor-pointer border-rose-300/50 bg-rose-50/90 text-[10px] font-semibold uppercase tracking-wide text-rose-800 transition-colors hover:bg-rose-100/90 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
													>
														Rejeté
													</Badge>
												</button>
											) : null}
											{meta.showTransferredBadgePreviousOwner ||
											meta.showTransferredBadgeNewOwner ? (
												<button
													type="button"
													onClick={() => setTourRejectionDetails(tour)}
													className="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50"
													title={
														tour.sandboxRejectedBy
															? `Voir le motif du transfert — envoyé par ${resolveTourActorLabel(tour.sandboxRejectedBy, orgActorLabelByUserId, sessionUser)}`
															: 'Voir le motif du transfert'
													}
												>
													<Badge
														variant="outline"
														className="cursor-pointer border-emerald-300/55 bg-emerald-50/90 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 transition-colors hover:bg-emerald-100/90 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-100 dark:hover:bg-emerald-500/20"
													>
														Transféré
													</Badge>
												</button>
											) : null}
											{meta.isDeveloperModerationReturned ? (
												<button
													type="button"
													onClick={() => setTourRejectionDetails(tour)}
													className="inline-flex rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
													title={
														tour.sandboxRejectedBy
															? `Voir le motif du renvoi — envoyé par ${resolveTourActorLabel(tour.sandboxRejectedBy, orgActorLabelByUserId, sessionUser)}`
															: 'Voir le motif du renvoi administrateur'
													}
												>
													<Badge
														variant="outline"
														className="cursor-pointer border-amber-300/50 bg-amber-50/90 text-[10px] font-semibold uppercase tracking-wide text-amber-900 transition-colors hover:bg-amber-100/90 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100 dark:hover:bg-amber-500/20"
													>
														Retour
													</Badge>
												</button>
											) : null}
											{meta.isApprovedSandbox ? (
												<Badge
													variant="outline"
													className="border-emerald-300/50 bg-emerald-50/90 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200"
												>
													Approuvé
												</Badge>
											) : null}
											{meta.isViewOnlyCard && isProductionTour ? (
												<Badge
													variant="outline"
													className="max-w-full truncate border-slate-300/55 bg-slate-100/90 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:border-white/15 dark:bg-slate-800/55 dark:text-slate-300"
												>
													Lecture seule
												</Badge>
											) : null}
										</div>
									</div>
									{meta.showProductionDelegatedBadge &&
									meta.productionManagerUserId &&
									productionManagerShortLabel ? (
										<div className="mt-2 flex pl-11">
											<Badge
												variant="outline"
												className="max-w-full truncate border-indigo-300/50 bg-indigo-50/90 text-[10px] font-semibold uppercase tracking-wide text-indigo-900 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-100"
												title={
													productionManagerFullLabel
														? `Gestion : ${productionManagerFullLabel}`
														: undefined
												}
											>
												Gestion : {productionManagerShortLabel}
											</Badge>
										</div>
									) : null}
									<p className="mt-2 min-h-[40px] line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
										{tour.description || <span className="italic text-slate-500 dark:text-slate-400">Aucune description fournie</span>}
									</p>
								</CardHeader>

								<CardContent className="relative mt-auto flex flex-col gap-4 pb-4 pt-2">
									{/* Informations complémentaires */}
									<div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-100/80 p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-slate-800/35">
										<div className="flex items-center justify-between text-sm">
											<div className="min-w-0 flex items-center gap-2 text-slate-700 dark:text-slate-300">
												<Icons.globe className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-500" />
												<span className="truncate max-w-[150px] md:max-w-[180px]" title={tour.targetUrl}>{tour.targetUrl || 'URL non définie'}</span>
											</div>
											{tour.priority !== undefined && (
												<div className="flex flex-wrap items-center justify-end gap-1">
													<span className="inline-flex h-5 items-center rounded-lg border border-amber-300/50 bg-amber-50 px-2 text-[10px] font-medium text-amber-900 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-200">
														Prio: {tour.priority}
													</span>
													{Number(tour.replayAfterDays || 0) > 0 && (
														<span className="inline-flex h-5 items-center rounded-lg border border-slate-200 bg-slate-100 px-2 text-[10px] font-medium text-slate-700 dark:border-white/15 dark:bg-slate-900/60 dark:text-slate-300">
															Replay: {Number(tour.replayAfterDays)}j
														</span>
													)}
													{tour.replayPolicy && (
														<span className="inline-flex h-5 items-center rounded-lg border border-slate-200 bg-slate-100 px-2 text-[10px] font-medium text-slate-700 dark:border-white/15 dark:bg-slate-900/60 dark:text-slate-300">
															Policy: {tour.replayPolicy}
														</span>
													)}
												</div>
											)}
										</div>
										
										<div className="h-px w-full bg-slate-200 dark:bg-white/10" />
										
										<div className="flex items-center justify-between">
											<button
												type="button"
												onClick={() => handleShowSteps(tour)}
												className="group/btn flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-orange-500 dark:text-slate-200 dark:hover:text-orange-300"
												title="Voir les étapes du parcours"
											>
												<div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 group-hover/btn:bg-primary group-hover/btn:text-white transition-colors shadow-sm">
													<Icons.list className="h-3 w-3" />
												</div>
												<span>{getTourStepCount(tour)} étape(s)</span>
											</button>

											<button
												onClick={() => handlePreview(tour)}
												className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
											>
												<Icons.play className="h-3.5 w-3.5" />
													Previsualiser
											</button>
										</div>
									</div>
									
									{meta.showDelegateProductionManagement ? (
										<div className="pt-1">
											<TourProductionManagementControl
												tour={tour}
												role={dashboardRole}
												userId={currentUserId}
												onUpdated={loadTours}
											/>
										</div>
									) : null}

									{showCollaborationPeerActions && tour.id ? (
									<div
										className={cn(
											'flex items-center gap-2 pt-1',
											isProductionTour && 'w-full',
										)}
									>
										{!isProductionTour ? (
											<Link
												href={getCollaborateEditHref(tour)}
												prefetch={false}
												className="min-w-0 flex-1"
												aria-disabled={!meta.canCollaborationPeerEdit}
											>
												<Button
													variant="outline"
													className="h-9 w-full border-slate-300 bg-white/90 text-sm text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white"
													disabled={!meta.canCollaborationPeerEdit}
													title={
														meta.canCollaborationPeerEdit
															? 'Éditer en collaboration sandbox'
															: 'Édition indisponible (parcours approuvé ou hors sandbox)'
													}
												>
													<Icons.edit className="mr-2 h-3.5 w-3.5" />
													Éditer
												</Button>
											</Link>
										) : null}
										<div
											className={cn(
												'flex items-center gap-1.5',
												isProductionTour ? 'w-full flex-1' : 'shrink-0',
											)}
										>
											<Button
												variant="outline"
												size={isProductionTour ? 'default' : 'icon'}
												className={cardIconActionClass(
													'hover:bg-slate-100 hover:text-orange-500 focus:ring-orange-400/20 dark:hover:bg-white/10 dark:hover:text-orange-300',
												)}
												onClick={() => handleExport(tour)}
												disabled={deletingIds.includes(tour.id || '')}
												title="Exporter le parcours (JSON)"
											>
												<Icons.download className="h-4 w-4" />
											</Button>
											{showSandboxTestToggle ? (
												<Button
													variant="outline"
													size={isProductionTour ? 'default' : 'icon'}
													className={cardIconActionClass(
														sandboxTestActive
															? 'text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300/70 focus:ring-cyan-500/20 dark:text-cyan-300 dark:hover:bg-cyan-500/15'
															: 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300/50 focus:ring-cyan-500/20 dark:text-slate-300 dark:hover:bg-cyan-500/10',
													)}
													onClick={() => handleToggleActive(tour, 'sandbox')}
													disabled={deletingIds.includes(tour.id || '')}
													title={
														sandboxTestActive
															? 'Désactiver le test sandbox'
															: 'Activer pour test sandbox'
													}
												>
													<Icons.sandbox className="h-4 w-4" />
												</Button>
											) : null}
										</div>
									</div>
									) : showViewOnlyActions && tour.id ? (
									<div className="flex w-full items-center gap-2 pt-1">
										{canExportTour(tour, dashboardRole, currentUserId) ? (
											<Button
												variant="outline"
												className={cardEqualFooterActionClass(
													'hover:bg-slate-100 hover:text-orange-500 focus:ring-orange-400/20 dark:hover:bg-white/10 dark:hover:text-orange-300',
												)}
												onClick={() => handleExport(tour)}
												disabled={deletingIds.includes(tour.id || '')}
												title="Exporter le parcours (JSON)"
											>
												<Icons.download className="h-4 w-4" />
											</Button>
										) : null}
										{showSandboxTestToggle ? (
											<Button
												variant="outline"
												className={cardEqualFooterActionClass(
													sandboxTestActive
														? 'text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300/70 focus:ring-cyan-500/20 dark:text-cyan-300 dark:hover:bg-cyan-500/15'
														: 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300/50 focus:ring-cyan-500/20 dark:text-slate-300 dark:hover:bg-cyan-500/10',
												)}
												onClick={() => handleToggleActive(tour, 'sandbox')}
												disabled={deletingIds.includes(tour.id || '')}
												title={
													sandboxTestActive
														? 'Désactiver le test sandbox'
														: 'Activer pour test sandbox (avant ou après approbation)'
												}
											>
												<Icons.sandbox className="h-4 w-4" />
											</Button>
										) : null}
									</div>
									) : isLabTemplateCard && tour.id ? (
									<div className="flex w-full items-center gap-2 pt-1">
										{meta.canLabTemplateExport ? (
											<Button
												variant="outline"
												className={cardEqualFooterActionClass(
													'hover:bg-slate-100 hover:text-orange-500 focus:ring-orange-400/20 dark:hover:bg-white/10 dark:hover:text-orange-300',
												)}
												onClick={() => handleExport(tour)}
												disabled={deletingIds.includes(tour.id || '')}
												title="Exporter le template (JSON)"
											>
												<Icons.download className="h-4 w-4" />
											</Button>
										) : null}
										{meta.canLabTemplateDelete ? (
											<Button
												variant="outline"
												className={cardEqualFooterActionClass(
													'hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300/70 focus:ring-rose-500/20 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 dark:hover:border-rose-400/30',
												)}
												onClick={() => setTourPendingDelete(tour)}
												disabled={deletingIds.includes(tour.id || '')}
												title="Supprimer ce template de test"
											>
												<Icons.trash className="h-4 w-4" />
											</Button>
										) : null}
									</div>
									) : canManageThisTour ? (
									<div className="flex flex-col gap-2 pt-1">
										{tour.id ? (
											<SandboxModerationButtons
												showApprove={showApproveButton}
												showReject={showRejectButton}
												onApprove={() => handleApproveSandbox(tour)}
												onReject={() => handleRejectSandbox(tour)}
												disabled={approvingIds.includes(tour.id) || rejectingIds.includes(tour.id)}
											/>
										) : null}
										{showApprovedModeration ? (
											<TourApprovedModerationControl
												tour={tour}
												role={dashboardRole}
												userId={currentUserId}
												creatorRoleByUserId={creatorRoleByUserId}
												onUpdated={loadTours}
											/>
										) : null}
									<div
										className={cn(
											'flex items-center gap-2',
											isProductionTour && 'w-full',
										)}
									>
										{canEditThisTour && tour.id ? (
											<Link
												href={`/dashboard/tours/create?id=${tour.id}`}
												prefetch={false}
												className="min-w-0 flex-1"
											>
												<Button
													variant="outline"
													className="h-9 w-full border-slate-300 bg-white/90 text-sm text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white"
												>
													<Icons.edit className="mr-2 h-3.5 w-3.5" />
													Éditer
												</Button>
											</Link>
										) : null}
										{canDuplicateThisTour && !isProductionTour ? (
											<Link href={getDuplicateHref(tour)}>
												<Button
													variant="outline"
													size="icon"
													className="h-9 w-9 border-slate-300 bg-white/90 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
													title="Dupliquer ce parcours dans un nouveau brouillon"
													aria-label="Dupliquer ce parcours"
												>
													<Icons.copy className="h-4 w-4" />
												</Button>
											</Link>
										) : null}

										<div
											className={cn(
												'flex items-center gap-1.5',
												isProductionTour ? 'w-full' : '',
											)}
										>
											{canDuplicateThisTour && isProductionTour ? (
												<Link
													href={getDuplicateHref(tour)}
													className="min-w-0 flex-1"
												>
													<Button
														variant="outline"
														className={cardIconActionClass(
															'w-full hover:bg-slate-100 hover:text-slate-900 focus:ring-orange-400/20 dark:hover:bg-white/10 dark:hover:text-white',
														)}
														title="Dupliquer ce parcours dans un nouveau brouillon"
														aria-label="Dupliquer ce parcours"
													>
														<Icons.copy className="h-4 w-4" />
													</Button>
												</Link>
											) : null}
											{canManageThisTour ? (
												<Button
													variant="outline"
													size={isProductionTour ? 'default' : 'icon'}
													className={cardIconActionClass(
														'hover:bg-slate-100 hover:text-orange-500 focus:ring-orange-400/20 dark:hover:bg-white/10 dark:hover:text-orange-300',
														isProductionTour && 'w-full',
													)}
													onClick={() => handleExport(tour)}
													disabled={deletingIds.includes(tour.id || '')}
													title="Exporter le parcours (JSON)"
												>
													<Icons.download className="h-4 w-4" />
												</Button>
											) : null}
											{showAudienceReset ? (
												<Button
													variant="outline"
													size={isProductionTour ? 'default' : 'icon'}
													className={cardIconActionClass(
														'hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-300/70 focus:ring-indigo-500/20 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 dark:hover:border-indigo-400/30',
														isProductionTour && 'w-full',
													)}
													onClick={() => openAudienceModal(tour)}
													disabled={deletingIds.includes(tour.id || '')}
													title="Réactivation audience"
												>
													<Icons.users className="h-4 w-4" />
												</Button>
											) : null}
											{showDeploymentActiveToggle ? (
												<Button
													variant="outline"
													size={isProductionTour ? 'default' : 'icon'}
													className={cardIconActionClass(
														meta.isSandbox
															? deploymentActive
																? 'text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300/70 focus:ring-cyan-500/20 dark:text-cyan-300 dark:hover:bg-cyan-500/15'
																: 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300/50 focus:ring-cyan-500/20 dark:text-slate-300 dark:hover:bg-cyan-500/10'
															: deploymentActive
																? 'text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300/70 focus:ring-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/15'
																: 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300/70 focus:ring-emerald-500/20 dark:text-slate-300 dark:hover:bg-emerald-500/10',
														isProductionTour && 'w-full',
													)}
													onClick={() =>
														handleToggleActive(tour, meta.isSandbox ? 'sandbox' : 'production')
													}
													disabled={deletingIds.includes(tour.id || '')}
													title={
														meta.isSandbox
															? deploymentActive
																? 'Désactiver le parcours en sandbox'
																: 'Activer le parcours en sandbox'
															: deploymentActive
																? 'Désactiver en production'
																: 'Activer pour les utilisateurs finaux (production)'
													}
												>
													{meta.isSandbox ? (
														<Icons.sandbox className="h-4 w-4" />
													) : (
														<Icons.refresh className="h-4 w-4" />
													)}
												</Button>
											) : null}
											{!showDeploymentActiveToggle && showSandboxTestToggle ? (
												<Button
													variant="outline"
													size={isProductionTour ? 'default' : 'icon'}
													className={cardIconActionClass(
														sandboxTestActive
															? 'text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300/70 focus:ring-cyan-500/20 dark:text-cyan-300 dark:hover:bg-cyan-500/15'
															: 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-300/50 focus:ring-cyan-500/20 dark:text-slate-300 dark:hover:bg-cyan-500/10',
													)}
													onClick={() => handleToggleActive(tour, 'sandbox')}
													disabled={deletingIds.includes(tour.id || '')}
													title={
														sandboxTestActive
															? 'Désactiver le test sandbox'
															: 'Activer pour test sandbox (avant ou après approbation)'
													}
												>
													<Icons.sandbox className="h-4 w-4" />
												</Button>
											) : null}
											{!showDeploymentActiveToggle && showProductionToggle ? (
												<Button
													variant="outline"
													size={isProductionTour ? 'default' : 'icon'}
													className={cardIconActionClass(
														productionActive
															? 'text-slate-600 hover:bg-amber-100 hover:text-amber-700 hover:border-amber-300/70 focus:ring-amber-500/20 dark:text-slate-300 dark:hover:bg-amber-500/15 dark:hover:text-amber-300 dark:hover:border-amber-400/30'
															: 'text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300/70 focus:ring-emerald-500/20 dark:text-slate-300 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300 dark:hover:border-emerald-400/30',
													)}
													onClick={() => handleToggleActive(tour, 'production')}
													disabled={deletingIds.includes(tour.id || '')}
													title={
														productionActive
															? 'Désactiver en production'
															: 'Activer pour les utilisateurs finaux (production)'
													}
												>
													<Icons.refresh className="h-4 w-4" />
												</Button>
											) : null}
											{canDeleteProductionSafe ? (
												<Button
													variant="outline"
													size="icon"
													className="h-9 w-9 border-slate-300 bg-white/90 text-slate-600 transition-colors hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300/70 focus:ring-2 focus:ring-rose-500/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:bg-rose-500/15 dark:hover:text-rose-300 dark:hover:border-rose-400/30"
													onClick={() => setTourPendingDelete(tour)}
													disabled={deletingIds.includes(tour.id || '')}
													title="Supprimer"
												>
													<Icons.trash className="h-4 w-4" />
												</Button>
											) : null}
										</div>
									</div>
									</div>
									) : tour.id && !showDeveloperAwaitingActions ? (
									<div className="flex flex-col gap-2 pt-1">
										<SandboxModerationButtons
											showApprove={showApproveButton}
											showReject={showRejectButton}
											onApprove={() => handleApproveSandbox(tour)}
											onReject={() => handleRejectSandbox(tour)}
											disabled={approvingIds.includes(tour.id) || rejectingIds.includes(tour.id)}
										/>
										{showApprovedModeration ? (
											<TourApprovedModerationControl
												tour={tour}
												role={dashboardRole}
												userId={currentUserId}
												creatorRoleByUserId={creatorRoleByUserId}
												onUpdated={loadTours}
											/>
										) : null}
									</div>
									) : null}
								</CardContent>
							</article>
							);

							if (!hasStableId) {
								return <div key={tour.name}>{cardNode}</div>;
							}

							if (canUseAdvancedTourTools) {
								return (
									<DraggableTourCard
										key={tour.id}
										tourId={tour.id as string}
										disabled={
											showViewOnlyActions ||
											showCollaborationPeerActions ||
											isLabTemplateCard
										}
									>
										{cardNode}
									</DraggableTourCard>
								);
							}

							return <div key={tour.id}>{cardNode}</div>;
						})}
							</div>
						</div>
						{filteredTourEntries.length > TOURS_PAGE_SIZE ? (
							<div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-slate-900/40">
								<p className="text-sm text-slate-600 dark:text-slate-400">
									{filteredTourEntries.length} parcours au total — {TOURS_PAGE_SIZE} par page
								</p>
								<div className="flex flex-wrap items-center gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={safeToursListPage <= 1}
										onClick={() => setToursListPage((prev) => Math.max(1, prev - 1))}
										className="gap-1 rounded-lg"
									>
										<Icons.chevronLeft className="h-4 w-4" />
										Précédent
									</Button>
									<span className="min-w-[7rem] text-center text-sm font-medium text-slate-800 dark:text-slate-200">
										Page {safeToursListPage} / {toursTotalPages}
									</span>
									<Button
										variant="outline"
										size="sm"
										disabled={safeToursListPage >= toursTotalPages}
										onClick={() => setToursListPage((prev) => Math.min(toursTotalPages, prev + 1))}
										className="gap-1 rounded-lg"
									>
										Suivant
										<Icons.chevronRight className="h-4 w-4" />
									</Button>
								</div>
							</div>
						) : null}
					</div>
				)}
			</div>
	);

	return (
		<>
			{canUseAdvancedTourTools ? (
				<DndContext
					sensors={sensors}
					collisionDetection={pointerWithin}
					onDragStart={() => {
						if (typeof document !== 'undefined') {
							document.body.style.userSelect = 'none';
						}
					}}
					onDragCancel={restorePageSelection}
					onDragOver={(event) => {
						setIsConcatDropOver(Boolean(event.over && String(event.over.id) === CONCAT_DROP_ZONE_ID));
					}}
					onDragEnd={handleDragEnd}
				>
					{mainColumn}
				</DndContext>
			) : (
				mainColumn
			)}

			{previewTour && (
				<div className="fixed inset-0 z-[120] bg-black/70 p-3 md:p-8">
					<div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 md:p-4">
						<div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
							<div>
								<h2 className="text-lg font-semibold text-slate-900 dark:text-white">Previsualisation: {previewTour.name}</h2>
								<p className="text-xs text-slate-500 dark:text-slate-400">
									{isPreviewLoading ? 'Chargement des étapes…' : `${getTourStepCount(previewTour)} etape(s)`}
								</p>
							</div>
							<Button variant="ghost" size="icon" onClick={closePreview}>
								<Icons.close className="h-4 w-4" />
							</Button>
						</div>
						<div className="min-h-0 flex-1">
							{isPreviewLoading ? (
								<div className="flex h-full min-h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/80 dark:border-white/15 dark:bg-slate-900/40">
									<div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
										<Icons.spinner className="h-4 w-4 animate-spin" />
										Chargement du parcours…
									</div>
								</div>
							) : (
							<TourPreviewSimulator
								key={previewTour.id || `${previewTour.name}-${previewTour.updatedAt || ''}`}
								steps={previewTour.steps || []}
								simulationContext={previewTour.simulationContext}
								tourName={previewTour.name}
								targetUrl={previewTour.targetUrl}
								initialIsPlaying={previewShouldAutoPlay}
								onPlayStateChange={(isPlaying) => {
									setPreviewShouldAutoPlay(isPlaying);
									persistPreviewTour(previewTour, isPlaying);
								}}
								onExitPreview={closePreview}
							/>
							)}
						</div>
					</div>
				</div>
			)}

			{stepsTour && (
				<div className="fixed inset-0 z-[121] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6 md:p-12 transition-all">
					<div className="mx-auto flex h-full max-h-[800px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-slate-950/90">
						{/* Header */}
						<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-slate-900/40">
							<div className="flex items-center gap-4">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
									<Icons.tours className="h-5 w-5 text-primary" />
								</div>
								<div>
									<h2 className="line-clamp-1 text-xl font-bold text-slate-900 dark:text-white">{stepsTour.name || 'Parcours'}</h2>
									<p className="text-sm text-slate-600 dark:text-slate-400">
										{isStepsLoading ? 'Chargement des étapes…' : `${getTourStepCount(stepsTour)} étape(s) dans ce parcours`}
									</p>
								</div>
							</div>
							<Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 shrink-0" onClick={() => setStepsTour(null)}>
								<Icons.close className="h-5 w-5" />
							</Button>
						</div>
						
						{/* Content */}
						<div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6 dark:bg-slate-950/35">
							{(stepsTour.steps || []).length === 0 ? (
								<div className="flex h-full flex-col items-center justify-center text-slate-400">
									<Icons.layers className="mb-3 h-12 w-12 opacity-20" />
									<p>Ce parcours ne contient aucune étape.</p>
								</div>
							) : (
								<div className="relative mx-auto max-w-2xl">
									{/* Ligne verticale timeline */}
									<div className="absolute bottom-0 left-[27px] top-0 hidden w-px bg-slate-300 sm:block dark:bg-white/20" />
									
									<div className="space-y-6">
										{(stepsTour.steps || []).map((step, idx) => {
											const resolvedStepType = step.stepType ?? (step.highlightElement ? 'highlight' : 'tooltip');
											const StepTypeIcon = getIconForStepType(resolvedStepType);

											return (
											<div key={step.id || `${step.title}-${idx}`} className="relative flex flex-col sm:flex-row gap-4 sm:gap-6">
												{/* Indicateur timeline */}
												<div className="relative z-10 hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white font-bold text-slate-700 shadow-sm sm:flex dark:border-white/20 dark:bg-slate-900 dark:text-slate-200">
													{idx + 1}
												</div>
												<div className="z-10 mb-[-10px] flex items-center gap-2 sm:hidden">
													<Badge className="bg-slate-800 text-white rounded-full h-6 w-6 flex items-center justify-center p-0">
														{idx + 1}
													</Badge>
													<span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Étape {idx + 1}</span>
												</div>
												
												{/* Carte d'étape */}
												<div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] transition-all hover:border-orange-400/30 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70 dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.2)]">
													<div className="mb-3 flex flex-wrap items-start justify-between gap-4">
														<div className="flex-1 min-w-[200px]">
															<h3 className="text-base font-semibold text-slate-900 dark:text-white">{step.title || 'Étape sans titre'}</h3>
															{step.targetSelector && (
																<div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400">
																	<Icons.target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
																	<span className="break-all rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 dark:border-white/10 dark:bg-slate-800">
																		{step.targetSelector}
																	</span>
																</div>
															)}

														</div>
														<div className="flex flex-col items-end gap-2 shrink-0">
															<Badge variant={resolvedStepType === 'highlight' ? 'secondary' : 'outline'} className="text-[10px] font-medium capitalize flex items-center gap-1.5">
																<StepTypeIcon className="h-3 w-3" />
																{resolvedStepType}
															</Badge>
															<Badge variant="outline" className="bg-slate-100 text-[10px] font-medium uppercase tracking-wider text-slate-700 dark:bg-slate-900/65 dark:text-slate-300">
																{step.position?.replace('_', ' ') || 'BOTTOM'}
															</Badge>
															{stepsTour &&
															!isSdkLabTemplateTour(stepsTour) &&
															canManageTour(stepsTour, dashboardRole, currentUserId) ? (
																<Link href={`/dashboard/tours/create?id=${stepsTour.id}&step=${idx}`} prefetch={false}>
																	<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-100 hover:text-orange-700 dark:text-orange-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-200">
																		<Icons.edit className="mr-1.5 h-3 w-3" />
																		Modifier
																	</Button>
																</Link>
															) : null}
														</div>
													</div>
													
													<div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-slate-800/45">
														<p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
															{step.content || <span className="italic text-slate-500 dark:text-slate-400">Aucun contenu défini pour cette étape.</span>}
														</p>
													</div>
													
													{/* Action footer */}
													<div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
														<Icons.mousePointer className="h-3.5 w-3.5" />
														Action de déclenchement : <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">{step.action || 'NEXT'}</span>
													</div>
												</div>
											</div>
										);
									})}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
			{audienceTour && (
				<div className="fixed inset-0 z-[122] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm sm:p-6 md:p-12 transition-all">
					<div className="mx-auto flex h-full max-h-[720px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95)_55%,rgba(241,245,249,0.95))] shadow-[0_22px_50px_rgba(2,6,23,0.2)] backdrop-blur-xl dark:border-white/12 dark:bg-[linear-gradient(165deg,rgba(15,23,42,0.94),rgba(15,23,42,0.82)_55%,rgba(2,6,23,0.94))] dark:shadow-[0_22px_50px_rgba(2,6,23,0.55)]">
						<div className="flex items-center justify-between border-b border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(241,245,249,0.4))] px-6 py-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.32),rgba(15,23,42,0.12))]">
							<div className="flex items-center gap-4">
								<div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-400/35 bg-orange-500/12 shadow-[0_0_24px_rgba(249,115,22,0.2)]">
									<Icons.users className="h-5 w-5 text-orange-600 dark:text-orange-300" />
								</div>
								<div>
									<h2 className="line-clamp-1 text-xl font-bold text-slate-900 dark:text-white">Réactivation audience</h2>
									<p className="text-sm text-slate-600 dark:text-slate-300">{audienceTour.name}</p>
								</div>
							</div>
							<Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-900 shrink-0 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white" onClick={closeAudienceModal} disabled={isApplyingAudienceAction}>
								<Icons.close className="h-5 w-5" />
							</Button>
						</div>
						<div className="flex-1 overflow-y-auto bg-transparent p-4 sm:p-6">
							<div className="mx-auto max-w-2xl space-y-5">
								<div className="rounded-xl border border-slate-200 bg-[linear-gradient(170deg,rgba(255,255,255,0.9),rgba(248,250,252,0.8))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-white/10 dark:bg-[linear-gradient(170deg,rgba(15,23,42,0.7),rgba(2,6,23,0.72))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
									<p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Type d’action</p>
									<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
										<button type="button" className={`rounded-lg border px-3 py-2 text-sm transition-all ${audienceMode === 'all' ? 'border-orange-300/65 bg-[linear-gradient(135deg,rgba(249,115,22,0.28),rgba(236,72,153,0.22))] text-orange-900 shadow-[0_0_20px_rgba(249,115,22,0.2)] dark:text-orange-50 dark:shadow-[0_0_20px_rgba(249,115,22,0.28)]' : 'border-slate-200 bg-white text-slate-700 hover:bg-orange-50/60 hover:border-orange-400/30 hover:text-orange-700 dark:border-white/12 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.07] dark:hover:text-orange-200'}`} onClick={() => setAudienceMode('all')}>
											Réactiver pour tous
										</button>
										<button type="button" className={`rounded-lg border px-3 py-2 text-sm transition-all ${audienceMode === 'user' ? 'border-orange-300/65 bg-[linear-gradient(135deg,rgba(249,115,22,0.28),rgba(236,72,153,0.22))] text-orange-900 shadow-[0_0_20px_rgba(249,115,22,0.2)] dark:text-orange-50 dark:shadow-[0_0_20px_rgba(249,115,22,0.28)]' : 'border-slate-200 bg-white text-slate-700 hover:bg-orange-50/60 hover:border-orange-400/30 hover:text-orange-700 dark:border-white/12 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.07] dark:hover:text-orange-200'}`} onClick={() => setAudienceMode('user')}>
											Réactiver un utilisateur
										</button>
										<button type="button" className={`rounded-lg border px-3 py-2 text-sm transition-all ${audienceMode === 'segment' ? 'border-orange-300/65 bg-[linear-gradient(135deg,rgba(249,115,22,0.28),rgba(236,72,153,0.22))] text-orange-900 shadow-[0_0_20px_rgba(249,115,22,0.2)] dark:text-orange-50 dark:shadow-[0_0_20px_rgba(249,115,22,0.28)]' : 'border-slate-200 bg-white text-slate-700 hover:bg-orange-50/60 hover:border-orange-400/30 hover:text-orange-700 dark:border-white/12 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.07] dark:hover:text-orange-200'}`} onClick={() => setAudienceMode('segment')}>
											Réactiver un segment
										</button>
									</div>
								</div>
								{audienceMode === 'all' && (
									<div className="rounded-xl border border-slate-200 bg-[linear-gradient(170deg,rgba(255,255,255,0.9),rgba(248,250,252,0.8))] p-4 dark:border-white/10 dark:bg-[linear-gradient(170deg,rgba(15,23,42,0.7),rgba(2,6,23,0.72))]">
										<p className="text-sm text-slate-700 dark:text-slate-200">
											Cette action réactive ce parcours pour tous les utilisateurs qui l’avaient déjà terminé ou dismiss.
										</p>
									</div>
								)}
								{audienceMode === 'user' && (
									<div className="rounded-xl border border-slate-200 bg-[linear-gradient(170deg,rgba(255,255,255,0.9),rgba(248,250,252,0.8))] p-4 dark:border-white/10 dark:bg-[linear-gradient(170deg,rgba(15,23,42,0.7),rgba(2,6,23,0.72))]">
										<label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">Rechercher un utilisateur (email/nom)</label>
										<input
											value={audienceUserQuery}
											onChange={(e) => setAudienceUserQuery(e.target.value)}
											placeholder="ex: user@mail.com ou prénom nom"
											className="h-9 w-full rounded-lg border border-slate-300 bg-white/90 px-3 text-sm text-slate-800 placeholder:text-slate-500 outline-none transition-colors hover:border-orange-400/40 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:placeholder:text-slate-400/80"
										/>
										<div className="mt-3 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white/75 dark:border-white/10 dark:bg-slate-950/35">
											{isAudienceUsersLoading ? (
												<div className="p-3 text-sm text-slate-500 dark:text-slate-400">Chargement des utilisateurs...</div>
											) : filteredAudienceUsers.length === 0 ? (
												<div className="p-3 text-sm text-slate-500 dark:text-slate-400">Aucun utilisateur trouvé.</div>
											) : (
												filteredAudienceUsers.map((user) => {
													const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
													const isSelected = selectedAudienceUserId === user.id;
													return (
														<button
															key={user.id}
															type="button"
															onClick={() => setSelectedAudienceUserId(user.id)}
															className={`flex w-full items-center justify-between border-b border-slate-200 px-3 py-2 text-left text-sm transition-colors last:border-b-0 dark:border-white/10 ${
																isSelected
																	? 'bg-[linear-gradient(135deg,rgba(249,115,22,0.24),rgba(236,72,153,0.18))] text-orange-900 dark:text-orange-100'
																	: 'bg-transparent text-slate-700 hover:bg-orange-50/70 dark:text-slate-200 dark:hover:bg-white/[0.06]'
															}`}
														>
															<div className="min-w-0">
																<p className="truncate font-medium">{fullName || 'Utilisateur sans nom'}</p>
																<p className="truncate text-xs opacity-80">{user.email}</p>
															</div>
															{isSelected ? <Icons.check className="h-4 w-4 shrink-0" /> : null}
														</button>
													);
												})
											)}
										</div>
										{selectedAudienceUserId ? (
											<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Utilisateur sélectionné: {selectedAudienceUserId}</p>
										) : null}
									</div>
								)}
								{audienceMode === 'segment' && (
									<div className="rounded-xl border border-slate-200 bg-[linear-gradient(170deg,rgba(255,255,255,0.9),rgba(248,250,252,0.8))] p-4 space-y-4 dark:border-white/10 dark:bg-[linear-gradient(170deg,rgba(15,23,42,0.7),rgba(2,6,23,0.72))]">
										<div>
											<label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">Segment</label>
											<Select
												value={segmentType}
												onValueChange={(value) => setSegmentType(value as 'all' | 'new_users' | 'inactive_users' | 'custom_user_ids')}
											>
											<SelectTrigger className="h-9 w-full rounded-lg border-slate-300 bg-white/90 text-slate-800 transition-colors hover:border-orange-400/40 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100">
													<SelectValue placeholder="Segment" />
												</SelectTrigger>
												<SelectContent
													alignItemWithTrigger={false}
													side="bottom"
													sideOffset={8}
													className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]"
												>
													<SelectItem value="all" className="focus:bg-orange-500/20 focus:text-orange-100">all</SelectItem>
													<SelectItem value="new_users" className="focus:bg-orange-500/20 focus:text-orange-100">new_users</SelectItem>
													<SelectItem value="inactive_users" className="focus:bg-orange-500/20 focus:text-orange-100">inactive_users</SelectItem>
													<SelectItem value="custom_user_ids" className="focus:bg-orange-500/20 focus:text-orange-100">custom_user_ids</SelectItem>
												</SelectContent>
											</Select>
										</div>
										{segmentType === 'new_users' && (
											<div>
												<label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">createdWithinDays</label>
												<input type="number" min={1} value={segmentCreatedWithinDays} onChange={(e) => setSegmentCreatedWithinDays(Number(e.target.value || '14'))} className="h-9 w-full rounded-lg border border-slate-300 bg-white/90 px-3 text-sm text-slate-800 placeholder:text-slate-500 outline-none transition-colors hover:border-orange-400/40 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:placeholder:text-slate-400/80" />
											</div>
										)}
										{segmentType === 'inactive_users' && (
											<div>
												<label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">inactiveDays</label>
												<input type="number" min={1} value={segmentInactiveDays} onChange={(e) => setSegmentInactiveDays(Number(e.target.value || '60'))} className="h-9 w-full rounded-lg border border-slate-300 bg-white/90 px-3 text-sm text-slate-800 placeholder:text-slate-500 outline-none transition-colors hover:border-orange-400/40 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:placeholder:text-slate-400/80" />
											</div>
										)}
										{segmentType === 'custom_user_ids' && (
											<div>
												<label className="mb-2 block text-sm font-medium text-slate-800 dark:text-slate-100">Liste UUID (séparés par virgule)</label>
												<textarea value={segmentUserIdsRaw} onChange={(e) => setSegmentUserIdsRaw(e.target.value)} rows={4} className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 outline-none transition-colors hover:border-orange-400/40 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:placeholder:text-slate-400/80" />
											</div>
										)}
									</div>
								)}
							</div>
						</div>
						<div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.75),rgba(241,245,249,0.45))] px-6 py-4 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.14),rgba(2,6,23,0.3))]">
							<Button variant="outline" className="border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white" onClick={closeAudienceModal} disabled={isApplyingAudienceAction}>Annuler</Button>
							<Button className="bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-[0_0_24px_rgba(255,107,0,0.25)] transition-transform hover:scale-105 hover:from-orange-400 hover:to-pink-500 active:scale-[0.99]" onClick={applyAudienceAction} disabled={isApplyingAudienceAction || (audienceMode === 'user' && !selectedAudienceUserId)}>
								{isApplyingAudienceAction ? 'Application...' : 'Appliquer'}
							</Button>
						</div>
					</div>
				</div>
			)}

			{tourPendingEnvTransfer ? (
				<div className="fixed inset-0 z-[159] flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/55 backdrop-blur-sm"
						onClick={() => {
							if (transferringEnvIds.includes(tourPendingEnvTransfer.tour.id || '')) return;
							setTourPendingEnvTransfer(null);
						}}
					/>
					<div className="relative z-10 w-full max-w-md rounded-2xl border border-orange-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95)_58%,rgba(241,245,249,0.96))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.18)] dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(10,16,28,0.94)_58%,rgba(5,10,20,0.98))] dark:shadow-[0_18px_45px_rgba(2,6,23,0.62)]">
						<div className="mb-4 flex items-start gap-3">
							<div className="mt-0.5 rounded-xl border border-orange-400/35 bg-orange-500/15 p-2">
								{tourPendingEnvTransfer.target === 'production' ? (
									<Icons.globe className="h-4 w-4 text-orange-400" />
								) : (
									<Icons.sandbox className="h-4 w-4 text-orange-400" />
								)}
							</div>
							<div>
								<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
									{tourPendingEnvTransfer.target === 'production'
										? 'Passer en production ?'
										: 'Repasser en sandbox ?'}
								</h3>
								<p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
									{tourPendingEnvTransfer.target === 'production' ? (
										<>
											<strong>{tourPendingEnvTransfer.tour.name || 'Ce parcours'}</strong> sera publiable pour les
											utilisateurs finaux. L&apos;activation production reste désactivée par défaut : activez-la
											ensuite depuis la carte si vous souhaitez le rendre visible. Le test sandbox reste possible
											séparément.
										</>
									) : (
										<>
											<strong>{tourPendingEnvTransfer.tour.name || 'Ce parcours'}</strong> ne sera plus publiable en
											production. L&apos;activation prod sera coupée ; vous pourrez le retester en sandbox avant une
											nouvelle promotion.
										</>
									)}
								</p>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								className="border-slate-300 bg-white/90 text-slate-700 hover:bg-white dark:border-white/20 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
								onClick={() => setTourPendingEnvTransfer(null)}
								disabled={transferringEnvIds.includes(tourPendingEnvTransfer.tour.id || '')}
							>
								Annuler
							</Button>
							<Button
								className="bg-gradient-to-r from-orange-500 to-pink-600 text-white"
								disabled={transferringEnvIds.includes(tourPendingEnvTransfer.tour.id || '')}
								onClick={() =>
									void executeAdminEnvironmentTransfer(
										tourPendingEnvTransfer.tour,
										tourPendingEnvTransfer.target,
									)
								}
							>
								Confirmer
							</Button>
						</div>
					</div>
				</div>
			) : null}

			{tourPendingDelete ? (
				<div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/55 backdrop-blur-sm"
						onClick={() => setTourPendingDelete(null)}
					/>
					<div className="relative z-10 w-full max-w-md rounded-2xl border border-orange-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95)_58%,rgba(241,245,249,0.96))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.18)] dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(10,16,28,0.94)_58%,rgba(5,10,20,0.98))] dark:shadow-[0_18px_45px_rgba(2,6,23,0.62)]">
						<div className="mb-4 flex items-start gap-3">
							<div className="mt-0.5 rounded-xl border border-amber-400/35 bg-amber-500/15 p-2">
								<Icons.warning className="h-4 w-4 text-amber-300" />
							</div>
							<div>
								<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Supprimer ce parcours ?</h3>
								<p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
									Cette action est irréversible.
								</p>
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
									Parcours: {tourPendingDelete.name || 'Sans nom'}
								</p>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								variant="outline"
								className="border-slate-300 bg-white/90 text-slate-700 hover:bg-white dark:border-white/20 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
								onClick={() => setTourPendingDelete(null)}
							>
								Annuler
							</Button>
							<button
								type="button"
								onClick={handleConfirmDeleteTour}
								disabled={deletingIds.includes(tourPendingDelete.id || '')}
								className="inline-flex h-9 items-center rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 text-sm font-medium text-rose-700 transition-transform hover:scale-105 hover:bg-rose-500/28 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-400/35 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/30"
							>
								Supprimer
							</button>
						</div>
					</div>
				</div>
			) : null}

			{tourPendingReject ? (
				<div className="fixed inset-0 z-[161] flex items-center justify-center p-4">
					<div
						className="absolute inset-0 bg-black/55 backdrop-blur-sm"
						onClick={() => {
							if (rejectingIds.includes(tourPendingReject.id || '')) return;
							setTourPendingReject(null);
							setRejectReasonInput('');
						}}
					/>
					<div className="relative z-10 w-full max-w-lg rounded-2xl border border-rose-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95)_58%,rgba(241,245,249,0.96))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.18)] dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(10,16,28,0.94)_58%,rgba(5,10,20,0.98))] dark:shadow-[0_18px_45px_rgba(2,6,23,0.62)]">
						<div className="mb-4 flex items-start gap-3">
							<div className="mt-0.5 rounded-xl border border-rose-400/35 bg-rose-500/15 p-2">
								<Icons.close className="h-4 w-4 text-rose-400" />
							</div>
							<div className="min-w-0 flex-1">
								<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Rejeter ce parcours sandbox</h3>
								<p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
									Indiquez la cause du rejet pour que le développeur puisse corriger le parcours.
								</p>
								<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
									Parcours : {tourPendingReject.name || 'Sans nom'}
								</p>
							</div>
						</div>
						<div className="mb-4 space-y-1.5">
							<Label htmlFor="reject-reason" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
								Cause du rejet
							</Label>
							<textarea
								id="reject-reason"
								value={rejectReasonInput}
								onChange={(e) => setRejectReasonInput(e.target.value)}
								rows={5}
								maxLength={2000}
								placeholder="Ex. : Les sélecteurs des étapes 2 et 3 sont invalides sur /dashboard. Corrigez les targetSelector avant resoumission."
								className="w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 outline-none transition-colors focus:border-rose-400/60 focus:ring-2 focus:ring-rose-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:placeholder:text-slate-400/80"
							/>
							<p className="text-xs text-slate-500 dark:text-slate-400">
								Minimum 10 caractères · {rejectReasonInput.trim().length}/2000
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="outline"
								className={cn(
									PHOENIX_CARD_BTN_BASE,
									'border-slate-300/55 bg-white/90 text-slate-700 hover:border-slate-400/65 hover:bg-slate-50/95 hover:text-slate-900 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white',
								)}
								onClick={() => {
									setTourPendingReject(null);
									setRejectReasonInput('');
								}}
								disabled={rejectingIds.includes(tourPendingReject.id || '')}
							>
								Annuler
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={handleConfirmRejectSandbox}
								disabled={
									rejectingIds.includes(tourPendingReject.id || '') ||
									rejectReasonInput.trim().length < 10
								}
								className={cn(
									PHOENIX_CARD_BTN_BASE,
									'border-rose-300/55 bg-white/90 text-rose-800 hover:border-rose-400/65 hover:bg-rose-50/95 hover:text-rose-900 hover:shadow-[0_0_20px_rgba(244,63,94,0.12)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-400/35 dark:text-rose-200 dark:hover:bg-rose-500/12 dark:hover:text-rose-100',
								)}
							>
								<Icons.close className="h-3.5 w-3.5 shrink-0" />
								{rejectingIds.includes(tourPendingReject.id || '') ? 'Rejet...' : 'Confirmer le rejet'}
							</Button>
						</div>
					</div>
				</div>
			) : null}

			{tourShareMessageDetails ? (
				<div className="fixed inset-0 z-[162] flex items-center justify-center p-4">
					<button
						type="button"
						className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
						aria-label="Fermer"
						onClick={() => setTourShareMessageDetails(null)}
					/>
					<div
						role="dialog"
						aria-modal="true"
						className={cn(
							'relative z-[1] w-full max-w-lg rounded-2xl border p-6 shadow-2xl',
							tourShareMessageDetails.mode === 'view'
								? 'border-sky-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(240,249,255,0.95)_58%,rgba(248,250,252,0.96))] dark:border-sky-400/25 dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(12,28,48,0.94)_58%,rgba(5,10,20,0.98))]'
								: 'border-emerald-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(236,253,245,0.95)_58%,rgba(248,250,252,0.96))] dark:border-emerald-400/25 dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(12,40,32,0.94)_58%,rgba(5,10,20,0.98))]',
						)}
					>
						<div className="mb-4 flex items-start justify-between gap-3">
							<div className="flex items-start gap-3">
								<div
									className={cn(
										'mt-0.5 rounded-xl border p-2',
										tourShareMessageDetails.mode === 'view'
											? 'border-sky-400/35 bg-sky-500/15'
											: 'border-emerald-400/35 bg-emerald-500/15',
									)}
								>
									<Icons.messageSquare
										className={cn(
											'h-4 w-4',
											tourShareMessageDetails.mode === 'view'
												? 'text-sky-500'
												: 'text-emerald-500',
										)}
									/>
								</div>
								<div>
									<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
										{tourShareMessageDetails.mode === 'view'
											? 'Message du développeur — lecture seule'
											: 'Message du développeur — collaboration'}
									</h3>
									<p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
										{tourShareMessageDetails.tour.name || 'Sans nom'}
									</p>
									{getDeveloperShareMessageAt(
										tourShareMessageDetails.tour,
										tourShareMessageDetails.mode,
									) ? (
										<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
											Partagé le{' '}
											{formatCreatedAt(
												getDeveloperShareMessageAt(
													tourShareMessageDetails.tour,
													tourShareMessageDetails.mode,
												)!,
											)}
										</p>
									) : null}
									{tourShareMessageDetails.tour.createdBy ? (
										<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
											Envoyé par{' '}
											{resolveTourActorLabel(
												tourShareMessageDetails.tour.createdBy,
												orgActorLabelByUserId,
												sessionUser,
											)}
										</p>
									) : null}
								</div>
							</div>
							<Button variant="ghost" size="icon" onClick={() => setTourShareMessageDetails(null)}>
								<Icons.close className="h-4 w-4" />
							</Button>
						</div>
						<div
							className={cn(
								'mb-4 rounded-xl border p-4',
								tourShareMessageDetails.mode === 'view'
									? 'border-sky-200/60 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-500/10'
									: 'border-emerald-200/60 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-500/10',
							)}
						>
							<p
								className={cn(
									'text-xs font-semibold uppercase tracking-wider',
									tourShareMessageDetails.mode === 'view'
										? 'text-sky-900 dark:text-sky-200'
										: 'text-emerald-900 dark:text-emerald-200',
								)}
							>
								{tourShareMessageDetails.mode === 'view'
									? 'Contexte du partage lecture'
									: 'Contexte de la collaboration'}
							</p>
							<p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
								{getDeveloperShareMessage(
									tourShareMessageDetails.tour,
									tourShareMessageDetails.mode,
								) || 'Aucun message enregistré pour ce partage.'}
							</p>
						</div>
					</div>
				</div>
			) : null}

			{tourSubmissionDetails ? (
				<div className="fixed inset-0 z-[162] flex items-center justify-center p-4">
					<button
						type="button"
						className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
						aria-label="Fermer"
						onClick={() => setTourSubmissionDetails(null)}
					/>
					<div
						role="dialog"
						aria-modal="true"
						className="relative z-[1] w-full max-w-lg rounded-2xl border border-sky-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(240,249,255,0.95)_58%,rgba(248,250,252,0.96))] p-6 shadow-2xl dark:border-sky-400/25 dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(12,28,48,0.94)_58%,rgba(5,10,20,0.98))]"
					>
						<div className="mb-4 flex items-start justify-between gap-3">
							<div className="flex items-start gap-3">
								<div className="mt-0.5 rounded-xl border border-sky-400/35 bg-sky-500/15 p-2">
									<Icons.messageSquare className="h-4 w-4 text-sky-500" />
								</div>
								<div>
									<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
										Message du développeur
									</h3>
									<p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
										{tourSubmissionDetails.name || 'Sans nom'}
									</p>
									{tourSubmissionDetails.assignedToAdminsAt ? (
										<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
											Envoyé le {formatCreatedAt(tourSubmissionDetails.assignedToAdminsAt)}
										</p>
									) : null}
									{tourSubmissionDetails.createdBy ? (
										<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
											Envoyé par{' '}
											{resolveTourActorLabel(
												tourSubmissionDetails.createdBy,
												orgActorLabelByUserId,
												sessionUser,
											)}
										</p>
									) : null}
								</div>
							</div>
							<Button variant="ghost" size="icon" onClick={() => setTourSubmissionDetails(null)}>
								<Icons.close className="h-4 w-4" />
							</Button>
						</div>
						<div className="mb-4 rounded-xl border border-sky-200/60 bg-sky-50/70 p-4 dark:border-sky-400/20 dark:bg-sky-500/10">
							<p className="text-xs font-semibold uppercase tracking-wider text-sky-900 dark:text-sky-200">
								Contexte de soumission
							</p>
							<p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
								{tourSubmissionDetails.developerSubmissionMessage?.trim() ||
									'Aucun message enregistré pour cette soumission.'}
							</p>
						</div>
					</div>
				</div>
			) : null}

			{tourRejectionDetails ? (
				<div className="fixed inset-0 z-[162] flex items-center justify-center p-4">
					{(() => {
						const isTransferDetails = isOwnershipTransferReturn(tourRejectionDetails);
						const transferMessage = getOwnershipTransferMessage(tourRejectionDetails);
						const isReturned = tourRejectionDetails.sandboxStatus === 'returned';
						const isPreviousOwnerViewing =
							Boolean(currentUserId) &&
							tourRejectionDetails.createdBy !== currentUserId &&
							isTransferDetails;
						const sentByLabel = resolveTourActorLabel(
							tourRejectionDetails.sandboxRejectedBy,
							orgActorLabelByUserId,
							sessionUser,
						);
						return (
							<>
					<div
						className="absolute inset-0 bg-black/55 backdrop-blur-sm"
						onClick={() => setTourRejectionDetails(null)}
					/>
					<div
						className={cn(
							'relative z-10 w-full max-w-lg rounded-2xl border p-5 shadow-[0_14px_34px_rgba(15,23,42,0.18)] dark:shadow-[0_18px_45px_rgba(2,6,23,0.62)]',
							isTransferDetails
								? 'border-emerald-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(236,253,245,0.95)_58%,rgba(248,250,252,0.96))] dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(10,40,28,0.94)_58%,rgba(5,10,20,0.98))]'
								: isReturned
									? 'border-amber-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(255,251,235,0.95)_58%,rgba(248,250,252,0.96))] dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(40,32,10,0.94)_58%,rgba(5,10,20,0.98))]'
									: 'border-rose-400/35 bg-[linear-gradient(165deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95)_58%,rgba(241,245,249,0.96))] dark:bg-[linear-gradient(165deg,rgba(20,28,42,0.95),rgba(10,16,28,0.94)_58%,rgba(5,10,20,0.98))]',
						)}
					>
						<div className="mb-4 flex items-start justify-between gap-3">
							<div className="flex items-start gap-3">
								<div
									className={cn(
										'mt-0.5 rounded-xl border p-2',
										isTransferDetails
											? 'border-emerald-400/35 bg-emerald-500/15'
											: isReturned
												? 'border-amber-400/35 bg-amber-500/15'
												: 'border-rose-400/35 bg-rose-500/15',
									)}
								>
									<Icons.warning
										className={cn(
											'h-4 w-4',
											isTransferDetails
												? 'text-emerald-500'
												: isReturned
													? 'text-amber-500'
													: 'text-rose-400',
										)}
									/>
								</div>
								<div>
									<h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
										{isTransferDetails
											? 'Parcours transféré'
											: isReturned
												? 'Parcours renvoyé'
												: 'Parcours rejeté'}
									</h3>
									<p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
										{tourRejectionDetails.name || 'Sans nom'}
									</p>
									{tourRejectionDetails.sandboxRejectedAt ? (
										<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
											{isTransferDetails
												? 'Transféré le'
												: isReturned
													? 'Renvoyé le'
													: 'Rejeté le'}{' '}
											{formatCreatedAt(tourRejectionDetails.sandboxRejectedAt)}
										</p>
									) : null}
									{tourRejectionDetails.sandboxRejectedBy ? (
										<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
											Envoyé par {sentByLabel}
										</p>
									) : null}
								</div>
							</div>
							<Button variant="ghost" size="icon" onClick={() => setTourRejectionDetails(null)}>
								<Icons.close className="h-4 w-4" />
							</Button>
						</div>
						<div
							className={cn(
								'mb-4 rounded-xl border p-4',
								isTransferDetails
									? 'border-emerald-200/60 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-500/10'
									: isReturned
										? 'border-amber-200/60 bg-amber-50/70 dark:border-amber-400/20 dark:bg-amber-500/10'
										: 'border-rose-200/60 bg-rose-50/70 dark:border-rose-400/20 dark:bg-rose-500/10',
							)}
						>
							<p
								className={cn(
									'text-xs font-semibold uppercase tracking-wider',
									isTransferDetails
										? 'text-emerald-900 dark:text-emerald-200'
										: isReturned
											? 'text-amber-900 dark:text-amber-200'
											: 'text-rose-800 dark:text-rose-200',
								)}
							>
								{isTransferDetails
									? 'Motif du transfert'
									: isReturned
										? 'Motif du renvoi'
										: 'Retour administrateur'}
							</p>
							<p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800 dark:text-slate-200">
								{isTransferDetails
									? transferMessage ||
										'Aucun motif de transfert enregistré pour ce parcours.'
									: tourRejectionDetails.sandboxRejectionReason?.trim() ||
										(isReturned
											? 'Aucun motif de renvoi enregistré pour ce parcours.'
											: 'Aucune cause de rejet enregistrée pour ce parcours.')}
							</p>
						</div>
						{isPreviousOwnerViewing ? (
							<p className="text-xs text-slate-600 dark:text-slate-400">
								Vous conservez un accès lecture seule. Ce parcours appartient désormais à un autre
								développeur.
							</p>
						) : null}
						{isDeveloper && tourRejectionDetails.createdBy === currentUserId ? (
							<p className="text-xs text-slate-600 dark:text-slate-400">
								{isTransferDetails || isReturned || tourRejectionDetails.sandboxStatus === 'rejected'
									? 'Corrigez le parcours puis réassignez-le à un administrateur pour relancer la modération.'
									: 'Corrigez le parcours puis enregistrez-le : il repassera automatiquement en attente d\u2019approbation.'}
							</p>
						) : null}
					</div>
							</>
						);
					})()}
				</div>
			) : null}
		</>
	);
}

