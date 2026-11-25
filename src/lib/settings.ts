export interface Settings {
  voice: boolean; phrases: boolean; sound: boolean; vibe: boolean;
  hints: boolean; highlight: boolean; big: boolean; autopause: boolean;
}
export const DEFAULT_SETTINGS: Settings = {
  voice: true, phrases: true, sound: true, vibe: true, hints: true, highlight: false, big: false, autopause: true
};
// Copia viva de los ajustes para los módulos que no son React (sonido, vibración).
export const settings: Settings = { ...DEFAULT_SETTINGS };
export function applySettings(s: Partial<Settings> | undefined) { Object.assign(settings, DEFAULT_SETTINGS, s || {}); }
