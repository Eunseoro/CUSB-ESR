import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { del as blobDel } from '@vercel/blob';
import { processImagesForUpload } from '@/lib/imageUtils';

// 게시물 목록 조회 (이미지 포함)
export async function GET() {
  try {
    const posts = await prisma.lookBookPost.findMany({
      orderBy: { createdAt: "desc" },
      include: { 
        images: {
          orderBy: { order: "asc" }
        }
      },
    });
    return NextResponse.json(posts);
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
}

// 게시물 생성 (여러 이미지 업로드)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const uploader = formData.get('uploader') as string;
    const files = formData.getAll('files'); // 여러 파일
    const imageOrders = formData.getAll('imageOrders'); // 이미지 순서
    
    if (!title || !content || !uploader || files.length === 0) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 });
    }
    
    // 게시물 생성
    const post = await prisma.lookBookPost.create({
      data: { title, content, uploader },
    });
    
    // 이미지 WebP 변환 및 업로드
    const fileArray = files as File[];
    const processedImages = await processImagesForUpload(fileArray, 75);
    
    // 이미지 업로드 및 DB 저장
    const imageCreates = await Promise.all(processedImages.map(async (processedImage, index) => {
      const file = processedImage.file;
      const order = parseInt(imageOrders[index] as string) || index;
      
      const uniqueFilename = `${Date.now()}-${index}-${file.name}`;
      const blob = await put(uniqueFilename, file, { access: 'public' });
      
      return prisma.lookBookPostImage.create({
        data: { 
          imageUrl: blob.url, 
          postId: post.id,
          order: order
        },
      });
    }));
    
    return NextResponse.json({ ...post, images: imageCreates });
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
}

// 게시물 수정 (제목, 내용, 이미지 추가/삭제/순서 변경)
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get('id') as string;
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const files = formData.getAll('files');
    const imageOrders = formData.getAll('imageOrders');
    const removeImageIds = formData.getAll('removeImageIds');
    const reorderImages = formData.getAll('reorderImages'); // 기존 이미지 순서 변경
    
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
      // 삭제할 이미지들의 URL 조회
      const imagesToDelete = await prisma.lookBookPostImage.findMany({
        where: { id: { in: removeImageIds as string[] }, postId: id }
      });
      
      // Blob에서 이미지 삭제 (실패해도 무시)
      await Promise.all(imagesToDelete.map(async (img) => {
        try {
          const url = img.imageUrl;
          const parts = url.split('/');
          const filename = parts[parts.length - 1];
          await blobDel(filename);
        } catch (e) {
          console.log('Blob 삭제 실패:', e);
        }
      }));
      
      // DB에서 이미지 삭제
      await prisma.lookBookPostImage.deleteMany({ 
        where: { id: { in: removeImageIds as string[] }, postId: id } 
      });
    }
    
    // 기존 이미지 순서 변경
    if (reorderImages.length > 0) {
      const reorderData = JSON.parse(reorderImages[0] as string);
      await Promise.all(reorderData.map((item: { id: string; order: number }) => {
        return prisma.lookBookPostImage.update({
          where: { id: item.id, postId: id },
          data: { order: item.order }
        });
      }));
    }
    
    // 새 이미지 업로드 (WebP 변환)
    if (files.length > 0) {
      const fileArray = files as File[];
      const processedImages = await processImagesForUpload(fileArray, 75);
      
      await Promise.all(processedImages.map(async (processedImage, index) => {
        const file = processedImage.file;
        const order = parseInt(imageOrders[index] as string) || index;
        
        const uniqueFilename = `${Date.now()}-${index}-${file.name}`;
        const blob = await put(uniqueFilename, file, { access: 'public' });
        
        return prisma.lookBookPostImage.create({
          data: { 
            imageUrl: blob.url, 
            postId: id,
            order: order
          },
        });
      }));
    }
    
    // 수정된 게시물 반환
    const post = await prisma.lookBookPost.findUnique({
      where: { id },
      include: { 
        images: {
          orderBy: { order: "asc" }
        }
      },
    });
    return NextResponse.json(post);
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
}

// 게시물 삭제 (이미지 포함)
export async function DELETE(req: NextRequest) {
  try {
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
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
} 