// Firebase Configuration for Mygym
// Credenciais do Firebase Console

const firebaseConfig = {
    apiKey: "AIzaSyA0v3twc3UsKuh2hgehkAwA2K74J06KcLM",
    authDomain: "mygym-ebc54.firebaseapp.com",
    databaseURL: "https://mygym-ebc54-default-rtdb.firebaseio.com",
    projectId: "mygym-ebc54",
    storageBucket: "mygym-ebc54.firebasestorage.app",
    messagingSenderId: "821706486657",
    appId: "1:821706486657:web:603b087d0c66cf20792e80",
    measurementId: "G-81ZHSMB0CM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase services
const auth = firebase.auth();
const database = firebase.database();
