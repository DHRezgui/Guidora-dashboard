'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { organizationService } from '@/lib/api';
import { Organization } from '@/lib/types';

interface DeleteOrganizationModalProps {
  organization: Organization;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteOrganizationModal({ organization, onClose, onDeleted }: DeleteOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');
      await organizationService.delete(organization.id);
      onDeleted();
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-sm mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Icons.warning className="h-5 w-5" />
            Supprimer l&apos;organisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer <strong>{organization.name}</strong> ? Cette action est irréversible et dissociera tous les utilisateurs associés.
          </p>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
