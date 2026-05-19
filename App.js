import React, {useEffect, useState} from 'react';
import {LogBox, StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';
import {enableScreens} from 'react-native-screens';
import {notificationService} from './src/utils/NotificationService';
import {ThemeProvider} from './src/context/ThemeContext';

enableScreens();

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LogBox.ignoreAllLogs();

    // Initialize notifications
    notificationService.initialize().catch(err => {
      console.error('Failed to initialize notifications:', err);
    });
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#5C4E4E" />
          {isLoading ? (
            <SplashScreen onFinish={() => setIsLoading(false)} />
          ) : (
            <AppNavigator />
          )}
        </View>
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#988686',
  },
});

export default App;
