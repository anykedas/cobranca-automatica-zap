import React, { useEffect, useState, useCallback } from 'react';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Wallet, 
  AlertTriangle, 
  Plus, 
  RotateCw, 
  Calendar, 
  Smartphone, 
  Building2, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  ExternalLink,
  Receipt,
  FileSpreadsheet,
  Check
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { 
  FinanceStats, 
  SupplierExpense, 
  MonthlyReport, 
  OverdueCustomer, 
  WhatsAppInstance,
  RecurrenceType,
  ExpenseStatus
} from '../types/index.js';
import api from '../services/api.js';

export const Financial: React.FC = () => {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedWhatsapp, setSelectedWhatsapp] = useState<string>('all');
  
  // Tabs internas do módulo
  const [activeSubTab, setActiveSubTab] = useState<'fornecedores' | 'relatorio' | 'inadimplencia'>('fornecedores');

  // Dados
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [expenses, setExpenses] = useState<SupplierExpense[]>([]);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [overdueCustomers, setOverdueCustomers] = useState<OverdueCustomer[]>([]);
  const [whatsapps, setWhatsapps] = useState<WhatsAppInstance[]>([]);

  // Estados de Carregamento
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtro da lista de despesas
  const [expenseStatusFilter, setExpenseStatusFilter] = useState<'all' | 'PENDING' | 'PAID'>('all');

  // Modais
  const [isCreateExpenseModalOpen, setIsCreateExpenseModalOpen] = useState(false);
  const [isPayExpenseModalOpen, setIsPayExpenseModalOpen] = useState(false);
  const [selectedExpenseToPay, setSelectedExpenseToPay] = useState<SupplierExpense | null>(null);

  // Formulário Nova Despesa
  const [expenseForm, setExpenseForm] = useState<{
    name: string;
    category: string;
    amount: string;
    dueDate: string;
    whatsappId: string;
    recurrence: string;
    status: ExpenseStatus;
    notes: string;
  }>({
    name: '',
    category: 'Chips / Telefonia',
    amount: '',
    dueDate: new Date().toISOString().split('T')[0],
    whatsappId: 'all',
    recurrence: 'MENSAL',
    status: 'PENDING',
    notes: ''
  });

  // Formulário Quitação Despesa
  const [payExpenseDate, setPayExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [payExpenseNotes, setPayExpenseNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carregar lista de WhatsApps
  const fetchWhatsapps = async () => {
    try {
      const res = await api.get('/whatsapp');
      setWhatsapps(res.data.instances || []);
    } catch (error) {
      console.error('Erro ao carregar instâncias de WhatsApp', error);
    }
  };

  // Carregar dados financeiros
  const loadFinancialData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const queryParams = new URLSearchParams({
        whatsappId: selectedWhatsapp,
        month: String(selectedMonth),
        year: String(selectedYear)
      });

      const [statsRes, expensesRes, reportRes, overdueRes] = await Promise.all([
        api.get(`/finance/stats?${queryParams.toString()}`),
        api.get(`/finance/expenses?${queryParams.toString()}&status=${expenseStatusFilter}`),
        api.get(`/finance/monthly-report?whatsappId=${selectedWhatsapp}&year=${selectedYear}`),
        api.get(`/finance/overdue-customers?whatsappId=${selectedWhatsapp}`)
      ]);

      setStats(statsRes.data);
      setExpenses(expensesRes.data.expenses || []);
      setMonthlyReport(reportRes.data);
      setOverdueCustomers(overdueRes.data.customers || []);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedWhatsapp, selectedMonth, selectedYear, expenseStatusFilter]);

  useEffect(() => {
    fetchWhatsapps();
  }, []);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Formatação de Moeda
  const formatCurrency = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Formatação de Data
  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Criar Despesa
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.name || !expenseForm.amount || !expenseForm.dueDate) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/finance/expenses', {
        name: expenseForm.name,
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        dueDate: expenseForm.dueDate,
        status: expenseForm.status,
        whatsappId: expenseForm.whatsappId === 'all' ? null : expenseForm.whatsappId,
        recurrence: expenseForm.recurrence === 'NONE' ? null : expenseForm.recurrence,
        notes: expenseForm.notes || null
      });

      alert('Despesa com fornecedor registrada com sucesso!');
      setIsCreateExpenseModalOpen(false);
      setExpenseForm({
        name: '',
        category: 'Chips / Telefonia',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        whatsappId: 'all',
        recurrence: 'MENSAL',
        status: 'PENDING',
        notes: ''
      });
      loadFinancialData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao registrar despesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Baixa em Despesa (Marcar como Pago)
  const handleConfirmPayExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseToPay) return;

    try {
      setIsSubmitting(true);
      await api.patch(`/finance/expenses/${selectedExpenseToPay.id}/pay`, {
        paidAt: payExpenseDate,
        notes: payExpenseNotes || undefined
      });

      alert('Pagamento ao fornecedor confirmado com sucesso!');
      setIsPayExpenseModalOpen(false);
      setSelectedExpenseToPay(null);
      loadFinancialData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao registrar baixa da despesa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir Despesa
  const handleDeleteExpense = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir a despesa "${name}"?`)) return;
    try {
      await api.delete(`/finance/expenses/${id}`);
      loadFinancialData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao excluir despesa.');
    }
  };

  const monthsList = [
    { num: 1, name: 'Janeiro' },
    { num: 2, name: 'Fevereiro' },
    { num: 3, name: 'Março' },
    { num: 4, name: 'Abril' },
    { num: 5, name: 'Maio' },
    { num: 6, name: 'Junho' },
    { num: 7, name: 'Julho' },
    { num: 8, name: 'Agosto' },
    { num: 9, name: 'Setembro' },
    { num: 10, name: 'Outubro' },
    { num: 11, name: 'Novembro' },
    { num: 12, name: 'Dezembro' }
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Filtros Superiores (Isolamento por WhatsApp e Período) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Seletor de Instância de WhatsApp */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Carteira WhatsApp
              </label>
              <select
                value={selectedWhatsapp}
                onChange={(e) => setSelectedWhatsapp(e.target.value)}
                className="font-semibold text-slate-800 text-sm bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-4"
              >
                <option value="all">🏢 Todos os Números WhatsApp (Consolidado)</option>
                {whatsapps.map((w) => (
                  <option key={w.id} value={w.id}>
                    📱 {w.name}{w.phone && w.phone !== w.name ? ` (${w.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1" />

          {/* Mês e Ano */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {monthsList.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadFinancialData}
            disabled={isRefreshing}
            title="Atualizar dados"
            className="p-2.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-xl transition-all border border-slate-200"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          
          <button
            onClick={() => setIsCreateExpenseModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo Fornecedor / Custo</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs Financeiros (DRE Operacional em Tempo Real) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Receitas Aprovadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Receitas Aprovadas</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(stats?.totalApprovedRevenue)}
            </h3>
            <p className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{stats?.paymentsCount || 0} pagamentos confirmados</span>
            </p>
          </div>
        </div>

        {/* 2. Despesas com Fornecedores */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Custos Fornecedores</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(stats?.totalSupplierExpensesPaid)}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 mt-1">
              {stats?.paidExpensesCount || 0} quitados {stats?.totalSupplierExpensesPending ? `(+ ${formatCurrency(stats?.totalSupplierExpensesPending)} pend.)` : ''}
            </p>
          </div>
        </div>

        {/* 3. Lucro Líquido Real (Destaque Principal) */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 rounded-2xl shadow-md text-white flex flex-col justify-between relative overflow-hidden sm:col-span-2 lg:col-span-1">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <DollarSign className="w-32 h-32 text-white" />
          </div>
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Lucro Líquido Real</span>
            <span className="text-[10px] font-bold bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full text-white">
              Margem: {stats?.profitMargin || 0}%
            </span>
          </div>
          <div className="mt-3 z-10">
            <h3 className="text-2xl font-black tracking-tight text-white">
              {formatCurrency(stats?.netProfit)}
            </h3>
            <p className="text-[11px] text-emerald-100 mt-1 font-medium">
              = Receitas - Despesas Pagas
            </p>
          </div>
        </div>

        {/* 4. Carteira Geral Contratada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Carteira Ativa</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(stats?.totalContractValue)}
            </h3>
            <p className="text-[11px] font-medium text-blue-600 mt-1">
              {stats?.activeCustomersCount || 0} clientes ativos contratados
            </p>
          </div>
        </div>

        {/* 5. Inadimplência Atual */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">Inadimplência</span>
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-amber-900 tracking-tight">
              {formatCurrency(stats?.overdueAmount)}
            </h3>
            <p className="text-[11px] font-bold text-amber-700 mt-1">
              {stats?.overdueCount || 0} {stats?.overdueCount === 1 ? 'cliente vencido' : 'clientes vencidos'}
            </p>
          </div>
        </div>
      </div>

      {/* Navegação por Sub-Abas */}
      <div className="border-b border-slate-200">
        <div className="flex items-center gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveSubTab('fornecedores')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeSubTab === 'fornecedores'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Gestão de Fornecedores & Custos</span>
            <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {expenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('relatorio')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeSubTab === 'relatorio'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Demonstrativo Anual (DRE 12 Meses)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('inadimplencia')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
              activeSubTab === 'inadimplencia'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Raio-X de Inadimplência</span>
            {overdueCustomers.length > 0 && (
              <span className="text-[11px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold">
                {overdueCustomers.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Conteúdo da Aba 1: Fornecedores & Custos */}
      {activeSubTab === 'fornecedores' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          {/* Header da Tabela com Filtros de Status */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Contas e Fornecedores a Pagar</h3>
              <p className="text-xs text-slate-500">
                Lançamento de despesas operacionais, chips, servidores e painéis
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">Status:</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setExpenseStatusFilter('all')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    expenseStatusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setExpenseStatusFilter('PENDING')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    expenseStatusFilter === 'PENDING'
                      ? 'bg-white text-amber-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setExpenseStatusFilter('PAID')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    expenseStatusFilter === 'PAID'
                      ? 'bg-white text-emerald-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pagos
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Despesas */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-4">Fornecedor / Descrição</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">WhatsApp Vinculado</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                      <p className="font-medium">Nenhum custo com fornecedor registrado neste período.</p>
                      <button
                        onClick={() => setIsCreateExpenseModalOpen(true)}
                        className="mt-3 text-emerald-600 font-bold hover:underline"
                      >
                        + Cadastrar primeiro fornecedor
                      </button>
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const isPaid = exp.status === 'PAID';
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{exp.name}</p>
                          {exp.notes && (
                            <p className="text-[11px] text-slate-500 truncate max-w-xs">{exp.notes}</p>
                          )}
                          {exp.recurrence && (
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-semibold">
                              Recorrência: {exp.recurrence}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {exp.whatsapp ? (
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{exp.whatsapp.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">🏢 Geral (Compartilhado)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {formatDate(exp.dueDate)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="py-3 px-4">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Pago ({formatDate(exp.paidAt)})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" />
                              <span>Pendente</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPaid && (
                              <button
                                onClick={() => {
                                  setSelectedExpenseToPay(exp);
                                  setPayExpenseDate(new Date().toISOString().split('T')[0]);
                                  setPayExpenseNotes('');
                                  setIsPayExpenseModalOpen(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                              >
                                Dar Baixa
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteExpense(exp.id, exp.name)}
                              title="Excluir"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 2: Demonstrativo Anual (DRE 12 Meses) */}
      {activeSubTab === 'relatorio' && (
        <div className="space-y-6">
          {/* Card Resumo do Ano */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Receita Anual ({selectedYear})</span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(monthlyReport?.summary.totalYearRevenue)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Custos Anuais Fornecedores</span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {formatCurrency(monthlyReport?.summary.totalYearExpenses)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Lucro Anual Consolidado</span>
              <p className="text-lg font-bold text-emerald-600 mt-1">
                {formatCurrency(monthlyReport?.summary.totalYearProfit)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs text-slate-500 font-semibold">Margem Líquida Anual</span>
              <p className="text-lg font-bold text-teal-600 mt-1">
                {monthlyReport?.summary.yearMargin || 0}%
              </p>
            </div>
          </div>

          {/* Tabela dos 12 Meses */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Demonstrativo Mês a Mês ({selectedYear})</h3>
              <p className="text-xs text-slate-500">Histórico de faturamento aprovado, despesas de fornecedores e lucro líquido real</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <th className="py-3 px-4">Mês</th>
                    <th className="py-3 px-4">Receita Aprovada</th>
                    <th className="py-3 px-4">Despesas Fornecedores</th>
                    <th className="py-3 px-4">Lucro Líquido</th>
                    <th className="py-3 px-4">Margem Líquida</th>
                    <th className="py-3 px-4 text-center">Pagamentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {monthlyReport?.months.map((m) => {
                    const isPositive = m.profit >= 0;
                    return (
                      <tr key={m.month} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800 capitalize">
                          {m.fullMonthName}
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-600">
                          {formatCurrency(m.revenue)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-rose-600">
                          {formatCurrency(m.expenses)}
                        </td>
                        <td className="py-3 px-4 font-bold text-sm">
                          <span className={isPositive ? 'text-emerald-700' : 'text-rose-600'}>
                            {formatCurrency(m.profit)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 max-w-[80px] bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} 
                                style={{ width: `${Math.min(Math.max(m.margin, 0), 100)}%` }} 
                              />
                            </div>
                            <span className="font-semibold text-[11px] text-slate-600">{m.margin}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-600 font-medium">
                          {m.paymentsCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo da Aba 3: Raio-X de Inadimplência */}
      {activeSubTab === 'inadimplencia' && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Clientes em Atraso (Vencidos)</h3>
              <p className="text-xs text-slate-500">Lista detalhada de mensalidades pendentes para ação imediata de cobrança</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500">Total Inadimplente:</span>
              <p className="text-base font-bold text-rose-600">{formatCurrency(stats?.overdueAmount)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">WhatsApp Responsável</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Data Vencimento</th>
                  <th className="py-3 px-4">Atraso</th>
                  <th className="py-3 px-4">Valor Devido</th>
                  <th className="py-3 px-4 text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {overdueCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 stroke-[1.5]" />
                      <p className="font-medium text-slate-600">Nenhum cliente inadimplente no momento!</p>
                      <p className="text-xs text-slate-400 mt-1">Todas as mensalidades estão em dia nesta carteira.</p>
                    </td>
                  </tr>
                ) : (
                  overdueCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{cust.name}</p>
                        <span className="text-[10px] text-slate-500">Recorrência: {cust.recurrence}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{cust.whatsappName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {cust.phone}
                      </td>
                      <td className="py-3 px-4 font-semibold text-rose-700">
                        {formatDate(cust.dueDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {cust.daysOverdue} {cust.daysOverdue === 1 ? 'dia' : 'dias'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        {formatCurrency(cust.amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`https://wa.me/${cust.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Abrir WhatsApp</span>
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Novo Fornecedor / Custo */}
      <Modal
        isOpen={isCreateExpenseModalOpen}
        onClose={() => setIsCreateExpenseModalOpen(false)}
        title="Cadastrar Custo com Fornecedor"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Controle Operacional & Lucro Líquido</p>
            <p>
              Ao registrar este custo, o valor será automaticamente subtraído do total de receitas aprovadas do WhatsApp selecionado para o cálculo do seu lucro real.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome do Fornecedor / Serviço *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Fornecedor de Chips, Servidor VPS, Painel IPTV, Licença API"
              value={expenseForm.name}
              onChange={(e) => setExpenseForm({ ...expenseForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria *
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="Chips / Telefonia">📱 Chips / Telefonia</option>
                <option value="Servidores / Infra">☁️ Servidores / Infraestrutura</option>
                <option value="Painéis / APIs">🔑 Painéis / Fornecedores / APIs</option>
                <option value="Proxies / Redes">🌐 Proxies / Conectividade</option>
                <option value="Outros Custos">💼 Outros Custos Operacionais</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Valor a Pagar (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Vencimento *
              </label>
              <input
                type="date"
                required
                value={expenseForm.dueDate}
                onChange={(e) => setExpenseForm({ ...expenseForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp Responsável *
              </label>
              <select
                value={expenseForm.whatsappId}
                onChange={(e) => setExpenseForm({ ...expenseForm, whatsappId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="all">🏢 Geral (Compartilhado entre todas as instâncias)</option>
                {whatsapps.map((w) => (
                  <option key={w.id} value={w.id}>
                    📱 {w.name}{w.phone && w.phone !== w.name ? ` (${w.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Recorrência
              </label>
              <select
                value={expenseForm.recurrence}
                onChange={(e) => setExpenseForm({ ...expenseForm, recurrence: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="MENSAL">Mensal (Cria próximo ciclo ao quitar)</option>
                <option value="TRIMESTRAL">Trimestral</option>
                <option value="SEMESTRAL">Semestral</option>
                <option value="ANUAL">Anual</option>
                <option value="NONE">Pontual / Sem Recorrência</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Inicial
              </label>
              <select
                value={expenseForm.status}
                onChange={(e) => setExpenseForm({ ...expenseForm, status: e.target.value as ExpenseStatus })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="PENDING">⏳ Pendente (A pagar)</option>
                <option value="PAID">✅ Já foi Pago</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações / Dados de Pagamento (PIX, Link, etc.)
            </label>
            <input
              type="text"
              placeholder="Ex: Chave PIX do fornecedor: 123.456.789-00"
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateExpenseModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? 'Cadastrando...' : 'Cadastrar Fornecedor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Confirmar Baixa em Fornecedor */}
      <Modal
        isOpen={isPayExpenseModalOpen}
        onClose={() => {
          setIsPayExpenseModalOpen(false);
          setSelectedExpenseToPay(null);
        }}
        title="Confirmar Pagamento ao Fornecedor"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmPayExpense} className="space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
            <p className="font-bold text-sm text-emerald-950">{selectedExpenseToPay?.name}</p>
            <p>Valor a quitar: <strong>{formatCurrency(selectedExpenseToPay?.amount)}</strong></p>
            <p>Vencimento: <strong>{formatDate(selectedExpenseToPay?.dueDate)}</strong></p>
            {selectedExpenseToPay?.recurrence && (
              <p className="text-emerald-700 mt-2 font-medium">
                ✓ Esta despesa possui recorrência {selectedExpenseToPay.recurrence}. Ao confirmar a quitação, o próximo ciclo a vencer será gerado automaticamente.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Data da Transferência / Pagamento *
            </label>
            <input
              type="date"
              required
              value={payExpenseDate}
              onChange={(e) => setPayExpenseDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Comprovante / Observação
            </label>
            <input
              type="text"
              placeholder="Ex: Pago via PIX Banco Inter - Autenticação 982348"
              value={payExpenseNotes}
              onChange={(e) => setPayExpenseNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsPayExpenseModalOpen(false);
                setSelectedExpenseToPay(null);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? 'Registrando...' : 'Confirmar Quitação'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
