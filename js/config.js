/* Adresa serverului (API-ul Node.js de pe Render).
   Schimb-o aici după ce creezi serviciul pe Render (ex. https://cmv-server.onrender.com).
   Local (npm run dev în folderul server) site-ul și API-ul sunt pe aceeași adresă, deci rămâne gol. */
window.CMV_CONFIG = {
  apiUrl: /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)$/.test(location.hostname)
    ? ''
    : 'https://cmvi-server.onrender.com'
};
