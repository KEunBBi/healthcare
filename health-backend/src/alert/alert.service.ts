import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { HEALTH_EVENT, type HealthEventPayload } from '../common/health-event';
import { ChatService } from '../chat/chat.service';
import type { BloodPressureEvent, GlucoseEvent, HeartRateEvent } from '../simulator/simulator-events';
import { SlackService } from './slack.service';

const BLOOD_PRESSURE_SYSTOLIC_THRESHOLD = 140;
const BLOOD_PRESSURE_DIASTOLIC_THRESHOLD = 90;

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private readonly slackService: SlackService,
    private readonly chatService: ChatService,
  ) {}

  @OnEvent(HEALTH_EVENT)
  async handleHealthEvent(payload: HealthEventPayload): Promise<void> {
    const summary = this.detectAnomaly(payload);
    if (!summary) {
      return;
    }

    let analysis: string;
    try {
      analysis = await this.chatService.ask(`다음 이상 건강 데이터를 분석해줘: ${summary}`);
    } catch {
      analysis = '(AI Agent 분석 실패 — health-ai 응답 없음)';
    }

    const sent = await this.slackService.sendMessage(`[이상 데이터 감지] ${summary}\n${analysis}`);
    if (!sent) {
      this.logger.warn(`Slack 알림 전송 실패: ${summary}`);
    }
  }

  private detectAnomaly(payload: HealthEventPayload): string | null {
    switch (payload.event) {
      case 'heartRate': {
        const data = payload.data as HeartRateEvent;
        if (data.source !== 'abnormal_event') {
          return null;
        }
        return `${payload.userId} 심박수 ${data.heartRate}bpm 이상 이벤트 감지${data.note ? ` (${data.note})` : ''}`;
      }
      case 'glucose': {
        const data = payload.data as GlucoseEvent;
        if (data.status !== 'high') {
          return null;
        }
        return `${payload.userId} 혈당 ${data.glucoseMgDl}mg/dL (high)`;
      }
      case 'bloodPressure': {
        const data = payload.data as BloodPressureEvent;
        if (data.systolic < BLOOD_PRESSURE_SYSTOLIC_THRESHOLD && data.diastolic < BLOOD_PRESSURE_DIASTOLIC_THRESHOLD) {
          return null;
        }
        return `${payload.userId} 혈압 ${data.systolic}/${data.diastolic}mmHg 이상 수치 감지`;
      }
      default:
        return null;
    }
  }
}
