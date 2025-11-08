// Redis 클라이언트 (봇 제어용)
import Redis from 'ioredis';

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        // 최대 3번 재시도 후 포기
        if (times > 3) {
          console.warn('⚠️ Redis 연결 실패. Redis 없이 계속 실행합니다.');
          return null; // 재시도 중단
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    // 에러 핸들러 추가
    redis.on('error', (error) => {
      console.warn('⚠️ Redis 연결 오류:', error.message);
      console.warn('⚠️ Redis 없이 계속 실행합니다.');
    });

    redis.on('connect', () => {
      console.log('✅ Redis 연결 성공');
    });
  } catch (error) {
    console.warn('⚠️ Redis 초기화 실패:', error);
    console.warn('⚠️ Redis 없이 계속 실행합니다.');
    redis = null;
  }
}

export async function publishBotControl(action: string, channelId: string, data?: any) {
  if (!redis) {
    console.log(`Redis not available, skipping bot control: ${action} for ${channelId}`);
    return;
  }
  
  const message = JSON.stringify({
    action,
    channelId,
    data,
    timestamp: new Date().toISOString(),
  });
  
  await redis.publish('bot:control', message);
  console.log(`Published bot control: ${action} for ${channelId}`);
}

export async function subscribeBotControl(callback: (message: any) => void) {
  if (!redis) {
    console.log('Redis not available, bot control subscription disabled');
    return;
  }
  
  redis.subscribe('bot:control', (err) => {
    if (err) {
      console.error('Failed to subscribe to bot:control:', err);
    } else {
      console.log('Subscribed to bot:control channel');
    }
  });

  redis.on('message', (channel, message) => {
    if (channel === 'bot:control') {
      try {
        const parsedMessage = JSON.parse(message);
        callback(parsedMessage);
      } catch (error) {
        console.error('Failed to parse bot control message:', error);
      }
    }
  });
}

export { redis };
