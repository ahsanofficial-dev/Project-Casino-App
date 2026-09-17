import { BadRequestException } from '@nestjs/common';

export function requireIdempotencyKey(value?: string): string {
  const key = value?.trim();
  if (!key || key.length < 8 || key.length > 200 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new BadRequestException('A valid Idempotency-Key is required');
  }
  return key;
}
