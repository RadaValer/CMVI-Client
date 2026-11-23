# Site CMV â€“ client (Netlify)

Site-ul public È™i panoul de administrare (`/admin`): doar fiÈ™iere statice (HTML, CSS, JavaScript, imagini),
fÄƒrÄƒ build. Datele vin de la serverul Node.js din folderul `server` (pe Render).

## ÃŽnainte de publicare

ÃŽn `js/config.js` pune adresa serverului de pe Render:

```js
: 'https://cmvi-server.onrender.com'
```

(Local, cu `npm run dev` Ã®n folderul `server`, site-ul merge fÄƒrÄƒ nicio schimbare.)

## Publicare pe Netlify

1. Pune folderul `client` pe GitHub (repo separat, sau Ã®mpreunÄƒ cu `server`).
2. ÃŽn Netlify: **Add new site â†’ Import an existing project**, alege repo-ul.
   - dacÄƒ `client` e un subfolder: **Base directory** = `client`
   - Build command: gol; Publish directory: `.` (sunt deja Ã®n `netlify.toml`)
3. Adresa primitÄƒ (ex. `https://cmv-ineu.netlify.app`) se pune pe Render Ã®n variabila `CLIENT_ORIGIN`
   a serverului; altfel serverul refuzÄƒ cererile site-ului.

VariantÄƒ rapidÄƒ, fÄƒrÄƒ GitHub: trage folderul `client` Ã®n pagina **Netlify Drop** (app.netlify.com/drop).

## Prima pornire

Deschide `https://SITE.netlify.app/admin/`. DacÄƒ baza de date e goalÄƒ apare configurarea iniÈ›ialÄƒ:
creezi contul de administrator, iar tabelele se creeazÄƒ automat.

## StructurÄƒ

- `index.html`, `css/`, `js/`, `assets/` â€“ site-ul public (`js/app.js` = toatÄƒ logica paginilor)
- `admin/` â€“ panoul de administrare
- `js/config.js` â€“ adresa serverului
- `netlify.toml` â€“ setÄƒrile Netlify (antete de securitate, admin neindexat)
