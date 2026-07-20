import { UserRole } from '../common/user-role';

export interface AuthenticatedUser {
  userId: string;
  name: string;
  apiKey: string | null;
  role: UserRole;
}
