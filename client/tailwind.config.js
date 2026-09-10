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
        'elder-sm': ['1.5rem', { lineHeight: '2.25rem' }],
        'elder-base': ['1.75rem', { lineHeight: '2.5rem' }],
        'elder-lg': ['2rem', { lineHeight: '2.75rem' }],
        'elder-xl': ['2.25rem', { lineHeight: '3rem' }],
        'elder-2xl': ['2.5rem', { lineHeight: '3.5rem' }],
      }
    },
  },
  plugins: [],
}
