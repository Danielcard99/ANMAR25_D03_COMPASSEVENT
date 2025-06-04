import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let usersService: UsersService;

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockUsersService = {
    findByConfirmationToken: jest.fn(),
    confirmEmail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'StrongP@ss123',
    };

    it('should return access token on successful login', async () => {
      const expectedResult = {
        access_token: 'jwt-token',
      };

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto.email, loginDto.password);
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('confirmEmail', () => {
    it('should confirm email successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        emailConfirmed: false,
      };

      mockUsersService.findByConfirmationToken.mockResolvedValue(mockUser);
      mockUsersService.confirmEmail.mockResolvedValue({
        ...mockUser,
        emailConfirmed: true,
      });

      const result = await controller.confirmEmail('valid-token');

      expect(usersService.findByConfirmationToken).toHaveBeenCalledWith('valid-token');
      expect(usersService.confirmEmail).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({ message: 'Email successfully confirmed' });
    });

    it('should throw BadRequestException if token is missing', async () => {
      await expect(controller.confirmEmail('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if token is invalid', async () => {
      mockUsersService.findByConfirmationToken.mockResolvedValue(null);

      await expect(controller.confirmEmail('invalid-token')).rejects.toThrow(NotFoundException);
    });
  });
});