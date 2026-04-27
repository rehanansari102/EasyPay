import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SubmitKycDto, PkDocType } from './dto/submit-kyc.dto';

// CNIC / NICOP: 42101-1234567-1
const CNIC_REGEX = /^\d{5}-\d{7}-\d$/;
// Pakistani passport: AB1234567
const PASSPORT_REGEX = /^[A-Z]{2}\d{7}$/;

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function mimeToExt(mime: string): string {
  return mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
}

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private validateFile(file: Express.Multer.File, fieldName: string): void {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `${fieldName} must be JPEG, PNG, or WebP (got ${file.mimetype})`,
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`${fieldName} must be smaller than 10 MB`);
    }
  }

  // ── Submit / resubmit KYC ──────────────────────────────────────
  async submit(
    userId: string,
    dto: SubmitKycDto,
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
      selfie?: Express.Multer.File[];
    },
  ) {
    // 1. Validate uploaded files
    const frontFile = files.frontImage?.[0];
    if (!frontFile) throw new BadRequestException('frontImage file is required');
    this.validateFile(frontFile, 'frontImage');

    const backFile = files.backImage?.[0];
    const selfieFile = files.selfie?.[0];
    if (backFile) this.validateFile(backFile, 'backImage');
    if (selfieFile) this.validateFile(selfieFile, 'selfie');

    // 2. Validate document number format
    if (dto.docType === PkDocType.CNIC || dto.docType === PkDocType.NICOP) {
      if (!CNIC_REGEX.test(dto.docNumber)) {
        throw new BadRequestException(
          `${dto.docType} number must match format XXXXX-XXXXXXX-X (e.g. 42101-1234567-1)`,
        );
      }
      if (!backFile) {
        throw new BadRequestException('backImage is required for CNIC / NICOP');
      }
    } else if (dto.docType === PkDocType.PASSPORT) {
      if (!PASSPORT_REGEX.test(dto.docNumber)) {
        throw new BadRequestException(
          'Passport number must be two uppercase letters followed by 7 digits (e.g. AB1234567)',
        );
      }
    }

    // 3. Block resubmission if already APPROVED
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.kycStatus === 'APPROVED') {
      throw new BadRequestException('Your KYC has already been approved');
    }

    // 4. Upload files to Cloudflare R2 (store object keys in DB)
    const frontKey = await this.storage.upload(
      `kyc/${userId}/front.${mimeToExt(frontFile.mimetype)}`,
      frontFile.buffer,
      frontFile.mimetype,
    );

    const backKey = backFile
      ? await this.storage.upload(
          `kyc/${userId}/back.${mimeToExt(backFile.mimetype)}`,
          backFile.buffer,
          backFile.mimetype,
        )
      : null;

    const selfieKey = selfieFile
      ? await this.storage.upload(
          `kyc/${userId}/selfie.${mimeToExt(selfieFile.mimetype)}`,
          selfieFile.buffer,
          selfieFile.mimetype,
        )
      : null;

    // 5. Upsert KycDocument — store R2 object keys (not URLs)
    await this.prisma.kycDocument.upsert({
      where: { userId },
      create: {
        userId,
        docType: dto.docType,
        docNumber: dto.docNumber,
        frontImageUrl: frontKey,
        backImageUrl: backKey,
        selfieUrl: selfieKey,
      },
      update: {
        docType: dto.docType,
        docNumber: dto.docNumber,
        frontImageUrl: frontKey,
        backImageUrl: backKey,
        selfieUrl: selfieKey,
        reviewedAt: null,
        reviewNotes: null,
      },
    });

    // 6. Mark user as SUBMITTED
    await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'SUBMITTED' },
    });

    // 7. Audit log
    await this.prisma.auditLog.create({
      data: { userId, action: 'KYC_SUBMITTED' },
    });

    return { message: 'KYC documents submitted successfully. Review usually takes 1-2 business days.' };
  }

  // ── Get current KYC status ─────────────────────────────────────
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        kycStatus: true,
        kycDocument: {
          select: {
            docType: true,
            docNumber: true,
            reviewedAt: true,
            reviewNotes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
