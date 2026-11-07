import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  Send, 
  Edit2, 
  Trash2, 
  Eye, 
  Calendar, 
  DollarSign, 
  Smartphone,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  RotateCw
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { Customer, WhatsAppInstance, RecurrenceType, CustomerStatus, Payment, MessageHistory } from '../types/index.js';
import api from '../services/api.js';

interface CustomersProps {
  onTriggerPaymentModal?: (customer: Customer) => void;
}

export const Customers: React.FC<CustomersProps> = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [whatsapps, setWhatsapps] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros e Busca
  const [search, setSearch] = useState('');
  const [dueFilter, setDueFilter] = useState<'ALL' | 'OVERDUE' | 'TODAY' | 'UPCOMING_3' | 'UPCOMING_7'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [whatsappFilter, setWhatsappFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modais
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [sendMsgModalOpen, setSendMsgModalOpen] = useState(false);

  // Cliente selecionado para ação
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any>(null);

  // Formulário de Cadastro/Edição
  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    dueDate: string;
    recurrence: RecurrenceType;
    amount: string;
    whatsappId: string;
    customMessage: string;
    status: CustomerStatus;
    notes: string;
  }>({
    name: '',
    phone: '',
    dueDate: new Date().toISOString().split('T')[0],
    recurrence: 'MENSAL',
    amount: '',
    whatsappId: '',
    customMessage: '',
    status: 'ACTIVE',
    notes: ''
  });

  // Formulário de Pagamento
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Formulário de Envio Manual
  const [manualMessageText, setManualMessageText] = useState('');
  const [isSendingManual, setIsSendingManual] = useState(false);

  // Carregar lista de clientes
  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (dueFilter !== 'ALL') params.append('dueFilter', dueFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (whatsappFilter !== 'ALL') params.append('whatsappId', whatsappFilter);
      params.append('page', String(page));
      params.append('limit', '15');

      const response = await api.get(`/customers?${params.toString()}`);
      setCustomers(response.data.customers);
      setTotalPages(response.data.pagination.totalPages);
      setTotalCount(response.data.pagination.total);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar WhatsApps disponíveis para o dropdown
  const fetchWhatsapps = async () => {
    try {
      const res = await api.get('/whatsapp');
      setWhatsapps(res.data.instances);
      if (res.data.instances.length > 0 && !formData.whatsappId) {
        setFormData(prev => ({ ...prev, whatsappId: res.data.instances[0].id }));
      }
    } catch (error) {
      console.error('Erro ao buscar WhatsApps:', error);
    }
  };

  useEffect(() => {
    fetchWhatsapps();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [search, dueFilter, statusFilter, whatsappFilter, page]);

  // Abertura do modal de criação
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      phone: '',
      dueDate: new Date().toISOString().split('T')[0],
      recurrence: 'MENSAL',
      amount: '',
      whatsappId: whatsapps.length > 0 ? whatsapps[0].id : '',
      customMessage: '',
      status: 'ACTIVE',
      notes: ''
    });
    setCreateModalOpen(true);
  };

  // Salvar novo cliente
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', {
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : null
      });
      setCreateModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao cadastrar cliente.');
    }
  };

  // Abertura do modal de edição
  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      dueDate: new Date(customer.dueDate).toISOString().split('T')[0],
      recurrence: customer.recurrence,
      amount: customer.amount ? String(customer.amount) : '',
      whatsappId: customer.whatsappId,
      customMessage: customer.customMessage || '',
      status: customer.status,
      notes: customer.notes || ''
    });
    setEditModalOpen(true);
  };

  // Salvar edição
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      await api.put(`/customers/${selectedCustomer.id}`, {
        ...formData,
        amount: formData.amount ? parseFloat(formData.amount) : null
      });
      setEditModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao atualizar cliente.');
    }
  };

  // Excluir cliente
  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Deseja realmente excluir o cliente "${customer.name}"? Todo o histórico de cobrança deste cliente será mantido apenas para auditoria.`)) {
      return;
    }
    try {
      await api.delete(`/customers/${customer.id}`);
      fetchCustomers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao excluir cliente.');
    }
  };

  // Abertura do modal de Pagamento
  const handleOpenPay = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPayAmount(customer.amount ? String(customer.amount) : '');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes(`Pagamento confirmado referente ao vencimento ${new Date(customer.dueDate).toLocaleDateString('pt-BR')}`);
    setPayModalOpen(true);
  };

  // Confirmar pagamento
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      setIsSubmittingPay(true);
      await api.post(`/payments/customer/${selectedCustomer.id}/pay`, {
        amount: payAmount ? parseFloat(payAmount) : null,
        paidAt: payDate,
        notes: payNotes
      });
      setPayModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao registrar pagamento.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  // Abertura do modal de Detalhes
  const handleOpenDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsModalOpen(true);
    setCustomerDetails(null);
    try {
      const res = await api.get(`/customers/${customer.id}`);
      setCustomerDetails(res.data.customer);
    } catch (e) {
      console.error(e);
    }
  };

  // Abertura do modal de Envio Manual
  const handleOpenSendManual = (customer: Customer) => {
    setSelectedCustomer(customer);
    setManualMessageText(customer.customMessage || '');
    setSendMsgModalOpen(true);
  };

  // Disparo manual
  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      setIsSendingManual(true);
      await api.post(`/billing/customer/${selectedCustomer.id}/send-manual`, {
        message: manualMessageText.trim() || undefined
      });
      alert('Mensagem enviada com sucesso para a fila do WhatsApp!');
      setSendMsgModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || 'Erro ao enviar mensagem.');
    } finally {
      setIsSendingManual(false);
    }
  };

  // Renderizador de badge de vencimento
  const renderDueBadge = (dueDateStr: string) => {
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(dueDate);
    dueDay.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Atrasado ({Math.abs(diffDays)}d)
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3 text-amber-600" />
          Vence Hoje
        </span>
      );
    } else if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
          Em {diffDays} dias
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          Em dia
        </span>
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Busca Textual */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Pesquisar por nome ou número com DDD..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
            />
          </div>

          {/* Filtros Selecionáveis */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro de Vencimento */}
            <select
              value={dueFilter}
              onChange={(e) => { setDueFilter(e.target.value as any); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Vencimento: Todos</option>
              <option value="OVERDUE">Apenas Vencidos</option>
              <option value="TODAY">Vence Hoje</option>
              <option value="UPCOMING_3">Próximos 3 dias</option>
              <option value="UPCOMING_7">Próximos 7 dias</option>
            </select>

            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Status: Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>

            {/* Filtro de WhatsApp */}
            <select
              value={whatsappFilter}
              onChange={(e) => { setWhatsappFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 max-w-[170px] truncate"
            >
              <option value="ALL">WhatsApp: Todos</option>
              {whatsapps.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>

            {/* Botão Novo Cliente */}
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Telefone / WhatsApp</th>
                <th className="px-5 py-3.5">Vencimento</th>
                <th className="px-5 py-3.5">Valor / Recorrência</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Carregando lista de clientes...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Nenhum cliente encontrado com os filtros aplicados.</p>
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Cliente */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800">{cust.name}</div>
                      {cust.notes && <div className="text-[11px] text-slate-400 truncate max-w-xs">{cust.notes}</div>}
                    </td>

                    {/* Telefone & WhatsApp Responsável */}
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-800">{cust.phone}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Smartphone className="w-3 h-3 text-slate-400" />
                        <span>{cust.whatsapp?.name || 'Não atribuído'}</span>
                      </div>
                    </td>

                    {/* Vencimento e Badge */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-800">
                        {new Date(cust.dueDate).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="mt-1">
                        {renderDueBadge(cust.dueDate)}
                      </div>
                    </td>

                    {/* Valor e Recorrência */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800">
                        R$ {cust.amount ? Number(cust.amount).toFixed(2) : '0,00'}
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        {cust.recurrence}
                      </span>
                    </td>

                    {/* Status Ativo/Inativo */}
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${
                        cust.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {cust.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Botão de Destaque: Marcar como Pago */}
                        <button
                          onClick={() => handleOpenPay(cust)}
                          title="Marcar como Pago (Avançar Ciclo)"
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Baixar</span>
                        </button>

                        {/* Enviar Mensagem Avulsa Agora */}
                        <button
                          onClick={() => handleOpenSendManual(cust)}
                          title="Enviar Cobrança Agora pelo WhatsApp"
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>

                        {/* Detalhes / Histórico */}
                        <button
                          onClick={() => handleOpenDetails(cust)}
                          title="Ver Detalhes e Histórico"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Editar */}
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          title="Editar Cadastro"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Excluir */}
                        <button
                          onClick={() => handleDelete(cust)}
                          title="Excluir Cliente"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé e Paginação */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Mostrando <strong>{customers.length}</strong> de <strong>{totalCount}</strong> clientes</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">Página {page} de {totalPages || 1}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Novo Cliente / Edição */}
      <Modal
        isOpen={createModalOpen || editModalOpen}
        onClose={() => { setCreateModalOpen(false); setEditModalOpen(false); }}
        title={createModalOpen ? 'Cadastrar Novo Cliente' : 'Editar Cliente'}
        maxWidth="lg"
      >
        <form onSubmit={createModalOpen ? handleCreateSubmit : handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: João da Silva"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone com DDD *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ex: 5511999999999"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Vencimento *</label>
              <input
                type="date"
                required
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recorrência *</label>
              <select
                value={formData.recurrence}
                onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="MENSAL">Mensal (+1 mês após pago)</option>
                <option value="TRIMESTRAL">Trimestral (+3 meses)</option>
                <option value="SEMESTRAL">Semestral (+6 meses)</option>
                <option value="ANUAL">Anual (+1 ano)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Valor da Mensalidade (R$)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="Ex: 150.00"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Responsável *</label>
              <select
                required
                value={formData.whatsappId}
                onChange={(e) => setFormData({ ...formData, whatsappId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {whatsapps.length === 0 ? (
                  <option value="">Nenhum número cadastrado ainda</option>
                ) : (
                  whatsapps.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.status === 'CONNECTED' ? 'Conectado' : 'Offline'})</option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mensagem Personalizada de Cobrança (Opcional)
            </label>
            <textarea
              rows={3}
              value={formData.customMessage}
              onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
              placeholder="Deixe em branco para usar o modelo padrão das configurações, ou personalize usando: {nome}, {vencimento}, {valor}, {chave_pix}..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
            />
            <span className="text-[11px] text-slate-400">Variáveis disponíveis: {'{nome}'}, {'{primeiro_nome}'}, {'{vencimento}'}, {'{valor}'}, {'{chave_pix}'}, {'{link_pagamento}'}, {'{empresa}'}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status do Cliente</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ACTIVE">Ativo (recebe cobranças automáticas)</option>
                <option value="INACTIVE">Inativo (cobranças pausadas)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações Internas</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ex: Plano Empresa, contato financeiro etc."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => { setCreateModalOpen(false); setEditModalOpen(false); }}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs"
            >
              {createModalOpen ? 'Cadastrar Cliente' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Marcar como Pago */}
      <Modal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        title="Confirmar Baixa de Pagamento"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmPayment} className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs text-emerald-900 space-y-1">
            <p className="font-bold text-sm text-emerald-950">{selectedCustomer?.name}</p>
            <p>Vencimento atual sendo quitado: <strong>{selectedCustomer ? new Date(selectedCustomer.dueDate).toLocaleDateString('pt-BR') : ''}</strong></p>
            <p>Recorrência: <strong>{selectedCustomer?.recurrence}</strong></p>
            <p className="text-emerald-700 mt-2">
              ✓ Ao confirmar, a nova data de vencimento será calculada automaticamente e o ciclo de cobrança será reiniciado para evitar cobranças indevidas.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Valor Pago (R$) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data do Pagamento *</label>
            <input
              type="date"
              required
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observação do Pagamento</label>
            <input
              type="text"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="Ex: Pago via PIX"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPayModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingPay}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs disabled:opacity-60"
            >
              {isSubmittingPay ? 'Registrando...' : 'Confirmar e Avançar Vencimento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Enviar Cobrança Manual Agora */}
      <Modal
        isOpen={sendMsgModalOpen}
        onClose={() => setSendMsgModalOpen(false)}
        title={`Enviar Cobrança WhatsApp: ${selectedCustomer?.name || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleSendManual} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
            <p>Destino: <strong>{selectedCustomer?.phone}</strong></p>
            <p>WhatsApp emissor: <strong>{selectedCustomer?.whatsapp?.name || 'Não vinculado'}</strong></p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mensagem a Enviar (Opcional - deixe vazio para usar o padrão):
            </label>
            <textarea
              rows={4}
              value={manualMessageText}
              onChange={(e) => setManualMessageText(e.target.value)}
              placeholder="Personalize o texto ou envie o padrão..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSendMsgModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSendingManual}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingManual ? 'Disparando...' : 'Enviar Agora'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Detalhes e Histórico Completo */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title={`Ficha do Cliente: ${selectedCustomer?.name || ''}`}
        maxWidth="xl"
      >
        {!customerDetails ? (
          <div className="py-12 text-center text-slate-400">
            <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <span>Carregando dados detalhados...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informações Gerais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-400 block">Telefone</span>
                <span className="font-bold text-slate-800">{customerDetails.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Vencimento Atual</span>
                <span className="font-bold text-slate-800">{new Date(customerDetails.dueDate).toLocaleDateString('pt-BR')}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Recorrência</span>
                <span className="font-bold text-slate-800">{customerDetails.recurrence}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Valor</span>
                <span className="font-bold text-slate-800">R$ {customerDetails.amount ? Number(customerDetails.amount).toFixed(2) : '0,00'}</span>
              </div>
            </div>

            {/* Histórico de Pagamentos */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Histórico de Pagamentos Confirmados</h4>
              {customerDetails.payments?.length === 0 ? (
                <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border border-slate-100">Nenhum pagamento registrado ainda.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
                  {customerDetails.payments?.map((p: any) => (
                    <div key={p.id} className="p-3 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-bold text-emerald-700">R$ {Number(p.amount).toFixed(2)}</span>
                        <span className="text-slate-500 ml-2">Pago em: {new Date(p.paidAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <span className="text-slate-400 text-[11px] truncate max-w-xs">{p.notes}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Histórico de Mensagens Enviadas */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Últimas Mensagens WhatsApp</h4>
              {customerDetails.messages?.length === 0 ? (
                <p className="text-xs text-slate-400 bg-white p-3 rounded-xl border border-slate-100">Nenhuma mensagem disparada ainda.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {customerDetails.messages?.map((m: any) => (
                    <div key={m.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">{m.stage}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {m.status}
                        </span>
                      </div>
                      <p className="text-slate-600 font-mono text-[11px] bg-slate-50 p-2 rounded-lg whitespace-pre-wrap">{m.message}</p>
                      <span className="text-[10px] text-slate-400 block">{new Date(m.createdAt).toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
