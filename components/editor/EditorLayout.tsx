'use client';

import { useEffect, useMemo, useState } from 'react';
import Toolbar from './Toolbar';
import StepPalette from './StepPalette';
import StepCanvas from './StepCanvas';
import StepProperties from './StepProperties';
import { GuidedTour, Step } from '@/lib/types';

interface EditorLayoutProps {
  tour?: GuidedTour;
  onSave?: (tour: GuidedTour) => void;
  onBack?: () => void;
}

export default function EditorLayout({ tour, onSave, onBack }: EditorLayoutProps) {
  const [steps, setSteps] = useState<Step[]>(tour?.steps ?? []);
  const [tourMeta, setTourMeta] = useState<Partial<GuidedTour>>({
    name: tour?.name,
    description: tour?.description,
    targetUrl: tour?.targetUrl,
    isActive: tour?.isActive,
    priority: tour?.priority,
    triggerConditions: tour?.triggerConditions,
  });
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    setSteps(tour?.steps ?? []);
    setTourMeta({
      name: tour?.name,
      description: tour?.description,
      targetUrl: tour?.targetUrl,
      isActive: tour?.isActive,
      priority: tour?.priority,
      triggerConditions: tour?.triggerConditions,
    });
    setSelectedStep(null);
  }, [tour?.id]);

  const composedTour = useMemo<GuidedTour>(
    () => ({
      name: tour?.name || 'Nouveau parcours',
      targetUrl: tour?.targetUrl || '/dashboard',
      ...tour,
      ...tourMeta,
      steps,
    }),
    [tour, tourMeta, steps]
  );

  const handleTourChange = (changes: Partial<GuidedTour>) => {
    setTourMeta((prev) => ({ ...prev, ...changes }));
  };

  const handleSelectStep = (step: Step | null) => {
    setSelectedStep(step);
  };

  const handleUpdateStep = (updatedStep: Step) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === updatedStep.id
          ? {
              ...updatedStep,
              orderIndex: step.orderIndex,
            }
          : step
      )
    );
    setSelectedStep(updatedStep);
  };

  const handleStepsChange = (nextSteps: Step[]) => {
    setSteps(nextSteps);

    if (!selectedStep) {
      return;
    }

    const refreshedSelection = nextSteps.find((step) => step.id === selectedStep.id) || null;
    setSelectedStep(refreshedSelection);
  };

  const handleAddStepFromPalette = (template: Partial<Step>) => {
    const nextStep: Step = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orderIndex: 0, // recalculated below
      title: template.title || 'Nouvelle etape',
      content: template.content || "Contenu de l'etape",
      position: template.position || 'BOTTOM',
      action: template.action || 'NEXT',
      skipAllowed: template.skipAllowed ?? true,
      highlightElement: template.highlightElement ?? false,
      targetSelector: template.targetSelector || '',
    };

    // Use functional update so rapid successive calls (e.g. "add all") chain correctly
    setSteps((prev) =>
      [...prev, nextStep].map((step, index) => ({ ...step, orderIndex: index + 1 }))
    );
    setSelectedStep(nextStep);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <Toolbar
        tour={composedTour}
        onSave={onSave}
        onTourChange={handleTourChange}
        onBack={onBack}
        isPreviewMode={isPreviewMode}
        onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
      />

      {/* Main content */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-muted lg:flex-row">
        {/* Left sidebar - Step Palette */}
        {!isPreviewMode && (
          <div className="w-full border-b bg-background lg:w-72 lg:border-b-0 lg:border-r">
            <StepPalette onAddStep={handleAddStepFromPalette} />
          </div>
        )}

        {/* Center - Canvas */}
        <div className={`min-h-[45vh] flex-1 overflow-auto ${isPreviewMode ? 'bg-slate-50' : ''}`}>
          <StepCanvas
            tour={composedTour}
            steps={steps}
            selectedStep={selectedStep}
            onSelectStep={handleSelectStep}
            onStepsChange={handleStepsChange}
            isPreviewMode={isPreviewMode}
          />
        </div>

        {/* Right sidebar - Properties */}
        {!isPreviewMode && (
          <div className="w-full border-t bg-background lg:w-96 lg:border-l lg:border-t-0">
            <StepProperties
              step={selectedStep}
              onUpdate={handleUpdateStep}
            />
          </div>
        )}
      </div>
    </div>
  );
}
