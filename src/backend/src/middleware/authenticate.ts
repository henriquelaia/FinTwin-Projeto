/**
 * Middleware de Autenticação
 * ==========================
 * Verifica o JWT no header Authorization: Bearer <token>
 * Injeta req.user com { id, email } se o token for válido.
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import { redisClient } from '../config/redis.js';

// Estender o tipo Request do Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

interface JwtPayload {
  sub: string;
  email: string;
  type: string;
  iat: number;
  exp: number;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Token de autenticação em falta.', 401));
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new AppError('Configuração de segurança inválida.', 500));
  }

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Sessão expirada. Faz login novamente.', 401));
    }
    return next(new AppError('Token inválido.', 401));
  }

  if (payload.type !== 'access') {
    return next(new AppError('Tipo de token inválido.', 401));
  }

  try {
    const invalidatedAt = await redisClient.get(`sessions_invalidated:${payload.sub}`);
    if (invalidatedAt && payload.iat * 1000 < parseInt(invalidatedAt, 10)) {
      return next(new AppError('Sessão revogada. Faz login novamente.', 401));
    }
  } catch {
    // Redis em baixo — degradação graceful (não é SPOF na leitura)
  }

  req.user = { id: payload.sub, email: payload.email };
  next();
}
