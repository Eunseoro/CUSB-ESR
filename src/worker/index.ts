// 유멜론 봇 워커 메인 프로세스
import { BotManager } from './bot-manager';
import { LiveMonitor } from './live-monitor';
import { subscribeBotControl } from '@/lib/bot/redis';
import { PrismaClient } from '@prisma/client';
import http from 'http';

const prisma = new PrismaClient();
const botManager = new BotManager();
const liveMonitor = new LiveMonitor(prisma);

// Render가 포트를 감지할 수 있도록 간단한 HTTP 서버 시작
function startHealthCheckServer() {
  const port = process.env.PORT || 10000;
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        service: 'chzzk-bot-worker',
        timestamp: new Date().toISOString()
      }));
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`🏥 헬스체크 서버 시작: 포트 ${port}`);
  });

  return server;
}

async function initializeBotManager() {
  const maxRetries = 5;
  const retryDelay = 10000; // 10초

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 봇 매니저 초기화 시도 ${attempt}/${maxRetries}...`);
      await botManager.initialize();
      return true; // 성공
    } catch (error) {
      console.error(`❌ 초기화 시도 ${attempt} 실패:`, error);
      
      if (attempt < maxRetries) {
        console.log(`⏳ ${retryDelay / 1000}초 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error('❌ 최대 재시도 횟수 초과. 봇 워커는 계속 실행되지만 초기화되지 않았습니다.');
        return false; // 실패
      }
    }
  }
  
  return false;
}

// 데이터베이스 연결 확인
async function checkDatabaseConnection(): Promise<boolean> {
  try {
    console.log('🔍 데이터베이스 연결 확인 중...');
    await prisma.$connect();
    console.log('✅ 데이터베이스 연결 성공');
    return true;
  } catch (error: any) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    console.error('💡 DATABASE_URL 환경 변수를 확인하세요.');
    console.error('💡 데이터베이스가 외부 연결을 허용하는지 확인하세요.');
    return false;
  }
}

async function main() {
  console.log('🤖 유멜론 봇 워커 시작...');

  // 헬스체크 서버 시작 (Render 포트 감지용)
  const healthServer = startHealthCheckServer();

  // 1단계: 데이터베이스 연결 확인
  const dbConnected = await checkDatabaseConnection();
  
  if (!dbConnected) {
    console.warn('⚠️ 데이터베이스 연결 실패. LiveMonitor는 시작하지 않습니다.');
    console.warn('⚠️ 데이터베이스 연결이 복구되면 수동으로 재시작하세요.');
  }

  // 2단계: Bot Manager 초기화 (재시도 로직 포함)
  const initialized = await initializeBotManager();

  if (!initialized) {
    console.warn('⚠️ 봇 매니저 초기화 실패. 프로세스는 계속 실행되며 주기적으로 재시도합니다.');
    
    // 주기적으로 재시도 (30분마다)
    setInterval(async () => {
      console.log('🔄 봇 매니저 재초기화 시도...');
      try {
        await botManager.initialize();
        console.log('✅ 봇 매니저 재초기화 성공');
      } catch (error) {
        console.error('❌ 봇 매니저 재초기화 실패:', error);
      }
    }, 1800000); // 30분마다
  }

  // 3단계: Live Monitor 시작 (데이터베이스 연결 성공 시에만)
  if (dbConnected) {
    liveMonitor.setLiveStartCallback((channelId) => {
      console.log(`📺 채널 ${channelId} 방송 시작 - 봇 연결 시도`);
      // TODO: 봇 연결 로직
    });

    liveMonitor.setLiveEndCallback((channelId) => {
      console.log(`📺 채널 ${channelId} 방송 종료 - 봇 연결 해제`);
      botManager.disconnectChannel(channelId);
    });

    liveMonitor.start(30000); // 30초마다 확인
    console.log('✅ Live Monitor 시작됨');
  } else {
    console.warn('⚠️ Live Monitor는 데이터베이스 연결 후에 시작됩니다.');
    
    // 데이터베이스 연결 재시도 (5분마다)
    const dbRetryInterval = setInterval(async () => {
      const connected = await checkDatabaseConnection();
      if (connected) {
        clearInterval(dbRetryInterval);
        console.log('✅ 데이터베이스 연결 복구됨. Live Monitor 시작...');
        liveMonitor.setLiveStartCallback((channelId) => {
          console.log(`📺 채널 ${channelId} 방송 시작 - 봇 연결 시도`);
        });
        liveMonitor.setLiveEndCallback((channelId) => {
          console.log(`📺 채널 ${channelId} 방송 종료 - 봇 연결 해제`);
          botManager.disconnectChannel(channelId);
        });
        liveMonitor.start(30000);
      }
    }, 300000); // 5분마다
  }

  // Redis Pub/Sub으로 실시간 제어
  try {
    await subscribeBotControl(async (command) => {
      console.log(`[Worker] Received control command: ${command.action} for ${command.channelId}`);

      const config = await (prisma as any).botConfig.findUnique({
        where: { channelId: command.channelId },
      });

      if (!config) {
        console.warn(`[Worker] BotConfig not found for channelId: ${command.channelId}`);
        return;
      }

      switch (command.action) {
        case 'connect':
          await botManager.connectChannel(config);
          break;
        case 'disconnect':
          await botManager.disconnectChannel(config.channelId);
          break;
        case 'reload':
          // TODO: 설정 리로드 로직 구현
          console.log(`[Worker] Reload command received for ${config.channelId}. (Not yet implemented)`);
          break;
        default:
          console.warn(`[Worker] Unknown control command action: ${command.action}`);
      }
    });
  } catch (error) {
    console.error('❌ Redis Pub/Sub 구독 실패:', error);
    console.log('⚠️ Redis가 없어도 봇은 계속 실행됩니다.');
  }

  // 메모리 사용량 모니터링 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const used = process.memoryUsage();
      console.log('💾 메모리 사용량:');
      console.log(`  RSS: ${Math.round(used.rss / 1024 / 1024)} MB`);
      console.log(`  Heap Used: ${Math.round(used.heapUsed / 1024 / 1024)} MB`);
      console.log(`  Heap Total: ${Math.round(used.heapTotal / 1024 / 1024)} MB`);

      // 메모리 사용량이 임계치 초과 시 경고
      if (used.heapUsed / used.heapTotal > 0.9) {
        console.warn('⚠️ 높은 메모리 사용량 감지!');
      }
    }, 300000); // 5분마다 (개발 환경에서만)
  }

  // 상태 리포트
  setInterval(() => {
    const connectedChannels = botManager.getConnectedChannels();
    console.log(`📊 현재 연결된 채널: ${connectedChannels.length}개`);
    console.log(`📊 연결된 채널 목록: ${connectedChannels.join(', ')}`);
  }, 300000); // 5분마다

  console.log('✅ 유멜론 봇 워커 실행 중...');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM 수신, 종료 중...');
  await shutdown();
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT 수신, 종료 중...');
  await shutdown();
});

async function shutdown() {
  try {
    liveMonitor.stop();
    await botManager.shutdown();
    await prisma.$disconnect();
    console.log('✅ 유멜론 봇 워커 종료 완료');
    process.exit(0);
  } catch (error) {
    console.error('❌ 종료 중 오류:', error);
    process.exit(1);
  }
}

// 에러 핸들링
process.on('uncaughtException', (error) => {
  console.error('❌ 처리되지 않은 예외:', error);
  // 프로세스를 종료하지 않고 로그만 남김 (봇 워커는 계속 실행되어야 함)
  console.log('⚠️ 예외가 발생했지만 프로세스는 계속 실행됩니다.');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 처리되지 않은 Promise 거부:', reason);
  // 프로세스를 종료하지 않고 로그만 남김 (봇 워커는 계속 실행되어야 함)
  console.log('⚠️ Promise 거부가 발생했지만 프로세스는 계속 실행됩니다.');
});

main().catch((error) => {
  console.error('❌ 메인 프로세스 실패:', error);
  // 프로세스를 종료하지 않고 계속 실행 (재시도 가능)
  console.log('⚠️ 프로세스는 계속 실행됩니다. 문제가 지속되면 수동으로 재시작하세요.');
  
  // 무한 루프 방지를 위해 일정 시간 후 재시도
  setTimeout(() => {
    console.log('🔄 메인 프로세스 재시도...');
    main().catch((err) => {
      console.error('❌ 재시도 실패:', err);
    });
  }, 60000); // 1분 후 재시도
});

