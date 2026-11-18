import type { AlertButton } from 'react-native';

export function getSignOutConfirmation(onConfirm: () => void): {
  title: string;
  message: string;
  buttons: AlertButton[];
} {
  return {
    title: 'Hiala amin’ny kaonty?',
    message: 'Tena te hiala ve ianao? Mila miditra indray ianao raha hanohy.',
    buttons: [
      { text: 'Ajanona', style: 'cancel' },
      { text: 'Hiala', style: 'destructive', onPress: onConfirm },
    ],
  };
}
