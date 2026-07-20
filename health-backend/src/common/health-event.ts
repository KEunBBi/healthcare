export const HEALTH_EVENT = 'health.event';

export interface HealthEventPayload<T = unknown> {
  userId: string;
  event: string;
  data: T;
}
