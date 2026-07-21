import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../src/auth/authContext';
import { ApiError } from '../src/api/client';
import { unstable_styles as styles } from './login.module.css';

export default function Login() {
  const { status, login } = useAuth();
  const router = useRouter();
  const [id, setId] = useState('');
  const [passwd, setPasswd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Redirect href="/" />;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await login(id, passwd);
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
        setError('아이디 또는 비밀번호가 올바르지 않습니다.');
      } else {
        setError('로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.title}>health-mobile</Text>
        <Text style={styles.subtitle}>로그인하여 건강정보를 확인하세요.</Text>

        <Text style={styles.label}>아이디</Text>
        <TextInput
          style={styles.input}
          value={id}
          onChangeText={setId}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          value={passwd}
          onChangeText={setPasswd}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={submitting ? [styles.submitButton, styles.submitButtonDisabled] : styles.submitButton}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitButtonText}>{submitting ? '로그인 중...' : '로그인'}</Text>
        </Pressable>

        <Text style={styles.signup}>회원가입</Text>
      </View>
    </View>
  );
}
