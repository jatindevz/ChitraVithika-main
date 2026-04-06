/**
 * ChitraVithika — Firebase Authentication
 * Provides Google Sign-In functionality
 * 
 * Environment variables are injected by Vite at build time.
 * In .env file, use VITE_ prefix for client-side variables.
 */

import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';

let app = null;
let auth = null;
let provider = null;
let initialized = false;

// Firebase config from environment variables (injected by Vite)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * Initialize Firebase (lazy initialization)
 */
export function initFirebase() {
    if (initialized) return { app, auth, provider };
    
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        initialized = true;
        console.log('[firebase] Initialized successfully');
    } catch (error) {
        console.error('[firebase] Initialization failed:', error);
        throw error;
    }
    
    return { app, auth, provider };
}

/**
 * Sign in with Google popup
 * Returns user info and ID token
 */
export async function signInWithGoogle() {
    const { auth, provider } = initFirebase();
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const idToken = await user.getIdToken();
        
        return {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            idToken,
        };
    } catch (error) {
        console.error('[firebase] Google sign-in failed:', error);
        throw error;
    }
}

/**
 * Sign out from Firebase
 */
export async function signOut() {
    if (!auth) return;
    
    try {
        await firebaseSignOut(auth);
        console.log('[firebase] Signed out');
    } catch (error) {
        console.error('[firebase] Sign out failed:', error);
    }
}

/**
 * Get current Firebase user
 */
export function getCurrentUser() {
    if (!auth) return null;
    return auth.currentUser;
}

/**
 * Listen for auth state changes
 */
export function onAuthChange(callback) {
    if (!auth) {
        initFirebase();
    }
    return onAuthStateChanged(auth, callback);
}

export { auth, provider };
