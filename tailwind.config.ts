/** @type {import('tailwindcss').Config} */
module.exports = {
  // Baris ini yang PALING PENTING buat fitur dark mode kita:
  darkMode: "class", 
  
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Kamu bisa nambahin warna kustom disini kalau mau
    },
  },
  plugins: [],
};
