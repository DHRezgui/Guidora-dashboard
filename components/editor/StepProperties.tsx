'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Step, PositionType, ActionType } from '@/lib/types';

interface StepPropertiesProps {
  step: Step | null;
  onUpdate: (step: Step) => void;
}

export default function StepProperties({ step, onUpdate }: StepPropertiesProps) {
  const [formData, setFormData] = useState<Partial<Step>>(step || {});

  useEffect(() => {
    setFormData(step || {});
  }, [step]);

  const handleInputChange = (field: keyof Step, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate(updatedData as Step);
  };

  if (!step) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Icons.settings className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucune étape sélectionnée</h3>
          <p className="text-sm text-muted-foreground">
            Cliquez sur une étape dans la zone de conception pour modifier ses propriétés
          </p>
        </div>
      </div>
    );
  }

  const POSITION_OPTIONS: { value: PositionType; label: string }[] = [
    { value: 'TOP', label: 'Haut' },
    { value: 'BOTTOM', label: 'Bas' },
    { value: 'LEFT', label: 'Gauche' },
    { value: 'RIGHT', label: 'Droite' },
    { value: 'CENTER', label: 'Centre' },
    { value: 'TOP_LEFT', label: 'Haut gauche' },
    { value: 'TOP_RIGHT', label: 'Haut droite' },
    { value: 'BOTTOM_LEFT', label: 'Bas gauche' },
    { value: 'BOTTOM_RIGHT', label: 'Bas droite' },
  ];

  const ACTION_OPTIONS: { value: ActionType; label: string }[] = [
    { value: 'CLICK', label: 'Clic' },
    { value: 'HOVER', label: 'Survol' },
    { value: 'SCROLL', label: 'Défilement' },
    { value: 'NEXT', label: 'Suivant' },
    { value: 'SKIP', label: 'Passer' },
    { value: 'COMPLETE', label: 'Terminer' },
  ];

  return (
    <div className="p-4 overflow-y-auto h-full">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Propriétés de l'étape</CardTitle>
          <CardDescription>
            Modifiez les paramètres de l'étape sélectionnée
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Titre */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Titre de l'étape"
            />
          </div>

          {/* Contenu */}
          <div className="space-y-2">
            <Label htmlFor="content">Contenu</Label>
            <Textarea
              id="content"
              value={formData.content || ''}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Description de l'étape..."
              rows={4}
            />
          </div>

          {/* Sélecteur cible */}
          <div className="space-y-2">
            <Label htmlFor="targetSelector">Sélecteur CSS</Label>
            <Input
              id="targetSelector"
              value={formData.targetSelector || ''}
              onChange={(e) => handleInputChange('targetSelector', e.target.value)}
              placeholder="#element-id ou .class-name"
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour une étape globale
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stepTargetUrl">Route de l&apos;etape (optionnel)</Label>
            <Input
              id="stepTargetUrl"
              value={formData.stepTargetUrl || ''}
              onChange={(e) => handleInputChange('stepTargetUrl', e.target.value)}
              placeholder="/dashboard/billing"
            />
            <p className="text-xs text-muted-foreground">
              Renseignez cette valeur pour un parcours multi-page.
            </p>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Select
              value={formData.position ?? ''}
              onValueChange={(value) => handleInputChange('position', value as PositionType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une position" />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                side="bottom"
                sideOffset={8}
              >
                {POSITION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action */}
          <div className="space-y-2">
            <Label htmlFor="action">Action déclenchante</Label>
            <Select
              value={formData.action ?? ''}
              onValueChange={(value) => handleInputChange('action', value as ActionType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une action" />
              </SelectTrigger>
              <SelectContent
                alignItemWithTrigger={false}
                side="bottom"
                sideOffset={8}
              >
                {ACTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Options booléennes */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sauter autorisé</Label>
                <p className="text-xs text-muted-foreground">
                  L'utilisateur peut passer cette étape
                </p>
              </div>
              <Checkbox
                checked={formData.skipAllowed !== false}
                onCheckedChange={(checked) => handleInputChange('skipAllowed', checked === true)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mettre en évidence</Label>
                <p className="text-xs text-muted-foreground">
                  Mettre l'élément en surbrillance
                </p>
              </div>
              <Checkbox
                checked={formData.highlightElement !== false}
                onCheckedChange={(checked) => handleInputChange('highlightElement', checked === true)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // Réinitialiser les données
                setFormData(step);
                onUpdate(step);
              }}
            >
              <Icons.refresh className="mr-2 h-4 w-4" />
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
