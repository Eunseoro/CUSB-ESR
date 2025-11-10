// Redis 클라이언트 (봇 제어용)
import Redis from 'ioredis';

let redis: Redis | null = null;
let redisConnectionAttempted = false;
let redisConnectionFailed = false;

// Redis 연결 시도 (한 번만)
function initializeRedis() {
  if (redisConnectionAttempted) {
    return; // 이미 시도했으면 다시 시도하지 않음
  }
  
  redisConnectionAttempted = true;

  if (!process.env.REDIS_URL) {
    console.log('ℹ️ REDIS_URL이 설정되지 않았습니다. Redis 없이 실행합니다.');
    return;
  }

  try {
    console.log('🔌 Redis 연결 시도 중...');
    redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        // 최대 1번만 재시도
        if (times > 1) {
          console.warn('⚠️ Redis 연결 실패. Redis 없이 계속 실행합니다.');
          redisConnectionFailed = true;
          redis = null;
          return null; // 재시도 중단
        }
        return 1000; // 1초 후 재시도
      },
      maxRetriesPerRequest: 0, // 재시도 안 함
      enableOfflineQueue: false,
      connectTimeout: 5000, // 5초 타임아웃
      lazyConnect: false, // 즉시 연결 시도
    });

    // 에러 핸들러 추가
    redis.on('error', (error) => {
      if (!redisConnectionFailed) {
        console.warn('⚠️ Redis 연결 오류:', error.message);
        console.warn('⚠️ Redis 연결을 포기하고 Redis 없이 계속 실행합니다.');
        redisConnectionFailed = true;
        try {
          redis?.disconnect();
        } catch (e) {
          // 무시
        }
        redis = null;
      }
    });

    redis.on('connect', () => {
      console.log('✅ Redis 연결 성공');
      redisConnectionFailed = false;
    });

    // 연결 실패 감지 (타임아웃)
    setTimeout(() => {
      if (redis && !redis.status.includes('ready') && !redisConnectionFailed) {
        console.warn('⚠️ Redis 연결 타임아웃. Redis 없이 계속 실행합니다.');
        redisConnectionFailed = true;
        try {
          redis.disconnect();
        } catch (e) {
          // 무시
        }
        redis = null;
      }
    }, 6000); // 6초 후 확인
  } catch (error) {
    console.warn('⚠️ Redis 초기화 실패:', error);
    console.warn('⚠️ Redis 없이 계속 실행합니다.');
    redisConnectionFailed = true;
    redis = null;
  }
}

// 모듈 로드 시 Redis 초기화 시도
initializeRedis();

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
    console.log('⚠️ Redis not available, bot control subscription disabled');
    console.log('⚠️ 실시간 봇 제어 기능이 작동하지 않습니다. REDIS_URL 환경 변수를 설정하세요.');
    return;
  }
  
  // Redis 연결 상태 확인
  if (redis.status !== 'ready') {
    console.warn('⚠️ Redis가 아직 준비되지 않았습니다. 잠시 후 재시도합니다.');
    setTimeout(() => subscribeBotControl(callback), 2000);
    return;
  }
  
  redis.subscribe('bot:control', (err) => {
    if (err) {
      console.error('❌ Failed to subscribe to bot:control:', err);
      console.error('💡 Redis 연결 상태를 확인하세요.');
    } else {
      console.log('✅ Subscribed to bot:control channel');
    }
  });

  redis.on('message', (channel, message) => {
    if (channel === 'bot:control') {
      try {
        const parsedMessage = JSON.parse(message);
        console.log(`📨 Redis 메시지 수신: ${parsedMessage.action} for ${parsedMessage.channelId}`);
        callback(parsedMessage);
      } catch (error) {
        console.error('❌ Failed to parse bot control message:', error);
      }
    }
  });
}

export { redis };
