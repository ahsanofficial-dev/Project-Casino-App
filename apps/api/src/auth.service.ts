import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, scrypt as nodeScrypt } from 'crypto';
import { promisify } from 'util';
import { PrismaService } from './prisma.service';
import { LoginDto, RegisterDto } from './auth.dto';

const scrypt = promisify(nodeScrypt);
const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

async function verifyPassword(password: string, encoded: string) {
  const [, salt, expected] = encoded.split('$');
  if (!salt || !expected) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  return actual.toString('hex') === expected;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const username = dto.username.trim();
    const email = dto.email.trim().toLowerCase();

    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      throw new BadRequestException('Invalid username');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email');
    }

    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (existing) {
      throw new ConflictException('Username or email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash: await hashPassword(dto.password),
        wallet: { create: {} },
      },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });

    return user;
  }

  async authenticate(dto: LoginDto) {
    const identifier = dto.identifier.trim();
    const normalizedIdentifier = identifier.toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedIdentifier }, { username: identifier }],
      },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!user || user.status !== 'ACTIVE' || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async createSession(userId: string) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });
    return token;
  }

  async fromToken(token?: string) {
    if (!token) return null;

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        user: {
          select: { id: true, username: true, email: true, status: true },
        },
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date() || session.user.status !== 'ACTIVE') {
      return null;
    }

    return session.user;
  }

  async revoke(token?: string) {
    if (token) {
      await this.prisma.session.updateMany({
        where: { tokenHash: hashToken(token), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }
}
