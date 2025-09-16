import sharp from 'sharp';

export interface ImageFile {
  file: File;
  order: number;
}

export interface ProcessedImage {
  file: File;
  order: number;
}

export async function convertToWebP(file: File, quality: number = 75): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const webpBuffer = await sharp(buffer)
    .webp({ quality })
    .toBuffer();
  
  return new Blob([webpBuffer], { type: 'image/webp' });
}

// 악보 이미지 전용 변환 함수 (1920x1080 해상도)
export async function convertToWebPForScore(file: File, quality: number = 85): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const webpBuffer = await sharp(buffer)
    .resize(1920, 1080, { 
      fit: 'inside',
      withoutEnlargement: false 
    })
    .webp({ quality })
    .toBuffer();
  
  return new Blob([webpBuffer], { type: 'image/webp' });
}

export async function processImagesForUpload(files: File[], quality: number = 75): Promise<ImageFile[]> {
  const processedImages: ImageFile[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const webpBlob = await convertToWebP(file, quality);
    const webpFile = new File([webpBlob], `${file.name.replace(/\.[^/.]+$/, '')}.webp`, {
      type: 'image/webp'
    });
    
    processedImages.push({
      file: webpFile,
      order: i
    });
  }
  
  return processedImages;
}

export async function processImagesForUploadSequential(files: File[], quality: number = 75): Promise<ProcessedImage[]> {
  const processedImages: ProcessedImage[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const webpBlob = await convertToWebP(file, quality);
    const webpFile = new File([webpBlob], `${file.name.replace(/\.[^/.]+$/, '')}.webp`, {
      type: 'image/webp'
    });
    
    processedImages.push({
      file: webpFile,
      order: i
    });
  }
  
  return processedImages;
} 