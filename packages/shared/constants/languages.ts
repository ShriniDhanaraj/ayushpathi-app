// Ayushpathi — Supported Languages
// Mirrors lookup_language table in the DB

export interface Language {
  code: string
  label: string       // English label
  nativeLabel: string // Label in the language itself
}

export const LANGUAGES: Language[] = [
  { code: 'EN', label: 'English',   nativeLabel: 'English'       },
  { code: 'HI', label: 'Hindi',     nativeLabel: 'हिन्दी'         },
  { code: 'TA', label: 'Tamil',     nativeLabel: 'தமிழ்'          },
  { code: 'TE', label: 'Telugu',    nativeLabel: 'తెలుగు'         },
  { code: 'KN', label: 'Kannada',   nativeLabel: 'ಕನ್ನಡ'          },
  { code: 'ML', label: 'Malayalam', nativeLabel: 'മലയാളം'         },
  { code: 'BN', label: 'Bengali',   nativeLabel: 'বাংলা'          },
  { code: 'GU', label: 'Gujarati',  nativeLabel: 'ગુજરાતી'        },
  { code: 'MR', label: 'Marathi',   nativeLabel: 'मराठी'          },
  { code: 'PA', label: 'Punjabi',   nativeLabel: 'ਪੰਜਾਬੀ'         },
  { code: 'OR', label: 'Odia',      nativeLabel: 'ଓଡ଼ିଆ'           },
  { code: 'AS', label: 'Assamese',  nativeLabel: 'অসমীয়া'        },
  { code: 'UR', label: 'Urdu',      nativeLabel: 'اردو'           },
  { code: 'SA', label: 'Sanskrit',  nativeLabel: 'संस्कृतम्'       },
]

export const LANGUAGE_MAP: Record<string, Language> = Object.fromEntries(
  LANGUAGES.map(l => [l.code, l])
)

/** Codes most common among AYUSH patients — shown first in multi-select */
export const PRIMARY_LANGUAGE_CODES = ['EN', 'HI', 'TA', 'TE', 'KN', 'ML', 'BN', 'GU', 'MR']
