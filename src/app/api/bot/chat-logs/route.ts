// 채팅 로그 수신 API (봇 워커용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // API 키 인증 (봇 워커에서만 접근 가능)
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.BOT_WORKER_API_KEY;
    
    if (!authHeader || !apiKey || authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { configId, username, message, messageType } = body;

    if (!configId || !username || !message || !messageType) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      );
    }

    await (prisma as any).botChatLog.create({
      data: {
        configId,
        username,
        message,
        messageType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating chat log:', error);
    return NextResponse.json(
      { error: '채팅 로그 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}



