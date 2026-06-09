import { authService } from '@/lib/api';
import type { User } from '@/lib/types';

/** Lit l'utilisateur JWT depuis localStorage (client uniquement). */
export function readSessionUser(): User | null {
	if (typeof window === 'undefined') {
		return null;
	}
	return authService.getUser();
}

/** Identifiant stable pour préfixes localStorage (un état par compte, pas par navigateur). */
export function getSessionUserStorageScope(): string {
	const user = readSessionUser();
	if (user?.id) return user.id;
	if (user?.email) return user.email.trim().toLowerCase();
	return 'anonymous';
}

/** Suffixe une clé locale avec le compte courant (`baseKey` + `:` + userId). */
export function scopeLocalStorageKey(baseKey: string): string {
	return `${baseKey}:${getSessionUserStorageScope()}`;
}
