import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, set, get, update, query, limitToLast, orderByChild } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBXP0nRDa9cngJjED9Z0YJSzDPO4MhqHI",
  authDomain: "vozduraket.firebaseapp.com",
  databaseURL: "https://vozduraket-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "vozduraket",
  storageBucket: "vozduraket.firebasestorage.app",
  messagingSenderId: "492828141645",
  appId: "1:492828141645:web:7870da1e7851e3ef735404"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
  signOut,
  ref,
  set,
  get,
  update,
  query,
  limitToLast,
  orderByChild
};
