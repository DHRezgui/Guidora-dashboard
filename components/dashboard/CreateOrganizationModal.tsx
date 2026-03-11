'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { organizationService, getErrorMessage } from '@/lib/api';

const createOrgSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  apiKey: z.string().min(1, 'La clé API est requise'),
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE']),
  domain: z.string().optional().or(z.literal('')),
  maxTours: z.number().min(1).max(1000).optional(),
  maxUsers: z.number().min(1).max(10000).optional(),
});

type CreateOrgForm = z.infer<typeof createOrgSchema>;

interface CreateOrganizationModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateOrganizationModal({ onClose, onCreated }: CreateOrganizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      plan: 'FREE',
    },
  });

  const onSubmit = async (data: CreateOrgForm) => {
    try {
      setLoading(true);
      setError('');
      const payload = { ...data };
      if (!payload.domain) delete payload.domain;
      await organizationService.create(payload);
      onCreated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Nouvelle organisation</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icons.close className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input id="name" {...register('name')} placeholder="Trustdev" />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">Clé API</Label>
              <Input id="apiKey" {...register('apiKey')} placeholder="onb_trustdev_xyz123" className="font-mono" />
              {errors.apiKey && (
                <p className="text-xs text-destructive">{errors.apiKey.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <select
                id="plan"
                {...register('plan')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="FREE">Free</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain">Domaine (optionnel)</Label>
              <Input id="domain" {...register('domain')} placeholder="trustdev.com" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Max utilisateurs</Label>
                <Input id="maxUsers" type="number" {...register('maxUsers', { valueAsNumber: true })} placeholder="100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTours">Max parcours</Label>
                <Input id="maxTours" type="number" {...register('maxTours', { valueAsNumber: true })} placeholder="10" />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
