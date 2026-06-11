export type UserRole = 'USER' | 'ADMIN';
export type KycStatus = 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  kycStatus: KycStatus;
  isActive: boolean;
  emailVerified: boolean;
  twoFaEnabled: boolean;
  googleId: string | null;
  createdAt: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface KycSubmitDto {
  docType: 'PASSPORT' | 'DRIVING_LICENSE' | 'NATIONAL_ID';
  docNumber: string;
  frontImageUrl: string;
  backImageUrl?: string;
  selfieUrl?: string;
}
