import { useEffect, useState } from 'react';
import { BackHandler, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { accessFlowReducer, initialAccessFlow } from './src/access/access-flow';
import { AuthSession, getCurrentUser, login, logout, refreshSession } from './src/access/auth-api';
import { endSession, restoreSession, SessionExpiredError } from './src/access/session';
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
    void restoreSession(sessionStore, getCurrentUser, refreshSession)
      .then((restored) => { if (active) setSession(restored); })
      .catch(() => { if (active) dispatch({ screen: 'welcome' }); })
      .finally(() => { if (active) setRestoring(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!session) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const renew = async () => {
      try {
        const renewed = await refreshSession(session.refreshToken);
        await Promise.all([sessionStore.write(renewed.accessToken), sessionStore.writeRefreshToken(renewed.refreshToken)]);
        if (active) setSession(renewed);
      } catch (error) {
        if (error instanceof SessionExpiredError) {
          await sessionStore.clear();
          if (active) {
            setSession(null);
            dispatch(initialAccessFlow);
          }
          return;
        }
        if (active) timer = setTimeout(() => { void renew(); }, 30_000);
      }
    };
    timer = setTimeout(() => { void renew(); }, Math.max(1_000, (session.expiresIn - 60) * 1_000));
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [session]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (session || flow.screen === 'welcome') return false;
      dispatch((current) => accessFlowReducer(current, { type: 'BACK' }));
      return true;
    });
    return () => subscription.remove();
  }, [flow.screen, session]);

  const authenticate = async (identifier: string, password: string, rememberMe: boolean) => {
    const authenticatedSession = await login(identifier, password, rememberMe);
    try {
      await Promise.all([
        sessionStore.write(authenticatedSession.accessToken),
        sessionStore.writeRefreshToken(authenticatedSession.refreshToken),
      ]);
    } catch (error) {
      await sessionStore.clear();
      throw error;
    }
    setSession(authenticatedSession);
  };

  const signOut = async () => {
    const token = session?.refreshToken ?? null;
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
