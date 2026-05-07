'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/ui/icons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { organizationService, getErrorMessage } from '@/lib/api';
import Image from 'next/image';

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
    setValue,
    watch,
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
      if (typeof payload.maxUsers === 'number') payload.maxUsers = normalizeMaxUsers(String(payload.maxUsers));
      if (typeof payload.maxTours === 'number') payload.maxTours = normalizeMaxTours(String(payload.maxTours));
      if (!payload.domain) delete payload.domain;
      await organizationService.create(payload);
      onCreated();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Erreur lors de la création'));
    } finally {
      setLoading(false);
    }
  };

  const normalizeMaxUsers = (value: string): number => {
    const trimmed = value.trim();
    if (!trimmed) return 1;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return 1;
    return Math.max(1, Math.min(10000, parsed));
  };

  const normalizeMaxTours = (value: string): number => {
    const trimmed = value.trim();
    if (!trimmed) return 1;
    const parsed = Number(trimmed);
    if (Number.isNaN(parsed)) return 1;
    return Math.max(1, Math.min(1000, parsed));
  };

  const planValue = watch('plan');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 mx-4 w-full max-w-4xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elevated animate-scale-in">
        <div className="grid md:grid-cols-[260px_1fr]">
          <div className="relative hidden border-r border-border/60 md:block">
            <Image
              src="/org.jpg"
              alt="Organization visual"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.2)_0%,rgba(2,6,23,0.85)_80%)]" />
            <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/15 bg-slate-950/55 p-3 backdrop-blur-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-200">Nouvelle organisation</p>
              <p className="mt-1 text-base font-semibold text-white">Structurez vos equipes avec Guidora.</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-border/60 p-6">
              <h2 className="text-lg font-semibold">Nouvelle organisation</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:bg-muted/50">
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
                  <input type="hidden" {...register('plan')} />
                  <Select
                    value={planValue}
                    onValueChange={(value) => setValue('plan', value as CreateOrgForm['plan'], { shouldValidate: true })}
                  >
                    <SelectTrigger
                      id="plan"
                      className="h-9 w-full rounded-xl border-slate-300 bg-white/90 px-3 text-sm text-slate-700 hover:border-orange-400/40 focus-visible:ring-orange-400/40 data-[popup-open]:border-orange-400/60 dark:border-white/15 dark:bg-slate-950/55 dark:text-slate-100"
                    >
                      <SelectValue placeholder="Choisir un plan" />
                    </SelectTrigger>
                    <SelectContent
                      alignItemWithTrigger={false}
                      side="bottom"
                      sideOffset={8}
                      className="rounded-xl border border-slate-200 bg-white text-slate-800 shadow-[0_12px_25px_rgba(2,6,23,0.16)] dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:shadow-[0_12px_35px_rgba(2,6,23,0.55)]"
                    >
                      <SelectItem value="FREE" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Free</SelectItem>
                      <SelectItem value="STARTER" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Starter</SelectItem>
                      <SelectItem value="PRO" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Pro</SelectItem>
                      <SelectItem value="ENTERPRISE" className="text-slate-800 focus:bg-orange-500/20 focus:text-slate-900 dark:text-slate-100 dark:focus:text-white">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="domain" className="text-[13px]">Domaine (optionnel)</Label>
                  <Input id="domain" {...register('domain')} placeholder="trustdev.com" className="rounded-xl" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxUsers" className="text-[13px]">
                      Max utilisateurs <span className="text-[11px] font-normal text-muted-foreground">(1 a 10000)</span>
                    </Label>
                    <Input
                      id="maxUsers"
                      type="number"
                      min={1}
                      max={10000}
                      {...register('maxUsers', {
                        valueAsNumber: true,
                        onChange: (e) => {
                          const normalized = normalizeMaxUsers(e.target.value);
                          setValue('maxUsers', normalized, { shouldValidate: true, shouldDirty: true });
                        },
                        onBlur: (e) => {
                          const normalized = normalizeMaxUsers(e.target.value);
                          setValue('maxUsers', normalized, { shouldValidate: true, shouldDirty: true });
                        },
                      })}
                      placeholder="100"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxTours" className="text-[13px]">
                      Max parcours <span className="text-[11px] font-normal text-muted-foreground">(1 a 1000)</span>
                    </Label>
                    <Input
                      id="maxTours"
                      type="number"
                      min={1}
                      max={1000}
                      {...register('maxTours', {
                        valueAsNumber: true,
                        onChange: (e) => {
                          const normalized = normalizeMaxTours(e.target.value);
                          setValue('maxTours', normalized, { shouldValidate: true, shouldDirty: true });
                        },
                        onBlur: (e) => {
                          const normalized = normalizeMaxTours(e.target.value);
                          setValue('maxTours', normalized, { shouldValidate: true, shouldDirty: true });
                        },
                      })}
                      placeholder="10"
                      className="rounded-xl"
                    />
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
                  <Button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(249,115,22,0.32)] active:translate-y-0 active:scale-[0.99]"
                  >
                    {loading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                    Créer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
