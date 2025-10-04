// 봇 계정 관리 API (유멜론 봇 전용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptBotData, decryptBotData } from '@/lib/bot/encryption';

export async function GET(request: NextRequest) {
  try {
    const accounts = await (prisma as any).botAccount.findMany({
      where: { isActive: true },
      select: {
        id: true,
        accountName: true,
        isActive: true,
        channelCount: true,
        maxChannels: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching bot accounts:', error);
    return NextResponse.json(
      { error: '봇 계정 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountName, nidAuth, nidSession } = body;

    if (!accountName || !nidAuth || !nidSession) {
      return NextResponse.json(
        { error: '계정명, NID_AUT, NID_SES가 모두 필요합니다.' },
        { status: 400 }
      );
    }

    // 쿠키 값 정리 (NID_AUT=, NID_SES= 접두사 제거)
    const cleanNidAuth = nidAuth.replace(/^NID_AUT=/, '');
    const cleanNidSession = nidSession.replace(/^NID_SES=/, '');
    
    // 쿠키 암호화
    const encryptedNidAuth = encryptBotData(cleanNidAuth);
    const encryptedNidSession = encryptBotData(cleanNidSession);

    try {
      // 기존 계정 확인 (디버깅용)
      const existingAccount = await (prisma as any).botAccount.findUnique({
        where: { accountName },
        select: { id: true, accountName: true, isActive: true }
      });
      
      if (existingAccount) {
        console.log('기존 계정 발견:', existingAccount);
        return NextResponse.json(
          { error: '이미 존재하는 계정명입니다. 다른 계정명을 사용해주세요.' },
          { status: 409 }
        );
      }

      console.log('새 계정 생성 시도:', { accountName, nidAuthLength: cleanNidAuth.length, nidSessionLength: cleanNidSession.length });
      
      const account = await (prisma as any).botAccount.create({
        data: {
          accountName,
          nidAuth: encryptedNidAuth,
          nidSession: encryptedNidSession,
          isActive: true,
          channelCount: 0,
          maxChannels: 10, // 기본값: 한 계정당 최대 10개 채널 관리
        },
      });

      console.log('계정 생성 성공:', account.id);
      return NextResponse.json(account, { status: 201 });
    } catch (error: any) {
      console.error('계정 생성 에러:', error);
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: '이미 존재하는 계정명입니다. 다른 계정명을 사용해주세요.' },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating bot account:', error);
    return NextResponse.json(
      { error: '봇 계정 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}


