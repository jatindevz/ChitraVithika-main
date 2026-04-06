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
    console.log('[FIREBASE] Checking Firebase initialization status');
    if (initialized) {
        console.log('[FIREBASE] Firebase already initialized, reusing instance');
        return { app, auth, provider };
    }

    console.log('[FIREBASE] Initializing Firebase with config');
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        provider = new GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        initialized = true;
        console.log('[FIREBASE] Firebase initialized successfully');
    } catch (error) {
        console.error('[FIREBASE] Firebase initialization failed:', error.message);
        console.error('[FIREBASE] Config check - API Key present:', !!firebaseConfig.apiKey);
        console.error('[FIREBASE] Config check - Project ID present:', !!firebaseConfig.projectId);
        console.error('[FIREBASE] To fix: Check VITE_FIREBASE_* environment variables in .env');
        throw error;
    }

    return { app, auth, provider };
}

/**
 * Sign in with Google popup
 * Returns user info and ID token
 */
export async function signInWithGoogle() {
    console.log('[FIREBASE] Starting Google sign-in process');
    try {
        console.log('[FIREBASE] Initializing Firebase');
        const { auth, provider } = initFirebase();

        console.log('[FIREBASE] Opening Google sign-in popup');
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        console.log('[FIREBASE] Getting ID token');
        const idToken = await user.getIdToken();

        console.log('[FIREBASE] Google sign-in successful for:', user.email);
        return {
            uid: user.uid,
            email: user.email,
            name: user.displayName,
            photoURL: user.photoURL,
            idToken,
        };
    } catch (error) {
        console.error('[FIREBASE] Google sign-in failed:', error.message);
        console.error('[FIREBASE] Error code:', error.code);
        console.error('[FIREBASE] To fix: Check Firebase config, network connection, or user permissions');
        throw error;
    }
}

/**
 * Sign out from Firebase
 */
export async function signOut() {
    console.log('[FIREBASE] Starting sign-out process');
    if (!auth) {
        console.log('[FIREBASE] No auth instance, skipping sign-out');
        return;
    }

    try {
        await firebaseSignOut(auth);
        console.log('[FIREBASE] Signed out successfully');
    } catch (error) {
        console.error('[FIREBASE] Sign out failed:', error.message);
        console.error('[FIREBASE] To fix: Check Firebase connection or auth state');
    }
}

/**
 * Get current Firebase user
 */
export function getCurrentUser() {
    console.log('[FIREBASE] Getting current user');
    if (!auth) {
        console.log('[FIREBASE] No auth instance available');
        return null;
    }
    const user = auth.currentUser;
    console.log('[FIREBASE] Current user:', user ? user.email : 'none');
    return user;
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
