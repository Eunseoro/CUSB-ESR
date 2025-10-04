// 봇 계정 인증 정보 조회 API (유멜론 봇 전용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptBotData } from '@/lib/bot/encryption';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // API 키 인증 (봇 워커에서만 접근 가능)
    const { verifyBotApiKey } = await import('@/lib/bot/auth');
    if (!verifyBotApiKey(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;

    const account = await (prisma as any).botAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        accountName: true,
        nidAuth: true,
        nidSession: true,
        isActive: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: '봇 계정을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 쿠키 복호화
    const credentials = {
      id: account.id,
      accountName: account.accountName,
      nidAuth: decryptBotData(account.nidAuth),
      nidSession: decryptBotData(account.nidSession),
      isActive: account.isActive,
    };

    return NextResponse.json(credentials);
  } catch (error) {
    console.error('Error fetching bot credentials:', error);
    return NextResponse.json(
      { error: '봇 계정 인증 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


