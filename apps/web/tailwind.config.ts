import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Herbal green — brand/structure (aligned with Ministry of Ayush green)
        brand: {
          50:  '#EFF5F0',
          100: '#DCE8DF',
          200: '#BDD3C3',
          300: '#93B49D',
          400: '#6B9378',
          500: '#4F7F60',
          600: '#3E6B4F',
          700: '#33573F',
          800: '#2A4634',
          900: '#1F3527',
        },
        // Saffron — key accent, owns all primary actions
        accent: {
          50:  '#FDF4E7',
          100: '#FBE3C8',
          200: '#F6C88F',
          300: '#F0A952',
          400: '#EC9A3F',
          500: '#E88A2D',
          600: '#D97A1E',
          700: '#B36217',
          800: '#8A4A12',
          900: '#5C300C',
        },
        ivory: '#FAF7F0',
        // AYUSH specialization tints (badges/chips only)
        spec: {
          'ayu-bg': '#FDF3DC', 'ayu-text': '#5C4510', 'ayu-border': '#E3CFA0',
          'yog-bg': '#F4EDDF', 'yog-text': '#584A2C', 'yog-border': '#D9CBAF',
          'una-bg': '#E9F1E2', 'una-text': '#38511F', 'una-border': '#BFD4AE',
          'sid-bg': '#F8E9E0', 'sid-text': '#733D20', 'sid-border': '#E0BCA6',
          'hom-bg': '#EBE9F4', 'hom-text': '#3E3564', 'hom-border': '#C2BDDE',
        },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
export default config
