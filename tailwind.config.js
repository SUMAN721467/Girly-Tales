/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Lavender / Lilac shades
          lavender: '#967BB6',
          'lavender-light': '#B59ECC',
          'lavender-dark': '#7F62A1',
          'lavender-subtle': '#F5EEFA',
          'lavender-tint': '#E8DCF3',
          'lavender-pill': '#967BB6',
          lilac: '#967BB6',
          'lilac-light': '#B59ECC',
          'lilac-dark': '#7F62A1',
          'lilac-subtle': '#F5EEFA',
          'lilac-tint': '#E8DCF3',

          // Yellow / Butter / Ivory shades
          yellow: '#fffeea',
          'yellow-light': '#FFFEE8',
          'yellow-dark': '#EDEAB0',
          'yellow-card': '#FEFDEB',
          butter: '#fffeea',
          'butter-light': '#FFFEE8',
          'butter-dark': '#EDEAB0',
          ivory: '#fffeea',
          'ivory-dark': '#EDEAE0',

          // Blush & Neutrals
          blush: '#FCE7ED',
          'blush-btn': '#FBB6CE',
          charcoal: '#1A1821',
          night: '#1A1821',
          muted: '#6B6678',
          'muted-light': '#9B96A8',
          border: '#E8E4D8',
          card: '#FFFFFF'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        handwritten: ['"Caveat"', 'cursive']
      },
      boxShadow: {
        'nap': '0 4px 20px rgba(150, 123, 182, 0.08)',
        'soft': '0 4px 20px rgba(150, 123, 182, 0.15)',
        'glow': '0 0 25px rgba(150, 123, 182, 0.4)',
        'gold-glow': '0 0 25px rgba(212, 175, 55, 0.4)',
        'card': '0 8px 30px rgba(0, 0, 0, 0.05)',
        'drawer': '-10px 0 35px rgba(0, 0, 0, 0.12)'
      },
      animation: {
        'marquee': 'marquee 22s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        }
      }
    },
  },
  plugins: [],
}
