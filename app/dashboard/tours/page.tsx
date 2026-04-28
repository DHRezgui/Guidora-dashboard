'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import TourSimulator from '@/components/editor/TourSimulator';
import { getErrorMessage, tourService } from '@/lib/api';
import { GuidedTour } from '@/lib/types';
import { toast } from 'sonner';

const PREVIEW_STORAGE_KEY = 'tours.previewTour.v1';
const PREVIEW_STORAGE_TTL_MS = 2 * 60 * 1000;

export default function ToursPage() {
	const [tours, setTours] = useState<GuidedTour[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [deletingIds, setDeletingIds] = useState<string[]>([]);
	const [previewTour, setPreviewTour] = useState<GuidedTour | null>(null);
	const [previewShouldAutoPlay, setPreviewShouldAutoPlay] = useState(false);
	const [stepsTour, setStepsTour] = useState<GuidedTour | null>(null);
	const [filterQuery, setFilterQuery] = useState('');
	const [filterInput, setFilterInput] = useState('');
	const hiddenTourIdsRef = useRef<Set<string>>(new Set());
	const loadSeqRef = useRef(0);

	const filteredTours = useMemo(() => {
		const query = filterQuery.trim().toLowerCase();
		if (!query) return tours;
		return tours.filter((tour) =>
			(tour.targetUrl || '').toLowerCase().includes(query)
		);
	}, [tours, filterQuery]);

	const toursStats = useMemo(() => {
		const total = tours.length;
		const active = tours.filter((tour) => tour.isActive).length;
		const steps = tours.reduce((sum, tour) => sum + (tour.steps?.length || 0), 0);
		const avgSteps = total > 0 ? (steps / total).toFixed(1) : '0.0';
		return { total, active, steps, avgSteps };
	}, [tours]);

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
			setTours(fetchedTours.filter((t) => !hiddenTourIdsRef.current.has(t.id || '')));
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
		toast.success(`Export reussi (${normalized.name})`);
	};

	useEffect(() => {
		loadTours();
	}, []);

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
			toast.success(tour.isActive ? 'Parcours desactive' : 'Parcours active');
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
			toast.success(`Parcours supprime (${tour.name})`);
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
						<h1 className="text-3xl font-bold tracking-tight text-white">Parcours guides</h1>
						<p className="mt-1 text-sm text-slate-400">
							Gerez, modifiez et publiez vos parcours d'integration depuis votre espace.
						</p>
					</div>
					<Link href="/dashboard/tours/create">
						<Button className="w-full shadow-sm hover:scale-105 transition-transform md:w-auto">
							<Icons.plus className="mr-2 h-4 w-4" />
							Nouveau parcours
						</Button>
					</Link>
				</div>

				<div className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					{[
						{ label: 'Total parcours', value: toursStats.total, icon: Icons.tours, tone: 'from-slate-800/90 to-slate-900/70' },
						{ label: 'Parcours actifs', value: toursStats.active, icon: Icons.active, tone: 'from-emerald-600/20 to-slate-900/70' },
						{ label: 'Etapes cumulees', value: toursStats.steps, icon: Icons.layers, tone: 'from-cyan-500/20 to-slate-900/70' },
						{ label: 'Moy. etapes / parcours', value: toursStats.avgSteps, icon: Icons.analytics, tone: 'from-orange-500/20 to-slate-900/70' },
					].map((item) => {
						const Icon = item.icon;
						return (
							<div
								key={item.label}
								className={`rounded-2xl border border-white/10 bg-gradient-to-br ${item.tone} p-4 shadow-[0_10px_30px_rgba(2,6,23,0.35)] backdrop-blur-sm`}
							>
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</p>
										<p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
									</div>
									<div className="rounded-xl border border-white/10 bg-slate-950/65 p-2.5 text-orange-300">
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
							<Icons.search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
							<input
								value={filterInput}
								onChange={(e) => setFilterInput(e.target.value)}
								placeholder="Filtrer par URL cible..."
								className="h-10 w-full rounded-lg border border-white/15 bg-slate-900/45 pl-9 pr-9 text-sm text-slate-200 shadow-sm outline-none transition-colors placeholder:text-slate-500 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20"
							/>
							{filterInput ? (
								<button
									type="button"
									onClick={() => {
										setFilterInput('');
										setFilterQuery('');
									}}
									className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
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
				</div>

				{/* Contenu */}
				{isLoading ? (
					<Card className="border-white/10 bg-slate-900/45 backdrop-blur-sm">
						<CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-500">
							<Icons.spinner className="h-6 w-6 animate-spin text-primary" />
							<p>Chargement de vos parcours...</p>
						</CardContent>
					</Card>
				) : tours.length === 0 ? (
					<Card className="border-white/15 border-dashed bg-slate-900/45 shadow-sm">
						<CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
							<div className="rounded-full bg-primary/10 p-4">
								<Icons.tours className="h-8 w-8 text-primary" />
							</div>
							<div className="max-w-[400px]">
								<h3 className="mb-1 text-lg font-semibold text-slate-900">Aucun parcours pour le moment</h3>
								<p className="text-sm text-slate-500">
									Vous n'avez pas encore cree de parcours guide. Creer un parcours vous permettra d'accompagner vos utilisateurs de maniere interactive.
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
					<Card className="border-white/15 border-dashed bg-slate-900/45 shadow-sm">
						<CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
							<Icons.search className="h-8 w-8 text-slate-300" />
							<h3 className="text-base font-semibold text-slate-800">Aucun parcours ne correspond au filtre</h3>
							<p className="text-sm text-slate-500">Essayez une autre URL cible.</p>
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
						{filteredTours.map((tour) => (
							<Card 
								key={tour.id || tour.name} 
								className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,0.9),rgba(15,23,42,0.7)_55%,rgba(2,6,23,0.95))] shadow-[0_12px_28px_rgba(2,6,23,0.36)] transition-all duration-300 hover:-translate-y-1 hover:border-orange-400/35 hover:shadow-[0_22px_40px_rgba(249,115,22,0.18)]"
							>
								<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.12),transparent_42%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
								{/* Indice de statut subtil */}
								<div className={`absolute top-0 left-0 h-1 w-full transition-colors ${tour.isActive ? 'bg-emerald-500' : 'bg-slate-400/60'}`} />
								
								<CardHeader className="relative pb-3 pt-5">
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<CardTitle className="line-clamp-1 text-lg font-bold text-white" title={tour.name}>
													{tour.name}
												</CardTitle>
											</div>
											<p className="flex items-center text-xs text-slate-400">
												<span className="mr-2 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-300">
													{(tour.id || '').slice(0, 8)}
												</span>
												Créé le {formatCreatedAt(tour.createdAt)}
											</p>
										</div>
										<Badge
											variant="outline"
											className={`${tour.isActive ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300' : 'border-slate-500/35 bg-slate-600/20 text-slate-300'} shrink-0 px-2.5 py-0.5 text-xs font-medium`}
										>
											<span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${tour.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
											{tour.isActive ? 'Actif' : 'Inactif'}
										</Badge>
									</div>
									<p className="mt-2 min-h-[40px] line-clamp-2 text-sm leading-relaxed text-slate-300">
										{tour.description || <span className="italic text-slate-400">Aucune description fournie</span>}
									</p>
								</CardHeader>

								<CardContent className="relative mt-auto flex flex-col gap-4 pb-4 pt-2">
									{/* Informations complémentaires */}
									<div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-800/35 p-3.5 backdrop-blur-sm">
										<div className="flex items-center justify-between text-sm">
											<div className="min-w-0 flex items-center gap-2 text-slate-300">
												<Icons.globe className="h-4 w-4 shrink-0 text-slate-500" />
												<span className="truncate max-w-[150px] md:max-w-[180px]" title={tour.targetUrl}>{tour.targetUrl || 'URL non définie'}</span>
											</div>
											{tour.priority !== undefined && (
												<Badge variant="secondary" className="h-5 border-white/15 bg-slate-900/60 text-[10px] text-slate-300 shadow-sm">
													Prio: {tour.priority}
												</Badge>
											)}
										</div>
										
										<div className="h-px w-full bg-white/10" />
										
										<div className="flex items-center justify-between">
											<button
												type="button"
												onClick={() => handleShowSteps(tour)}
												className="group/btn flex items-center gap-2 text-sm font-medium text-slate-200 transition-colors hover:text-orange-300"
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
											<Button variant="outline" className="h-9 w-full border-white/15 bg-slate-900/45 text-sm text-slate-100 shadow-sm transition-all hover:bg-white/10 hover:text-white">
												<Icons.edit className="mr-2 h-3.5 w-3.5" />
												Éditer
											</Button>
										</Link>
										
										<div className="flex items-center gap-1.5">
											<Button
												variant="outline"
												size="icon"
												className="h-9 w-9 border-white/15 bg-slate-900/55 text-slate-300 transition-colors hover:bg-white/10 hover:text-orange-300 focus:ring-2 focus:ring-orange-400/20"
												onClick={() => handleExport(tour)}
												disabled={deletingIds.includes(tour.id || '')}
												title="Exporter le parcours (JSON)"
											>
												<Icons.download className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												className={`h-9 w-9 border-white/15 bg-slate-900/55 transition-colors focus:ring-2 ${
													tour.isActive 
														? "text-slate-300 hover:bg-amber-500/15 hover:text-amber-300 hover:border-amber-400/30 focus:ring-amber-500/20" 
														: "text-slate-300 hover:bg-emerald-500/15 hover:text-emerald-300 hover:border-emerald-400/30 focus:ring-emerald-500/20"
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
												className="h-9 w-9 border-white/15 bg-slate-900/55 text-slate-300 transition-colors hover:bg-rose-500/15 hover:text-rose-300 hover:border-rose-400/30 focus:ring-2 focus:ring-rose-500/20"
												onClick={() => {
													if (confirm("Êtes-vous sûr de vouloir supprimer ce parcours ? Cette action est irréversible.")) {
														handleDelete(tour);
													}
												}}
												disabled={deletingIds.includes(tour.id || '')}
												title="Supprimer"
											>
												<Icons.trash className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>

			{previewTour && (
				<div className="fixed inset-0 z-[120] bg-black/70 p-3 md:p-8">
					<div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-xl border border-white/10 bg-slate-950/85 p-3 backdrop-blur-xl md:p-4">
						<div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
							<div>
								<h2 className="text-lg font-semibold text-white">Previsualisation: {previewTour.name}</h2>
								<p className="text-xs text-slate-400">{previewTour.steps?.length || 0} etape(s)</p>
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
					<div className="mx-auto flex h-full max-h-[800px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl">
						{/* Header */}
						<div className="flex items-center justify-between border-b border-white/10 bg-slate-900/40 px-6 py-4">
							<div className="flex items-center gap-4">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
									<Icons.tours className="h-5 w-5 text-primary" />
								</div>
								<div>
									<h2 className="line-clamp-1 text-xl font-bold text-white">{stepsTour.name || 'Parcours'}</h2>
									<p className="text-sm text-slate-400">{stepsTour.steps?.length || 0} étape(s) dans ce parcours</p>
								</div>
							</div>
							<Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200 shrink-0" onClick={() => setStepsTour(null)}>
								<Icons.close className="h-5 w-5" />
							</Button>
						</div>
						
						{/* Content */}
						<div className="flex-1 overflow-y-auto bg-slate-950/35 p-4 sm:p-6">
							{(stepsTour.steps || []).length === 0 ? (
								<div className="flex h-full flex-col items-center justify-center text-slate-400">
									<Icons.layers className="mb-3 h-12 w-12 opacity-20" />
									<p>Ce parcours ne contient aucune étape.</p>
								</div>
							) : (
								<div className="relative mx-auto max-w-2xl">
									{/* Ligne verticale timeline */}
									<div className="absolute bottom-0 left-[27px] top-0 hidden w-px bg-white/20 sm:block" />
									
									<div className="space-y-6">
										{(stepsTour.steps || []).map((step, idx) => {
											const resolvedStepType = step.stepType ?? (step.highlightElement ? 'highlight' : 'tooltip');
											const StepTypeIcon = getIconForStepType(resolvedStepType);

											return (
											<div key={step.id || `${step.title}-${idx}`} className="relative flex flex-col sm:flex-row gap-4 sm:gap-6">
												{/* Indicateur timeline */}
												<div className="relative z-10 hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-slate-900 font-bold text-slate-200 shadow-sm sm:flex">
													{idx + 1}
												</div>
												<div className="z-10 mb-[-10px] flex items-center gap-2 sm:hidden">
													<Badge className="bg-slate-800 text-white rounded-full h-6 w-6 flex items-center justify-center p-0">
														{idx + 1}
													</Badge>
													<span className="text-sm font-semibold text-slate-300">Étape {idx + 1}</span>
												</div>
												
												{/* Carte d'étape */}
												<div className="flex-1 rounded-xl border border-white/10 bg-slate-900/70 p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.2)] transition-all hover:border-orange-400/30 hover:shadow-md">
													<div className="mb-3 flex flex-wrap items-start justify-between gap-4">
														<div className="flex-1 min-w-[200px]">
															<h3 className="text-base font-semibold text-white">{step.title || 'Étape sans titre'}</h3>
															{step.targetSelector && (
																<div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-mono text-slate-400">
																	<Icons.target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
																	<span className="break-all rounded border border-white/10 bg-slate-800 px-1.5 py-0.5">
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
															<Badge variant="outline" className="bg-slate-900/65 text-[10px] font-medium uppercase tracking-wider text-slate-300">
																{step.position?.replace('_', ' ') || 'BOTTOM'}
															</Badge>
															<Link href={`/dashboard/tours/create?id=${stepsTour.id}&step=${idx}`}>
																<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-orange-300 hover:bg-orange-500/10 hover:text-orange-200">
																	<Icons.edit className="mr-1.5 h-3 w-3" />
																	Modifier
																</Button>
															</Link>
														</div>
													</div>
													
													<div className="rounded-lg border border-white/10 bg-slate-800/45 p-3.5">
														<p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
															{step.content || <span className="italic text-slate-400">Aucun contenu défini pour cette étape.</span>}
														</p>
													</div>
													
													{/* Action footer */}
													<div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-slate-400">
														<Icons.mousePointer className="h-3.5 w-3.5" />
														Action de déclenchement : <span className="rounded bg-slate-800 px-1.5 py-0.5 font-medium text-slate-200">{step.action || 'NEXT'}</span>
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
		</div>
	);
}
