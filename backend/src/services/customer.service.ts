import { prisma } from '../config/index.js';
import { CustomerStatus, RecurrenceType } from '../types/index.js';
import { startOfDay, endOfDay, addDays, isBefore } from 'date-fns';

export interface CustomerFilterParams {
  search?: string;
  status?: CustomerStatus;
  dueFilter?: 'OVERDUE' | 'TODAY' | 'UPCOMING_3' | 'UPCOMING_7' | 'ALL';
  whatsappId?: string;
  page?: number;
  limit?: number;
}

export interface CreateCustomerDTO {
  name: string;
  phone: string;
  dueDate: string | Date;
  recurrence: RecurrenceType;
  amount?: number | null;
  whatsappId: string;
  customMessage?: string | null;
  status?: CustomerStatus;
  notes?: string | null;
}

export class CustomerService {
  /**
   * Lista clientes com filtros avançados, busca e paginação
   */
  async listCustomers(params: CustomerFilterParams) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const skip = (page - 1) * limit;

    const where: any = {};

    // Filtro de busca textual por nome ou telefone
    if (params.search && params.search.trim() !== '') {
      const searchClean = params.search.trim();
      const phoneDigits = searchClean.replace(/\D/g, '');
      where.OR = [
        { name: { contains: searchClean, mode: 'insensitive' } },
        ...(phoneDigits ? [{ phone: { contains: phoneDigits } }] : [])
      ];
    }

    // Filtro de status
    if (params.status) {
      where.status = params.status;
    }

    // Filtro de WhatsApp responsável
    if (params.whatsappId) {
      where.whatsappId = params.whatsappId;
    }

    // Filtro de vencimento
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    if (params.dueFilter === 'OVERDUE') {
      where.dueDate = { lt: todayStart };
      where.status = 'ACTIVE';
    } else if (params.dueFilter === 'TODAY') {
      where.dueDate = {
        gte: todayStart,
        lte: todayEnd
      };
    } else if (params.dueFilter === 'UPCOMING_3') {
      where.dueDate = {
        gte: todayStart,
        lte: endOfDay(addDays(now, 3))
      };
    } else if (params.dueFilter === 'UPCOMING_7') {
      where.dueDate = {
        gte: todayStart,
        lte: endOfDay(addDays(now, 7))
      };
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          whatsapp: {
            select: {
              id: true,
              name: true,
              status: true,
              phone: true
            }
          },
          payments: {
            take: 1,
            orderBy: { paidAt: 'desc' }
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              createdAt: true,
              stage: true
            }
          }
        }
      })
    ]);

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtém detalhes completos do cliente (histórico de pagamentos e mensagens)
   */
  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        whatsapp: true,
        payments: {
          orderBy: { paidAt: 'desc' }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50
        },
        billingLogs: {
          orderBy: { sentAt: 'desc' }
        }
      }
    });

    if (!customer) {
      throw new Error('Cliente não encontrado.');
    }

    return customer;
  }

  /**
   * Normaliza telefone (apenas números, adicionando DDI 55 se omitido em 10/11 dígitos)
   */
  private normalizePhone(phone: string): string {
    let cleanPhone = String(phone || '').replace(/\D/g, '');
    if ((cleanPhone.length === 10 || cleanPhone.length === 11) && !cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }
    return cleanPhone;
  }

  private escapeCsvCell(value: unknown): string {
    const str = value === null || value === undefined ? '' : String(value);
    if (/[;"\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private parseCsvRecords(content: string, delimiter: string): string[][] {
    const records: string[][] = [];
    let row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (inQuotes) {
        if (char === '"' && content[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        row.push(current.trim());
        current = '';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && content[i + 1] === '\n') i++;
        row.push(current.trim());
        if (row.some((cell) => cell.length > 0)) {
          records.push(row);
        }
        row = [];
        current = '';
      } else {
        current += char;
      }
    }

    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) {
      records.push(row);
    }

    return records;
  }

  private parseFlexibleDate(val: unknown): Date {
    if (val instanceof Date && !isNaN(val.getTime())) return val;
    const raw = String(val || '').trim();
    if (!raw) return startOfDay(new Date());

    const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      const [, dd, mm, yyyy] = brMatch;
      return new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
    }

    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) return parsed;
    throw new Error(`Data de vencimento inválida: "${raw}"`);
  }

  private parseFlexibleAmount(val: unknown): number | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    let cleaned = String(val).replace(/[R$\s]/g, '');
    if (cleaned.includes(',') && cleaned.includes('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }

  private normalizeRecurrence(val: unknown): RecurrenceType {
    const raw = String(val || 'MENSAL').trim().toUpperCase();
    if (raw === 'TRIMESTRAL' || raw === 'SEMESTRAL' || raw === 'ANUAL') {
      return raw;
    }
    return 'MENSAL';
  }

  private normalizeStatus(val: unknown): CustomerStatus {
    const raw = String(val || 'ACTIVE').trim().toUpperCase();
    if (raw === 'INACTIVE' || raw === 'INATIVO') {
      return 'INACTIVE';
    }
    return 'ACTIVE';
  }

  private parseImportRows(params: { rawContent?: string; format?: 'json' | 'csv'; contacts?: any[] }): Record<string, any>[] {
    if (Array.isArray(params.contacts)) {
      return params.contacts;
    }

    const raw = String(params.rawContent || '').replace(/^\uFEFF/, '').trim();
    if (!raw) {
      throw new Error('Arquivo de backup vazio ou inválido.');
    }

    const looksLikeJson = params.format === 'json' || raw.startsWith('{') || raw.startsWith('[');
    if (looksLikeJson) {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed?.contacts || parsed?.customers;
      if (!Array.isArray(list)) {
        throw new Error('Estrutura JSON inválida. Esperado uma lista em "contacts".');
      }
      return list;
    }

    const firstLine = raw.split(/\r?\n/)[0] || '';
    const delimiter = (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0) ? ';' : ',';
    const records = this.parseCsvRecords(raw, delimiter);
    if (records.length < 2) {
      throw new Error('A planilha CSV precisa ter cabeçalho e ao menos 1 linha de contato.');
    }

    const rawHeaders = records[0];
    const normalizedKeys = rawHeaders.map((h) =>
      h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s-]+/g, '_')
    );
    const hasExplicitPhone = normalizedKeys.some((k) => ['telefone', 'phone', 'celular', 'numero'].includes(k));

    const headerMap: Record<string, string> = {
      nome: 'name',
      name: 'name',
      cliente: 'name',
      telefone: 'phone',
      phone: 'phone',
      celular: 'phone',
      numero: 'phone',
      whatsapp: hasExplicitPhone ? 'whatsappName' : 'phone',
      vencimento: 'dueDate',
      duedate: 'dueDate',
      data: 'dueDate',
      data_vencimento: 'dueDate',
      recorrencia: 'recurrence',
      recurrence: 'recurrence',
      plano: 'recurrence',
      valor: 'amount',
      amount: 'amount',
      mensalidade: 'amount',
      preco: 'amount',
      status: 'status',
      situacao: 'status',
      whatsapp_id: 'whatsappId',
      whatsappid: 'whatsappId',
      whatsapp_responsavel: 'whatsappName',
      whatsappname: 'whatsappName',
      dono_whatsapp: 'whatsappName',
      responsavel: 'whatsappName',
      mensagem_personalizada: 'customMessage',
      custommessage: 'customMessage',
      mensagem: 'customMessage',
      observacoes: 'notes',
      notes: 'notes',
      obs: 'notes'
    };

    const mappedHeaders = normalizedKeys.map((key) => headerMap[key] || key);

    return records.slice(1).map((values) => {
      const row: Record<string, any> = {};
      mappedHeaders.forEach((field, idx) => {
        if (values[idx] !== undefined && values[idx] !== '') {
          row[field] = values[idx];
        }
      });
      return row;
    });
  }

  /**
   * Cadastra novo cliente
   */
  async createCustomer(data: CreateCustomerDTO) {
    // Validar WhatsApp selecionado
    const whatsapp = await prisma.whatsAppInstance.findUnique({
      where: { id: data.whatsappId }
    });

    if (!whatsapp) {
      throw new Error('Número de WhatsApp selecionado não existe.');
    }

    const cleanPhone = this.normalizePhone(data.phone);
    if (cleanPhone.length < 10) {
      throw new Error('Número de telefone inválido. Informe DDD e número com DDI.');
    }

    const dueDate = new Date(data.dueDate);

    return await prisma.customer.create({
      data: {
        name: data.name.trim(),
        phone: cleanPhone,
        dueDate,
        recurrence: data.recurrence || 'MENSAL',
        amount: data.amount ? Number(data.amount) : null,
        whatsappId: data.whatsappId,
        customMessage: data.customMessage?.trim() || null,
        status: data.status || 'ACTIVE',
        notes: data.notes?.trim() || null
      },
      include: {
        whatsapp: {
          select: { id: true, name: true, status: true, phone: true }
        }
      }
    });
  }

  /**
   * Atualiza dados do cliente
   */
  async updateCustomer(id: string, data: Partial<CreateCustomerDTO>) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Cliente não encontrado para atualização.');
    }

    const cleanPhone = data.phone ? this.normalizePhone(data.phone) : existing.phone;

    return await prisma.customer.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.phone ? { phone: cleanPhone } : {}),
        ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
        ...(data.recurrence ? { recurrence: data.recurrence } : {}),
        ...(data.amount !== undefined ? { amount: data.amount ? Number(data.amount) : null } : {}),
        ...(data.whatsappId ? { whatsappId: data.whatsappId } : {}),
        ...(data.customMessage !== undefined ? { customMessage: data.customMessage?.trim() || null } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {})
      },
      include: {
        whatsapp: {
          select: { id: true, name: true, status: true, phone: true }
        }
      }
    });
  }

  /**
   * Exclui cliente
   */
  async deleteCustomer(id: string) {
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Cliente não encontrado.');
    }

    return await prisma.customer.delete({
      where: { id }
    });
  }

  /**
   * Exporta backup de contatos/clientes em JSON ou CSV
   */
  async exportCustomers(params: { format?: 'json' | 'csv'; whatsappId?: string; status?: string }) {
    const where: any = {};
    if (params.whatsappId && params.whatsappId !== 'ALL' && params.whatsappId !== 'all') {
      where.whatsappId = params.whatsappId;
    }
    if (params.status && params.status !== 'ALL' && params.status !== 'all') {
      where.status = params.status;
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        whatsapp: {
          select: { id: true, name: true, phone: true }
        }
      }
    });

    const formattedContacts = customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      dueDate: new Date(c.dueDate).toISOString().split('T')[0],
      recurrence: c.recurrence,
      amount: c.amount !== null && c.amount !== undefined ? Number(c.amount) : null,
      status: c.status,
      whatsappId: c.whatsappId,
      whatsappName: c.whatsapp?.name || '',
      whatsappPhone: c.whatsapp?.phone || '',
      customMessage: c.customMessage || '',
      notes: c.notes || ''
    }));

    const format = params.format === 'csv' ? 'csv' : 'json';
    const dateStamp = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      const headers = [
        'nome',
        'telefone',
        'vencimento',
        'recorrencia',
        'valor',
        'status',
        'whatsapp_responsavel',
        'whatsapp_id',
        'mensagem_personalizada',
        'observacoes'
      ];
      const rows = formattedContacts.map((c) =>
        [
          c.name,
          c.phone,
          c.dueDate,
          c.recurrence,
          c.amount !== null ? c.amount.toFixed(2) : '',
          c.status,
          c.whatsappName,
          c.whatsappId,
          c.customMessage,
          c.notes
        ]
          .map((cell) => this.escapeCsvCell(cell))
          .join(';')
      );
      const csvContent = `\uFEFF${[headers.join(';'), ...rows].join('\r\n')}`;
      return {
        filename: `backup-contatos-${dateStamp}.csv`,
        contentType: 'text/csv; charset=utf-8',
        content: csvContent,
        total: formattedContacts.length
      };
    }

    const jsonPayload = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      total: formattedContacts.length,
      contacts: formattedContacts
    };

    return {
      filename: `backup-contatos-${dateStamp}.json`,
      contentType: 'application/json; charset=utf-8',
      content: JSON.stringify(jsonPayload, null, 2),
      total: formattedContacts.length
    };
  }

  /**
   * Importa contatos em lote a partir de JSON ou CSV
   */
  async importCustomers(params: {
    rawContent?: string;
    format?: 'json' | 'csv';
    contacts?: any[];
    defaultWhatsappId?: string;
    assignMode?: 'preserve' | 'override';
    duplicateMode?: 'skip' | 'update';
  }) {
    const rows = this.parseImportRows(params);
    if (rows.length === 0) {
      throw new Error('Nenhum contato encontrado no arquivo para importar.');
    }

    const instances = await prisma.whatsAppInstance.findMany({
      orderBy: { createdAt: 'asc' }
    });
    if (instances.length === 0) {
      throw new Error('Cadastre pelo menos um número de WhatsApp antes de importar contatos.');
    }

    const instanceById = new Map(instances.map((i) => [i.id, i]));
    const instanceByName = new Map(instances.map((i) => [i.name.trim().toLowerCase(), i]));
    const instanceByPhone = new Map(
      instances.filter((i) => i.phone).map((i) => [this.normalizePhone(i.phone!), i])
    );

    const fallbackInstance =
      (params.defaultWhatsappId && instanceById.get(params.defaultWhatsappId)) || instances[0];

    const existingCustomers = await prisma.customer.findMany({
      select: { id: true, phone: true, whatsappId: true }
    });
    const existingMap = new Map<string, string>();
    existingCustomers.forEach((c) => {
      existingMap.set(`${this.normalizePhone(c.phone)}::${c.whatsappId}`, c.id);
    });

    const duplicateMode = params.duplicateMode === 'update' ? 'update' : 'skip';
    const assignMode = params.assignMode === 'override' ? 'override' : 'preserve';

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ row: number; name?: string; reason: string }> = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 1;

      try {
        const name = String(row.name || '').trim();
        if (name.length < 2) {
          throw new Error('Nome inválido ou vazio (mínimo 2 caracteres).');
        }

        const cleanPhone = this.normalizePhone(row.phone);
        if (cleanPhone.length < 10) {
          throw new Error(`Telefone inválido: "${row.phone || ''}"`);
        }

        let targetWhatsapp = fallbackInstance;
        if (assignMode === 'preserve') {
          const rowWaId = String(row.whatsappId || '').trim();
          const rowWaName = String(row.whatsappName || '').trim().toLowerCase();
          const rowWaPhone = row.whatsappPhone ? this.normalizePhone(row.whatsappPhone) : '';

          if (rowWaId && instanceById.has(rowWaId)) {
            targetWhatsapp = instanceById.get(rowWaId)!;
          } else if (rowWaName && instanceByName.has(rowWaName)) {
            targetWhatsapp = instanceByName.get(rowWaName)!;
          } else if (rowWaPhone && instanceByPhone.has(rowWaPhone)) {
            targetWhatsapp = instanceByPhone.get(rowWaPhone)!;
          }
        }

        const dueDate = this.parseFlexibleDate(row.dueDate);
        const recurrence = this.normalizeRecurrence(row.recurrence);
        const amount = this.parseFlexibleAmount(row.amount);
        const status = this.normalizeStatus(row.status);
        const customMessage = row.customMessage ? String(row.customMessage).trim() : null;
        const notes = row.notes ? String(row.notes).trim() : null;

        const key = `${cleanPhone}::${targetWhatsapp.id}`;
        const existingId = existingMap.get(key);

        if (existingId) {
          if (duplicateMode === 'skip') {
            skipped++;
            continue;
          }
          await prisma.customer.update({
            where: { id: existingId },
            data: {
              name,
              dueDate,
              recurrence,
              amount,
              status,
              customMessage,
              notes
            }
          });
          updated++;
        } else {
          const createdCust = await prisma.customer.create({
            data: {
              name,
              phone: cleanPhone,
              dueDate,
              recurrence,
              amount,
              whatsappId: targetWhatsapp.id,
              status,
              customMessage,
              notes
            }
          });
          existingMap.set(key, createdCust.id);
          created++;
        }
      } catch (err: any) {
        failed++;
        errors.push({
          row: rowNum,
          name: row?.name ? String(row.name) : undefined,
          reason: err.message || 'Erro desconhecido ao processar linha'
        });
      }
    }

    return {
      totalProcessed: rows.length,
      created,
      updated,
      skipped,
      failed,
      errors
    };
  }
}

export const customerService = new CustomerService();
