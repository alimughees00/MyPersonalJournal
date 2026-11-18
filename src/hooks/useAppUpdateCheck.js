/**
 * useAppUpdateCheck
 *
 * Checks whether a newer version of the app is available on the
 * Google Play Store (Android) or the Apple App Store (iOS).
 *
 * Strategy:
 *   Android – Scrape the Play Store HTML page for the current
 *             listed version and compare it with the installed version.
 *   iOS     – Use the public iTunes Lookup API (no auth required) to
 *             retrieve the latest App Store version string.
 *
 * When a newer version is detected, the hook provides a themed modal
 * via <UpdateModal /> with two actions:
 *   • "Not Now"    – dismisses the modal.
 *   • "Update Now" – opens the respective store listing directly.
 *
 * Usage:
 *   const { UpdateModal } = useAppUpdateCheck();
 *   // In JSX:
 *   <UpdateModal />
 */

import React, {useState, useEffect, useCallback} from 'react';
import {Linking, Platform} from 'react-native';
import DeviceInfo from 'react-native-device-info';
import CustomModal from '../components/CustomModal';

// ─── Store configuration ──────────────────────────────────────────────────────

/** Android package name as published on Google Play */
const ANDROID_PACKAGE_ID = 'com.baltorotech.myjournal';

/** iOS App Store numeric ID  ← replace with your real App Store ID if needed */
const IOS_APP_STORE_ID = '0000000000';

/** iOS Bundle Identifier (used for iTunes Lookup) */
const IOS_BUNDLE_ID = 'com.baltorotech.myjournal';

// ─── Store deep-link URLs ─────────────────────────────────────────────────────

const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

// market:// scheme opens Google Play directly; fall back to https for web
const PLAY_STORE_MARKET_URL = `market://details?id=${ANDROID_PACKAGE_ID}`;

const APP_STORE_URL = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compares two semver-ish version strings (e.g. "2.1.0" > "2.0.9").
 * Returns true when `remote` is strictly newer than `local`.
 */
const isNewerVersion = (local, remote) => {
  const toNumbers = v =>
    String(v)
      .split('.')
      .map(n => parseInt(n, 10) || 0);

  const [lParts, rParts] = [toNumbers(local), toNumbers(remote)];
  const len = Math.max(lParts.length, rParts.length);

  for (let i = 0; i < len; i++) {
    const l = lParts[i] ?? 0;
    const r = rParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false; // equal
};

/**
 * Fetches the latest Play Store version for the given package by
 * scraping the store page (no API key required).
 */
const fetchAndroidStoreVersion = async packageId => {
  const url = `https://play.google.com/store/apps/details?id=${packageId}&hl=en`;
  const html = await fetch(url, {
    headers: {
      // Identify as a standard browser to avoid bot-detection redirects
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
    },
  }).then(r => r.text());

  // The version string is embedded in a JSON-like data blob inside the HTML.
  const match = html.match(/\[\["(\d+\.\d+(?:\.\d+)*)"\]\]/);
  if (match?.[1]) return {version: match[1], storeUrl: PLAY_STORE_URL};

  const match2 = html.match(/\[\[\["(\d+\.\d+(?:\.\d+)*)"\]\]\]/);
  if (match2?.[1]) return {version: match2[1], storeUrl: PLAY_STORE_URL};

  // Fallback regex pattern (Google sometimes changes the HTML structure)
  const fallback = html.match(/Current Version.*?<\/span>.*?>([\d.]+)<\/span>/s);
  if (fallback?.[1]) return {version: fallback[1].trim(), storeUrl: PLAY_STORE_URL};

  throw new Error('Unable to parse Play Store version from HTML');
};

/**
 * Fetches the latest App Store version using the iTunes Lookup API.
 */
const fetchIOSStoreVersion = async bundleId => {
  const url = `https://itunes.apple.com/lookup?bundleId=${bundleId}&country=us`;
  const json = await fetch(url).then(r => r.json());

  const result = json?.results?.[0];
  if (!result?.version) throw new Error('iTunes Lookup returned no results');
  return {
    version: result.version,
    storeUrl:
      result.trackViewUrl ||
      (IOS_APP_STORE_ID !== '0000000000' ? APP_STORE_URL : null),
  };
};

// ─── Store URL opener ─────────────────────────────────────────────────────────

const openStoreURL = async customUrl => {
  if (customUrl) {
    try {
      await Linking.openURL(customUrl);
      return;
    } catch {
      // fallback to platform standard
    }
  }
  if (Platform.OS === 'android') {
    try {
      await Linking.openURL(PLAY_STORE_MARKET_URL);
    } catch {
      // market:// not available (emulator / no Play Store) → fall back to web
      await Linking.openURL(PLAY_STORE_URL);
    }
  } else if (IOS_APP_STORE_ID !== '0000000000') {
    await Linking.openURL(APP_STORE_URL);
  }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useAppUpdateCheck = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    version: '',
    storeUrl: null,
  });

  useEffect(() => {
    let cancelled = false;

    const checkForUpdate = async () => {
      try {
        const installedVersion = await DeviceInfo.getVersion();

        const storeInfo =
          Platform.OS === 'android'
            ? await fetchAndroidStoreVersion(ANDROID_PACKAGE_ID)
            : await fetchIOSStoreVersion(IOS_BUNDLE_ID);

        if (cancelled) return;

        if (
          storeInfo?.version &&
          isNewerVersion(installedVersion, storeInfo.version)
        ) {
          setUpdateInfo({
            version: storeInfo.version,
            storeUrl: storeInfo.storeUrl,
          });
          setModalVisible(true);
        }
      } catch (error) {
        // Silently swallow – update checks must never crash the app
        console.log('[useAppUpdateCheck] update check failed:', error?.message);
      }
    };

    checkForUpdate();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpdateNow = useCallback(() => {
    setModalVisible(false);
    openStoreURL(updateInfo.storeUrl);
  }, [updateInfo.storeUrl]);

  const handleDismiss = useCallback(() => {
    setModalVisible(false);
  }, []);

  const UpdateModal = useCallback(() => {
    const storeName =
      Platform.OS === 'android' ? 'Google Play Store' : 'App Store';

    return (
      <CustomModal
        visible={modalVisible}
        title="🚀 Update Available"
        message={`Version ${updateInfo.version} is now available on the ${storeName}. Update now to get the latest features and improvements!`}
        confirmText="Update Now"
        cancelText="Not Now"
        onConfirm={handleUpdateNow}
        onCancel={handleDismiss}
      />
    );
  }, [modalVisible, updateInfo.version, handleUpdateNow, handleDismiss]);

  return {
    isUpdateAvailable: modalVisible,
    updateInfo,
    modalVisible,
    setModalVisible,
    handleUpdateNow,
    handleDismiss,
    UpdateModal,
  };
};

export default useAppUpdateCheck;
