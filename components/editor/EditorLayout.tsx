'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Toolbar from './Toolbar';
import StepPalette from './StepPalette';
import StepCanvas from './StepCanvas';
import StepProperties from './StepProperties';
import TourSimulator from './TourSimulator';
import { GuidedTour, Step } from '@/lib/types';

interface EditorLayoutProps {
  tour?: GuidedTour;
  onSave?: (tour: GuidedTour) => void;
  onBack?: () => void;
  initialSelectedStepIndex?: number | null;
}

export default function EditorLayout({ tour, onSave, onBack, initialSelectedStepIndex }: EditorLayoutProps) {
  const [steps, setSteps] = useState<Step[]>(tour?.steps ?? []);
  
  // History State for Undo/Redo
  const [history, setHistory] = useState<{stack: Step[][], index: number}>({
    stack: [tour?.steps ?? []],
    index: 0
  });

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
    const initialSteps = tour?.steps ?? [];
    setSteps(initialSteps);
    setHistory({ stack: [initialSteps], index: 0 });
    setTourMeta({
      name: tour?.name,
      description: tour?.description,
      targetUrl: tour?.targetUrl,
      isActive: tour?.isActive,
      priority: tour?.priority,
      triggerConditions: tour?.triggerConditions,
    });
    
    if (initialSelectedStepIndex !== undefined && initialSelectedStepIndex !== null && initialSelectedStepIndex >= 0 && initialSelectedStepIndex < initialSteps.length) {
      setSelectedStep(initialSteps[initialSelectedStepIndex]);
    } else {
      setSelectedStep(null);
    }
  }, [tour?.id]); // Note: intentional missing initialSelectedStepIndex dependency to only do it once on load

  const commitToHistory = useCallback((newSteps: Step[]) => {
    setHistory(prev => {
      const newStack = prev.stack.slice(0, prev.index + 1);
      newStack.push(newSteps);
      return { stack: newStack, index: newStack.length - 1 };
    });
  }, []);

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.index > 0) {
        const newIndex = prev.index - 1;
        setSteps(prev.stack[newIndex]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory(prev => {
      if (prev.index < prev.stack.length - 1) {
        const newIndex = prev.index + 1;
        setSteps(prev.stack[newIndex]);
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ne pas annuler/retablir si on est dans un champ texte (input, textarea, etc.)
      const isInputFocused =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isInputFocused) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

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
    setSteps((prev) => {
      const nextSteps = prev.map((step) =>
        step.id === updatedStep.id
          ? {
              ...updatedStep,
              orderIndex: step.orderIndex,
            }
          : step
      );
      commitToHistory(nextSteps);
      return nextSteps;
    });
    setSelectedStep(updatedStep);
  };

  const handleStepsChange = (nextSteps: Step[]) => {
    setSteps(nextSteps);
    commitToHistory(nextSteps);

    if (!selectedStep) {
      return;
    }

    const refreshedSelection = nextSteps.find((step) => step.id === selectedStep.id) || null;
    setSelectedStep(refreshedSelection);
  };

  const handleAddStepFromPalette = (template: Partial<Step>) => {
    const nextStep: Step = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      orderIndex: 0,
      title: template.title || 'Nouvelle etape',
      content: template.content || "Contenu de l'etape",
      position: template.position || 'BOTTOM',
      action: template.action || 'NEXT',
      skipAllowed: template.skipAllowed ?? true,
      highlightElement: template.highlightElement ?? false,
      targetSelector: template.targetSelector || '',
    };

    setSteps((prev) => {
      const nextSteps = [...prev, nextStep].map((step, index) => ({ ...step, orderIndex: index + 1 }));
      commitToHistory(nextSteps);
      return nextSteps;
    });
    setSelectedStep(nextStep);
  };

  const handleAddMultipleStepsFromPalette = (templates: Partial<Step>[]) => {
    const newSteps = templates.map((template, index) => ({
      id: `step-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 9)}`,
      orderIndex: 0,
      title: template.title || 'Nouvelle etape',
      content: template.content || "Contenu de l'etape",
      position: template.position || 'BOTTOM',
      action: template.action || 'NEXT',
      skipAllowed: template.skipAllowed ?? true,
      highlightElement: template.highlightElement ?? false,
      targetSelector: template.targetSelector || '',
    }));

    setSteps((prev) => {
      const nextSteps = [...prev, ...newSteps].map((step, idx) => ({ ...step, orderIndex: idx + 1 }));
      commitToHistory(nextSteps);
      return nextSteps;
    });
    // Optional: select the last inserted step
    if (newSteps.length > 0) {
      setSelectedStep(newSteps[newSteps.length - 1]);
    }
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
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.index > 0}
        canRedo={history.index < history.stack.length - 1}
      />

      {/* Main content */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-muted lg:flex-row">
        {/* Left sidebar - Step Palette */}
        {!isPreviewMode && (
          <div className="w-full border-b bg-background lg:w-72 lg:border-b-0 lg:border-r">
            <StepPalette 
              onAddStep={handleAddStepFromPalette} 
              onAddMultipleSteps={handleAddMultipleStepsFromPalette}
            />
          </div>
        )}

        {/* Center - Canvas */}
        <div className={`min-h-[45vh] flex-1 overflow-auto p-4 lg:p-0 ${isPreviewMode ? 'bg-slate-50' : ''}`}>
          {isPreviewMode ? (
            <div className="h-full p-4">
              <TourSimulator 
                steps={steps} 
                simulationContext={composedTour.simulationContext}
                tourName={composedTour.name}
                targetUrl={composedTour.targetUrl}
                onExitPreview={() => setIsPreviewMode(false)} 
              />
            </div>
          ) : (
            <StepCanvas
              tour={composedTour}
              steps={steps}
              selectedStep={selectedStep}
              onSelectStep={handleSelectStep}
              onStepsChange={handleStepsChange}
              isPreviewMode={isPreviewMode}
            />
          )}
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
