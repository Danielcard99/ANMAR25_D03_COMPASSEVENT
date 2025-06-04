import { UserRole } from '../dto/create-user.dto';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  profileImageUrl: string;
  createdAt: string;
  updatedAt?: string;
  isActive: boolean;
  emailConfirmed?: boolean;
  emailConfirmationToken?: string;
}
