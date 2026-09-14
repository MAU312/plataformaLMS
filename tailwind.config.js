export default {
  content: [
    './src/public/index.html',
    './src/public/js/**/*.js'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Verde tomado directamente del logo de LANBA (#007031).
        'cenat-green': '#007031',
        'cenat-green-light': '#22c55e',
        'cenat-green-hover': '#005c28',
      }
    }
  },
  plugins: []
};
