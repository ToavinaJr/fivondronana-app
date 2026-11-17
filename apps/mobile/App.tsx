import { useEffect, useState } from 'react';
import { BackHandler, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { accessFlowReducer, initialAccessFlow } from './src/access/access-flow';
import { AuthSession, login, logout } from './src/access/auth-api';
import { LoginScreen, RecoveryScreen, WelcomeScreen } from './src/access/AccessScreens';
import { MainShell } from './src/main/MainShell';
import { colors } from './src/theme/tokens';

export default function App() {
  const [flow, dispatch] = useState(initialAccessFlow);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (session || flow.screen === 'welcome') return false;
      dispatch((current) => accessFlowReducer(current, { type: 'BACK' }));
      return true;
    });
    return () => subscription.remove();
  }, [flow.screen, session]);

  const authenticate = async (identifier: string, password: string) => {
    const authenticatedSession = await login(identifier, password);
    setSession(authenticatedSession);
  };

  const signOut = async () => {
    if (session) await logout(session.accessToken);
    setSession(null);
    dispatch(initialAccessFlow);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.page }}>
        <StatusBar barStyle="dark-content" />
        {session ? <MainShell session={session} onSignOut={() => { void signOut(); }} /> : null}
        {!session && flow.screen === 'welcome' ? <WelcomeScreen onLogin={() => dispatch((current) => accessFlowReducer(current, { type: 'OPEN_LOGIN' }))} /> : null}
        {!session && flow.screen === 'login' ? <LoginScreen onBack={() => dispatch((current) => accessFlowReducer(current, { type: 'BACK' }))} onRecovery={() => dispatch((current) => accessFlowReducer(current, { type: 'OPEN_RECOVERY' }))} onAuthenticate={authenticate} /> : null}
        {!session && flow.screen === 'recovery' ? <RecoveryScreen onBack={() => dispatch((current) => accessFlowReducer(current, { type: 'BACK' }))} /> : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
