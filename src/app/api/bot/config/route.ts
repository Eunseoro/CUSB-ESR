// 봇 설정 관리 API (유멜론 봇 전용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json({ error: '채널 ID가 필요합니다.' }, { status: 400 });
    }

    const config = await (prisma as any).botConfig.findUnique({
      where: { channelId },
      include: {
        commands: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: '봇 설정을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching bot config:', error);
    return NextResponse.json(
      { error: '봇 설정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, channelName, welcomeMessage, autoReplyEnabled, moderationEnabled, donationAlertEnabled, botAccountId } = body;

    if (!channelId || !channelName) {
      return NextResponse.json(
        { error: '채널 ID와 채널명이 필요합니다.' },
        { status: 400 }
      );
    }

    const config = await (prisma as any).botConfig.upsert({
      where: { channelId },
      update: {
        channelName,
        welcomeMessage,
        autoReplyEnabled: autoReplyEnabled ?? true,
        moderationEnabled: moderationEnabled ?? false,
        donationAlertEnabled: donationAlertEnabled ?? true,
        botAccountId: botAccountId || null,
      },
      create: {
        channelId,
        channelName,
        welcomeMessage,
        autoReplyEnabled: autoReplyEnabled ?? true,
        moderationEnabled: moderationEnabled ?? false,
        donationAlertEnabled: donationAlertEnabled ?? true,
        botAccountId: botAccountId || null,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating bot config:', error);
    return NextResponse.json(
      { error: '봇 설정 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { channelId, ...updateData } = body;

    if (!channelId) {
      return NextResponse.json(
        { error: '채널 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    const config = await (prisma as any).botConfig.update({
      where: { channelId },
      data: updateData,
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating bot config:', error);
    return NextResponse.json(
      { error: '봇 설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
