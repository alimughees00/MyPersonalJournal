import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { auth } from '../utils/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const ForgotPasswordScreen = ({ navigation }) => {
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');

  const handleRecovery = async () => {
    if (!securityAnswer.trim()) {
      setError('Please enter your security answer');
      return;
    }

    const credentials = await auth.getCredentialsWithSecurity(securityAnswer);
    if (credentials) {
      Alert.alert(
        'Your Credentials',
        `Username: ${credentials.username}\nPassword: ${credentials.password}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } else {
      setError('Incorrect security answer');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5C4E4E" />
      <View style={styles.innerContainer}>
        <View style={styles.headerContainer}>
          <Icon name="lock-reset" size={hp(8)} color="#FFFFFF" style={styles.icon} />
          <Text style={styles.title}>Account Recovery</Text>
          <Text style={styles.subtitle}>Answer your security question to recover access</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.question}>
              What is your favorite childhood pet's name?
            </Text>
            <View style={styles.inputWrapper}>
              <Icon name="pets" size={hp(2.5)} color="#5C4E4E" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your answer"
                placeholderTextColor="#9E9E9E"
                value={securityAnswer}
                onChangeText={setSecurityAnswer}
                autoCapitalize="none"
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleRecovery}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>Recover Account</Text>
            <Icon name="arrow-forward" size={hp(2.5)} color="#FFFFFF" style={styles.buttonIcon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.6}>
            <Icon name="arrow-back" size={hp(2.5)} color="#5C4E4E" />
            <Text style={styles.backButtonText}>Back to Login</Text>
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
    shadowOffset: { width: 0, height: 2 },
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
    marginTop: hp(1),
    textAlign: 'center',
    fontSize: hp(1.8),
  },
});

export default ForgotPasswordScreen;