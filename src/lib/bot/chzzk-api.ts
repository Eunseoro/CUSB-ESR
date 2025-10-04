// 치지직 API 연동 라이브러리 (봇 전용)
// import { BotAccount } from '@prisma/client';

// 임시 타입 정의
interface BotAccount {
  id: string;
  accountName: string;
  nidAuth: string;
  nidSession: string;
  isActive: boolean;
  channelCount: number;
  maxChannels: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChzzkChannelInfo {
  channelId: string;
  channelName: string;
  isLive: boolean;
  liveId?: string;
  liveTitle?: string;
  chatChannelId?: string;
}

export interface ChzzkChatMessage {
  message: string;
  username: string;
  userRole: 'streamer' | 'moderator' | 'subscriber' | 'follower' | 'viewer';
  timestamp: Date;
}

export interface ChzzkDonation {
  username: string;
  amount: number;
  message?: string;
  timestamp: Date;
}

// 치지직 채널 정보 조회
export async function getChzzkChannelInfo(channelId: string): Promise<ChzzkChannelInfo> {
  try {
    const response = await fetch(`https://api.chzzk.naver.com/service/v2/channels/${channelId}/live-detail`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      timeout: 10000, // 10초 타임아웃
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
      const data = await response.json();
      
      // 치지직 API는 success 필드가 없고, code: 200이 성공을 의미
      if (data.code !== 200) {
        console.log('치지직 API 응답:', JSON.stringify(data, null, 2));
        throw new Error(`Failed to fetch channel info: API returned code=${data.code}. Response: ${JSON.stringify(data)}`);
      }
    
    const content = data.content;
    return {
      channelId,
      channelName: content.channel?.channelName || content.channelName || 'Unknown',
      isLive: content.status === 'OPEN',
      liveId: content.liveId,
      liveTitle: content.liveTitle,
      chatChannelId: content.chatChannelId,
    };
  } catch (error) {
    console.error('Error fetching channel info:', error);
    // 네트워크 오류 시 기본값 반환
    return {
      channelId,
      channelName: 'Unknown',
      isLive: false,
    };
  }
}

// 채팅 메시지 전송 (공식 API)
export async function sendChzzkChatMessage(
  channelId: string,
  message: string,
  accessToken: string
): Promise<void> {
  try {
    const response = await fetch(
      `https://api.chzzk.naver.com/service/v1/channels/${channelId}/chat-messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send chat message: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

// 봇 계정 인증 헤더 생성
export function createBotAuthHeaders(botAccount: BotAccount): HeadersInit {
  // 암호화된 쿠키를 복호화
  const { decryptBotData } = require('./encryption');
  
  return {
    'Cookie': `NID_AUT=${decryptBotData(botAccount.nidAuth)}; NID_SES=${decryptBotData(botAccount.nidSession)}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  };
}

// 채팅 채널 정보 조회 (WebSocket 연결용)
export async function getChatChannelInfo(
  channelId: string,
  botAccount: BotAccount
): Promise<{ chatChannelId: string; accessToken: string; extraToken: string }> {
  try {
    console.log(`🔍 채널 ${channelId} 채팅 정보 조회 중...`);
    
    const response = await fetch(
      `https://api.chzzk.naver.com/polling/v2/channels/${channelId}/live-status`,
      {
        headers: createBotAuthHeaders(botAccount),
      }
    );
    
    console.log(`📊 채팅 정보 응답 상태: ${response.status}`);
    
    const data = await response.json();
    console.log(`📋 채팅 정보 응답:`, JSON.stringify(data, null, 2));
    
    if (!data.success) {
      throw new Error(`Failed to get chat channel info: ${JSON.stringify(data)}`);
    }
    
    const result = {
      chatChannelId: data.content.chatChannelId || '',
      accessToken: data.content.accessToken || '',
      extraToken: data.content.extraToken || '',
    };

    console.log(`✅ 채팅 정보 조회 성공:`, result);
    return result;
  } catch (error) {
    console.error('❌ 채팅 채널 정보 조회 실패:', error);
    throw error;
  }
}
