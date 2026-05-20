import React, {useContext} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {ThemeContext} from '../context/ThemeContext';
import {colors} from '../utils/colors';

const CustomModal = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  isDestructive = false,
}) => {
  const {isDarkMode} = useContext(ThemeContext);
  const currentColors = isDarkMode ? colors.dark : colors.light;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {backgroundColor: currentColors.card}]}>
          {title ? (
            <Text style={[styles.title, {color: currentColors.primary}]}>
              {title}
            </Text>
          ) : null}
          <Text style={[styles.message, {color: currentColors.text}]}>
            {message}
          </Text>
          
          <View style={styles.buttonContainer}>
            {onCancel && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.cancelButton,
                  {
                    backgroundColor: isDarkMode ? currentColors.mediaBg : '#F5F5F5',
                    borderColor: isDarkMode ? 'transparent' : '#E0E0E0',
                  },
                ]}
                onPress={onCancel}>
                <Text style={[styles.cancelButtonText, {color: currentColors.secondaryText}]}>
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                {
                  backgroundColor: isDestructive
                    ? currentColors.deleteButton
                    : currentColors.primary,
                },
                !onCancel && {width: '100%'},
              ]}
              onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: wp(85),
    borderRadius: wp(4),
    padding: wp(6),
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  title: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  message: {
    fontSize: hp(2),
    textAlign: 'center',
    marginBottom: hp(3),
    lineHeight: hp(2.8),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    paddingVertical: hp(1.5),
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: wp(35),
  },
  confirmButton: {},
  cancelButton: {
    borderWidth: 1,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: hp(2),
    fontWeight: 'bold',
  },
  cancelButtonText: {
    fontSize: hp(2),
    fontWeight: '500',
  },
});

export default CustomModal;
