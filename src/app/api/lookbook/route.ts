import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { del as blobDel } from '@vercel/blob';
import { processImagesForUploadSequential, ProcessedImage } from '@/lib/imageUtils';
import { getKoreanTime } from '@/lib/timezone';

// Next.js 15에서 bodyParser 설정
export const runtime = 'nodejs';
export const maxDuration = 300; // 5분 타임아웃

// 게시물 목록 조회 (이미지 포함) - 페이지네이션 지원
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const id = searchParams.get('id'); // 개별 게시물 조회
    const action = searchParams.get('action'); // 조회수 증가
    const skip = (page - 1) * limit;
    
    // 조회수 증가 (기기별 중복 방지) - action=view가 있을 때 우선 실행
    if (action === 'view' && id) {
      console.log('조회수 증가 요청:', { id, action })
      
      // 더 안정적인 기기 식별을 위한 다중 방법 사용
      const userAgent = req.headers.get('user-agent') || 'unknown'
      const acceptLanguage = req.headers.get('accept-language') || 'unknown'
      const acceptEncoding = req.headers.get('accept-encoding') || 'unknown'
      const xForwardedFor = req.headers.get('x-forwarded-for') || ''
      const xRealIp = req.headers.get('x-real-ip') || ''
      
      // 모바일 환경을 고려한 더 안정적인 기기 식별
      const deviceFingerprint = `${userAgent.slice(0, 100)}_${acceptLanguage.slice(0, 30)}_${acceptEncoding.slice(0, 30)}_${xForwardedFor.slice(0, 20)}_${xRealIp.slice(0, 20)}`
      const deviceKey = `viewed_${id}_${Buffer.from(deviceFingerprint).toString('base64').slice(0, 50)}`
      
      // 다중 중복 방지 체크
      const hasViewed = req.cookies.get(deviceKey)
      
      // 1. 쿠키 기반 체크
      if (hasViewed) {
        console.log('이미 조회한 기기 (쿠키) - 조회수 증가 안함')
        const currentPost = await prisma.lookBookPost.findUnique({
          where: { id },
          select: { viewCount: true }
        })
        
        return NextResponse.json({
          viewCount: currentPost?.viewCount || 0,
          alreadyViewed: true
        });
      }
      
      // 2. 데이터베이스 레벨 중복 방지 (LookBookPostView 테이블 활용)
      const deviceId = Buffer.from(deviceFingerprint).toString('base64').slice(0, 50)
      const existingView = await prisma.lookBookPostView.findUnique({
        where: {
          postId_deviceId: {
            postId: id,
            deviceId: deviceId
          }
        }
      })
      
      if (existingView) {
        console.log('이미 조회한 기기 (DB) - 조회수 증가 안함')
        const currentPost = await prisma.lookBookPost.findUnique({
          where: { id },
          select: { viewCount: true }
        })
        
        return NextResponse.json({
          viewCount: currentPost?.viewCount || 0,
          alreadyViewed: true
        });
      }
      
      // 현재 조회수 확인
      const currentPost = await prisma.lookBookPost.findUnique({
        where: { id },
        select: { viewCount: true }
      })
      console.log('현재 조회수:', currentPost?.viewCount)
      
      // 트랜잭션으로 조회수 증가와 조회 기록 저장을 동시에 처리
      const result = await prisma.$transaction(async (tx) => {
        // 조회수 증가
        const updatedPost = await tx.lookBookPost.update({
          where: { id },
          data: {
            viewCount: {
              increment: 1
            }
          }
        });
        
        // 조회 기록 저장 (중복 방지)
        await tx.lookBookPostView.create({
          data: {
            postId: id,
            deviceId: deviceId
          }
        });
        
        return updatedPost;
      });
      
      console.log('업데이트된 조회수:', result.viewCount)

      // 모바일 환경을 고려한 쿠키 설정 개선
      return NextResponse.json({
        viewCount: result.viewCount,
        alreadyViewed: false
      }, {
        headers: {
          'Set-Cookie': `${deviceKey}=true; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax; Secure`
        }
      });
    }
    
    // 개별 게시물 조회
    if (id) {
      const post = await prisma.lookBookPost.findUnique({
        where: { id },
        include: {
          images: {
            orderBy: { order: 'asc' }
          }
        }
      });

      if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
      }

      return NextResponse.json(post);
    }
    
    // 전체 게시물 수 조회
    const totalCount = await prisma.lookBookPost.count();
    
    // 페이지네이션된 게시물 조회
    const posts = await prisma.lookBookPost.findMany({
      orderBy: { createdAt: "desc" },
      include: { 
        images: {
          orderBy: { order: "asc" }
        }
      },
      skip,
      take: limit
    });
    
    const hasMore = skip + limit < totalCount;
    
    return NextResponse.json({
      posts,
      hasMore,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
    });
  } finally {
    if (process.env.NODE_ENV !== 'production') {
      await prisma.$disconnect();
    }
  }
}

// 순차적 이미지 업로드 함수 (배치 처리 최적화)
async function uploadImagesSequentially(
  processedImages: ProcessedImage[], 
  imageOrders: number[], 
  postId: string
) {
  const imageCreates = [];
  const batchSize = 5; // 배치 크기
  
  for (let i = 0; i < processedImages.length; i += batchSize) {
    const batch = processedImages.slice(i, i + batchSize);
    const batchOrders = imageOrders.slice(i, i + batchSize);
    
    // 배치 내에서 병렬 처리
    const batchPromises = batch.map(async (processedImage, batchIndex) => {
      const globalIndex = i + batchIndex;
      try {
        const file = processedImage.file;
        const order = parseInt(String(batchOrders[batchIndex])) || globalIndex;
        
        const uniqueFilename = `${getKoreanTime().getTime()}-${globalIndex}-${file.name}`;
        const blob = await put(uniqueFilename, file, { access: 'public' });
        
        return {
          imageUrl: blob.url,
          postId: postId,
          order: order
        };
        
      } catch (error) {
        console.error(`이미지 ${globalIndex + 1} 업로드 실패:`, error);
        throw new Error(`이미지 업로드 실패: ${processedImage?.file?.name || `이미지 ${globalIndex + 1}`}`);
      }
    });
    
    // 배치 처리
    const batchResults = await Promise.all(batchPromises);
    
    // 배치 DB 저장 (트랜잭션 최적화)
    await prisma.lookBookPostImage.createMany({
      data: batchResults,
      skipDuplicates: false
    });
    
    // 생성된 레코드 조회 제거 - 직접 반환
    imageCreates.push(...batchResults.map((result, index) => ({
      id: `temp_${getKoreanTime().getTime()}_${i + index}`, // 임시 ID
      imageUrl: result.imageUrl,
      postId: result.postId,
      order: result.order,
      createdAt: getKoreanTime().toISOString(),
      updatedAt: getKoreanTime().toISOString()
    })));
    
    // 메모리 정리
    batch.forEach(processedImage => {
      if (processedImage.file.arrayBuffer) {      
        processedImage.file.arrayBuffer().then(() => {
          // File 메모리 해제
        });
      }
    });
  }
  
  return imageCreates;
}

// 게시물 생성 (여러 이미지 업로드)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    const uploader = formData.get('uploader') as string;
    const files = formData.getAll('files'); // 여러 파일
    const imageOrders: number[] = formData.getAll('imageOrders').map(order => parseInt(String(order))); // 이미지 순서
    
    if (!title || !content || !uploader || files.length === 0) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 });
    }
    
    // 파일 개수 제한 (메모리 보호)
    if (files.length > 30) {
      return NextResponse.json({ error: '최대 30개 이미지까지 업로드 가능합니다' }, { status: 400 });
    }
    
    // 게시물 생성
    const post = await prisma.lookBookPost.create({
      data: { title, content, uploader },
    });
    
    try {
      // 이미지 WebP 변환 (순차적 처리)
      const fileArray = files as File[];
      const processedImages = await processImagesForUploadSequential(fileArray, 75);
      
      // 이미지 순차적 업로드 및 DB 저장
      const imageCreates = await uploadImagesSequentially(processedImages, imageOrders, post.id);
      
      return NextResponse.json({ ...post, images: imageCreates });
      
    } catch (uploadError) {
      // 업로드 실패 시 게시물 삭제
      await prisma.lookBookPost.delete({ where: { id: post.id } });
      throw uploadError;
    }
    
  } catch (error) {
    console.error('게시물 생성 실패:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '업로드 실패' 
    }, { status: 500 });
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
    const imageOrders: number[] = formData.getAll('imageOrders').map(order => parseInt(String(order)));
    const removeImageIds = formData.getAll('removeImageIds');
    const reorderImages = formData.getAll('reorderImages'); // 기존 이미지 순서 변경
    
    if (!id || !title || !content) {
      return NextResponse.json({ error: '필수값 누락' }, { status: 400 });
    }
    
    // 새 이미지 개수 제한
    if (files.length > 30) {
      return NextResponse.json({ error: '최대 30개 이미지까지 업로드 가능합니다' }, { status: 400 });
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
          const encodedFilename = parts[parts.length - 1];
          // URL 인코딩된 파일명을 디코딩
          const filename = decodeURIComponent(encodedFilename);
          await blobDel(filename);
          console.log('개별 이미지 Blob 삭제 성공:', filename);
        } catch (e) {
          console.error('개별 이미지 Blob 삭제 실패:', e);
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
    
    // 새 이미지 업로드 (순차적 처리)
    if (files.length > 0) {
      try {
        const fileArray = files as File[];
        const processedImages = await processImagesForUploadSequential(fileArray, 75);
        
        await uploadImagesSequentially(processedImages, imageOrders, id);
        
      } catch (uploadError) {
        console.error('이미지 업로드 실패:', uploadError);
        return NextResponse.json({ 
          error: uploadError instanceof Error ? uploadError.message : '이미지 업로드 실패' 
        }, { status: 500 });
      }
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
    
  } catch (error) {
    console.error('게시물 수정 실패:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '수정 실패' 
    }, { status: 500 });
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
    
    // 관리자 인증 확인
    const cookie = req.cookies.get('admin_session');
    const isAdmin = cookie && cookie.value === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 1. 해당 게시물의 이미지 URL 목록 조회
    const images = await prisma.lookBookPostImage.findMany({ where: { postId: id } });
    
    // 2. Blob에서 이미지 삭제 (실패해도 무시)
    await Promise.all(images.map(async (img) => {
      try {
        // blob url에서 파일 경로 추출 (https://.../blob/filename)
        const url = img.imageUrl;
        const parts = url.split('/');
        const encodedFilename = parts[parts.length - 1];
        // URL 인코딩된 파일명을 디코딩
        const filename = decodeURIComponent(encodedFilename);
        await blobDel(filename);
        console.log('Blob 삭제 성공:', filename);
      } catch (e) {
        console.error('Blob 삭제 실패:', e);
      }
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