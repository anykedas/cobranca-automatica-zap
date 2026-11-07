import { prisma } from '../config/index.js';
import { evolutionService } from './evolution.service.js';
import { InstanceStatus } from '../types/index.js';

export class WhatsAppService {
  /**
   * Converte o estado retornado pela Evolution API para o Enum do Prisma
   */
  private mapStateToEnum(state: string): InstanceStatus {
    switch (state) {
      case 'open':
        return 'CONNECTED';
      case 'connecting':
        return 'CONNECTING';
      case 'close':
      default:
        return 'DISCONNECTED';
    }
  }

  /**
   * Lista todas as instâncias cadastradas e sincroniza o status em tempo real com a Evolution API
   */
  async listInstances() {
    const defaultSetting = await prisma.setting.findUnique({
      where: { key: 'DEFAULT_API_WHATSAPP_ID' }
    });

    const instances = await prisma.whatsAppInstance.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            customers: true,
            messages: true
          }
        }
      }
    });

    // Sincronizar status em segundo plano/consulta rápida
    const updatedInstances = await Promise.all(
      instances.map(async (inst: any) => {
        try {
          const liveState = await evolutionService.getConnectionState(inst.instanceName);
          const mappedStatus = this.mapStateToEnum(liveState);

          if (mappedStatus !== inst.status) {
            return await prisma.whatsAppInstance.update({
              where: { id: inst.id },
              data: {
                status: mappedStatus,
                lastConnectionAt: mappedStatus === 'CONNECTED' ? new Date() : inst.lastConnectionAt
              },
              include: {
                _count: {
                  select: {
                    customers: true,
                    messages: true
                  }
                }
              }
            });
          }
        } catch (e) {
          // Mantém o estado atual se não conseguir consultar
        }
        return inst;
      })
    );

    return updatedInstances.map((inst: any) => ({
      ...inst,
      isDefaultApi: inst.id === defaultSetting?.value
    }));
  }

  /**
   * Obtém detalhes de uma instância específica
   */
  async getInstanceById(id: string) {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            customers: true,
            messages: true
          }
        }
      }
    });

    if (!instance) {
      throw new Error('Instância de WhatsApp não encontrada.');
    }

    try {
      const liveState = await evolutionService.getConnectionState(instance.instanceName);
      const mappedStatus = this.mapStateToEnum(liveState);
      if (mappedStatus !== instance.status) {
        return await prisma.whatsAppInstance.update({
          where: { id: instance.id },
          data: {
            status: mappedStatus,
            lastConnectionAt: mappedStatus === 'CONNECTED' ? new Date() : instance.lastConnectionAt
          },
          include: {
            _count: {
              select: {
                customers: true,
                messages: true
              }
            }
          }
        });
      }
    } catch (e) {
      // Ignora erro de rede temporário
    }

    return instance;
  }

  /**
   * Cria uma nova instância de WhatsApp
   */
  async createInstance(name: string) {
    // Gerar um nome de instância limpo e único para a API
    const sanitizedName = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 20);

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const instanceName = `zap_${sanitizedName}_${randomSuffix}`;

    // 1. Criar na Evolution API
    await evolutionService.createInstance(instanceName);

    // 2. Salvar no Banco de Dados
    const newInstance = await prisma.whatsAppInstance.create({
      data: {
        name,
        instanceName,
        status: 'CONNECTING'
      }
    });

    // 3. Tentar obter QR Code imediatamente
    let qrcodeBase64: string | null = null;
    try {
      const connectData = await evolutionService.connectInstance(instanceName);
      qrcodeBase64 = connectData.base64 || null;

      if (qrcodeBase64) {
        await prisma.whatsAppInstance.update({
          where: { id: newInstance.id },
          data: { qrcode: qrcodeBase64 }
        });
      }
    } catch (e) {
      console.warn(`[WhatsAppService] QR Code não gerado de imediato para ${instanceName}`);
    }

    return {
      ...newInstance,
      qrcode: qrcodeBase64
    };
  }

  /**
   * Obtém ou atualiza o QR Code para conectar o WhatsApp
   */
  async getQRCode(id: string) {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id }
    });

    if (!instance) {
      throw new Error('Instância de WhatsApp não encontrada.');
    }

    try {
      const connectData = await evolutionService.connectInstance(instance.instanceName);
      const qrcode = connectData.base64 || connectData.code || null;

      if (qrcode) {
        await prisma.whatsAppInstance.update({
          where: { id },
          data: {
            qrcode,
            status: 'CONNECTING'
          }
        });
      }

      return {
        instanceId: instance.id,
        instanceName: instance.instanceName,
        qrcode: qrcode,
        pairingCode: connectData.pairingCode
      };
    } catch (error: any) {
      throw new Error(`Não foi possível gerar o QR Code: ${error.message}`);
    }
  }

  /**
   * Reconecta a sessão
   */
  async reconnectInstance(id: string) {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id }
    });

    if (!instance) {
      throw new Error('Instância não encontrada.');
    }

    await evolutionService.restartInstance(instance.instanceName);

    return this.getQRCode(id);
  }

  /**
   * Desconecta (Logout) a sessão do WhatsApp
   */
  async disconnectInstance(id: string) {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id }
    });

    if (!instance) {
      throw new Error('Instância não encontrada.');
    }

    await evolutionService.logoutInstance(instance.instanceName);

    return await prisma.whatsAppInstance.update({
      where: { id },
      data: {
        status: 'DISCONNECTED',
        qrcode: null
      }
    });
  }

  /**
   * Exclui a instância
   */
  async deleteInstance(id: string) {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customers: true }
        }
      }
    });

    if (!instance) {
      throw new Error('Instância não encontrada.');
    }

    if (instance._count.customers > 0) {
      throw new Error(`Esta instância possui ${instance._count.customers} cliente(s) vinculados. Reatribua os clientes antes de excluir.`);
    }

    // Deletar na Evolution API
    await evolutionService.deleteInstance(instance.instanceName);

    // Deletar no Banco
    return await prisma.whatsAppInstance.delete({
      where: { id }
    });
  }

  /**
   * Processa Webhooks da Evolution API para atualização de status em tempo real
   */
  async handleWebhook(body: any) {
    try {
      const event = body.event;
      const instanceName = body.instance;

      if (!instanceName) return;

      if (event === 'connection.update') {
        const state = body.data?.state;
        if (state) {
          const mappedStatus = this.mapStateToEnum(state);
          await prisma.whatsAppInstance.updateMany({
            where: { instanceName },
            data: {
              status: mappedStatus,
              lastConnectionAt: mappedStatus === 'CONNECTED' ? new Date() : undefined,
              qrcode: mappedStatus === 'CONNECTED' ? null : undefined
            }
          });
          console.log(`[Webhook Evolution] Instância ${instanceName} atualizada para ${mappedStatus}`);
        }
      }
    } catch (error) {
      console.error('[Webhook Evolution] Erro ao processar webhook:', error);
    }
  }

  /**
   * Envia uma mensagem avulsa externamente (via API ou webhook público)
   */
  async sendExternalMessage(data: {
    number?: string;
    phone?: string;
    message?: string;
    text?: string;
    instance?: string;
    instanceName?: string;
    whatsappId?: string;
  }) {
    const targetPhone = data.number || data.phone;
    const targetText = data.message || data.text;

    if (!targetPhone) {
      throw new Error('O campo "number" ou "phone" com o número de destino é obrigatório.');
    }
    if (!targetText) {
      throw new Error('O campo "message" ou "text" com a mensagem a ser enviada é obrigatório.');
    }

    const cleanPhone = String(targetPhone).replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      throw new Error('Número de telefone inválido. Informe com DDI e DDD (ex: 5591999999999).');
    }

    // 1. Encontrar a instância desejada ou a primeira conectada
    let instance: any = null;
    const requestedInstance = data.instance || data.instanceName || data.whatsappId;

    if (requestedInstance) {
      instance = await prisma.whatsAppInstance.findFirst({
        where: {
          OR: [
            { id: requestedInstance },
            { instanceName: requestedInstance },
            { name: requestedInstance }
          ]
        }
      });
      if (!instance) {
        throw new Error(`Instância WhatsApp "${requestedInstance}" não foi encontrada no sistema.`);
      }
    } else {
      // 1.1 Verificar se há uma instância configurada no painel como ativa/padrão para a API
      const defaultSetting = await prisma.setting.findUnique({
        where: { key: 'DEFAULT_API_WHATSAPP_ID' }
      });

      if (defaultSetting?.value) {
        instance = await prisma.whatsAppInstance.findUnique({
          where: { id: defaultSetting.value }
        });
      }

      // 1.2 Se não houver padrão configurado ou não encontrada, busca a primeira conectada
      if (!instance) {
        instance = await prisma.whatsAppInstance.findFirst({
          where: { status: 'CONNECTED' },
          orderBy: { updatedAt: 'desc' }
        });
      }

      // 1.3 Se nenhuma estiver com flag CONNECTED, pega qualquer uma cadastrada
      if (!instance) {
        instance = await prisma.whatsAppInstance.findFirst({
          orderBy: { createdAt: 'asc' }
        });
      }
    }

    if (!instance) {
      throw new Error('Nenhum número de WhatsApp cadastrado no sistema. Cadastre e conecte um número no painel primeiro.');
    }

    // 2. Disparar via Evolution API
    try {
      await evolutionService.sendTextMessage(instance.instanceName, cleanPhone, targetText);
    } catch (err: any) {
      // Registrar falha no histórico
      await prisma.messageHistory.create({
        data: {
          phone: cleanPhone,
          message: targetText,
          stage: 'MANUAL',
          status: 'FAILED',
          failureReason: err.message,
          whatsappId: instance.id
        }
      });
      throw err;
    }

    // 3. Gravar sucesso no histórico
    const history = await prisma.messageHistory.create({
      data: {
        phone: cleanPhone,
        message: targetText,
        stage: 'MANUAL',
        status: 'SENT',
        sentAt: new Date(),
        whatsappId: instance.id
      }
    });

    return {
      status: 'sucesso',
      message: 'Mensagem enviada com sucesso pelo WhatsApp!',
      messageId: history.id,
      destinatario: cleanPhone,
      instanciaUtilizada: {
        id: instance.id,
        name: instance.name,
        instanceName: instance.instanceName,
        phone: instance.phone
      },
      sentAt: history.sentAt
    };
  }

  /**
   * Define qual instância de WhatsApp é a padrão para envio via API (/send-message)
   */
  async setDefaultApiInstance(instanceId: string) {
    const instance = await prisma.whatsAppInstance.findUnique({
      where: { id: instanceId }
    });

    if (!instance) {
      throw new Error('Instância de WhatsApp não encontrada.');
    }

    await prisma.setting.upsert({
      where: { key: 'DEFAULT_API_WHATSAPP_ID' },
      update: { value: instanceId },
      create: {
        key: 'DEFAULT_API_WHATSAPP_ID',
        value: instanceId,
        description: 'ID da instância de WhatsApp padrão para disparos via API externa (/send-message)'
      }
    });

    return {
      message: `Número "${instance.name}" ativado com sucesso como padrão para a API externa!`,
      instance: {
        ...instance,
        isDefaultApi: true
      }
    };
  }
}

export const whatsAppService = new WhatsAppService();
