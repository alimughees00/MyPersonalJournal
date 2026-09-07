import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { auth } from '../utils/auth';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';
import { colors } from '../utils/colors';

// ✅ Fix #11 — moved outside component, not recreated on every render
const SECURITY_QUESTIONS = [
  "What is your favorite childhood pet's name?",
  'What was the name of your first school?',
  'What city were you born in?',
];

const LoginScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const currentColors = isDarkMode ? colors.dark : colors.light;
  const insets = useSafeAreaInsets();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(
    SECURITY_QUESTIONS[0],
  );
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [showSecurityQuestion, setShowSecurityQuestion] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Fix #3/#5/#12 — removed passwordValidations state and validatePassword,
  // login screen just sets password directly
  const handleLogin = useCallback(async () => {
    // ✅ Fix #4 — always clear error before each attempt
    setError('');

    const usernameRegex = /^[a-zA-Z0-9._]{3,}$/;
    if (!username.trim()) {
      setError('Username is required');
      return;
    } else if (!usernameRegex.test(username)) {
      setError(
        'Username must be at least 3 characters and only contain letters, numbers, dots, or underscores',
      );
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (showSecurityQuestion) {
      const secAnswerRegex = /^[A-Za-z\s]{2,}$/;
      if (!securityAnswer.trim()) {
        setError('Security answer is required');
        return;
      } else if (!secAnswerRegex.test(securityAnswer)) {
        setError(
          'Security answer must be at least 2 letters and contain only alphabets',
        );
        return;
      }
    }

    const result = await auth.login(
      username.trim(),
      password,
      showSecurityQuestion ? securityAnswer.trim() : null,
      showSecurityQuestion ? selectedQuestion : null,
    );

    if (result.needsSecuritySetup) {
      // ✅ Fix #4 — clear error cleanly before showing security form
      setError('');
      setShowSecurityQuestion(true);
      return;
    }

    if (result.success) {
      // Go back to wherever we came from (e.g. Settings) so the
      // calling screen's focus listener can reload the signed-in username.
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.replace('Home');
      }
    } else {
      setError('Invalid credentials');
    }
  }, [
    username,
    password,
    securityAnswer,
    selectedQuestion,
    showSecurityQuestion,
    navigation,
  ]);

  return (
    // ✅ Fix #13 — StatusBar moved outside ScrollView, sits at top level
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: currentColors.background }]} // ✅ Fix #1
        keyboardVerticalOffset={Platform.OS === 'ios' ? hp(5) : 0}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          translucent
          backgroundColor="transparent"
        />
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.innerContainer, { paddingTop: insets.top }]}>
            {/* ✅ Fix #6/#7 — single unified card; inner views have no background */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: currentColors.card,
                  shadowColor: isDarkMode ? '#9B59D4' : '#000',
                },
              ]}>
              {/* Header */}
              <View style={styles.headerContainer}>
                <Image
                  source={require('../assets/my-journal.png')}
                  style={styles.icon} // ✅ Fix #8 — use wp for width in styles below
                  resizeMode="contain"
                />
                {/* ✅ Fix #9 — replaced top: hp(1) with marginTop */}
                <Text
                  style={[
                    styles.subtitle,
                    { color: currentColors.secondaryText },
                  ]}>
                  Your personal space for thoughts
                </Text>
              </View>

              <View style={styles.divider} />

              {/* Form */}
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  {/* Username */}
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderBottomColor: isDarkMode ? '#3D2F54' : '#E0E0E0' },
                    ]}>
                    <Icon
                      name="user"
                      size={hp(2.5)}
                      color={currentColors.primary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: currentColors.text }]}
                      placeholder="Username"
                      placeholderTextColor={isDarkMode ? '#7E7090' : '#9E9E9E'}
                      value={username}
                      onChangeText={text =>
                        setUsername(text.replace(/[^a-zA-Z0-9._]/g, ''))
                      }
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Password */}
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderBottomColor: isDarkMode ? '#3D2F54' : '#E0E0E0' },
                    ]}>
                    <Icon
                      name="lock"
                      size={hp(2.5)}
                      color={currentColors.primary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: currentColors.text }]}
                      placeholder="Password"
                      placeholderTextColor={isDarkMode ? '#7E7090' : '#9E9E9E'}
                      value={password}
                      onChangeText={setPassword} // ✅ Fix #3/#5 — just setPassword, no validation
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(prev => !prev)}>
                      <Icon
                        name={showPassword ? 'eye' : 'eye-slash'}
                        size={hp(2.5)}
                        color={currentColors.secondaryText}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* ✅ Fix #3/#12 — password checklist removed entirely from login screen */}

                  {/* Security Question */}
                  {showSecurityQuestion && (
                    <View style={styles.securityContainer}>
                      <TouchableOpacity
                        style={[
                          styles.inputWrapper,
                          {
                            borderBottomColor: isDarkMode
                              ? '#3D2F54'
                              : '#E0E0E0',
                          },
                        ]}
                        onPress={() => setShowQuestionPicker(prev => !prev)}>
                        <Icon
                          name="shield-alt"
                          size={hp(2.5)}
                          color={currentColors.secondaryText}
                          style={styles.inputIcon}
                        />
                        <View style={styles.questionSelector}>
                          <Text
                            style={[
                              styles.securityQuestionLabel,
                              { color: currentColors.secondaryText },
                            ]}>
                            Security Question:
                          </Text>
                          <Text
                            style={[
                              styles.securityQuestionValue,
                              { color: currentColors.primary },
                            ]}>
                            {selectedQuestion}
                          </Text>
                        </View>
                        <Icon
                          name="chevron-down"
                          size={hp(2)}
                          color={currentColors.secondaryText}
                        />
                      </TouchableOpacity>

                      {showQuestionPicker && (
                        <View
                          style={[
                            styles.questionPicker,
                            {
                              backgroundColor: isDarkMode
                                ? '#2D223B'
                                : '#F5F5F5',
                            },
                          ]}>
                          {SECURITY_QUESTIONS.map((q, i) => (
                            <TouchableOpacity
                              key={i}
                              style={[
                                styles.questionOption,
                                {
                                  borderBottomColor: isDarkMode
                                    ? '#3D2F54'
                                    : '#E0E0E0',
                                },
                              ]}
                              onPress={() => {
                                setSelectedQuestion(q);
                                setShowQuestionPicker(false);
                              }}>
                              <Text
                                style={[
                                  styles.questionOptionText,
                                  { color: currentColors.secondaryText },
                                  selectedQuestion === q && [
                                    styles.selectedQuestionText,
                                    { color: currentColors.primary },
                                  ],
                                ]}>
                                {q}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      <View
                        style={[
                          styles.inputWrapper,
                          {
                            borderBottomColor: isDarkMode
                              ? '#3D2F54'
                              : '#E0E0E0',
                          },
                        ]}>
                        <Icon
                          name="key"
                          size={hp(2.5)}
                          color={currentColors.secondaryText}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={[styles.input, { color: currentColors.text }]}
                          placeholder="Enter security answer"
                          placeholderTextColor={
                            isDarkMode ? '#7E7090' : '#9E9E9E'
                          }
                          value={securityAnswer}
                          onChangeText={text =>
                            setSecurityAnswer(text.replace(/[^a-zA-Z\s]/g, ''))
                          }
                          autoCapitalize="words"
                        />
                      </View>
                    </View>
                  )}

                  {error ? (
                    <Text
                      style={[
                        styles.errorText,
                        { color: currentColors.deleteButton },
                      ]}>
                      {error}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={[
                    styles.button,
                    { backgroundColor: currentColors.primary },
                  ]}
                  onPress={handleLogin}>
                  <Text style={styles.buttonText}>Sign In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.guestButton,
                    { borderColor: currentColors.primary },
                  ]}
                  onPress={() => {
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.replace('Home');
                    }
                  }}>
                  <Text
                    style={[
                      styles.guestButtonText,
                      { color: currentColors.primary },
                    ]}>
                    Continue as Guest (No Account)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotPassword}
                  onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text
                    style={[
                      styles.forgotPasswordText,
                      { color: currentColors.secondaryText },
                    ]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>

                <Text
                  style={[
                    styles.privacyNotice,
                    { color: currentColors.secondaryText },
                  ]}>
                  Offline & Private: Accounts are optional. Journal entries
                  remain on your device.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(8),
    paddingBottom: hp(5),
  },

  // ✅ Fix #6/#7 — unified card replaces separate headerContainer + formContainer backgrounds
  card: {
    borderRadius: wp(4),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },

  headerContainer: {
    alignItems: 'center',
    paddingTop: hp(4),
    paddingHorizontal: wp(6),
    paddingBottom: hp(2),
  },

  // ✅ Fix #8 — wp for width, hp for height
  icon: {
    width: wp(55),
    height: hp(20),
  },

  // ✅ Fix #9 — marginTop instead of top
  subtitle: {
    fontSize: hp(2),
    textAlign: 'center',
    lineHeight: hp(3),
    marginTop: hp(1),
    fontFamily: 'Inter-Bold',
  },

  divider: {
    height: 1,
    backgroundColor: '#E8D9F7',
    marginHorizontal: wp(6),
    opacity: 0.8,
  },

  formContainer: {
    paddingVertical: hp(3),
    paddingHorizontal: wp(6),
  },
  inputContainer: {
    marginBottom: hp(2),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginBottom: hp(2),
    paddingBottom: hp(1),
  },
  inputIcon: {
    marginRight: wp(3),
  },
  input: {
    flex: 1,
    fontSize: hp(2),
    paddingVertical: hp(1),
  },
  eyeIcon: {
    paddingLeft: wp(3),
  },
  button: {
    paddingVertical: hp(1.8),
    borderRadius: wp(2),
    marginTop: hp(2),
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: hp(2.2),
    fontWeight: 'bold',
  },
  errorText: {
    marginTop: hp(1),
    textAlign: 'center',
    fontSize: hp(1.8),
  },
  forgotPassword: {
    marginTop: hp(2),
    alignItems: 'center',
  },
  forgotPasswordText: {
    fontSize: hp(1.8),
    textDecorationLine: 'underline',
  },
  securityQuestionLabel: {
    fontSize: hp(1.4),
    marginBottom: hp(0.2),
  },
  securityQuestionValue: {
    fontSize: hp(1.8),
    fontWeight: '500',
  },
  questionSelector: {
    flex: 1,
  },
  questionPicker: {
    borderRadius: wp(2),
    padding: wp(2),
    marginBottom: hp(2),
  },
  questionOption: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderBottomWidth: 1,
  },
  questionOptionText: {
    fontSize: hp(1.7),
  },
  selectedQuestionText: {
    fontWeight: 'bold',
  },
  securityContainer: {
    marginTop: hp(1),
  },
  guestButton: {
    paddingVertical: hp(1.6),
    borderRadius: wp(2),
    borderWidth: 1.5,
    marginTop: hp(1.5),
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: hp(2),
    fontWeight: '600',
  },
  privacyNotice: {
    fontSize: hp(1.5),
    textAlign: 'center',
    marginTop: hp(2.5),
    lineHeight: hp(2.2),
  },
});

export default LoginScreen;
