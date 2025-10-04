// 봇 계정 개별 관리 API (유멜론 봇 전용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptBotData, decryptBotData } from '@/lib/bot/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;

    const account = await (prisma as any).botAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        accountName: true,
        isActive: true,
        channelCount: true,
        maxChannels: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: '봇 계정을 찾을 수 없습니다.' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error fetching bot account:', error);
    return NextResponse.json(
      { error: '봇 계정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;
    const body = await request.json();
    const { accountName, nidAuth, nidSession, maxChannels } = body;

    const updateData: any = {};
    
    if (accountName) updateData.accountName = accountName;
    if (maxChannels !== undefined) updateData.maxChannels = maxChannels;
    
    // 쿠키가 제공된 경우에만 정리 후 암호화하여 업데이트
    if (nidAuth) {
      const cleanNidAuth = nidAuth.replace(/^NID_AUT=/, '');
      updateData.nidAuth = encryptBotData(cleanNidAuth);
    }
    if (nidSession) {
      const cleanNidSession = nidSession.replace(/^NID_SES=/, '');
      updateData.nidSession = encryptBotData(cleanNidSession);
    }

    const account = await (prisma as any).botAccount.update({
      where: { id: accountId },
      data: updateData,
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error updating bot account:', error);
    return NextResponse.json(
      { error: '봇 계정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;

    // 봇 계정 비활성화 (실제 삭제는 하지 않음)
    await (prisma as any).botAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating bot account:', error);
    return NextResponse.json(
      { error: '봇 계정 비활성화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


