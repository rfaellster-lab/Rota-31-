/**
 * @file src/lib/firebase.ts
 * @description Firebase init (apenas Auth — Firestore não usado por enquanto)
 * @created 2026-04-29
 */

import { initializeApp } from 'firebase/app';
import { getAuth, browserLocalPersistence, setPersistence } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: 'AIzaSyDI8t-AMBR4T2JrOU8D5b9ojD2DsnTJ4lo',
  authDomain: 'rota-31---backend.firebaseapp.com',
  projectId: 'rota-31---backend',
  storageBucket: 'rota-31---backend.firebasestorage.app',
  messagingSenderId: '295031896464',
  appId: '1:295031896464:web:e87f72b204d3b099041b15',
  measurementId: 'G-43XCH1XHDH',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

// Persiste sessão local (sobrevive a reload de página)
setPersistence(auth, browserLocalPersistence).catch(e =>
  console.warn('Não foi possível habilitar persistência local:', e)
);
