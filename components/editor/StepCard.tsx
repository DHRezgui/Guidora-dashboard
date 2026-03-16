'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/ui/icons';
import { Step } from '@/lib/types';

interface StepCardProps {
  step: Step;
  index: number;
  totalSteps: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isPreviewMode: boolean;
  dragHandleProps?: any;
}

export function StepCard({
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
  dragHandleProps,
}: StepCardProps) {
  const getIconForAction = (action: string) => {
    switch (action) {
      case 'CLICK': return Icons.cursorClick;
      case 'HOVER': return Icons.mousePointer;
      case 'SCROLL': return Icons.scroll;
      case 'NEXT': return Icons.arrowRight;
      case 'COMPLETE': return Icons.checkCircle;
      case 'SKIP': return Icons.skipForward;
      default: return Icons.info;
    }
  };

  const ActionIcon = getIconForAction(step.action || 'NEXT');

  return (
    <Card
      className={cn(
        'transition-all cursor-pointer',
        isSelected && !isPreviewMode ? 'ring-2 ring-primary shadow-lg' : '',
        isPreviewMode ? 'bg-muted/50 cursor-default' : 'hover:shadow-md'
      )}
      onClick={isPreviewMode ? undefined : onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {!isPreviewMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-move hover:bg-muted shrink-0"
                  {...dragHandleProps}
                >
                  <Icons.drag className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
              
              <Badge variant="outline" className="font-medium">
                Étape {index}/{totalSteps}
              </Badge>
              
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50 hidden md:block" />
              
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ActionIcon className="h-4 w-4" />
                <span className="text-sm capitalize hidden md:inline">
                  {step.action?.toLowerCase().replace('_', ' ')}
                </span>
              </div>
              
              {step.highlightElement && (
                <Badge variant="secondary" className="hidden md:flex">
                  <Icons.target className="mr-1 h-3 w-3" />
                  Highlight
                </Badge>
              )}
              
              {!step.skipAllowed && (
                <Badge variant="destructive" className="hidden md:flex">
                  Obligatoire
                </Badge>
              )}
            </div>
            
            <CardTitle className="text-lg line-clamp-1">{step.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {step.content}
            </CardDescription>
          </div>
          
          {!isPreviewMode && (
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                disabled={index === 1}
                className="h-8 w-8 p-0"
                title="Monter"
              >
                <Icons.arrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                disabled={index === totalSteps}
                className="h-8 w-8 p-0"
                title="Descendre"
              >
                <Icons.arrowDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate?.();
                }}
                className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600"
                title="Dupliquer"
              >
                <Icons.copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Supprimer"
              >
                <Icons.trash className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      {(step.targetSelector || step.position) && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {step.targetSelector && (
              <div className="flex items-center gap-1.5">
                <Icons.code className="h-3 w-3" />
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                  {step.targetSelector}
                </span>
              </div>
            )}
            {step.position && (
              <div className="flex items-center gap-1.5">
                <Icons.navigation className="h-3 w-3" />
                <span className="capitalize">{step.position.toLowerCase()}</span>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
