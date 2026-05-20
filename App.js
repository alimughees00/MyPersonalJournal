import React, {useContext, useEffect, useState} from 'react';
import {LogBox, StatusBar, StyleSheet, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/components/SplashScreen';
import {enableScreens} from 'react-native-screens';
import {notificationService} from './src/utils/NotificationService';
import {ThemeProvider, ThemeContext} from './src/context/ThemeContext';
import {colors} from './src/utils/colors';

enableScreens();

// Inner component so it can consume ThemeContext for dynamic StatusBar
const AppContent = () => {
  const {isDarkMode} = useContext(ThemeContext);
  const currentColors = isDarkMode ? colors.dark : colors.light;
  const [isLoading, setIsLoading] = useState(true);

  return (
    <View style={[styles.container, {backgroundColor: currentColors.background}]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      {isLoading ? (
        <SplashScreen onFinish={() => setIsLoading(false)} />
      ) : (
        <AppNavigator />
      )}
    </View>
  );
};

const App = () => {
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
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFF9',
  },
});

export default App;
