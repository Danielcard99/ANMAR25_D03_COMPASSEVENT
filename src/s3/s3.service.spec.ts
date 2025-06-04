import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from './s3.service';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
    PutObjectCommand: jest.fn(),
  };
});

describe('S3Service', () => {
  let service: S3Service;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        AWS_REGION: 'us-east-1',
        AWS_S3_BUCKET_NAME: 'test-bucket',
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        AWS_SESSION_TOKEN: 'test-session-token',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: S3Service,
          useFactory: () => {
            return new S3Service(mockConfigService as unknown as ConfigService);
          },
        },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    const mockFile = {
      originalname: 'test.jpg',
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
    };

    it('should upload image successfully', async () => {
      const result = await service.uploadImage(mockFile);
      
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expect.stringMatching(/^profiles\/.*\.jpg$/),
        Body: mockFile.buffer,
        ContentType: mockFile.mimetype,
      });
      
      expect(result).toMatch(/^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/profiles\/.+\.jpg$/);
    });

    it('should use custom folder when provided', async () => {
      const result = await service.uploadImage(mockFile, 'custom-folder');
      
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expect.stringMatching(/^custom-folder\/.*\.jpg$/),
        Body: mockFile.buffer,
        ContentType: mockFile.mimetype,
      });
      
      expect(result).toMatch(/^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/custom-folder\/.+\.jpg$/);
    });

    it('should handle files with different extensions', async () => {
      const pngFile = {
        originalname: 'test.png',
        buffer: Buffer.from('test'),
        mimetype: 'image/png',
      };
      
      const result = await service.uploadImage(pngFile);
      
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expect.stringMatching(/^profiles\/.*\.png$/),
        Body: pngFile.buffer,
        ContentType: pngFile.mimetype,
      });
      
      expect(result).toMatch(/^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/profiles\/.+\.png$/);
    });
  });

  describe('getOrThrow', () => {
    it('should return value when it exists', () => {
      const getOrThrowMethod = service['getOrThrow'].bind(service);
      const result = getOrThrowMethod('AWS_REGION');
      expect(result).toBe('us-east-1');
    });

    it('should throw error when value does not exist', () => {
      mockConfigService.get.mockReturnValueOnce(undefined);
      
      const getOrThrowMethod = service['getOrThrow'].bind(service);
      expect(() => {
        getOrThrowMethod('NON_EXISTENT_KEY');
      }).toThrow('Missing required environment variable: NON_EXISTENT_KEY');
    });
  });
});