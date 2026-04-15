'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import TourSimulator from '@/components/editor/TourSimulator';
import { getErrorMessage, tourService } from '@/lib/api';
import { GuidedTour } from '@/lib/types';
import { toast } from 'sonner';

export default function ToursPage() {
	const [tours, setTours] = useState<GuidedTour[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [deletingIds, setDeletingIds] = useState<string[]>([]);
	const [previewTour, setPreviewTour] = useState<GuidedTour | null>(null);
	const [stepsTour, setStepsTour] = useState<GuidedTour | null>(null);
	const hiddenTourIdsRef = useRef<Set<string>>(new Set());
	const loadSeqRef = useRef(0);

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

	const handlePreview = (tour: GuidedTour) => {
		setPreviewTour(normalizeTour(tour));
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
		<div className="min-h-full bg-slate-50/50 p-4 md:p-8">
			<div className="mx-auto w-full max-w-7xl">
				{/* En-tête */}
				<div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
					<div>
						<h1 className="text-3xl font-bold tracking-tight text-slate-900">Parcours guides</h1>
						<p className="mt-1 text-sm text-slate-500">
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

				{/* Contenu */}
				{isLoading ? (
					<Card className="border-slate-200 bg-white/50 backdrop-blur-sm">
						<CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-500">
							<Icons.spinner className="h-6 w-6 animate-spin text-primary" />
							<p>Chargement de vos parcours...</p>
						</CardContent>
					</Card>
				) : tours.length === 0 ? (
					<Card className="border-slate-200 border-dashed bg-white/50 shadow-sm">
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
				) : (
					<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{tours.map((tour) => (
							<Card 
								key={tour.id || tour.name} 
								className="group relative flex h-full flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-primary/20"
							>
								{/* Indice de statut subtil */}
								<div className={`absolute top-0 left-0 w-full h-1 transition-colors ${tour.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`} />
								
								<CardHeader className="pb-3 pt-5">
									<div className="flex items-start justify-between gap-4">
										<div className="flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<CardTitle className="line-clamp-1 text-lg font-bold text-slate-900 dark:text-slate-100" title={tour.name}>
													{tour.name}
												</CardTitle>
											</div>
											<p className="flex items-center text-xs text-slate-500">
												<span className="font-mono bg-slate-100 rounded px-1.5 py-0.5 text-[10px] mr-2 text-slate-600 font-medium">
													{(tour.id || '').slice(0, 8)}
												</span>
												Créé le {formatCreatedAt(tour.createdAt)}
											</p>
										</div>
										<Badge 
											variant="outline"
											className={`${tour.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'} shrink-0 px-2.5 py-0.5 text-xs font-medium`}
										>
											<span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${tour.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
											{tour.isActive ? 'Actif' : 'Inactif'}
										</Badge>
									</div>
									<p className="mt-2 line-clamp-2 text-sm text-slate-600 min-h-[40px]">
										{tour.description || <span className="italic text-slate-400">Aucune description fournie</span>}
									</p>
								</CardHeader>

								<CardContent className="mt-auto flex flex-col gap-4 pb-4 pt-2">
									{/* Informations complémentaires */}
									<div className="flex flex-col gap-3 rounded-lg bg-slate-50/80 p-3 border border-slate-100">
										<div className="flex items-center justify-between text-sm">
											<div className="flex items-center gap-2 text-slate-600 min-w-0">
												<Icons.globe className="h-4 w-4 shrink-0 text-slate-400" />
												<span className="truncate max-w-[150px] md:max-w-[180px]" title={tour.targetUrl}>{tour.targetUrl || 'URL non définie'}</span>
											</div>
											{tour.priority !== undefined && (
												<Badge variant="secondary" className="bg-white text-[10px] h-5 shadow-sm border-slate-200">
													Prio: {tour.priority}
												</Badge>
											)}
										</div>
										
										<div className="h-px w-full bg-slate-200/60" />
										
										<div className="flex items-center justify-between">
											<button
												type="button"
												onClick={() => handleShowSteps(tour)}
												className="group/btn flex items-center gap-2 text-sm font-medium text-slate-700 transition-colors hover:text-primary"
												title="Voir les étapes du parcours"
											>
												<div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 group-hover/btn:bg-primary group-hover/btn:text-white transition-colors shadow-sm">
													<Icons.list className="h-3 w-3" />
												</div>
												<span>{tour.steps?.length || 0} étape(s)</span>
											</button>

											<button
												onClick={() => handlePreview(tour)}
												className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md px-2 py-1"
											>
												<Icons.play className="h-3.5 w-3.5" />
												Prévisualiser
											</button>
										</div>
									</div>
									
									{/* Actions */}
									<div className="flex items-center gap-2 pt-1">
										<Link href={`/dashboard/tours/create?id=${tour.id}`} className="flex-1">
											<Button variant="outline" className="w-full border-slate-200 text-slate-700 hover:border-primary/30 hover:bg-primary/5 hover:text-primary shadow-sm transition-all text-sm h-9">
												<Icons.edit className="mr-2 h-3.5 w-3.5" />
												Éditer
											</Button>
										</Link>
										
										<div className="flex items-center gap-1.5">
											<Button
												variant="outline"
												size="icon"
												className="h-9 w-9 border-slate-200 hover:bg-slate-50 hover:text-primary transition-colors focus:ring-2 focus:ring-primary/20 bg-white"
												onClick={() => handleExport(tour)}
												disabled={deletingIds.includes(tour.id || '')}
												title="Exporter le parcours (JSON)"
											>
												<Icons.download className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												className={`h-9 w-9 border-slate-200 transition-colors focus:ring-2 bg-white ${
													tour.isActive 
														? "hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 focus:ring-amber-500/20" 
														: "hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 focus:ring-emerald-500/20"
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
												className="h-9 w-9 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors focus:ring-2 focus:ring-rose-500/20 bg-white"
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
				<div className="fixed inset-0 z-[120] bg-black/60 p-3 md:p-8">
					<div className="mx-auto flex h-full w-full max-w-6xl flex-col rounded-xl bg-white p-3 md:p-4">
						<div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">Previsualisation: {previewTour.name}</h2>
								<p className="text-xs text-slate-500">{previewTour.steps?.length || 0} etape(s)</p>
							</div>
							<Button variant="ghost" size="icon" onClick={() => setPreviewTour(null)}>
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
								onExitPreview={() => setPreviewTour(null)}
							/>
						</div>
					</div>
				</div>
			)}

			{stepsTour && (
				<div className="fixed inset-0 z-[121] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6 md:p-12 transition-all">
					<div className="mx-auto flex h-full max-h-[800px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/50">
						{/* Header */}
						<div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4">
							<div className="flex items-center gap-4">
								<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
									<Icons.tours className="h-5 w-5 text-primary" />
								</div>
								<div>
									<h2 className="text-xl font-bold text-slate-900 line-clamp-1">{stepsTour.name || 'Parcours'}</h2>
									<p className="text-sm text-slate-500">{stepsTour.steps?.length || 0} étape(s) dans ce parcours</p>
								</div>
							</div>
							<Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200 shrink-0" onClick={() => setStepsTour(null)}>
								<Icons.close className="h-5 w-5" />
							</Button>
						</div>
						
						{/* Content */}
						<div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 sm:p-6">
							{(stepsTour.steps || []).length === 0 ? (
								<div className="flex h-full flex-col items-center justify-center text-slate-400">
									<Icons.layers className="mb-3 h-12 w-12 opacity-20" />
									<p>Ce parcours ne contient aucune étape.</p>
								</div>
							) : (
								<div className="relative mx-auto max-w-2xl">
									{/* Ligne verticale timeline */}
									<div className="absolute bottom-0 left-[27px] top-0 w-px bg-slate-200 hidden sm:block" />
									
									<div className="space-y-6">
										{(stepsTour.steps || []).map((step, idx) => (
											<div key={step.id || `${step.title}-${idx}`} className="relative flex flex-col sm:flex-row gap-4 sm:gap-6">
												{/* Indicateur timeline */}
												<div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-100 font-bold text-slate-600 shadow-sm hidden sm:flex">
													{idx + 1}
												</div>
												<div className="sm:hidden flex items-center gap-2 mb-[-10px] z-10">
													<Badge className="bg-slate-800 text-white rounded-full h-6 w-6 flex items-center justify-center p-0">
														{idx + 1}
													</Badge>
													<span className="text-sm font-semibold text-slate-700">Étape {idx + 1}</span>
												</div>
												
												{/* Carte d'étape */}
												<div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] transition-all hover:border-primary/30 hover:shadow-md">
													<div className="mb-3 flex flex-wrap items-start justify-between gap-4">
														<div className="flex-1 min-w-[200px]">
															<h3 className="text-base font-semibold text-slate-900">{step.title || 'Étape sans titre'}</h3>
															{step.targetSelector && (
																<div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-mono text-slate-500">
																	<Icons.target className="h-3.5 w-3.5 mt-0.5 shrink-0" />
																	<span className="rounded bg-slate-50 border border-slate-100 px-1.5 py-0.5 break-all">
																		{step.targetSelector}
																	</span>
																</div>
															)}
														</div>
														<div className="flex flex-col items-end gap-2 shrink-0">
															<Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wider bg-slate-50/80">
																{step.position?.replace('_', ' ') || 'BOTTOM'}
															</Badge>
															<Link href={`/dashboard/tours/create?id=${stepsTour.id}&step=${idx}`}>
																<Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary hover:bg-primary/5">
																	<Icons.edit className="mr-1.5 h-3 w-3" />
																	Modifier
																</Button>
															</Link>
														</div>
													</div>
													
													<div className="rounded-lg bg-slate-50/80 p-3.5 border border-slate-100">
														<p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
															{step.content || <span className="italic text-slate-400">Aucun contenu défini pour cette étape.</span>}
														</p>
													</div>
													
													{/* Action footer */}
													<div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
														<Icons.mousePointer className="h-3.5 w-3.5" />
														Action de déclenchement : <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{step.action || 'NEXT'}</span>
													</div>
												</div>
											</div>
										))}
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
