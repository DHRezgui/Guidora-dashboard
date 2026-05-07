'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditorLayout from '@/components/editor/EditorLayout';
import { GuidedTour, GuidedTourSavePayload } from '@/lib/types';
import { getErrorMessage, tourService } from '@/lib/api';
import { captureSimulationContextFromUrl } from '@/lib/simulation-context';
import { toast } from 'sonner';

const CONCAT_PREFILL_STORAGE_KEY = 'tours.concatPrefill.v1';

function toCopyName(baseName: string, existingNames: Set<string>): string {
  const normalizedBase = (baseName || 'Parcours').trim();
  const candidateBase = `${normalizedBase} (copie)`;
  if (!existingNames.has(candidateBase.toLowerCase())) {
    return candidateBase;
  }

  let index = 2;
  while (existingNames.has(`${candidateBase} ${index}`.toLowerCase())) {
    index += 1;
  }
  return `${candidateBase} ${index}`;
}

function createLocalStepId(index: number): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `dup-step-${crypto.randomUUID()}`;
  }
  return `dup-step-${Date.now()}-${index + 1}`;
}

export default function CreateTourPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tourId = searchParams.get('id');
  const duplicateId = searchParams.get('duplicateId');
  const prefillMode = searchParams.get('prefill');
  const stepQuery = searchParams.get('step');
  const initialSelectedStepIndex = stepQuery ? parseInt(stepQuery, 10) : null;
  const isEditMode = useMemo(() => Boolean(tourId), [tourId]);
  const isDuplicateMode = useMemo(() => Boolean(!tourId && duplicateId), [tourId, duplicateId]);

  const [isLoading, setIsLoading] = useState(isEditMode || isDuplicateMode || prefillMode === 'concat');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const concatPrefillHydratedRef = useRef(false);
  const [tour, setTour] = useState<GuidedTour>({
    name: 'Nouveau parcours',
    targetUrl: '/dashboard',
    steps: [],
  });

  useEffect(() => {
    if (!tourId && !duplicateId && prefillMode !== 'concat') {
      setIsLoading(false);
      return;
    }

    const loadTour = async () => {
      try {
        if (tourId) {
          const response = await tourService.getById(tourId);
          if (response.tour) {
            setTour({
              ...response.tour,
              steps: [...(response.tour.steps || [])].sort((a, b) => a.orderIndex - b.orderIndex),
            });
          }
          return;
        }

        if (duplicateId) {
          const sourceId = duplicateId as string;
          const [sourceResponse, allToursResponse] = await Promise.all([
            tourService.getById(sourceId),
            tourService.getAll(),
          ]);

          const sourceTour = sourceResponse.tour;
          if (!sourceTour) {
            throw new Error('Parcours source introuvable pour duplication.');
          }

          const existingNames = new Set(
            (allToursResponse.tours || []).map((item) => (item.name || '').trim().toLowerCase()),
          );
          const duplicatedName = toCopyName(sourceTour.name || 'Parcours', existingNames);

          setTour({
            ...sourceTour,
            id: undefined,
            name: duplicatedName,
            createdAt: undefined,
            updatedAt: undefined,
            steps: [...(sourceTour.steps || [])]
              .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              .map((step, index) => ({
                ...step,
                id: createLocalStepId(index),
              })),
          });
          return;
        }

        if (prefillMode === 'concat') {
          if (concatPrefillHydratedRef.current) {
            return;
          }
          if (typeof window === 'undefined') {
            throw new Error('Pré-remplissage indisponible côté serveur.');
          }
          const raw = window.sessionStorage.getItem(CONCAT_PREFILL_STORAGE_KEY);
          if (!raw) {
            if (concatPrefillHydratedRef.current) {
              return;
            }
            throw new Error('Aucun parcours concaténé à pré-remplir.');
          }
          const parsed = JSON.parse(raw) as { tour?: GuidedTour; ts?: number };
          if (!parsed?.tour) {
            throw new Error('Pré-remplissage concaténé invalide.');
          }
          setTour({
            ...parsed.tour,
            id: undefined,
            createdAt: undefined,
            updatedAt: undefined,
            steps: [...(parsed.tour.steps || [])]
              .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
              .map((step, index) => ({
                ...step,
                id: createLocalStepId(index),
              })),
          });
          concatPrefillHydratedRef.current = true;
          window.sessionStorage.removeItem(CONCAT_PREFILL_STORAGE_KEY);
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
  }, [router, tourId, duplicateId, prefillMode]);

  const handleSave = async (tourData: GuidedTour) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      let enrichedTourData: GuidedTour = tourData;

      // For manually edited tours, capture a fresh simulation context at save time.
      const preferredSelectors = (tourData.steps || [])
        .map((step) => step.targetSelector)
        .filter((selector): selector is string => Boolean(selector && selector.trim()));

      const capturedContext = await captureSimulationContextFromUrl(tourData.targetUrl, {
        preferredSelectors,
      });
      if (capturedContext) {
        enrichedTourData = {
          ...tourData,
          simulationContext: capturedContext,
        };

        toast.success('Contexte de simulation capturé', {
          description: `${capturedContext.elements?.length || 0} élément(s) détecté(s) pour ${capturedContext.pathname}.`,
        });
      } else {
        toast.warning('Contexte de simulation non capturable', {
          description: 'Le parcours sera enregistré sans snapshot détaillé (fallback debug).',
        });
      }

      // Nettoyage complet du payload pour eviter le rejet de class-validator
      const {
        id,
        organizationId,
        organization,
        createdBy,
        currentResetVersion,
        createdAt,
        updatedAt,
        ...safeData
      } = enrichedTourData as any;

      const payload: GuidedTourSavePayload = {
        ...safeData,
        steps: (enrichedTourData.steps || []).map((step: any) => {
          const { id, orderIndex, tourId, createdAt, updatedAt, concatSourceMeta, ...safeStep } = step;
          return safeStep;
        }),
      };

      if (tourId) {
        await tourService.update(tourId, payload);
        toast.success('Parcours mis à jour', {
          description: 'Vos modifications ont ete enregistrees avec succes.',
        });
      } else {
        await tourService.create(payload);
        toast.success('Parcours créé', {
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
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200">
          Sauvegarde en cours...
        </div>
      )}
      {saveError && (
        <div className="border-b border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-200">
          <div className="font-semibold">Enregistrement interrompu</div>
          <div className="mt-1">{saveError}</div>
        </div>
      )}
      <EditorLayout
        tour={tour}
        onSave={handleSave}
        onBack={() => router.push('/dashboard/tours')}
        initialSelectedStepIndex={initialSelectedStepIndex}
      />
    </div>
  );
}
