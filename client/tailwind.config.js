/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        annien: {
          bg: "#FAF7F2",       // Warm comforting parchment paper background
          card: "#FFFFFF",     // Clean card
          text: "#1C1917",     // High contrast stone-900
          subtext: "#44403C",  // High readability stone-700
          primary: "#0D9488",  // Calming deep teal
          active: "#059669",   // Vibrant emerald green (Listening)
          speaking: "#2563EB", // Reassuring royal blue (Speaking)
          amber: "#D97706",    // Medication amber
          crimson: "#DC2626",  // Emergency SOS red
        }
      },
      fontSize: {
        'elder-sm': ['1.125rem', { lineHeight: '1.75rem' }],
        'elder-base': ['1.375rem', { lineHeight: '2.125rem' }],
        'elder-lg': ['1.625rem', { lineHeight: '2.375rem' }],
        'elder-xl': ['2rem', { lineHeight: '2.625rem' }],
        'elder-2xl': ['2.5rem', { lineHeight: '3rem' }],
      }
    },
  },
  plugins: [],
}
