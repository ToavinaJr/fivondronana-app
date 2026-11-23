import RNDateTimePicker from '@react-native-community/datetimepicker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  type AuthSession,
  type CvActivity,
  type CvBranch,
  type CvExtraField,
  getMyCv,
  type PersonalCv,
  saveMyCv,
} from '../access/auth-api';
import { BrandIcon } from '../access/BrandIcon';
import { colors } from '../theme/tokens';
import { isCvDirty } from './cv-dirty';
import { createCvHtml } from './cv-pdf';
import { validateCv } from './cv-validation';

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
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
  const field = (key: keyof PersonalCv, value: string) => {
    setCv((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
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
  ) => {
    setCv((current) => ({
      ...current,
      [key]: current[key].map((row, rowIndex) => (rowIndex === index ? { ...row, ...value } : row)),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      for (const property of Object.keys(value)) delete next[`${key}.${index}.${property}`];
      return next;
    });
  };
  const save = async () => {
    setSaving(true);
    setFeedback('');
    const errors = validateCv(cv);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFeedback('Hamarino ireo saha voamarika etsy ambany.');
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
      const html = createCvHtml(cv);
      const printed = await Print.printToFileAsync({ html, base64: false });
      const bytes = new Uint8Array(await (await fetch(printed.uri)).arrayBuffer());
      const shareableFile = new File(Paths.cache, `cv-${Date.now()}.pdf`);
      await shareableFile.write(bytes);
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(shareableFile.uri, { mimeType: 'application/pdf', dialogTitle: 'CV FIVONDRONANA' });
      else setFeedback('Vita ny PDF, fa tsy misy fizarana azo ampiasaina amin’ity fitaovana ity.');
    } catch (error) {
      console.error('CV PDF export failed', error);
      const detail = error instanceof Error ? error.message : String(error);
      setFeedback(`Tsy azo amboarina na zaraina ny PDF. Andramo indray. (${detail})`);
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
        <View style={styles.backContent}>
          <BrandIcon name="back" size={18} />
          <Text style={styles.link}>Fikirana</Text>
        </View>
      </Pressable>
      <Text style={styles.heading}>Ny CV-ko</Text>
      <Text style={styles.help}>Fenoy ireo saha misy *. Ny CV anao ihany no azonao ovaina.</Text>
      <Section title="Fampahafantarana ny tena">
        <Field
          label="Anarana *"
          value={cv.firstName}
          onChange={(v) => field('firstName', v)}
          error={fieldErrors.firstName}
        />
        <Field
          label="Fanampiny *"
          value={cv.lastName}
          onChange={(v) => field('lastName', v)}
          error={fieldErrors.lastName}
        />
        <Field label="Adiresy *" value={cv.address} onChange={(v) => field('address', v)} error={fieldErrors.address} />
        <DateField
          label="Daty nahaterahana *"
          value={cv.birthDate}
          onChange={(v) => field('birthDate', v)}
          error={fieldErrors.birthDate}
        />
        <Field label="Toerana nahaterahana" value={cv.birthPlace ?? ''} onChange={(v) => field('birthPlace', v)} />
        {cv.extraPersonal.map((item, index) => (
          <ExtraFieldRow
            key={extraPersonalIds[index]}
            item={item}
            onChange={(next) =>
              setCv((current) => ({
                ...current,
                extraPersonal: current.extraPersonal.map((row, i) => (i === index ? next : row)),
              }))
            }
            onRemove={() => {
              setExtraPersonalIds((current) => current.filter((_, i) => i !== index));
              setCv((current) => ({
                ...current,
                extraPersonal: current.extraPersonal.filter((_, i) => i !== index),
              }));
            }}
          />
        ))}
        <AddButton
          label="+ Hanampy fampahafantarana"
          onPress={() => {
            setExtraPersonalIds((current) => [...current, createExtraRowId()]);
            setCv((current) => ({ ...current, extraPersonal: [...current.extraPersonal, { label: '', value: '' }] }));
          }}
        />
      </Section>
      <Section title="Fifandraisana">
        <Field
          label="Finday *"
          value={cv.phone}
          onChange={(v) => field('phone', v)}
          keyboardType="phone-pad"
          error={fieldErrors.phone}
        />
        <Field
          label="Mailaka *"
          value={cv.email}
          onChange={(v) => field('email', v)}
          keyboardType="email-address"
          error={fieldErrors.email}
        />
        <Field label="Facebook" value={cv.facebook ?? ''} onChange={(v) => field('facebook', v)} />
        {cv.extraContact.map((item, index) => (
          <ExtraFieldRow
            key={extraContactIds[index]}
            item={item}
            onChange={(next) =>
              setCv((current) => ({
                ...current,
                extraContact: current.extraContact.map((row, i) => (i === index ? next : row)),
              }))
            }
            onRemove={() => {
              setExtraContactIds((current) => current.filter((_, i) => i !== index));
              setCv((current) => ({
                ...current,
                extraContact: current.extraContact.filter((_, i) => i !== index),
              }));
            }}
          />
        ))}
        <AddButton
          label="+ Hanampy fifandraisana"
          onPress={() => {
            setExtraContactIds((current) => [...current, createExtraRowId()]);
            setCv((current) => ({ ...current, extraContact: [...current.extraContact, { label: '', value: '' }] }));
          }}
        />
      </Section>
      <Section title="Fampahafantarana ny maha skoto">
        <Field
          label="Faritany *"
          value={cv.province}
          onChange={(v) => field('province', v)}
          error={fieldErrors.province}
        />
        <Field label="Faritra *" value={cv.area} onChange={(v) => field('area', v)} error={fieldErrors.area} />
        <Field
          label="Fivondronana *"
          value={cv.fivondronana}
          onChange={(v) => field('fivondronana', v)}
          error={fieldErrors.fivondronana}
        />
      </Section>
      <Section title="Sampana">
        {cv.branches.map((row, index) => (
          <View key={row.id ?? `branch-${index}`} style={styles.repeat}>
            <Field
              label="Anarana *"
              value={row.name}
              onChange={(v) => updateRow<CvBranch>('branches', index, { name: v })}
              error={fieldErrors[`branches.${index}.name`]}
            />
            <Field
              label="Vondrona *"
              value={row.group}
              onChange={(v) => updateRow<CvBranch>('branches', index, { group: v })}
              error={fieldErrors[`branches.${index}.group`]}
            />
            <Field
              label="Tetikasa"
              value={row.project}
              onChange={(v) => updateRow<CvBranch>('branches', index, { project: v })}
            />
            <DateField
              label="Daty nanombohana"
              value={row.startedAt}
              onChange={(v) => updateRow<CvBranch>('branches', index, { startedAt: v })}
              error={fieldErrors[`branches.${index}.startedAt`]}
            />
            <DateField
              label="Daty namaranana"
              value={row.endedAt}
              onChange={(v) => updateRow<CvBranch>('branches', index, { endedAt: v })}
              error={fieldErrors[`branches.${index}.endedAt`]}
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
            <DateField
              label="Daty"
              value={row.date}
              onChange={(v) => updateRow<CvActivity>('activities', index, { date: v })}
              error={fieldErrors[`activities.${index}.date`]}
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
      {session.user.isResponsible ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void exportPdf();
          }}
          style={styles.export}
        >
          <BrandIcon name="download" color={colors.accent} />
          <Text style={styles.exportText}>Mamorona sy mizara PDF</Text>
        </Pressable>
      ) : null}
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
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
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
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numbers-and-punctuation';
  error?: string;
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
        style={[styles.input, error && styles.inputError]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
function parseIsoDate(value: string): Date {
  const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function DateField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={[styles.input, styles.dateInput, error && styles.inputError]}
      >
        <Text style={value ? styles.dateValue : styles.datePlaceholder}>{value || 'Safidio ny daty'}</Text>
      </Pressable>
      {open ? (
        <RNDateTimePicker
          value={parseIsoDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onValueChange={(_event, selected) => {
            setOpen(Platform.OS === 'ios');
            onChange(toIsoDate(selected));
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
function ExtraFieldRow({
  item,
  onChange,
  onRemove,
}: {
  item: CvExtraField;
  onChange: (next: CvExtraField) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.repeat}>
      <Field label="Anarana" value={item.label} onChange={(v) => onChange({ ...item, label: v })} />
      <Field label="Soratra" value={item.value} onChange={(v) => onChange({ ...item, value: v })} />
      <RemoveButton onPress={onRemove} />
    </View>
  );
}
function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.add}>
      <BrandIcon name="plus" size={18} />
      <Text style={styles.addText}>{label.replace(/^\+\s*/, '')}</Text>
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36 },
  back: { minHeight: 44, justifyContent: 'center' },
  backContent: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { color: colors.primary, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline' },
  heading: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 8 },
  help: { color: colors.secondary, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  section: { marginTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.text, fontWeight: '700', fontSize: 17, marginBottom: 20, textAlign: 'center' },
  field: { marginBottom: 12 },
  label: { color: colors.text, fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: {
    minHeight: 50,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 16,
  },
  inputError: { borderColor: colors.error, borderWidth: 2 },
  dateInput: { justifyContent: 'center' },
  dateValue: { color: colors.text, fontSize: 16 },
  datePlaceholder: { color: colors.secondary, fontSize: 16 },
  add: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
  },
  addText: { flexShrink: 1, color: colors.primary, fontWeight: '600', fontSize: 14 },
  repeat: { marginBottom: 12, paddingBottom: 10, borderBottomWidth: 1, borderColor: colors.border },
  remove: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  removeText: { color: colors.error, fontWeight: '600', fontSize: 13 },
  export: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportText: { color: colors.accent, fontWeight: '700', fontSize: 14, flexShrink: 1 },
  save: {
    minHeight: 52,
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  saveText: { color: colors.onPrimary, fontWeight: '600', fontSize: 15 },
  error: { color: colors.error, marginTop: 14, lineHeight: 20 },
  fieldError: { color: colors.error, marginTop: 4, fontSize: 13, lineHeight: 18 },
  success: { color: colors.accent, marginTop: 14, lineHeight: 20 },
});
