// 활성화된 봇 설정 조회 API (봇 워커용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyBotApiKey } from '@/lib/bot/auth';

export async function GET(request: NextRequest) {
  if (!verifyBotApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const activeConfigs = await (prisma as any).botConfig.findMany({
      where: { isActive: true },
      include: {
        commands: {
          where: { isActive: true },
        },
      },
    });
    return NextResponse.json(activeConfigs);
  } catch (error) {
    console.error('Error fetching active bot configs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
