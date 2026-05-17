'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DndContext, DragEndEvent, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TourSimulator from '@/components/editor/TourSimulator';
import { getErrorMessage, tourService, userService } from '@/lib/api';
import { GuidedTour, User } from '@/lib/types';
import { concatenateToursFifo } from '@/lib/tour-concat';
import { toast } from 'sonner';
import { reconcileAllSdkLabRunSnapshots } from '@/app/dashboard/sdk-tests/lab-run-persist';
import {
	reconcileAutoPublishedSessionWithTours,
	removeAutoPublishedSignaturesForTour,
} from '@sdk/utils/auto-publish-session-dedupe';

const PREVIEW_STORAGE_KEY = 'tours.previewTour.v1';
const PREVIEW_STORAGE_TTL_MS = 2 * 60 * 1000;
const CONCAT_PREFILL_STORAGE_KEY = 'tours.concatPrefill.v1';
const CONCAT_DROP_ZONE_ID = 'concat-drop-zone';
const CONCAT_DRAFT_STORAGE_KEY = 'tours.concatDraft.v1';

/** Durée du halo après arrivée sur la liste. */
const NEW_TOUR_GLOW_VISIBLE_MS = 5 * 60 * 1000;

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
	children,
}: {
	tourId: string;
	children: React.ReactNode;
}) {
	const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
		id: `tour-card-${tourId}`,
		data: { tourId },
	});

	const transformStyle = transform
		? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
		: undefined;

	return (
		<div
			ref={setNodeRef}
			style={transformStyle}
			{...attributes}
			{...listeners}
			className={isDragging ? 'cursor-grabbing opacity-60' : 'cursor-grab'}
		>
			{children}
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
	const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
	const [concatQueue, setConcatQueue] = useState<string[]>([]);
	const [concatDraft, setConcatDraft] = useState({
		name: '',
		targetUrl: '/',
		priority: 0,
		isActive: true,
		description: '',
		replayPolicy: 'never' as 'never' | 'after_period' | 'always_on_new_version',
		replayAfterDays: 0,
		dedupeSteps: true,
	});
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
	const [highlightNewTourId, setHighlightNewTourId] = useState<string | null>(null);
	const [newGlowExpiredIds, setNewGlowExpiredIds] = useState<Set<string>>(() => new Set());
	const newGlowExpiredIdsRef = useRef<Set<string>>(new Set());
	const newGlowTimersScheduledRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		newGlowExpiredIdsRef.current = newGlowExpiredIds;
	}, [newGlowExpiredIds]);

	useEffect(() => {
		const fromQuery = searchParams.get('new');
		if (!fromQuery) return;
		setHighlightNewTourId((prev) => prev ?? fromQuery);
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

	useEffect(() => {
		const scheduled: { id: string; handle: ReturnType<typeof setTimeout> }[] = [];
		for (const tour of tours) {
			const id = tour.id;
			if (!id || newGlowExpiredIdsRef.current.has(id)) continue;
			if (!tourEligibleForNewGlow(tour, newGlowTourIds)) continue;
			if (newGlowTimersScheduledRef.current.has(id)) continue;
			newGlowTimersScheduledRef.current.add(id);
			const handle = setTimeout(() => {
				newGlowTimersScheduledRef.current.delete(id);
				setNewGlowExpiredIds((prev) => new Set(prev).add(id));
			}, NEW_TOUR_GLOW_VISIBLE_MS);
			scheduled.push({ id, handle });
		}
		return () => {
			for (const { id, handle } of scheduled) {
				clearTimeout(handle);
				newGlowTimersScheduledRef.current.delete(id);
			}
		};
	}, [tours, newGlowTourIds]);

	useEffect(() => {
		if (!highlightNewTourId || newGlowTourIds.size === 0) return;
		const allExpired = [...newGlowTourIds].every((id) => newGlowExpiredIds.has(id));
		if (allExpired) {
			setHighlightNewTourId(null);
		}
	}, [highlightNewTourId, newGlowTourIds, newGlowExpiredIds]);

	const filteredTours = useMemo(() => {
		const query = filterQuery.trim().toLowerCase();
		if (!query) return tours;
		return tours.filter((tour) => {
			const hay = [
				tour.targetUrl,
				tour.name,
				tour.description,
				typeof tour.id === 'string' ? tour.id : '',
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return hay.includes(query);
		});
	}, [tours, filterQuery]);

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

	const toursStats = useMemo(() => {
		const total = tours.length;
		const active = tours.filter((tour) => tour.isActive).length;
		const steps = tours.reduce((sum, tour) => sum + (tour.steps?.length || 0), 0);
		const avgSteps = total > 0 ? (steps / total).toFixed(1) : '0.0';
		return { total, active, steps, avgSteps };
	}, [tours]);

	const concatTours = useMemo(() => {
		const byId = new Map((tours || []).map((tour) => [tour.id, tour]));
		return concatQueue
			.map((id) => byId.get(id))
			.filter((tour): tour is GuidedTour => Boolean(tour));
	}, [concatQueue, tours]);

	const concatSummary = useMemo(() => {
		const totalTours = concatTours.length;
		const totalSourceSteps = concatTours.reduce((sum, tour) => sum + (tour.steps?.length || 0), 0);
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

	const loadTours = async () => {
		const currentSeq = ++loadSeqRef.current;
		try {
			const response = await tourService.getAll();
			const fetchedTours = response.tours || [];
			if (currentSeq !== loadSeqRef.current) {
				return;
			}
			const visibleTours = fetchedTours.filter((t) => !hiddenTourIdsRef.current.has(t.id || ''));
			setTours(visibleTours);
			reconcileAutoPublishedSessionWithTours(visibleTours);
			reconcileAllSdkLabRunSnapshots(visibleTours);
		} catch (error) {
			toast.error('Impossible de charger les parcours', {
				description: getErrorMessage(error, 'Une erreur est survenue.'),
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

	const handlePreview = (tour: GuidedTour) => {
		const normalized = normalizeTour(tour);
		setPreviewShouldAutoPlay(false);
		setPreviewTour(normalized);
		persistPreviewTour(normalized, false);
	};

	const handleShowSteps = (tour: GuidedTour) => {
		setStepsTour(normalizeTour(tour));
	};

	const handleExport = (tour: GuidedTour) => {
		const normalized = normalizeTour(tour);
		const filename = `${(normalized.name || 'parcours').replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
		const blob = new Blob([JSON.stringify(normalized, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
		toast.success(`Export réussi (${normalized.name})`);
	};

	const getDuplicateHref = (tour: GuidedTour) => {
		const params = new URLSearchParams();
		if (tour.id) {
			params.set('duplicateId', tour.id);
		}
		return `/dashboard/tours/create?${params.toString()}`;
	};

	const handleDragEnd = (event: DragEndEvent) => {
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
		setConcatQueue([]);
		setConcatDraft({
			name: '',
			targetUrl: '/',
			priority: 0,
			isActive: true,
			description: '',
			replayPolicy: 'never',
			replayAfterDays: 0,
			dedupeSteps: true,
		});
	};

	const handleGenerateConcatenatedTour = () => {
		if (concatTours.length < 2) {
			toast.error('Ajoutez au moins deux parcours à concaténer.');
			return;
		}
		if (concatTours.some((tour) => (tour.steps?.length || 0) === 0)) {
			toast.error('Un des parcours sélectionnés ne contient aucune étape.');
			return;
		}

		const concatenatedTour = concatenateToursFifo(concatTours, {
			existingNames: tours.map((tour) => tour.name || ''),
			fallbackTargetUrl: concatDraft.targetUrl || '/',
			dedupeSteps: concatDraft.dedupeSteps,
		});
		if ((concatenatedTour.steps?.length || 0) === 0) {
			toast.error('La concaténation a produit un parcours vide. Vérifiez vos parcours source.');
			return;
		}

		const hydratedTour: GuidedTour = {
			...concatenatedTour,
			name: concatDraft.name.trim() || concatenatedTour.name,
			targetUrl: concatDraft.targetUrl.trim() || concatenatedTour.targetUrl,
			priority: Number.isFinite(concatDraft.priority) ? concatDraft.priority : concatenatedTour.priority,
			isActive: concatDraft.isActive,
			description: concatDraft.description.trim() || concatenatedTour.description,
			replayPolicy: concatDraft.replayPolicy,
			replayAfterDays: concatDraft.replayPolicy === 'after_period' ? Math.max(0, concatDraft.replayAfterDays) : 0,
		};

		try {
			if (typeof window !== 'undefined') {
				window.sessionStorage.setItem(CONCAT_PREFILL_STORAGE_KEY, JSON.stringify({ tour: hydratedTour, ts: Date.now() }));
			}
		} catch {
			toast.error('Impossible de préparer le pré-remplissage du parcours concaténé.');
			return;
		}

		router.push('/dashboard/tours/create?prefill=concat');
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
		if (concatTours.length === 0) return;
		setConcatDraft((prev) => {
			const first = concatTours[0];
			if (!first) return prev;
			return {
				...prev,
				targetUrl: prev.targetUrl === '/' ? first.targetUrl || '/' : prev.targetUrl,
				priority:
					prev.priority === 0
						? Math.max(...concatTours.map((tour) => Number(tour.priority || 0)), 0)
						: prev.priority,
			};
		});
	}, [concatTours]);

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

	const handleToggleActive = async (tour: GuidedTour) => {
		if (!tour.id) return;
		try {
			await tourService.toggleActive(tour.id, !tour.isActive);
			toast.success(tour.isActive ? 'Parcours désactivé' : 'Parcours activé');
			await loadTours();
		} catch (error) {
			toast.error('Action impossible', {
				description: getErrorMessage(error, 'Impossible de modifier le statut.'),
			});
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

	return (
		<div className="relative min-h-full overflow-hidden p-4 md:p-8">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -left-16 top-6 h-52 w-52 rounded-full bg-orange-500/10 blur-3xl" />
				<div className="absolute right-[-70px] top-28 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />
				<div className="absolute bottom-0 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
			</div>
			<div className="relative mx-auto w-full max-w-7xl">
				{/* En-tête */}
				<div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Parcours guides</h1>
						<p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
							Gerez, modifiez et publiez vos parcours d&apos;integration depuis votre espace.
						</p>
					</div>
					<div ref={actionsMenuRef} className="relative w-full md:w-auto">
						<div className="flex w-full md:w-auto">
							<Link href="/dashboard/tours/create" className="flex-1 md:flex-none">
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
				</div>

				<div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{[
						{ label: 'Total parcours', value: toursStats.total, icon: Icons.tours, tone: 'from-slate-100 to-white dark:from-slate-800/90 dark:to-slate-900/70' },
						{ label: 'Parcours actifs', value: toursStats.active, icon: Icons.active, tone: 'from-emerald-100 to-white dark:from-emerald-600/20 dark:to-slate-900/70' },
						{ label: 'Etapes cumulees', value: toursStats.steps, icon: Icons.layers, tone: 'from-cyan-100 to-white dark:from-cyan-500/20 dark:to-slate-900/70' },
						{ label: 'Moy. etapes / parcours', value: toursStats.avgSteps, icon: Icons.analytics, tone: 'from-orange-100 to-white dark:from-orange-500/20 dark:to-slate-900/70' },
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

				<div className="mb-4">
					<form
						className="flex w-full gap-2 lg:w-1/2"
						onSubmit={(e) => {
							e.preventDefault();
							setFilterQuery(filterInput.trim());
						}}
					>
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
									aria-label="Effacer le filtre"
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
					</form>
					{!isLoading && tours.length > 0 && filterQuery.trim() ? (
						<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
							{filteredTours.length} parcours affiché(s) sur {tours.length}
						</p>
					) : null}
				</div>

				<DndContext
					sensors={sensors}
					collisionDetection={pointerWithin}
					onDragOver={(event) => {
						setIsConcatDropOver(Boolean(event.over && String(event.over.id) === CONCAT_DROP_ZONE_ID));
					}}
					onDragEnd={handleDragEnd}
				>
				<ConcatDropContainer onOverChange={setIsConcatDropOver}>
				<Card className="mb-6 border border-slate-200/80 bg-[linear-gradient(155deg,rgba(255,255,255,0.92),rgba(248,250,252,0.84)_45%,rgba(241,245,249,0.82))] shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-colors dark:border-white/12 dark:bg-[linear-gradient(155deg,rgba(15,23,42,0.72),rgba(15,23,42,0.56)_45%,rgba(2,6,23,0.76))] dark:shadow-[0_20px_45px_rgba(2,6,23,0.5)]">
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

				{/* Contenu */}
				{isLoading ? (
					<Card className="border-slate-200 bg-white/85 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/45">
						<CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-500">
							<Icons.spinner className="h-6 w-6 animate-spin text-primary" />
							<p>Chargement de vos parcours...</p>
						</CardContent>
					</Card>
				) : tours.length === 0 ? (
					<Card className="border-slate-300 border-dashed bg-white/85 shadow-sm dark:border-white/15 dark:bg-slate-900/45">
						<CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
							<div className="rounded-full bg-primary/10 p-4">
								<Icons.tours className="h-8 w-8 text-primary" />
							</div>
							<div className="max-w-[400px]">
								<h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">Aucun parcours pour le moment</h3>
								<p className="text-sm text-slate-600 dark:text-slate-400">
									Vous n&apos;avez pas encore cree de parcours guide. Creer un parcours vous permettra d&apos;accompagner vos utilisateurs de maniere interactive.
								</p>
							</div>
							<Link href="/dashboard/tours/create" className="mt-2">
								<Button className="gap-2">
									<Icons.plus className="h-4 w-4" />
									Creer mon premier parcours
								</Button>
							</Link>
						</CardContent>
					</Card>
				) : filteredTours.length === 0 ? (
					<Card className="border-slate-300 border-dashed bg-white/85 shadow-sm dark:border-white/15 dark:bg-slate-900/45">
						<CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
							<Icons.search className="h-8 w-8 text-slate-400 dark:text-slate-300" />
							<h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Aucun parcours ne correspond au filtre</h3>
							<p className="text-sm text-slate-600 dark:text-slate-400">
								Essayez un autre mot-clé (nom, URL, description…).
							</p>
							<Button
								variant="outline"
								onClick={() => {
									setFilterInput('');
									setFilterQuery('');
								}}
							>
								Effacer le filtre
							</Button>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{filteredTours.map((tour) => {
							const hasStableId = Boolean(tour.id);
							const tourIdStr = typeof tour.id === 'string' ? tour.id : '';
							const showNewGlow =
								Boolean(tourIdStr) &&
								!newGlowExpiredIds.has(tourIdStr) &&
								tourEligibleForNewGlow(tour, newGlowTourIds);
							const cardNode = (
								<Card
									title={showNewGlow ? 'Parcours récemment ajouté — mise en avant temporaire' : undefined}
									className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[linear-gradient(160deg,rgba(255,255,255,0.95),rgba(248,250,252,0.95)_55%,rgba(241,245,249,0.95))] shadow-[0_12px_28px_rgba(2,6,23,0.12)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/35 hover:shadow-[0_22px_40px_rgba(249,115,22,0.18)] dark:border-white/10 dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.9),rgba(15,23,42,0.7)_55%,rgba(2,6,23,0.95))] dark:shadow-[0_12px_28px_rgba(2,6,23,0.36)] ${
										showNewGlow ? 'z-[1] ring-2 ring-orange-400/50 tour-card-new-glow dark:ring-orange-400/40' : ''
									}`}
								>
								<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_42%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
								{/* Indice de statut subtil */}
								<div className={`absolute top-0 left-0 h-1 w-full transition-colors ${tour.isActive ? 'bg-emerald-500' : 'bg-slate-400/60'}`} />
								
								<CardHeader className="relative pb-3 pt-5">
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<CardTitle className="line-clamp-1 text-lg font-bold text-slate-900 dark:text-white" title={tour.name}>
													{tour.name}
												</CardTitle>
											</div>
											<p className="flex items-center text-xs text-slate-500 dark:text-slate-400">
												<span className="mr-2 rounded bg-slate-200 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
													{(tour.id || '').slice(0, 8)}
												</span>
												Créé le {formatCreatedAt(tour.createdAt)}
											</p>
										</div>
										<Badge
											variant="outline"
											className={`${tour.isActive ? 'border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-300' : 'border-slate-300/60 bg-slate-100 text-slate-600 dark:border-slate-500/35 dark:bg-slate-600/20 dark:text-slate-300'} shrink-0 px-2.5 py-0.5 text-xs font-medium`}
										>
											<span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${tour.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
											{tour.isActive ? 'Actif' : 'Inactif'}
										</Badge>
									</div>
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
												<div className="flex items-center gap-1">
													<Badge variant="secondary" className="h-5 border-slate-200 bg-slate-100 text-[10px] text-slate-700 shadow-sm dark:border-white/15 dark:bg-slate-900/60 dark:text-slate-300">
														Prio: {tour.priority}
													</Badge>
													{Number(tour.replayAfterDays || 0) > 0 && (
														<Badge variant="secondary" className="h-5 border-slate-200 bg-slate-100 text-[10px] text-slate-700 shadow-sm dark:border-white/15 dark:bg-slate-900/60 dark:text-slate-300">
															Replay: {Number(tour.replayAfterDays)}j
														</Badge>
													)}
													{tour.replayPolicy && (
														<Badge variant="secondary" className="h-5 border-slate-200 bg-slate-100 text-[10px] text-slate-700 shadow-sm dark:border-white/15 dark:bg-slate-900/60 dark:text-slate-300">
															Policy: {tour.replayPolicy}
														</Badge>
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
												<span>{tour.steps?.length || 0} étape(s)</span>
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
									
									{/* Actions */}
									<div className="flex items-center gap-2 pt-1">
										<Link href={`/dashboard/tours/create?id=${tour.id}`} className="flex-1">
											<Button variant="outline" className="h-9 w-full border-slate-300 bg-white/90 text-sm text-slate-700 shadow-sm transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white">
												<Icons.edit className="mr-2 h-3.5 w-3.5" />
												Éditer
											</Button>
										</Link>
										{tour.id ? (
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
										
										<div className="flex items-center gap-1.5">
											<Button
												variant="outline"
												size="icon"
												className="h-9 w-9 border-slate-300 bg-white/90 text-slate-600 transition-colors hover:bg-slate-100 hover:text-orange-500 focus:ring-2 focus:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-orange-300"
												onClick={() => handleExport(tour)}
												disabled={deletingIds.includes(tour.id || '')}
												title="Exporter le parcours (JSON)"
											>
												<Icons.download className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												className="h-9 w-9 border-slate-300 bg-white/90 text-slate-600 transition-colors hover:bg-indigo-100 hover:text-indigo-700 hover:border-indigo-300/70 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-300 dark:hover:bg-indigo-500/15 dark:hover:text-indigo-300 dark:hover:border-indigo-400/30"
												onClick={() => openAudienceModal(tour)}
												disabled={deletingIds.includes(tour.id || '')}
												title="Réactivation audience"
											>
												<Icons.users className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												className={`h-9 w-9 border-slate-300 bg-white/90 transition-colors focus:ring-2 dark:border-white/15 dark:bg-slate-900/55 ${
													tour.isActive 
														? "text-slate-600 hover:bg-amber-100 hover:text-amber-700 hover:border-amber-300/70 focus:ring-amber-500/20 dark:text-slate-300 dark:hover:bg-amber-500/15 dark:hover:text-amber-300 dark:hover:border-amber-400/30" 
														: "text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-300/70 focus:ring-emerald-500/20 dark:text-slate-300 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-300 dark:hover:border-emerald-400/30"
												}`}
												onClick={() => handleToggleActive(tour)}
												disabled={deletingIds.includes(tour.id || '')}
												title={tour.isActive ? 'Désactiver' : 'Activer'}
											>
												<Icons.refresh className="h-4 w-4" />
											</Button>
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
										</div>
									</div>
								</CardContent>
							</Card>
							);

							if (!hasStableId) {
								return <div key={tour.name}>{cardNode}</div>;
							}

							return (
								<DraggableTourCard key={tour.id} tourId={tour.id as string}>
									{cardNode}
								</DraggableTourCard>
							);
						})}
					</div>
				)}
				</DndContext>
			</div>

			{previewTour && (
				<div className="fixed inset-0 z-[120] bg-black/70 p-3 md:p-8">
					<div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-xl border border-slate-200 bg-white/95 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85 md:p-4">
						<div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3 dark:border-white/10">
							<div>
								<h2 className="text-lg font-semibold text-slate-900 dark:text-white">Previsualisation: {previewTour.name}</h2>
								<p className="text-xs text-slate-500 dark:text-slate-400">{previewTour.steps?.length || 0} etape(s)</p>
							</div>
							<Button variant="ghost" size="icon" onClick={closePreview}>
								<Icons.close className="h-4 w-4" />
							</Button>
						</div>
						<div className="min-h-0 flex-1">
							<TourSimulator
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
									<p className="text-sm text-slate-600 dark:text-slate-400">{stepsTour.steps?.length || 0} étape(s) dans ce parcours</p>
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
															<Link href={`/dashboard/tours/create?id=${stepsTour.id}&step=${idx}`}>
																<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-100 hover:text-orange-700 dark:text-orange-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-200">
																	<Icons.edit className="mr-1.5 h-3 w-3" />
																	Modifier
																</Button>
															</Link>
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
		</div>
	);
}
