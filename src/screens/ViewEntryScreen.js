import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {auth} from '../utils/auth';
import {storage} from '../utils/storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ViewEntryScreen = ({navigation, route}) => {
  const {entry} = route.params;
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [content, setContent] = useState(entry.content);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerButtons}>
          {isEditing ? (
            <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setIsEditing(true)}
              style={styles.headerButton}>
              <Icon name="edit" size={24} color="#6c63ff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.headerButton, styles.deleteButton]}>
            <Icon name="delete" size={24} color="#ff4444" />
          </TouchableOpacity>
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
        Alert.alert('Success', 'Entry updated successfully');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await storage.deleteEntry(entry.id);
              if (success) {
                auth.updateActivity();
                navigation.goBack();
              }
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ],
    );
  };

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
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginHorizontal: 8,
    padding: 8,
  },
  headerButtonText: {
    color: '#6c63ff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    marginLeft: 8,
  },
  dateContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dateText: {
    color: '#666',
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
    color: '#333',
    marginBottom: 16,
    padding: 0,
  },
  contentInput: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    minHeight: 200,
    padding: 0,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  contentText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
});

export default ViewEntryScreen;