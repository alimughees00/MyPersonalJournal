import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from "react-native-responsive-screen";
import Icon from 'react-native-vector-icons/MaterialIcons';

const SplashScreen = ({ onFinish }) => {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);
  const textAnim = new Animated.Value(hp(5));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(textAnim, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(onFinish, 1000);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.iconContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <Icon name="book" size={hp(15)} color="#FFFFFF" />
      </Animated.View>
      <Animated.Text
        style={[
          styles.text,
          {
            opacity: fadeAnim,
            transform: [{ translateY: textAnim }],
          },
        ]}>
        My Journal
      </Animated.Text>
      <Animated.Text
        style={[
          styles.subtext,
          {
            opacity: fadeAnim,
            transform: [{ translateY: textAnim }],
          },
        ]}>
        Your personal space for thoughts
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#5C4E4E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: hp(2),
  },
  text: {
    fontSize: hp(4),
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: hp(1),
  },
  subtext: {
    fontSize: hp(2.2),
    color: '#FFFFFF',
    opacity: 0.8,
  },
});

export default SplashScreen;