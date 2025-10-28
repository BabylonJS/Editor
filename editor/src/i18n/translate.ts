import i18n from "./config";

/**
 * Translate a key outside of React components.
 * This is useful for functions, classes, and other non-React code.
 * 
 * @param key - The translation key
 * @param options - Optional interpolation options
 * @returns The translated string
 */
export function t(key: string, options?: any): string {
	return i18n.t(key, options) as string;
}

/**
 * Change the language programmatically.
 * 
 * @param lng - The language code (e.g., 'en', 'fr', 'ja', 'zh')
 */
export function changeLanguage(lng: string): Promise<any> {
	return i18n.changeLanguage(lng);
}

/**
 * Get the current language.
 * 
 * @returns The current language code
 */
export function getCurrentLanguage(): string {
	return i18n.language;
}
