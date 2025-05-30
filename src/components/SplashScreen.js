import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

const SplashScreen = ({ onFinish }) => {
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(-40);

  useEffect(() => {
    Animated.parallel([
      // Icon animation
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
      // Text animation
      Animated.sequence([
        Animated.delay(500), // Delay text animation start
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, { opacity: fadeAnim }]}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.text,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }],
          },
        ]}>
        Your Mind's Quiet Space
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#988686',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  text: {
    fontSize: 24,
    color: '#333',
    fontWeight: '500',
  },
});

export default SplashScreen;