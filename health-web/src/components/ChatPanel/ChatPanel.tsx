import { useState } from 'react';
import type { FormEvent } from 'react';
import { sendChatMessage } from '../../api/chat';
import { ApiError } from '../../api/client';
import styles from './ChatPanel.module.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * health-web/docs/ARCHITECTURE.md 7장 TODO: 챗봇 화면 배치가 SCREEN_DESIGN.md에 아직 없어
 * 회원 상세 화면 내부 위젯으로 임베드한다. API_SPEC.md 1.6은 message 하나만 받는 단발성 API라
 * 대화 맥락(history)은 서버로 보내지 않고 화면 표시용으로만 쌓는다.
 */
export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
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
    <section className={styles.panel} aria-label="챗봇">
      <h3 className={styles.title}>AI 챗봇</h3>
      <div className={styles.messages}>
        {messages.length === 0 && <p className={styles.placeholder}>건강 데이터에 대해 질문해보세요.</p>}
        {messages.map((message, index) => (
          <p key={index} className={message.role === 'user' ? styles.userMessage : styles.assistantMessage}>
            {message.content}
          </p>
        ))}
        {sending && <p className={styles.assistantMessage}>답변 작성 중...</p>}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="메시지를 입력하세요"
          disabled={sending}
        />
        <button className={styles.sendButton} type="submit" disabled={sending || !input.trim()}>
          전송
        </button>
      </form>
    </section>
  );
}
