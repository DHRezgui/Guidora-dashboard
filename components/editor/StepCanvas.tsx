'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { StepDraggable } from './StepDraggable';
import { Step } from '@/lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { toast } from 'sonner';

interface StepCanvasProps {
  tour?: any;
  steps: Step[];
  selectedStep: Step | null;
  onSelectStep: (step: Step | null) => void;
  onStepsChange: (steps: Step[]) => void;
  isPreviewMode: boolean;
}

export default function StepCanvas({
  tour,
  steps,
  selectedStep,
  onSelectStep,
  onStepsChange,
  isPreviewMode,
}: StepCanvasProps) {
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Configuration des sensors pour dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Gérer le drop d'une nouvelle étape depuis la palette
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isPreviewMode) return;
    const data = e.dataTransfer.getData('application/react-dnd-item');
    if (data) {
      const templateData = JSON.parse(data);
      
      // Déterminer la position d'insertion
      const insertIndex = draggedOverIndex !== null ? draggedOverIndex : steps.length;

      const newStep: Step = {
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        orderIndex: insertIndex + 1,
        title: templateData.title || 'Nouvelle étape',
        content: templateData.content || 'Contenu de l\'étape',
        position: templateData.position || 'BOTTOM',
        action: templateData.action || 'NEXT',
        skipAllowed: templateData.skipAllowed !== undefined ? templateData.skipAllowed : true,
        highlightElement: templateData.highlightElement !== undefined ? templateData.highlightElement : false,
        targetSelector: templateData.targetSelector || '',
      };

      // Insérer à la position spécifiée
      const newSteps = [
        ...steps.slice(0, insertIndex),
        newStep,
        ...steps.slice(insertIndex),
      ].map((step, index) => ({ ...step, orderIndex: index + 1 }));

      onStepsChange(newSteps);
      
      // Feedback utilisateur
      toast.success('✅ Étape ajoutée avec succès', {
        description: `L'étape "${newStep.title}" a été ajoutée à la position ${insertIndex + 1}`,
      });

      // Sélectionner automatiquement la nouvelle étape
      setTimeout(() => onSelectStep(newStep), 100);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isPreviewMode) return;

    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const stepHeight = 100; // Hauteur approximative d'une étape
    const index = Math.floor(y / stepHeight);
    
    setDraggedOverIndex(Math.max(0, Math.min(index, steps.length)));
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  // Gérer le réordonnancement via drag & drop
  const handleDragEnd = (event: DragEndEvent) => {
    if (isPreviewMode) return;
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((step) => step.id === active.id);
      const newIndex = steps.findIndex((step) => step.id === over.id);

      const newSteps = arrayMove(steps, oldIndex, newIndex);
      
      // Mettre à jour les orderIndex
      const reorderedSteps = newSteps.map((step, index) => ({
        ...step,
        orderIndex: index + 1,
      }));

      onStepsChange(reorderedSteps);
      
      toast.info('🔄 Étape déplacée', {
        description: `L'étape a été déplacée à la position ${newIndex + 1}`,
      });
    }
    
    setDraggedOverIndex(null);
  };

  // Gérer le drag over pour l'insertion
  const handleDragOverDnd = (event: DragOverEvent) => {
    if (isPreviewMode) return;
    const { active, over } = event;
    
    if (active.data.current?.type === 'palette-item') {
      // Insertion depuis la palette
      if (over) {
        const index = steps.findIndex((step) => step.id === over.id);
        if (index !== -1) {
          setDraggedOverIndex(index);
        }
      }
    }
  };

  const handleDeleteStep = (stepId: string, stepTitle: string) => {
    const newSteps = steps.filter((s) => s.id !== stepId);
    // Réordonner les indices
    const reorderedSteps = newSteps.map((step, index) => ({
      ...step,
      orderIndex: index + 1,
    }));
    onStepsChange(reorderedSteps);
    
    if (selectedStep?.id === stepId) {
      onSelectStep(null);
    }
    
    toast.success('🗑️ Étape supprimée', {
      description: `L'étape "${stepTitle}" a été supprimée`,
    });
  };

  const handleDuplicateStep = (step: Step) => {
    const newStep: Step = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderIndex: step.orderIndex + 1,
      title: `${step.title} (copie)`,
    };

    const insertIndex = steps.findIndex((s) => s.id === step.id) + 1;
    const newSteps = [
      ...steps.slice(0, insertIndex),
      newStep,
      ...steps.slice(insertIndex),
    ].map((s, index) => ({ ...s, orderIndex: index + 1 }));

    onStepsChange(newSteps);
    onSelectStep(newStep);
    
    toast.success('📋 Étape dupliquée', {
      description: `L'étape "${step.title}" a été dupliquée`,
    });
  };

  const handleInsertStep = (position: number) => {
    const newStep: Step = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      orderIndex: position + 1,
      title: 'Nouvelle étape',
      content: 'Contenu de l\'étape',
      position: 'BOTTOM',
      action: 'NEXT',
      skipAllowed: true,
      highlightElement: false,
      targetSelector: '',
    };

    const newSteps = [
      ...steps.slice(0, position),
      newStep,
      ...steps.slice(position),
    ].map((step, index) => ({ ...step, orderIndex: index + 1 }));

    onStepsChange(newSteps);
    onSelectStep(newStep);
    
    toast.success('➕ Étape insérée', {
      description: `Une nouvelle étape a été insérée à la position ${position + 1}`,
    });
  };

  const handleMoveStep = (stepId: string, direction: 'up' | 'down') => {
    const stepIndex = steps.findIndex((s) => s.id === stepId);
    if (direction === 'up' && stepIndex > 0) {
      const newSteps = [...steps];
      [newSteps[stepIndex], newSteps[stepIndex - 1]] = [newSteps[stepIndex - 1], newSteps[stepIndex]];
      const reorderedSteps = newSteps.map((step, index) => ({
        ...step,
        orderIndex: index + 1,
      }));
      onStepsChange(reorderedSteps);
      
      toast.info('⬆️ Étape déplacée vers le haut');
    } else if (direction === 'down' && stepIndex < steps.length - 1) {
      const newSteps = [...steps];
      [newSteps[stepIndex], newSteps[stepIndex + 1]] = [newSteps[stepIndex + 1], newSteps[stepIndex]];
      const reorderedSteps = newSteps.map((step, index) => ({
        ...step,
        orderIndex: index + 1,
      }));
      onStepsChange(reorderedSteps);
      
      toast.info('⬇️ Étape déplacée vers le bas');
    }
  };

  const handleClearCanvas = () => {
    onStepsChange([]);
    onSelectStep(null);
    toast.success('🧹 Zone de conception vidée');
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Icons.layout className="h-7 w-7 text-primary" />
              Zone de conception
            </h2>
            <p className="text-muted-foreground mt-1">
              Glissez les étapes ici pour construire votre parcours
            </p>
          </div>
          
          {steps.length > 0 && (
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Icons.list className="mr-2 h-4 w-4" />
              {steps.length} étape{steps.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOverDnd}
      >
        <SortableContext
          items={steps.map((step) => step.id)}
          strategy={verticalListSortingStrategy}
        >
          <Card
            ref={canvasRef}
            data-testid="step-canvas-dropzone"
            className={cn(
              'flex min-h-[600px] flex-1 flex-col border-2 transition-all overflow-y-auto',
              isPreviewMode 
                ? 'border-transparent bg-transparent shadow-none' 
                : 'border-dashed border-muted hover:border-primary'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <CardContent className="flex flex-1 flex-col p-4 md:p-8">
              {steps.length === 0 ? (
                <div className="mx-auto flex h-full w-full max-w-2xl flex-1 flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 animate-bounce">
                    <Icons.plus className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="mb-2 text-2xl font-semibold">Aucune étape ajoutée</h3>
                  <p className="mb-6 max-w-xl text-base text-muted-foreground">
                    Glissez une étape depuis la palette à gauche pour commencer, ou cliquez sur le bouton ci-dessous pour ajouter une étape rapidement.
                  </p>
                  {!isPreviewMode && (
                    <Button 
                      data-testid="add-step-empty-btn"
                      onClick={() => handleInsertStep(0)}
                      size="lg"
                      className="gap-2 px-8"
                    >
                      <Icons.plus className="h-4 w-4" />
                      Ajouter une étape
                    </Button>
                  )}
                  {!isPreviewMode && (
                    <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                      <Icons.drag className="h-5 w-5" />
                      <span>Glisser-déposer depuis la palette</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6 relative">
                  {/* Overlay empêchant les interactions globales du fond en prévisualisation */}
                  {isPreviewMode && (
                    <div className="absolute inset-0 z-[-1] bg-transparent" />
                  )}
                  
                  {/* Zone d'insertion au début */}
                  {!isPreviewMode && (
                    <div 
                      className={cn(
                        'h-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer',
                        draggedOverIndex === 0 ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
                      )}
                      onClick={() => handleInsertStep(0)}
                    >
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        <Icons.plus className="mr-2 h-4 w-4" />
                        Insérer une étape ici
                      </div>
                    </div>
                  )}

                  {steps.map((step, index) => (
                    <div key={step.id} className={isPreviewMode ? "space-y-4" : "space-y-6"}>
                      <StepDraggable
                        step={step}
                        index={index + 1}
                        totalSteps={steps.length}
                        isSelected={selectedStep?.id === step.id}
                        onSelect={() => onSelectStep(step)}
                        onDelete={() => handleDeleteStep(step.id, step.title)}
                        onDuplicate={() => handleDuplicateStep(step)}
                        onMoveUp={() => handleMoveStep(step.id, 'up')}
                        onMoveDown={() => handleMoveStep(step.id, 'down')}
                        isPreviewMode={isPreviewMode}
                      />
                      
                      {/* Zone d'insertion entre les étapes */}
                      {!isPreviewMode && index < steps.length - 1 && (
                        <div 
                          className={cn(
                            'h-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer',
                            draggedOverIndex === index + 1 ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
                          )}
                          onClick={() => handleInsertStep(index + 1)}
                        >
                          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                            <Icons.plus className="mr-2 h-4 w-4" />
                            Insérer une étape ici
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Zone d'insertion à la fin */}
                  {!isPreviewMode && (
                    <div 
                      className={cn(
                        'h-8 border-2 border-dashed rounded-lg transition-colors cursor-pointer',
                        draggedOverIndex === steps.length ? 'border-primary bg-primary/10' : 'border-muted hover:border-primary/50'
                      )}
                      onClick={() => handleInsertStep(steps.length)}
                    >
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        <Icons.plus className="mr-2 h-4 w-4" />
                        Ajouter une étape à la fin
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </SortableContext>
      </DndContext>

      {!isPreviewMode && steps.length > 0 && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearCanvas}
          >
            <Icons.trash className="mr-2 h-4 w-4" />
            Vider la zone
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            // Exporter les étapes
            console.log('Exporter:', steps);
            toast.info('📋 Étapes exportées dans la console');
          }}>
            <Icons.download className="mr-2 h-4 w-4" />
            Exporter
          </Button>
        </div>
      )}
    </div>
  );
}
