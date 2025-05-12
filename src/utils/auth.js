import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'auth_credentials';
const SECURITY_KEY = 'security_qa';
const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export const auth = {
  lastActivity: null,

  async login(username, password, securityAnswer = null) {
    try {
      const storedData = await AsyncStorage.getItem(AUTH_KEY);
      const credentials = storedData ? JSON.parse(storedData) : null;

      if (!credentials) {
        // First time login - store credentials and security answer
        if (!securityAnswer) {
          return { needsSecuritySetup: true };
        }
        
        await AsyncStorage.setItem(
          AUTH_KEY,
          JSON.stringify({username, password}),
        );
        
        await AsyncStorage.setItem(
          SECURITY_KEY,
          JSON.stringify({
            question: "What is your favorite childhood pet's name?",
            answer: securityAnswer
          })
        );
        
        this.lastActivity = new Date().getTime();
        return { success: true };
      }

      if (
        credentials.username === username &&
        credentials.password === password
      ) {
        this.lastActivity = new Date().getTime();
        return { success: true };
      }

      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false };
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

  async setSecurityQuestion(question, answer) {
    try {
      await AsyncStorage.setItem(
        'security_qa',
        JSON.stringify({ question, answer })
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
  }
};
