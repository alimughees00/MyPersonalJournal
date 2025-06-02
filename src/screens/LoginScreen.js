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
} from 'react-native';
import {auth} from '../utils/auth';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const LoginScreen = ({navigation}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [showSecurityQuestion, setShowSecurityQuestion] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    const result = await auth.login(
      username,
      password,
      showSecurityQuestion ? securityAnswer : null,
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#988686" />
      <View style={styles.innerContainer}>
        <View style={styles.headerContainer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={styles.title}>My Journal</Text>
          <Text style={styles.subtitle}>Your personal space for thoughts</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#fff"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#fff"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}>
                <Icon
                  name={showPassword ? 'eye' : 'eye-slash'}
                  size={15}
                  color={showPassword ? '#5C4E4E' : '#fff'}
                />
                +41774755214
              </TouchableOpacity>
            </View>
            {showSecurityQuestion && (
              <View style={styles.inputWrapper}>
                <Text style={styles.securityQuestion}>
                  What is your favorite childhood pet's name?
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter security answer"
                  placeholderTextColor="#000"
                  value={securityAnswer}
                  onChangeText={setSecurityAnswer}
                  autoCapitalize="none"
                />
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
            <Text style={styles.forgotPasswordText}>
              Forgot Username/Password?
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#988686',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
  },
  icon: {
    width: wp(40),
    height: hp(18),
  },
  title: {
    fontSize: hp(4.7),
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: hp(2),
  },
  subtitle: {
    fontSize: hp(2.5),
    color: '#fff',
    textAlign: 'center',
    lineHeight: hp(4),
  },
  formContainer: {
    paddingVertical: hp(6),
    paddingHorizontal: wp(10),
  },
  inputWrapper: {
    borderColor: '#5C4E4E',
    borderBottomWidth: hp(0.3),
  },
  input: {
    fontSize: hp(2.4),
    color: '#2d3436',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#5C4E4E',
    borderBottomWidth: hp(0.3),
    marginVertical: hp(1),
  },
  passwordInput: {
    flex: 1,
    fontSize: hp(2.4),
    color: '#2d3436',
  },
  eyeIcon: {
    paddingHorizontal: wp(5),
  },
  button: {
    marginTop: hp(5),
    backgroundColor: '#5C4E4E',
    paddingVertical: hp(2),
    borderRadius: wp(3),
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: hp(2.7),
    fontWeight: 'bold',
  },
  errorText: {
    color: '#C70039',
    marginTop: hp(1.5),
    textAlign: 'center',
    fontSize: hp(2),
  },
  forgotPassword: {
    marginTop: hp(3),
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#fff',
    fontSize: hp(2),
  },
  securityQuestion: {
    fontSize: wp(3.9),
    color: '#fff',
    marginBottom: 8,
    // paddingHorizontal: 16,
    paddingTop: 16,
  },
});

export default LoginScreen;
