import React, {useState, useEffect, useRef} from 'react';
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
  Alert,
} from 'react-native';
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
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const audioRecorderPlayer = new AudioRecorderPlayer();

const NewEntryScreen = ({navigation, route}) => {
  const {mode} = route.params;

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

  // State management
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState('00:00:00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playTime, setPlayTime] = useState('00:00:00');
  const [duration, setDuration] = useState('00:00:00');
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(null);
  const [destructTime, setDestructTime] = useState(0);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);

  const destructTimeOptions = [
    {label: 'Never', value: 0},
    {label: '1 Min', value: MILLISECONDS_PER_MIN},
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

  const handleBackPress = () => {
    if (title.trim() || content.trim() || media.length > 0) {
      Alert.alert(
        'Discard Changes',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Discard',
            onPress: () => navigation.goBack(),
            style: 'destructive',
          },
        ],
      );
      return true;
    }
    navigation.goBack();
    return true;
  };

  // Request camera permissions
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]);
        return (
          granted['android.permission.CAMERA'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.RECORD_AUDIO'] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Capture photo from camera
  const capturePhoto = async () => {
    if (!(await requestCameraPermission())) {
      Alert.alert(
        'Permission denied',
        'Camera access is required to take photos',
      );
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
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsProcessingMedia(false);
    }
  };

  // Capture video from camera
  const captureVideo = async () => {
    if (!(await requestCameraPermission())) {
      Alert.alert(
        'Permission denied',
        'Camera and microphone access is required to record videos',
      );
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
      Alert.alert('Error', 'Failed to record video');
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
      Alert.alert('Error', 'Failed to select image');
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
      Alert.alert('Error', 'Failed to select video');
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

  // Audio recording functions
  const startRecording = async () => {
    try {
      const path = `${RNFS.DocumentDirectoryPath}/audio_${Date.now()}.mp3`;
      const uri = await audioRecorderPlayer.startRecorder(path);
      audioRecorderPlayer.addRecordBackListener(e => {
        setRecordTime(
          audioRecorderPlayer.mmssss(Math.floor(e.currentPosition)),
        );
      });
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      setRecordTime('00:00:00');

      setMedia(prev => [
        ...prev,
        {
          type: 'audio/mpeg',
          uri: result,
        },
      ]);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  // Audio playback functions
  const onStartPlay = async (audioUri, index) => {
    try {
      if (isPlaying) await onStopPlay();

      await audioRecorderPlayer.startPlayer(audioUri);
      audioRecorderPlayer.addPlayBackListener(e => {
        if (e.currentPosition === e.duration) {
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
      console.error('Error playing audio:', error);
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
      console.error('Error stopping playback:', error);
    }
  };

  // Save entry
  const saveEntry = async () => {
    if (!title.trim() && !content.trim() && media.length === 0) {
      navigation.goBack();
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
      Alert.alert('Error', 'Failed to save entry');
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, {backgroundColor: currentColors.background}]}>
      <StatusBar
        barStyle={mode ? 'light-content' : 'dark-content'}
        backgroundColor={currentColors.header}
      />

      <View style={[styles.header, {backgroundColor: currentColors.header}]}>
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
        style={[styles.content, {backgroundColor: currentColors.background}]}>
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
          cursorColor={mode ? '#fff' : '#000'} // Dynamic cursor color
        />

        <TextInput
          style={[styles.contentInput, {color: currentColors.text}]}
          placeholder="Write your thoughts..."
          placeholderTextColor={currentColors.secondaryText}
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          cursorColor={mode ? '#fff' : '#000'} // Dynamic cursor color
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
          disabled={isProcessingMedia}>
          <Icon
            name="photo-camera"
            size={hp(3)}
            color={isProcessingMedia ? currentColors.secondaryText : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Camera Video */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={captureVideo}
          disabled={isProcessingMedia}>
          <Icon
            name="videocam"
            size={hp(3)}
            color={isProcessingMedia ? currentColors.secondaryText : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Gallery Photo */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickImage}
          disabled={isProcessingMedia}>
          <Icon
            name="image"
            size={hp(3)}
            color={isProcessingMedia ? currentColors.secondaryText : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Gallery Video */}
        <TouchableOpacity
          style={styles.toolbarButton}
          onPress={pickVideo}
          disabled={isProcessingMedia}>
          <Icon
            name="video-library"
            size={hp(3)}
            color={isProcessingMedia ? currentColors.secondaryText : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Audio Recording */}
        <TouchableOpacity
          style={[
            styles.toolbarButton,
            isRecording && {backgroundColor: '#FFEBEE'},
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessingMedia}>
          <Icon
            name={isRecording ? 'stop' : 'mic'}
            size={hp(3)}
            color={
              isRecording
                ? '#D32F2F'
                : isProcessingMedia
                ? currentColors.secondaryText
                : '#FFFFFF'
            }
          />
        </TouchableOpacity>

        {isRecording && (
          <Text style={[styles.recordingTime, {color: '#D32F2F'}]}>
            {recordTime}
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
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
    padding: wp(5),
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
  },
  toolbarButton: {
    padding: wp(3),
    borderRadius: wp(5),
    width: wp(12),
    height: wp(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingTime: {
    position: 'absolute',
    right: wp(10),
    fontSize: hp(1.8),
    fontWeight: 'bold',
  },
});

export default NewEntryScreen;
