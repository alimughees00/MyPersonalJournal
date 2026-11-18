/* eslint-env jest */
import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn().mockResolvedValue('journal-reminders'),
    requestPermission: jest.fn().mockResolvedValue({ authorizationStatus: 1 }),
    displayNotification: jest.fn().mockResolvedValue('notification-id'),
    createTriggerNotification: jest.fn().mockResolvedValue('daily-reminder'),
    cancelNotification: jest.fn().mockResolvedValue(undefined),
  },
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
    NONE: 0,
  },
  TriggerType: {
    TIMESTAMP: 0,
    INTERVAL: 1,
  },
  RepeatFrequency: {
    NONE: -1,
    HOURLY: 0,
    DAILY: 1,
    WEEKLY: 2,
  },
}));

jest.mock('@react-native-firebase/app', () => ({
  __esModule: true,
  default: {
    apps: [],
    initializeApp: jest.fn(),
  },
}));

const mockMessagingInstance = {
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('dummy-token'),
  onMessage: jest.fn(),
  onNotificationOpenedApp: jest.fn(),
  getInitialNotification: jest.fn().mockResolvedValue(null),
};
const mockMessaging = Object.assign(
  jest.fn(() => mockMessagingInstance),
  {
    AuthorizationStatus: {
      NOT_DETERMINED: -1,
      DENIED: 0,
      AUTHORIZED: 1,
      PROVISIONAL: 2,
    },
  },
);

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: mockMessaging,
}));

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn().mockReturnValue('1.0.0'),
  getBuildNumber: jest.fn().mockReturnValue('1'),
}));

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('react-native-audio-recorder-player', () => {
  return jest.fn().mockImplementation(() => ({
    startRecorder: jest.fn(),
    stopRecorder: jest.fn(),
    addRecordBackListener: jest.fn(),
    removeRecordBackListener: jest.fn(),
    startPlayer: jest.fn(),
    stopPlayer: jest.fn(),
    addPlayBackListener: jest.fn(),
    removePlayBackListener: jest.fn(),
  }));
});

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  CachesDirectoryPath: '/mock/caches',
  exists: jest.fn().mockResolvedValue(true),
  mkdir: jest.fn().mockResolvedValue(true),
  copyFile: jest.fn().mockResolvedValue(true),
  unlink: jest.fn().mockResolvedValue(true),
}));

const BiometryTypes = {
  TouchID: 'TouchID',
  FaceID: 'FaceID',
  Biometrics: 'Biometrics',
};

jest.mock('react-native-biometrics', () => {
  const MockBiometrics = jest.fn().mockImplementation(() => ({
    isSensorAvailable: jest.fn().mockResolvedValue({available: true, biometryType: 'Biometrics'}),
    simplePrompt: jest.fn().mockResolvedValue({success: true}),
  }));
  MockBiometrics.BiometryTypes = BiometryTypes;
  return {
    __esModule: true,
    default: MockBiometrics,
    BiometryTypes,
    TouchID: 'TouchID',
    FaceID: 'FaceID',
    Biometrics: 'Biometrics',
  };
});
