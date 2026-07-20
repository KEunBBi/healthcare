import styles from './Avatar.module.css';

interface AvatarProps {
  name: string;
  size?: number;
}

/** 회원 데이터에 사진 필드가 없어(docs/DATA_MODEL.md 1.1) 이름 첫 글자로 대체 아바타를 표시한다. */
export function Avatar({ name, size = 44 }: AvatarProps) {
  const initial = name.trim().charAt(0) || '?';
  return (
    <div className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {initial}
    </div>
  );
}
