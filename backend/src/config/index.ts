import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'super_secreto_chave_jwt_cobranca_whatsapp_2026_mude_em_producao',
  evolutionApiUrl: (process.env.EVOLUTION_API_URL || 'http://evolution-api:8080').replace(/\/$/, ''),
  evolutionApiKey: process.env.EVOLUTION_API_KEY || 'evol_key_global_cobranca_segura_2026_whatsapp',
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379'
};

export const prisma = new PrismaClient();
