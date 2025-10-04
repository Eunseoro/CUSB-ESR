// 방송 상태 모니터링 (유멜론 봇 전용)
import { PrismaClient } from '@prisma/client';
import { getChzzkChannelInfo } from '@/lib/bot/chzzk-api';

export class LiveMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private channels: Map<string, boolean> = new Map(); // channelId -> isLive
  private prisma: PrismaClient;
  private onLiveStart?: (channelId: string) => void;
  private onLiveEnd?: (channelId: string) => void;
  private isBotConnected?: (channelId: string) => boolean;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  start(pollInterval: number = 30000): void {
    console.log('📺 방송 상태 모니터링 시작...');
    
    this.intervalId = setInterval(async () => {
      await this.checkAllChannels();
    }, pollInterval);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('📺 방송 상태 모니터링 중지');
  }

  setLiveStartCallback(callback: (channelId: string) => void): void {
    this.onLiveStart = callback;
  }

  setLiveEndCallback(callback: (channelId: string) => void): void {
    this.onLiveEnd = callback;
  }

  private async checkAllChannels(): Promise<void> {
    try {
      // 활성화된 모든 채널 조회
      const configs = await (this.prisma as any).botConfig.findMany({
        where: { isActive: true },
        select: { channelId: true, isLive: true },
      });

      for (const config of configs) {
        await this.checkChannel(config.channelId, config.isLive);
      }
    } catch (error) {
      console.error('Error checking channels:', error);
    }
  }

  private async checkChannel(channelId: string, currentIsLive: boolean): Promise<void> {
    try {
      // 이미 봇이 연결된 채널은 확인하지 않음 (Bot Manager에서 관리)
      if (this.isBotConnected && this.isBotConnected(channelId)) {
        return;
      }

      console.log(`🔍 채널 ${channelId} 상태 확인 중...`);
      const channelInfo = await getChzzkChannelInfo(channelId);
      const isLive = channelInfo.isLive;
      console.log(`📊 채널 ${channelId} 상태: ${isLive ? '방송 중' : '방송 종료'} (${channelInfo.channelName})`);
      const wasLive = this.channels.get(channelId) || currentIsLive;

      // 상태 변경 감지
      if (!wasLive && isLive) {
        // 방송 시작
        console.log(`📺 채널 ${channelId} 방송 시작: ${channelInfo.liveTitle || '제목 없음'}`);
        this.onLiveStart?.(channelId);
        
        // DB 업데이트
        await (this.prisma as any).botConfig.updateMany({
          where: { channelId },
          data: { isLive: true },
        });
      } else if (wasLive && !isLive) {
        // 방송 종료
        console.log(`📺 채널 ${channelId} 방송 종료`);
        this.onLiveEnd?.(channelId);
        
        // DB 업데이트
        await (this.prisma as any).botConfig.updateMany({
          where: { channelId },
          data: { isLive: false },
        });
      }

      this.channels.set(channelId, isLive);
    } catch (error) {
      console.error(`Error checking channel ${channelId}:`, error);
    }
  }

  getChannelStatus(channelId: string): boolean {
    return this.channels.get(channelId) || false;
  }

  getAllChannelStatus(): Map<string, boolean> {
    return new Map(this.channels);
  }
}
