import AsyncStorage from '@react-native-async-storage/async-storage';

const ENTRIES_KEY = 'journal_entries';

export const storage = {
  async getEntries() {
    try {
      const storedEntries = await AsyncStorage.getItem(ENTRIES_KEY);
      return storedEntries ? JSON.parse(storedEntries) : [];
    } catch (error) {
      console.error('Error loading entries:', error);
      return [];
    }
  },

  async saveEntry(entry) {
    try {
      const entries = await this.getEntries();
      entries.push({
        ...entry,
        id: Date.now().toString(),
        date: new Date().toISOString(),
      });
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
      return true;
    } catch (error) {
      console.error('Error saving entry:', error);
      return false;
    }
  },

  async updateEntry(updatedEntry) {
    try {
      const entries = await this.getEntries();
      const updatedEntries = entries.map(entry =>
        entry.id === updatedEntry.id
          ? {
              ...updatedEntry,
              lastEdited: new Date().toISOString(),
            }
          : entry,
      );
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
      return true;
    } catch (error) {
      console.error('Error updating entry:', error);
      return false;
    }
  },

  async deleteEntry(entryId) {
    try {
      const entries = await this.getEntries();
      const filteredEntries = entries.filter(entry => entry.id !== entryId);
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(filteredEntries));
      return true;
    } catch (error) {
      console.error('Error deleting entry:', error);
      return false;
    }
  },

  async clearEntries() {
    try {
      await AsyncStorage.removeItem(ENTRIES_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing entries:', error);
      return false;
    }
  },
};