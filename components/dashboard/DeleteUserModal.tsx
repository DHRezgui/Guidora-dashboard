'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { userService } from '@/lib/api';
import { User } from '@/lib/types';

interface DeleteUserModalProps {
  user: User;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteUserModal({ user, onClose, onDeleted }: DeleteUserModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError('');
      await userService.delete(user.id);
      onDeleted();
    } catch {
      setError('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const displayName =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-card border border-border/60 shadow-elevated animate-scale-in">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl p-2.5 bg-destructive/10">
              <Icons.warning className="h-5 w-5 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold text-destructive">Supprimer l&apos;utilisateur</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Êtes-vous sûr de vouloir supprimer <strong>{displayName}</strong> ? Cette action est irréversible.
          </p>

          {error && (
            <div className="mt-4 rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={onClose} className="rounded-xl">
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading} className="rounded-xl">
              {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
