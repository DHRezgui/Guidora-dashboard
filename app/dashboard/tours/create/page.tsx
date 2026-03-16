'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditorLayout from '@/components/editor/EditorLayout';
import { GuidedTour, GuidedTourSavePayload } from '@/lib/types';
import { getErrorMessage, tourService } from '@/lib/api';
import { toast } from 'sonner';

export default function CreateTourPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tourId = searchParams.get('id');
  const isEditMode = useMemo(() => Boolean(tourId), [tourId]);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tour, setTour] = useState<GuidedTour>({
    name: 'Nouveau parcours',
    targetUrl: '/dashboard',
    steps: [],
  });

  useEffect(() => {
    if (!tourId) {
      setIsLoading(false);
      return;
    }

    const loadTour = async () => {
      try {
        const response = await tourService.getById(tourId);
        if (response.tour) {
          setTour({
            ...response.tour,
            steps: [...(response.tour.steps || [])].sort((a, b) => a.orderIndex - b.orderIndex),
          });
        }
      } catch (error) {
        toast.error('Impossible de charger le parcours', {
          description: getErrorMessage(error, 'Une erreur est survenue au chargement.'),
        });
        router.push('/dashboard/tours');
      } finally {
        setIsLoading(false);
      }
    };

    loadTour();
  }, [router, tourId]);

  const handleSave = async (tourData: GuidedTour) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // Nettoyage complet du payload pour eviter le rejet de class-validator
      const {
        id,
        organizationId,
        organization,
        createdBy,
        createdAt,
        updatedAt,
        ...safeData
      } = tourData as any;

      const payload: GuidedTourSavePayload = {
        ...safeData,
        steps: (tourData.steps || []).map((step: any) => {
          const { id, orderIndex, tourId, createdAt, updatedAt, ...safeStep } = step;
          return safeStep;
        }),
      };

      if (tourId) {
        await tourService.update(tourId, payload);
        toast.success('Parcours mis a jour', {
          description: 'Vos modifications ont ete enregistrees avec succes.',
        });
      } else {
        await tourService.create(payload);
        toast.success('Parcours cree', {
          description: 'Le parcours a ete enregistre avec succes.',
        });
      }

      router.push('/dashboard/tours');
    } catch (error) {
      const message = getErrorMessage(error, 'Impossible de sauvegarder le parcours.');
      setSaveError(message);
      toast.error('Erreur lors de l\'enregistrement', {
        description: message,
        duration: 10000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Chargement du parcours...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {isSaving && (
        <div className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Sauvegarde en cours...
        </div>
      )}
      {saveError && (
        <div className="border-b border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">Enregistrement interrompu</div>
          <div className="mt-1">{saveError}</div>
        </div>
      )}
      <EditorLayout
        tour={tour}
        onSave={handleSave}
        onBack={() => router.push('/dashboard/tours')}
      />
    </div>
  );
}
