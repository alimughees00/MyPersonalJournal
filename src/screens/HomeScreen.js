import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import {auth} from '../utils/auth';
import {storage} from '../utils/storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const BUILD_NUMBER = '1.0.1';
const FEEDBACK_EMAIL = 'feedback@baltorotech.com';

const HomeScreen = ({navigation}) => {
  const [entries, setEntries] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const loadedEntries = await storage.getEntries();
      // Sort entries by date in descending order (newest first)
      const sortedEntries = loadedEntries.sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );
      setEntries(sortedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();

    const focusSubscription = navigation.addListener('focus', e => {
      auth.updateActivity();
      if (!e.data?.state?.params?.skipRefresh) {
        loadEntries();
      }
    });

    const activityInterval = setInterval(() => {
      auth.updateActivity();
    }, 60000);

    // Check for expired entries every 5 minutes
    const cleanupInterval = setInterval(() => {
      loadEntries();
    }, 300000);

    const sessionInterval = setInterval(() => {
      if (auth.isSessionExpired()) {
        auth.logout();
        navigation.replace('Login');
      }
    }, 60000);

    return () => {
      clearInterval(sessionInterval);
      clearInterval(activityInterval);
      clearInterval(cleanupInterval);
      focusSubscription();
    };
  }, [navigation]);

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
          <Icon name="audiotrack" size={24} color="#fff" />
        </View>
      );
    }
    return null;
  };

  const renderItem = ({item}) => (
    <TouchableOpacity
      style={styles.entryCard}
      onPress={() => navigation.navigate('ViewEntry', {entry: item})}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
        {item.expirationTime > 0 && (
          <View style={styles.expirationBadge}>
            <Icon name="timer" size={14} color="#fff" />
            <Text style={styles.expirationText}>
              {getExpirationText(item.expirationTime)}
            </Text>
          </View>
        )}
      </View>
      {item.title ? <Text style={styles.entryTitle}>{item.title}</Text> : null}
      {item.content ? (
        <Text style={styles.entryPreview} numberOfLines={2}>
          {item.content}
        </Text>
      ) : null}
      {item.media && item.media.length > 0 && (
        <View style={styles.mediaContainer}>
          {renderMediaPreview(item.media)}
          {item.media.length > 1 && (
            <Text style={styles.mediaCount}>+{item.media.length - 1}</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#988686" />
      <View style={styles.header}>
        <View></View>
        <Text style={styles.headerTitle}>My Journal</Text>
        <TouchableOpacity
          onPress={() => {
            auth.logout();
            navigation.replace('Login');
          }}
          style={styles.logoutButton}>
          <Icon name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5C4E4E" />
        </View>
      ) : (
        <FlatList
          data={entries}
          showsVerticalScrollIndicator={false}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No entries yet</Text>
              <Text style={styles.emptySubtext}>
                Start writing your thoughts
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewEntry')}>
        <Icon name="add" size={30} color="#fff" />
      </TouchableOpacity>
      <View style={styles.footer}>
        <Text style={styles.buildNumber}>Build {BUILD_NUMBER}</Text>
        <TouchableOpacity onPress={handleFeedbackPress}>
          <Text style={styles.feedbackLink}>{FEEDBACK_EMAIL}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#988686',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(2),
    paddingHorizontal: wp(8),
    backgroundColor: '#988686',
    borderBottomWidth: hp(0.15),
    borderBottomColor: '#5C4E4E',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    paddingLeft: wp(10),
    fontSize: hp(3.3),
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    // padding: 8,
  },
  listContainer: {
    flexGrow: 1,
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
  },
  entryCard: {
    backgroundColor: '#baabab',
    borderRadius: wp(3),
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
    marginBottom: hp(2),
    elevation: 4,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryDate: {
    color: '#fff',
    fontSize: hp(1.8),
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5C4E4E',
    borderRadius: wp(4),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.7),
  },
  expirationText: {
    color: '#fff',
    fontSize: hp(1.5),
    marginLeft: wp(1),
  },
  entryTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: hp(0.6),
  },
  entryPreview: {
    color: '#fff',
    fontSize: hp(1.9),
    marginBottom: hp(1),
  },
  mediaContainer: {
    position: 'relative',
    width: wp(10),
    height: hp(5),
    borderRadius: wp(3),
    overflow: 'hidden',
    backgroundColor: '#5C4E4E',
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    marginRight: wp(4),
  },
  mediaPreview: {
    // justifyContent: 'center',
    // alignItems: 'center',
    // alignContent: 'center',
  },
  mediaCount: {
    position: 'absolute',
    bottom: 25,
    right: -15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 4,
    borderRadius: wp(5),
  },
  fab: {
    position: 'absolute',
    right: wp(8),
    bottom: hp(12),
    backgroundColor: '#5C4E4E',
    width: wp(16),
    height: hp(7.7),
    borderRadius: wp(8),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    // alignContent: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#fff',
  },
  footer: {
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
    alignItems: 'center',
    backgroundColor: '#988686',
    borderTopWidth: hp(0.15),
    borderTopColor: '#5C4E4E',
  },
  buildNumber: {
    fontSize: hp(1.8),
    color: '#000',
    marginBottom: hp(0.3),
  },
  feedbackLink: {
    fontSize: hp(1.8),
    color: '#000',
    textDecorationLine: 'underline',
  },
});

export default HomeScreen;
