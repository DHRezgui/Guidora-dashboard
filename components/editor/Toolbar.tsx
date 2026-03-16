'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  return (
    <div className="border-b bg-white px-6 py-4 shadow-sm">
      <div className="flex flex-col gap-6">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-200">
                <Icons.arrowLeft className="h-4 w-4" />
                Retour
              </Button>
            )}
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <Icons.tours className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 leading-tight">
                  {tour?.name || 'Nouveau parcours'}
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  {tour?.steps?.length || 0} étape(s) configurée(s)
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isPreviewMode && (
              <div className="flex items-center mr-2 border-r border-slate-200 pr-4 gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="h-8 w-8 text-slate-500 hover:text-slate-900"
                  title="Annuler (Ctrl+Z)"
                >
                  <Icons.undo className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="h-8 w-8 text-slate-500 hover:text-slate-900"
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
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-200 shadow-sm'
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
              className="gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition-all"
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
                <Label htmlFor="tour-name" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nom du parcours</Label>
                <Input
                  id="tour-name"
                  value={tour?.name ?? ''}
                  onChange={(e) => onTourChange?.({ name: e.target.value })}
                  placeholder="Ex: Onboarding administrateur"
                  className="h-9 transition-colors bg-slate-50/50 border-slate-200 hover:border-slate-300 focus:bg-white focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tour-url" className="text-xs font-semibold uppercase tracking-wider text-slate-500">URL cible</Label>
                <Input
                  id="tour-url"
                  value={tour?.targetUrl ?? ''}
                  onChange={(e) => onTourChange?.({ targetUrl: e.target.value })}
                  placeholder="/dashboard ou https://..."
                  className="h-9 transition-colors bg-slate-50/50 border-slate-200 hover:border-slate-300 focus:bg-white focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1 grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tour-priority" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Priorité (0-99)</Label>
                  <Input
                    id="tour-priority"
                    type="number"
                    min={0}
                    value={tour?.priority ?? 0}
                    onChange={(e) => onTourChange?.({ priority: Number(e.target.value) || 0 })}
                    className="h-9 transition-colors bg-slate-50/50 border-slate-200 hover:border-slate-300 focus:bg-white focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tour-active" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Statut</Label>
                  <div className="flex h-9 items-center px-3 rounded-md border border-slate-200 bg-slate-50 text-sm font-medium text-slate-600">
                    <div className={`mr-2 h-2 w-2 rounded-full ${tour?.isActive === false ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                    {tour?.isActive === false ? 'Inactif' : 'Actif'}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Description Section */}
          <div className="space-y-1.5 md:col-span-4 lg:col-span-3">
            <Label htmlFor="tour-description" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description (Optionnelle)</Label>
            <Textarea
              id="tour-description"
              value={tour?.description ?? ''}
              onChange={(e) => onTourChange?.({ description: e.target.value })}
              placeholder="Décrivez brièvement l'objectif de ce parcours..."
              className="min-h-[72px] resize-none transition-colors bg-slate-50/50 border-slate-200 hover:border-slate-300 focus:bg-white focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
