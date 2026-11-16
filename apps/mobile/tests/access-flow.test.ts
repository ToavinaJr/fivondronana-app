import { describe, expect, test } from 'bun:test';
import { accessFlowReducer, initialAccessFlow } from '../src/access/access-flow';
import { validateEmail, validateLogin } from '../src/access/validation';

describe('access flow navigation', () => {
  test('moves from welcome to login and into password recovery', () => {
    const login = accessFlowReducer(initialAccessFlow, { type: 'OPEN_LOGIN' });
    const recovery = accessFlowReducer(login, { type: 'OPEN_RECOVERY' });
    expect(login.screen).toBe('login');
    expect(recovery.screen).toBe('recovery');
  });

  test('back returns from recovery to login and from login to welcome', () => {
    const login = accessFlowReducer({ screen: 'recovery' }, { type: 'BACK' });
    const welcome = accessFlowReducer(login, { type: 'BACK' });
    expect(login.screen).toBe('login');
    expect(welcome.screen).toBe('welcome');
  });
});

describe('access form validation', () => {
  test('requires an identifier and a password for login', () => {
    expect(validateLogin('', '')).toEqual({ identifier: 'required', password: 'required' });
    expect(validateLogin('  scout@example.org ', 'secret')).toEqual({});
  });

  test('accepts only a well-formed email for password recovery', () => {
    expect(validateEmail('')).toBe('required');
    expect(validateEmail('not-an-email')).toBe('invalid');
    expect(validateEmail(' scout@example.org ')).toBeUndefined();
  });
});
