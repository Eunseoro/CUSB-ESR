// 봇 상태 업데이트 API (봇 워커용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    // API 키 인증 (봇 워커에서만 접근 가능)
    const { verifyBotApiKey } = await import('@/lib/bot/auth');
    if (!verifyBotApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelId } = await params;
    const body = await request.json();
    const { isConnected, lastConnected, lastDisconnected, errorMessage } = body;

    const updateData: any = {};
    
    if (isConnected !== undefined) {
      updateData.isConnected = isConnected;
    }
    if (lastConnected) {
      updateData.lastConnected = new Date(lastConnected);
    }
    if (lastDisconnected) {
      updateData.lastDisconnected = new Date(lastDisconnected);
    }
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    await (prisma as any).botConfig.updateMany({
      where: { channelId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating bot status:', error);
    return NextResponse.json(
      { error: '봇 상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


