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

const BUILD_NUMBER = '1.0.0';
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
          <Icon name="audiotrack" size={24} color="#666" />
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
      <Text style={styles.entryTitle}>{item.title}</Text>
      <Text style={styles.entryPreview} numberOfLines={2}>
        {item.content}
      </Text>
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
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <View style={styles.header}>
        <View></View>
        <Text style={styles.headerTitle}>My Journal</Text>
        <TouchableOpacity
          onPress={() => {
            auth.logout();
            navigation.replace('Login');
          }}
          style={styles.logoutButton}>
          <Icon name="logout" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6c63ff" />
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  listContainer: {
    padding: 16,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  entryDate: {
    color: '#666',
    fontSize: 14,
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6c63ff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expirationText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
  },
  entryTime: {
    color: '#666',
    fontSize: 14,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  entryPreview: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
  },
  mediaContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  mediaCount: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 84,
    backgroundColor: '#6c63ff',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  buildNumber: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  feedbackLink: {
    fontSize: 14,
    color: '#6c63ff',
    textDecorationLine: 'underline',
  },
});

export default HomeScreen;
