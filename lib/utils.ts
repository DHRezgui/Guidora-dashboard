import { type ClassValue, clsx } from 'clsx'; //clsx: assemble toutes les classes
import { twMerge } from 'tailwind-merge'; //twMerge: supprime les conflits Tailwind

//helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}