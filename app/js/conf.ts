export const artSize = 96 * (window.devicePixelRatio || 1);
export let ytPath = "_youtube";
export let ytLimit = 3;

export function setYtLimit(limit: number) { ytLimit = limit; }
export function setYtPath(path: string) { ytPath = path; }
