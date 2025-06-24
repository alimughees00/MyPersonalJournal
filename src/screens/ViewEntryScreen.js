import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  BackHandler,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth} from '../utils/auth';
import {storage} from '../utils/storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const ViewEntryScreen = ({navigation, route}) => {
  const {entry} = route.params;
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playTime, setPlayTime] = useState('00:00:00');
  const [duration, setDuration] = useState('00:00:00');

  const audioPlayer = useRef(new AudioRecorderPlayer());

  const playAudio = async uri => {
    try {
      if (isPlaying) {
        await stopAudio();
        return;
      }

      console.log('Playing audio:', uri);
      await audioPlayer.current.startPlayer(uri);
      audioPlayer.current.addPlayBackListener(e => {
        if (e.currentPosition === e.duration) {
          stopAudio();
        } else {
          setPlayTime(
            audioPlayer.current.mmssss(Math.floor(e.currentPosition)),
          );
          setDuration(audioPlayer.current.mmssss(Math.floor(e.duration)));
        }
      });
      setIsPlaying(true);
    } catch (error) {
      console.log('Error playing audio:', error);
    }
  };

  const stopAudio = async () => {
    try {
      await audioPlayer.current.stopPlayer();
      await audioPlayer.current.removePlayBackListener();
      setIsPlaying(false);
      setPlayTime('00:00:00');
    } catch (error) {
      console.log('Error stopping audio:', error);
    }
  };

  // Add cleanup in useEffect
  useEffect(() => {
    return () => {
      if (audioPlayer.current) {
        stopAudio();
      }
    };
  }, []);

  const renderMedia = (mediaItem, index) => {
    if (mediaItem.type.startsWith('image')) {
      return (
        <Image
          key={index}
          source={{uri: mediaItem.uri}}
          style={styles.mediaPreview}
          resizeMode="cover"
        />
      );
    } else if (mediaItem.type.startsWith('video')) {
      return (
        <Video
          key={index}
          source={{uri: mediaItem.uri}}
          style={styles.mediaPreview}
          resizeMode="cover"
          controls={true}
        />
      );
    } else {
      return (
        <TouchableOpacity
          key={index}
          style={styles.audioContainer}
          onPress={() => playAudio(mediaItem.uri)}>
          <Icon
            name={isPlaying ? 'pause-circle-filled' : 'play-circle-filled'}
            size={40}
            color="#6c63ff"
          />
          <Text style={styles.audioTime}>
            {isPlaying ? playTime : duration}
          </Text>
        </TouchableOpacity>
      );
    }
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          {isEditing ? (
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <Icon name="check-circle" size={28} color="#000000" />
            </TouchableOpacity>
          ) : (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
              }}>
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                style={styles.headerButton}>
                <Icon name="edit" size={24} color="#0099ff" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                style={[styles.headerButton, styles.deleteButton]}>
                <Icon name="delete" size={24} color="#ff4d4d" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ),
    });
  }, [isEditing, title, content]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Title and content cannot be empty');
      return;
    }

    try {
      const updatedEntry = {
        ...entry,
        title: title.trim(),
        content: content.trim(),
      };

      const success = await storage.updateEntry(updatedEntry);
      if (success) {
        auth.updateActivity();
        setIsEditing(false);
        // Navigate back with a flag to prevent immediate refresh
        navigation.navigate('Home', {skipRefresh: true});
        Alert.alert('Success', 'Entry updated successfully');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const success = await storage.deleteEntry(entry.id);
            if (success) {
              auth.updateActivity();
              // Navigate back with a flag to prevent immediate refresh
              navigation.navigate('Home', {skipRefresh: true});
            }
          } catch (error) {
            console.error('Error deleting entry:', error);
            Alert.alert('Error', 'Failed to delete entry');
          }
        },
      },
    ]);
  };

  const handleBackPress = () => {
    if (isEditing) {
      Alert.alert(
        'Save Changes',
        'Do you want to save your changes?',
        [
          {
            text: 'Discard',
            onPress: () => {
              setIsEditing(false);
              navigation.navigate('Home', {skipRefresh: true});
            },
            style: 'destructive',
          },
          {
            text: 'Save',
            onPress: handleSave,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        {cancelable: true},
      );
      return true; // Prevents default back action
    }
    navigation.navigate('Home', {skipRefresh: true});
    return true;
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => {
      backHandler.remove();
      if (audioPlayer.current) {
        stopAudio();
      }
    };
  }, [isEditing]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>
          {new Date(entry.date).toLocaleDateString()} at{' '}
          {new Date(entry.date).toLocaleTimeString()}
        </Text>
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            maxLength={100}
          />
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="Write your thoughts..."
            multiline
            textAlignVertical="top"
          />
        </View>
      ) : (
        <View style={styles.viewContainer}>
          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.contentText}>{content}</Text>
          {entry.media && entry.media.length > 0 && (
            <View style={styles.mediaContainer}>
              {entry.media.map((item, index) => renderMedia(item, index))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

// Add these to the StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#988686',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#5C4E4E',
    marginRight: 10,
  },
  headerButtonText: {
    color: '#6c63ff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    // marginLeft: 8,
  },
  dateContainer: {
    padding: 16,
  },
  dateText: {
    color: '#000',
    fontSize: 14,
  },
  editContainer: {
    padding: 16,
  },
  viewContainer: {
    padding: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    padding: 0,
  },
  contentInput: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
    minHeight: 200,
    padding: 0,
    paddingBottom: 15,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },
  contentText: {
    fontSize: 16,
    color: '#000',
    lineHeight: 24,
  },
  mediaContainer: {
    marginTop: 16,
    gap: 8,
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    marginVertical: 5,
  },
  audioTime: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  toolbarButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#5C4E4E',
  },
});

export default ViewEntryScreen;
