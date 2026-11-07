import { Request, Response } from 'express';
import { z } from 'zod';
import { whatsAppService } from '../services/whatsapp.service.js';

const createWhatsAppSchema = z.object({
  name: z.string().min(2, 'O nome da conexão deve ter pelo menos 2 caracteres')
});

export class WhatsAppController {
  async list(_req: Request, res: Response): Promise<void> {
    const instances = await whatsAppService.listInstances();
    res.json({ instances });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const instance = await whatsAppService.getInstanceById(id);
    res.json({ instance });
  }

  async create(req: Request, res: Response): Promise<void> {
    const { name } = createWhatsAppSchema.parse(req.body);
    const instance = await whatsAppService.createInstance(name);
    res.status(201).json({ instance });
  }

  async getQRCode(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const qrData = await whatsAppService.getQRCode(id);
    res.json(qrData);
  }

  async reconnect(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const result = await whatsAppService.reconnectInstance(id);
    res.json(result);
  }

  async disconnect(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const result = await whatsAppService.disconnectInstance(id);
    res.json({ message: 'Instância desconectada com sucesso.', instance: result });
  }

  async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    await whatsAppService.deleteInstance(id);
    res.json({ message: 'Instância removida com sucesso.' });
  }

  async webhook(req: Request, res: Response): Promise<void> {
    await whatsAppService.handleWebhook(req.body);
    res.status(200).json({ status: 'received' });
  }
}

export const whatsAppController = new WhatsAppController();
