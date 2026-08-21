import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, TriggerType, RepeatFrequency } from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NotificationService {
  constructor() {
    this.channelId = 'journal-reminders';
  }

  ensureFirebaseInitialized() {
    if (!firebase.apps.length) {
      try {
        firebase.initializeApp();
      } catch (error) {
        console.warn('Firebase initialization warning:', error);
      }
    }
  }

  async initialize() {
    this.ensureFirebaseInitialized();
    await this.createChannel();
    await this.requestPermission();
    this.setupListeners();
  }

  async createChannel() {
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: this.channelId,
        name: 'Journal Reminders',
        lights: true,
        vibration: true,
        importance: AndroidImportance.HIGH,
      });
    }
  }

  async requestPermission() {
    try {
      this.ensureFirebaseInitialized();
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        await this.getFcmToken();
      }
    } catch (error) {
      console.warn('Messaging permission error:', error);
    }
    
    // Also request Notifee permission for local notifications (Android 13+)
    try {
      await notifee.requestPermission();
    } catch (error) {
      console.warn('Notifee permission error:', error);
    }
  }

  async getFcmToken() {
    try {
      this.ensureFirebaseInitialized();
      const token = await messaging().getToken();
      if (token) {
        console.log('FCM Token:', token);
        await AsyncStorage.setItem('fcm_token', token);
        return token;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
    return null;
  }

  setupListeners() {
    try {
      this.ensureFirebaseInitialized();
      // Foreground messages
      messaging().onMessage(async remoteMessage => {
        console.log('Foreground message received:', remoteMessage);
        this.displayRemoteNotification(remoteMessage);
      });

      // Background/Quit state message opened
      messaging().onNotificationOpenedApp(remoteMessage => {
        console.log('Notification caused app to open from background:', remoteMessage);
      });

      messaging()
        .getInitialNotification()
        .then(remoteMessage => {
          if (remoteMessage) {
            console.log('Notification caused app to open from quit state:', remoteMessage);
          }
        })
        .catch(err => console.warn('Error getting initial notification:', err));
    } catch (error) {
      console.warn('Error setting up messaging listeners:', error);
    }
  }

  async displayRemoteNotification(remoteMessage) {
    const { notification, data } = remoteMessage;
    await notifee.displayNotification({
      title: notification?.title || 'New Notification',
      body: notification?.body || '',
      android: {
        channelId: this.channelId,
        pressAction: {
          id: 'default',
        },
      },
      data: data,
    });
  }

  async scheduleDailyReminder(hour, minute) {
    // Create a time-based trigger
    const date = new Date(Date.now());
    date.setHours(hour);
    date.setMinutes(minute);
    date.setSeconds(0);

    // If the time has already passed today, schedule it for tomorrow
    if (date.getTime() <= Date.now()) {
      date.setDate(date.getDate() + 1);
    }

    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(),
      repeatFrequency: RepeatFrequency.DAILY,
    };

    // Schedule the notification
    await notifee.createTriggerNotification(
      {
        id: 'daily-reminder',
        title: 'Time to Journal!',
        body: 'Take a moment to write down your thoughts for today.',
        android: {
          channelId: this.channelId,
          pressAction: {
            id: 'default',
          },
        },
      },
      trigger,
    );

    await AsyncStorage.setItem('reminder_time', JSON.stringify({ hour, minute }));
  }

  async cancelReminder() {
    await notifee.cancelNotification('daily-reminder');
    await AsyncStorage.removeItem('reminder_time');
  }

  async getScheduledReminder() {
    const reminder = await AsyncStorage.getItem('reminder_time');
    return reminder ? JSON.parse(reminder) : null;
  }
}

export const notificationService = new NotificationService();
