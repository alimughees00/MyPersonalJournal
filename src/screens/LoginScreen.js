import React, {useState} from 'react';
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
import {auth} from '../utils/auth';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const LoginScreen = ({navigation}) => {
  const STATUS_BAR_HEIGHT =
    Platform.OS === 'android' ? StatusBar.currentHeight : 0;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(
    "What is your favorite childhood pet's name?",
  );
  const [showQuestionPicker, setShowQuestionPicker] = useState(false);
  const [showSecurityQuestion, setShowSecurityQuestion] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const securityQuestions = [
    "What is your favorite childhood pet's name?",
    'What was the name of your first school?',
    'What city were you born in?',
  ];

  const [passwordValidations, setPasswordValidations] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  const validatePassword = text => {
    setPassword(text);

    setPasswordValidations({
      length: text.length >= 8,
      uppercase: /[A-Z]/.test(text),
      number: /[0-9]/.test(text),
      specialChar: /[^A-Za-z0-9]/.test(text),
    });
  };

  const handleLogin = async () => {
    setError('');

    // Username validation
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

    // Password validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!password) {
      setError('Password is required');
      return;
    } else if (!passwordRegex.test(password)) {
      setError(
        'Password must be at least 8 characters long and include uppercase, number, and special character',
      );
      return;
    }

    // Security question validation (if required)
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
      setShowSecurityQuestion(true);
      return;
    }

    if (result.success) {
      navigation.replace('Home');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? hp(5) : 0}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled">
          <StatusBar barStyle="light-content" backgroundColor="#5C4E4E" />
          <View
            style={[styles.innerContainer, {paddingTop: STATUS_BAR_HEIGHT}]}>
            <View style={styles.headerContainer}>
              <Image
                source={require('../assets/my-journal.png')}
                style={styles.icon}
                resizeMode="contain"
                backgroundColor="transparent"
              />
              <Text style={styles.subtitle}>
                Your personal space for thoughts
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                {/* Username */}
                <View style={styles.inputWrapper}>
                  <Icon
                    name="user"
                    size={hp(2.5)}
                    color="#5C4E4E"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#9E9E9E"
                    value={username}
                    onChangeText={text =>
                      setUsername(text.replace(/[^a-zA-Z0-9._]/g, ''))
                    }
                    autoCapitalize="none"
                  />
                </View>

                {/* Password */}
                <View style={styles.inputWrapper}>
                  <Icon
                    name="lock"
                    size={hp(2.5)}
                    color="#5C4E4E"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#9E9E9E"
                    value={password}
                    onChangeText={validatePassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}>
                    <Icon
                      name={showPassword ? 'eye' : 'eye-slash'}
                      size={hp(2.5)}
                      color="#5C4E4E"
                    />
                  </TouchableOpacity>
                </View>

                {/* Password checklist */}
                {password.length > 0 && (
                  <View style={styles.validationContainer}>
                    <Text style={styles.validationText}>
                      {passwordValidations.length ? '✅' : '❌'} Minimum 8
                      characters
                    </Text>
                    <Text style={styles.validationText}>
                      {passwordValidations.uppercase ? '✅' : '❌'} At least 1
                      uppercase letter
                    </Text>
                    <Text style={styles.validationText}>
                      {passwordValidations.number ? '✅' : '❌'} At least 1
                      number
                    </Text>
                    <Text style={styles.validationText}>
                      {passwordValidations.specialChar ? '✅' : '❌'} At least 1
                      special character
                    </Text>
                  </View>
                )}

                {/* Security Question */}
                {showSecurityQuestion && (
                  <View style={styles.securityContainer}>
                    <TouchableOpacity
                      style={styles.inputWrapper}
                      onPress={() =>
                        setShowQuestionPicker(!showQuestionPicker)
                      }>
                      <Icon
                        name="shield-alt"
                        size={hp(2.5)}
                        color="#5C4E4E"
                        style={styles.inputIcon}
                      />
                      <View style={styles.questionSelector}>
                        <Text style={styles.securityQuestionLabel}>
                          Security Question:
                        </Text>
                        <Text style={styles.securityQuestionValue}>
                          {selectedQuestion}
                        </Text>
                      </View>
                      <Icon name="chevron-down" size={hp(2)} color="#5C4E4E" />
                    </TouchableOpacity>

                    {showQuestionPicker && (
                      <View style={styles.questionPicker}>
                        {securityQuestions.map((q, i) => (
                          <TouchableOpacity
                            key={i}
                            style={styles.questionOption}
                            onPress={() => {
                              setSelectedQuestion(q);
                              setShowQuestionPicker(false);
                            }}>
                            <Text
                              style={[
                                styles.questionOptionText,
                                selectedQuestion === q &&
                                  styles.selectedQuestionText,
                              ]}>
                              {q}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <View style={styles.inputWrapper}>
                      <Icon
                        name="key"
                        size={hp(2.5)}
                        color="#5C4E4E"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter security answer"
                        placeholderTextColor="#9E9E9E"
                        value={securityAnswer}
                        onChangeText={text =>
                          setSecurityAnswer(text.replace(/[^a-zA-Z\s]/g, ''))
                        }
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                )}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>

              <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
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
    backgroundColor: '#F8F5F5',
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
  headerContainer: {
    alignItems: 'center',
    marginBottom: hp(4),
    backgroundColor: '#FFFFFF',
    borderRadius: wp(4),
    paddingVertical: hp(4),
    paddingHorizontal: wp(6),
  },
  icon: {
    width: hp(30),
    height: hp(20),
  },
  subtitle: {
    fontSize: hp(2),
    color: '#757575',
    textAlign: 'center',
    lineHeight: hp(3),
    top: hp(1),
    fontFamily: 'Inter-Bold',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp(4),
    paddingVertical: hp(4),
    paddingHorizontal: wp(6),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: hp(2),
  },
  inputContainer: {
    marginBottom: hp(2),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: hp(2),
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
  eyeIcon: {
    paddingLeft: wp(3),
  },
  button: {
    backgroundColor: '#5C4E4E',
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
    color: '#D32F2F',
    marginTop: hp(1),
    textAlign: 'center',
    fontSize: hp(1.8),
  },
  forgotPassword: {
    marginTop: hp(2),
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#5C4E4E',
    fontSize: hp(1.8),
    textDecorationLine: 'underline',
  },
  securityQuestionLabel: {
    fontSize: hp(1.4),
    color: '#757575',
    marginBottom: hp(0.2),
  },
  securityQuestionValue: {
    fontSize: hp(1.8),
    color: '#424242',
    fontWeight: '500',
  },
  questionSelector: {
    flex: 1,
  },
  questionPicker: {
    backgroundColor: '#F5F5F5',
    borderRadius: wp(2),
    padding: wp(2),
    marginBottom: hp(2),
  },
  questionOption: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  questionOptionText: {
    fontSize: hp(1.7),
    color: '#616161',
  },
  selectedQuestionText: {
    color: '#5C4E4E',
    fontWeight: 'bold',
  },
  securityContainer: {
    marginTop: hp(1),
  },
});

export default LoginScreen;
