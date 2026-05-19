import React, {useState, useEffect, useRef, useContext} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Image,
  Switch,
  AppState,
  Platform,
} from 'react-native';
import {auth} from '../utils/auth';
import {storage} from '../utils/storage';
import CustomModal from '../components/CustomModal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DeviceInfo from 'react-native-device-info';
import DateTimePicker from '@react-native-community/datetimepicker';
import {notificationService} from '../utils/NotificationService';
import {ThemeContext} from '../context/ThemeContext';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const FEEDBACK_EMAIL = 'feedback@baltorotech.com';

const HomeScreen = ({navigation, route}) => {
  const {isDarkMode, toggleTheme, themeMode, setSystemTheme} =
    useContext(ThemeContext);
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    isDestructive: false,
  });
  const [isUserActive, setIsUserActive] = useState(true);
  const [buildNumber, setBuildNumber] = useState('');
  const [reminderTime, setReminderTime] = useState(new Date());
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);
  const STATUS_BAR_HEIGHT =
    Platform.OS === 'android' ? StatusBar.currentHeight : 0;

  // Color schemes
  const colors = {
    light: {
      background: '#F8F5F5',
      card: '#FFFFFF',
      text: '#424242',
      secondaryText: '#757575',
      primary: '#5C4E4E',
      header: '#5C4E4E',
      emptyText: '#5C4E4E',
      emptySubtext: '#757575',
      footer: '#F8F5F5',
      mediaBg: '#F0F0F0',
    },
    dark: {
      background: '#121212',
      card: '#1E1E1E',
      text: '#E0E0E0',
      secondaryText: '#A0A0A0',
      primary: '#988686',
      header: '#1E1E1E',
      emptyText: '#988686',
      emptySubtext: '#A0A0A0',
      footer: '#1E1E1E',
      mediaBg: '#2D2D2D',
    },
  };

  useEffect(() => {
    const getVersion = async () => {
      const version = await DeviceInfo.getVersion();
      setBuildNumber(version);
    };

    const loadReminder = async () => {
      const reminder = await notificationService.getScheduledReminder();
      if (reminder) {
        const date = new Date();
        date.setHours(reminder.hour);
        date.setMinutes(reminder.minute);
        setReminderTime(date);
        setIsReminderEnabled(true);
      }
    };

    getVersion();
    loadReminder();
  }, []);

  useEffect(() => {
    isMounted.current = true;

    // Load initial entries
    loadEntries();

    // Set up navigation listeners
    const focusSubscription = navigation.addListener('focus', () => {
      auth.updateActivity();
      if (!route.params?.skipRefresh) {
        loadEntries();
      }
      setIsUserActive(true);
    });

    const blurSubscription = navigation.addListener('blur', () => {
      setIsUserActive(false);
    });

    // Set up app state listener
    const appStateSubscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active'
        ) {
          // App came to foreground
          loadEntries();
          setIsUserActive(true);
        } else if (nextAppState.match(/inactive|background/)) {
          // App went to background
          setIsUserActive(false);
        }
        appState.current = nextAppState;
      },
    );

    // Setup intervals
    const sessionInterval = setInterval(() => {
      if (auth.isSessionExpired()) {
        auth.logout();
        navigation.replace('Login');
      }
    }, 60000);

    const autoRefreshInterval = setInterval(() => {
      if (isUserActive && isMounted.current) {
        loadEntries();
      }
    }, 60000);

    const cleanupInterval = setInterval(() => {
      if (isMounted.current) {
        loadEntries();
      }
    }, 300000);

    const activityInterval = setInterval(() => {
      auth.updateActivity();
    }, 60000);

    return () => {
      isMounted.current = false;
      clearInterval(sessionInterval);
      clearInterval(autoRefreshInterval);
      clearInterval(cleanupInterval);
      clearInterval(activityInterval);
      focusSubscription();
      blurSubscription();
      appStateSubscription.remove();
    };
  }, [navigation, isUserActive]);

  const loadEntries = async () => {
    try {
      if (!isMounted.current) return;

      const loadedEntries = await storage.getEntries();
      // Sort entries by date in descending order (newest first)
      const sortedEntries = loadedEntries.sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );
      setEntries(sortedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const currentColors = isDarkMode ? colors.dark : colors.light;

  const renderMediaPreview = media => {
    if (!media || media.length === 0) return null;

    const firstMedia = media[0];
    if (firstMedia.type.startsWith('image/')) {
      return (
        <Image
          source={{uri: firstMedia.uri}}
          style={styles.mediaPreview}
          resizeMode="cover"
        />
      );
    } else if (firstMedia.type.startsWith('video/')) {
      return (
        <View style={styles.mediaPreview}>
          <Icon name="videocam" size={24} color="#666" />
        </View>
      );
    } else if (firstMedia.type.startsWith('audio/')) {
      return (
        <View style={styles.mediaPreview}>
          <Icon name="audiotrack" size={24} color="#666" />
        </View>
      );
    }
    return null;
  };

  // const renderItem = ({item}) => (
  //   <TouchableOpacity
  //     style={styles.entryCard}
  //     onPress={() => navigation.navigate('ViewEntry', {entry: item})}>
  //     <View style={styles.entryHeader}>
  //       <Text style={styles.entryDate}>
  //         {new Date(item.date).toLocaleDateString()}
  //       </Text>
  //       {item.expirationTime > 0 && (
  //         <View style={styles.expirationBadge}>
  //           <Icon name="timer" size={14} color="#fff" />
  //           <Text style={styles.expirationText}>
  //             {getExpirationText(item.expirationTime)}
  //           </Text>
  //         </View>
  //       )}
  //     </View>
  //     {item.title ? <Text style={styles.entryTitle}>{item.title}</Text> : null}
  //     {item.content ? (
  //       <Text style={styles.entryPreview} numberOfLines={2}>
  //         {item.content}
  //       </Text>
  //     ) : null}
  //     {item.media && item.media.length > 0 && (
  //       <View style={styles.mediaContainer}>
  //         {renderMediaPreview(item.media)}
  //         {item.media.length > 1 && (
  //           <Text style={styles.mediaCount}>+{item.media.length - 1}</Text>
  //         )}
  //       </View>
  //     )}
  //   </TouchableOpacity>
  // );

  const getExpirationText = expirationTime => {
    const now = new Date().getTime();
    const diff = expirationTime - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    }
    return 'Soon';
  };

  const handleFeedbackPress = () => {
    Linking.openURL(`mailto:${FEEDBACK_EMAIL}`);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadEntries();
    } catch (error) {
      console.error('Error refreshing entries:', error);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    StatusBar.setBarStyle('light-content', true);
    StatusBar.setBackgroundColor(currentColors.header, true);
  }, [isDarkMode]);

  return (
    <View
      style={[styles.container, {backgroundColor: currentColors.background}]}>
      {Platform.OS === 'ios' && <StatusBar barStyle="light-content" />}
      <View
        style={[
          styles.header,
          {
            backgroundColor: currentColors.header,
            paddingTop: STATUS_BAR_HEIGHT,
          },
        ]}>
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            onPress={() => {
              setModalConfig({
                title: 'Theme Preference',
                message: 'Choose how you want to display the app.',
                confirmText: `${themeMode === 'light' ? '✓ ' : ''}Light`,
                cancelText: `${themeMode === 'dark' ? '✓ ' : ''}Dark`,
                isDestructive: false,
                onConfirm: () => {
                  if (themeMode !== 'light') toggleTheme();
                  setModalVisible(false);
                },
                onCancel: () => {
                  if (themeMode !== 'dark') toggleTheme();
                  setModalVisible(false);
                },
              });
              setModalVisible(true);
            }}
            style={{padding: 8}}>
            <Icon
              name={isDarkMode ? 'light-mode' : 'dark-mode'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.headerTitle, {color: '#FFFFFF'}]}>My Journal</Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            style={styles.settingsButton}>
            <Icon
              name="notifications-active"
              size={24}
              color={isReminderEnabled ? '#FFD700' : '#fff'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setModalConfig({
                title: 'Logout',
                message: 'Are you sure you want to logout?',
                confirmText: 'Logout',
                cancelText: 'Cancel',
                isDestructive: true,
                onConfirm: () => {
                  setModalVisible(false);
                  auth.logout();
                  navigation.replace('Login');
                },
                onCancel: () => setModalVisible(false),
              });
              setModalVisible(true);
            }}
            style={styles.logoutButton}>
            <Icon name="logout" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View
          style={[
            styles.loadingContainer,
            {backgroundColor: currentColors.background},
          ]}>
          <ActivityIndicator size="large" color={currentColors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => (
            <TouchableOpacity
              style={[styles.entryCard, {backgroundColor: currentColors.card}]}
              onPress={() =>
                navigation.navigate('ViewEntry', {
                  entry: item,
                  mode: isDarkMode,
                })
              }>
              <View style={styles.entryHeader}>
                <Text
                  style={[
                    styles.entryDate,
                    {color: currentColors.secondaryText},
                  ]}>
                  {new Date(item.date).toLocaleDateString()}
                </Text>
                {item.expirationTime > 0 && (
                  <View
                    style={[
                      styles.expirationBadge,
                      {backgroundColor: currentColors.primary},
                    ]}>
                    <Icon name="timer" size={14} color="#fff" />
                    <Text style={styles.expirationText}>
                      {getExpirationText(item.expirationTime)}
                    </Text>
                  </View>
                )}
              </View>
              {item.title && (
                <Text style={[styles.entryTitle, {color: currentColors.text}]}>
                  {item.title}
                </Text>
              )}
              {item.content && (
                <Text
                  style={[
                    styles.entryPreview,
                    {color: currentColors.secondaryText},
                  ]}
                  numberOfLines={2}>
                  {item.content}
                </Text>
              )}
              {item.media && item.media.length > 0 && (
                <View
                  style={[
                    styles.mediaContainer,
                    {backgroundColor: currentColors.mediaBg},
                  ]}>
                  {renderMediaPreview(item.media)}
                  {item.media.length > 1 && (
                    <Text style={styles.mediaCount}>
                      +{item.media.length - 1}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[currentColors.primary]}
              tintColor={currentColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="book" size={48} color={currentColors.emptyText} />
              <Text
                style={[styles.emptyText, {color: currentColors.emptyText}]}>
                No entries yet
              </Text>
              <Text
                style={[
                  styles.emptySubtext,
                  {color: currentColors.emptySubtext},
                ]}>
                Tap the + button to create your first entry
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={[styles.fab, {backgroundColor: currentColors.primary}]}
        onPress={() => navigation.navigate('NewEntry', {mode: isDarkMode})}>
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <View style={[styles.footer, {backgroundColor: currentColors.footer}]}>
        <Text
          style={[styles.buildNumber, {color: currentColors.secondaryText}]}>
          Version {buildNumber}
        </Text>
        <TouchableOpacity onPress={handleFeedbackPress}>
          <Text style={[styles.feedbackLink, {color: currentColors.primary}]}>
            Send Feedback
          </Text>
        </TouchableOpacity>
      </View>
      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm || (() => setModalVisible(false))}
        onCancel={modalConfig.onCancel}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        isDestructive={modalConfig.isDestructive}
      />
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
              // Option to disable reminder?
              setModalConfig({
                title: 'Reminder',
                message: 'Do you want to disable the daily reminder?',
                confirmText: 'Disable',
                cancelText: 'Keep',
                isDestructive: true,
                onConfirm: async () => {
                  setModalVisible(false);
                  setIsReminderEnabled(false);
                  await notificationService.cancelReminder();
                },
                onCancel: () => setModalVisible(false),
              });
              setModalVisible(true);
            }
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modeToggleContainer: {
    marginRight: wp(2),
  },
  headerSpacer: {
    width: wp(12), // Adjusted to accommodate the toggle switch
  },
  headerTitle: {
    fontSize: hp(3),
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: wp(1),
    marginLeft: wp(3),
  },
  settingsButton: {
    padding: wp(1),
    marginLeft: wp(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
  },
  entryCard: {
    borderRadius: wp(2),
    padding: wp(4),
    marginBottom: hp(2),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  entryDate: {
    fontSize: hp(1.8),
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: wp(4),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
  },
  expirationText: {
    color: '#fff',
    fontSize: hp(1.4),
    marginLeft: wp(1),
  },
  entryTitle: {
    fontSize: hp(2.2),
    fontWeight: 'bold',
    marginBottom: hp(0.5),
  },
  entryPreview: {
    fontSize: hp(1.9),
    marginBottom: hp(1),
  },
  mediaContainer: {
    position: 'relative',
    width: wp(20),
    height: hp(10),
    borderRadius: wp(2),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(1),
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  mediaCount: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    fontSize: hp(1.4),
    paddingHorizontal: wp(1.5),
    borderRadius: wp(5),
  },
  fab: {
    position: 'absolute',
    right: wp(8),
    bottom: hp(12),
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(10),
  },
  emptyText: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    marginTop: hp(2),
  },
  emptySubtext: {
    fontSize: hp(1.9),
    textAlign: 'center',
    marginTop: hp(1),
  },
  footer: {
    flexDirection: 'row',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(5),
    alignItems: 'center',
    // borderTopWidth: 1,
    // borderTopColor: '#2D2D2D',
    justifyContent: 'space-between',
  },
  buildNumber: {
    fontSize: hp(1.6),
    marginBottom: hp(0.5),
  },
  feedbackLink: {
    fontSize: hp(1.6),
    textDecorationLine: 'underline',
  },
});

export default HomeScreen;
