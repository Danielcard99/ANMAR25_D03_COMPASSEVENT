import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { AuthRequest } from '../interfaces/auth-request.interface';
import { UsersService } from '../../users/users.service';

@Injectable()
export class EmailConfirmedGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const freshUser = await this.usersService.findById(user.userId);

    if (!freshUser || !freshUser.emailConfirmed) {
      throw new ForbiddenException(
        'Email not confirmed. Please confirm your email to proceed.',
      );
    }

    return true;
  }
}
