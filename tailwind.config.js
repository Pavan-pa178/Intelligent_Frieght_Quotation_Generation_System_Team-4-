/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0A1F33',
          navy2: '#0E2843',
          navy3: '#123153',
          marine: '#1B4B7A',
          marineLight: '#2E6DA8',
          marinePale: '#EAF1F8',
          orange: '#D9500A',
          orangeLight: '#F0692A',
          orangePale: '#FDEAE0',
          slate: '#54636F',
          slateLight: '#8896A2',
          cloud: '#F4F6F8',
          line: '#E1E6EB',
          success: '#1B8A56',
          successBg: '#E7F5EE',
          warning: '#B9790A',
          warningBg: '#FBF1DC',
          danger: '#C1352E',
          dangerBg: '#FBEAE9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sm2: '0 1px 2px rgba(10,31,51,.07), 0 1px 3px rgba(10,31,51,.06)',
        md2: '0 8px 20px -6px rgba(10,31,51,.16)',
        lg2: '0 24px 48px -16px rgba(10,31,51,.28)',
      },
      borderRadius: {
        sm2: '8px',
        md2: '14px',
        lg2: '22px',
      },
      transitionTimingFunction: {
        brand: 'cubic-bezier(.4,0,.2,1)',
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(22px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        floatY: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        pulseRing: { '0%': { transform: 'scale(.7)', opacity: .9 }, '80%': { transform: 'scale(2.1)', opacity: 0 }, '100%': { opacity: 0 } },
        shimmerDot: { '0%,100%': { opacity: .35 }, '50%': { opacity: 1 } },
        slideIn: { from: { opacity: 0, transform: 'translate(20px,-8px)' }, to: { opacity: 1, transform: 'translate(0,0)' } },
        drawPath: { to: { strokeDashoffset: 0 } },
        moveAlong: { '0%': { offsetDistance: '0%' }, '100%': { offsetDistance: '100%' } },
      },
      animation: {
        fadeUp: 'fadeUp .5s cubic-bezier(.4,0,.2,1)',
        floatY: 'floatY 5s ease-in-out infinite',
        floatYSlow: 'floatY 6s ease-in-out infinite',
        pulseRing: 'pulseRing 2.4s ease-out infinite',
        shimmerDot: 'shimmerDot 1.6s ease-in-out infinite',
        slideIn: 'slideIn .35s cubic-bezier(.4,0,.2,1)',
        drawPath: 'drawPath 2.6s cubic-bezier(.4,0,.2,1) .4s forwards',
        moveAlong: 'moveAlong 5s linear infinite',
      },
    },
  },
  plugins: [],
}
