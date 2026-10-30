/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: "#090D13",
          panel: "#111821",
          panelHover: "#16202C",
          panelLight: "#1A2535",
          border: "#263445",
          borderLight: "#33455B",
          accent: "#3B82F6",
          cyan: "#22D3EE",
          text: "#F1F5F9",
          muted: "#94A3B8",
          dim: "#64748B",
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
