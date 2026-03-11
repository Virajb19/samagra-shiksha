/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
       fontFamily: {
        lato: ["Lato-Regular"],
        "lato-bold": ["Lato-Bold"],
        "lato-light": ["Lato-Light"],
      },
    },
  },
  plugins: [],
}