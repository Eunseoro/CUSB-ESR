// 봇 매니저 - 멀티 채널 관리 (유멜론 봇 전용)
import { PrismaClient } from '@prisma/client';

// 임시 타입 정의
interface BotConfig {
  id: string;
  channelId: string;
  channelName: string;
  isActive: boolean;
  isLive: boolean;
  botAccountId?: string | null;
  chatChannelId?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiry?: Date | null;
  welcomeMessage?: string | null;
  autoReplyEnabled: boolean;
  moderationEnabled: boolean;
  donationAlertEnabled: boolean;
  bannedWords: string[];
  bannedWordsAction: string;
  lastConnected?: Date | null;
  lastDisconnected?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  commands?: any[];
}
import { ChzzkChatClient } from '@/lib/bot/websocket-client';
import { BotCommandExecutor } from '@/lib/bot/command-executor';
import { getChzzkChannelInfo } from '@/lib/bot/chzzk-api';
import { BotApiClient } from './api-client';

export class BotManager {
  private clients: Map<string, ChzzkChatClient> = new Map();
  private prisma: PrismaClient;
  private commandExecutor: BotCommandExecutor;
  private apiClient: BotApiClient;
  private isInitialized = false;

  constructor() {
    this.prisma = new PrismaClient();
    this.commandExecutor = new BotCommandExecutor(this.prisma);
    
    // API 클라이언트 초기화 (관리 대시보드와 통신)
    // 기본값은 프로덕션 서버 (Vercel 배포 URL)
    // 주의: /bot을 포함하지 않음! API는 /api/bot/... 경로를 사용하므로 루트 도메인만 필요
    const dashboardUrl = process.env.DASHBOARD_URL || 'https://ugmsong.vercel.app';
    const apiKey = process.env.BOT_WORKER_API_KEY || 'default-api-key';
    
    // 환경 변수 디버깅 정보 출력
    console.log('🔍 환경 변수 확인:');
    console.log(`  DASHBOARD_URL: ${process.env.DASHBOARD_URL ? `설정됨 (${process.env.DASHBOARD_URL})` : '미설정 (기본값 사용)'}`);
    console.log(`  BOT_WORKER_API_KEY: ${process.env.BOT_WORKER_API_KEY ? `설정됨 (${process.env.BOT_WORKER_API_KEY.length}자)` : '미설정 (기본값 사용)'}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV || '미설정'}`);
    console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '설정됨' : '미설정'}`);
    
    if (!process.env.DASHBOARD_URL) {
      console.warn('⚠️ DASHBOARD_URL 환경 변수가 설정되지 않았습니다. 기본값(https://ugmsong.vercel.app)을 사용합니다.');
    }
    
    if (!process.env.BOT_WORKER_API_KEY) {
      console.warn('⚠️ BOT_WORKER_API_KEY 환경 변수가 설정되지 않았습니다. 기본값을 사용합니다.');
      console.warn('⚠️ Vercel의 BOT_WORKER_API_KEY와 일치하지 않으면 인증이 실패합니다!');
    }
    
    console.log(`📡 최종 대시보드 URL: ${dashboardUrl}`);
    console.log(`🔑 최종 API Key: ${apiKey.substring(0, 8)}... (${apiKey.length}자)`);
    this.apiClient = new BotApiClient(dashboardUrl, apiKey);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🤖 유멜론 봇 매니저 초기화 중...');

    try {
      // 활성화된 모든 채널 조회 (API를 통해)
      const configs = await this.apiClient.getActiveConfigs();

      console.log(`활성화된 채널 ${configs.length}개 발견`);

      for (const config of configs) {
        await this.connectChannel(config);
      }

      this.isInitialized = true;
      console.log(`✅ 유멜론 봇 매니저 초기화 완료 (${this.clients.size}개 채널 연결)`);
    } catch (error) {
      console.error('❌ 봇 매니저 초기화 실패:', error);
      console.log('⚠️ 대시보드 연결 실패. 재시도는 계속 진행됩니다.');
      // 초기화 실패해도 프로세스는 계속 실행 (재시도 가능)
      this.isInitialized = false;
      throw error; // 호출자에게 에러 전달 (재시도 로직에서 처리)
    }
  }

  async connectChannel(config: BotConfig): Promise<void> {
    if (this.clients.has(config.channelId)) {
      console.log(`채널 ${config.channelId}는 이미 연결되어 있습니다.`);
      return;
    }

    try {
      console.log(`채널 ${config.channelId} 연결 시도 중...`);

      // 봇 계정 정보 조회 (API를 통해)
      if (!config.botAccountId) {
        console.log(`채널 ${config.channelId}에 연결된 봇 계정이 없습니다.`);
        return;
      }

      const botAccount = await this.apiClient.getBotAccount(config.botAccountId);

      if (!botAccount) {
        console.log(`❌ 봇 계정 ${config.botAccountId}를 찾을 수 없습니다.`);
        return;
      }

      console.log(`📋 봇 계정 정보:`, {
        id: botAccount.id,
        accountName: botAccount.accountName,
        isActive: botAccount.isActive,
        hasNidAuth: !!botAccount.nidAuth,
        hasNidSession: !!botAccount.nidSession,
      });

      if (botAccount.isActive === false) {
        console.log(`❌ 봇 계정 ${config.botAccountId}가 비활성화되었습니다.`);
        return;
      }

      console.log(`✅ 봇 계정 ${config.botAccountId} 확인 완료: ${botAccount.accountName}`);

      // 채널 정보 확인
      const channelInfo = await getChzzkChannelInfo(config.channelId);
      
      // 방송 중이 아니면 연결하지 않음
      if (!channelInfo.isLive) {
        console.log(`채널 ${config.channelId}는 현재 방송 중이 아닙니다.`);
        return;
      }

      const client = new ChzzkChatClient(config, botAccount);
      
      // 이벤트 핸들러 등록
      client.on('chat', (data) => this.handleChat(config.id, data));
      client.on('donation', (data) => this.handleDonation(config.id, data));
      client.on('subscription', (data) => this.handleSubscription(config.id, data));
      client.on('connected', () => this.onConnected(config.channelId));
      client.on('disconnected', () => this.onDisconnected(config.channelId));
      client.on('error', (error) => this.onError(config.channelId, error));

      await client.connect();
      this.clients.set(config.channelId, client);

      // WebSocket 연결 시 받은 accessToken을 데이터베이스에 저장
      const accessToken = client.getAccessToken();
      if (accessToken) {
        try {
          await (this.prisma as any).botConfig.update({
            where: { id: config.id },
            data: { accessToken },
          });
          console.log(`✅ accessToken 저장 완료 (채널 ${config.channelId})`);
        } catch (error) {
          console.error(`⚠️ accessToken 저장 실패:`, error);
        }
      } else {
        console.warn(`⚠️ accessToken을 받지 못했습니다 (채널 ${config.channelId})`);
      }

      // 상태 업데이트 (API를 통해)
      await this.apiClient.updateBotStatus(config.channelId, {
        isConnected: true,
        lastConnected: new Date(),
      });

      console.log(`✅ 채널 ${config.channelId} 연결 완료`);
    } catch (error) {
      console.error(`❌ 채널 ${config.channelId} 연결 실패:`, error);
    }
  }

  async disconnectChannel(channelId: string): Promise<void> {
    const client = this.clients.get(channelId);
    if (client) {
      client.disconnect();
      this.clients.delete(channelId);

      // 상태 업데이트 (API를 통해)
      await this.apiClient.updateBotStatus(channelId, {
        isConnected: false,
        lastDisconnected: new Date(),
      });

      console.log(`✅ 채널 ${channelId} 연결 해제 완료`);
    }
  }

  private async handleChat(configId: string, data: any): Promise<void> {
    try {
      const message = data.message;
      const username = data.username;
      const userRole = data.userRole;

      console.log(`[${configId}] ${username}: ${message}`);

      // 명령어 감지 및 실행
      if (message.startsWith('!')) {
        // 기본 명령어 먼저 확인
        await this.commandExecutor.executeBuiltinCommand(configId, message, { username, userRole });
        
        // 커스텀 명령어 확인
        await this.commandExecutor.execute(configId, message, { username, userRole });
      }

      // 채팅 로그 저장 (API를 통해)
      await this.apiClient.sendChatLog({
        configId,
        username,
        message,
        messageType: 'chat',
      });
    } catch (error) {
      console.error('Error handling chat:', error);
    }
  }

  private async handleDonation(configId: string, data: any): Promise<void> {
    try {
      const { username, amount, message } = data;
      
      console.log(`[${configId}] 💰 ${username}님이 ${amount}원 후원했습니다!`);

      // 후원 알림 메시지 전송
      const config = await (this.prisma as any).botConfig.findUnique({
        where: { id: configId },
      });

      if (config?.donationAlertEnabled && config.accessToken) {
        const alertMessage = `🎉 ${username}님이 ${amount.toLocaleString()}원 후원해주셨습니다! 감사합니다! 💕`;
        
        // TODO: 실제 메시지 전송 구현
        console.log(`후원 알림: ${alertMessage}`);
      }

      // 채팅 로그 저장 (API를 통해)
      await this.apiClient.sendChatLog({
        configId,
        username,
        message: message || '',
        messageType: 'donation',
      });
    } catch (error) {
      console.error('Error handling donation:', error);
    }
  }

  private async handleSubscription(configId: string, data: any): Promise<void> {
    try {
      const { username } = data;
      
      console.log(`[${configId}] 🎊 ${username}님이 구독했습니다!`);

      // 구독 알림 메시지 전송
      const config = await (this.prisma as any).botConfig.findUnique({
        where: { id: configId },
      });

      if (config?.donationAlertEnabled && config.accessToken) {
        const alertMessage = `🎊 ${username}님이 구독해주셨습니다! 감사합니다! 💕`;
        
        // TODO: 실제 메시지 전송 구현
        console.log(`구독 알림: ${alertMessage}`);
      }

      // 채팅 로그 저장 (API를 통해)
      await this.apiClient.sendChatLog({
        configId,
        username,
        message: '구독',
        messageType: 'subscription',
      });
    } catch (error) {
      console.error('Error handling subscription:', error);
    }
  }


  private onConnected(channelId: string): void {
    console.log(`✅ 채널 ${channelId} WebSocket 연결됨`);
  }

  private onDisconnected(channelId: string): void {
    console.log(`❌ 채널 ${channelId} WebSocket 연결 해제됨`);
  }

  private onError(channelId: string, error: Error): void {
    console.error(`❌ 채널 ${channelId} 오류:`, error);
  }

  getConnectedChannels(): string[] {
    return Array.from(this.clients.keys());
  }

  isChannelConnected(channelId: string): boolean {
    const client = this.clients.get(channelId);
    return client ? client.isConnected() : false;
  }

  async shutdown(): Promise<void> {
    console.log('🤖 유멜론 봇 매니저 종료 중...');
    
    for (const [channelId, client] of this.clients) {
      client.disconnect();
    }
    
    await this.prisma.$disconnect();
    console.log('✅ 유멜론 봇 매니저 종료 완료');
  }
}
