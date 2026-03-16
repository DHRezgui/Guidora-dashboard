'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GuidedTour } from '@/lib/types';

interface ToolbarProps {
  tour?: GuidedTour;
  onSave?: (tour: GuidedTour) => void;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
}

export default function Toolbar({
  tour,
  onSave,
  isPreviewMode,
  onTogglePreview,
}: ToolbarProps) {
  return (
    <div className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Icons.tours className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">
                {tour?.name || 'Nouveau parcours'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {tour?.steps?.length || 0} étapes
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Button
              variant={isPreviewMode ? 'default' : 'outline'}
              size="sm"
              onClick={onTogglePreview}
            >
              <Icons.eye className="mr-2 h-4 w-4" />
              {isPreviewMode ? 'Mode édition' : 'Prévisualiser'}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Icons.undo className="mr-2 h-4 w-4" />
            Annuler
          </Button>
          <Button variant="outline" size="sm">
            <Icons.redo className="mr-2 h-4 w-4" />
            Rétablir
          </Button>
          <Button variant="default" size="sm" onClick={() => onSave?.(tour!)}>
            <Icons.save className="mr-2 h-4 w-4" />
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
}
