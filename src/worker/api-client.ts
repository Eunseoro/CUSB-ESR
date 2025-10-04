// 봇 워커에서 관리 대시보드 API와 통신하는 클라이언트
import { BotConfig } from '@prisma/client';

export class BotApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // 활성화된 봇 설정 조회
  async getActiveConfigs(): Promise<BotConfig[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bot/configs/active`, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch configs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching active configs:', error);
      throw error;
    }
  }

  // 봇 상태 업데이트
  async updateBotStatus(channelId: string, status: {
    isConnected: boolean;
    lastConnected?: Date;
    lastDisconnected?: Date;
    errorMessage?: string;
  }): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bot/status/${channelId}`, {
        method: 'PATCH',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(status),
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error updating bot status:', error);
      throw error;
    }
  }

  // 채팅 로그 전송
  async sendChatLog(log: {
    configId: string;
    username: string;
    message: string;
    messageType: string;
  }): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/bot/chat-logs`, {
        method: 'POST',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(log),
      });

      if (!response.ok) {
        throw new Error(`Failed to send chat log: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending chat log:', error);
      // 채팅 로그 전송 실패는 봇 작동에 치명적이지 않으므로 에러를 던지지 않음
    }
  }

  // 봇 계정 정보 조회
  async getBotAccount(accountId: string): Promise<any> {
    try {
      console.log(`🔍 봇 계정 ${accountId} 조회 중...`);
      const response = await fetch(`${this.baseUrl}/api/bot/accounts/${accountId}/credentials`, {
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
      });

      console.log(`📊 봇 계정 ${accountId} 응답 상태: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ 봇 계정 ${accountId} 조회 실패: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch bot account: ${response.statusText}`);
      }

      const account = await response.json();
      console.log(`📋 봇 계정 ${accountId} 응답 데이터:`, JSON.stringify(account, null, 2));
      return account;
    } catch (error) {
      console.error('Error fetching bot account:', error);
      throw error;
    }
  }
}


