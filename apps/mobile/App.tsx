import { useEffect, useReducer } from 'react';
import { BackHandler, StatusBar } from 'react-native';
import { accessFlowReducer, initialAccessFlow } from './src/access/access-flow';
import { LoginScreen, RecoveryScreen, WelcomeScreen } from './src/access/AccessScreens';
import { colors } from './src/theme/tokens';

export default function App() {
  const [flow, dispatch] = useReducer(accessFlowReducer, initialAccessFlow);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (flow.screen === 'welcome') return false;
      dispatch({ type: 'BACK' });
      return true;
    });
    return () => subscription.remove();
  }, [flow.screen]);

  const screenProps = {
    onLogin: () => dispatch({ type: 'OPEN_LOGIN' }),
    onRecovery: () => dispatch({ type: 'OPEN_RECOVERY' }),
    onBack: () => dispatch({ type: 'BACK' }),
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      {flow.screen === 'welcome' ? <WelcomeScreen {...screenProps} /> : null}
      {flow.screen === 'login' ? <LoginScreen {...screenProps} /> : null}
      {flow.screen === 'recovery' ? <RecoveryScreen {...screenProps} /> : null}
    </>
  );
}
