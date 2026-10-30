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
          bg: "#0B0E13",
          panel: "#111722",
          panelHover: "#161E2C",
          panelLight: "#1A2333",
          border: "#273244",
          borderLight: "#334155",
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
