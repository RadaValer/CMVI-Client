# Site CMV – client (Netlify)

Site-ul public și panoul de administrare (`/admin`): doar fișiere statice (HTML, CSS, JavaScript, imagini),
fără build. Datele vin de la serverul Node.js din folderul `server` (pe Render).

## Înainte de publicare

În `js/config.js` pune adresa serverului de pe Render:

```js
: 'https://cmvi-server.onrender.com'
```

(Local, cu `npm run dev` în folderul `server`, site-ul merge fără nicio schimbare.)

## Publicare pe Netlify

1. Pune folderul `client` pe GitHub (repo separat, sau împreună cu `server`).
2. În Netlify: **Add new site → Import an existing project**, alege repo-ul.
   - dacă `client` e un subfolder: **Base directory** = `client`
   - Build command: gol; Publish directory: `.` (sunt deja în `netlify.toml`)
3. Adresa primită (ex. `https://cmvineu.netlify.app`) se pune pe Render în variabila `CLIENT_ORIGIN`
   a serverului; altfel serverul refuză cererile site-ului.

Variantă rapidă, fără GitHub: trage folderul `client` în pagina **Netlify Drop** (app.netlify.com/drop).

## Prima pornire

Deschide `https://SITE.netlify.app/admin/`. Dacă baza de date e goală apare configurarea inițială:
creezi contul de administrator, iar tabelele se creează automat.

## Structură

- `index.html`, `css/`, `js/`, `assets/` – site-ul public (`js/app.js` = toată logica paginilor)
- `admin/` – panoul de administrare
- `js/config.js` – adresa serverului
- `netlify.toml` – setările Netlify (antete de securitate, admin neindexat)
