import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { EvolutionConnectResponse, EvolutionConnectionStateResponse } from '../types/index.js';

class EvolutionService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.evolutionApiUrl,
      headers: {
        'apikey': config.evolutionApiKey,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });
  }

  /**
   * Cria uma nova instância no Evolution API
   */
  async createInstance(instanceName: string): Promise<any> {
    try {
      const response = await this.client.post('/instance/create', {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      });
      return response.data;
    } catch (error: any) {
      console.error(`[Evolution API] Erro ao criar instância ${instanceName}:`, error.response?.data || error.message);
      // Se já existir, não interrompe
      if (error.response?.status === 403 || error.response?.data?.response?.message?.includes('already exists')) {
        return { message: 'Instância já existe na Evolution API' };
      }
      throw new Error(`Falha ao criar instância no WhatsApp: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Conecta a instância e retorna o QR Code em Base64
   */
  async connectInstance(instanceName: string): Promise<EvolutionConnectResponse> {
    try {
      const response = await this.client.get(`/instance/connect/${instanceName}`);
      return response.data;
    } catch (error: any) {
      console.error(`[Evolution API] Erro ao conectar instância ${instanceName}:`, error.response?.data || error.message);
      throw new Error(`Falha ao obter QR Code de conexão: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Consulta o estado da conexão da instância (open, close, connecting)
   */
  async getConnectionState(instanceName: string): Promise<'open' | 'close' | 'connecting'> {
    try {
      const response = await this.client.get<EvolutionConnectionStateResponse>(`/instance/connectionState/${instanceName}`);
      return response.data?.instance?.state || 'close';
    } catch (error: any) {
      console.warn(`[Evolution API] Instância ${instanceName} pode estar offline ou não inicializada:`, error.message);
      return 'close';
    }
  }

  /**
   * Envia uma mensagem de texto simples
   */
  async sendTextMessage(instanceName: string, phone: string, text: string): Promise<any> {
    try {
      // Limpar número (remover caracteres especiais, manter apenas dígitos)
      const cleanPhone = phone.replace(/\D/g, '');

      const response = await this.client.post(`/message/sendText/${instanceName}`, {
        number: cleanPhone,
        text: text,
        delay: 1200
      });
      return response.data;
    } catch (error: any) {
      console.error(`[Evolution API] Erro ao enviar mensagem para ${phone} via ${instanceName}:`, error.response?.data || error.message);
      throw new Error(`Erro ao enviar mensagem: ${error.response?.data?.response?.message || error.message}`);
    }
  }

  /**
   * Desconecta a sessão do WhatsApp (Logout)
   */
  async logoutInstance(instanceName: string): Promise<any> {
    try {
      const response = await this.client.delete(`/instance/logout/${instanceName}`);
      return response.data;
    } catch (error: any) {
      console.warn(`[Evolution API] Falha no logout da instância ${instanceName}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Exclui a instância permanentemente da Evolution API
   */
  async deleteInstance(instanceName: string): Promise<any> {
    try {
      const response = await this.client.delete(`/instance/delete/${instanceName}`);
      return response.data;
    } catch (error: any) {
      console.warn(`[Evolution API] Falha ao deletar instância ${instanceName}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Reinicia a instância
   */
  async restartInstance(instanceName: string): Promise<any> {
    try {
      const response = await this.client.put(`/instance/restart/${instanceName}`);
      return response.data;
    } catch (error: any) {
      console.warn(`[Evolution API] Falha ao reiniciar instância ${instanceName}:`, error.response?.data || error.message);
      return null;
    }
  }
}

export const evolutionService = new EvolutionService();
