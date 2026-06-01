import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { ADMIN_SESSION_COOKIE, verifyAdminToken } from '@/lib/adminSessionVerify';
import { buildGalleryThumbWebp } from '@/lib/galleryImageProcessing';
import { isS3CmsConfigured, uploadGalleryImagePair } from '@/lib/s3CmsSite';

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !(await verifyAdminToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (isS3CmsConfigured()) {
      const pair = await uploadGalleryImagePair({
        buffer,
        contentType: file.type,
        originalName: file.name,
      });
      return NextResponse.json({ success: true, full: pair.full, thumb: pair.thumb, url: pair.full });
    }

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'gallery');
    const thumbsDir = join(uploadsDir, 'thumb');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    if (!existsSync(thumbsDir)) {
      await mkdir(thumbsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${originalName}`;
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const base = originalName.replace(/\.[^.]+$/, '') || 'image';
    const thumbFilename = `${timestamp}-${base}.webp`;
    const thumbPath = join(thumbsDir, thumbFilename);
    const thumbBuffer = await buildGalleryThumbWebp(buffer);
    await writeFile(thumbPath, thumbBuffer);

    const full = `/uploads/gallery/${filename}`;
    const thumb = `/uploads/gallery/thumb/${thumbFilename}`;

    return NextResponse.json({ success: true, full, thumb, url: full });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
