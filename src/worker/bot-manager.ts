// 봇 매니저 - 멀티 채널 관리 (유멜론 봇 전용)
import { PrismaClient } from '@prisma/client';

// 임시 타입 정의
interface BotConfig {
  id: string;
  channelId: string;
  channelName: string;
  isActive: boolean;
  isLive: boolean;
  chatChannelId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  welcomeMessage?: string;
  autoReplyEnabled: boolean;
  moderationEnabled: boolean;
  donationAlertEnabled: boolean;
  bannedWords: string[];
  bannedWordsAction: string;
  lastConnected?: Date;
  lastDisconnected?: Date;
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
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    const apiKey = process.env.BOT_WORKER_API_KEY || 'default-api-key';
    this.apiClient = new BotApiClient(dashboardUrl, apiKey);
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🤖 유멜론 봇 매니저 초기화 중...');

    // 활성화된 모든 채널 조회 (API를 통해)
    const configs = await this.apiClient.getActiveConfigs();

    console.log(`활성화된 채널 ${configs.length}개 발견`);

    for (const config of configs) {
      await this.connectChannel(config);
    }

    this.isInitialized = true;
    console.log(`✅ 유멜론 봇 매니저 초기화 완료 (${this.clients.size}개 채널 연결)`);
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
