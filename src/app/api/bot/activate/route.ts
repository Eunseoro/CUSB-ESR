// 봇 활성화/비활성화 API (유멜론 봇 전용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, isActive } = body;

    if (!channelId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: '채널 ID와 활성화 상태가 필요합니다.' },
        { status: 400 }
      );
    }

    const config = await (prisma as any).botConfig.update({
      where: { channelId },
      data: { 
        isActive,
        ...(isActive ? { lastConnected: new Date() } : { lastDisconnected: new Date() }),
      },
    });

    // Redis Pub/Sub으로 Worker에게 상태 변경 알림
    const { publishBotControl } = await import('@/lib/bot/redis');
    await publishBotControl(
      isActive ? 'connect' : 'disconnect',
      channelId
    );

    return NextResponse.json({ 
      success: true, 
      message: isActive ? '봇이 활성화되었습니다.' : '봇이 비활성화되었습니다.' 
    });
  } catch (error) {
    console.error('Error toggling bot status:', error);
    return NextResponse.json(
      { error: '봇 상태 변경 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
