/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Aurora glass skin: `slate` is remapped to a translucent white ramp so
        // every text-slate-* reads light and every bg/border-slate-* becomes a
        // faint frosted tint over the gradient. `brand` becomes cyan→violet neon.
        slate: {
          50: 'rgba(255,255,255,0.045)',
          100: 'rgba(255,255,255,0.08)',
          200: 'rgba(255,255,255,0.16)',
          300: 'rgba(255,255,255,0.26)',
          400: 'rgba(255,255,255,0.50)',
          500: 'rgba(255,255,255,0.64)',
          600: 'rgba(255,255,255,0.76)',
          700: 'rgba(255,255,255,0.87)',
          800: 'rgba(255,255,255,0.96)',
          900: 'rgba(255,255,255,1)',
        },
        brand: {
          50: 'rgba(46,230,255,0.16)',
          100: 'rgba(46,230,255,0.24)',
          200: 'rgba(46,230,255,0.40)',
          300: '#8b6bff',
          400: '#8b6bff',
          500: '#2ee6ff',
          600: '#3ad0ff',
          700: '#8be7ff',
          800: '#7b2ff7',
          900: '#5b1fb7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
