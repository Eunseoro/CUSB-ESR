import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';

export async function GET() {
  const images = await prisma.lookBookImage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
  // FormData에서 파일 추출
  const formData = await req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: '파일이 필요합니다.' }, { status: 400 });
  }
  // Blob 업로드
  const filename = `${Date.now()}-${file.name}`;
  const blob = await put(filename, file, { access: 'public' });
  // DB 저장
  const created = await prisma.lookBookImage.create({
    data: { imageUrl: blob.url, uploader: '' },
  });
  return NextResponse.json(created);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 });
  await prisma.lookBookImage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
} 