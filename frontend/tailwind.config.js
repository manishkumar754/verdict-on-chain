/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bench:    '#0A0608',
        chamber:  '#120C10',
        dock:     '#1A1018',
        robe:     '#221520',
        burgundy: '#7B1D3A',
        'burg-lt':'#A0284E',
        brass:    '#B8892A',
        'brass-lt':'#D4A843',
        ivory:    '#EDE8DC',
        parchment:'#D4C9B0',
        sage:     '#7A8A6E',
        slate:    '#4A4558',
        muted:    '#6B6080',
        ruby:     '#C0392B',
        emerald:  '#27AE60',
      },
      fontFamily: {
        display: ['"Libre Baskerville"', 'Georgia', 'serif'],
        body:    ['"Inter"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
        legal:   ['"IM Fell English"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'court-texture': `
          repeating-linear-gradient(
            45deg,
            rgba(123,29,58,0.03) 0px,
            rgba(123,29,58,0.03) 1px,
            transparent 1px,
            transparent 8px
          )
        `,
        'brass-glow':  'radial-gradient(ellipse at 50% 0%, rgba(184,137,42,0.10) 0%, transparent 60%)',
        'burg-glow':   'radial-gradient(ellipse at 20% 60%, rgba(123,29,58,0.10) 0%, transparent 50%)',
        'card-sheen':  'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, transparent 60%)',
      },
      boxShadow: {
        'verdict': '0 0 0 1px rgba(184,137,42,0.2), 0 8px 32px rgba(0,0,0,0.6)',
        'brass':   '0 0 20px rgba(184,137,42,0.2)',
        'gavel':   'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.5)',
      },
      animation: {
        'gavel-drop':   'gavel 0.4s cubic-bezier(0.36,0.07,0.19,0.97)',
        'stamp':        'stamp 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        'scales-sway':  'sway 4s ease-in-out infinite',
      },
      keyframes: {
        gavel: {
          '0%':   { transform: 'rotate(-30deg) translateY(-10px)' },
          '60%':  { transform: 'rotate(0deg) translateY(0px)' },
          '80%':  { transform: 'rotate(-5deg) translateY(-2px)' },
          '100%': { transform: 'rotate(0deg) translateY(0px)' },
        },
        stamp: {
          from: { transform: 'scale(2) rotate(-15deg)', opacity: '0' },
          to:   { transform: 'scale(1) rotate(-8deg)',  opacity: '1' },
        },
        sway: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%':     { transform: 'rotate(3deg)' },
        },
      },
    },
  },
  plugins: [],
}
