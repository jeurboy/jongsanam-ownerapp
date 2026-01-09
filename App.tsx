/**
 * Jong Court Owner App - Tablet Optimized
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BootSplash from 'react-native-bootsplash';
import crashlytics from '@react-native-firebase/crashlytics';

import Orientation from 'react-native-orientation-locker';
import { isTablet } from './src/utils/responsive';

function App() {
  React.useEffect(() => {
    // Only lock to landscape on tablets, allow portrait on phones
    if (isTablet()) {
      Orientation.lockToLandscape();
    } else {
      Orientation.unlockAllOrientations();
    }

    const init = async () => {
      await crashlytics().setCrashlyticsCollectionEnabled(true);
    };

    init().finally(async () => {
      await BootSplash.hide({ fade: true });
      console.log('BootSplash has been hidden successfully');
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar
          hidden={true}
          translucent={true}
          backgroundColor="transparent"
        />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
