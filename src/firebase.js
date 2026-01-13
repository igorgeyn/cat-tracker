import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCa3lwgs9FV93eAuLWC69mqBN8aJgemjnQ",
  authDomain: "cat-tracker-dcb5b.firebaseapp.com",
  databaseURL: "https://cat-tracker-dcb5b-default-rtdb.firebaseio.com",
  projectId: "cat-tracker-dcb5b",
  storageBucket: "cat-tracker-dcb5b.firebasestorage.app",
  messagingSenderId: "974993799846",
  appId: "1:974993799846:web:953ae8814dc6bcfe595267"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
export const database = getDatabase(app);
