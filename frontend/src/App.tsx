import React, { useState } from 'react';
import { useAuth } from './context/AuthContext.js';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { Login } from './pages/Login.js';
import { Dashboard } from './pages/Dashboard.js';
import { Customers } from './pages/Customers.js';
import { WhatsAppNumbers } from './pages/WhatsAppNumbers.js';
import { BillingRules } from './pages/BillingRules.js';
import { MessageHistory } from './pages/MessageHistory.js';
import { SettingsPage } from './pages/Settings.js';
import { BackupPage } from './pages/Backup.js';
import { Modal } from './components/Modal.js';
import { Customer } from './types/index.js';
import api from './services/api.js';

export function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isTriggeringBilling, setIsTriggeringBilling] = useState(false);

  // Modal Global de Pagamento (pode ser acionado tanto pelo Dashboard quanto por Clientes)
  const [payModalCustomer, setPayModalCustomer] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNotes, setPayNotes] = useState('');
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  const handleOpenGlobalPayModal = (customer: Customer) => {
    setPayModalCustomer(customer);
    setPayAmount(customer.amount ? String(customer.amount) : '');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayNotes(`Pagamento confirmado referente ao vencimento ${new Date(customer.dueDate).toLocaleDateString('pt-BR')}`);
  };

  const handleConfirmGlobalPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payModalCustomer) return;

    try {
      setIsSubmittingPay(true);
      await api.post(`/payments/customer/${payModalCustomer.id}/pay`, {
        amount: payAmount ? parseFloat(payAmount) : null,
        paidAt: payDate,
        notes: payNotes
      });
      alert('Pagamento registrado com sucesso! O próximo ciclo de vencimento foi calculado.');
      setPayModalCustomer(null);
      // Forçar recarregamento visual se estiver no dashboard
      window.location.reload();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao registrar pagamento.');
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleGlobalTriggerBilling = async () => {
    try {
      setIsTriggeringBilling(true);
      const res = await api.post('/billing/run-now');
      const r = res.data.result;
      alert(`Disparo concluído: ${r.sent} enviadas, ${r.skipped} já enviadas anteriormente, ${r.failed} falhas.`);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao disparar cobranças.');
    } finally {
      setIsTriggeringBilling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="font-semibold text-slate-300">Iniciando CobraZap Pro...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard Geral', subtitle: 'Visão consolidada de clientes, vencimentos e envios' },
    clientes: { title: 'Gestão de Clientes', subtitle: 'Cadastro, controle de mensalidades e avanço de ciclos' },
    whatsapp: { title: 'Números WhatsApp', subtitle: 'Instâncias conectadas, geração de QR Code e sessões' },
    cobrancas: { title: 'Cobranças & Régua', subtitle: 'Prazos de disparo, janela de horário e mensagens automáticas' },
    historico: { title: 'Histórico de Envios', subtitle: 'Auditoria de mensagens enviadas, entregues e falhas' },
    configuracoes: { title: 'Configurações', subtitle: 'Segurança da conta e diagnóstico do sistema' },
    backup: { title: 'Backup & Manutenção', subtitle: 'Rotinas de segurança e comandos de infraestrutura VPS' }
  };

  const currentInfo = tabTitles[currentTab] || tabTitles.dashboard;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Lateral */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Header
          title={currentInfo.title}
          subtitle={currentInfo.subtitle}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onTriggerBillingNow={handleGlobalTriggerBilling}
          isTriggeringBilling={isTriggeringBilling}
        />

        {/* View da Tab Ativa */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {currentTab === 'dashboard' && (
            <Dashboard 
              onNavigateToTab={setCurrentTab} 
              onOpenPayModal={handleOpenGlobalPayModal}
            />
          )}
          {currentTab === 'clientes' && <Customers />}
          {currentTab === 'whatsapp' && <WhatsAppNumbers />}
          {currentTab === 'cobrancas' && <BillingRules />}
          {currentTab === 'historico' && <MessageHistory />}
          {currentTab === 'configuracoes' && <SettingsPage />}
          {currentTab === 'backup' && <BackupPage />}
        </main>
      </div>

      {/* Modal Global de Pagamento (para acionamento rápido no Dashboard) */}
      <Modal
        isOpen={!!payModalCustomer}
        onClose={() => setPayModalCustomer(null)}
        title="Confirmar Baixa de Pagamento"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmGlobalPayment} className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/60 text-xs text-emerald-900 space-y-1">
            <p className="font-bold text-sm text-emerald-950">{payModalCustomer?.name}</p>
            <p>Vencimento atual sendo quitado: <strong>{payModalCustomer ? new Date(payModalCustomer.dueDate).toLocaleDateString('pt-BR') : ''}</strong></p>
            <p>Recorrência: <strong>{payModalCustomer?.recurrence}</strong></p>
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
              onClick={() => setPayModalCustomer(null)}
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
    </div>
  );
}
