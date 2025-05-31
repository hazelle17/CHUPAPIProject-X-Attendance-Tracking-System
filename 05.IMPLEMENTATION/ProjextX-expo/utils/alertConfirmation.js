import { Alert, Platform } from 'react-native';

export const showConfirmation = ({ title, message, onConfirm }) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // For web platform, use the browser's confirm dialog
      const confirmed = window.confirm(message);
      if (confirmed) {
        onConfirm()
          .then(() => resolve(true))
          .catch((error) => {
            window.alert(error.message);
            resolve(false);
          });
      } else {
        resolve(false);
      }
    } else {
      // For native platforms, use React Native Alert
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false)
          },
          {
            text: 'Confirm',
            style: 'destructive',
            onPress: async () => {
              try {
                await onConfirm();
                resolve(true);
              } catch (error) {
                Alert.alert('Error', error.message);
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