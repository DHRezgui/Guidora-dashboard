'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-card border border-border/60 shadow-elevated animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-border/60">
          <h2 className="text-lg font-semibold">Nouvelle organisation</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted/50 transition-colors">
            <Icons.close className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[13px]">Nom</Label>
              <Input id="name" {...register('name')} placeholder="Trustdev" className="rounded-xl" />
              {errors.name && (
                <p className="text-[11px] text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-[13px]">Clé API</Label>
              <Input id="apiKey" {...register('apiKey')} placeholder="onb_trustdev_xyz123" className="font-mono rounded-xl" />
              {errors.apiKey && (
                <p className="text-[11px] text-destructive">{errors.apiKey.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan" className="text-[13px]">Plan</Label>
              <select
                id="plan"
                {...register('plan')}
                className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="FREE">Free</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain" className="text-[13px]">Domaine (optionnel)</Label>
              <Input id="domain" {...register('domain')} placeholder="trustdev.com" className="rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUsers" className="text-[13px]">Max utilisateurs</Label>
                <Input id="maxUsers" type="number" {...register('maxUsers', { valueAsNumber: true })} placeholder="100" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTours" className="text-[13px]">Max parcours</Label>
                <Input id="maxTours" type="number" {...register('maxTours', { valueAsNumber: true })} placeholder="10" className="rounded-xl" />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="rounded-xl shadow-soft">
                {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
