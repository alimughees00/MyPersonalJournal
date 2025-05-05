import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'auth_credentials';
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export const auth = {
  lastActivity: null,

  async login(username, password) {
    try {
      const storedData = await AsyncStorage.getItem(AUTH_KEY);
      const credentials = storedData ? JSON.parse(storedData) : null;

      if (!credentials) {
        // First time login - store credentials
        await AsyncStorage.setItem(
          AUTH_KEY,
          JSON.stringify({username, password}),
        );
        this.lastActivity = new Date().getTime();
        return true;
      }

      if (
        credentials.username === username &&
        credentials.password === password
      ) {
        this.lastActivity = new Date().getTime();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  isSessionExpired() {
    if (!this.lastActivity) return true;

    const currentTime = new Date().getTime();
    return currentTime - this.lastActivity > SESSION_TIMEOUT;
  },

  updateActivity() {
    this.lastActivity = new Date().getTime();
  },

  async logout() {
    this.lastActivity = null;
  },
};
