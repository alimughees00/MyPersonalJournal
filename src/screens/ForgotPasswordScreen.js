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
} from 'react-native';
import { auth } from '../utils/auth';

const ForgotPasswordScreen = ({ navigation }) => {
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [error, setError] = useState('');

  const handleRecovery = async () => {
    const credentials = await auth.getCredentialsWithSecurity(securityAnswer);
    if (credentials) {
      // Show credentials to user
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
      <View style={styles.innerContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Account Recovery</Text>
          <Text style={styles.subtitle}>Recover your journal access</Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={styles.question}>
              What is your favorite childhood pet's name?
            </Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Enter your answer"
                placeholderTextColor="#fff"
                value={securityAnswer}
                onChangeText={setSecurityAnswer}
                autoCapitalize="none"
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <TouchableOpacity style={styles.button} onPress={handleRecovery}>
            <Text style={styles.buttonText}>Recover Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
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
    backgroundColor: '#988686',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    // padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    // backgroundColor: 'white',
    // borderRadius: 20,
    padding: 24,
    // shadowColor: '#000',
    // shadowOffset: {
    //   width: 0,
    //   height: 4,
    // },
    // shadowOpacity: 0.1,
    // shadowRadius: 12,
    // elevation: 5,
  },
  inputContainer: {
    marginBottom: 24,
  },
  question: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputWrapper: {
    // backgroundColor: '#f8f9fa',
    // borderRadius: 12,
    borderBottomWidth: 1,
    borderColor: '#5C4E4E',
    marginVertical: 50,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#2d3436',
  },
  button: {
    backgroundColor: '#5C4E4E',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#988686',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  errorText: {
    color: '#ff6b6b',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
  },
});

export default ForgotPasswordScreen;