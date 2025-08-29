// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCo0ijySvDyrnHiu6TY5W-i2AkjtYyCY-c",
  authDomain: "sbe-40.firebaseapp.com",
  projectId: "sbe-40",
  storageBucket: "sbe-40.firebasestorage.app",
  messagingSenderId: "472818470106",
  appId: "1:472818470106:web:8bd56a170d4c6fb0e4a9e3",
  measurementId: "G-V21YP67YQL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
