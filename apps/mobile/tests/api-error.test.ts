import { describe, expect, test } from 'bun:test';
import { getApiErrorMessage } from '../src/access/api-errors';

describe('API error message handling', () => {
  test('returns a public message string from the standard error body', () => {
    expect(getApiErrorMessage({ code: 'UNAUTHORIZED', message: 'Session invalide.' }, 'Erreur inconnue.')).toBe(
      'Session invalide.',
    );
  });

  test('joins validation messages from the standard error body', () => {
    expect(
      getApiErrorMessage({ code: 'BAD_REQUEST', message: ['Email invalide.', 'Mot de passe requis.'] }, 'Erreur.'),
    ).toBe('Email invalide.\nMot de passe requis.');
  });

  test('uses the supplied fallback for missing or malformed messages', () => {
    expect(getApiErrorMessage({ message: [] }, 'Réessayez plus tard.')).toBe('Réessayez plus tard.');
    expect(getApiErrorMessage(null, 'Réessayez plus tard.')).toBe('Réessayez plus tard.');
  });
});
