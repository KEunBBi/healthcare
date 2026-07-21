import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { sendChatMessage } from '../../api/chat';
import { ApiError } from '../../api/client';
import { unstable_styles as styles } from './ChatPanel.module.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * ARCHITECTURE.md 7장 TODO: 챗봇 화면 배치가 SCREEN_DESIGN.md에 아직 없어
 * 회원 상세 화면 내부 위젯으로 임베드한다(health-web과 동일). API_SPEC.md 1.6은 message 하나만 받는
 * 단발성 API라 대화 맥락(history)은 서버로 보내지 않고 화면 표시용으로만 쌓는다.
 */
export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    const message = input.trim();
    if (!message || sending) return;

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setInput('');
    setSending(true);
    setError(null);

    try {
      const { answer } = await sendChatMessage({ message });
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'AI 응답을 받지 못했습니다.');
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.panel} aria-label="챗봇">
      <Text style={styles.title}>AI 챗봇</Text>
      <ScrollView style={styles.messages}>
        {messages.length === 0 && <Text style={styles.placeholder}>건강 데이터에 대해 질문해보세요.</Text>}
        {messages.map((message, index) => (
          <Text key={index} style={message.role === 'user' ? styles.userMessage : styles.assistantMessage}>
            {message.content}
          </Text>
        ))}
        {sending && <Text style={styles.assistantMessage}>답변 작성 중...</Text>}
      </ScrollView>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요"
          editable={!sending}
          onSubmitEditing={handleSubmit}
        />
        <Pressable
          style={sending || !input.trim() ? [styles.sendButton, styles.sendButtonDisabled] : styles.sendButton}
          onPress={handleSubmit}
          disabled={sending || !input.trim()}
        >
          <Text style={styles.sendButtonText}>전송</Text>
        </Pressable>
      </View>
    </View>
  );
}
