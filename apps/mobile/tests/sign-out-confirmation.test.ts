import { describe, expect, test } from 'bun:test';
import { getSignOutConfirmation } from '../src/main/sign-out-confirmation';

describe('voluntary sign out', () => {
  test('opening and cancelling the confirmation keeps the session', () => {
    let calls = 0;
    const confirmation = getSignOutConfirmation(() => calls++);
    expect(calls).toBe(0);
    confirmation.buttons.find((button) => button.style === 'cancel')?.onPress?.();
    expect(calls).toBe(0);
  });

  test('confirming invokes the existing sign-out callback', () => {
    let calls = 0;
    const confirmation = getSignOutConfirmation(() => calls++);
    confirmation.buttons.find((button) => button.style === 'destructive')?.onPress?.();
    expect(calls).toBe(1);
  });
});
