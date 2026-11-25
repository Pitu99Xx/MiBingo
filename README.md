# MiBingo

Bingo de 90 bolas contra rivales de la casa, como app web sobre Firebase.

- **Web de pruebas:** https://mibingoapp.web.app
- **Boceto original:** `boceto/index.html`

## Cómo está hecho

- React + TypeScript con Vite (`src/`).
- Firebase Authentication (Google y correo con verificación) y Firestore (`firestore.rules`).
- El motor de la partida (`src/game/engine.ts`) corre en el navegador; la partida en pausa se guarda en `users/{uid}/saved/current`.
- Cada push a `main` o a la rama de desarrollo publica la web y las reglas (`.github/workflows/deploy.yml`), usando el secreto `FIREBASE_SERVICE_ACCOUNT`.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173 (app real)
                 # http://localhost:5173/demo.html?v=game|home|result|bankrupt (pantallas sin Firebase)
npm run build
```
