// Firebase Configuration
// Substitua com suas credenciais reais do Firebase

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "protocolo-helton.firebaseapp.com",
  databaseURL: "https://protocolo-helton-default-rtdb.firebaseio.com",
  projectId: "protocolo-helton",
  storageBucket: "protocolo-helton.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (se usando CDN)
// firebase.initializeApp(firebaseConfig);

// Export para uso no app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = firebaseConfig;
}
