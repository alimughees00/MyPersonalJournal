import React, {createContext, useState, useEffect, useCallback} from 'react';
import {useColorScheme} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({children}) => {
  const systemTheme = useColorScheme(); // 'light' or 'dark'
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [themeMode, setThemeMode] = useState('system'); // 'light', 'dark', 'system'
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  // Load saved preference on app start
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('themeMode');
        if (saved) {
          setThemeMode(saved);
        } else {
          // Default to system theme
          setThemeMode('system');
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
        setThemeMode('system');
      } finally {
        setIsThemeLoaded(true);
      }
    };
    loadThemePreference();
  }, []);

  // Update isDarkMode based on themeMode
  useEffect(() => {
    if (themeMode === 'system') {
      setIsDarkMode(systemTheme === 'dark');
    } else {
      setIsDarkMode(themeMode === 'dark');
    }
  }, [themeMode, systemTheme]);

  const toggleTheme = useCallback(async () => {
    try {
      const newMode = themeMode === 'light' ? 'dark' : 'light';
      setThemeMode(newMode);
      await AsyncStorage.setItem('themeMode', newMode);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, [themeMode]);

  const setSystemTheme = useCallback(async () => {
    try {
      setThemeMode('system');
      await AsyncStorage.setItem('themeMode', 'system');
    } catch (error) {
      console.error('Error setting system theme:', error);
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        themeMode,
        toggleTheme,
        setSystemTheme,
        isThemeLoaded,
      }}>
      {children}
    </ThemeContext.Provider>
  );
};
