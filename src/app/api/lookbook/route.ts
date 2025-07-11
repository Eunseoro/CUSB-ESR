import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

export async function GET() {
  const images = await prisma.lookBookImage.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(images);
}

export async function POST(req: NextRequest) {
  const { imageUrl } = await req.json();
  const created = await prisma.lookBookImage.create({
    data: { imageUrl: imageUrl, uploader: "" },
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