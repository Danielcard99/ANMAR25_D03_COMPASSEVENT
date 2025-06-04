import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/dto/create-user.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-id',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
    phone: '+5511999999999',
    role: UserRole.PARTICIPANT,
    profileImageUrl: 'https://example.com/image.jpg',
    createdAt: '2023-01-01T00:00:00.000Z',
    isActive: true,
    emailConfirmed: true,
    emailConfirmationToken: 'confirmation-token',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    process.env.JWT_EXPIRES_IN = '1h';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return access token when credentials are valid', async () => {
      // Mock dependencies
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync.mockResolvedValue('jwt-token');

      // Call the method
      const result = await service.login('test@example.com', 'password');

      // Assertions
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashed-password');
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { email: mockUser.email, sub: mockUser.id, role: mockUser.role },
        { expiresIn: '1h' }
      );
      expect(result).toEqual({ access_token: 'jwt-token' });
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Mock dependencies
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Call the method and expect exception
      await expect(service.login('nonexistent@example.com', 'password')).rejects.toThrow(
        UnauthorizedException
      );
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });

    it('should throw UnauthorizedException when user is not active', async () => {
      // Mock dependencies
      mockUsersService.findByEmail.mockResolvedValue({ ...mockUser, isActive: false });

      // Call the method and expect exception
      await expect(service.login('test@example.com', 'password')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Mock dependencies
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Call the method and expect exception
      await expect(service.login('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password');
    });
  });
});