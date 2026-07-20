import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/authContext';
import { ApiError } from '../../api/client';
import styles from './Login.module.css';

export function Login() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [passwd, setPasswd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(id, passwd);
      navigate('/');
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
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>health-web</h1>
        <p className={styles.subtitle}>로그인하여 건강정보를 확인하세요.</p>

        <label className={styles.label} htmlFor="id">
          아이디
        </label>
        <input
          id="id"
          className={styles.input}
          value={id}
          onChange={(event) => setId(event.target.value)}
          autoComplete="username"
          required
        />

        <label className={styles.label} htmlFor="passwd">
          비밀번호
        </label>
        <input
          id="passwd"
          type="password"
          className={styles.input}
          value={passwd}
          onChange={(event) => setPasswd(event.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitButton} type="submit" disabled={submitting}>
          {submitting ? '로그인 중...' : '로그인'}
        </button>

        <p className={styles.signup}>회원가입</p>
      </form>
    </div>
  );
}
