import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Image, Easing} from 'react-native';
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';

const SplashScreen = ({onFinish}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.75)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(hp(3))).current;
  const ringScale = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(hp(4))).current;

  useEffect(() => {
    // Ring pulse loop
    const pulseRing = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 1.25,
            duration: 1400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ringScale, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.6,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => pulseRing());
    };

    // Main entrance
    Animated.sequence([
      // Card slides up
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Icon pops in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]),
      // Text fades up
      Animated.parallel([
        Animated.timing(textFade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(textSlide, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      pulseRing();
      setTimeout(onFinish, 1400);
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Ambient blobs */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <Animated.View
        style={[
          styles.card,
          {
            opacity: cardFade,
            transform: [{translateY: cardSlide}],
          },
        ]}>
        {/* Pulse ring behind icon */}
        <View style={styles.ringWrapper}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                opacity: ringOpacity,
                transform: [{scale: ringScale}],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.iconCircle,
              {
                opacity: fadeAnim,
                transform: [{scale: scaleAnim}],
              },
            ]}>
            <Image
              source={require('../assets/my-journal.png')}
              style={styles.icon}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Text */}
        <Animated.View
          style={{
            opacity: textFade,
            transform: [{translateY: textSlide}],
            alignItems: 'center',
          }}>
          <Animated.Text style={styles.title}>My Journal</Animated.Text>
          <Animated.Text style={styles.subtext}>
            Your personal space for thoughts
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EBF8',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Decorative ambient blobs
  blobTop: {
    position: 'absolute',
    top: -hp(10),
    right: -wp(15),
    width: wp(70),
    height: wp(70),
    borderRadius: wp(35),
    backgroundColor: '#D8C4F0',
    opacity: 0.5,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -hp(8),
    left: -wp(20),
    width: wp(65),
    height: wp(65),
    borderRadius: wp(32),
    backgroundColor: '#C9B8E8',
    opacity: 0.35,
  },

  // Main card
  card: {
    backgroundColor: '#FFFFFFEE',
    borderRadius: wp(7),
    paddingVertical: hp(6),
    paddingHorizontal: wp(10),
    alignItems: 'center',
    width: wp(78),
    // Layered shadow for depth
    shadowColor: '#7B3FC4',
    shadowOffset: {width: 0, height: hp(1.5)},
    shadowOpacity: 0.18,
    shadowRadius: wp(6),
    elevation: 12,
    // Subtle inner border
    borderWidth: 1,
    borderColor: '#E8D9F7',
  },

  // Ring + icon layout
  ringWrapper: {
    width: hp(28),
    height: hp(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2.5),
  },
  pulseRing: {
    position: 'absolute',
    width: hp(27),
    height: hp(27),
    borderRadius: hp(13.5),
    borderWidth: 2.5,
    borderColor: '#9B59D4',
    backgroundColor: 'transparent',
  },
  iconCircle: {
    width: hp(23),
    height: hp(23),
    borderRadius: hp(11.5),
    backgroundColor: '#F7F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#9B59D4',
    shadowOffset: {width: 0, height: hp(0.5)},
    shadowOpacity: 0.2,
    shadowRadius: wp(3),
    elevation: 5,
  },
  icon: {
    width: hp(19),
    height: hp(19),
  },

  // Divider
  divider: {
    width: wp(30),
    height: 1.5,
    backgroundColor: '#D4B8ED',
    borderRadius: 2,
    marginBottom: hp(2.5),
    opacity: 0.7,
  },

  // Text
  title: {
    fontSize: hp(3.2),
    color: '#4A1D8A',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.5,
    marginBottom: hp(0.8),
  },
  subtext: {
    fontSize: hp(1.9),
    color: '#7B5EA7',
    fontFamily: 'Inter-Bold',
    letterSpacing: 0.3,
    textAlign: 'center',
    opacity: 0.85,
  },
});

export default SplashScreen;
