// 봇 API 인증 유틸리티 (유멜론 봇 전용)
import { NextRequest } from 'next/server';

export function verifyBotApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  const expectedApiKey = process.env.BOT_WORKER_API_KEY;
  
  if (!expectedApiKey) {
    console.error('BOT_WORKER_API_KEY 환경 변수가 설정되지 않았습니다.');
    return false;
  }
  
  return apiKey === expectedApiKey;
}

export function createBotApiHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
  };
}
