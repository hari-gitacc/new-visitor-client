import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// Replace with your actual config from the Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyDf5SKZd-_Ujlp0UYENDW-3zAAmqTF0OfM",
  authDomain: "visitors-app-41a40.firebaseapp.com",
  projectId: "visitors-app-41a40",
  storageBucket: "visitors-app-41a40.firebasestorage.app",
  messagingSenderId: "851767224697",
  appId: "1:851767224697:web:63870157ffca22c29067a8",
  measurementId: "G-7S7X65WWMG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);