import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.wrap} accessibilityLabel="Fivondronana">
      <View style={[styles.mark, compact && styles.compactMark]}>
        <Text style={[styles.initial, compact && styles.compactInitial]}>F</Text>
      </View>
      {!compact && <Text style={styles.name}>FIVONDRONANA</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 },
  mark: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMark: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5 },
  initial: { color: colors.primary, fontSize: 36, fontWeight: '700' },
  compactInitial: { fontSize: 18 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 1.5 },
});
