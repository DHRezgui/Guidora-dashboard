import { useState } from 'react';
import { Step } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Icons } from '@/components/ui/icons';

interface TourSimulatorProps {
  steps: Step[];
  onExitPreview: () => void;
}

export default function TourSimulator({ steps, onExitPreview }: TourSimulatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  if (steps.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 w-full rounded-2xl border-2 border-dashed border-slate-200">
        <Icons.info className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">Aucune étape à simuler</h3>
        <p className="text-muted-foreground mb-6">Ajoutez des étapes à votre parcours pour pouvoir tester l'expérience utilisateur.</p>
        <Button onClick={onExitPreview}>Retour à l'édition</Button>
      </div>
    );
  }

  if (!isPlaying) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 w-full rounded-2xl border-2 border-dashed border-slate-200">
        <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg border border-slate-100 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Icons.play className="h-8 w-8 text-primary ml-1" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Prêt à simuler ?</h2>
            <p className="text-muted-foreground text-sm">
              Découvrez exactement ce que verront vos utilisateurs. {steps.length} étape(s) prêtes à être jouées.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onExitPreview}>Quitter</Button>
            <Button onClick={() => setIsPlaying(true)} className="gap-2">
              <Icons.play className="h-4 w-4 fill-current" /> Lancer la simulation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentStep = steps[currentIndex];
  const isLastStep = currentIndex === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      setIsPlaying(false);
      setCurrentIndex(0);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleSkip = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden flex items-center justify-center rounded-xl border border-slate-200">
      {/* Simulation de l'interface d'une application (arrière-plan) */}
      <div className="absolute inset-0 p-8 flex flex-col gap-6 opacity-40 pointer-events-none">
        <div className="h-12 bg-slate-300 rounded-md w-full flex items-center px-4 gap-4">
           <div className="h-6 w-32 bg-slate-400 rounded-md"></div>
           <div className="h-6 w-16 bg-slate-400 rounded-md ml-auto"></div>
           <div className="h-8 w-8 bg-slate-400 rounded-full"></div>
        </div>
        <div className="flex gap-6 flex-1">
          <div className="w-64 bg-slate-300 rounded-md h-full space-y-4 p-4">
             <div className="h-4 w-full bg-slate-400 rounded-md"></div>
             <div className="h-4 w-3/4 bg-slate-400 rounded-md"></div>
             <div className="h-4 w-5/6 bg-slate-400 rounded-md"></div>
          </div>
          <div className="flex-1 space-y-6">
            <div className="h-64 bg-slate-300 rounded-md" />
            <div className="flex gap-6">
              <div className="h-48 flex-1 bg-slate-300 rounded-md" />
              <div className="h-48 flex-1 bg-slate-300 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop sombre si activé */}
      {currentStep.highlightElement && (
        <div className="absolute inset-0 bg-black/50 z-10 transition-opacity duration-300 pointer-events-none" />
      )}

      {/* Cible et Tooltip */}
      <div className="relative z-20 flex items-center justify-center w-full h-full">
        <div className="relative flex items-center justify-center">
          {currentStep.position !== 'CENTER' && (
            <div className={cn(
              "relative bg-white border-2 border-dashed border-primary p-4 rounded-md shadow-sm transition-all duration-300 min-w-[250px] text-center flex items-center justify-center pointer-events-none",
              currentStep.highlightElement ? 'ring-4 ring-primary ring-opacity-50 z-30 bg-white shadow-xl' : ''
            )}>
              <span className="text-primary font-medium flex items-center gap-2">
                <Icons.target className="h-5 w-5" />
                {currentStep.targetSelector ? `Cible : ${currentStep.targetSelector}` : 'Élément cible'}
              </span>
            </div>
          )}

          {/* Conteneur de l'infobulle centré sur la cible, avec positionnement dynamique */}
          <div className={cn(
            "absolute flex transition-all duration-300 pointer-events-auto z-50",
            currentStep.position === 'TOP' ? 'bottom-full left-1/2 -translate-x-1/2 mb-4 flex-col items-center origin-bottom' :
            currentStep.position === 'BOTTOM' ? 'top-full left-1/2 -translate-x-1/2 mt-4 flex-col-reverse items-center origin-top' :
            currentStep.position === 'LEFT' ? 'right-full top-1/2 -translate-y-1/2 mr-4 flex-row items-center origin-right' :
            currentStep.position === 'RIGHT' ? 'left-full top-1/2 -translate-y-1/2 ml-4 flex-row-reverse items-center origin-left' :
            currentStep.position === 'TOP_LEFT' ? 'bottom-full right-full mb-4 mr-4 flex-col items-end origin-bottom-right' :
            currentStep.position === 'TOP_RIGHT' ? 'bottom-full left-full mb-4 ml-4 flex-col items-start origin-bottom-left' :
            currentStep.position === 'BOTTOM_LEFT' ? 'top-full right-full mt-4 mr-4 flex-col-reverse items-end origin-top-right' :
            currentStep.position === 'BOTTOM_RIGHT' ? 'top-full left-full mt-4 ml-4 flex-col-reverse items-start origin-top-left' :
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 origin-center'
          )}>

            {/* Flèche (Caret) */}
            {currentStep.position !== 'CENTER' && (
              <div className={cn(
                "w-0 h-0 border-solid border-8",
                currentStep.position === 'TOP' ? 'border-transparent border-t-white border-b-0' :
                currentStep.position === 'BOTTOM' ? 'border-transparent border-b-white border-t-0' :
                currentStep.position === 'LEFT' ? 'border-transparent border-l-white border-r-0' :
                currentStep.position === 'RIGHT' ? 'border-transparent border-r-white border-l-0' :
                currentStep.position === 'TOP_LEFT' ? 'border-transparent border-t-white border-l-white border-b-0 border-r-0' :
                currentStep.position === 'TOP_RIGHT' ? 'border-transparent border-t-white border-r-white border-b-0 border-l-0' :
                currentStep.position === 'BOTTOM_LEFT' ? 'border-transparent border-b-white border-l-white border-t-0 border-r-0' :
                currentStep.position === 'BOTTOM_RIGHT' ? 'border-transparent border-b-white border-r-white border-t-0 border-l-0' : ''
              )} />
            )}

            {/* Infobulle */}
            <div className="bg-white rounded-lg shadow-2xl p-5 w-[350px] text-left border border-slate-100 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto">
              <div className="mb-2 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-slate-900 leading-tight">{currentStep.title || "Sans titre"}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-1 text-slate-400 hover:text-slate-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSkip();
                  }}
                >
                  <Icons.close className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-slate-600 text-sm mb-6 whitespace-pre-wrap leading-relaxed">
                {currentStep.content || "Aucun contenu défini pour cette étape."}
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-1">
                  {steps.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        idx === currentIndex ? "w-4 bg-primary" : "w-1.5 bg-slate-200"
                      )}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  {currentIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrev();
                      }}
                    >
                      <Icons.chevronLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                  >
                    {isLastStep ? 'Terminer' : 'Suivant'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating control panel */}
      <div className="absolute top-4 right-4 z-50 bg-white p-2 rounded-lg shadow-md border border-slate-200 flex gap-3 items-center animate-in slide-in-from-top-4">
        <div className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold flex items-center gap-1">
          <Icons.eye className="h-3 w-3" /> PREVIEW
        </div>
        <Button variant="ghost" size="sm" onClick={onExitPreview} className="hover:bg-slate-100 h-8 text-xs">
          Quitter la simulation
        </Button>
      </div>

    </div>
  );
}