import { Prisma, PrismaClient } from '../generated/prisma/client';

export const prisma = new PrismaClient();
export type Json = Prisma.JsonValue;
