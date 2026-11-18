import { Image, StyleSheet } from 'react-native';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Image
      source={require('../assets/vonenina-logo.jpeg')}
      accessibilityLabel="Vonenina Mampiray"
      resizeMode="contain"
      style={compact ? styles.compact : styles.logo}
    />
  );
}

const styles = StyleSheet.create({
  logo: { width: 176, height: 176 },
  compact: { width: 48, height: 48 },
});
