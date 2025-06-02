import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

interface MulterFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.getOrThrow('AWS_REGION');
    this.bucket = this.getOrThrow('AWS_S3_BUCKET_NAME');

    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.getOrThrow('AWS_SECRET_ACCESS_KEY'),
        sessionToken: this.getOrThrow('AWS_SESSION_TOKEN'),
      },
    });
  }

  private getOrThrow(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
  }

  async uploadImage(file: MulterFile): Promise<string> {
    const extension = extname(file.originalname);
    const key = `profiles/${randomUUID()}${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
