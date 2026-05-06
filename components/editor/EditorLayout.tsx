'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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

const TEXT_EDIT_GROUP_WINDOW_MS = 900;

type EditorSnapshot = {
  steps: Step[];
  tourMeta: Partial<GuidedTour>;
};

function isGroupedTextEditChange(previous: EditorSnapshot, next: EditorSnapshot): { isTextEdit: boolean; key: string | null } {
  const prevMetaJson = JSON.stringify(previous.tourMeta);
  const nextMetaJson = JSON.stringify(next.tourMeta);
  const metaChanged = prevMetaJson !== nextMetaJson;

  if (metaChanged && JSON.stringify(previous.steps) === JSON.stringify(next.steps)) {
    const editableMetaKeys: Array<keyof GuidedTour> = ['name', 'description', 'targetUrl'];
    const changedKeys = editableMetaKeys.filter(
      (key) => JSON.stringify(previous.tourMeta[key]) !== JSON.stringify(next.tourMeta[key]),
    );

    const hasOnlyEditableMetaChanges =
      changedKeys.length > 0 &&
      Object.keys({ ...previous.tourMeta, ...next.tourMeta }).every((rawKey) => {
        const key = rawKey as keyof GuidedTour;
        if (editableMetaKeys.includes(key)) return true;
        return JSON.stringify(previous.tourMeta[key]) === JSON.stringify(next.tourMeta[key]);
      });

    if (hasOnlyEditableMetaChanges) {
      return { isTextEdit: true, key: `meta:${changedKeys.sort().join(',')}` };
    }
  }

  const prevSteps = previous.steps;
  const nextSteps = next.steps;
  if (prevSteps.length !== nextSteps.length) {
    return { isTextEdit: false, key: null };
  }

  let changedIndex = -1;
  for (let i = 0; i < prevSteps.length; i += 1) {
    if (prevSteps[i].id !== nextSteps[i].id) {
      return { isTextEdit: false, key: null };
    }
    if (JSON.stringify(prevSteps[i]) !== JSON.stringify(nextSteps[i])) {
      if (changedIndex !== -1) {
        return { isTextEdit: false, key: null };
      }
      changedIndex = i;
    }
  }

  if (changedIndex === -1) {
    return { isTextEdit: false, key: null };
  }

  const before = prevSteps[changedIndex];
  const after = nextSteps[changedIndex];
  const textFields: Array<keyof Step> = ['title', 'content', 'targetSelector', 'stepTargetUrl'];

  const nonTextChanged = Object.keys(before).some((rawKey) => {
    const key = rawKey as keyof Step;
    if (textFields.includes(key)) return false;
    return JSON.stringify(before[key]) !== JSON.stringify(after[key]);
  });

  if (nonTextChanged) {
    return { isTextEdit: false, key: null };
  }

  const anyTextFieldChanged = textFields.some((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  if (!anyTextFieldChanged) {
    return { isTextEdit: false, key: null };
  }

  return { isTextEdit: true, key: `step:${before.id}` };
}

export default function EditorLayout({ tour, onSave, onBack, initialSelectedStepIndex }: EditorLayoutProps) {
  const [steps, setSteps] = useState<Step[]>(tour?.steps ?? []);
  const initialTourMeta: Partial<GuidedTour> = {
    name: tour?.name,
    description: tour?.description,
    targetUrl: tour?.targetUrl,
    isActive: tour?.isActive,
    priority: tour?.priority,
    replayPolicy: tour?.replayPolicy,
    replayAfterDays: tour?.replayAfterDays,
    triggerConditions: tour?.triggerConditions,
  };
  
  // History State for Undo/Redo
  const [history, setHistory] = useState<{stack: EditorSnapshot[], index: number}>({
    stack: [{ steps: tour?.steps ?? [], tourMeta: initialTourMeta }],
    index: 0
  });

  const [tourMeta, setTourMeta] = useState<Partial<GuidedTour>>(initialTourMeta);
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const baselineSnapshotRef = useRef<string>('');
  const lastCommitRef = useRef<{ at: number; stepId: string | null; kind: 'text' | 'other' }>({
    at: 0,
    stepId: null,
    kind: 'other',
  });

  useEffect(() => {
    const initialSteps = tour?.steps ?? [];
    setSteps(initialSteps);
    const nextInitialTourMeta: Partial<GuidedTour> = {
      name: tour?.name,
      description: tour?.description,
      targetUrl: tour?.targetUrl,
      isActive: tour?.isActive,
      priority: tour?.priority,
      replayPolicy: tour?.replayPolicy,
      replayAfterDays: tour?.replayAfterDays,
      triggerConditions: tour?.triggerConditions,
    };
    setHistory({ stack: [{ steps: initialSteps, tourMeta: nextInitialTourMeta }], index: 0 });
    setTourMeta(nextInitialTourMeta);
    baselineSnapshotRef.current = JSON.stringify({ steps: initialSteps, tourMeta: nextInitialTourMeta });
    
    if (initialSelectedStepIndex !== undefined && initialSelectedStepIndex !== null && initialSelectedStepIndex >= 0 && initialSelectedStepIndex < initialSteps.length) {
      setSelectedStep(initialSteps[initialSelectedStepIndex]);
    } else {
      setSelectedStep(null);
    }
  }, [tour?.id]); // Note: intentional missing initialSelectedStepIndex dependency to only do it once on load

  const commitToHistory = useCallback((newSnapshot: EditorSnapshot) => {
    setHistory(prev => {
      const currentSnapshot = prev.stack[prev.index] ?? { steps: [], tourMeta: {} };
      const isSameSnapshot = JSON.stringify(currentSnapshot) === JSON.stringify(newSnapshot);

      if (isSameSnapshot) {
        return prev;
      }

      const now = Date.now();
      const groupedEdit = isGroupedTextEditChange(currentSnapshot, newSnapshot);
      const canGroupWithPreviousTextEdit =
        groupedEdit.isTextEdit &&
        lastCommitRef.current.kind === 'text' &&
        lastCommitRef.current.stepId === groupedEdit.key &&
        now - lastCommitRef.current.at <= TEXT_EDIT_GROUP_WINDOW_MS &&
        prev.stack.length > 0;

      const newStack = prev.stack.slice(0, prev.index + 1);
      if (canGroupWithPreviousTextEdit) {
        newStack[newStack.length - 1] = newSnapshot;
        lastCommitRef.current.at = now;
        lastCommitRef.current.stepId = groupedEdit.key;
        lastCommitRef.current.kind = 'text';
        return { stack: newStack, index: newStack.length - 1 };
      }

      newStack.push(newSnapshot);
      lastCommitRef.current.at = now;
      lastCommitRef.current.stepId = groupedEdit.key;
      lastCommitRef.current.kind = groupedEdit.isTextEdit ? 'text' : 'other';
      return { stack: newStack, index: newStack.length - 1 };
    });
  }, []);

  const handleUndo = useCallback(() => {
    const selectedStepId = selectedStep?.id;
    setHistory(prev => {
      if (prev.index > 0) {
        const newIndex = prev.index - 1;
        const restoredSnapshot = prev.stack[newIndex];
        const restoredSteps = restoredSnapshot.steps;
        setSteps(restoredSteps);
        setTourMeta(restoredSnapshot.tourMeta);
        setSelectedStep(
          selectedStepId
            ? restoredSteps.find((step) => step.id === selectedStepId) || null
            : null,
        );
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  }, [selectedStep?.id]);

  const handleRedo = useCallback(() => {
    const selectedStepId = selectedStep?.id;
    setHistory(prev => {
      if (prev.index < prev.stack.length - 1) {
        const newIndex = prev.index + 1;
        const restoredSnapshot = prev.stack[newIndex];
        const restoredSteps = restoredSnapshot.steps;
        setSteps(restoredSteps);
        setTourMeta(restoredSnapshot.tourMeta);
        setSelectedStep(
          selectedStepId
            ? restoredSteps.find((step) => step.id === selectedStepId) || null
            : null,
        );
        return { ...prev, index: newIndex };
      }
      return prev;
    });
  }, [selectedStep?.id]);

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

  const hasUnsavedChanges = useMemo(() => {
    const currentSnapshot = JSON.stringify({ steps, tourMeta });
    return currentSnapshot !== baselineSnapshotRef.current;
  }, [steps, tourMeta]);

  const handleBackWithGuard = useCallback(() => {
    if (!onBack) return;
    if (!hasUnsavedChanges) {
      onBack();
      return;
    }

    const shouldLeave = window.confirm(
      'Vous avez des modifications non enregistrees. Voulez-vous vraiment quitter sans enregistrer ?',
    );
    if (shouldLeave) {
      onBack();
    }
  }, [hasUnsavedChanges, onBack]);

  const handleTourChange = (changes: Partial<GuidedTour>) => {
    setTourMeta((prev) => {
      const nextTourMeta = { ...prev, ...changes };
      commitToHistory({ steps, tourMeta: nextTourMeta });
      return nextTourMeta;
    });
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
      commitToHistory({ steps: nextSteps, tourMeta });
      return nextSteps;
    });
    setSelectedStep(updatedStep);
  };

  const handleStepsChange = (nextSteps: Step[]) => {
    setSteps(nextSteps);
    commitToHistory({ steps: nextSteps, tourMeta });

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
      commitToHistory({ steps: nextSteps, tourMeta });
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
      commitToHistory({ steps: nextSteps, tourMeta });
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
        onBack={onBack ? handleBackWithGuard : undefined}
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
