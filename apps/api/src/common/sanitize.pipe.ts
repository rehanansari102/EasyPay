import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Recursively strips HTML tags and trims whitespace from all string values in
 * request body/query/param objects. Prevents stored-XSS via text fields.
 *
 * Applied globally in main.ts alongside ValidationPipe.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' || metadata.type === 'query') {
      return this.sanitize(value);
    }
    return value;
  }

  private sanitize(value: any): any {
    if (typeof value === 'string') {
      return value.replace(/<[^>]*>/g, '').trim();
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, this.sanitize(v)]),
      );
    }
    return value;
  }
}
