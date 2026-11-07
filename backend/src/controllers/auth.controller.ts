import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma, config } from '../config/index.js';
import { AuthenticatedRequest } from '../types/index.js';

const loginSchema = z.object({
  email: z.string().email('E-mail em formato inválido'),
  password: z.string().min(1, 'A senha é obrigatória')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres')
});

const updateProfileSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('E-mail em formato inválido')
});

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Credenciais inválidas. Verifique seu e-mail e senha.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  }

  async me(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, role: true, createdAt: true }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    res.json({ user });
  }

  async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({ error: 'A senha atual informada está incorreta.' });
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHash }
    });

    res.json({ message: 'Senha alterada com sucesso.' });
  }

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { name, email } = updateProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: userId }
      }
    });

    if (existing) {
      res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: normalizedEmail,
        ...(name ? { name: name.trim() } : {})
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    const newToken = jwt.sign(
      { userId: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Perfil e e-mail atualizados com sucesso.',
      user: updatedUser,
      token: newToken
    });
  }
}

export const authController = new AuthController();
