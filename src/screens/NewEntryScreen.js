import React, {useState, useEffect, useRef, useContext} from 'react';
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
import CustomModal from '../components/CustomModal';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth} from '../utils/auth';
import {
  storage,
  TWO_HOURS,
  MILLISECONDS_PER_DAY,
  MILLISECONDS_PER_MIN,
} from '../utils/storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import {ThemeContext} from '../context/ThemeContext';
import {colors} from '../utils/colors';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const audioRecorderPlayer = new AudioRecorderPlayer();

const NewEntryScreen = ({navigation, route}) => {
  const {isDarkMode} = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const mode = isDarkMode;

  const currentColors = mode ? colors.dark : colors.light;

  // State management
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playTime, setPlayTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(null);
  const [destructTime, setDestructTime] = useState(0);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
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

  const destructTimeOptions = [
    {label: 'Never', value: 0},
    {label: '2 Hours', value: TWO_HOURS},
    {label: '1 Day', value: MILLISECONDS_PER_DAY},
    {label: '7 Days', value: 7 * MILLISECONDS_PER_DAY},
    {label: '30 Days', value: 30 * MILLISECONDS_PER_DAY},
  ];

  // Media options
  const cameraOptions = {
    mediaType: 'photo',
    quality: 1,
    saveToPhotos: true,
    cameraType: 'back',
  };

  const videoOptions = {
    mediaType: 'video',
    quality: 1,
    durationLimit: 30,
    cameraType: 'back',
  };

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => backHandler.remove();
  }, [title, content, media]);

  const recordListenerRef = useRef(null);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      audioRecorderPlayer.removeRecordBackListener();
      recordListenerRef.current = null;
      audioRecorderPlayer.removePlayBackListener();
      if (isRecording) {
        audioRecorderPlayer.stopRecorder();
      }
      if (isPlaying) {
        audioRecorderPlayer.stopPlayer();
      }
    };
  }, []);

  const handleBackPress = () => {
    if (title.trim() || content.trim() || media.length > 0) {
      setModalConfig({
        title: 'Discard Changes',
        message: 'You have unsaved changes. Are you sure you want to go back?',
        confirmText: 'Discard',
        cancelText: 'Cancel',
        isDestructive: true,
        onConfirm: () => {
          setModalVisible(false);
          navigation.goBack();
        },
        onCancel: () => setModalVisible(false),
      });
      setModalVisible(true);
      return true;
    }
    navigation.goBack();
    return true;
  };

  // Request camera permissions (handles photo vs video requirements)
  const requestCameraPermission = async (isVideo = false) => {
    if (Platform.OS === 'android') {
      try {
        const permissions = [PermissionsAndroid.PERMISSIONS.CAMERA];
        if (isVideo) {
          permissions.push(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        }
        if (Platform.Version < 33) {
          permissions.push(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
        }
        const granted = await PermissionsAndroid.requestMultiple(permissions);
        const cameraGranted =
          granted[PermissionsAndroid.PERMISSIONS.CAMERA] ===
          PermissionsAndroid.RESULTS.GRANTED;
        const audioGranted =
          !isVideo ||
          granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
            PermissionsAndroid.RESULTS.GRANTED;

        return cameraGranted && audioGranted;
      } catch (err) {
        console.warn('Error requesting camera permission:', err);
        return false;
      }
    }
    return true;
  };

  // Request audio recording permissions
  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to record audio.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Error requesting audio permission:', err);
        return false;
      }
    }
    return true;
  };

  // Capture photo from camera
  const capturePhoto = async () => {
    if (!(await requestCameraPermission(false))) {
      setModalConfig({
        title: 'Permission denied',
        message: 'Camera access is required to take photos',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
      return;
    }

    try {
      setIsProcessingMedia(true);
      const result = await launchCamera(cameraOptions);

      if (!result.didCancel && result.assets) {
        const savedMedia = await Promise.all(
          result.assets.map(async asset => ({
            type: asset.type || 'image/jpeg',
            uri: await saveMediaToLocal(asset.uri, asset.type || 'image/jpeg'),
          })),
        );
        setMedia(prev => [...prev, ...savedMedia]);
      }
    } catch (error) {
      console.error('Error capturing photo:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to capture photo',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
    } finally {
      setIsProcessingMedia(false);
    }
  };

  // Capture video from camera
  const captureVideo = async () => {
    if (!(await requestCameraPermission(true))) {
      setModalConfig({
        title: 'Permission denied',
        message: 'Camera and microphone access is required to record videos',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
      return;
    }

    try {
      setIsProcessingMedia(true);
      const result = await launchCamera(videoOptions);

      if (!result.didCancel && result.assets) {
        const savedMedia = await Promise.all(
          result.assets.map(async asset => ({
            type: asset.type || 'video/mp4',
            uri: await saveMediaToLocal(asset.uri, asset.type || 'video/mp4'),
          })),
        );
        setMedia(prev => [...prev, ...savedMedia]);
      }
    } catch (error) {
      console.error('Error capturing video:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to record video',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
    } finally {
      setIsProcessingMedia(false);
    }
  };

  // Select photo from gallery
  const pickImage = async () => {
    try {
      setIsProcessingMedia(true);
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 0,
      });

      if (!result.didCancel && result.assets) {
        const savedMedia = await Promise.all(
          result.assets.map(async asset => ({
            type: asset.type || 'image/jpeg',
            uri: await saveMediaToLocal(asset.uri, asset.type || 'image/jpeg'),
          })),
        );
        setMedia(prev => [...prev, ...savedMedia]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to select image',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
    } finally {
      setIsProcessingMedia(false);
    }
  };

  // Select video from gallery
  const pickVideo = async () => {
    try {
      setIsProcessingMedia(true);
      const result = await launchImageLibrary({
        mediaType: 'video',
        quality: 1,
      });

      if (!result.didCancel && result.assets) {
        const savedMedia = await Promise.all(
          result.assets.map(async asset => ({
            type: asset.type || 'video/mp4',
            uri: await saveMediaToLocal(asset.uri, asset.type || 'video/mp4'),
          })),
        );
        setMedia(prev => [...prev, ...savedMedia]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to select video',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
    } finally {
      setIsProcessingMedia(false);
    }
  };

  // Save media to local storage
  const saveMediaToLocal = async (uri, type) => {
    try {
      const timestamp = Date.now();
      const extension = type.startsWith('image') ? '.jpg' : '.mp4';
      const fileName = `media_${timestamp}${extension}`;
      const localPath = `${RNFS.DocumentDirectoryPath}/${fileName}`;

      const sourcePath = uri.startsWith('file://')
        ? Platform.OS === 'android'
          ? uri.replace('file://', '')
          : uri
        : uri;

      if (await RNFS.exists(sourcePath)) {
        await RNFS.copyFile(sourcePath, localPath);
        return `file://${localPath}`;
      }
      return uri;
    } catch (error) {
      console.error('Error saving media:', error);
      return uri;
    }
  };

  // Fixed formatTime function for more consistent display
  const formatTime = millis => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
      2,
      '0',
    )}`;
  };

  // Audio recording functions
  const startRecording = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) {
      setModalConfig({
        title: 'Permission Denied',
        message: 'Microphone access is required to record audio.',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
      return;
    }

    try {
      if (isPlaying) {
        await onStopPlay();
      }

      // Remove any previous listener
      audioRecorderPlayer.removeRecordBackListener();
      recordListenerRef.current = null;

      setRecordTime('00:00'); // Set initial time ONCE before starting

      const path = Platform.select({
        ios: `audio_${Date.now()}.m4a`,
        android: `${RNFS.DocumentDirectoryPath}/audio_${Date.now()}.mp4`,
      });
      await audioRecorderPlayer.startRecorder(path);

      // Add listener and store ref
      recordListenerRef.current = audioRecorderPlayer.addRecordBackListener(
        e => {
          setRecordTime(formatTime(e.currentPosition));
        },
      );

      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to start recording',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      recordListenerRef.current = null;
      setIsRecording(false);
      setRecordTime('00:00');

      if (result) {
        setMedia(prev => [
          ...prev,
          {
            type: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4',
            uri: result,
          },
        ]);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
      setRecordTime('00:00');
    }
  };

  // Audio playback functions
  const onStartPlay = async (audioUri, index) => {
    try {
      if (isPlaying) await onStopPlay();

      await audioRecorderPlayer.startPlayer(audioUri);

      // Clear any existing listeners before adding new one
      audioRecorderPlayer.removePlayBackListener();

      audioRecorderPlayer.addPlayBackListener(e => {
        if (e.currentPosition >= e.duration) {
          onStopPlay();
        } else {
          setPlayTime(formatTime(e.currentPosition));
          setDuration(formatTime(e.duration));
        }
      });

      setIsPlaying(true);
      setCurrentPlayingIndex(index);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const onStopPlay = async () => {
    try {
      await audioRecorderPlayer.stopPlayer();
      audioRecorderPlayer.removePlayBackListener();
      setIsPlaying(false);
      setPlayTime('00:00');
      setDuration('00:00');
      setCurrentPlayingIndex(null);
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  // Save entry
  const saveEntry = async () => {
    if (!title.trim() && !content.trim() && media.length === 0) {
      setModalConfig({
        title: 'Empty Entry',
        message: 'Please add some content or media before saving.',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
      return;
    }

    try {
      const entry = {
        title: title.trim(),
        content: content.trim(),
        media,
        date: new Date().toISOString(),
        destructTime,
        expirationTime: destructTime > 0 ? Date.now() + destructTime : 0,
      };

      await storage.saveEntry(entry);
      auth.updateActivity();
      navigation.navigate('Home', {refresh: true});
    } catch (error) {
      console.error('Error saving entry:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to save entry',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
    }
  };

  // Remove media item
  const removeMedia = index => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  // Render media preview
  const renderMediaPreview = (item, index) => {
    if (item.type.startsWith('image/')) {
      return (
        <View
          key={index}
          style={[styles.mediaItem, {backgroundColor: currentColors.mediaBg}]}>
          <Image
            source={{uri: item.uri}}
            style={styles.mediaPreview}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeMedia(index)}>
            <Icon name="close" size={hp(2.5)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    } else if (item.type.startsWith('video/')) {
      return (
        <View
          key={index}
          style={[styles.mediaItem, {backgroundColor: currentColors.mediaBg}]}>
          <Icon name="videocam" size={hp(4)} color={currentColors.primary} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeMedia(index)}>
            <Icon name="close" size={hp(2.5)} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      );
    } else if (item.type.startsWith('audio/')) {
      const isCurrentlyPlaying = isPlaying && currentPlayingIndex === index;
      return (
        <View
          key={index}
          style={[
            styles.audioContainer,
            {backgroundColor: currentColors.mediaBg},
          ]}>
          <Icon name="audiotrack" size={24} color={currentColors.primary} />
          <View style={styles.audioControls}>
            <TouchableOpacity
              onPress={() =>
                isCurrentlyPlaying ? onStopPlay() : onStartPlay(item.uri, index)
              }
              style={styles.playButton}>
              <Icon
                name={isCurrentlyPlaying ? 'stop' : 'play-arrow'}
                size={24}
                color={currentColors.primary}
              />
            </TouchableOpacity>
            <Text style={[styles.audioTime, {color: currentColors.text}]}>
              {isCurrentlyPlaying ? playTime : duration}
            </Text>
          </View>
          <TouchableOpacity onPress={() => removeMedia(index)}>
            <Icon name="close" size={24} color={currentColors.primary} />
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

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
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
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
        style={[styles.content, {backgroundColor: currentColors.background}]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={styles.destructTimeContainer}>
          <Text style={[styles.destructTimeLabel, {color: currentColors.text}]}>
            Self-destruct after:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                    destructTime === option.value && {color: '#FFFFFF'},
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
          cursorColor={mode ? '#fff' : '#000'}
        />

        <TextInput
          style={[styles.contentInput, {color: currentColors.text}]}
          placeholder="Write your thoughts..."
          placeholderTextColor={currentColors.secondaryText}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          cursorColor={mode ? '#fff' : '#000'}
        />

        {media.length > 0 && (
          <View style={styles.mediaContainer}>
            {media.map((item, index) => renderMediaPreview(item, index))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.toolbar, {backgroundColor: currentColors.toolbar}]}>
        {/* Camera Photo */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={capturePhoto}
          disabled={isProcessingMedia || isRecording}>
          <Icon
            name="photo-camera"
            size={hp(3)}
            color={
              isProcessingMedia || isRecording
                ? currentColors.secondaryText
                : '#FFFFFF'
            }
          />
        </TouchableOpacity>

        {/* Camera Video */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={captureVideo}
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

        {/* Gallery Photo */}
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

        {/* Gallery Video */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickVideo}
          disabled={isProcessingMedia || isRecording}>
          <Icon
            name="video-library"
            size={hp(3)}
            color={
              isProcessingMedia || isRecording
                ? currentColors.secondaryText
                : '#FFFFFF'
            }
          />
        </TouchableOpacity>

        {/* Audio Recording */}
        <TouchableOpacity
          style={[styles.toolbarButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessingMedia}>
          <Icon
            name={isRecording ? 'stop' : 'mic'}
            size={hp(3)}
            color={
              isRecording
                ? '#FFFFFF'
                : isProcessingMedia
                ? currentColors.secondaryText
                : '#FFFFFF'
            }
          />
        </TouchableOpacity>

        {/* Recording time display - positioned better */}
        {isRecording && (
          <View style={styles.recordingTimeContainer}>
            <View style={styles.recordingIndicator} />
            <Text style={styles.recordingTime}>{recordTime}</Text>
          </View>
        )}
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
    paddingBottom: hp(2),
    paddingHorizontal: wp(5),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
  },
  backButton: {
    padding: wp(1),
  },
  saveButton: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: wp(2),
  },
  saveButtonText: {
    fontSize: hp(1.8),
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: wp(5),
    paddingBottom: hp(10),
  },
  destructTimeContainer: {
    marginBottom: hp(2),
  },
  destructTimeLabel: {
    fontSize: hp(2),
    fontWeight: 'bold',
    marginBottom: hp(1),
  },
  destructTimeOption: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: wp(4),
    marginRight: wp(2),
  },
  destructTimeText: {
    fontSize: hp(1.8),
  },
  titleInput: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    marginBottom: hp(2),
    paddingBottom: hp(1),
    borderBottomWidth: 1,
  },
  contentInput: {
    fontSize: hp(2),
    lineHeight: hp(3),
    minHeight: hp(30),
  },
  mediaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: hp(2),
    gap: wp(2),
  },
  mediaItem: {
    position: 'relative',
    width: wp(30),
    height: wp(30),
    borderRadius: wp(2),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: hp(0.5),
    right: hp(0.5),
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: wp(5),
    padding: wp(1),
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3),
    borderRadius: wp(2),
    marginVertical: hp(0.5),
    width: '100%',
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: wp(2),
    flex: 1,
  },
  playButton: {
    marginRight: wp(2),
  },
  audioTime: {
    fontSize: hp(1.8),
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: hp(2),
    paddingHorizontal: wp(5),
    borderTopWidth: 1,
    borderTopColor: '#2D2D2D',
    position: 'relative',
  },
  toolbarButton: {
    padding: wp(3),
    borderRadius: wp(5),
    width: wp(12),
    height: wp(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#D32F2F',
  },
  recordingTimeContainer: {
    position: 'absolute',
    top: hp(-4),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(4),
    borderRadius: wp(4),
    marginHorizontal: wp(10),
  },
  recordingIndicator: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
    backgroundColor: '#FF4444',
    marginRight: wp(2),
  },
  recordingTime: {
    fontSize: hp(1.8),
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default NewEntryScreen;
