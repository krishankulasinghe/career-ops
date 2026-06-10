import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { env } from '@/config/env.js';

export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function checkS3(): Promise<boolean> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    return true;
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'NoSuchBucket') {
      await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
      return true;
    }
    return false;
  }
}
