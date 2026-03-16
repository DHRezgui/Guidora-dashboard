'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { getErrorMessage, tourService } from '@/lib/api';
import { GuidedTour } from '@/lib/types';
import { toast } from 'sonner';

export default function ToursPage() {
	const [tours, setTours] = useState<GuidedTour[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const loadTours = async () => {
		try {
			const response = await tourService.getAll();
			setTours(response.tours || []);
		} catch (error) {
			toast.error('Impossible de charger les parcours', {
				description: getErrorMessage(error, 'Une erreur est survenue.'),
			});
		} finally {
			setIsLoading(false);
		}
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
		try {
			await tourService.remove(tour.id);
			toast.success('Parcours supprime');
			await loadTours();
		} catch (error) {
			toast.error('Suppression impossible', {
				description: getErrorMessage(error, 'Impossible de supprimer ce parcours.'),
			});
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
								className="group relative flex h-full flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition-all hover:shadow-md"
							>
								<div className={`absolute top-0 h-1 w-full ${tour.isActive ? 'bg-emerald-500' : 'bg-slate-200'}`} />
								<CardHeader className="pb-4">
									<div className="flex items-start justify-between gap-4">
										<div>
											<CardTitle className="line-clamp-1 text-lg font-semibold text-slate-900 dark:text-slate-100" title={tour.name}>
												{tour.name}
											</CardTitle>
											<p className="mt-1 flex items-center text-xs text-slate-500">
												<Icons.globe className="mr-1.5 h-3 w-3" />
												<span className="truncate">{tour.targetUrl || 'Aucune URL'}</span>
											</p>
										</div>
										<Badge 
											variant={tour.isActive ? "default" : "secondary"} 
											className={`${tour.isActive ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-100 text-slate-600'} border-transparent shrink-0`}
										>
											{tour.isActive ? 'Actif' : 'Inactif'}
										</Badge>
									</div>
									<p className="mt-3 line-clamp-2 text-sm text-slate-600">
										{tour.description || <span className="italic text-slate-400">Aucune description fournie</span>}
									</p>
								</CardHeader>
								<CardContent className="mt-auto pt-0">
									<div className="mb-4 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
										<div className="flex items-center gap-1.5 text-xs font-medium">
											<Icons.list className="h-3.5 w-3.5" />
											{tour.steps?.length || 0} etape(s)
										</div>
										{tour.priority !== undefined && (
											<div className="flex items-center gap-1 text-xs font-medium">
												<span className="text-slate-400">Priorite:</span> {tour.priority}
											</div>
										)}
									</div>
									
									<div className="flex items-center gap-2">
										<Link href={`/dashboard/tours/create?id=${tour.id}`} className="flex-1">
											<Button variant="outline" className="w-full bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200">
												<Icons.edit className="mr-2 h-4 w-4" />
												Modifier
											</Button>
										</Link>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="icon"
												className={`h-10 w-10 border-slate-200 bg-white ${tour.isActive ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600"} transition-colors hover:bg-slate-50`}
												onClick={() => handleToggleActive(tour)}
												title={tour.isActive ? 'Desactiver le parcours' : 'Activer le parcours'}
											>
												<Icons.refresh className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												className="h-10 w-10 border-slate-200 bg-white text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
												onClick={() => {
													if (confirm("Etes-vous sur de vouloir supprimer ce parcours ? Cette action est irreversible.")) {
														handleDelete(tour);
													}
												}}
												title="Supprimer le parcours"
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
		</div>
	);
}
