import React, {
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from 'react';
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
  AppState,
} from 'react-native';
import {auth} from '../utils/auth';
import {storage} from '../utils/storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DeviceInfo from 'react-native-device-info';
import {ThemeContext} from '../context/ThemeContext';
import {PrivacyLockContext} from '../context/PrivacyLockContext';
import {colors} from '../utils/colors';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const FEEDBACK_EMAIL = 'feedback@baltorotech.com';

const HomeScreen = ({navigation, route}) => {
  const {isDarkMode, toggleTheme, themeMode, setTheme, setSystemTheme} =
    useContext(ThemeContext);
  const {isPrivacyLockEnabled, lock} = useContext(PrivacyLockContext);
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserActive, setIsUserActive] = useState(true);
  const [buildNumber, setBuildNumber] = useState('');
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const getVersion = async () => {
      const version = await DeviceInfo.getVersion();
      setBuildNumber(version);
    };

    getVersion();
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
      clearInterval(autoRefreshInterval);
      clearInterval(cleanupInterval);
      clearInterval(activityInterval);
      focusSubscription();
      blurSubscription();
      appStateSubscription.remove();
    };
  }, [navigation, isUserActive, route.params?.skipRefresh, loadEntries]);

  const loadEntries = useCallback(async () => {
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
  }, []);

  const currentColors = isDarkMode ? colors.dark : colors.light;

  const renderMediaPreview = media => {
    if (!media || media.length === 0) return null;

    const firstMedia = media[0];
    if (firstMedia.type?.startsWith('image/')) {
      return (
        <Image
          source={{uri: firstMedia.uri}}
          style={styles.mediaPreview}
          resizeMode="cover"
        />
      );
    } else if (firstMedia.type?.startsWith('video/')) {
      return (
        <View style={styles.mediaPreview}>
          <Icon name="videocam" size={24} color="#666" />
        </View>
      );
    } else if (firstMedia.type?.startsWith('audio/')) {
      return (
        <View style={styles.mediaPreview}>
          <Icon name="audiotrack" size={24} color="#666" />
        </View>
      );
    }
    return null;
  };

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
  }, [loadEntries]);

  return (
    <View
      style={[styles.container, {backgroundColor: currentColors.background}]}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <View
        style={[
          styles.header,
          {
            backgroundColor: currentColors.header,
            paddingTop: insets.top,
          },
        ]}>
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity
            onPress={toggleTheme}
            style={{padding: 8}}
            accessibilityLabel="Toggle Theme">
            <Icon
              name={isDarkMode ? 'light-mode' : 'dark-mode'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        <Text style={[styles.headerTitle, {color: '#FFFFFF'}]}>My Journal</Text>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {isPrivacyLockEnabled && (
            <TouchableOpacity
              onPress={lock}
              style={styles.settingsButton}
              accessibilityLabel="Lock Journal Now">
              <Icon name="lock-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={styles.settingsButton}
            accessibilityLabel="Open Settings">
            <Icon name="settings" size={24} color="#fff" />
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
          {/* Version {buildNumber} */}
        </Text>
        <TouchableOpacity onPress={handleFeedbackPress}>
          <Text style={[styles.feedbackLink, {color: currentColors.primary}]}>
            Send Feedback
          </Text>
        </TouchableOpacity>
      </View>
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
