import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

// La configuración web de Firebase no es secreta: identifica el proyecto, no da acceso.
const host = typeof location !== "undefined" ? location.host : "";
const onFirebaseHosting = /\.(web\.app|firebaseapp\.com)$/.test(location.hostname);

export const firebaseConfig = {
  apiKey: "AIzaSyAtqrX3B8w_Blqoy_bUq8g6F0ghoPo-dwU",
  // En Firebase Hosting usamos el propio dominio para el inicio de sesión: evita problemas
  // con navegadores que bloquean cookies de terceros (Safari, por ejemplo).
  authDomain: onFirebaseHosting ? host : "mibingo-865e2.firebaseapp.com",
  projectId: "mibingo-865e2",
  storageBucket: "mibingo-865e2.firebasestorage.app",
  messagingSenderId: "410348038062",
  appId: "1:410348038062:web:591401f3953ac25f140a3f",
  measurementId: "G-R06NRHQ2BM"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.languageCode = "es";

let db0;
try {
  db0 = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch {
  db0 = initializeFirestore(app, {});
}
export const db = db0;
