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
} from "react-native-responsive-screen";

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
        
      <StatusBar barStyle="light-content" backgroundColor="#5C4E4E" />
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
              <Icon name="user" size={hp(2.5)} color="#5C4E4E" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#9E9E9E"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
            <View style={styles.inputWrapper}>
              <Icon name="lock" size={hp(2.5)} color="#5C4E4E" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9E9E9E"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
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
            {showSecurityQuestion && (
              <View style={styles.inputWrapper}>
                <Icon name="shield-alt" size={hp(2.5)} color="#5C4E4E" style={styles.inputIcon} />
                <Text style={styles.securityQuestion}>
                  What is your favorite childhood pet's name?
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter security answer"
                  placeholderTextColor="#9E9E9E"
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
    backgroundColor: '#F8F5F5',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: wp(8),
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: hp(5),
  },
  icon: {
    width: wp(30),
    height: hp(15),
    tintColor: '#5C4E4E',
  },
  title: {
    fontSize: hp(4),
    fontWeight: 'bold',
    color: '#5C4E4E',
    marginBottom: hp(1),
  },
  subtitle: {
    fontSize: hp(2),
    color: '#757575',
    textAlign: 'center',
    lineHeight: hp(3),
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp(4),
    paddingVertical: hp(4),
    paddingHorizontal: wp(6),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  securityQuestion: {
    fontSize: hp(1.8),
    color: '#757575',
    marginBottom: hp(1),
    paddingHorizontal: wp(2),
  },
});

export default LoginScreen;