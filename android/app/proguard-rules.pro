# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# React Native & JNI
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Async Storage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# React Native Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# React Native Device Info
-keep class com.learnium.RNDeviceInfo.** { *; }

# React Native Biometrics
-keep class com.rnbiometrics.** { *; }

# React Native FS
-keep class com.rnfs.** { *; }

# React Native Video / ExoPlayer / Media3
-keep class com.brentvatne.react.** { *; }
-keep class com.brentvatne.exoplayer.** { *; }
-dontwarn com.google.android.exoplayer2.**
-dontwarn androidx.media3.**

# Notifee
-keep class app.notifee.core.** { *; }

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
