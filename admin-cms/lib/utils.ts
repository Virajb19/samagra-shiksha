import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { ms } from "zod/v4/locales"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(s: number) {
  return new Promise((resolve) => setTimeout(resolve, s * 1000));
}
