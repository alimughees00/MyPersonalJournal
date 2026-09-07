/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';

// Ensure default Firebase app is initialized
if (!firebase.apps.length) {
  try {
    firebase.initializeApp();
  } catch (error) {
    console.warn('Firebase initializeApp warning:', error);
  }
}

// Register background handler
try {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('Message handled in the background!', remoteMessage);
  });
} catch (error) {
  console.warn('Failed to set background message handler:', error);
}

AppRegistry.registerComponent(appName, () => App);
