import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.wrap} accessibilityLabel="FIVONDRONANA">
      <Text style={[styles.name, compact && styles.compactName]}>FIVONDRONANA</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  compactName: { fontSize: 13, letterSpacing: 0.2 },
});
