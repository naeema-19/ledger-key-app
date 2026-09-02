/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1E2A38',
        inksoft: '#3B4A5C',
        parchment: '#EAE3D2',
        parchmentdeep: '#E1D8C2',
        card: '#FBF8F1',
        brass: '#B8874A',
        brassdark: '#8C6530',
        paid: '#3F6B4F',
        paidbg: '#E4EDE6',
        due: '#A1442E',
        duebg: '#F4E4DF',
        overdue: '#7A2318',
        overduebg: '#F1D8D2',
        line: '#D3C7A9',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
