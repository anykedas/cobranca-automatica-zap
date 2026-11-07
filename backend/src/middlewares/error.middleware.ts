import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Erro na Aplicação]', err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados inválidos fornecidos.',
      details: err.errors.map(e => ({
        campo: e.path.join('.'),
        mensagem: e.message
      }))
    });
    return;
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: 'Registro duplicado. Já existe um item com estes dados únicos.'
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        error: 'Registro não encontrado.'
      });
      return;
    }
  }

  const message = err.message || 'Ocorreu um erro interno no servidor.';
  res.status(err.status || 500).json({
    error: message
  });
}
