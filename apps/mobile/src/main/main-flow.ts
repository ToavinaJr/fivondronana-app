export type MainTab = 'archives' | 'leaders' | 'messages' | 'contacts' | 'settings';
export type MainDetail = { type: 'cv'; leaderId: string } | { type: 'notifications' };
export type MainFlowState = { tab: MainTab; detail?: MainDetail };
export type MainFlowAction =
  | { type: 'SELECT_TAB'; tab: MainTab }
  | { type: 'OPEN_CV'; leaderId: string }
  | { type: 'OPEN_NOTIFICATIONS' }
  | { type: 'BACK' };

export const initialMainFlow: MainFlowState = { tab: 'archives' };

export function mainFlowReducer(state: MainFlowState, action: MainFlowAction): MainFlowState {
  switch (action.type) {
    case 'SELECT_TAB': return { tab: action.tab };
    case 'OPEN_CV': return { ...state, detail: { type: 'cv', leaderId: action.leaderId } };
    case 'OPEN_NOTIFICATIONS': return { ...state, detail: { type: 'notifications' } };
    case 'BACK': return state.detail ? { tab: state.tab } : state;
  }
}
