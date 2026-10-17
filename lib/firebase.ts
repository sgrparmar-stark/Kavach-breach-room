/* Firebase app and Realtime Database (modular SDK, v10+). Configuration comes from NEXT_PUBLIC_FIREBASE_* environment variables.
   With no configuration the app runs in demo mode (data stays in one browser). */
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, push, remove, get, query, limitToFirst, type Database } from 'firebase/database';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, signOut, type Auth, type User } from 'firebase/auth';
import type { Store, Json } from './store';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.databaseURL);

function cleanJson<T>(o: T): T { return o == null ? o : JSON.parse(JSON.stringify(o)); }

/* The host and the teams use separate Firebase app instances, so a team tab opened on the facilitator's laptop
   never signs the facilitator out (each instance keeps its own sign-in). */
export function createFirebaseStore(role: 'host' | 'team'): Store {
  const name = role === 'host' ? '[DEFAULT]' : 'kbr-team';
  const app: FirebaseApp = getApps().find((a) => a.name === name) ?? (role === 'host' ? initializeApp(firebaseConfig) : initializeApp(firebaseConfig, name));
  const db: Database = getDatabase(app);
  const auth: Auth = getAuth(app);
  let offset = 0;
  onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = Number(s.val()) || 0; });
  const authReady = async (): Promise<User | null> => { await auth.authStateReady(); return auth.currentUser; };
  const facCheck = () => get(query(ref(db, 'secrets'), limitToFirst(1))).then(() => true, () => false);

  const store: Store = {
    mode: 'live',
    persistent: true,
    uid: null,
    async init() { /* initialised when created */ },
    async signInTeam() {
      const u = await authReady();
      const user = u && u.isAnonymous ? u : (await signInAnonymously(auth)).user;
      store.uid = user.uid;
      return user.uid;
    },
    async newTeamIdentity() { await signOut(auth); },
    async signInFac(c) {
      try {
        await signInWithEmailAndPassword(auth, c.email || '', c.password || '');
      } catch (e) {
        const code = (e as { code?: string }).code;
        store.lastError = code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found'
          ? 'Wrong email or password.' : 'Sign-in failed. Check your connection and try again.';
        return false;
      }
      const ok = await facCheck();
      if (!ok) store.lastError = 'This account is not the facilitator account in the database rules.';
      return ok;
    },
    async restoreFac() { const u = await authReady(); return u && !u.isAnonymous ? facCheck() : false; },
    rememberFac() { /* Firebase keeps the session itself */ },
    async signOut() { await signOut(auth); },
    on(path, cb) {
      return onValue(ref(db, path), (s) => cb(s.val()), (e) => console.warn('Read denied', path, e.message));
    },
    set: (p, v) => set(ref(db, p), cleanJson(v)),
    update: (p, obj) => update(ref(db, p), cleanJson(obj)),
    async push(p, v) { const r = push(ref(db, p)); await set(r, cleanJson(v)); return r.key as string; },
    remove: (p) => remove(ref(db, p)),
    attemptCode: (uid, code) => set(ref(db, 'teams/' + uid + '/codeOk'), String(code)).then(() => true, () => false),
    now: () => Date.now() + offset,
    onConnected(cb) { return onValue(ref(db, '.info/connected'), (s) => cb(s.val() === true)); },
  };
  return store;
}

export type { Json };
