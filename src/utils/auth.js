import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'auth_credentials';
const SECURITY_KEY = 'security_qa';
const SESSION_KEY = 'session_active'; // persists logged-in state across restarts
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds (legacy, kept for isSessionExpired)

export const auth = {
  lastActivity: null,

  async login(username, password, securityAnswer = null, question = null) {
    try {
      const storedData = await AsyncStorage.getItem(AUTH_KEY);
      const credentials = storedData ? JSON.parse(storedData) : null;

      if (!credentials) {
        // First time login - store credentials and security answer
        if (!securityAnswer) {
          return { needsSecuritySetup: true };
        }

        await AsyncStorage.multiSet([
          [AUTH_KEY, JSON.stringify({ username, password })],
          [
            SECURITY_KEY,
            JSON.stringify({
              question:
                question || "What is your favorite childhood pet's name?",
              answer: securityAnswer,
            }),
          ],
          [SESSION_KEY, 'true'], // mark session active
        ]);

        this.updateActivity();
        return { success: true };
      }

      if (
        credentials.username === username &&
        credentials.password === password
      ) {
        await AsyncStorage.setItem(SESSION_KEY, 'true'); // mark session active
        this.updateActivity();
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
    }
  },

  async isAuthenticated() {
    const storedData = await AsyncStorage.getItem(AUTH_KEY);
    return !!storedData && !this.isSessionExpired();
  },

  async getSecurityQuestion() {
    try {
      const data = await AsyncStorage.getItem(SECURITY_KEY);
      return data
        ? JSON.parse(data).question
        : "What is your favorite childhood pet's name?";
    } catch (error) {
      return "What is your favorite childhood pet's name?";
    }
  },

  async resetPassword(newPassword, answer) {
    try {
      if (await this.verifySecurityAnswer(answer)) {
        const storedData = await AsyncStorage.getItem(AUTH_KEY);
        if (!storedData) return false;

        const credentials = JSON.parse(storedData);
        credentials.password = newPassword;

        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(credentials));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Reset password error:', error);
      return false;
    }
  },

  isSessionExpired() {
    if (!this.lastActivity) return true;

    const currentTime = Date.now();
    return currentTime - this.lastActivity > SESSION_TIMEOUT;
  },

  updateActivity() {
    this.lastActivity = Date.now();
  },

  async logout() {
    // Clear in-memory session and remove persistent session flag.
    // Credentials remain in AsyncStorage so the user can sign back in.
    this.lastActivity = null;
    await AsyncStorage.removeItem(SESSION_KEY);
  },

  async setSecurityQuestion(question, answer) {
    try {
      await AsyncStorage.setItem(
        'security_qa',
        JSON.stringify({ question, answer }),
      );
      return true;
    } catch (error) {
      console.error('Error setting security question:', error);
      return false;
    }
  },

  async verifySecurityAnswer(answer) {
    try {
      const securityData = await AsyncStorage.getItem('security_qa');
      if (!securityData) return false;

      const { answer: storedAnswer } = JSON.parse(securityData);
      return storedAnswer === answer;
    } catch (error) {
      console.error('Error verifying security answer:', error);
      return false;
    }
  },

  async getCredentialsWithSecurity(answer) {
    if (await this.verifySecurityAnswer(answer)) {
      const storedData = await AsyncStorage.getItem(AUTH_KEY);
      return JSON.parse(storedData);
    }
    return null;
  },

  async hasAccount() {
    try {
      const storedData = await AsyncStorage.getItem(AUTH_KEY);
      return !!storedData;
    } catch (error) {
      return false;
    }
  },

  async isLoggedIn() {
    try {
      // Check the persistent session flag instead of in-memory lastActivity.
      const sessionFlag = await AsyncStorage.getItem(SESSION_KEY);
      return sessionFlag === 'true';
    } catch (error) {
      return false;
    }
  },

  async deleteAccount() {
    try {
      await AsyncStorage.multiRemove([AUTH_KEY, SECURITY_KEY, SESSION_KEY]);
      this.lastActivity = null;
      return true;
    } catch (error) {
      console.error('Error deleting account:', error);
      return false;
    }
  },

  async getUsername() {
    try {
      // Only return username if an active session exists
      const sessionFlag = await AsyncStorage.getItem(SESSION_KEY);
      if (sessionFlag !== 'true') return null;
      const storedData = await AsyncStorage.getItem(AUTH_KEY);
      if (!storedData) return null;
      return JSON.parse(storedData).username;
    } catch (error) {
      console.error('Error getting username:', error);
      return null;
    }
  },
};
