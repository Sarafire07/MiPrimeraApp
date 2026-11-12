import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
// @ts-ignore
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDhpdfpXRzwlo3d5DJUEn_hWnRJtTOlKoE",
  authDomain: "://firebaseapp.com",
  projectId: "studyquest-c8a1b",
  storageBucket: "studyquest-c8a1b.firebasestorage.app",
  messagingSenderId: "750377615709",
  appId: "1:750377615709:web:e4b1e37752900a9c7668b4"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
