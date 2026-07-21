import type { ChatRequest, ChatResponseData } from '../../../shared/types';
import { apiClient, request } from './client';

export function sendChatMessage(payload: ChatRequest): Promise<ChatResponseData> {
  return request(apiClient.post('/chat', payload));
}
