import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCa3lwgs9FV93eAuLWC69mqBN8aJgemjnQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cat-tracker-dcb5b.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://cat-tracker-dcb5b-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cat-tracker-dcb5b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cat-tracker-dcb5b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "974993799846",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:974993799846:web:953ae8814dc6bcfe595267"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
