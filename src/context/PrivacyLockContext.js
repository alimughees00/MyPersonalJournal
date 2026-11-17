import React, {createContext, useState, useEffect, useRef, useCallback} from 'react';
import {AppState} from 'react-native';
import {privacyLock} from '../utils/privacyLock';

export const PrivacyLockContext = createContext();

export const PrivacyLockProvider = ({children}) => {
  const [isPrivacyLockEnabled, setIsPrivacyLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [isBiometricsAvailable, setIsBiometricsAvailable] = useState(false);

  const appStateRef = useRef(AppState.currentState);
  const isPromptingBiometricsRef = useRef(false);

  // Initialize privacy lock status and biometrics availability
  const initialize = useCallback(async () => {
    try {
      const [{available, biometryType: type}, enabled, hasPin] =
        await Promise.all([
          privacyLock.checkBiometrics(),
          privacyLock.isEnabled(),
          privacyLock.hasPin(),
        ]);

      setBiometryType(type);
      setIsBiometricsAvailable(available);

      // Lock is only truly active if user enabled it AND configured a PIN fallback
      const lockActive = enabled && hasPin;
      setIsPrivacyLockEnabled(lockActive);

      if (lockActive) {
        setIsLocked(true);
      }
    } catch (error) {
      console.error('Error initializing privacy lock:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Attempt biometric unlock
  const unlockWithBiometrics = useCallback(async () => {
    if (!isBiometricsAvailable || isPromptingBiometricsRef.current) {
      return false;
    }

    try {
      isPromptingBiometricsRef.current = true;
      const result = await privacyLock.authenticateBiometrics(
        'Unlock your Journal',
      );
      if (result.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch (err) {
      console.log('Biometrics unlock error:', err);
      return false;
    } finally {
      isPromptingBiometricsRef.current = false;
    }
  }, [isBiometricsAvailable]);

  // Unlock with app-specific PIN
  const unlockWithPin = useCallback(async pin => {
    const isValid = await privacyLock.verifyPin(pin);
    if (isValid) {
      setIsLocked(false);
      return true;
    }
    return false;
  }, []);

  // Lock the journal manually
  const lock = useCallback(() => {
    if (isPrivacyLockEnabled) {
      setIsLocked(true);
    }
  }, [isPrivacyLockEnabled]);

  // Listen to AppState changes for automatic re-locking
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;

      // When app goes into background or becomes inactive (e.g. app switcher), lock immediately
      if (nextAppState.match(/inactive|background/) && isPrivacyLockEnabled) {
        setIsLocked(true);
      }

      // When app returns to foreground and is locked, attempt biometric unlock automatically
      if (
        prev.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isPrivacyLockEnabled &&
        isBiometricsAvailable
      ) {
        // Small delay to allow window focus transition
        setTimeout(() => {
          unlockWithBiometrics();
        }, 200);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isPrivacyLockEnabled, isBiometricsAvailable, unlockWithBiometrics]);

  // Enable privacy lock with an app-specific PIN
  const enablePrivacyLock = useCallback(async pin => {
    try {
      const pinSet = await privacyLock.setPin(pin);
      if (!pinSet) return false;

      const enabled = await privacyLock.setEnabled(true);
      if (enabled) {
        setIsPrivacyLockEnabled(true);
        setIsLocked(false); // keep unlocked for current session
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error enabling privacy lock:', error);
      return false;
    }
  }, []);

  // Disable privacy lock (clears PIN and setting)
  const disablePrivacyLock = useCallback(async () => {
    try {
      await privacyLock.resetLock();
      setIsPrivacyLockEnabled(false);
      setIsLocked(false);
      return true;
    } catch (error) {
      console.error('Error disabling privacy lock:', error);
      return false;
    }
  }, []);

  // Change existing PIN
  const changePin = useCallback(async (oldPin, newPin) => {
    const isOldValid = await privacyLock.verifyPin(oldPin);
    if (!isOldValid) {
      return {success: false, error: 'Current PIN is incorrect'};
    }

    const updated = await privacyLock.setPin(newPin);
    if (updated) {
      return {success: true};
    }
    return {success: false, error: 'Failed to update PIN'};
  }, []);

  const biometryTitle = privacyLock.getBiometryTitle(biometryType);

  return (
    <PrivacyLockContext.Provider
      value={{
        isPrivacyLockEnabled,
        isLocked,
        isInitialized,
        biometryType,
        isBiometricsAvailable,
        biometryTitle,
        unlockWithBiometrics,
        unlockWithPin,
        enablePrivacyLock,
        disablePrivacyLock,
        changePin,
        lock,
      }}>
      {children}
    </PrivacyLockContext.Provider>
  );
};
