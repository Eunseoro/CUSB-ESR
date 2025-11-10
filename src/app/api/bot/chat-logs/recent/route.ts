// 최근 채팅 로그 조회 API (대시보드용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const messageType = searchParams.get('messageType'); // chat, donation, subscription, system

    if (!configId) {
      return NextResponse.json({ error: 'configId가 필요합니다.' }, { status: 400 });
    }

    const where: any = { configId };
    if (messageType) {
      where.messageType = messageType;
    }

    const logs = await (prisma as any).botChatLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        username: true,
        message: true,
        messageType: true,
        timestamp: true,
      },
    });

    return NextResponse.json({
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('Error fetching chat logs:', error);
    return NextResponse.json(
      { error: '채팅 로그 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

