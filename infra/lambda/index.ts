import { S3Event } from 'aws-lambda';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { Readable } from 'stream';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    try {
      const object = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );

      const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
        const chunks: any[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      };

      const buffer = await streamToBuffer(object.Body as Readable);

      const resizedImage = await sharp(buffer).resize(256, 256).toBuffer();

      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: resizedImage,
          ContentType: object.ContentType,
        }),
      );
    } catch (error) {
      console.error('Error resizing image:', error);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Processing complete' }),
  };
};
