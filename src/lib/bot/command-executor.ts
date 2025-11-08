// 봇 명령어 실행 엔진 (유멜론 봇 전용)
import { PrismaClient } from '@prisma/client';

// 임시 타입 정의
interface BotCommand {
  id: string;
  configId: string;
  trigger: string;
  response: string;
  permission: string;
  cooldown: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
import { sendChzzkChatMessage } from './chzzk-api';

export class BotCommandExecutor {
  private prisma: PrismaClient;
  private cooldowns: Map<string, number> = new Map(); // commandId -> lastExecutedTime

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async execute(
    configId: string,
    message: string,
    chatData: { username: string; userRole: string }
  ): Promise<void> {
    const trigger = message.split(' ')[0]; // "!공지"

    // 명령어 조회
    const command = await (this.prisma as any).botCommand.findFirst({
      where: {
        configId,
        trigger,
        isActive: true,
      },
    });

    if (!command) return;

    // 권한 체크
    if (!this.checkPermission(command, chatData.userRole)) {
      return;
    }

    // 쿨다운 체크
    if (!this.checkCooldown(command)) {
      return;
    }

    // 명령어 실행
    await this.executeCommand(configId, command, chatData);
  }

  private checkPermission(command: BotCommand, userRole: string): boolean {
    switch (command.permission) {
      case 'streamer':
        return userRole === 'streamer';
      case 'moderator':
        return ['streamer', 'moderator'].includes(userRole);
      case 'subscriber':
        return ['streamer', 'moderator', 'subscriber'].includes(userRole);
      case 'everyone':
        return true;
      default:
        return false;
    }
  }

  private checkCooldown(command: BotCommand): boolean {
    if (command.cooldown === 0) return true;

    const now = Date.now();
    const lastExecuted = this.cooldowns.get(command.id) || 0;
    const timePassed = (now - lastExecuted) / 1000;

    if (timePassed < command.cooldown) {
      return false;
    }

    this.cooldowns.set(command.id, now);
    return true;
  }

  private async executeCommand(
    configId: string,
    command: BotCommand,
    chatData: { username: string; userRole: string }
  ): Promise<void> {
    // 봇 설정 조회
    const config = await (this.prisma as any).botConfig.findUnique({
      where: { id: configId },
    });

    if (!config || !config.accessToken) {
      console.error('Bot config or access token not found');
      return;
    }

    // 변수 치환
    let response = command.response;
    response = response.replace(/{user}/g, chatData.username);
    response = response.replace(/{channel}/g, config.channelName);
    response = response.replace(/{time}/g, new Date().toLocaleTimeString('ko-KR'));
    response = response.replace(/{date}/g, new Date().toLocaleDateString('ko-KR'));

    // 채팅 메시지 전송
    try {
      await sendChzzkChatMessage(
        config.channelId,
        response,
        config.accessToken
      );
      console.log(`Command executed: ${command.trigger} -> ${response}`);
    } catch (error) {
      console.error(`Failed to send command response:`, error);
    }
  }

  // 기본 명령어들 (노래 검색 등)
  async executeBuiltinCommand(
    configId: string,
    message: string,
    chatData: { username: string; userRole: string }
  ): Promise<void> {
    const config = await (this.prisma as any).botConfig.findUnique({
      where: { id: configId },
    });

    if (!config || !config.accessToken) {
      return;
    }

    const args = message.split(' ');
    const command = args[0];

    switch (command) {
      case '!노래':
        await this.handleSongSearch(config, args.slice(1).join(' '), chatData);
        break;
      case '!통계':
        await this.handleStats(config, chatData);
        break;
      case '!도움말':
        await this.handleHelp(config, chatData);
        break;
    }
  }

  private async handleSongSearch(
    config: BotConfig,
    query: string,
    chatData: { username: string; userRole: string }
  ): Promise<void> {
    if (!query.trim()) {
      await this.sendMessage(config, '검색할 노래 제목을 입력해주세요! (예: !노래 아이유)');
      return;
    }

    try {
      // 노래 검색 (기존 Song 모델 활용)
      const songs = await (this.prisma as any).song.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { artist: { contains: query, mode: 'insensitive' } },
          ],
          isPublic: true,
        },
        take: 3,
        orderBy: { likeCount: 'desc' },
      });

      if (songs.length === 0) {
        await this.sendMessage(config, `"${query}"에 대한 검색 결과가 없습니다.`);
        return;
      }

      let response = `🎵 "${query}" 검색 결과:\n`;
      songs.forEach((song: { artist: string; title: string; likeCount: number }, index: number) => {
        response += `${index + 1}. ${song.artist} - ${song.title} (좋아요 ${song.likeCount}개)\n`;
      });

      await this.sendMessage(config, response);
    } catch (error) {
      console.error('Error searching songs:', error);
      await this.sendMessage(config, '노래 검색 중 오류가 발생했습니다.');
    }
  }

  private async handleStats(
    config: BotConfig,
    chatData: { username: string; userRole: string }
  ): Promise<void> {
    try {
      // 통계 정보 수집
      const totalSongs = await (this.prisma as any).song.count({ where: { isPublic: true } });
      const totalLikes = await (this.prisma as any).songLike.count();
      const todayVisitors = await (this.prisma as any).visitorCount.findFirst({
        where: { date: new Date() },
      });

      const response = `📊 유할매 노래책 통계:
🎵 총 노래: ${totalSongs}곡
❤️ 총 좋아요: ${totalLikes}개
👥 오늘 방문자: ${todayVisitors?.count || 0}명`;

      await this.sendMessage(config, response);
    } catch (error) {
      console.error('Error getting stats:', error);
      await this.sendMessage(config, '통계 조회 중 오류가 발생했습니다.');
    }
  }

  private async handleHelp(
    config: BotConfig,
    chatData: { username: string; userRole: string }
  ): Promise<void> {
    const response = `🤖 유멜론 봇 도움말:
!노래 [제목] - 노래 검색
!통계 - 노래책 통계
!도움말 - 이 도움말 표시

더 많은 명령어는 관리자에게 문의하세요!`;

    await this.sendMessage(config, response);
  }

  private async sendMessage(config: BotConfig, message: string): Promise<void> {
    if (!config.accessToken) return;

    try {
      await sendChzzkChatMessage(config.channelId, message, config.accessToken);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
}
