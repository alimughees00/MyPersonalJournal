import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

const ENTRIES_KEY = 'journal_entries';
export const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
export const MILLISECONDS_PER_MIN = 60 * 1000;

export const storage = {
  async getEntries() {
    try {
      const storedEntries = await AsyncStorage.getItem(ENTRIES_KEY);
      const entries = storedEntries ? JSON.parse(storedEntries) : [];

      const currentTime = new Date().getTime();
      const validEntries = [];

      for (const entry of entries) {
        // Check both old (destructTime) and new (expirationTime) formats
        const shouldExpire = entry.expirationTime
          ? currentTime >= entry.expirationTime
          : entry.destructTime &&
            currentTime - new Date(entry.date).getTime() >= entry.destructTime;

        if (!shouldExpire) {
          validEntries.push(entry);
        } else {
          // Clean up associated media files if they exist
          if (entry.media && entry.media.length > 0) {
            await this.cleanupMediaFiles(entry.media);
          }
        }
      }

      if (validEntries.length !== entries.length) {
        await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(validEntries));
      }

      return validEntries;
    } catch (error) {
      console.error('Error loading entries:', error);
      return [];
    }
  },

  async cleanupMediaFiles(mediaArray) {
    try {
      for (const mediaItem of mediaArray) {
        if (mediaItem.uri && mediaItem.uri.startsWith('file://')) {
          const filePath = mediaItem.uri.replace('file://', '');
          if (await RNFS.exists(filePath)) {
            await RNFS.unlink(filePath);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up media files:', error);
    }
  },

  async persistMediaFiles(mediaArray) {
    if (!mediaArray || !mediaArray.length) return [];
    try {
      const mediaDir = `${RNFS.DocumentDirectoryPath}/journal_media`;
      if (!(await RNFS.exists(mediaDir))) {
        await RNFS.mkdir(mediaDir);
      }
      const persisted = [];
      for (const item of mediaArray) {
        if (!item.uri || !item.uri.startsWith('file://')) {
          persisted.push(item);
          continue;
        }
        const rawPath = item.uri.replace('file://', '');
        // If already inside the permanent journal_media folder, keep it
        if (rawPath.startsWith(mediaDir)) {
          persisted.push(item);
          continue;
        }
        try {
          const ext = rawPath.split('.').pop() || 'dat';
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
          const destPath = `${mediaDir}/${fileName}`;
          if (await RNFS.exists(rawPath)) {
            await RNFS.copyFile(rawPath, destPath);
            persisted.push({...item, uri: `file://${destPath}`});
          } else {
            persisted.push(item);
          }
        } catch (err) {
          console.warn('Failed to persist media file:', err);
          persisted.push(item);
        }
      }
      return persisted;
    } catch (e) {
      console.warn('Error in persistMediaFiles:', e);
      return mediaArray;
    }
  },

  async saveEntry(entry) {
    try {
      const entries = await this.getEntries();
      const entryId = entry.id || Date.now().toString();

      // Ensure media files are persisted in app document storage
      const persistedMedia = entry.media && entry.media.length > 0
        ? await this.persistMediaFiles(entry.media)
        : entry.media || [];

      // Calculate expiration time if not already set
      const expirationTime =
        entry.expirationTime ||
        (entry.destructTime > 0
          ? new Date().getTime() + entry.destructTime
          : 0);

      const newEntry = {
        ...entry,
        id: entryId,
        media: persistedMedia,
        date: entry.date || new Date().toISOString(),
        destructTime: entry.destructTime || 0,
        expirationTime,
      };

      // If updating an existing entry, replace it
      const existingIndex = entries.findIndex(e => e.id === entryId);
      if (existingIndex >= 0) {
        // Clean up old media files if they're being replaced
        if (entry.media && entries[existingIndex].media) {
          const oldMedia = entries[existingIndex].media.filter(
            oldItem =>
              !entry.media.some(newItem => newItem.uri === oldItem.uri),
          );
          await this.cleanupMediaFiles(oldMedia);
        }

        entries[existingIndex] = newEntry;
      } else {
        entries.push(newEntry);
      }

      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      return newEntry;
    } catch (error) {
      console.error('Error saving entry:', error);
      return false;
    }
  },

  async updateEntry(updatedEntry) {
    return this.saveEntry(updatedEntry);
  },

  async deleteEntry(entryId) {
    try {
      const entries = await this.getEntries();
      const entryToDelete = entries.find(entry => entry.id === entryId);

      if (entryToDelete) {
        // Clean up associated media files
        if (entryToDelete.media && entryToDelete.media.length > 0) {
          await this.cleanupMediaFiles(entryToDelete.media);
        }

        const filteredEntries = entries.filter(entry => entry.id !== entryId);
        await AsyncStorage.setItem(
          ENTRIES_KEY,
          JSON.stringify(filteredEntries),
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting entry:', error);
      return false;
    }
  },

  async clearEntries() {
    try {
      // First clean up all media files
      const entries = await this.getEntries();
      for (const entry of entries) {
        if (entry.media && entry.media.length > 0) {
          await this.cleanupMediaFiles(entry.media);
        }
      }

      await AsyncStorage.removeItem(ENTRIES_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing entries:', error);
      return false;
    }
  },
};
