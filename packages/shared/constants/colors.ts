/**
 * Ayushpathi brand color system (agreed 2026-07-13).
 * Base: warm ivory canvas + herbal green structure (aligned with Ministry of Ayush green)
 * Key accent: saffron — owns ALL primary actions (CTAs, active nav, alerts, highlights)
 * One soft tint per AYUSH specialization for badges/chips/borders.
 */

export const COLORS = {
  ivory: '#FAF7F0',        // page canvas
  green: '#3E6B4F',        // brand / structure (logo, headers, links)
  greenDark: '#33573F',
  saffron: '#E88A2D',      // key accent — every primary action
  saffronDark: '#D97A1E',
} as const

export interface SpecColor {
  bg: string
  text: string
  border: string
  label: string
}

export const SPECIALIZATION_COLORS: Record<string, SpecColor> = {
  AYU: { bg: '#FDF3DC', text: '#5C4510', border: '#E3CFA0', label: 'Ayurveda' },
  YOG: { bg: '#F4EDDF', text: '#584A2C', border: '#D9CBAF', label: 'Yoga & Naturopathy' },
  UNA: { bg: '#E9F1E2', text: '#38511F', border: '#BFD4AE', label: 'Unani' },
  SID: { bg: '#F8E9E0', text: '#733D20', border: '#E0BCA6', label: 'Siddha' },
  HOM: { bg: '#EBE9F4', text: '#3E3564', border: '#C2BDDE', label: 'Homeopathy' },
}

/** Tailwind utility classes for spec badges (web). Keys match ayush_specialization codes. */
export const SPEC_BADGE_CLASSES: Record<string, string> = {
  AYU: 'bg-spec-ayu-bg text-spec-ayu-text',
  YOG: 'bg-spec-yog-bg text-spec-yog-text',
  UNA: 'bg-spec-una-bg text-spec-una-text',
  SID: 'bg-spec-sid-bg text-spec-sid-text',
  HOM: 'bg-spec-hom-bg text-spec-hom-text',
}
