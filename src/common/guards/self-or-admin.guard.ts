import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { AuthRequest } from '../interfaces/auth-request.interface';

@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const user = request.user;
    const targetId = request.params.id;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const isAdmin = user.role === 'admin';
    const isOwner = user.userId === targetId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}
