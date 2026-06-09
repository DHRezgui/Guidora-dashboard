'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import type { OrganizationJourneyBlueprintRow } from '@/lib/api';
import { blueprintDisplayMeta, extractBlueprintSteps } from '../blueprint-shared';

type BlueprintStepsModalProps = {
	row: OrganizationJourneyBlueprintRow;
	canEdit: boolean;
	onClose: () => void;
};

export function BlueprintStepsModal({ row, canEdit, onClose }: BlueprintStepsModalProps) {
	const meta = blueprintDisplayMeta(row);
	const steps = extractBlueprintSteps(row);

	return (
		<div className="fixed inset-0 z-[121] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm sm:p-6 md:p-12">
			<div className="mx-auto flex h-full max-h-[800px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-slate-950/90">
				<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-slate-900/40">
					<div className="flex min-w-0 items-center gap-4">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/15">
							<Icons.blueprints className="h-5 w-5 text-orange-600 dark:text-orange-300" />
						</div>
						<div className="min-w-0">
							<h2 className="line-clamp-1 text-xl font-bold text-slate-900 dark:text-white">{meta.name}</h2>
							<p className="truncate font-mono text-xs text-slate-500 dark:text-slate-400">{row.blueprintId}</p>
							<p className="text-sm text-slate-600 dark:text-slate-400">
								{steps.length} étape{steps.length !== 1 ? 's' : ''} dans ce blueprint
							</p>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="shrink-0 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"
						onClick={onClose}
						aria-label="Fermer"
					>
						<Icons.close className="h-5 w-5" />
					</Button>
				</div>

				<div className="flex-1 overflow-y-auto bg-slate-100/70 p-4 sm:p-6 dark:bg-slate-950/35">
					{steps.length === 0 ? (
						<div className="flex h-full flex-col items-center justify-center text-slate-400">
							<Icons.layers className="mb-3 h-12 w-12 opacity-20" />
							<p>Ce blueprint ne contient aucune étape.</p>
						</div>
					) : (
						<div className="relative mx-auto max-w-2xl">
							<div className="absolute bottom-0 left-[27px] top-0 hidden w-px bg-slate-300 sm:block dark:bg-white/20" />
							<div className="space-y-6">
								{steps.map((step, idx) => (
									<div key={`${step.semanticRole}-${idx}`} className="relative flex flex-col gap-4 sm:flex-row sm:gap-6">
										<div className="relative z-10 hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-sm font-bold text-slate-700 shadow-sm sm:flex dark:border-white/20 dark:bg-slate-900 dark:text-slate-200">
											{idx + 1}
										</div>
										<div className="z-10 mb-[-10px] flex items-center gap-2 sm:hidden">
											<Badge className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 p-0 text-white">
												{idx + 1}
											</Badge>
											<span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
												Étape {idx + 1}
											</span>
										</div>

										<div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.08)] transition-all hover:border-orange-400/30 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70">
											<div className="mb-3 flex flex-wrap items-start justify-between gap-4">
												<div className="min-w-0 flex-1">
													<h3 className="text-base font-semibold text-slate-900 dark:text-white">
														{step.title || 'Étape sans titre'}
													</h3>
													{step.semanticRole ? (
														<p className="mt-1.5 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">
															{step.semanticRole}
														</p>
													) : null}
												</div>
												<div className="flex shrink-0 flex-col items-end gap-2">
													<Badge
														variant="outline"
														className="text-[10px] font-medium uppercase tracking-wider"
													>
														{step.required ? 'Required' : 'Optionnel'}
													</Badge>
													{canEdit ? (
														<Link
															href={`/dashboard/blueprints/create?id=${row.id}&step=${idx}`}
															onClick={onClose}
														>
															<Button
																variant="ghost"
																size="sm"
																className="h-7 px-2 text-xs text-orange-600 hover:bg-orange-100 hover:text-orange-700 dark:text-orange-300 dark:hover:bg-orange-500/10 dark:hover:text-orange-200"
															>
																<Icons.edit className="mr-1.5 h-3 w-3" />
																Modifier
															</Button>
														</Link>
													) : null}
												</div>
											</div>

											<div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-slate-800/45">
												<p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
													{step.description || (
														<span className="italic text-slate-500 dark:text-slate-400">
															Aucune description
														</span>
													)}
												</p>
											</div>

											{(step.selectorHints.length > 0 ||
												step.semanticTokens.length > 0 ||
												step.routePatterns.length > 0) && (
												<div className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-white/10 dark:text-slate-400">
													{step.semanticTokens.length > 0 ? (
														<p>
															<span className="font-medium text-slate-700 dark:text-slate-300">
																Tokens :
															</span>{' '}
															{step.semanticTokens.join(', ')}
														</p>
													) : null}
													{step.selectorHints.length > 0 ? (
														<p className="break-all font-mono">
															<span className="font-sans font-medium text-slate-700 dark:text-slate-300">
																Sélecteurs :
															</span>{' '}
															{step.selectorHints.join(', ')}
														</p>
													) : null}
													{step.routePatterns.length > 0 ? (
														<p className="break-all font-mono">
															<span className="font-sans font-medium text-slate-700 dark:text-slate-300">
																Routes :
															</span>{' '}
															{step.routePatterns.join(', ')}
														</p>
													) : null}
												</div>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
