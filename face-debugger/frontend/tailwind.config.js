/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "ide-bg": "#0F172A",
        "ide-surface": "#1E293B",
        "ide-border": "#334155",
        "ide-text": "#E2E8F0",
        "ide-text-muted": "#94A3B8",
        "ide-accent": "#3B82F6",
        "ide-success": "#22C55E",
        "ide-warning": "#F59E0B",
        "ide-error": "#EF4444",
      },
    },
  },
  plugins: [],
};
