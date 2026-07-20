import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';

/**
 * health-backend RealtimeGateway(/realtime)에 연결한다 (API_SPEC.md 2.2).
 * 재연결은 socket.io-client 기본 동작에 맡기고 별도 로직을 만들지 않는다 (health-web/docs/ARCHITECTURE.md 5.3).
 */
export function createRealtimeSocket(accessToken: string): Socket {
  return io(`${import.meta.env.VITE_WS_BASE_URL}/realtime`, {
    query: { token: accessToken },
  });
}
