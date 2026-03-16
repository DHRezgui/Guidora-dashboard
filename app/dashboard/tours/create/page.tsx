'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EditorLayout from '@/components/editor/EditorLayout';
import { GuidedTour } from '@/lib/types';

export default function CreateTourPage() {
  const router = useRouter();
  const [tour, setTour] = useState<GuidedTour>({
    name: 'Nouveau parcours',
    targetUrl: '/dashboard',
    steps: [],
  });

  const handleSave = async (tourData: GuidedTour) => {
    try {
      // TODO: Intégrer avec l'API backend
      console.log('Sauvegarder le parcours:', tourData);
      
      // Simuler l'enregistrement
      setTimeout(() => {
        alert('Parcours enregistré avec succès !');
        router.push('/dashboard/tours');
      }, 500);
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement:', error);
      alert('Erreur lors de l\'enregistrement');
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <EditorLayout
        tour={tour}
        onSave={handleSave}
      />
    </div>
  );
}
