// 치지직 WebSocket 채팅 클라이언트 (봇 전용)
import WebSocket from 'ws';
import { EventEmitter } from 'events';
// import { BotConfig } from '@prisma/client';

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
}
import { getChatChannelInfo } from './chzzk-api';

export interface ChatMessage {
  username: string;
  message: string;
  userRole: string;
  timestamp: Date;
}

export interface DonationMessage {
  username: string;
  amount: number;
  message?: string;
  timestamp: Date;
}

export class ChzzkChatClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: BotConfig;
  private botAccount: any;
  private chatChannelId: string = '';
  private accessToken: string = '';
  private pingInterval: NodeJS.Timeout | null = null;
  
  // accessToken을 외부에서 가져올 수 있도록 getter 추가
  getAccessToken(): string {
    return this.accessToken;
  }
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: BotConfig, botAccount: any) {
    super();
    this.config = config;
    this.botAccount = botAccount;
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔌 채널 ${this.config.channelId} WebSocket 연결 시도 중...`);
      
      // 채팅 채널 정보 조회
      const chatInfo = await this.getChatChannelInfo();
      this.chatChannelId = chatInfo.chatChannelId;
      this.accessToken = chatInfo.accessToken;

      console.log(`📊 채팅 채널 ID: ${this.chatChannelId}`);
      console.log(`🔑 액세스 토큰: ${this.accessToken ? '있음' : '없음'}`);

      // 치지직 WebSocket URL (실제 URL 사용)
      const wsUrl = `wss://kr-ss1.chat.naver.com/chat?cid=${this.chatChannelId}`;
      console.log(`🌐 WebSocket 연결 시도: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      // 연결 타임아웃 설정 (30초)
      const connectTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.OPEN) {
          console.error('❌ WebSocket 연결 타임아웃 (30초)');
          this.ws.close();
          this.emit('error', new Error('WebSocket connection timeout'));
        }
      }, 30000);

      this.ws.on('open', () => {
        clearTimeout(connectTimeout);
        this.onOpen();
      });
      
      this.ws.on('message', (data) => this.onMessage(data));
      this.ws.on('error', (error) => {
        clearTimeout(connectTimeout);
        this.onError(error);
      });
      this.ws.on('close', (code, reason) => {
        clearTimeout(connectTimeout);
        console.log(`🔌 WebSocket 연결 종료: code=${code}, reason=${reason?.toString() || 'N/A'}`);
        this.onClose();
      });
    } catch (error) {
      console.error('❌ WebSocket 연결 실패:', error);
      throw error;
    }
  }

  private async getChatChannelInfo(): Promise<{ chatChannelId: string; accessToken: string; extraToken: string }> {
    // 봇 계정 정보를 사용하여 채팅 채널 정보 조회
    // API에서 이미 복호화된 값을 받아오므로, 여기서는 복호화하지 않음
    
    console.log(`🔍 봇 계정 쿠키 확인:`, {
      hasNidAuth: !!this.botAccount.nidAuth,
      hasNidSession: !!this.botAccount.nidSession,
      nidAuthLength: this.botAccount.nidAuth?.length || 0,
      nidSessionLength: this.botAccount.nidSession?.length || 0,
    });
    
    if (!this.botAccount.nidAuth || !this.botAccount.nidSession) {
      throw new Error('봇 계정의 NID 쿠키가 없습니다.');
    }
    
    // API에서 이미 복호화된 값을 받아오므로 그대로 사용
    // getChatChannelInfo 함수가 내부에서 복호화를 처리함
    return await getChatChannelInfo(this.config.channelId, this.botAccount);
  }

  private onOpen(): void {
    console.log(`✅ WebSocket connected to channel: ${this.config.channelId}`);
    console.log(`📊 채팅 채널 ID: ${this.chatChannelId}`);
    console.log(`🔑 액세스 토큰: ${this.accessToken ? '있음' : '없음'}`);
    
    // 연결 초기화 메시지 전송 (WebSocket 프로토콜용, 채팅창에 표시되지 않음)
    // 이 메시지는 WebSocket 연결을 위한 프로토콜 메시지이며, 실제 채팅창에는 표시되지 않습니다.
    this.send({
      ver: '2',
      cmd: 100,
      svcid: 'game',
      cid: this.chatChannelId,
      bdy: {
        uid: null,
        devType: 2001,
        accTkn: this.accessToken,
        auth: 'READ',
      },
      tid: 1,
    });
    
    console.log(`📤 WebSocket 연결 초기화 메시지 전송 완료 (프로토콜용, 채팅창에 표시되지 않음)`);

    // Ping 메시지 주기적 전송 (10초마다)
    this.pingInterval = setInterval(() => {
      this.send({
        ver: '2',
        cmd: 0,
      });
    }, 10000);

    this.emit('connected');
  }

  private onMessage(data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.cmd) {
        case 0: // Ping response
          break;
        case 93101: // 일반 채팅
          this.handleChat(message.bdy);
          break;
        case 93102: // 후원
          this.handleDonation(message.bdy);
          break;
        case 93103: // 구독
          this.handleSubscription(message.bdy);
          break;
        case 93104: // 시스템 메시지
          this.handleSystemMessage(message.bdy);
          break;
        default:
          console.log('Unknown message type:', message.cmd);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleChat(body: any): void {
    const chatMessage: ChatMessage = {
      username: body.profile?.nickname || 'Unknown',
      message: body.msg || '',
      userRole: body.profile?.userRole || 'viewer',
      timestamp: new Date(),
    };

    console.log(`[${this.config.channelId}] ${chatMessage.username}: ${chatMessage.message}`);
    this.emit('chat', chatMessage);
  }

  private handleDonation(body: any): void {
    const donationMessage: DonationMessage = {
      username: body.profile?.nickname || 'Anonymous',
      amount: body.extras?.payAmount || 0,
      message: body.msg,
      timestamp: new Date(),
    };

    console.log(`[${this.config.channelId}] ${donationMessage.username} donated ${donationMessage.amount}원`);
    this.emit('donation', donationMessage);
  }

  private handleSubscription(body: any): void {
    console.log(`[${this.config.channelId}] Subscription: ${body.profile?.nickname}`);
    this.emit('subscription', {
      username: body.profile?.nickname || 'Anonymous',
      timestamp: new Date(),
    });
  }

  private handleSystemMessage(body: any): void {
    console.log(`[${this.config.channelId}] System: ${body.msg}`);
    this.emit('system', {
      message: body.msg,
      timestamp: new Date(),
    });
  }

  private onError(error: Error): void {
    console.error(`WebSocket error for channel ${this.config.channelId}:`, error);
    this.emit('error', error);
  }

  private onClose(): void {
    console.log(`WebSocket closed for channel: ${this.config.channelId}`);
    this.emit('disconnected');
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // 자동 재연결
    this.reconnect();
  }

  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnect attempts reached for channel ${this.config.channelId}`);
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting channel ${this.config.channelId} in ${delay}ms... (Attempt ${this.reconnectAttempts})`);

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.connect();
      this.reconnectAttempts = 0; // 성공 시 리셋
    } catch (error) {
      console.error(`Reconnect failed for channel ${this.config.channelId}:`, error);
      await this.reconnect();
    }
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    if (this.ws) {
      this.ws.close();
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
