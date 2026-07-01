import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-montserrat)', 'sans-serif'],
      },
      colors: {
        pch: {
          navy:    '#011533',
          mid:     '#2c3850',
          light:   '#cfdef5',
          lime:    '#e0fcad',
          orange:  '#fe572a',
          blue:    '#bce4fe',
          slate:   '#6b7a8d',
        },
      },
    },
  },
  plugins: [],
};
export default config;
