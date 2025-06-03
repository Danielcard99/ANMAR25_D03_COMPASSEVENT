import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthRequest } from 'src/common/interfaces/auth-request.interface';

export const User = createParamDecorator(
  (field: keyof AuthRequest['user'] | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthRequest>();
    return field ? request.user?.[field] : request.user;
  },
);
