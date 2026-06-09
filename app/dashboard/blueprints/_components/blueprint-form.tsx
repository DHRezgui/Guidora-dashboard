'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { JourneyBlueprintCatalog } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
	BLUEPRINT_SELECT_CONTENT_CLASS,
	BLUEPRINT_SELECT_TRIGGER_CLASS,
	EMPTY_STEP,
	blueprintStepAnchorId,
	PHOENIX_FIELD_CLASS,
	PHOENIX_INSET_PANEL_CLASS,
	PHOENIX_LABEL_CLASS,
	PHOENIX_PANEL_CLASS,
	type BlueprintFormState,
} from '../blueprint-shared';
import { PhoenixSwitch } from './phoenix-collapsible';

type BlueprintFormProps = {
	isEditMode: boolean;
	readOnly: boolean;
	canPublishOnSave?: boolean;
	userRole?: string;
	catalog: JourneyBlueprintCatalog | null;
	form: BlueprintFormState;
	setForm: React.Dispatch<React.SetStateAction<BlueprintFormState>>;
	publishOnSave: boolean;
	setPublishOnSave: (value: boolean) => void;
	saving?: boolean;
	onSave: () => void;
	onCancel?: () => void;
};

export function BlueprintForm({
	isEditMode,
	readOnly,
	canPublishOnSave = true,
	userRole,
	catalog,
	form,
	setForm,
	publishOnSave,
	setPublishOnSave,
	saving = false,
	onSave,
	onCancel,
}: BlueprintFormProps) {
	const semanticRoles = catalog?.semanticRoles ?? [];
	const verticals = catalog?.verticals ?? [];
	const intents = catalog?.intents ?? [];

	return (
		<Card className={PHOENIX_PANEL_CLASS}>
			<CardHeader className="border-b border-slate-200/80 dark:border-white/10">
				<CardTitle className="text-lg text-slate-900 dark:text-white">
					{isEditMode ? 'Modifier le blueprint' : 'Nouveau blueprint'}
				</CardTitle>
				<CardDescription className="text-slate-600 dark:text-slate-400">
					Renseignez l&apos;identifiant, le contexte métier et les étapes du parcours modèle.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4 pt-6">
				{readOnly && (
					<p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
						Lecture seule — rôle {userRole ?? 'USER'}.
					</p>
				)}

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="bp-id" className={PHOENIX_LABEL_CLASS}>
							ID (slug)
						</Label>
						<Input
							id="bp-id"
							value={form.id}
							disabled={readOnly || isEditMode}
							onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
							placeholder="custom.saas.crm-pipeline"
							className={PHOENIX_FIELD_CLASS}
						/>
					</div>
					<div className="space-y-2">
						<Label className={PHOENIX_LABEL_CLASS}>Vertical</Label>
						<Select
							value={form.vertical}
							disabled={readOnly}
							onValueChange={(v) => v && setForm((f) => ({ ...f, vertical: v }))}
						>
							<SelectTrigger className={BLUEPRINT_SELECT_TRIGGER_CLASS}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent
								alignItemWithTrigger={false}
								side="bottom"
								sideOffset={8}
								className={BLUEPRINT_SELECT_CONTENT_CLASS}
							>
								{verticals.map((v) => (
									<SelectItem key={v} value={v}>
										{v}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="bp-name" className={PHOENIX_LABEL_CLASS}>
							Nom
						</Label>
						<Input
							id="bp-name"
							value={form.name}
							disabled={readOnly}
							onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
							className={PHOENIX_FIELD_CLASS}
						/>
					</div>
					<div className="space-y-2 sm:col-span-2">
						<Label htmlFor="bp-desc" className={PHOENIX_LABEL_CLASS}>
							Description
						</Label>
						<Textarea
							id="bp-desc"
							rows={2}
							value={form.description}
							disabled={readOnly}
							onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
							className={PHOENIX_FIELD_CLASS}
						/>
					</div>
					<div className="space-y-2">
						<Label className={PHOENIX_LABEL_CLASS}>Intent</Label>
						<Select
							value={form.intent}
							disabled={readOnly}
							onValueChange={(v) => v && setForm((f) => ({ ...f, intent: v }))}
						>
							<SelectTrigger className={BLUEPRINT_SELECT_TRIGGER_CLASS}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent
								alignItemWithTrigger={false}
								side="bottom"
								sideOffset={8}
								className={BLUEPRINT_SELECT_CONTENT_CLASS}
							>
								{intents.map((i) => (
									<SelectItem key={i} value={i}>
										{i}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="bp-min" className={PHOENIX_LABEL_CLASS}>
							minResolvedSteps
						</Label>
						<Input
							id="bp-min"
							type="number"
							min={1}
							value={form.minResolvedSteps}
							disabled={readOnly}
							onChange={(e) => setForm((f) => ({ ...f, minResolvedSteps: e.target.value }))}
							className={PHOENIX_FIELD_CLASS}
						/>
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Étapes</h3>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={readOnly}
							className="rounded-lg border-slate-300 bg-white/90 shadow-sm hover:border-orange-400/40 dark:border-white/15 dark:bg-slate-900/55"
							onClick={() =>
								setForm((f) => ({
									...f,
									steps: [...f.steps, { ...EMPTY_STEP }],
								}))
							}
						>
							Ajouter une étape
						</Button>
					</div>

					{form.steps.map((step, index) => (
						<div
							key={index}
							id={blueprintStepAnchorId(index)}
							className={cn(PHOENIX_INSET_PANEL_CLASS, 'scroll-mt-24')}
						>
							<div className="mb-3 flex items-center justify-between">
								<span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
									Étape {index + 1}
								</span>
								{form.steps.length > 1 && (
									<Button
										type="button"
										variant="ghost"
										size="sm"
										disabled={readOnly}
										onClick={() =>
											setForm((f) => ({
												...f,
												steps: f.steps.filter((_, i) => i !== index),
											}))
										}
									>
										Retirer
									</Button>
								)}
							</div>
							<div className="grid gap-3 sm:grid-cols-2">
								<div className="space-y-2 sm:col-span-2">
									<Label className={PHOENIX_LABEL_CLASS}>Rôle sémantique</Label>
									<Select
										value={step.semanticRole}
										disabled={readOnly}
										onValueChange={(v) =>
											v &&
											setForm((f) => {
												const steps = [...f.steps];
												steps[index] = { ...steps[index], semanticRole: v };
												return { ...f, steps };
											})
										}
									>
										<SelectTrigger className={BLUEPRINT_SELECT_TRIGGER_CLASS}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent
											alignItemWithTrigger={false}
											side="bottom"
											sideOffset={8}
											className={cn(BLUEPRINT_SELECT_CONTENT_CLASS, 'max-h-64')}
										>
											{semanticRoles.map((r) => (
												<SelectItem key={r} value={r}>
													{r}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label className={PHOENIX_LABEL_CLASS}>Titre</Label>
									<Input
										value={step.title}
										disabled={readOnly}
										onChange={(e) =>
											setForm((f) => {
												const steps = [...f.steps];
												steps[index] = { ...steps[index], title: e.target.value };
												return { ...f, steps };
											})
										}
										className={PHOENIX_FIELD_CLASS}
									/>
								</div>
								<div className="flex items-end pb-1">
									<PhoenixSwitch
										checked={step.required}
										onCheckedChange={(value) =>
											setForm((f) => {
												const steps = [...f.steps];
												steps[index] = { ...steps[index], required: value };
												return { ...f, steps };
											})
										}
										label="Required"
										ariaLabel={`Étape ${index + 1} — obligatoire`}
										disabled={readOnly}
									/>
								</div>
								<div className="space-y-2 sm:col-span-2">
									<Label className={PHOENIX_LABEL_CLASS}>Description</Label>
									<Textarea
										rows={2}
										value={step.description}
										disabled={readOnly}
										onChange={(e) =>
											setForm((f) => {
												const steps = [...f.steps];
												steps[index] = { ...steps[index], description: e.target.value };
												return { ...f, steps };
											})
										}
										className={PHOENIX_FIELD_CLASS}
									/>
								</div>
								<div className="space-y-2 sm:col-span-2">
									<Label className={PHOENIX_LABEL_CLASS}>semanticTokens (CSV)</Label>
									<Input
										value={step.semanticTokens}
										placeholder="pipeline, deals, crm"
										disabled={readOnly}
										onChange={(e) =>
											setForm((f) => {
												const steps = [...f.steps];
												steps[index] = { ...steps[index], semanticTokens: e.target.value };
												return { ...f, steps };
											})
										}
										className={PHOENIX_FIELD_CLASS}
									/>
								</div>
								<div className="space-y-2 sm:col-span-2">
									<Label className={PHOENIX_LABEL_CLASS}>selectorHints (CSV)</Label>
									<Input
										value={step.selectorHints}
										placeholder='[data-tour-id="crm-pipeline"]'
										disabled={readOnly}
										onChange={(e) =>
											setForm((f) => {
												const steps = [...f.steps];
												steps[index] = { ...steps[index], selectorHints: e.target.value };
												return { ...f, steps };
											})
										}
										className={PHOENIX_FIELD_CLASS}
									/>
								</div>
							</div>
						</div>
					))}
				</div>

				{!readOnly && (
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/65 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/40">
						{canPublishOnSave ? (
							<PhoenixSwitch
								checked={publishOnSave}
								onCheckedChange={setPublishOnSave}
								label="Publier (visible SDK)"
								ariaLabel="Publier le blueprint pour le SDK"
							/>
						) : (
							<p className="text-sm text-slate-600 dark:text-slate-400">
								Publication réservée au propriétaire ou aux admins délégués.
							</p>
						)}
						<div className="flex flex-wrap gap-2">
							<Button
								type="button"
								disabled={saving}
								onClick={onSave}
								className="rounded-xl shadow-soft transition-transform hover:scale-105 active:scale-[0.99]"
							>
								{saving ? 'Enregistrement…' : isEditMode ? 'Enregistrer' : 'Créer'}
							</Button>
							{onCancel ? (
								<Button
									type="button"
									variant="outline"
									disabled={saving}
									onClick={onCancel}
									className="rounded-lg border-slate-300 bg-white/90 dark:border-white/15 dark:bg-slate-900/55"
								>
									Annuler
								</Button>
							) : null}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
