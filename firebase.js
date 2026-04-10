import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBDpG1XTleltHs0SDfpDfqSepn5iXA2q2A",
  authDomain: "mission-control-fbbcc.firebaseapp.com",
  projectId: "mission-control-fbbcc",
  storageBucket: "mission-control-fbbcc.firebasestorage.app",
  messagingSenderId: "9564865208",
  appId: "1:9564865208:web:309680d5401c339e446a4d",
  measurementId: "G-0MHLE7CGCD"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
