'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { StepCard } from './StepCard';
import { Step } from '@/lib/types';

interface StepDraggableProps {
  step: Step;
  index: number;
  totalSteps: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isPreviewMode: boolean;
}

export function StepDraggable({
  step,
  index,
  totalSteps,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isPreviewMode,
}: StepDraggableProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 100 : 1,
    cursor: isPreviewMode ? 'default' : 'move',
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(
      'transition-all',
      isDragging && 'scale-[1.02] shadow-lg z-50',
      isSelected && !isPreviewMode && 'ring-2 ring-primary shadow-lg'
    )}>
      <StepCard
        step={step}
        index={index}
        totalSteps={totalSteps}
        isSelected={isSelected}
        onSelect={onSelect}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        isPreviewMode={isPreviewMode}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </div>
  );
}
