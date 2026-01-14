import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

//Your web app's Firebase configuration - de pe 
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyASJKCdKo7OyzXi52bkB73QBY_9QOTbmd0",
  authDomain: "task-app-renata.firebaseapp.com",
  projectId: "task-app-renata",
  storageBucket: "task-app-renata.firebasestorage.app",
  messagingSenderId: "1023321026234",
  appId: "1:1023321026234:web:e38928733c9d91db7e1c83",
  measurementId: "G-HCQD3LSEQ6"
};
//Aici faci conexiunea cu Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);