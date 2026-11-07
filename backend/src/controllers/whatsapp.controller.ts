import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { whatsAppService } from '../services/whatsapp.service.js';
import { config } from '../config/index.js';

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

  /**
   * Endpoint direto para disparo de mensagem avulsa via API externa (POST /send-message)
   */
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      // Autenticação simplificada:
      // Pode ser API Key (header 'apikey', 'x-api-key', ou query '?apikey=...'), Bearer JWT, ou chamadas internas (localhost)
      const apiKey = (req.headers['apikey'] || req.headers['x-api-key'] || req.query.apikey || req.query.api_key) as string | undefined;
      const authHeader = req.headers.authorization;
      const clientIp = req.ip || req.socket.remoteAddress || '';
      const isInternal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('172.20.');

      let isAuthorized = isInternal;

      if (!isAuthorized && apiKey) {
        if (apiKey === config.evolutionApiKey || apiKey === config.jwtSecret) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          jwt.verify(token, config.jwtSecret);
          isAuthorized = true;
        } catch {
          // token inválido
        }
      }

      if (!isAuthorized) {
        res.status(401).json({
          status: 'erro',
          error: 'Acesso não autorizado. Envie a chave no cabeçalho "apikey: SUA_CHAVE" ou via parâmetro na URL "?apikey=SUA_CHAVE".'
        });
        return;
      }

      const body = req.body || {};
      const result = await whatsAppService.sendExternalMessage(body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        status: 'erro',
        error: error.message || 'Erro ao enviar mensagem pelo WhatsApp.'
      });
    }
  }

  /**
   * Define qual instância é a ativa/padrão para disparos via API (/send-message)
   */
  async setDefaultApi(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const instanceId = id || req.body.instanceId;
      if (!instanceId) {
        res.status(400).json({ error: 'ID da instância é obrigatório.' });
        return;
      }
      const result = await whatsAppService.setDefaultApiInstance(instanceId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Erro ao definir instância padrão para a API.' });
    }
  }
}

export const whatsAppController = new WhatsAppController();
