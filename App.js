import React, {useEffect, useState} from 'react';
import {SafeAreaView, StatusBar, StyleSheet, LogBox} from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';

const App = () => {
  // Hide all warning messages
  useEffect(() => {
    LogBox.ignoreAllLogs(); // Ignore all log warnings in app
  }, []);

  const [isLoading, setIsLoading] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#988686" />
      {isLoading ? (
        <SplashScreen onFinish={() => setIsLoading(false)} />
      ) : (
        <AppNavigator />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#988686',
  },
});

export default App;
