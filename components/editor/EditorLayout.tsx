'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Toolbar from './Toolbar';
import StepPalette from './StepPalette';
import StepCanvas from './StepCanvas';
import StepProperties from './StepProperties';
import { GuidedTour, Step } from '@/lib/types';

interface EditorLayoutProps {
  tour?: GuidedTour;
  onSave?: (tour: GuidedTour) => void;
}

export default function EditorLayout({ tour, onSave }: EditorLayoutProps) {
  const [selectedStep, setSelectedStep] = useState<Step | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const handleSelectStep = (step: Step | null) => {
    setSelectedStep(step);
  };

  const handleUpdateStep = (updatedStep: Step) => {
    setSelectedStep(updatedStep);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <Toolbar
        tour={tour}
        onSave={onSave}
        isPreviewMode={isPreviewMode}
        onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden bg-muted">
        {/* Left sidebar - Step Palette */}
        <div className="w-64 border-r bg-background">
          <StepPalette />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-auto">
          <StepCanvas
            tour={tour}
            selectedStep={selectedStep}
            onSelectStep={handleSelectStep}
            onUpdateStep={handleUpdateStep}
            isPreviewMode={isPreviewMode}
          />
        </div>

        {/* Right sidebar - Properties */}
        <div className="w-80 border-l bg-background">
          <StepProperties
            step={selectedStep}
            onUpdate={handleUpdateStep}
          />
        </div>
      </div>
    </div>
  );
}
