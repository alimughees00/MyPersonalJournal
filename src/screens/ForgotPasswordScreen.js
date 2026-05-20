import React, {useState, useEffect, useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import {auth} from '../utils/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import CustomModal from '../components/CustomModal';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ThemeContext} from '../context/ThemeContext';
import {colors} from '../utils/colors';

const ForgotPasswordScreen = ({navigation}) => {
  const {isDarkMode} = useContext(ThemeContext);
  const currentColors = isDarkMode ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [question, setQuestion] = useState(
    "What is your favorite childhood pet's name?",
  );
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [username, setUsername] = useState('');
  const [step, setStep] = useState('security'); // 'security', 'confirm', 'resetPassword'
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({title: '', message: ''});

  const validatePassword = text => {
    setNewPassword(text);
    setPasswordValidations({
      length: text.length >= 8,
      uppercase: /[A-Z]/.test(text),
      number: /[0-9]/.test(text),
      specialChar: /[^A-Za-z0-9]/.test(text),
    });
  };

  useEffect(() => {
    const fetchQuestion = async () => {
      const q = await auth.getSecurityQuestion();
      setQuestion(q);
    };
    fetchQuestion();
  }, []);

  const handleRecovery = async () => {
    setError('');
    if (!securityAnswer.trim()) {
      setError('Please enter your security answer');
      return;
    }

    const verified = await auth.verifySecurityAnswer(securityAnswer.trim());
    if (verified) {
      const fetchedUsername = await auth.getUsername();
      if (fetchedUsername) {
        setUsername(fetchedUsername);
        setStep('confirm');
      } else {
        setError('Unable to retrieve account information');
      }
    } else {
      setError('Incorrect security answer');
    }
  };

  const handleConfirmAccount = () => {
    setError('');
    setIsVerified(true);
    setStep('resetPassword');
  };

  const handleResetPassword = async () => {
    setError('');

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

    if (!newPassword) {
      setError('New password is required');
      return;
    } else if (!passwordRegex.test(newPassword)) {
      setError(
        'Password must be at least 8 characters long and include uppercase, number, and special character',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const success = await auth.resetPassword(
      newPassword,
      securityAnswer.trim(),
    );
    if (success) {
      setModalConfig({
        title: 'Success',
        message: 'Your password has been reset successfully.',
        onConfirm: () => {
          setModalVisible(false);
          navigation.navigate('Login');
        },
      });
      setModalVisible(true);
    } else {
      setError('Failed to reset password. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, {backgroundColor: currentColors.background}]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        translucent
        backgroundColor="transparent"
      />
      <View style={[styles.innerContainer, {paddingTop: insets.top}]}>
        <View style={styles.headerContainer}>
          <Icon
            name="lock-reset"
            size={hp(8)}
            color={currentColors.primary}
            style={styles.icon}
          />
          <Text style={[styles.title, {color: currentColors.text}]}>
            Account Recovery
          </Text>
          <Text style={[styles.subtitle, {color: currentColors.secondaryText}]}>
            Answer your security question to recover access
          </Text>
        </View>

        <View
          style={[styles.formContainer, {backgroundColor: currentColors.card}]}>
          {step === 'security' && (
            <View style={styles.inputContainer}>
              <Text style={[styles.question, {color: currentColors.text}]}>
                {question}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {borderBottomColor: isDarkMode ? '#3D2F54' : '#E0E0E0'},
                ]}>
                <Icon
                  name="help-center"
                  size={hp(3.0)}
                  color={currentColors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, {color: currentColors.text}]}
                  placeholder="Enter your answer"
                  placeholderTextColor={isDarkMode ? '#7E7090' : '#9E9E9E'}
                  value={securityAnswer}
                  onChangeText={setSecurityAnswer}
                  autoCapitalize="none"
                />
              </View>
              {error ? (
                <Text
                  style={[
                    styles.errorText,
                    {color: currentColors.deleteButton},
                  ]}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  {backgroundColor: currentColors.primary},
                ]}
                onPress={handleRecovery}
                activeOpacity={0.8}>
                <Text style={styles.buttonText}>Verify Answer</Text>
                <Icon
                  name="check-circle"
                  size={hp(2.5)}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
            </View>
          )}

          {step === 'confirm' && (
            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.confirmationBox,
                  {
                    backgroundColor: isDarkMode ? '#3D2F54' : '#F5F5F5',
                    borderColor: currentColors.primary,
                  },
                ]}>
                <Icon
                  name="verified-user"
                  size={hp(5)}
                  color={currentColors.primary}
                  style={styles.confirmIcon}
                />
                <Text
                  style={[styles.confirmTitle, {color: currentColors.text}]}>
                  Account Confirmed
                </Text>
                <Text
                  style={[
                    styles.confirmLabel,
                    {color: currentColors.secondaryText},
                  ]}>
                  Username:
                </Text>
                <Text
                  style={[styles.usernameDisplay, {color: currentColors.text}]}>
                  {username}
                </Text>
                <Text
                  style={[
                    styles.confirmMessage,
                    {color: currentColors.secondaryText},
                  ]}>
                  Is this your account? Click "Proceed" to set a new password.
                </Text>
              </View>

              {error ? (
                <Text
                  style={[
                    styles.errorText,
                    {color: currentColors.deleteButton},
                  ]}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  {backgroundColor: currentColors.primary},
                ]}
                onPress={handleConfirmAccount}
                activeOpacity={0.8}>
                <Text style={styles.buttonText}>Proceed to Reset</Text>
                <Icon
                  name="arrow-forward"
                  size={hp(2.5)}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
            </View>
          )}

          {step === 'resetPassword' && (
            <View style={styles.inputContainer}>
              <Text style={[styles.question, {color: currentColors.text}]}>
                Set New Password
              </Text>

              <View
                style={[
                  styles.inputWrapper,
                  {borderBottomColor: isDarkMode ? '#3D2F54' : '#E0E0E0'},
                ]}>
                <Icon
                  name="lock-outline"
                  size={hp(2.5)}
                  color={currentColors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, {color: currentColors.text}]}
                  placeholder="New Password"
                  placeholderTextColor={isDarkMode ? '#7E7090' : '#9E9E9E'}
                  value={newPassword}
                  onChangeText={validatePassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}>
                  <Icon
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={hp(2.5)}
                    color={currentColors.secondaryText}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.validationContainer}>
                <Text
                  style={[
                    styles.validationText,
                    {color: currentColors.secondaryText},
                  ]}>
                  {passwordValidations.length ? '✅' : '❌'} Minimum 8
                  characters
                </Text>
                <Text
                  style={[
                    styles.validationText,
                    {color: currentColors.secondaryText},
                  ]}>
                  {passwordValidations.uppercase ? '✅' : '❌'} At least 1
                  uppercase letter
                </Text>
                <Text
                  style={[
                    styles.validationText,
                    {color: currentColors.secondaryText},
                  ]}>
                  {passwordValidations.number ? '✅' : '❌'} At least 1 number
                </Text>
                <Text
                  style={[
                    styles.validationText,
                    {color: currentColors.secondaryText},
                  ]}>
                  {passwordValidations.specialChar ? '✅' : '❌'} At least 1
                  special character
                </Text>
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  {borderBottomColor: isDarkMode ? '#3D2F54' : '#E0E0E0'},
                ]}>
                <Icon
                  name="lock"
                  size={hp(2.5)}
                  color={currentColors.primary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, {color: currentColors.text}]}
                  placeholder="Confirm New Password"
                  placeholderTextColor={isDarkMode ? '#7E7090' : '#9E9E9E'}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}>
                  <Icon
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={hp(2.5)}
                    color={currentColors.secondaryText}
                  />
                </TouchableOpacity>
              </View>

              {error ? (
                <Text
                  style={[
                    styles.errorText,
                    {color: currentColors.deleteButton},
                  ]}>
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  {backgroundColor: currentColors.primary},
                ]}
                onPress={handleResetPassword}
                activeOpacity={0.8}>
                <Text style={styles.buttonText}>Reset Password</Text>
                <Icon
                  name="save"
                  size={hp(2.5)}
                  color="#FFFFFF"
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (step === 'confirm' || step === 'resetPassword') {
                setStep('security');
                setError('');
                setUsername('');
              } else {
                navigation.goBack();
              }
            }}
            activeOpacity={0.6}>
            <Icon
              name="arrow-back"
              size={hp(2.5)}
              color={currentColors.secondaryText}
            />
            <Text
              style={[
                styles.backButtonText,
                {color: currentColors.secondaryText},
              ]}>
              {step === 'security' ? 'Back to Login' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <CustomModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm || (() => setModalVisible(false))}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F5',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(8),
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: hp(6),
  },
  icon: {
    marginBottom: hp(2),
  },
  title: {
    fontSize: hp(3.5),
    fontWeight: 'bold',
    color: '#5C4E4E',
    marginBottom: hp(1),
  },
  subtitle: {
    fontSize: hp(2),
    color: '#757575',
    textAlign: 'center',
    lineHeight: hp(3),
    paddingHorizontal: wp(10),
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp(4),
    padding: wp(6),
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    marginBottom: hp(4),
  },
  question: {
    fontSize: hp(2),
    color: '#424242',
    marginBottom: hp(2),
    textAlign: 'center',
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: hp(1),
  },
  inputIcon: {
    marginRight: wp(3),
  },
  input: {
    flex: 1,
    fontSize: hp(2),
    color: '#424242',
    paddingVertical: hp(1),
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5C4E4E',
    paddingVertical: hp(2),
    borderRadius: wp(2),
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: hp(2.2),
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: wp(2),
  },
  backButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: hp(3),
  },
  backButtonText: {
    color: '#5C4E4E',
    fontSize: hp(1.9),
    fontWeight: '500',
    marginLeft: wp(2),
  },
  errorText: {
    color: '#D32F2F',
    marginTop: hp(2),
    marginBottom: hp(1),
    textAlign: 'center',
    fontSize: hp(1.8),
  },
  validationContainer: {
    marginTop: hp(1),
    marginBottom: hp(2),
    marginLeft: wp(2),
  },
  validationText: {
    fontSize: hp(1.6),
    color: '#555',
    marginVertical: hp(0.3),
  },
  confirmationBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: wp(3),
    padding: wp(5),
    alignItems: 'center',
    marginBottom: hp(3),
    borderWidth: 2,
    borderColor: '#5C4E4E',
  },
  confirmIcon: {
    marginBottom: hp(1),
  },
  confirmTitle: {
    fontSize: hp(2.5),
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: hp(1),
  },
  confirmLabel: {
    fontSize: hp(1.8),
    color: '#757575',
    marginTop: hp(1),
  },
  usernameDisplay: {
    fontSize: hp(2.2),
    fontWeight: '600',
    color: '#5C4E4E',
    marginTop: hp(0.5),
    marginBottom: hp(1),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    backgroundColor: 'rgba(92, 78, 78, 0.1)',
    borderRadius: wp(2),
  },
  confirmMessage: {
    fontSize: hp(1.6),
    color: '#757575',
    textAlign: 'center',
    marginTop: hp(1),
    lineHeight: hp(2.2),
  },
});

export default ForgotPasswordScreen;
