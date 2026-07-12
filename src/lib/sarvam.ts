export function isSarvamConfigured() {
  return !!process.env.SARVAM_API_KEY
}

export type { LanguageCode } from "./translations"
export { LANGUAGES } from "./translations"
