import 'dotenv/config';
import postgres from 'postgres';
import { Redis } from 'ioredis';
import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { env } from '../src/config/env.js';

console.log('DB URL:', env.DATABASE_URL);
console.log('Redis URL:', env.REDIS_URL);
console.log('S3 Endpoint:', env.S3_ENDPOINT);

// Test DB
try {
  const sql = postgres(env.DATABASE_URL, { max: 1, connect_timeout: 5 });
  const result = await sql`SELECT 1 as ok`;
  console.log('DB: OK', result);
  await sql.end();
} catch (err) {
  console.error('DB error:', err);
}

// Test Redis
try {
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 5000 });
  const pong = await redis.ping();
  console.log('Redis: OK', pong);
  await redis.quit();
} catch (err) {
  console.error('Redis error:', err);
}

// Test S3
try {
  const s3 = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    forcePathStyle: true,
  });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
    console.log('S3: Bucket exists OK');
  } catch (err: unknown) {
    console.log('S3 HeadBucket error:', (err as any)?.name, (err as any)?.$metadata?.httpStatusCode);
    // Try to create
    try {
      await s3.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
      console.log('S3: Bucket created OK');
    } catch (createErr) {
      console.error('S3 create bucket error:', (createErr as any)?.name, (createErr as any)?.$metadata);
    }
  }
} catch (err) {
  console.error('S3 error:', err);
}
