import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { createMockExecutionContext } from '../testing/mock-factory';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const context = createMockExecutionContext({
        user: { userId: 'user-id', role: 'participant', emailConfirmed: true },
      });

      expect(guard.canActivate(context)).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true if user has required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'organizer']);

      const context = createMockExecutionContext({
        user: { userId: 'user-id', role: 'admin', emailConfirmed: true },
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if user does not have required role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin', 'organizer']);

      const context = createMockExecutionContext({
        user: { userId: 'user-id', role: 'participant', emailConfirmed: true },
      });

      expect(() => guard.canActivate(context)).toThrow();
    });

    it('should throw ForbiddenException if request has no user', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

      const context = createMockExecutionContext({});

      expect(() => guard.canActivate(context)).toThrow();
    });
  });
});