import { twMerge } from "tailwind-merge";

// Joins the truthy class strings; later Tailwind classes win over conflicting earlier ones.
export const cn = (...classes: Array<string | false | null | undefined>): string => twMerge(...classes);
