'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { Step } from '@/lib/types';

interface StepPaletteProps {
  onAddStep?: (template: Partial<Step>) => void;
  onAddMultipleSteps?: (templates: Partial<Step>[]) => void;
}

const STEP_TEMPLATES: {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'basic' | 'advanced' | 'interactive';
  defaultData: Partial<Step>;
}[] = [
  {
    id: 'tooltip-step',
    title: 'Tooltip',
    description: 'Bulle d\'aide au survol d\'un élément',
    icon: Icons.messageSquare,
    category: 'basic',
    defaultData: {
      title: 'Titre du tooltip',
      content: 'Contenu explicatif du tooltip',
      position: 'BOTTOM',
      action: 'HOVER',
      skipAllowed: true,
      highlightElement: false,
    },
  },
  {
    id: 'modal-step',
    title: 'Modal',
    description: 'Fenêtre modale avec contenu complet',
    icon: Icons.layout,
    category: 'advanced',
    defaultData: {
      title: 'Titre du modal',
      content: 'Contenu détaillé du modal',
      position: 'CENTER',
      action: 'CLICK',
      skipAllowed: true,
      highlightElement: false,
    },
  },
  {
    id: 'highlight-step',
    title: 'Highlight',
    description: 'Mise en évidence d\'un élément',
    icon: Icons.target,
    category: 'interactive',
    defaultData: {
      title: 'Étape importante',
      content: 'Description de l\'élément à mettre en évidence',
      position: 'BOTTOM',
      action: 'NEXT',
      skipAllowed: false,
      highlightElement: true,
    },
  },
  {
    id: 'form-step',
    title: 'Formulaire',
    description: 'Guide pour remplir un formulaire',
    icon: Icons.clipboardList,
    category: 'interactive',
    defaultData: {
      title: 'Remplir le formulaire',
      content: 'Instructions détaillées pour le formulaire',
      position: 'RIGHT',
      action: 'COMPLETE',
      skipAllowed: false,
      highlightElement: true,
    },
  },
  {
    id: 'video-step',
    title: 'Tutoriel vidéo',
    description: 'Vidéo explicative intégrée',
    icon: Icons.video,
    category: 'advanced',
    defaultData: {
      title: 'Tutoriel vidéo',
      content: 'Regardez cette vidéo pour comprendre',
      position: 'CENTER',
      action: 'NEXT',
      skipAllowed: true,
      highlightElement: false,
    },
  },
  {
    id: 'checklist-step',
    title: 'Checklist',
    description: 'Liste de vérification interactive',
    icon: Icons.checkSquare,
    category: 'basic',
    defaultData: {
      title: 'Checklist',
      content: 'Cochez les éléments au fur et à mesure',
      position: 'BOTTOM',
      action: 'NEXT',
      skipAllowed: false,
      highlightElement: false,
    },
  },
];

export default function StepPalette({ onAddStep, onAddMultipleSteps }: StepPaletteProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'basic' | 'advanced' | 'interactive'>('all');

  const filteredSteps = selectedCategory === 'all' 
    ? STEP_TEMPLATES 
    : STEP_TEMPLATES.filter(step => step.category === selectedCategory);

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Icons.layers className="h-5 w-5 text-primary" />
          Étapes disponibles
        </h3>
        <p className="text-sm text-muted-foreground">
          Glissez-déposez une étape dans la zone de conception
        </p>
      </div>

      {/* Filtres par catégorie */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'basic', 'advanced', 'interactive'] as const).map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="shrink-0"
          >
            {category === 'all' && <Icons.grid className="mr-2 h-4 w-4" />}
            {category === 'basic' && <Icons.circle className="mr-2 h-4 w-4" />}
            {category === 'advanced' && <Icons.square className="mr-2 h-4 w-4" />}
            {category === 'interactive' && <Icons.hexagon className="mr-2 h-4 w-4" />}
            {category.charAt(0).toUpperCase() + category.slice(1)}
            <Badge variant="secondary" className="ml-2">
              {category === 'all' 
                ? STEP_TEMPLATES.length 
                : STEP_TEMPLATES.filter(s => s.category === category).length}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Liste des étapes */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {filteredSteps.map((template) => (
          <Card 
            key={template.id} 
            className={cn(
              'border-dashed transition-all cursor-move',
              'hover:border-primary hover:shadow-md',
              'hover:bg-muted/30'
            )}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(
                'application/react-dnd-item',
                JSON.stringify({
                  ...template.defaultData,
                  templateId: template.id,
                })
              );
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={(e) => {
              // Feedback visuel après le drop
              const card = e.currentTarget;
              card.classList.add('animate-pulse');
              setTimeout(() => card.classList.remove('animate-pulse'), 300);
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'p-2 rounded-lg',
                  template.category === 'basic' && 'bg-blue-100',
                  template.category === 'advanced' && 'bg-purple-100',
                  template.category === 'interactive' && 'bg-green-100'
                )}>
                  <template.icon className={cn(
                    'h-5 w-5',
                    template.category === 'basic' && 'text-blue-600',
                    template.category === 'advanced' && 'text-purple-600',
                    template.category === 'interactive' && 'text-green-600'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {template.title}
                    <Badge variant="outline" className="ml-auto">
                      {template.category}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddStep?.(template.defaultData);
                  }}
                >
                  <Icons.plus className="h-4 w-4" />
                  Ajouter rapidement
                </Button>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Icons.info className="h-3 w-3" />
                    Glisser-déposer
                  </span>
                  <Badge variant="secondary">
                    {template.defaultData.action}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="pt-2 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            if (onAddMultipleSteps) {
              onAddMultipleSteps(STEP_TEMPLATES.map(t => t.defaultData));
            } else {
              STEP_TEMPLATES.forEach((template) => onAddStep?.(template.defaultData));
            }
          }}
        >
          <Icons.list className="mr-2 h-4 w-4" />
          Ajouter toutes les étapes
        </Button>
      </div>
    </div>
  );
}
