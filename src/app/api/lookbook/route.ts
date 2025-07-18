import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { del as blobDel } from '@vercel/blob';

// 게시물 목록 조회 (이미지 포함)
export async function GET() {
  const posts = await prisma.lookBookPost.findMany({
    orderBy: { createdAt: "desc" },
    include: { images: true },
  });
  return NextResponse.json(posts);
}

// 게시물 생성 (여러 이미지 업로드)
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const uploader = formData.get('uploader') as string;
  const files = formData.getAll('files'); // 여러 파일
  if (!title || !content || !uploader || files.length === 0) {
    return NextResponse.json({ error: '필수값 누락' }, { status: 400 });
  }
  // 게시물 생성
  const post = await prisma.lookBookPost.create({
    data: { title, content, uploader },
  });
  // 이미지 업로드 및 DB 저장 (중복 파일명 최적화)
  const imageCreates = await Promise.all(files.map(async (file: any) => {
    if (!(file instanceof File)) return null;
    const filename = file.name;
    // DB에 동일 파일명 있는지 확인
    const exist = await prisma.lookBookPostImage.findFirst({
      where: { imageUrl: { contains: `/${filename}` } },
    });
    if (exist) {
      // 기존 이미지 URL 재사용
      return prisma.lookBookPostImage.create({
        data: { imageUrl: exist.imageUrl, postId: post.id },
      });
    } else {
      const uniqueFilename = `${Date.now()}-${filename}`;
      const blob = await put(uniqueFilename, file, { access: 'public' });
      return prisma.lookBookPostImage.create({
        data: { imageUrl: blob.url, postId: post.id },
      });
    }
  }));
  return NextResponse.json({ ...post, images: imageCreates.filter(Boolean) });
}

// 게시물 수정 (제목, 내용, 이미지 추가/삭제)
export async function PUT(req: NextRequest) {
  const formData = await req.formData();
  const id = formData.get('id') as string;
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const files = formData.getAll('files');
  const removeImageIds = formData.getAll('removeImageIds');
  if (!id || !title || !content) {
    return NextResponse.json({ error: '필수값 누락' }, { status: 400 });
  }
  // 게시물 수정
  await prisma.lookBookPost.update({
    where: { id },
    data: { title, content },
  });
  // 이미지 삭제
  if (removeImageIds.length > 0) {
    await prisma.lookBookPostImage.deleteMany({ where: { id: { in: removeImageIds as string[] }, postId: id } });
  }
  // 새 이미지 업로드 (중복 파일명 최적화)
  if (files.length > 0) {
    await Promise.all(files.map(async (file: any) => {
      if (!(file instanceof File)) return null;
      const filename = file.name;
      // DB에 동일 파일명 있는지 확인
      const exist = await prisma.lookBookPostImage.findFirst({
        where: { imageUrl: { contains: `/${filename}` } },
      });
      if (exist) {
        // 기존 이미지 URL 재사용
        return prisma.lookBookPostImage.create({
          data: { imageUrl: exist.imageUrl, postId: id },
        });
      } else {
        const uniqueFilename = `${Date.now()}-${filename}`;
        const blob = await put(uniqueFilename, file, { access: 'public' });
        return prisma.lookBookPostImage.create({
          data: { imageUrl: blob.url, postId: id },
        });
      }
    }));
  }
  // 수정된 게시물 반환
  const post = await prisma.lookBookPost.findUnique({
    where: { id },
    include: { images: true },
  });
  return NextResponse.json(post);
}

// 게시물 삭제 (이미지 포함)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 });
  // 1. 해당 게시물의 이미지 URL 목록 조회
  const images = await prisma.lookBookPostImage.findMany({ where: { postId: id } });
  // 2. Blob에서 이미지 삭제 (실패해도 무시)
  await Promise.all(images.map(async (img) => {
    try {
      // blob url에서 파일 경로 추출 (https://.../blob/filename)
      const url = img.imageUrl;
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      await blobDel(filename);
    } catch (e) {}
  }));
  // 3. DB에서 이미지/게시물 삭제
  await prisma.lookBookPostImage.deleteMany({ where: { postId: id } });
  await prisma.lookBookPost.delete({ where: { id } });
  return NextResponse.json({ ok: true });
} 