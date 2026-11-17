import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Brand } from './Brand';
import { validateEmail, validateLogin } from './validation';
import { colors } from '../theme/tokens';

type WelcomeProps = { onLogin: () => void };
type LoginProps = {
  onRecovery: () => void;
  onBack: () => void;
  onAuthenticate: (identifier: string, password: string) => Promise<void>;
};
type RecoveryProps = { onBack: () => void };

function ActionButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function Notice({ children }: { children: string }) {
  return (
    <Text accessibilityRole="alert" style={styles.notice}>
      {children}
    </Text>
  );
}

export function WelcomeScreen({ onLogin }: WelcomeProps) {
  return (
    <View style={styles.welcome}>
      <View style={styles.welcomeMain}>
        <Brand />
        <Text style={styles.welcomeTitle}>Vonenina Mampiray</Text>
        <Text style={styles.quote}>“Fa asan’ny tànany isika, voaforona tao amin’i Kristy Jesosy hanao asa tsara.”</Text>
        <Text style={styles.reference}>Efesiana 2:10</Text>
        <View style={styles.welcomeButton}>
          <ActionButton label="Hiditra" onPress={onLogin} />
        </View>
      </View>
      <Text style={styles.footer}>FIVONDRONANA · MPIANDRAIKITRA</Text>
    </View>
  );
}

export function LoginScreen({ onRecovery, onBack, onAuthenticate }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<{ identifier?: boolean; password?: boolean }>({});
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    const validation = validateLogin(identifier, password);
    setErrors({ identifier: validation.identifier === 'required', password: validation.password === 'required' });
    setNotice('');
    if (Object.keys(validation).length) return;
    setIsSubmitting(true);
    try {
      await onAuthenticate(identifier.trim(), password);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Tsy tontosa ny fidirana.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Hiverina" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
          <Text style={styles.backLabel}>Hiverina</Text>
        </Pressable>
        <Text style={styles.title}>Hiditra</Text>
        <View style={styles.formBrand}>
          <Brand compact />
        </View>
        <Text style={styles.label}>Mailaka na laharana finday</Text>
        <TextInput
          accessibilityLabel="Mailaka na laharana finday"
          autoCapitalize="none"
          autoComplete="username"
          keyboardType="email-address"
          onChangeText={(value) => {
            setIdentifier(value);
            setErrors((current) => ({ ...current, identifier: false }));
            setNotice('');
          }}
          placeholder="Mailaka na laharana finday"
          placeholderTextColor={colors.secondary}
          style={[styles.input, errors.identifier && styles.inputError]}
          value={identifier}
        />
        {errors.identifier && <Text style={styles.errorText}>Ampidiro ny mailaka na laharana finday.</Text>}
        <Text style={[styles.label, styles.passwordLabel]}>Teny miafina</Text>
        <View style={[styles.passwordRow, errors.password && styles.inputError]}>
          <TextInput
            accessibilityLabel="Teny miafina"
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={(value) => {
              setPassword(value);
              setErrors((current) => ({ ...current, password: false }));
              setNotice('');
            }}
            placeholder="Teny miafina"
            placeholderTextColor={colors.secondary}
            secureTextEntry={!showPassword}
            style={styles.passwordInput}
            value={password}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Afeno ny teny miafina' : 'Asehoy ny teny miafina'}
            onPress={() => setShowPassword((value) => !value)}
            hitSlop={8}
          >
            <Text style={styles.showPassword}>{showPassword ? 'Afeno' : 'Asehoy'}</Text>
          </Pressable>
        </View>
        {errors.password && <Text style={styles.errorText}>Ampidiro ny teny miafina.</Text>}
        <View style={styles.optionsRow}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
            onPress={() => setRemember((value) => !value)}
            style={styles.remember}
          >
            <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
              {remember && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberText}>Tsarovy aho</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onRecovery} style={styles.recoveryLink}>
            <Text style={styles.link}>Hadino ny teny miafina?</Text>
          </Pressable>
        </View>
        {notice ? <Notice>{notice}</Notice> : null}
        <ActionButton
          label={isSubmitting ? 'Miditra…' : 'Hiditra'}
          onPress={() => {
            void submit();
          }}
          disabled={isSubmitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function RecoveryScreen({ onBack }: RecoveryProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<'required' | 'invalid'>();
  const [notice, setNotice] = useState('');
  const submit = () => {
    const validation = validateEmail(email);
    setError(validation);
    setNotice(validation ? '' : 'Tsy mbola misy ny fanarenana teny miafina. Mifandraisa amin’ny mpitantana.');
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Hiverina" onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
          <Text style={styles.backLabel}>Hiverina</Text>
        </Pressable>
        <Text style={styles.title}>Teny miafina adino</Text>
        <Text style={styles.description}>Ampidiro ny adiresy mailaka nampiasaina tamin’ny kaontinao.</Text>
        <Text style={styles.label}>Mailaka</Text>
        <TextInput
          accessibilityLabel="Mailaka"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={(value) => {
            setEmail(value);
            setError(undefined);
            setNotice('');
          }}
          placeholder="anarana@ohatra.mg"
          placeholderTextColor={colors.secondary}
          style={[styles.input, error && styles.inputError]}
          value={email}
        />
        {error && (
          <Text style={styles.errorText}>
            {error === 'required' ? 'Ampidiro ny mailaka.' : 'Hamarino ny endriky ny mailaka.'}
          </Text>
        )}
        {notice ? <Notice>{notice}</Notice> : null}
        <View style={styles.recoveryButton}>
          <ActionButton label="Alefa" onPress={submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.page },
  welcome: {
    flex: 1,
    backgroundColor: colors.page,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  welcomeMain: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcomeTitle: { marginTop: 24, color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  quote: { maxWidth: 340, marginTop: 16, color: colors.secondary, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  reference: { marginTop: 8, color: colors.secondary, fontSize: 14 },
  welcomeButton: { alignSelf: 'stretch', marginTop: 32 },
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.58 },
  buttonText: { color: colors.onPrimary, fontWeight: '600', fontSize: 15 },
  footer: { color: colors.secondary, fontSize: 11, textAlign: 'center' },
  formPage: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 32 },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8 },
  backText: { color: colors.primary, fontSize: 34, lineHeight: 38 },
  backLabel: { color: colors.secondary, fontSize: 14 },
  title: { marginTop: 16, marginBottom: 24, color: colors.text, fontSize: 24, fontWeight: '700' },
  formBrand: { alignItems: 'center', marginBottom: 24 },
  label: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    color: colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: colors.error },
  passwordLabel: { marginTop: 20 },
  passwordRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  passwordInput: { flex: 1, paddingVertical: 12, color: colors.text, fontSize: 16 },
  showPassword: { color: colors.primary, fontSize: 12, fontWeight: '600', paddingVertical: 12, paddingHorizontal: 4 },
  optionsRow: {
    marginTop: 18,
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  remember: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { borderColor: colors.primary, backgroundColor: colors.primary },
  checkmark: { color: colors.onPrimary, fontSize: 14, lineHeight: 16, fontWeight: '700' },
  rememberText: { color: colors.secondary, fontSize: 13 },
  recoveryLink: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  description: { marginTop: -8, marginBottom: 24, color: colors.secondary, fontSize: 15, lineHeight: 22 },
  errorText: { color: colors.error, fontSize: 13, marginTop: 6 },
  notice: {
    marginBottom: 18,
    padding: 12,
    backgroundColor: colors.errorSurface,
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
    borderRadius: 8,
  },
  recoveryButton: { marginTop: 28 },
});
