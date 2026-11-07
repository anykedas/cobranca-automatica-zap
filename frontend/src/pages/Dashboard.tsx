import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  AlertTriangle, 
  Send, 
  AlertOctagon, 
  Smartphone, 
  DollarSign,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { StatCard } from '../components/StatCard.js';
import { DashboardStats, Customer, Payment } from '../types/index.js';
import api from '../services/api.js';

interface DashboardProps {
  onNavigateToTab: (tab: string) => void;
  onOpenPayModal: (customer: Customer) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTab, onOpenPayModal }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [urgentCustomers, setUrgentCustomers] = useState<Customer[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, urgentRes, paymentsRes] = await Promise.all([
        api.get<DashboardStats>('/stats/dashboard'),
        api.get<{ customers: Customer[] }>('/customers?dueFilter=OVERDUE&limit=5'),
        api.get<{ payments: Payment[] }>('/payments/recent?limit=5')
      ]);

      setStats(statsRes.data);
      setUrgentCustomers(urgentRes.data.customers);
      setRecentPayments(paymentsRes.data.payments);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Grid de Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="Total de Clientes"
          value={stats?.totalCustomers || 0}
          icon={Users}
          variant="slate"
          description="Base total cadastrada"
        />
        <StatCard
          title="Clientes Ativos"
          value={stats?.activeCustomers || 0}
          icon={UserCheck}
          variant="emerald"
          badge={`${stats?.totalCustomers ? Math.round(((stats.activeCustomers || 0) / stats.totalCustomers) * 100) : 0}% ativos`}
          description="Recebendo cobranças ativas"
        />
        <StatCard
          title="Próximos do Vencimento"
          value={stats?.upcomingCustomers || 0}
          icon={Clock}
          variant="amber"
          description="Vencendo nos próximos 3 dias"
        />
        <StatCard
          title="Clientes Vencidos"
          value={stats?.overdueCustomers || 0}
          icon={AlertTriangle}
          variant="rose"
          description="Mensalidades em aberto"
        />
        <StatCard
          title="Mensagens Enviadas"
          value={stats?.sentMessages || 0}
          icon={Send}
          variant="blue"
          description="Disparadas com sucesso"
        />
        <StatCard
          title="Falhas no Envio"
          value={stats?.failedMessages || 0}
          icon={AlertOctagon}
          variant="rose"
          description="Necessitam de atenção ou reenvio"
        />
        <StatCard
          title="WhatsApps Conectados"
          value={`${stats?.connectedWhatsAppCount || 0} de ${stats?.totalWhatsAppCount || 0}`}
          icon={Smartphone}
          variant="purple"
          badge={stats?.connectedWhatsAppCount && stats.connectedWhatsAppCount > 0 ? 'Online' : 'Atenção'}
          description="Instâncias prontas para disparo"
        />
        <StatCard
          title="Faturamento do Mês"
          value={`R$ ${(stats?.revenueThisMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          variant="emerald"
          description={`${stats?.paymentsCountThisMonth || 0} pagamentos confirmados`}
        />
      </div>

      {/* Seção Inferior: Vencidos / Urgentes & Últimos Pagamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Clientes Vencidos / Atenção */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Clientes com Pagamento Vencido</h3>
                  <p className="text-xs text-slate-400">Requerem acompanhamento ou cobrança</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('clientes')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {urgentCustomers.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-medium text-slate-600">Excelente! Nenhum cliente vencido no momento.</p>
                <p className="text-xs text-slate-400 mt-1">Todos os pagamentos estão em dia.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {urgentCustomers.map((cust) => (
                  <div key={cust.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-800 truncate">{cust.name}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{cust.phone}</span>
                        <span>•</span>
                        <span className="text-rose-600 font-medium">
                          Venceu em {new Date(cust.dueDate).toLocaleDateString('pt-BR')}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-800">
                        R$ {cust.amount ? Number(cust.amount).toFixed(2) : '0,00'}
                      </span>
                      <button
                        onClick={() => onOpenPayModal(cust)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/60"
                      >
                        Baixar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card: Últimos Pagamentos Recebidos */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Últimos Pagamentos Confirmados</h3>
                  <p className="text-xs text-slate-400">Histórico recente de quitações</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('clientes')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
              >
                <span>Ver clientes</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentPayments.length === 0 ? (
              <div className="py-10 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Nenhum pagamento registrado ainda.</p>
                <p className="text-xs text-slate-400 mt-1">Ao marcar um cliente como pago, ele aparecerá aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentPayments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.customer?.name || 'Cliente'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Pago em {new Date(p.paidAt).toLocaleDateString('pt-BR')} às {new Date(p.paidAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-emerald-600">
                        + R$ {Number(p.amount).toFixed(2)}
                      </span>
                      <p className="text-[10px] text-slate-400">Ciclo baixado</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
