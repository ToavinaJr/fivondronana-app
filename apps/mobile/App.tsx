import { useEffect, useState } from 'react';
import { BackHandler, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { accessFlowReducer, initialAccessFlow } from './src/access/access-flow';
import { AuthSession, login, logout } from './src/access/auth-api';
import { getCurrentUser } from './src/access/auth-api';
import { endSession, restoreSession } from './src/access/session';
import { sessionStore } from './src/access/session-store';
import { LoginScreen, RecoveryScreen, WelcomeScreen } from './src/access/AccessScreens';
import { MainShell } from './src/main/MainShell';
import { colors } from './src/theme/tokens';

export default function App() {
  const [flow, dispatch] = useState(initialAccessFlow);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    let active = true;
    void restoreSession(sessionStore, getCurrentUser)
      .then((restored) => { if (active) setSession(restored); })
      .catch(() => { if (active) dispatch({ screen: 'welcome' }); })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

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
    await sessionStore.write(authenticatedSession.accessToken);
    setSession(authenticatedSession);
  };

  const signOut = async () => {
    const token = session?.accessToken ?? null;
    setSession(null);
    dispatch(initialAccessFlow);
    await endSession(sessionStore, token, logout);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.page }}>
        <StatusBar barStyle="dark-content" />
        {!restoring && session ? <MainShell session={session} onSignOut={() => { void signOut(); }} /> : null}
        {!restoring && !session && flow.screen === 'welcome' ? <WelcomeScreen onLogin={() => dispatch((current) => accessFlowReducer(current, { type: 'OPEN_LOGIN' }))} /> : null}
        {!restoring && !session && flow.screen === 'login' ? <LoginScreen onBack={() => dispatch((current) => accessFlowReducer(current, { type: 'BACK' }))} onRecovery={() => dispatch((current) => accessFlowReducer(current, { type: 'OPEN_RECOVERY' }))} onAuthenticate={authenticate} /> : null}
        {!restoring && !session && flow.screen === 'recovery' ? <RecoveryScreen onBack={() => dispatch((current) => accessFlowReducer(current, { type: 'BACK' }))} /> : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
