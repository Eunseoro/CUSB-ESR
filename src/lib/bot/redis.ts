// Redis 클라이언트 (봇 제어용)
import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? 
  new Redis(process.env.REDIS_URL) : 
  null;

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
