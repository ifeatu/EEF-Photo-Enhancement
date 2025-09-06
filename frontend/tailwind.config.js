import { defineConfig } from '@tailwindcss/postcss'

export default defineConfig({
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  plugins: [
    require('@tailwindcss/forms'),
  ],
})