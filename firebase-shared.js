const firebaseConfig = {
  apiKey: "AIzaSyAku-atS5H_eCz1L50uC-1M8K34iHzy0_E",
  authDomain: "albrecht-discounts.firebaseapp.com",
  databaseURL: "https://albrecht-discounts-default-rtdb.firebaseio.com",
  projectId: "albrecht-discounts",
  storageBucket: "albrecht-discounts.firebasestorage.app",
  messagingSenderId: "63937039340",
  appId: "1:63937039340:web:df8f231bb151d4907acec9",
  measurementId: "G-CXMGRJES0H"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const employeeDB = firebase.database().ref("employees");
