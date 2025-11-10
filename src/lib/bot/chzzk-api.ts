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
  // AbortController를 사용한 타임아웃 구현
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
  
  try {
    const response = await fetch(`https://api.chzzk.naver.com/service/v2/channels/${channelId}/live-detail`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeoutId);
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
      const errorText = await response.text();
      console.error(`❌ 채팅 메시지 전송 실패 (${response.status}):`, errorText);
      throw new Error(`Failed to send chat message: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    console.log(`✅ 채팅 메시지 전송 성공 (채널 ${channelId})`);
  } catch (error) {
    console.error('❌ 채팅 메시지 전송 오류:', error);
    throw error;
  }
}

// 봇 계정 인증 헤더 생성
export function createBotAuthHeaders(botAccount: BotAccount): HeadersInit {
  // botAccount의 nidAuth와 nidSession이 이미 복호화된 상태인지 확인
  // API에서 받은 값은 이미 복호화된 상태이므로, 암호화 형식(콜론 2개 포함)인지 확인
  const isEncrypted = (text: string): boolean => {
    if (!text) return false;
    const parts = text.split(':');
    return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32; // IV와 AuthTag는 각각 32자 hex
  };
  
  let nidAuth = botAccount.nidAuth;
  let nidSession = botAccount.nidSession;
  
  // 암호화된 형식이면 복호화, 아니면 그대로 사용
  if (isEncrypted(nidAuth)) {
    const { decryptBotData } = require('./encryption');
    nidAuth = decryptBotData(nidAuth);
  }
  
  if (isEncrypted(nidSession)) {
    const { decryptBotData } = require('./encryption');
    nidSession = decryptBotData(nidSession);
  }
  
  return {
    'Cookie': `NID_AUT=${nidAuth}; NID_SES=${nidSession}`,
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
    
    // 치지직 API 응답 형식 확인 (success 필드 또는 code 필드)
    if (data.code !== undefined && data.code !== 200) {
      throw new Error(`Failed to get chat channel info: code=${data.code}, message=${data.message || 'Unknown error'}`);
    }
    
    if (data.success === false) {
      throw new Error(`Failed to get chat channel info: ${JSON.stringify(data)}`);
    }
    
    // 응답 형식 확인 (content 필드 또는 직접 필드)
    const content = data.content || data;
    
    const result = {
      chatChannelId: content.chatChannelId || content.chatChannelId || '',
      accessToken: content.accessToken || content.accessToken || '',
      extraToken: content.extraToken || content.extraToken || '',
    };

    if (!result.chatChannelId || !result.accessToken) {
      console.error('❌ 채팅 채널 정보가 불완전합니다:', result);
      throw new Error(`채팅 채널 정보가 불완전합니다: chatChannelId=${result.chatChannelId}, accessToken=${result.accessToken ? '있음' : '없음'}`);
    }

    console.log(`✅ 채팅 정보 조회 성공:`, {
      chatChannelId: result.chatChannelId.substring(0, 20) + '...',
      accessToken: result.accessToken.substring(0, 20) + '...',
      hasExtraToken: !!result.extraToken,
    });
    return result;
  } catch (error) {
    console.error('❌ 채팅 채널 정보 조회 실패:', error);
    throw error;
  }
}
