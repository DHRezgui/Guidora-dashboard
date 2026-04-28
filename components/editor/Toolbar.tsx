'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GuidedTour } from '@/lib/types';

interface ToolbarProps {
  tour?: GuidedTour;
  onSave?: (tour: GuidedTour) => void;
  onTourChange?: (changes: Partial<GuidedTour>) => void;
  onBack?: () => void;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export default function Toolbar({
  tour,
  onSave,
  onTourChange,
  onBack,
  isPreviewMode,
  onTogglePreview,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: ToolbarProps) {
  const normalizePriority = (value: string): number => {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return 0;
    return Math.max(0, Math.min(99, parsed));
  };

  return (
    <div className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/45">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 border border-transparent text-slate-500 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-white">
                <Icons.arrowLeft className="h-4 w-4" />
                Retour
              </Button>
            )}
            <div className="h-6 w-px bg-slate-200 dark:bg-white/15" />
            <div className="flex items-center gap-3">
              <div className="phoenix-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <Icons.tours className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold leading-tight text-slate-900 dark:text-white">
                  {tour?.name || 'Nouveau parcours'}
                </h1>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {tour?.steps?.length || 0} étape(s) configurée(s)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isPreviewMode && (
              <div className="mr-2 flex items-center gap-1 border-r border-slate-200 pr-4 dark:border-white/15">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  title="Annuler (Ctrl+Z)"
                >
                  <Icons.undo className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                  title="Rétablir (Ctrl+Y)"
                >
                  <Icons.redo className="h-4 w-4" />
                </Button>
              </div>
            )}
            <Button
              variant={isPreviewMode ? 'default' : 'outline'}
              size="sm"
              onClick={onTogglePreview}
              className={`gap-2 transition-all ${
                isPreviewMode 
                  ? 'bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-[0_0_24px_rgba(255,107,0,0.25)]' 
                  : 'border-slate-300 bg-white/90 text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-white/15 dark:bg-slate-900/45 dark:text-slate-100 dark:hover:bg-white/10 dark:hover:text-white'
              }`}
              title="Aperçu du rendu final pour l'utilisateur"
            >
              {isPreviewMode ? <Icons.eyeOff className="h-4 w-4" /> : <Icons.eye className="h-4 w-4" />}
              {isPreviewMode ? 'Quitter l\'aperçu' : 'Prévisualiser'}
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => onSave?.(tour!)} 
              className="gap-2 bg-gradient-to-r from-orange-500 to-pink-600 text-white shadow-[0_0_24px_rgba(255,107,0,0.25)]"
            >
              <Icons.save className="h-4 w-4" />
              Enregistrer
            </Button>
          </div>
        </div>

        {/* Configuration Section (Clean Design) */}
        <div className="grid gap-6 md:grid-cols-12 px-1">
          <div className="space-y-4 md:col-span-8 lg:col-span-9">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="tour-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Nom du parcours</Label>
                <Input
                  id="tour-name"
                  value={tour?.name ?? ''}
                  onChange={(e) => onTourChange?.({ name: e.target.value })}
                  placeholder="Ex: Onboarding administrateur"
                  className="h-9 border-slate-300 bg-white/90 text-slate-700 placeholder:text-slate-500 transition-colors hover:border-orange-400/40 focus:bg-white focus-visible:border-orange-400/60 focus-visible:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:focus:bg-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tour-url" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">URL cible</Label>
                <Input
                  id="tour-url"
                  value={tour?.targetUrl ?? ''}
                  onChange={(e) => onTourChange?.({ targetUrl: e.target.value })}
                  placeholder="/dashboard ou https://..."
                  className="h-9 border-slate-300 bg-white/90 text-slate-700 placeholder:text-slate-500 transition-colors hover:border-orange-400/40 focus:bg-white focus-visible:border-orange-400/60 focus-visible:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:focus:bg-slate-900"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tour-priority" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Priorité (0-99)</Label>
                  <Input
                    id="tour-priority"
                    type="number"
                    min={0}
                    max={99}
                    value={tour?.priority ?? 0}
                    onChange={(e) => onTourChange?.({ priority: normalizePriority(e.target.value) })}
                    onBlur={(e) => {
                      const clamped = normalizePriority(e.target.value);
                      if (String(clamped) !== e.target.value) {
                        onTourChange?.({ priority: clamped });
                      }
                    }}
                    className="h-9 border-slate-300 bg-white/90 text-slate-700 placeholder:text-slate-500 transition-colors hover:border-orange-400/40 focus:bg-white focus-visible:border-orange-400/60 focus-visible:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:focus:bg-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tour-active" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Statut</Label>
                  <Select
                    value={tour?.isActive === false ? 'inactive' : 'active'}
                    onValueChange={(value) => onTourChange?.({ isActive: value === 'active' })}
                  >
                    <SelectTrigger
                      id="tour-active"
                      className="h-9 w-full rounded-md border-slate-300 bg-white/90 pl-3 pr-3 text-sm font-medium text-slate-700 transition-colors hover:border-orange-400/40 focus-visible:ring-orange-400/20 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            tour?.isActive === false ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                        />
                        <SelectValue placeholder="Statut" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]">
                      <SelectItem value="active" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Actif</SelectItem>
                      <SelectItem value="inactive" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Description Section */}
          <div className="space-y-1.5 md:col-span-4 lg:col-span-3">
            <Label htmlFor="tour-description" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Description (Optionnelle)</Label>
            <Textarea
              id="tour-description"
              value={tour?.description ?? ''}
              onChange={(e) => onTourChange?.({ description: e.target.value })}
              placeholder="Décrivez brièvement l'objectif de ce parcours..."
              className="min-h-[72px] resize-none border-slate-300 bg-white/90 text-slate-700 placeholder:text-slate-500 transition-colors hover:border-orange-400/40 focus:bg-white focus-visible:border-orange-400/60 focus-visible:ring-orange-400/20 dark:border-white/15 dark:bg-slate-900/55 dark:text-slate-100 dark:focus:bg-slate-900"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
