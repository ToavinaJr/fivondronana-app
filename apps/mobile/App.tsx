import { StatusBar, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>FIVONDRONANA</Text>
      <Text style={styles.title}>Tongasoa</Text>
      <Text style={styles.description}>
        Sehatra ho an’ny mpiandraikitra.
      </Text>
      <Text style={styles.action}>HIDITRA</Text>
      <Text style={styles.note}>
        Fototra fanombohana ihany ity efijery ity. Tsy mbola ampifandraisina amin’ny API ny fidirana.
      </Text>
      <StatusBar barStyle="dark-content" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#f7f5ee',
  },
  brand: {
    color: '#526442',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
  },
  title: {
    marginTop: 28,
    color: '#242820',
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    marginTop: 10,
    color: '#5d6258',
    fontSize: 16,
    textAlign: 'center',
  },
  action: {
    marginTop: 36,
    overflow: 'hidden',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#526442',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  note: {
    marginTop: 20,
    color: '#74786f',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
