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
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth} from '../utils/auth';
import {storage} from '../utils/storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Video from 'react-native-video';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const ViewEntryScreen = ({navigation, route}) => {
  const {entry, mode} = route.params;
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playTime, setPlayTime] = useState('00:00:00');
  const [duration, setDuration] = useState('00:00:00');

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
    }
  };

  const currentColors = mode ? colors.dark : colors.light;

  const audioPlayer = useRef(new AudioRecorderPlayer());

  // ... (keep all your existing functions unchanged)

  return (
    <ScrollView style={[styles.container, {backgroundColor: currentColors.background}]}>
      <StatusBar barStyle={mode ? 'light-content' : 'dark-content'} backgroundColor={currentColors.header} />
      <View style={[styles.dateContainer, {backgroundColor: currentColors.card}]}>
        <Text style={[styles.dateText, {color: currentColors.secondaryText}]}>
          {new Date(entry.date).toLocaleDateString()} at{' '}
          {new Date(entry.date).toLocaleTimeString()}
        </Text>
      </View>

      {isEditing ? (
        <View style={[styles.editContainer, {backgroundColor: currentColors.card}]}>
          <TextInput
            style={[styles.titleInput, {
              color: currentColors.text,
              borderBottomColor: currentColors.secondaryText
            }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Title"
            placeholderTextColor={currentColors.secondaryText}
            maxLength={100}
          />
          <TextInput
            style={[styles.contentInput, {color: currentColors.text}]}
            value={content}
            onChangeText={setContent}
            placeholder="Write your thoughts..."
            placeholderTextColor={currentColors.secondaryText}
            multiline
            textAlignVertical="top"
          />
        </View>
      ) : (
        <View style={[styles.viewContainer, {backgroundColor: currentColors.card}]}>
          <Text style={[styles.titleText, {color: currentColors.text}]}>{title}</Text>
          <Text style={[styles.contentText, {color: currentColors.text}]}>{content}</Text>
          {entry.media && entry.media.length > 0 && (
            <View style={styles.mediaContainer}>
              {entry.media.map((item, index) => {
                if (item.type.startsWith('image')) {
                  return (
                    <Image
                      key={index}
                      source={{uri: item.uri}}
                      style={[styles.mediaPreview, {backgroundColor: currentColors.mediaBg}]}
                      resizeMode="cover"
                    />
                  );
                } else if (item.type.startsWith('video')) {
                  return (
                    <Video
                      key={index}
                      source={{uri: item.uri}}
                      style={[styles.mediaPreview, {backgroundColor: currentColors.mediaBg}]}
                      resizeMode="cover"
                      controls={true}
                    />
                  );
                } else {
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[styles.audioContainer, {backgroundColor: currentColors.mediaBg}]}
                      onPress={() => playAudio(item.uri)}>
                      <Icon
                        name={isPlaying ? 'pause-circle-filled' : 'play-circle-filled'}
                        size={40}
                        color={currentColors.audioIcon}
                      />
                      <Text style={[styles.audioTime, {color: currentColors.text}]}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(2),
  },
  editDeleteContainer: {
    flexDirection: 'row',
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
  deleteButton: {
    // Color will be set dynamically
  },
  dateContainer: {
    padding: wp(4),
    marginBottom: hp(1),
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
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
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewContainer: {
    padding: wp(4),
    borderRadius: wp(2),
    margin: wp(4),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
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
});

export default ViewEntryScreen;