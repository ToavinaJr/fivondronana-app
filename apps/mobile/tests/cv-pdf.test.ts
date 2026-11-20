import { describe, expect, it } from 'bun:test';
import type { PersonalCv } from '../src/access/auth-api';
import { createCvCollectionHtml, createCvHtml } from '../src/main/cv-pdf';

const cv: PersonalCv = {
  firstName: 'Soa <script>alert("x")</script>',
  lastName: 'Rasoa & Co',
  address: 'Antananarivo',
  birthDate: '2000-02-29',
  birthPlace: null,
  phone: '0340000000',
  email: 'soa@example.com',
  facebook: null,
  province: 'Antananarivo',
  area: 'Analamanga',
  fivondronana: 'FIVONDRONANA',
  extraPersonal: ['Mpiandraikitra'],
  extraContact: [],
  branches: [{ name: 'Mpanazava', group: 'Maitso', project: 'Tetikasa', startedAt: '', endedAt: '' }],
  activities: [
    {
      name: 'Lasy',
      responsibility: 'Mpitarika',
      description: 'Fampiofanana miaraka amin’ny ankizy',
      date: '2024-06-01',
    },
  ],
};

describe('CV PDF HTML generation', () => {
  it('escapes user supplied HTML and preserves Malagasy and section content', () => {
    const html = createCvHtml(cv);

    expect(html).toContain('Soa &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).toContain('Rasoa &amp; Co');
    expect(html).toContain('Mpanazava');
    expect(html).toContain('Fampiofanana');
    expect(html).toContain('miaraka amin’ny ankizy');
    expect(html).toContain('FIVONDRONANA');
    expect(html).not.toContain('<script>');
  });

  it('renders optional fields safely when they are empty', () => {
    const html = createCvHtml({ ...cv, extraPersonal: [''], extraContact: [''], branches: [], activities: [] });

    expect(html).toContain('<ul></ul>');
    expect(html).not.toContain('Fanampiny 1:</p>');
    expect(html).not.toContain('Fifandraisana fanampiny 1:</p>');
  });

  it('labels Tily and Mpanazava templates and combines every CV into separate PDF pages', () => {
    const tily = { ...cv, firstName: 'Tiana', template: 'Tily' as const };
    const mpanazava = { ...cv, firstName: 'Mamy', template: 'Mpanazava' as const };
    const html = createCvCollectionHtml([tily, mpanazava]);
    expect(createCvHtml(tily)).toContain('FIVONDRONANA — Tily — CV');
    expect(html.match(/class="cv-page"/g)).toHaveLength(2);
    expect(html).toContain('FIVONDRONANA — Mpanazava — CV');
  });
});
