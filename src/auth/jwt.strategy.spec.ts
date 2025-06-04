import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user payload when valid', async () => {
      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: 'participant' as 'participant' | 'organizer',
      };
      
      const result = await strategy.validate(payload);
      
      expect(result).toEqual({
        userId: 'user-id',
        email: 'test@example.com',
        role: 'participant',
        emailConfirmed: true,
      });
    });

    it('should throw UnauthorizedException when payload is missing sub', () => {
      const payload = {
        email: 'test@example.com',
        role: 'participant' as 'participant' | 'organizer',
      };
      
      expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when payload is missing email', () => {
      const payload = {
        sub: 'user-id',
        role: 'participant' as 'participant' | 'organizer',
      };
      
      expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when payload is missing role', () => {
      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
      };
      
      expect(() => strategy.validate(payload as any)).toThrow(UnauthorizedException);
    });
  });
});