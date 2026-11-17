import React, {useState, useEffect, useContext, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import {PrivacyLockContext} from '../context/PrivacyLockContext';
import {ThemeContext} from '../context/ThemeContext';
import {colors} from '../utils/colors';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const PrivacyLockOverlay = () => {
  const {
    isLocked,
    isBiometricsAvailable,
    biometryTitle,
    unlockWithBiometrics,
    unlockWithPin,
  } = useContext(PrivacyLockContext);

  const {isDarkMode} = useContext(ThemeContext);
  const currentColors = isDarkMode ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [shakeAnimation] = useState(new Animated.Value(0));

  // Automatically prompt biometrics when overlay appears
  useEffect(() => {
    if (isLocked) {
      setEnteredPin('');
      setErrorMessage('');
      if (isBiometricsAvailable) {
        unlockWithBiometrics();
      }
    }
  }, [isLocked, isBiometricsAvailable, unlockWithBiometrics]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [shakeAnimation]);

  const handleKeyPress = useCallback(
    async digit => {
      if (enteredPin.length >= 4) return;

      const newPin = enteredPin + digit;
      setEnteredPin(newPin);
      setErrorMessage('');

      if (newPin.length === 4) {
        const success = await unlockWithPin(newPin);
        if (!success) {
          triggerShake();
          setErrorMessage('Incorrect PIN. Please try again.');
          setEnteredPin('');
        }
      }
    },
    [enteredPin, unlockWithPin, triggerShake],
  );

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(prev => prev.slice(0, -1));
      setErrorMessage('');
    }
  };

  if (!isLocked) {
    return null;
  }

  const numpadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['biometric', '0', 'delete'],
  ];

  const getBiometricIconName = () => {
    if (biometryTitle.includes('Face')) return 'face';
    return 'fingerprint';
  };

  return (
    <View
      style={[
        styles.overlay,
        {
          backgroundColor: currentColors.background,
          paddingTop: insets.top + hp(2),
          paddingBottom: insets.bottom + hp(2),
        },
      ]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* Lock Header */}
      <View style={styles.header}>
        <View
          style={[
            styles.lockIconBadge,
            {backgroundColor: currentColors.primary + '20'},
          ]}>
          <Icon name="lock" size={hp(4.5)} color={currentColors.primary} />
        </View>
        <Text style={[styles.title, {color: currentColors.text}]}>
          Journal Locked
        </Text>
        <Text style={[styles.subtitle, {color: currentColors.secondaryText}]}>
          Enter your PIN or use {biometryTitle}
        </Text>
      </View>

      {/* PIN Dots Display */}
      <Animated.View
        style={[
          styles.pinDotsContainer,
          {transform: [{translateX: shakeAnimation}]},
        ]}>
        {[0, 1, 2, 3].map(index => {
          const isFilled = enteredPin.length > index;
          return (
            <View
              key={index}
              style={[
                styles.pinDot,
                {
                  borderColor: currentColors.primary,
                  backgroundColor: isFilled
                    ? currentColors.primary
                    : 'transparent',
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {/* Error text */}
      <View style={styles.errorContainer}>
        {errorMessage ? (
          <Text style={[styles.errorText, {color: currentColors.deleteButton}]}>
            {errorMessage}
          </Text>
        ) : null}
      </View>

      {/* Numpad */}
      <View style={styles.keypadContainer}>
        {numpadRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((item, colIndex) => {
              if (item === 'biometric') {
                if (!isBiometricsAvailable) {
                  return <View key={colIndex} style={styles.keypadButton} />;
                }
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[
                      styles.keypadButton,
                      styles.actionButton,
                      {backgroundColor: currentColors.card},
                    ]}
                    onPress={unlockWithBiometrics}
                    accessibilityLabel={`Unlock with ${biometryTitle}`}>
                    <Icon
                      name={getBiometricIconName()}
                      size={hp(3.5)}
                      color={currentColors.primary}
                    />
                  </TouchableOpacity>
                );
              }

              if (item === 'delete') {
                return (
                  <TouchableOpacity
                    key={colIndex}
                    style={[
                      styles.keypadButton,
                      styles.actionButton,
                      {backgroundColor: currentColors.card},
                    ]}
                    onPress={handleDelete}
                    accessibilityLabel="Delete last digit">
                    <Icon
                      name="backspace"
                      size={hp(3)}
                      color={currentColors.secondaryText}
                    />
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={colIndex}
                  style={[
                    styles.keypadButton,
                    {
                      backgroundColor: currentColors.card,
                      borderColor: isDarkMode ? '#3D2F54' : '#E8D9F7',
                    },
                  ]}
                  onPress={() => handleKeyPress(item)}
                  accessibilityLabel={`Digit ${item}`}>
                  <Text
                    style={[
                      styles.keypadButtonText,
                      {color: currentColors.text},
                    ]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Quick Biometric action at bottom if available */}
      {isBiometricsAvailable && (
        <TouchableOpacity
          style={[
            styles.biometricPromptButton,
            {borderColor: currentColors.primary},
          ]}
          onPress={unlockWithBiometrics}>
          <Icon
            name={getBiometricIconName()}
            size={hp(2.5)}
            color={currentColors.primary}
          />
          <Text
            style={[
              styles.biometricPromptText,
              {color: currentColors.primary},
            ]}>
            Use {biometryTitle}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  header: {
    alignItems: 'center',
    marginTop: hp(4),
  },
  lockIconBadge: {
    width: hp(9),
    height: hp(9),
    borderRadius: hp(4.5),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  title: {
    fontSize: hp(2.8),
    fontWeight: 'bold',
    marginBottom: hp(0.8),
  },
  subtitle: {
    fontSize: hp(1.8),
    textAlign: 'center',
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: hp(2),
  },
  pinDot: {
    width: wp(4.5),
    height: wp(4.5),
    borderRadius: wp(2.25),
    borderWidth: 2,
    marginHorizontal: wp(3),
  },
  errorContainer: {
    height: hp(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: hp(1.7),
    fontWeight: '600',
  },
  keypadContainer: {
    width: wp(80),
    maxWidth: 340,
    marginBottom: hp(2),
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  keypadButton: {
    width: wp(18),
    height: wp(18),
    maxWidth: 72,
    maxHeight: 72,
    borderRadius: wp(9),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  actionButton: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  keypadButtonText: {
    fontSize: hp(3.2),
    fontWeight: '500',
  },
  biometricPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(5),
    borderRadius: wp(6),
    borderWidth: 1,
    marginBottom: hp(2),
  },
  biometricPromptText: {
    fontSize: hp(1.8),
    fontWeight: '600',
    marginLeft: wp(2),
  },
});

export default PrivacyLockOverlay;
