import {
    GoogleSignin,
    statusCodes,
  } from '@react-native-google-signin/google-signin';
  
  // Configure Google Sign-In
  GoogleSignin.configure({
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com', // From Google Cloud Console
    offlineAccess: true,
  });
  
  export const googleAuth = {
    signIn: async () => {
      try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        return userInfo;
      } catch (error) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          console.log('User cancelled the login flow');
        } else if (error.code === statusCodes.IN_PROGRESS) {
          console.log('Sign in in progress');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          console.log('Play services not available or outdated');
        } else {
          console.log('Google signin error', error);
        }
        throw error;
      }
    },
  
    signOut: async () => {
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        console.error('Google signout error', error);
      }
    },
  
    getCurrentUser: async () => {
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          return await GoogleSignin.getCurrentUser();
        }
        return null;
      } catch (error) {
        console.error('Error getting current user', error);
        return null;
      }
    },
  };