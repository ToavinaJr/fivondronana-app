import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  type AuthSession,
  type CvActivity,
  type CvBranch,
  getMyCv,
  type PersonalCv,
  saveMyCv,
} from '../access/auth-api';
import { colors } from '../theme/tokens';
import { isCvDirty } from './cv-dirty';

const blankCv = (): PersonalCv => ({
  firstName: '',
  lastName: '',
  address: '',
  birthDate: '',
  birthPlace: null,
  phone: '',
  email: '',
  facebook: null,
  province: '',
  area: '',
  fivondronana: '',
  extraPersonal: [],
  extraContact: [],
  branches: [],
  activities: [],
});
const blankBranch = (): CvBranch => ({ name: '', group: '', project: '', startedAt: '', endedAt: '' });
const blankActivity = (): CvActivity => ({ name: '', responsibility: '', description: '', date: '' });

export function CvEditor({ session, onBack }: { session: AuthSession; onBack: () => void }) {
  const [cv, setCv] = useState<PersonalCv>(blankCv);
  const [extraPersonalIds, setExtraPersonalIds] = useState<string[]>([]);
  const [extraContactIds, setExtraContactIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const savedCv = useRef(blankCv());
  const nextExtraRowId = useRef(0);
  const createExtraRowId = useCallback(() => `extra-row-${nextExtraRowId.current++}`, []);
  useEffect(() => {
    let active = true;
    getMyCv(session.accessToken)
      .then((existing) => {
        if (active && existing) {
          const loadedCv = {
            ...blankCv(),
            ...existing,
            birthDate: existing.birthDate.slice(0, 10),
            branches: existing.branches.map((row) => ({
              ...row,
              startedAt: row.startedAt?.slice(0, 10) ?? '',
              endedAt: row.endedAt?.slice(0, 10) ?? '',
            })),
            activities: existing.activities.map((row) => ({ ...row, date: row.date?.slice(0, 10) ?? '' })),
          };
          savedCv.current = loadedCv;
          setCv(loadedCv);
          setExtraPersonalIds(existing.extraPersonal.map(createExtraRowId));
          setExtraContactIds(existing.extraContact.map(createExtraRowId));
        }
      })
      .catch((error: Error) => {
        if (active) setFeedback(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.accessToken, createExtraRowId]);
  const field = (key: keyof PersonalCv, value: string) => setCv((current) => ({ ...current, [key]: value }));
  const requestBack = () => {
    if (!isCvDirty(cv, savedCv.current)) {
      onBack();
      return;
    }
    Alert.alert('Mbola misy fanovana', 'Tsy mbola voatahiry ireo fanovana amin’ny CV. Hiala ihany ve ianao?', [
      { text: 'Tohizo ny fanovana', style: 'cancel' },
      { text: 'Hiala nefa tsy hitahiry', style: 'destructive', onPress: onBack },
    ]);
  };
  const updateRow = <T extends CvBranch | CvActivity>(
    key: 'branches' | 'activities',
    index: number,
    value: Partial<T>,
  ) =>
    setCv((current) => ({
      ...current,
      [key]: current[key].map((row, rowIndex) => (rowIndex === index ? { ...row, ...value } : row)),
    }));
  const save = async () => {
    setSaving(true);
    setFeedback('');
    const missing: string[] = [];
    if (!cv.firstName.trim()) missing.push('Anarana');
    if (!cv.lastName.trim()) missing.push('Fanampiny');
    if (!cv.address.trim()) missing.push('Adiresy');
    if (!cv.birthDate.trim() || Number.isNaN(Date.parse(cv.birthDate))) missing.push('Daty nahaterahana');
    if (!cv.phone.trim()) missing.push('Finday');
    if (!cv.email.trim()) missing.push('Mailaka');
    if (!cv.province.trim()) missing.push('Faritany');
    if (!cv.area.trim()) missing.push('Faritra');
    if (!cv.fivondronana.trim()) missing.push('Fivondronana');
    const incompleteBranch = cv.branches.some((row) => !row.name.trim() || !row.group.trim());
    if (missing.length || incompleteBranch) {
      setFeedback(
        `Fenoy ny saha tsy maintsy fenoina: ${missing.join(', ')}${incompleteBranch ? `${missing.length ? ', ' : ''}Anarana sy vondrona amin’ny sampana` : ''}.`,
      );
      setSaving(false);
      return;
    }
    try {
      const saved = await saveMyCv(session.accessToken, cv);
      savedCv.current = saved;
      setCv(saved);
      setFeedback('Voatahiry soa aman-tsara ny CV.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Tsy voatahiry ny CV.');
    } finally {
      setSaving(false);
    }
  };
  const exportPdf = async () => {
    setFeedback('');
    try {
      const html = cvHtml(cv);
      const file = await Print.printToFileAsync({ html, base64: false });
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: 'CV FIVONDRONANA' });
      else setFeedback('Vita ny PDF, fa tsy misy fizarana azo ampiasaina amin’ity fitaovana ity.');
    } catch {
      setFeedback('Tsy azo amboarina na zaraina ny PDF. Andramo indray.');
    }
  };
  if (loading)
    return (
      <EditorPage>
        <Text style={styles.help}>Mamaky ny CV…</Text>
      </EditorPage>
    );
  return (
    <EditorPage>
      <Pressable accessibilityRole="button" onPress={requestBack} style={styles.back}>
        <Text style={styles.link}>‹ Fikirana</Text>
      </Pressable>
      <Text style={styles.heading}>Ny CV-ko</Text>
      <Text style={styles.help}>Fenoy ireo saha misy *. Ny CV anao ihany no azonao ovaina.</Text>
      <Section title="Fampahafantarana ny tena">
        <Field label="Anarana *" value={cv.firstName} onChange={(v) => field('firstName', v)} />
        <Field label="Fanampiny *" value={cv.lastName} onChange={(v) => field('lastName', v)} />
        <Field label="Adiresy *" value={cv.address} onChange={(v) => field('address', v)} />
        <Field
          label="Daty nahaterahana * (YYYY-MM-DD)"
          value={cv.birthDate}
          onChange={(v) => field('birthDate', v)}
          keyboardType="numbers-and-punctuation"
        />
        <Field label="Toerana nahaterahana" value={cv.birthPlace ?? ''} onChange={(v) => field('birthPlace', v)} />
        {cv.extraPersonal.map((value, index) => (
          <Field
            key={extraPersonalIds[index]}
            label={`Fanampiny ${index + 1}`}
            value={value}
            onChange={(v) =>
              setCv((current) => ({
                ...current,
                extraPersonal: current.extraPersonal.map((item, i) => (i === index ? v : item)),
              }))
            }
          />
        ))}
        <AddButton
          label="+ Hanampy fampahafantarana"
          onPress={() => {
            setExtraPersonalIds((current) => [...current, createExtraRowId()]);
            setCv((current) => ({ ...current, extraPersonal: [...current.extraPersonal, ''] }));
          }}
        />
      </Section>
      <Section title="Fifandraisana">
        <Field label="Finday *" value={cv.phone} onChange={(v) => field('phone', v)} keyboardType="phone-pad" />
        <Field label="Mailaka *" value={cv.email} onChange={(v) => field('email', v)} keyboardType="email-address" />
        <Field label="Facebook" value={cv.facebook ?? ''} onChange={(v) => field('facebook', v)} />
        {cv.extraContact.map((value, index) => (
          <Field
            key={extraContactIds[index]}
            label={`Fifandraisana fanampiny ${index + 1}`}
            value={value}
            onChange={(v) =>
              setCv((current) => ({
                ...current,
                extraContact: current.extraContact.map((item, i) => (i === index ? v : item)),
              }))
            }
          />
        ))}
        <AddButton
          label="+ Hanampy fifandraisana"
          onPress={() => {
            setExtraContactIds((current) => [...current, createExtraRowId()]);
            setCv((current) => ({ ...current, extraContact: [...current.extraContact, ''] }));
          }}
        />
      </Section>
      <Section title="Fampahafantarana ny maha skoto">
        <Field label="Faritany *" value={cv.province} onChange={(v) => field('province', v)} />
        <Field label="Faritra *" value={cv.area} onChange={(v) => field('area', v)} />
        <Field label="Fivondronana *" value={cv.fivondronana} onChange={(v) => field('fivondronana', v)} />
      </Section>
      <Section title="Sampana">
        {cv.branches.map((row, index) => (
          <View key={row.id ?? `branch-${index}`} style={styles.repeat}>
            <Field
              label="Anarana *"
              value={row.name}
              onChange={(v) => updateRow<CvBranch>('branches', index, { name: v })}
            />
            <Field
              label="Vondrona *"
              value={row.group}
              onChange={(v) => updateRow<CvBranch>('branches', index, { group: v })}
            />
            <Field
              label="Tetikasa"
              value={row.project}
              onChange={(v) => updateRow<CvBranch>('branches', index, { project: v })}
            />
            <Field
              label="Daty nanombohana"
              value={row.startedAt}
              onChange={(v) => updateRow<CvBranch>('branches', index, { startedAt: v })}
            />
            <Field
              label="Daty namaranana"
              value={row.endedAt}
              onChange={(v) => updateRow<CvBranch>('branches', index, { endedAt: v })}
            />
            <RemoveButton
              onPress={() =>
                setCv((current) => ({ ...current, branches: current.branches.filter((_, i) => i !== index) }))
              }
            />
          </View>
        ))}
        <AddButton
          label="+ Hanampy sampana"
          onPress={() => setCv((current) => ({ ...current, branches: [...current.branches, blankBranch()] }))}
        />
      </Section>
      <Section title="Hetsika">
        {cv.activities.map((row, index) => (
          <View key={row.id ?? `activity-${index}`} style={styles.repeat}>
            <Field
              label="Anarana"
              value={row.name}
              onChange={(v) => updateRow<CvActivity>('activities', index, { name: v })}
            />
            <Field
              label="Andraikitra"
              value={row.responsibility}
              onChange={(v) => updateRow<CvActivity>('activities', index, { responsibility: v })}
            />
            <Field
              label="Famariparitana"
              value={row.description}
              onChange={(v) => updateRow<CvActivity>('activities', index, { description: v })}
            />
            <Field
              label="Daty"
              value={row.date}
              onChange={(v) => updateRow<CvActivity>('activities', index, { date: v })}
            />
            <RemoveButton
              onPress={() =>
                setCv((current) => ({ ...current, activities: current.activities.filter((_, i) => i !== index) }))
              }
            />
          </View>
        ))}
        <AddButton
          label="+ Hanampy hetsika"
          onPress={() => setCv((current) => ({ ...current, activities: [...current.activities, blankActivity()] }))}
        />
      </Section>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          void exportPdf();
        }}
        style={styles.export}
      >
        <Text style={styles.exportText}>Mamorona sy mizara PDF</Text>
      </Pressable>
      {feedback ? (
        <Text
          accessibilityRole="alert"
          style={feedback.startsWith('Voatahiry') || feedback.startsWith('Vita') ? styles.success : styles.error}
        >
          {feedback}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: saving }}
        disabled={saving}
        onPress={() => {
          void save();
        }}
        style={[styles.save, saving && styles.disabled]}
      >
        <Text style={styles.saveText}>{saving ? 'Tehirizina…' : 'Tehirizo ny CV'}</Text>
      </Pressable>
    </EditorPage>
  );
}

function EditorPage({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Field({
  label,
  value,
  onChange,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numbers-and-punctuation';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        placeholderTextColor={colors.secondary}
        style={styles.input}
      />
    </View>
  );
}
function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.add}>
      <Text style={styles.link}>{label}</Text>
    </Pressable>
  );
}
function RemoveButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.remove}>
      <Text style={styles.removeText}>Esory ity andalana ity</Text>
    </Pressable>
  );
}

function cvHtml(cv: PersonalCv): string {
  const escapeHtml = (value: string | null | undefined) =>
    (value ?? '').replace(
      /[&<>"']/g,
      (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character,
    );
  const row = (label: string, value: string | null | undefined) =>
    `<p><b>${escapeHtml(label)}:</b> ${escapeHtml(value)}</p>`;
  const branches = cv.branches
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)} · ${escapeHtml(item.group)}${item.project ? ` — ${escapeHtml(item.project)}` : ''}</li>`,
    )
    .join('');
  const activities = cv.activities
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)}${item.responsibility ? ` — ${escapeHtml(item.responsibility)}` : ''}${item.description ? `: ${escapeHtml(item.description)}` : ''}${item.date ? ` (${escapeHtml(item.date)})` : ''}</li>`,
    )
    .join('');
  const extraPersonal = cv.extraPersonal
    .filter(Boolean)
    .map((value, index) => row(`Fanampiny ${index + 1}`, value))
    .join('');
  const extraContact = cv.extraContact
    .filter(Boolean)
    .map((value, index) => row(`Fifandraisana fanampiny ${index + 1}`, value))
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#171717;padding:28px;line-height:1.45}h1{color:#B8170F;font-size:24px}h2{font-size:17px;border-bottom:1px solid #ddd;padding-bottom:5px;margin-top:22px}p,li{font-size:13px}</style></head><body><h1>FIVONDRONANA — CV</h1><h2>Fampahafantarana ny tena</h2>${row('Anarana', `${cv.firstName} ${cv.lastName}`)}${row('Adiresy', cv.address)}${row('Daty nahaterahana', cv.birthDate)}${row('Toerana nahaterahana', cv.birthPlace)}${extraPersonal}<h2>Fifandraisana</h2>${row('Finday', cv.phone)}${row('Mailaka', cv.email)}${row('Facebook', cv.facebook)}${extraContact}<h2>Fampahafantarana ny maha skoto</h2>${row('Faritany', cv.province)}${row('Faritra', cv.area)}${row('Fivondronana', cv.fivondronana)}<h2>Sampana</h2><ul>${branches}</ul><h2>Hetsika</h2><ul>${activities}</ul></body></html>`;
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 36 },
  back: { minHeight: 42, justifyContent: 'center' },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  heading: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 5 },
  help: { color: colors.secondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  section: { marginTop: 17, paddingBottom: 14, borderBottomWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 17, marginBottom: 11 },
  field: { marginBottom: 10 },
  label: { color: colors.text, fontSize: 14, marginBottom: 5 },
  input: {
    minHeight: 46,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 16,
  },
  add: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingRight: 12 },
  repeat: { marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderColor: colors.border },
  remove: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center' },
  removeText: { color: colors.error, fontWeight: '600', fontSize: 13 },
  export: {
    minHeight: 46,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  save: {
    minHeight: 50,
    marginTop: 10,
    borderRadius: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  error: { color: colors.error, marginTop: 14, lineHeight: 20 },
  success: { color: colors.accent, marginTop: 14, lineHeight: 20 },
});
