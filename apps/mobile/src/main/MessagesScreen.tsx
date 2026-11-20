import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { type AuthSession, getConfiguredApiBaseUrl } from '../access/auth-api';
import { BrandIcon } from '../access/BrandIcon';
import { colors } from '../theme/tokens';
import {
  type ConversationSummary,
  listConversations,
  listMessages,
  type MessageItem,
  messagesErrorKind,
  type PickedAttachment,
  sendMessage,
} from './messages-api';

const POLL_INTERVAL_MS = 8000;

type Props = { session: AuthSession; onSessionExpired: () => void };

export function MessagesScreen({ session, onSessionExpired }: Props) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const baseUrl = getConfiguredApiBaseUrl();

  const loadConversations = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const list = await listConversations(session.accessToken, baseUrl);
      setConversations(list);
      setStatus('success');
    } catch (reason) {
      if (messagesErrorKind(reason) === 'session-expired') {
        onSessionExpired();
        return;
      }
      setError(reason instanceof Error ? reason.message : 'Tsy azo vakina ny resaka.');
      setStatus('error');
    }
  }, [baseUrl, onSessionExpired, session.accessToken]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  if (activeId) {
    const conversation = conversations.find((item) => item.id === activeId);
    if (conversation)
      return (
        <ConversationThread
          session={session}
          baseUrl={baseUrl}
          conversation={conversation}
          onBack={() => setActiveId(null)}
          onSessionExpired={onSessionExpired}
        />
      );
  }

  return (
    <View style={styles.page}>
      <Text accessibilityRole="header" style={styles.heading}>
        Hafatra
      </Text>
      <Text style={styles.subtitle}>Ny resaka ho an’ny vondronao sy ny resaka ankapobeny.</Text>
      {status === 'loading' && conversations.length === 0 ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Mamaky ny resaka" style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : status === 'error' ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Mbola tsy misy resaka azonao idirana.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={status === 'loading'} onRefresh={() => void loadConversations()} />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveId(item.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <BrandIcon name="messages" size={22} color={colors.primary} />
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>
                  {item.kind === 'GENERAL'
                    ? 'Resaka ankapobeny'
                    : item.kind === 'ENTITY'
                      ? 'Resaka vondrona'
                      : 'Resaka miaraka'}
                </Text>
              </View>
              <BrandIcon name="forward" size={18} color={colors.secondary} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function ConversationThread({
  session,
  baseUrl,
  conversation,
  onBack,
  onSessionExpired,
}: {
  session: AuthSession;
  baseUrl: string;
  conversation: ConversationSummary;
  onBack: () => void;
  onSessionExpired: () => void;
}) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<PickedAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(
    async (silent: boolean) => {
      if (!silent) setStatus('loading');
      try {
        const page = await listMessages(conversation.id, session.accessToken, baseUrl);
        setMessages(page.messages);
        setStatus('success');
      } catch (reason) {
        if (messagesErrorKind(reason) === 'session-expired') {
          onSessionExpired();
          return;
        }
        if (!silent) {
          setError(reason instanceof Error ? reason.message : 'Tsy azo vakina ny hafatra.');
          setStatus('error');
        }
      }
    },
    [baseUrl, conversation.id, onSessionExpired, session.accessToken],
  );

  useEffect(() => {
    void load(false);
    pollRef.current = setInterval(() => void load(true), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const pickAttachment = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? asset.uri.split('/').pop() ?? 'rakitra';
    setAttachment({
      uri: asset.uri,
      name,
      mimeType: asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
    });
  };

  const submit = async () => {
    if (!draft.trim() && !attachment) return;
    setSending(true);
    setError(null);
    try {
      const message = await sendMessage(
        conversation.id,
        session.accessToken,
        baseUrl,
        draft.trim(),
        attachment ?? undefined,
      );
      setMessages((current) => [...current, message]);
      setDraft('');
      setAttachment(null);
    } catch (reason) {
      if (messagesErrorKind(reason) === 'session-expired') {
        onSessionExpired();
        return;
      }
      setError(reason instanceof Error ? reason.message : 'Tsy voaray ny hafatra.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.page}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.headerBack}>
        <BrandIcon name="back" size={18} color={colors.accent} />
        <Text style={styles.accentText}>{conversation.title}</Text>
      </Pressable>
      {status === 'loading' && messages.length === 0 ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Mamaky ny hafatra" style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted={false}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.sender.id === session.user.id && styles.bubbleMine]}>
              <Text style={styles.bubbleSender}>{item.sender.accountName}</Text>
              {item.body ? <Text style={styles.bubbleBody}>{item.body}</Text> : null}
              {item.attachment ? <Text style={styles.bubbleAttachment}>📎 {item.attachment.name}</Text> : null}
            </View>
          )}
        />
      )}
      {error ? <Text style={styles.feedback}>{error}</Text> : null}
      <View style={styles.composer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hanampy rakitra"
          onPress={() => void pickAttachment()}
          style={styles.attachButton}
        >
          <BrandIcon name="document" size={20} color={colors.secondary} />
        </Pressable>
        <TextInput
          accessibilityLabel="Hafatra"
          placeholder={attachment ? attachment.name : 'Soraty eto ny hafatranao'}
          placeholderTextColor={colors.secondary}
          value={draft}
          onChangeText={setDraft}
          style={styles.composerInput}
          multiline
        />
        <Pressable
          accessibilityRole="button"
          disabled={sending || (!draft.trim() && !attachment)}
          onPress={() => void submit()}
          style={[styles.sendButton, (sending || (!draft.trim() && !attachment)) && styles.disabled]}
        >
          <Text style={styles.sendButtonText}>{sending ? '…' : 'Alefaso'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 20, backgroundColor: colors.page },
  heading: { color: colors.text, fontSize: 23, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.secondary, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  loading: { paddingVertical: 40, alignItems: 'center' },
  emptyState: { paddingVertical: 36, alignItems: 'center' },
  emptyText: { color: colors.secondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  row: {
    minHeight: 60,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.muted,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressed: { opacity: 0.65 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowMeta: { color: colors.secondary, fontSize: 13 },
  headerBack: { minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  accentText: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  messageList: { paddingBottom: 12, gap: 8 },
  bubble: {
    maxWidth: '85%',
    alignSelf: 'flex-start',
    backgroundColor: colors.muted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.portrait },
  bubbleSender: { color: colors.secondary, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  bubbleBody: { color: colors.text, fontSize: 14, lineHeight: 20 },
  bubbleAttachment: { color: colors.accent, fontSize: 13, marginTop: 4 },
  feedback: { color: colors.error, fontSize: 12, marginBottom: 6, textAlign: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  attachButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  sendButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: { color: '#fff', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
