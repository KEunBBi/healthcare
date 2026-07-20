import { UserEntity } from '../entities';
import { toUserRole } from './user-role';

export function toUserDto(user: UserEntity) {
  return {
    userId: user.userId,
    name: user.name,
    gender: user.gender,
    birthDate: user.birthDate,
    role: toUserRole(user.userType),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
