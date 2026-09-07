import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  StatusBar,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DeviceInfo from 'react-native-device-info';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { ThemeContext } from '../context/ThemeContext';
import { PrivacyLockContext } from '../context/PrivacyLockContext';
import { auth } from '../utils/auth';
import { notificationService } from '../utils/NotificationService';
import { colors } from '../utils/colors';
import CustomModal from '../components/CustomModal';

const FEEDBACK_EMAIL = 'feedback@baltorotech.com';

const SettingsScreen = ({ navigation }) => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const currentColors = isDarkMode ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();

  const {
    isPrivacyLockEnabled,
    isBiometricsAvailable,
    biometryTitle,
    enablePrivacyLock,
    disablePrivacyLock,
    changePin,
    lock,
    unlockWithBiometrics,
    unlockWithPin,
  } = useContext(PrivacyLockContext);

  // App version & account state
  const [version, setVersion] = useState('');
  const [accountUser, setAccountUser] = useState(null);

  // Reminder states
  const [reminderTime, setReminderTime] = useState(new Date());
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // PIN Setup Modal states
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [pinStep, setPinStep] = useState('enter'); // 'enter' | 'confirm'
  const [tempPin, setTempPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinModalError, setPinModalError] = useState('');

  // Change PIN Modal states
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [changePinError, setChangePinError] = useState('');

  // Disable Lock Confirmation Modal states
  const [showDisableVerifyModal, setShowDisableVerifyModal] = useState(false);
  const [disableVerifyPin, setDisableVerifyPin] = useState('');
  const [disableVerifyError, setDisableVerifyError] = useState('');

  // Generic Alert Modal
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    isDestructive: false,
  });

  // Load version and reminder once on mount
  useEffect(() => {
    try {
      const ver = DeviceInfo.getVersion();
      setVersion(ver);
    } catch (e) {
      console.warn('Error reading app version:', e);
    }

    notificationService.getScheduledReminder().then(reminder => {
      if (reminder) {
        const date = new Date();
        date.setHours(reminder.hour);
        date.setMinutes(reminder.minute);
        setReminderTime(date);
        setIsReminderEnabled(true);
      }
    });
  }, []);

  // Reload account username whenever this screen gains focus
  // (e.g. returning from Login screen after signing in)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      auth.getUsername().then(username => {
        setAccountUser(username || null);
      });
    });
    return unsubscribe;
  }, [navigation]);

  // Handle Privacy Lock Toggle
  const handlePrivacyLockToggle = async value => {
    if (value) {
      // User wants to enable privacy lock: start PIN setup
      setTempPin('');
      setConfirmPin('');
      setPinStep('enter');
      setPinModalError('');
      setShowPinSetupModal(true);
    } else {
      // User wants to disable privacy lock: verify identity first
      if (isBiometricsAvailable) {
        const success = await unlockWithBiometrics();
        if (success) {
          await disablePrivacyLock();
          return;
        }
      }
      // If biometrics failed or not available, ask for PIN
      setDisableVerifyPin('');
      setDisableVerifyError('');
      setShowDisableVerifyModal(true);
    }
  };

  // Submit new PIN
  const handlePinSetupSubmit = async () => {
    if (pinStep === 'enter') {
      if (tempPin.length !== 4) {
        setPinModalError('PIN must be exactly 4 digits');
        return;
      }
      setPinModalError('');
      setPinStep('confirm');
    } else {
      if (confirmPin.length !== 4) {
        setPinModalError('Please enter the 4-digit confirmation PIN');
        return;
      }
      if (tempPin !== confirmPin) {
        setPinModalError('PINs do not match. Please try again.');
        setConfirmPin('');
        return;
      }

      const success = await enablePrivacyLock(confirmPin);
      if (success) {
        setShowPinSetupModal(false);
        setModalConfig({
          title: 'Privacy Lock Enabled',
          message: `Your journal is now protected with ${isBiometricsAvailable ? `${biometryTitle} and ` : ''
            }your 4-digit PIN.`,
          confirmText: 'Great',
          onConfirm: () => setCustomModalVisible(false),
        });
        setCustomModalVisible(true);
      } else {
        setPinModalError('Failed to save PIN. Please try again.');
      }
    }
  };

  // Change PIN Submit
  const handleChangePinSubmit = async () => {
    if (currentPin.length !== 4) {
      setChangePinError('Enter your 4-digit current PIN');
      return;
    }
    if (newPin.length !== 4) {
      setChangePinError('New PIN must be 4 digits');
      return;
    }
    if (newPin !== confirmNewPin) {
      setChangePinError('New PINs do not match');
      return;
    }

    const result = await changePin(currentPin, newPin);
    if (result.success) {
      setShowChangePinModal(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setChangePinError('');
      setModalConfig({
        title: 'Success',
        message: 'Your privacy PIN has been updated.',
        confirmText: 'OK',
        onConfirm: () => setCustomModalVisible(false),
      });
      setCustomModalVisible(true);
    } else {
      setChangePinError(result.error || 'Failed to update PIN');
    }
  };

  // Verify PIN to disable lock
  const handleVerifyDisableSubmit = async () => {
    if (disableVerifyPin.length !== 4) {
      setDisableVerifyError('Please enter your 4-digit PIN');
      return;
    }

    const isValid = await unlockWithPin(disableVerifyPin);
    if (isValid) {
      await disablePrivacyLock();
      setShowDisableVerifyModal(false);
    } else {
      setDisableVerifyError('Incorrect PIN');
    }
  };

  // Logout handler
  const handleLogout = () => {
    setModalConfig({
      title: 'Sign Out',
      message:
        'Signing out returns you to local guest mode. All your local journal entries will remain safe on this device.',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setCustomModalVisible(false);
        // Clear in-memory session (lastActivity)
        await auth.logout();
        // Update UI immediately
        setAccountUser(null);
      },
      onCancel: () => setCustomModalVisible(false),
    });
    setCustomModalVisible(true);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: currentColors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: currentColors.header,
            paddingTop: insets.top,
          },
        ]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}>
          <Icon name="arrow-back" size={hp(3)} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Privacy & Security Section */}
        <View style={styles.sectionHeader}>
          <Icon
            name="security"
            size={hp(2.4)}
            color={currentColors.primary}
            style={styles.sectionIcon}
          />
          <Text
            style={[styles.sectionTitle, { color: currentColors.secondaryText }]}>
            PRIVACY & SECURITY
          </Text>
        </View>

        <View
          style={[styles.card, { backgroundColor: currentColors.card }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: currentColors.text }]}>
                Privacy Lock
              </Text>
              <Text
                style={[
                  styles.settingSubtext,
                  { color: currentColors.secondaryText },
                ]}>
                {isPrivacyLockEnabled
                  ? `Protected with ${isBiometricsAvailable ? `${biometryTitle} & ` : ''
                  }PIN`
                  : 'Require authentication to open journal'}
              </Text>
            </View>
            <Switch
              value={isPrivacyLockEnabled}
              onValueChange={handlePrivacyLockToggle}
              trackColor={{
                false: isDarkMode ? '#3D2F54' : '#D1C4E9',
                true: currentColors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          {isPrivacyLockEnabled && (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: isDarkMode ? '#3D2F54' : '#F0E6FA' },
                ]}
              />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  setCurrentPin('');
                  setNewPin('');
                  setConfirmNewPin('');
                  setChangePinError('');
                  setShowChangePinModal(true);
                }}>
                <View style={styles.settingTextContainer}>
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: currentColors.primary },
                    ]}>
                    Change 4-Digit PIN
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtext,
                      { color: currentColors.secondaryText },
                    ]}>
                    Update your app-specific fallback PIN
                  </Text>
                </View>
                <Icon
                  name="chevron-right"
                  size={hp(2.5)}
                  color={currentColors.secondaryText}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: isDarkMode ? '#3D2F54' : '#F0E6FA' },
                ]}
              />
              <TouchableOpacity style={styles.actionRow} onPress={lock}>
                <View style={styles.settingTextContainer}>
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: currentColors.deleteButton },
                    ]}>
                    Lock Journal Now
                  </Text>
                  <Text
                    style={[
                      styles.settingSubtext,
                      { color: currentColors.secondaryText },
                    ]}>
                    Immediately activate privacy lock overlay
                  </Text>
                </View>
                <Icon
                  name="lock"
                  size={hp(2.2)}
                  color={currentColors.deleteButton}
                />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Account Section (Optional) */}
        <View style={styles.sectionHeader}>
          <Icon
            name="person-outline"
            size={hp(2.4)}
            color={currentColors.primary}
            style={styles.sectionIcon}
          />
          <Text
            style={[styles.sectionTitle, { color: currentColors.secondaryText }]}>
            ACCOUNT (OPTIONAL)
          </Text>
        </View>

        <View
          style={[styles.card, { backgroundColor: currentColors.card }]}>
          {accountUser ? (
            <>
              <View style={styles.settingRow}>
                <View style={styles.settingTextContainer}>
                  <Text
                    style={[styles.settingLabel, { color: currentColors.text }]}>
                    Signed in as
                  </Text>
                  <Text
                    style={[
                      styles.usernameText,
                      { color: currentColors.primary },
                    ]}>
                    @{accountUser}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: isDarkMode ? '#3D2F54' : '#F0E6FA' },
                ]}
              />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => navigation.navigate('ForgotPassword')}>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: currentColors.primary },
                  ]}>
                  Reset Password / Security
                </Text>
                <Icon
                  name="chevron-right"
                  size={hp(2.5)}
                  color={currentColors.secondaryText}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: isDarkMode ? '#3D2F54' : '#F0E6FA' },
                ]}
              />
              <TouchableOpacity
                style={styles.actionRow}
                onPress={handleLogout}>
                <Text
                  style={[
                    styles.actionLabel,
                    { color: currentColors.deleteButton },
                  ]}>
                  Sign Out (Switch to Local Mode)
                </Text>
                <Icon
                  name="logout"
                  size={hp(2.2)}
                  color={currentColors.deleteButton}
                />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.unauthenticatedContainer}>
              <View style={styles.offlineBadge}>
                <Icon
                  name="offline-pin"
                  size={hp(2.4)}
                  color={currentColors.primary}
                />
                <Text
                  style={[
                    styles.offlineBadgeText,
                    { color: currentColors.primary },
                  ]}>
                  Local & Private Mode Active
                </Text>
              </View>
              <Text
                style={[
                  styles.offlineExplanation,
                  { color: currentColors.secondaryText },
                ]}>
                You are using MyJournal without an account. All your journal
                entries, audio recordings, and photos are stored strictly on
                this device.
              </Text>
              <TouchableOpacity
                style={[
                  styles.accountButton,
                  { backgroundColor: currentColors.primary },
                ]}
                onPress={() => navigation.navigate('Login')}>
                <Icon name="person-add" size={hp(2.2)} color="#FFFFFF" />
                <Text style={styles.accountButtonText}>
                  Sign In / Create Account (Optional)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Preferences Section */}
        <View style={styles.sectionHeader}>
          <Icon
            name="tune"
            size={hp(2.4)}
            color={currentColors.primary}
            style={styles.sectionIcon}
          />
          <Text
            style={[styles.sectionTitle, { color: currentColors.secondaryText }]}>
            PREFERENCES
          </Text>
        </View>

        <View
          style={[styles.card, { backgroundColor: currentColors.card }]}>
          {/* Theme Toggle */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: currentColors.text }]}>
                Dark Mode
              </Text>
              <Text
                style={[
                  styles.settingSubtext,
                  { color: currentColors.secondaryText },
                ]}>
                {isDarkMode ? 'Dark theme active' : 'Light theme active'}
              </Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{
                false: isDarkMode ? '#3D2F54' : '#D1C4E9',
                true: currentColors.primary,
              }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: isDarkMode ? '#3D2F54' : '#F0E6FA' },
            ]}
          />

          {/* Daily Reminder */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setShowTimePicker(true)}>
            <View style={styles.settingTextContainer}>
              <Text style={[styles.settingLabel, { color: currentColors.text }]}>
                Daily Journaling Reminder
              </Text>
              <Text
                style={[
                  styles.settingSubtext,
                  { color: currentColors.secondaryText },
                ]}>
                {isReminderEnabled
                  ? `Scheduled for ${reminderTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                  : 'Disabled'}
              </Text>
            </View>
            <Icon
              name="notifications"
              size={hp(2.5)}
              color={isReminderEnabled ? '#FFD700' : currentColors.secondaryText}
            />
          </TouchableOpacity>
        </View>

        {/* About & Support Section */}
        <View style={styles.sectionHeader}>
          <Icon
            name="info-outline"
            size={hp(2.4)}
            color={currentColors.primary}
            style={styles.sectionIcon}
          />
          <Text
            style={[styles.sectionTitle, { color: currentColors.secondaryText }]}>
            ABOUT
          </Text>
        </View>

        <View
          style={[styles.card, { backgroundColor: currentColors.card }]}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: currentColors.text }]}>
              Version
            </Text>
            <Text
              style={[
                styles.settingSubtext,
                { color: currentColors.secondaryText },
              ]}>
              {version || '1.0.0'}
            </Text>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: isDarkMode ? '#3D2F54' : '#F0E6FA' },
            ]}
          />

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => Linking.openURL(`mailto:${FEEDBACK_EMAIL}`)}>
            <Text style={[styles.actionLabel, { color: currentColors.primary }]}>
              Send Feedback
            </Text>
            <Icon
              name="email"
              size={hp(2.2)}
              color={currentColors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* <View style={styles.guidelineNote}>
          <Icon
            name="verified-user"
            size={hp(2)}
            color={currentColors.secondaryText}
            style={{marginRight: wp(1.5)}}
          />
          <Text
            style={[
              styles.guidelineText,
              {color: currentColors.secondaryText},
            ]}>
            Apple Guideline 5.1.1(v) Compliant: Privacy-first offline storage.
          </Text>
        </View> */}
      </ScrollView>

      {/* Date/Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={reminderTime}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={async (event, selectedDate) => {
            setShowTimePicker(false);
            if (event.type === 'set' && selectedDate) {
              setReminderTime(selectedDate);
              setIsReminderEnabled(true);
              await notificationService.scheduleDailyReminder(
                selectedDate.getHours(),
                selectedDate.getMinutes(),
              );
            } else if (event.type === 'dismissed') {
              setModalConfig({
                title: 'Daily Reminder',
                message: 'Do you want to disable the daily reminder?',
                confirmText: 'Disable',
                cancelText: 'Keep',
                isDestructive: true,
                onConfirm: async () => {
                  setCustomModalVisible(false);
                  setIsReminderEnabled(false);
                  await notificationService.cancelReminder();
                },
                onCancel: () => setCustomModalVisible(false),
              });
              setCustomModalVisible(true);
            }
          }}
        />
      )}

      {/* Modal: PIN Setup (Enable Lock) */}
      <Modal
        visible={showPinSetupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPinSetupModal(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.pinModalContent,
              { backgroundColor: currentColors.card },
            ]}>
            <View style={styles.modalHeader}>
              <Icon name="lock" size={hp(3.5)} color={currentColors.primary} />
              <Text
                style={[styles.modalTitle, { color: currentColors.text }]}>
                {pinStep === 'enter' ? 'Set App PIN' : 'Confirm App PIN'}
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  { color: currentColors.secondaryText },
                ]}>
                {pinStep === 'enter'
                  ? 'Choose a 4-digit PIN for your privacy lock'
                  : 'Re-enter your 4-digit PIN to confirm'}
              </Text>
            </View>

            <TextInput
              style={[
                styles.pinInput,
                {
                  color: currentColors.text,
                  borderColor: currentColors.primary,
                  backgroundColor: isDarkMode ? '#2D223B' : '#F9F5FD',
                },
              ]}
              value={pinStep === 'enter' ? tempPin : confirmPin}
              onChangeText={text => {
                const numeric = text.replace(/[^0-9]/g, '').slice(0, 4);
                if (pinStep === 'enter') setTempPin(numeric);
                else setConfirmPin(numeric);
              }}
              placeholder="••••"
              placeholderTextColor={isDarkMode ? '#7E7090' : '#B0A3C0'}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              autoFocus
              textAlign="center"
            />

            {pinModalError ? (
              <Text
                style={[
                  styles.modalError,
                  { color: currentColors.deleteButton },
                ]}>
                {pinModalError}
              </Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: currentColors.secondaryText },
                ]}
                onPress={() => setShowPinSetupModal(false)}>
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: currentColors.secondaryText },
                  ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: currentColors.primary },
                ]}
                onPress={handlePinSetupSubmit}>
                <Text style={styles.modalSubmitBtnText}>
                  {pinStep === 'enter' ? 'Next' : 'Save PIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Change PIN */}
      <Modal
        visible={showChangePinModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChangePinModal(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.pinModalContent,
              { backgroundColor: currentColors.card },
            ]}>
            <Text style={[styles.modalTitle, { color: currentColors.text }]}>
              Change Privacy PIN
            </Text>

            <TextInput
              style={[
                styles.pinInputSmall,
                {
                  color: currentColors.text,
                  borderColor: isDarkMode ? '#3D2F54' : '#E0E0E0',
                  backgroundColor: isDarkMode ? '#2D223B' : '#F9F5FD',
                },
              ]}
              placeholder="Current 4-digit PIN"
              placeholderTextColor={isDarkMode ? '#7E7090' : '#B0A3C0'}
              value={currentPin}
              onChangeText={text =>
                setCurrentPin(text.replace(/[^0-9]/g, '').slice(0, 4))
              }
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              textAlign="center"
            />

            <TextInput
              style={[
                styles.pinInputSmall,
                {
                  color: currentColors.text,
                  borderColor: isDarkMode ? '#3D2F54' : '#E0E0E0',
                  backgroundColor: isDarkMode ? '#2D223B' : '#F9F5FD',
                },
              ]}
              placeholder="New 4-digit PIN"
              placeholderTextColor={isDarkMode ? '#7E7090' : '#B0A3C0'}
              value={newPin}
              onChangeText={text =>
                setNewPin(text.replace(/[^0-9]/g, '').slice(0, 4))
              }
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              textAlign="center"
            />

            <TextInput
              style={[
                styles.pinInputSmall,
                {
                  color: currentColors.text,
                  borderColor: isDarkMode ? '#3D2F54' : '#E0E0E0',
                  backgroundColor: isDarkMode ? '#2D223B' : '#F9F5FD',
                },
              ]}
              placeholder="Confirm New 4-digit PIN"
              placeholderTextColor={isDarkMode ? '#7E7090' : '#B0A3C0'}
              value={confirmNewPin}
              onChangeText={text =>
                setConfirmNewPin(text.replace(/[^0-9]/g, '').slice(0, 4))
              }
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              textAlign="center"
            />

            {changePinError ? (
              <Text
                style={[
                  styles.modalError,
                  { color: currentColors.deleteButton },
                ]}>
                {changePinError}
              </Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: currentColors.secondaryText },
                ]}
                onPress={() => setShowChangePinModal(false)}>
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: currentColors.secondaryText },
                  ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: currentColors.primary },
                ]}
                onPress={handleChangePinSubmit}>
                <Text style={styles.modalSubmitBtnText}>Update PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Verify PIN to Disable Privacy Lock */}
      <Modal
        visible={showDisableVerifyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDisableVerifyModal(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.pinModalContent,
              { backgroundColor: currentColors.card },
            ]}>
            <Text style={[styles.modalTitle, { color: currentColors.text }]}>
              Verify Identity
            </Text>
            <Text
              style={[
                styles.modalSubtitle,
                { color: currentColors.secondaryText },
              ]}>
              Enter your current PIN to disable Privacy Lock
            </Text>

            <TextInput
              style={[
                styles.pinInput,
                {
                  color: currentColors.text,
                  borderColor: currentColors.primary,
                  backgroundColor: isDarkMode ? '#2D223B' : '#F9F5FD',
                },
              ]}
              placeholder="••••"
              placeholderTextColor={isDarkMode ? '#7E7090' : '#B0A3C0'}
              value={disableVerifyPin}
              onChangeText={text =>
                setDisableVerifyPin(text.replace(/[^0-9]/g, '').slice(0, 4))
              }
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              autoFocus
              textAlign="center"
            />

            {disableVerifyError ? (
              <Text
                style={[
                  styles.modalError,
                  { color: currentColors.deleteButton },
                ]}>
                {disableVerifyError}
              </Text>
            ) : null}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  { borderColor: currentColors.secondaryText },
                ]}
                onPress={() => setShowDisableVerifyModal(false)}>
                <Text
                  style={[
                    styles.modalBtnText,
                    { color: currentColors.secondaryText },
                  ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: currentColors.deleteButton },
                ]}
                onPress={handleVerifyDisableSubmit}>
                <Text style={styles.modalSubmitBtnText}>Disable Lock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CustomModal
        visible={customModalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm || (() => setCustomModalVisible(false))}
        onCancel={modalConfig.onCancel}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        isDestructive={modalConfig.isDestructive}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: wp(1),
  },
  headerTitle: {
    fontSize: hp(2.6),
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: hp(3),
  },
  scrollContent: {
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(6),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2.5),
    marginBottom: hp(1),
    paddingHorizontal: wp(1),
  },
  sectionIcon: {
    marginRight: wp(2),
  },
  sectionTitle: {
    fontSize: hp(1.6),
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.6),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.6),
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: wp(3),
  },
  settingLabel: {
    fontSize: hp(2),
    fontWeight: '600',
    marginBottom: hp(0.3),
  },
  settingSubtext: {
    fontSize: hp(1.6),
  },
  actionLabel: {
    fontSize: hp(1.9),
    fontWeight: '600',
  },
  usernameText: {
    fontSize: hp(2.2),
    fontWeight: 'bold',
    marginTop: hp(0.2),
  },
  divider: {
    height: 1,
  },
  unauthenticatedContainer: {
    paddingVertical: hp(1.5),
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  offlineBadgeText: {
    fontSize: hp(1.8),
    fontWeight: 'bold',
    marginLeft: wp(2),
  },
  offlineExplanation: {
    fontSize: hp(1.6),
    lineHeight: hp(2.3),
    marginBottom: hp(2),
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    borderRadius: wp(2),
  },
  accountButtonText: {
    color: '#FFFFFF',
    fontSize: hp(1.8),
    fontWeight: 'bold',
    marginLeft: wp(2),
  },
  guidelineNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(4),
    paddingHorizontal: wp(4),
  },
  guidelineText: {
    fontSize: hp(1.5),
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  pinModalContent: {
    width: '100%',
    borderRadius: wp(4),
    padding: wp(6),
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: hp(2.4),
    fontWeight: 'bold',
    marginTop: hp(1),
    marginBottom: hp(0.5),
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: hp(1.7),
    textAlign: 'center',
    paddingHorizontal: wp(2),
  },
  pinInput: {
    width: wp(50),
    height: hp(7),
    borderWidth: 2,
    borderRadius: wp(2.5),
    fontSize: hp(3.5),
    letterSpacing: wp(4),
    marginVertical: hp(2),
    paddingHorizontal: wp(3),
  },
  pinInputSmall: {
    width: '100%',
    height: hp(6),
    borderWidth: 1,
    borderRadius: wp(2),
    fontSize: hp(2.2),
    marginVertical: hp(1),
    paddingHorizontal: wp(3),
  },
  modalError: {
    fontSize: hp(1.6),
    fontWeight: '600',
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: hp(2),
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: hp(1.5),
    borderRadius: wp(2),
    borderWidth: 1,
    alignItems: 'center',
    marginRight: wp(2),
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: hp(1.5),
    borderRadius: wp(2),
    alignItems: 'center',
    marginLeft: wp(2),
  },
  modalBtnText: {
    fontSize: hp(1.8),
    fontWeight: '600',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: hp(1.8),
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
