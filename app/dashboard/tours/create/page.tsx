'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EditorLayout from '@/components/editor/EditorLayout';
import { GuidedTour, GuidedTourSavePayload } from '@/lib/types';
import { getErrorMessage, authService, tourService } from '@/lib/api';
import { captureSimulationContextFromUrl } from '@/lib/simulation-context';
import { toast } from 'sonner';
import { getDashboardRole, canCreateTours } from '@/lib/dashboard-roles';
import { buildTourSavePayload, prepareTourCloneFromSource } from '@/lib/tour-details';
import {
  canOpenTourEditor,
  isDeveloperLabEditMode,
  pickDeveloperLabTourSavePayload,
} from '@/lib/tour-lab';
import { canEditTourWithGrants, canForkTour, isTourEditorReadOnly } from '@/lib/tour-sandbox';
import {
  canToggleSandboxTourActive,
  isTourSandboxTestActive,
  omitSandboxTestActivationFromSavePayload,
} from '@/lib/tour-sandbox';
import { readSessionUser } from '@/lib/session-user';
import { useTourEditLock } from '@/lib/use-tour-edit-lock';
import { isTourEditLockHeldByMe, tourRequiresEditLock } from '@/lib/tour-edit-lock';
import { TourEditLockScreen } from '@/components/tours/TourEditLockScreen';
import {
  clearConcatWorkspaceSession,
  CONCAT_PREFILL_STORAGE_KEY,
} from '@/lib/tour-concat';
import { DEFAULT_FAQ_PROJECT_KEY } from '@/lib/faq-project';
import { toursListReturnHref } from '@/lib/project';
import {
  applyTourProjectScope,
  ensureTourSaveProjectScope,
  isGenericProjectFlowVersion,
  readTourFlowVersion,
} from '@/lib/tour-project-scope';

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

function CreateTourPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tourId = searchParams.get('id');
  const accessParam = searchParams.get('access');
  const duplicateId = searchParams.get('duplicateId');
  const prefillMode = searchParams.get('prefill');
  const createProjectScope = searchParams.get('flowVersion')?.trim() || '';
  const stepQuery = searchParams.get('step');
  const initialSelectedStepIndex = stepQuery ? parseInt(stepQuery, 10) : null;
  const isEditMode = useMemo(() => Boolean(tourId), [tourId]);
  const isDuplicateMode = useMemo(() => Boolean(!tourId && duplicateId), [tourId, duplicateId]);

  const resolveToursListHref = (newTourId?: string) => {
    const scope =
      createProjectScope || readTourFlowVersion(tour.triggerConditions) || undefined;
    return toursListReturnHref(scope, newTourId);
  };

  const [isLoading, setIsLoading] = useState(isEditMode || isDuplicateMode || prefillMode === 'concat');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [viewOnlyMode, setViewOnlyMode] = useState(false);
  const concatPrefillHydratedRef = useRef(false);
  const forkSourceIdsRef = useRef<string[]>([]);
  const initialSandboxTestActiveRef = useRef<boolean | undefined>(undefined);
  const [tour, setTour] = useState<GuidedTour>({
    name: 'Nouveau parcours',
    targetUrl: '/dashboard',
    steps: [],
    isActive: false,
    environment: 'sandbox',
    sandboxStatus: 'pending',
  });

  const [sessionUser, setSessionUser] = useState<ReturnType<typeof readSessionUser>>(null);

  useEffect(() => {
    setSessionUser(readSessionUser());
  }, []);

  const dashboardRole = getDashboardRole(sessionUser ?? readSessionUser());
  const isAdminCreator = dashboardRole === 'ADMIN';
  const isDeveloperCreator = dashboardRole === 'DEVELOPER';

  const isDeveloperSandboxTestMode =
    Boolean(tourId) && isDeveloperCreator && canToggleSandboxTourActive(tour, dashboardRole, sessionUser?.id);

  const {
    editLock,
    lockBlocked: editLockBlocked,
    lockMessage: editLockMessage,
    isAcquiring: isAcquiringEditLock,
    retryAcquire: retryEditLockAcquire,
  } = useTourEditLock({
    tourId,
    tour: isEditMode ? tour : null,
    enabled: Boolean(tourId) && !viewOnlyMode,
  });

  const editorReadOnly = viewOnlyMode;
  const editLockRequired =
    Boolean(tourId) && !viewOnlyMode && tourRequiresEditLock(tour);
  const holdsEditLock =
    !editLockRequired ||
    (Boolean(editLock?.required) && isTourEditLockHeldByMe(editLock ?? undefined));
  const showEditLockGate = editLockRequired && !holdsEditLock;

  const { projectScopeKey, projectScopeInherited } = useMemo(() => {
    const scopedFromQuery = isGenericProjectFlowVersion(createProjectScope)
      ? undefined
      : createProjectScope;
    const scopedFromTour = readTourFlowVersion(tour.triggerConditions);
    const tourScope =
      scopedFromTour && !isGenericProjectFlowVersion(scopedFromTour) ? scopedFromTour : undefined;
    const key = scopedFromQuery ?? tourScope;

    if (!key) {
      return { projectScopeKey: undefined, projectScopeInherited: false };
    }

    const inherited =
      !scopedFromQuery &&
      Boolean(tourScope) &&
      (Boolean(duplicateId) ||
        prefillMode === 'concat' ||
        (!tourId && isGenericProjectFlowVersion(createProjectScope)));

    return { projectScopeKey: key, projectScopeInherited: inherited };
  }, [createProjectScope, tour.triggerConditions, duplicateId, prefillMode, tourId]);

  useEffect(() => {
    if (tourId || duplicateId || prefillMode === 'concat') {
      return;
    }
    if (isGenericProjectFlowVersion(createProjectScope)) {
      return;
    }
    setTour((prev) => ({
      ...prev,
      triggerConditions: applyTourProjectScope(prev, createProjectScope),
    }));
  }, [tourId, duplicateId, prefillMode, createProjectScope]);

  useEffect(() => {
    if (tourId || (!isDeveloperCreator && !isAdminCreator)) return;
    setTour((prev) => ({
      ...prev,
      isActive: false,
      environment: 'sandbox',
      sandboxStatus: 'pending',
    }));
  }, [isDeveloperCreator, isAdminCreator, tourId]);

  useEffect(() => {
    if (!tourId && !duplicateId && prefillMode !== 'concat') {
      setIsLoading(false);
      return;
    }

    const loadTour = async () => {
      try {
        if (tourId) {
          const user = readSessionUser();
          if (!user?.id) {
            return;
          }

          const response = await tourService.getById(tourId);
          if (response.tour) {
            const role = getDashboardRole(user);
            if (!canOpenTourEditor(response.tour, role, user.id, accessParam)) {
              toast.error('Accès refusé', {
                description:
                  accessParam === 'view'
                    ? 'Vous n’avez pas d’accès lecture seule à ce parcours.'
                    : accessParam === 'collaborate'
                      ? 'Vous n’avez pas d’accès collaboration à ce parcours.'
                      : 'Vous ne pouvez pas ouvrir ce parcours.',
              });
              router.push(resolveToursListHref());
              return;
            }
            setViewOnlyMode(isTourEditorReadOnly(response.tour, role, user.id, accessParam));
            const loadedTour = {
              ...response.tour,
              steps: [...(response.tour.steps || [])].sort((a, b) => a.orderIndex - b.orderIndex),
            };
            initialSandboxTestActiveRef.current = isTourSandboxTestActive(loadedTour);
            setTour(loadedTour);
          }
          return;
        }

        if (duplicateId) {
          const sourceId = duplicateId as string;
          const [sourceResponse, allToursResponse] = await Promise.all([
            tourService.getById(sourceId),
            tourService.getAll(undefined, { includeSteps: false }),
          ]);

          const sourceTour = sourceResponse.tour;
          if (!sourceTour) {
            throw new Error('Parcours source introuvable pour duplication.');
          }
          const role = getDashboardRole(readSessionUser());
          const userId = readSessionUser()?.id;
          if (!canForkTour(sourceTour, role, userId)) {
            toast.error('Duplication impossible', {
              description: 'Ce parcours est en lecture seule.',
            });
            router.push(resolveToursListHref());
            return;
          }
          forkSourceIdsRef.current = [sourceId];

          const existingNames = new Set(
            (allToursResponse.tours || []).map((item) => (item.name || '').trim().toLowerCase()),
          );
          const duplicatedName = toCopyName(sourceTour.name || 'Parcours', existingNames);
          const cloneRole = getDashboardRole(readSessionUser());

          setTour({
            ...prepareTourCloneFromSource(sourceTour, {
              name: duplicatedName,
              createStepId: createLocalStepId,
              forceProduction: false,
            }),
            isActive: false,
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
          const parsed = JSON.parse(raw) as {
            tour?: GuidedTour;
            sourceTourIds?: string[];
            ts?: number;
          };
          if (!parsed?.tour) {
            throw new Error('Pré-remplissage concaténé invalide.');
          }
          const role = getDashboardRole(readSessionUser());
          const userId = readSessionUser()?.id;
          const sourceIds = Array.isArray(parsed.sourceTourIds)
            ? parsed.sourceTourIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
            : [];
          if (sourceIds.length > 0) {
            const blocked = await Promise.all(
              sourceIds.map(async (id) => {
                const res = await tourService.getById(id);
                const source = res.tour;
                return source && !canForkTour(source, role, userId) ? id : null;
              }),
            );
            if (blocked.some(Boolean)) {
              toast.error('Concaténation impossible', {
                description: 'Un ou plusieurs parcours sources sont en lecture seule.',
              });
              router.push(resolveToursListHref());
              return;
            }
            forkSourceIdsRef.current = sourceIds;
          }
          setTour({
            ...prepareTourCloneFromSource(parsed.tour, {
              createStepId: createLocalStepId,
              forceProduction: false,
            }),
            isActive: false,
          });
          concatPrefillHydratedRef.current = true;
          window.sessionStorage.removeItem(CONCAT_PREFILL_STORAGE_KEY);
        }
      } catch (error) {
        toast.error('Impossible de charger le parcours', {
          description: getErrorMessage(error, 'Une erreur est survenue au chargement.'),
        });
        router.push(resolveToursListHref());
      } finally {
        setIsLoading(false);
      }
    };

    if (tourId && !readSessionUser()?.id) {
      return;
    }

    loadTour();
  }, [router, tourId, duplicateId, prefillMode, sessionUser?.id]);

  useEffect(() => {
    if (tourId) {
      return;
    }
    if (sessionUser === null) return;
    const role = getDashboardRole(sessionUser);
    if (!canCreateTours(role)) {
      router.replace('/dashboard/tours');
    }
  }, [router, tourId, sessionUser]);

  const handleSave = async (tourData: GuidedTour) => {
    if (viewOnlyMode) {
      return;
    }
    if (editLockBlocked || isAcquiringEditLock) {
      toast.error('Enregistrement impossible', {
        description: editLockMessage ?? 'Un autre utilisateur édite ce parcours.',
      });
      return;
    }
    if (tourId && !isTourEditLockHeldByMe(editLock ?? undefined)) {
      toast.error('Verrou d’édition requis', {
        description: editLockMessage ?? 'Rouvrez l’éditeur pour acquérir le verrou.',
      });
      return;
    }
    const role = getDashboardRole(authService.getUser());
    const currentUserId = authService.getUser()?.id;
    if (tourId && !canEditTourWithGrants(tourData, role, currentUserId) && !isDeveloperLabEditMode(tourData, role, currentUserId)) {
      toast.error('Enregistrement refusé', { description: 'Accès lecture seule ou parcours non modifiable.' });
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const role = getDashboardRole(authService.getUser());
      const currentUserId = authService.getUser()?.id;
      const developerLabSave = isDeveloperLabEditMode(tourData, role, currentUserId);
      let enrichedTourData: GuidedTour = tourData;

      if (!tourId && !isGenericProjectFlowVersion(createProjectScope)) {
        enrichedTourData = ensureTourSaveProjectScope(enrichedTourData, createProjectScope);
      }

      if (!developerLabSave) {
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
      }

      let payload: GuidedTourSavePayload = developerLabSave
        ? pickDeveloperLabTourSavePayload(enrichedTourData)
        : buildTourSavePayload(enrichedTourData);

      const sandboxTestModeOnSave =
        Boolean(tourId) &&
        isDeveloperCreator &&
        canToggleSandboxTourActive(enrichedTourData, role, currentUserId);

      const desiredSandboxTestActive = sandboxTestModeOnSave
        ? isTourSandboxTestActive(enrichedTourData)
        : undefined;
      const initialSandboxTestActive = initialSandboxTestActiveRef.current;
      const sandboxTestActivationChanged =
        sandboxTestModeOnSave &&
        initialSandboxTestActive !== undefined &&
        desiredSandboxTestActive !== initialSandboxTestActive;

      if (sandboxTestModeOnSave) {
        payload = omitSandboxTestActivationFromSavePayload(payload, enrichedTourData);
      }

      if (tourId) {
        await tourService.update(tourId, payload);
        if (sandboxTestActivationChanged && desiredSandboxTestActive !== undefined) {
          await tourService.toggleActive(tourId, desiredSandboxTestActive, 'sandbox');
        }
        toast.success('Parcours mis à jour', {
          description: sandboxTestActivationChanged
            ? desiredSandboxTestActive
              ? 'Modifications enregistrées. Test sandbox activé.'
              : 'Modifications enregistrées. Test sandbox désactivé.'
            : 'Vos modifications ont ete enregistrees avec succes.',
        });
        router.push(resolveToursListHref());
      } else {
        if (forkSourceIdsRef.current.length > 0) {
          payload = {
            ...payload,
            forkedFromTourIds: [...new Set(forkSourceIdsRef.current)],
          };
        }
        const res = await tourService.create(payload);
        const createdId = res.tour?.id;
        if (forkSourceIdsRef.current.length > 0) {
          clearConcatWorkspaceSession();
        }
        toast.success('Parcours créé en sandbox', {
          description:
            'Le parcours est en test. Utilisez le sélecteur Sandbox / Prod sur la carte pour le promouvoir quand il est prêt.',
        });
        const savedScope =
          createProjectScope ||
          readTourFlowVersion(payload.triggerConditions) ||
          readTourFlowVersion(tour.triggerConditions) ||
          undefined;
        router.push(toursListReturnHref(savedScope, createdId));
      }
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

  return (
    <>
      {isLoading ? (
        <div className="flex h-screen items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Chargement du parcours...
          </div>
        </div>
      ) : showEditLockGate ? (
        editLockBlocked ? (
          <TourEditLockScreen
            tourName={tour.name}
            message={
              editLockMessage ??
              'Ce parcours est en cours d’édition par un autre collaborateur. Réessayez lorsque l’éditeur aura quitté la page.'
            }
            heldByDisplayName={editLock?.heldByDisplayName}
            onBack={() => router.push(resolveToursListHref())}
            onRetry={() => void retryEditLockAcquire()}
            isRetrying={isAcquiringEditLock}
          />
        ) : (
          <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-10">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Vérification du verrou d&apos;édition…
            </div>
          </div>
        )
      ) : (
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
            onSave={editorReadOnly ? undefined : handleSave}
            onBack={() => router.push(resolveToursListHref())}
            initialSelectedStepIndex={initialSelectedStepIndex}
            showEnvironmentSelector={false}
            developerSandboxMode={isDeveloperCreator && !tourId}
            developerSandboxTestMode={isDeveloperSandboxTestMode}
            viewOnlyMode={editorReadOnly}
            projectScopeKey={projectScopeKey}
            projectScopeInherited={projectScopeInherited}
          />
        </div>
      )}
    </>
  );
}

export default function CreateTourPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Chargement de l&apos;éditeur...
          </div>
        </div>
      }
    >
      <CreateTourPageContent />
    </Suspense>
  );
}
