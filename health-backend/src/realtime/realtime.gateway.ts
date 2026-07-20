import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities';
import { HEALTH_EVENT, type HealthEventPayload } from '../common/health-event';
import { toUserRole } from '../common/user-role';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import type { JwtPayload } from '../auth/jwt-payload';

interface SubscribeBody {
  userId?: string;
}

@WebSocketGateway({ namespace: 'realtime', cors: { origin: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer() private readonly server: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
  ) {}

  handleConnection(client: Socket): void {
    // 인증은 비동기(DB 조회)이므로, 연결 직후 곧바로 도착하는 subscribe/unsubscribe 메시지가
    // 이 작업보다 먼저 처리되지 않도록 Promise 자체를 소켓에 저장해두고 각 핸들러가 await한다.
    client.data.authPromise = this.authenticate(client);
  }

  private async authenticate(client: Socket): Promise<AuthenticatedUser | null> {
    const token = client.handshake.query.token;
    const tokenValue = Array.isArray(token) ? token[0] : token;
    if (!tokenValue) {
      this.rejectConnection(client, 'AccessToken이 필요합니다.');
      return null;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(tokenValue, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      const user = await this.userRepository.findOneBy({ userId: payload.userid });
      if (!user) {
        this.rejectConnection(client, 'AccessToken이 유효하지 않습니다.');
        return null;
      }

      const authenticatedUser: AuthenticatedUser = {
        userId: user.userId,
        name: user.name,
        apiKey: user.apiKey,
        role: toUserRole(user.userType),
      };

      if (authenticatedUser.role === 'PATIENT') {
        await client.join(authenticatedUser.userId);
      }
      this.logger.log(`realtime 연결: ${authenticatedUser.userId} (${authenticatedUser.role})`);
      return authenticatedUser;
    } catch {
      this.rejectConnection(client, 'AccessToken이 만료되었거나 위조되었습니다.');
      return null;
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribeBody): Promise<void> {
    const user = await this.getAuthenticatedUser(client);
    if (!user || user.role !== 'DOCTOR' || !body?.userId) {
      return;
    }
    await client.join(body.userId);
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: SubscribeBody): Promise<void> {
    const user = await this.getAuthenticatedUser(client);
    if (!user || user.role !== 'DOCTOR' || !body?.userId) {
      return;
    }
    await client.leave(body.userId);
  }

  @OnEvent(HEALTH_EVENT)
  handleHealthEvent(payload: HealthEventPayload): void {
    this.server.to(payload.userId).emit(payload.event, { event: payload.event, data: payload.data });
  }

  private getAuthenticatedUser(client: Socket): Promise<AuthenticatedUser | null> {
    return client.data.authPromise as Promise<AuthenticatedUser | null>;
  }

  private rejectConnection(client: Socket, message: string): void {
    client.emit('error', { code: 'AUTH_FAILED', message });
    client.disconnect(true);
  }
}
