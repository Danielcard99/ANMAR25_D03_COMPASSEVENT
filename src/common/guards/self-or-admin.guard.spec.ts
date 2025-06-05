import { Test, TestingModule } from '@nestjs/testing';
import { SelfOrAdminGuard } from './self-or-admin.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { createMockExecutionContext } from '../testing/mock-factory';

describe('SelfOrAdminGuard', () => {
  let guard: SelfOrAdminGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SelfOrAdminGuard],
    }).compile();

    guard = module.get<SelfOrAdminGuard>(SelfOrAdminGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should return true if user is admin', () => {
      const context = createMockExecutionContext({
        user: { userId: 'admin-id', role: 'admin', emailConfirmed: true },
        params: { id: 'user-id' },
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should return true if user is accessing their own resource', () => {
      const context = createMockExecutionContext({
        user: { userId: 'user-id', role: 'participant', emailConfirmed: true },
        params: { id: 'user-id' },
      });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException if user is not admin and not accessing their own resource', () => {
      const context = createMockExecutionContext({
        user: { userId: 'user-id', role: 'participant', emailConfirmed: true },
        params: { id: 'other-id' },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if request has no user', () => {
      const context = createMockExecutionContext({
        params: { id: 'user-id' },
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if request has no params', () => {
      const context = createMockExecutionContext({
        user: { userId: 'user-id', role: 'participant', emailConfirmed: true },
        params: {},
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});