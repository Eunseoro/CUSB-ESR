// 봇 명령어 개별 관리 API (유멜론 봇 전용)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ commandId: string }> }
) {
  try {
    const { commandId } = await params;
    const body = await request.json();

    const command = await (prisma as any).botCommand.update({
      where: { id: commandId },
      data: body,
    });

    return NextResponse.json(command);
  } catch (error) {
    console.error('Error updating bot command:', error);
    return NextResponse.json(
      { error: '명령어 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commandId: string }> }
) {
  try {
    const { commandId } = await params;

    await (prisma as any).botCommand.delete({
      where: { id: commandId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bot command:', error);
    return NextResponse.json(
      { error: '명령어 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
