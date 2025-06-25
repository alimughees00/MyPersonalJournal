import React, {useEffect, useState, useRef, useContext} from 'react';
// ... (other imports remain the same)
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  PermissionsAndroid,
  BackHandler,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth} from '../utils/auth';
import {
  storage,
  TWO_HOURS,
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_MIN,
} from '../utils/storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as ImagePicker from 'react-native-image-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const audioRecorderPlayer = new AudioRecorderPlayer();

const NewEntryScreen = ({navigation, route}) => {
  // Get theme from context
  const {mode} = route.params;
  console.log(mode);

  // Color schemes
  const colors = {
    light: {
      background: '#F8F5F5',
      card: '#FFFFFF',
      text: '#424242',
      secondaryText: '#757575',
      primary: '#5C4E4E',
      header: '#5C4E4E',
      inputBg: '#FFFFFF',
      toolbar: '#5C4E4E',
      mediaBg: '#F0F0F0',
      optionBg: '#E0E0E0',
      optionSelectedBg: '#5C4E4E',
    },
    dark: {
      background: '#121212',
      card: '#1E1E1E',
      text: '#E0E0E0',
      secondaryText: '#A0A0A0',
      primary: '#988686',
      header: '#1E1E1E',
      inputBg: '#2D2D2D',
      toolbar: '#1E1E1E',
      mediaBg: '#2D2D2D',
      optionBg: '#2D2D2D',
      optionSelectedBg: '#988686',
    },
  };

  const currentColors = mode ? colors.dark : colors.light;

  // ... (all existing state and functions remain the same)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playTime, setPlayTime] = useState('00:00:00');
  const [duration, setDuration] = useState('00:00:00');
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(null);
  // Initialize with default destruct time (never)
  const [destructTime, setDestructTime] = useState(0);

  const destructTimeOptions = [
    {label: 'Never', value: 0},
    {label: '1 Min', value: MILLISECONDS_PER_MIN},
    {label: '2 Hours', value: TWO_HOURS},
    {label: '1 Day', value: MILLISECONDS_PER_DAY},
    {label: '7 Days', value: 7 * MILLISECONDS_PER_DAY},
    {label: '30 Days', value: 30 * MILLISECONDS_PER_DAY},
  ];

  const [entryId, setEntryId] = useState(null);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const pendingMediaChanges = useRef(false);
  const isSaving = useRef(false);

  // Add this useEffect for back button handling
  useEffect(() => {
    // Handle hardware back button
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (title.trim() || content.trim() || media.length > 0) {
          saveEntry();
        }
        return true;
      },
    );

    // Handle gesture back navigation
    const unsubscribe = navigation.addListener('beforeRemove', e => {
      if (!(title.trim() || content.trim() || media.length > 0)) {
        return; // Allow back if no content
      }

      // Prevent default behavior
      e.preventDefault();

      // Save and then navigate back
      saveEntry();
    });

    // Cleanup listeners
    return () => {
      backHandler.remove();
      unsubscribe();
    };
  }, [navigation, title, content, media]);

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        );

        console.log('RECORD_AUDIO permission result:', result);
        return result === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  // Generate a unique audio file path
  const generateAudioPath = () => {
    const timestamp = new Date().getTime();
    return Platform.select({
      ios: `${RNFS.DocumentDirectoryPath}/audio_${timestamp}.m4a`,
      android: `${RNFS.DocumentDirectoryPath}/audio_${timestamp}.mp3`,
    });
  };

  const startRecording = async () => {
    if (!(await requestPermissions())) {
      console.log('Permissions not granted');
      return;
    }

    try {
      const path = generateAudioPath();
      console.log('Recording path:', path);

      const audioSet = {
        AudioEncoderAndroid: 3, // AAC
        AudioSourceAndroid: 1, // MIC
        AVEncoderAudioQualityKeyIOS: 'high',
        AVNumberOfChannelsKeyIOS: 2,
        AVFormatIDKeyIOS: 'aac',
      };

      const uri = await audioRecorderPlayer.startRecorder(path, audioSet);
      audioRecorderPlayer.addRecordBackListener(e => {
        setRecordTime(
          audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)),
        );
      });

      setIsRecording(true);
      setIsProcessingMedia(true); // Mark as processing during recording
      pendingMediaChanges.current = true;
      console.log('Recording started:', uri);
    } catch (error) {
      console.log('Error starting recording:', error);
      setIsRecording(false);
      setIsProcessingMedia(false);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      setRecordTime('00:00:00');

      // Add the recording to media
      const newMedia = {
        type: 'audio/mpeg',
        uri: result,
      };

      // Use callback form of setState to ensure we're working with the latest state
      setMedia(prev => {
        // Check if this audio file is already in the media array
        const isDuplicate = prev.some(item => item.uri === result);
        if (isDuplicate) {
          return prev; // Don't add if it's already there
        }
        return [...prev, newMedia];
      });

      console.log('Recording saved:', result);

      // Set a short delay before allowing further operations
      setTimeout(() => {
        setIsProcessingMedia(false);
        pendingMediaChanges.current = false;
      }, 500);
    } catch (error) {
      console.log('Error stopping recording:', error);
      setIsProcessingMedia(false);
      pendingMediaChanges.current = false;
    }
  };

  const onStartPlay = async (audioUri, index) => {
    try {
      // If already playing something else, stop it first
      if (isPlaying) {
        await onStopPlay();
      }

      console.log('Playing audio:', audioUri);
      const msg = await audioRecorderPlayer.startPlayer(audioUri);

      audioRecorderPlayer.addPlayBackListener(e => {
        if (e.currentPosition === e.duration) {
          console.log('Finished playing');
          onStopPlay();
        } else {
          setPlayTime(
            audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)),
          );
          setDuration(audioRecorderPlayer.mmssss(Math.floor(e.duration)));
        }
      });

      setIsPlaying(true);
      setCurrentPlayingIndex(index);
    } catch (error) {
      console.log('Error playing audio:', error);
    }
  };

  const onStopPlay = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
      await audioRecorderPlayer.removePlayBackListener();
      setIsPlaying(false);
      setPlayTime('00:00:00');
      setCurrentPlayingIndex(null);
    } catch (error) {
      console.log('Error stopping playback:', error);
    }
  };

  // Render audio preview with play/stop controls
  const renderAudioPreview = (item, index) => {
    const isCurrentlyPlaying = isPlaying && currentPlayingIndex === index;

    return (
      <View style={styles.audioPreview} key={index}>
        <Icon name="audiotrack" size={24} color="#666" />
        <View style={styles.audioControls}>
          <TouchableOpacity
            onPress={() =>
              isCurrentlyPlaying ? onStopPlay() : onStartPlay(item.uri, index)
            }
            style={styles.playButton}>
            <Icon
              name={isCurrentlyPlaying ? 'stop' : 'play-arrow'}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
          <Text style={styles.audioTime}>
            {isCurrentlyPlaying ? playTime : '00:00:00'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => removeMedia(index)}>
          <Icon name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };

  const saveEntry = async () => {
    if (isSaving.current) return;
    isSaving.current = true;

    try {
      if (!title.trim() && !content.trim() && media.length === 0) {
        navigation.goBack();
        return;
      }

      // Calculate expiration timestamp if destruction time is set
      const currentTime = new Date().getTime();
      const expirationTime = destructTime > 0 ? currentTime + destructTime : 0;

      const entry = {
        id: entryId || undefined,
        title: title.trim(),
        content: content.trim(),
        media,
        date: new Date().toISOString(),
        destructTime: destructTime, // Store destruction time value
        expirationTime: expirationTime, // Store when the entry should expire
      };

      console.log(
        `Saving entry with destruction time: ${destructTime}, expiration: ${expirationTime}`,
      );

      const savedEntry = await storage.saveEntry(entry);
      if (savedEntry) {
        auth.updateActivity();
        navigation.navigate('Home', {refresh: true});
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    } finally {
      isSaving.current = false;
    }
  };

  // Clean up audio resources when unmounting
  useEffect(() => {
    return () => {
      if (isPlaying) {
        audioRecorderPlayer.stopPlayer();
      }
      if (isRecording) {
        audioRecorderPlayer.stopRecorder();
      }
    };
  }, []);

  const requestGalleryPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'Gallery Permission',
              message: 'App needs access to your gallery to attach photos.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Gallery Permission',
              message: 'App needs access to your gallery to attach photos.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const saveMediaToLocal = async (uri, type) => {
    try {
      console.log('Saving media to local storage:', uri, type);
      const timestamp = Date.now();
      const extension = type.startsWith('image')
        ? '.jpg'
        : type.startsWith('video')
        ? '.mp4'
        : '.m4a';
      const fileName = `media_${timestamp}${extension}`;
      const localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      console.log('Target local path:', localPath);

      // Handle file:// prefix and different path formats
      const sourcePath = uri.startsWith('file://')
        ? Platform.OS === 'android'
          ? uri.replace('file://', '')
          : uri
        : uri;

      console.log('Source path after formatting:', sourcePath);

      // Check if source file exists
      const exists = await RNFS.exists(sourcePath);
      console.log('Source file exists:', exists);

      if (exists) {
        await RNFS.copyFile(sourcePath, localPath);
        console.log('File copied successfully');
        return `file://${localPath}`;
      } else {
        console.error('Source file does not exist');
        return uri;
      }
    } catch (error) {
      console.error('Error saving media:', error);
      return uri;
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      return;
    }

    try {
      setIsProcessingMedia(true);
      pendingMediaChanges.current = true;

      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 0,
      });

      if (!result.didCancel && result.assets) {
        const savedMedia = await Promise.all(
          result.assets.map(async asset => ({
            type: asset.type,
            uri: await saveMediaToLocal(asset.uri, asset.type),
          })),
        );
        setMedia(prevMedia => [...prevMedia, ...savedMedia]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
    } finally {
      setIsProcessingMedia(false);
      // Small delay to ensure the media array is updated before auto-saving
      setTimeout(() => {
        pendingMediaChanges.current = false;
      }, 500);
    }
  };

  const pickVideo = async () => {
    try {
      setIsProcessingMedia(true);
      pendingMediaChanges.current = true;

      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'video',
        quality: 1,
      });

      if (!result.didCancel && result.assets) {
        const savedMedia = await Promise.all(
          result.assets.map(async asset => ({
            type: asset.type,
            uri: await saveMediaToLocal(asset.uri, asset.type),
          })),
        );
        setMedia(prevMedia => [...prevMedia, ...savedMedia]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
    } finally {
      setIsProcessingMedia(false);
      // Small delay to ensure the media array is updated before auto-saving
      setTimeout(() => {
        pendingMediaChanges.current = false;
      }, 500);
    }
  };

  const removeMedia = index => {
    setIsProcessingMedia(true);
    pendingMediaChanges.current = true;

    const newMedia = [...media];
    newMedia.splice(index, 1);
    setMedia(newMedia);

    // Small delay to ensure the media array is updated before auto-saving
    setTimeout(() => {
      setIsProcessingMedia(false);
      pendingMediaChanges.current = false;
    }, 300);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, {backgroundColor: currentColors.background}]}>
      <StatusBar
        barStyle={mode ? 'light-content' : 'dark-content'}
        backgroundColor={currentColors.header}
      />
      <View style={[styles.header, {backgroundColor: currentColors.header}]}>
        <TouchableOpacity onPress={saveEntry} style={styles.backButton}>
          <Icon name="arrow-back" size={hp(3)} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: '#FFFFFF'}]}>New Entry</Text>
        <TouchableOpacity
          style={[styles.saveButton, {backgroundColor: '#FFFFFF'}]}
          onPress={saveEntry}>
          <Text style={[styles.saveButtonText, {color: currentColors.primary}]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={[styles.content, {backgroundColor: currentColors.background}]}>
        <View style={styles.destructTimeContainer}>
          <Text style={[styles.destructTimeLabel, {color: currentColors.text}]}>
            Self-destruct after:
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.destructTimeScroll}>
            {destructTimeOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.destructTimeOption,
                  {backgroundColor: currentColors.optionBg},
                  destructTime === option.value && {
                    backgroundColor: currentColors.optionSelectedBg,
                  },
                ]}
                onPress={() => setDestructTime(option.value)}>
                <Text
                  style={[
                    styles.destructTimeText,
                    {color: currentColors.text},
                    destructTime === option.value && {
                      color: '#FFFFFF',
                    },
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TextInput
          style={[
            styles.titleInput,
            {
              color: currentColors.text,
              borderBottomColor: currentColors.secondaryText,
            },
          ]}
          placeholder="Title"
          placeholderTextColor={currentColors.secondaryText}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />

        <TextInput
          style={[styles.contentInput, {color: currentColors.text}]}
          placeholder="Write your thoughts..."
          placeholderTextColor={currentColors.secondaryText}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
        />

        {media.length > 0 && (
          <View style={styles.mediaContainer}>
            {media.map((item, index) =>
              item.type.startsWith('audio/') ? (
                <View
                  key={index}
                  style={[
                    styles.audioPreview,
                    {backgroundColor: currentColors.mediaBg},
                  ]}>
                  <Icon
                    name="audiotrack"
                    size={24}
                    color={currentColors.text}
                  />
                  <View style={styles.audioControls}>
                    <TouchableOpacity
                      onPress={() =>
                        isPlaying && currentPlayingIndex === index
                          ? onStopPlay()
                          : onStartPlay(item.uri, index)
                      }
                      style={styles.playButton}>
                      <Icon
                        name={
                          isPlaying && currentPlayingIndex === index
                            ? 'stop'
                            : 'play-arrow'
                        }
                        size={24}
                        color={currentColors.text}
                      />
                    </TouchableOpacity>
                    <Text
                      style={[styles.audioTime, {color: currentColors.text}]}>
                      {isPlaying && currentPlayingIndex === index
                        ? playTime
                        : '00:00:00'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeMedia(index)}>
                    <Icon name="close" size={24} color={currentColors.text} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  key={index}
                  style={[
                    styles.mediaItem,
                    {backgroundColor: currentColors.mediaBg},
                  ]}>
                  {item.type.startsWith('image') ? (
                    <Image
                      source={{uri: item.uri}}
                      style={styles.mediaPreview}
                    />
                  ) : item.type.startsWith('video') ? (
                    <View style={styles.mediaPreview}>
                      <Icon
                        name="videocam"
                        size={hp(4)}
                        color={currentColors.primary}
                      />
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeMedia(index)}>
                    <Icon name="close" size={hp(2.5)} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ),
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.toolbar, {backgroundColor: currentColors.toolbar}]}>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickImage}
          disabled={isProcessingMedia || isRecording}>
          <Icon
            name="image"
            size={hp(3)}
            color={
              isProcessingMedia || isRecording
                ? currentColors.secondaryText
                : '#FFFFFF'
            }
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickVideo}
          disabled={isProcessingMedia || isRecording}>
          <Icon
            name="videocam"
            size={hp(3)}
            color={
              isProcessingMedia || isRecording
                ? currentColors.secondaryText
                : '#FFFFFF'
            }
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickImage}
          disabled={isProcessingMedia || isRecording}>
          <Icon
            name={isRecording ? 'stop' : 'mic'}
            size={hp(3)}
            color={
              isProcessingMedia || isRecording
                ? currentColors.secondaryText
                : '#FFFFFF'
            }
          />
        </TouchableOpacity>

        {/* ... (other toolbar buttons with similar updates) */}
      </View>
    </KeyboardAvoidingView>
  );
};

// Update styles to remove hardcoded colors
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#5C4E4E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#5C4E4E',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',

    marginBottom: 15,
    padding: 0,
  },
  contentInput: {
    fontSize: 16,

    lineHeight: 24,
    minHeight: 200,
    paddingBottom: 15,
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  mediaItem: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',

    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,

    borderRadius: 12,
    padding: 4,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#5C4E4E',
  },
  toolbarButton: {
    padding: 8,
    borderRadius: 20,
  },

  disabled: {
    opacity: 0.7,
  },
  recordingTime: {
    position: 'absolute',
    right: 20,

    fontWeight: 'bold',
  },
  audioDuration: {
    fontSize: 12,

    marginTop: 5,
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    width: '78%',
  },
  playButton: {
    marginRight: 10,
  },
  destructTimeContainer: {
    marginVertical: 10,
    // paddingHorizontal: 15,
  },
  destructTimeLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  destructTimeScroll: {
    flexGrow: 0,
  },
  destructTimeOption: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  // ... (keep all other style definitions but remove color properties)
});

export default NewEntryScreen;
