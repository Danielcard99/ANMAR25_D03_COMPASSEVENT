import { Test, TestingModule } from '@nestjs/testing';
import { EmailConfirmedGuard } from './email-confirmed.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { createMockExecutionContext } from '../testing/mock-factory';

describe('EmailConfirmedGuard', () => {
  let guard: EmailConfirmedGuard;
  let usersService: UsersService;

  const mockUsersService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailConfirmedGuard,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    guard = module.get<EmailConfirmedGuard>(EmailConfirmedGuard);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if user email is confirmed', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-id',
        emailConfirmed: true,
      });

      const context = createMockExecutionContext({
        user: { userId: 'user-id', emailConfirmed: true },
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(usersService.findById).toHaveBeenCalledWith('user-id');
    });

    it('should throw ForbiddenException if user email is not confirmed', async () => {
      mockUsersService.findById.mockResolvedValue({
        id: 'user-id',
        emailConfirmed: false,
      });

      const context = createMockExecutionContext({
        user: { userId: 'user-id', emailConfirmed: false },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(usersService.findById).toHaveBeenCalledWith('user-id');
    });

    it('should throw ForbiddenException if user is not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      const context = createMockExecutionContext({
        user: { userId: 'user-id', emailConfirmed: false },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if request has no user', async () => {
      // Reset mock to clear previous calls
      mockUsersService.findById.mockReset();
      
      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });
  });
});