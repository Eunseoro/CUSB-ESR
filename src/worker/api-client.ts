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
    // AbortController를 사용한 타임아웃 구현
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃 (연결 문제 대비)
    
    try {
      const apiUrl = `${this.baseUrl}/api/bot/configs/active`;
      console.log(`📡 대시보드 API 호출 시작`);
      console.log(`  Base URL: ${this.baseUrl}`);
      console.log(`  Full URL: ${apiUrl}`);
      console.log(`  API Key: ${this.apiKey.substring(0, 8)}... (${this.apiKey.length}자)`);
      
      const startTime = Date.now();
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'ChzzkBotWorker/1.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      console.log(`📊 응답 수신 (${duration}ms):`);
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API 응답 오류:`);
        console.error(`  Status: ${response.status}`);
        console.error(`  Status Text: ${response.statusText}`);
        console.error(`  Response: ${errorText}`);
        
        if (response.status === 401) {
          throw new Error(`인증 실패: API 키가 올바르지 않거나 Vercel의 BOT_WORKER_API_KEY와 일치하지 않습니다.`);
        }
        
        throw new Error(`Failed to fetch configs: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const configs = await response.json();
      console.log(`✅ 활성화된 설정 ${configs.length}개 조회 성공`);
      return configs;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // 에러 타입별 상세 로깅
      if (error.name === 'AbortError') {
        console.error(`❌ 요청 타임아웃 (30초 초과)`);
        console.error(`  URL: ${this.baseUrl}/api/bot/configs/active`);
        console.error(`💡 네트워크 연결이 느리거나 Vercel 서버가 응답하지 않습니다.`);
      } else if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
        console.error(`❌ 연결 거부됨 (ECONNREFUSED)`);
        console.error(`  URL: ${this.baseUrl}`);
        console.error(`  에러 메시지: ${error.message || error.cause?.message}`);
        console.error(`💡 가능한 원인:`);
        console.error(`  1. DASHBOARD_URL이 잘못되었습니다: ${this.baseUrl}`);
        console.error(`  2. Vercel 서버가 다운되었거나 접근 불가능합니다`);
        console.error(`  3. Render의 네트워크 정책으로 인해 외부 연결이 차단되었습니다`);
        console.error(`  4. DNS 해석 실패`);
        console.error(`💡 해결 방법:`);
        console.error(`  - Vercel 대시보드에서 배포 상태 확인`);
        console.error(`  - Render 환경 변수 DASHBOARD_URL 확인: ${this.baseUrl}`);
        console.error(`  - curl로 테스트: curl -H "X-API-Key: ${this.apiKey.substring(0, 8)}..." ${this.baseUrl}/api/bot/configs/active`);
      } else if (error.code === 'ENOTFOUND' || error.cause?.code === 'ENOTFOUND') {
        console.error(`❌ DNS 해석 실패 (ENOTFOUND)`);
        console.error(`  URL: ${this.baseUrl}`);
        console.error(`💡 도메인 이름을 해석할 수 없습니다. URL을 확인하세요.`);
      } else {
        console.error(`❌ 알 수 없는 오류:`);
        console.error(`  에러 타입: ${error.name || 'Unknown'}`);
        console.error(`  에러 코드: ${error.code || 'N/A'}`);
        console.error(`  에러 메시지: ${error.message || 'N/A'}`);
        console.error(`  전체 에러:`, error);
      }
      
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


