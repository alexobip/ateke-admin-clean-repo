import { fontFamily } from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...fontFamily.sans],
      },
      colors: {
        background: "hsl(0, 0%, 100%)",
        foreground: "hsl(222.2, 84%, 4.9%)",
        muted: "hsl(210, 40%, 96%)",
        mutedForeground: "hsl(215, 20%, 50%)",
        border: "hsl(214.3, 31.8%, 91.4%)",
      },
    },
  },
  plugins: [],
};
