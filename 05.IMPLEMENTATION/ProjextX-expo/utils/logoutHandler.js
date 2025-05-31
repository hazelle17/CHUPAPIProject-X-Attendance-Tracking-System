import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import API_BASE_URL from '../config/apiConfig';
import { router } from 'expo-router';

export const handleLogout = async (userData, navigation) => {
  try {
    // Get the user token
    const userToken = await AsyncStorage.getItem('userToken');
    
    // Try to log the logout event on the server
    if (userToken) {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userData?.id || userData?._id,
            role: userData?.role,
            timestamp: new Date().toISOString()
          })
        });
      } catch (error) {
        console.log('Error logging logout on server:', error);
        // Continue with logout even if server logging fails
      }
    }

    // Clear all app data from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys);
    
    // Clear any stored class or attendance data
    await AsyncStorage.removeItem('currentClass');
    await AsyncStorage.removeItem('lecturerData');
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    
    // Log the successful data clearance
    console.log('All user data cleared from storage');
    
    // Use router.replace to ensure proper navigation reset
    router.replace('/');

    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    throw new Error('Logout failed: ' + error.message);
  }
};

export const showLogoutConfirmation = (userData, navigation) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // For web platform, use the browser's confirm dialog
      const confirmed = window.confirm('Are you sure you want to logout? This will clear all your local data.');
      if (confirmed) {
        handleLogout(userData, navigation)
          .then(() => {
            resolve(true);
            // Ensure we're redirecting to login
            router.replace('/');
          })
          .catch((error) => {
            window.alert('Logout Failed: ' + error.message);
            resolve(false);
          });
      } else {
        resolve(false);
      }
    } else {
      // For native platforms, use React Native Alert
      Alert.alert(
        'Logout Confirmation',
        'Are you sure you want to logout? This will clear all your local data.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              try {
                await handleLogout(userData, navigation);
                resolve(true);
                // Ensure we're redirecting to login
                router.replace('/');
              } catch (error) {
                Alert.alert('Logout Failed', error.message);
                resolve(false);
              }
            }
          }
        ],
        { cancelable: true }
      );
    }
  });
}; 