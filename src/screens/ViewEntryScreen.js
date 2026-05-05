import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import CustomModal from '../components/CustomModal';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../utils/auth';
import { storage } from '../utils/storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const ViewEntryScreen = ({ navigation, route }) => {
  const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight : 0;
  const { entry, mode } = route.params;
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playTime, setPlayTime] = useState('00:00:00');
  const [duration, setDuration] = useState('00:00:00');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
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
  // Color schemes based on mode
  const colors = {
    light: {
      background: '#F8F5F5',
      card: '#FFFFFF',
      text: '#424242',
      secondaryText: '#757575',
      primary: '#5C4E4E',
      header: '#5C4E4E',
      inputBg: '#FFFFFF',
      mediaBg: '#F0F0F0',
      audioIcon: '#5C4E4E',
      deleteButton: '#D32F2F',
    },
    dark: {
      background: '#121212',
      card: '#1E1E1E',
      text: '#E0E0E0',
      secondaryText: '#A0A0A0',
      primary: '#988686',
      header: '#1E1E1E',
      inputBg: '#2D2D2D',
      mediaBg: '#2D2D2D',
      audioIcon: '#988686',
      deleteButton: '#B71C1C',
    },
  };

  const currentColors = mode ? colors.dark : colors.light;

  const audioPlayer = useRef(new AudioRecorderPlayer());

  const handleBackPress = () => {
    if (isEditing && (title !== entry.title || content !== entry.content)) {
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

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => backHandler.remove();
  }, [isEditing, title, content]);

  const saveChanges = async () => {
    if (!title.trim() && !content.trim() && (!entry.media || entry.media.length === 0)) {
      setModalConfig({
        title: 'Empty Entry',
        message: 'Entry cannot be empty. Please add some content or media.',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
      return;
    }

    try {
      const updatedEntry = {
        ...entry,
        title: title.trim(),
        content: content.trim(),
      };
      await storage.updateEntry(updatedEntry);
      setIsEditing(false);
      setModalConfig({
        title: 'Success',
        message: 'Entry updated successfully',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
    } catch (error) {
      console.error('Error updating entry:', error);
      setModalConfig({
        title: 'Error',
        message: 'Failed to update entry',
        onConfirm: () => setModalVisible(false),
      });
      setModalVisible(true);
    }
  };

  const deleteEntry = async () => {
    setModalConfig({
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this entry?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await storage.deleteEntry(entry.id);
          setModalVisible(false);
          navigation.navigate('Home', { refresh: true });
        } catch (error) {
          console.error('Error deleting entry:', error);
          setModalConfig({
            title: 'Error',
            message: 'Failed to delete entry',
            onConfirm: () => setModalVisible(false),
          });
          setModalVisible(true);
        }
      },
      onCancel: () => setModalVisible(false),
    });
    setModalVisible(true);
  };

  // Add this helper function:
  const formatTime = millis => {
    const totalSeconds = Math.floor((millis || 0) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return (
      String(hours).padStart(2, '0') +
      ':' +
      String(minutes).padStart(2, '0') +
      ':' +
      String(seconds).padStart(2, '0')
    );
  };

  // Update playAudio function:
  const playAudio = async uri => {
    try {
      if (isPlaying) {
        await audioPlayer.current.stopPlayer();
        audioPlayer.current.removePlayBackListener();
        setIsPlaying(false);
        setPlayTime('00:00:00');
        setDuration('00:00:00');
        return;
      }

      setPlayTime('00:00:00');
      setDuration('00:00:00');

      await audioPlayer.current.startPlayer(uri);

      audioPlayer.current.addPlayBackListener(e => {
        setPlayTime(formatTime(e.currentPosition));
        setDuration(formatTime(e.duration));
        if (e.currentPosition >= e.duration) {
          audioPlayer.current.stopPlayer();
          audioPlayer.current.removePlayBackListener();
          setIsPlaying(false);
          setPlayTime('00:00:00');
          setDuration(formatTime(e.duration));
        }
      });

      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      setPlayTime('00:00:00');
      setDuration('00:00:00');
    }
  };

  // Clean up playback listener on unmount:
  useEffect(() => {
    return () => {
      audioPlayer.current.stopPlayer();
      audioPlayer.current.removePlayBackListener();
    };
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'android' ? STATUS_BAR_HEIGHT : 0}
      style={[styles.container, { backgroundColor: currentColors.background }]}>
      <StatusBar
        barStyle={mode ? 'light-content' : 'light-content'}
        backgroundColor={currentColors.header}
      />

      {/* Updated Header to match NewEntryScreen */}
      <View style={[styles.header, { backgroundColor: currentColors.header, paddingTop: STATUS_BAR_HEIGHT }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Icon name="arrow-back" size={hp(3)} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>
          {isEditing ? 'Edit Entry' : 'View Entry'}
        </Text>
        {isEditing ? (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: '#FFFFFF' }]}
            onPress={saveChanges}>
            <Text
              style={[styles.saveButtonText, { color: currentColors.primary }]}>
              Save
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[
                styles.headerButton,
                { backgroundColor: mode ? currentColors.primary : '#988686' },
              ]}
              onPress={() => setIsEditing(true)}>
              <Icon name="edit" size={hp(2.5)} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.headerButton,
                { backgroundColor: currentColors.deleteButton },
              ]}
              onPress={deleteEntry}>
              <Icon name="delete" size={hp(2.5)} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}>
        <View
          style={[styles.dateContainer, { backgroundColor: currentColors.card }]}>
          <Text style={[styles.dateText, { color: currentColors.secondaryText }]}>
            {new Date(entry.date).toLocaleDateString()} at{' '}
            {new Date(entry.date).toLocaleTimeString()}
          </Text>
        </View>

        {isEditing ? (
          <View
            style={[
              styles.editContainer,
              { backgroundColor: currentColors.card },
            ]}>
            <TextInput
              style={[
                styles.titleInput,
                {
                  color: currentColors.text,
                  borderBottomColor: currentColors.secondaryText,
                },
              ]}
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor={currentColors.secondaryText}
              maxLength={100}
              cursorColor={mode ? '#fff' : '#000'}
            />
            <TextInput
              style={[styles.contentInput, { color: currentColors.text }]}
              value={content}
              onChangeText={setContent}
              placeholder="Write your thoughts..."
              placeholderTextColor={currentColors.secondaryText}
              multiline
              textAlignVertical="top"
              cursorColor={mode ? '#fff' : '#000'}
            />
          </View>
        ) : (
          <View
            style={[
              styles.viewContainer,
              { backgroundColor: currentColors.card },
            ]}>
            <Text style={[styles.titleText, { color: currentColors.text }]}>
              {title}
            </Text>
            <Text style={[styles.contentText, { color: currentColors.text }]}>
              {content}
            </Text>
            {entry.media && entry.media.length > 0 && (
              <View style={styles.mediaContainer}>
                {entry.media.map((item, index) => {
                  if (item.type.startsWith('image')) {
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setSelectedImage(item.uri);
                          setIsImageModalVisible(true);
                        }}>
                        <Image
                          source={{ uri: item.uri }}
                          style={[
                            styles.mediaPreview,
                            { backgroundColor: currentColors.mediaBg },
                          ]}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    );
                  } else if (item.type.startsWith('video')) {
                    return (
                      <Video
                        key={index}
                        source={{ uri: item.uri }}
                        style={[
                          styles.mediaPreview,
                          { backgroundColor: currentColors.mediaBg },
                        ]}
                        resizeMode="cover"
                        controls={true}
                      />
                    );
                  } else {
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.audioContainer,
                          { backgroundColor: currentColors.mediaBg },
                        ]}
                        onPress={() => playAudio(item.uri)}>
                        <Icon
                          name={
                            isPlaying
                              ? 'pause-circle-filled'
                              : 'play-circle-filled'
                          }
                          size={40}
                          color={currentColors.audioIcon}
                        />
                        <Text
                          style={[
                            styles.audioTime,
                            { color: currentColors.text },
                          ]}>
                          {isPlaying ? playTime : duration}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Image preview modal */}
      <Modal
        visible={isImageModalVisible}
        transparent={true}
        onRequestClose={() => setIsImageModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setIsImageModalVisible(false)}>
          <View>
            <Image
              source={{ uri: selectedImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setIsImageModalVisible(false)}>
              <Icon name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: hp(10),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: hp(2),
    paddingHorizontal: wp(5),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    borderRadius: wp(4),
    padding: wp(2),
    marginLeft: wp(2),
    justifyContent: 'center',
    alignItems: 'center',
    width: wp(10),
    height: wp(10),
  },
  dateContainer: {
    padding: wp(4),
    marginBottom: hp(1),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  dateText: {
    fontSize: hp(1.8),
  },
  editContainer: {
    padding: wp(4),
    borderRadius: wp(2),
    margin: wp(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewContainer: {
    padding: wp(4),
    borderRadius: wp(2),
    margin: wp(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  titleText: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    marginBottom: hp(2),
  },
  contentText: {
    fontSize: hp(2),
    lineHeight: hp(3),
  },
  mediaContainer: {
    marginTop: hp(2),
    gap: hp(1),
  },
  mediaPreview: {
    width: '100%',
    height: hp(25),
    borderRadius: wp(2),
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: wp(3),
    borderRadius: wp(2),
    marginVertical: hp(0.5),
  },
  audioTime: {
    marginLeft: wp(2),
    fontSize: hp(1.8),
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: wp(95),
    height: hp(80),
  },
  modalClose: {
    position: 'absolute',
    top: hp(4),
    right: wp(6),
    backgroundColor: 'transparent',
    padding: wp(2),
  },
});

export default ViewEntryScreen;
