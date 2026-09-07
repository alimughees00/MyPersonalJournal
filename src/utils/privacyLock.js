/* eslint-disable no-bitwise */
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics, {BiometryTypes} from 'react-native-biometrics';

const PRIVACY_LOCK_KEY = '@myjournal_privacy_lock_enabled';
const PIN_HASH_KEY = '@myjournal_privacy_pin_hash';
const PIN_SALT_KEY = '@myjournal_privacy_pin_salt';

const rnBiometrics = new ReactNativeBiometrics({allowDeviceCredentials: false});

// Self-contained, lightweight SHA-256 implementation for hashing the app-specific PIN
function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [];
  const k = [];
  let primeCounter = 0;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (i = 0; i < ascii[lengthProperty]; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << ((3 - (i % 4)) * 8);
  }

  for (j = 0; j < words[lengthProperty]; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const a = hash[0];
      const e = hash[4];

      const s1 =
        rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & hash[5]) ^ (~e & hash[6]);
      const temp1 = hash[7] + s1 + ch + k[i] + (w[i] =
        i < 16
          ? w[i] | 0
          : (w[i - 16] +
              (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
              w[i - 7] +
              (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
            0);
      const s0 =
        rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = s0 + maj;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

function generateSalt() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 15)
  );
}

export const privacyLock = {
  /**
   * Check if biometric sensors (Face ID, Touch ID, or Android Biometrics) are available
   */
  async checkBiometrics() {
    try {
      const {available, biometryType} = await rnBiometrics.isSensorAvailable();
      return {
        available: !!available,
        biometryType: biometryType || null,
      };
    } catch (error) {
      console.warn('Biometrics check error:', error);
      return {available: false, biometryType: null};
    }
  },

  /**
   * Returns a friendly name for the biometric sensor
   */
  getBiometryTitle(biometryType) {
    if (biometryType === BiometryTypes.FaceID) {
      return 'Face ID';
    } else if (biometryType === BiometryTypes.TouchID) {
      return 'Touch ID';
    } else if (biometryType === BiometryTypes.Biometrics) {
      return 'Fingerprint / Biometrics';
    }
    return 'Biometrics';
  },

  /**
   * Prompt biometric authentication
   */
  async authenticateBiometrics(promptMessage = 'Unlock your Journal') {
    try {
      const {available} = await this.checkBiometrics();
      if (!available) {
        return {success: false, error: 'Biometrics not available'};
      }

      const {success} = await rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Use PIN',
      });

      return {success: !!success};
    } catch (error) {
      console.log('Biometrics auth dismissed or failed:', error);
      return {success: false, error: error?.message || 'Biometric authentication failed'};
    }
  },

  /**
   * Check if Privacy Lock is enabled by the user
   */
  async isEnabled() {
    try {
      const value = await AsyncStorage.getItem(PRIVACY_LOCK_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error reading privacy lock setting:', error);
      return false;
    }
  },

  /**
   * Set Privacy Lock state
   */
  async setEnabled(enabled) {
    try {
      await AsyncStorage.setItem(PRIVACY_LOCK_KEY, enabled ? 'true' : 'false');
      return true;
    } catch (error) {
      console.error('Error saving privacy lock setting:', error);
      return false;
    }
  },

  /**
   * Set/update app-specific PIN
   */
  async setPin(pin) {
    try {
      if (!pin || typeof pin !== 'string' || pin.length < 4) {
        throw new Error('PIN must be at least 4 digits');
      }
      const salt = generateSalt();
      const hash = sha256(salt + pin);

      await AsyncStorage.multiSet([
        [PIN_HASH_KEY, hash],
        [PIN_SALT_KEY, salt],
      ]);
      return true;
    } catch (error) {
      console.error('Error setting PIN:', error);
      return false;
    }
  },

  /**
   * Verify app-specific PIN
   */
  async verifyPin(pin) {
    try {
      const [storedHash, storedSalt] = await Promise.all([
        AsyncStorage.getItem(PIN_HASH_KEY),
        AsyncStorage.getItem(PIN_SALT_KEY),
      ]);

      if (!storedHash || !storedSalt) {
        return false;
      }

      const testHash = sha256(storedSalt + pin);
      return testHash === storedHash;
    } catch (error) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  },

  /**
   * Check if an app-specific PIN is currently set
   */
  async hasPin() {
    try {
      const hash = await AsyncStorage.getItem(PIN_HASH_KEY);
      return !!hash;
    } catch (error) {
      return false;
    }
  },

  /**
   * Clear PIN and disable privacy lock
   */
  async resetLock() {
    try {
      await AsyncStorage.multiRemove([
        PRIVACY_LOCK_KEY,
        PIN_HASH_KEY,
        PIN_SALT_KEY,
      ]);
      return true;
    } catch (error) {
      console.error('Error resetting privacy lock:', error);
      return false;
    }
  },
};
