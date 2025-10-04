// 봇 명령어 관리 API (유멜론 봇 전용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('configId');

    if (!configId) {
      return NextResponse.json({ error: '설정 ID가 필요합니다.' }, { status: 400 });
    }

    const commands = await (prisma as any).botCommand.findMany({
      where: { configId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(commands);
  } catch (error) {
    console.error('Error fetching bot commands:', error);
    return NextResponse.json(
      { error: '명령어 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { configId, trigger, response, permission, cooldown } = body;

    if (!configId || !trigger || !response) {
      return NextResponse.json(
        { error: '설정 ID, 트리거, 응답이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!trigger.startsWith('!')) {
      return NextResponse.json(
        { error: '트리거는 !로 시작해야 합니다.' },
        { status: 400 }
      );
    }

    const command = await (prisma as any).botCommand.create({
      data: {
        configId,
        trigger,
        response,
        permission: permission || 'everyone',
        cooldown: cooldown || 0,
      },
    });

    return NextResponse.json(command, { status: 201 });
  } catch (error) {
    console.error('Error creating bot command:', error);
    return NextResponse.json(
      { error: '명령어 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
