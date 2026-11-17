export type AccessScreen = 'welcome' | 'login' | 'recovery';
export type AccessFlowState = { screen: AccessScreen };
export type AccessFlowAction = { type: 'OPEN_LOGIN' } | { type: 'OPEN_RECOVERY' } | { type: 'BACK' } | { type: 'RESET' };

export const initialAccessFlow: AccessFlowState = { screen: 'welcome' };

export function accessFlowReducer(state: AccessFlowState, action: AccessFlowAction): AccessFlowState {
  if (action.type === 'RESET') return initialAccessFlow;
  if (action.type === 'OPEN_LOGIN') return { screen: 'login' };
  if (action.type === 'OPEN_RECOVERY' && state.screen === 'login') return { screen: 'recovery' };
  if (action.type === 'BACK') {
    if (state.screen === 'recovery') return { screen: 'login' };
    if (state.screen === 'login') return { screen: 'welcome' };
  }
  return state;
}
