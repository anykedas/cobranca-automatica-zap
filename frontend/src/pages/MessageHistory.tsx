import React, { useEffect, useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  RotateCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Send
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { MessageHistory as IMessageHistory, MessageStatus, BillingStage } from '../types/index.js';
import api from '../services/api.js';

export const MessageHistory: React.FC = () => {
  const [messages, setMessages] = useState<IMessageHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros e Paginação
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal de Detalhes da Mensagem
  const [selectedMsg, setSelectedMsg] = useState<IMessageHistory | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (stageFilter !== 'ALL') params.append('stage', stageFilter);
      params.append('page', String(page));
      params.append('limit', '20');

      const res = await api.get(`/history?${params.toString()}`);
      setMessages(res.data.items);
      setTotalPages(res.data.pagination.totalPages);
      setTotalCount(res.data.pagination.total);
    } catch (error) {
      console.error('Erro ao buscar histórico de mensagens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [search, statusFilter, stageFilter, page]);

  const handleOpenDetails = (msg: IMessageHistory) => {
    setSelectedMsg(msg);
    setDetailsModalOpen(true);
  };

  const handleRetry = async (historyId: string) => {
    try {
      setIsRetrying(true);
      const res = await api.post(`/billing/retry/${historyId}`);
      alert(res.data.message);
      setDetailsModalOpen(false);
      fetchMessages();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao reenviar mensagem.');
    } finally {
      setIsRetrying(false);
    }
  };

  const renderStatusBadge = (status: MessageStatus) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Enviada
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Falha
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3 text-amber-600" />
            Pendente
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            <XCircle className="w-3 h-3 text-slate-400" />
            Cancelada
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const renderStageLabel = (stage: BillingStage) => {
    switch (stage) {
      case 'BEFORE_DUE':
        return <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">Lembrete Prévio</span>;
      case 'ON_DUE':
        return <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">No Vencimento</span>;
      case 'AFTER_DUE':
        return <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">Atraso / Pendência</span>;
      case 'MANUAL':
        return <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">Disparo Manual</span>;
      default:
        return <span>{stage}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de Filtros e Busca */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por cliente, número ou conteúdo da mensagem..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-800"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filtro de Status */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Status: Todos</option>
              <option value="SENT">Enviadas</option>
              <option value="FAILED">Com Falha</option>
              <option value="PENDING">Pendentes</option>
              <option value="CANCELLED">Canceladas</option>
            </select>

            {/* Filtro de Etapa */}
            <select
              value={stageFilter}
              onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Etapa: Todas</option>
              <option value="BEFORE_DUE">Antes do Vencimento</option>
              <option value="ON_DUE">No Vencimento</option>
              <option value="AFTER_DUE">Após Vencimento</option>
              <option value="MANUAL">Disparo Manual</option>
            </select>

            <button
              onClick={fetchMessages}
              className="p-2.5 text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200 rounded-xl transition-colors"
              title="Atualizar lista"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabela do Histórico */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="px-5 py-3.5">Data / Horário</th>
                <th className="px-5 py-3.5">Cliente & Destino</th>
                <th className="px-5 py-3.5">WhatsApp Emissor</th>
                <th className="px-5 py-3.5">Etapa</th>
                <th className="px-5 py-3.5">Mensagem</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Carregando histórico...</span>
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Nenhum registro de envio encontrado.</p>
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Data / Hora */}
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                      <div>
                        {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Cliente e Telefone */}
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-800">{m.customer?.name || 'Cliente Avulso'}</div>
                      <div className="text-xs text-slate-500 font-mono">{m.phone}</div>
                    </td>

                    {/* WhatsApp */}
                    <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{m.whatsapp?.name || 'Removido'}</span>
                      </div>
                    </td>

                    {/* Etapa */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {renderStageLabel(m.stage)}
                    </td>

                    {/* Conteúdo Preview */}
                    <td className="px-5 py-3.5 text-xs">
                      <p className="truncate max-w-xs text-slate-600 font-mono text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                        {m.message}
                      </p>
                      {m.failureReason && (
                        <span className="text-[10px] text-rose-600 font-medium block mt-0.5 truncate max-w-xs">
                          Motivo: {m.failureReason}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {renderStatusBadge(m.status)}
                    </td>

                    {/* Ação */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetails(m)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total: <strong>{totalCount}</strong> envios registrados</span>
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

      {/* Modal de Detalhes da Mensagem e Reenvio */}
      <Modal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        title="Detalhes do Envio e Auditoria"
        maxWidth="md"
      >
        {selectedMsg && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 block">Cliente</span>
                <span className="font-bold text-slate-800">{selectedMsg.customer?.name || 'Cliente'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Telefone Destino</span>
                <span className="font-bold text-slate-800 font-mono">{selectedMsg.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block">WhatsApp Utilizado</span>
                <span className="font-bold text-slate-800">{selectedMsg.whatsapp?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Status Atual</span>
                <div className="mt-0.5">{renderStatusBadge(selectedMsg.status)}</div>
              </div>
            </div>

            <div>
              <span className="font-semibold text-slate-700 block mb-1">Texto Enviado:</span>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] whitespace-pre-wrap leading-relaxed text-slate-800">
                {selectedMsg.message}
              </div>
            </div>

            {selectedMsg.failureReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 space-y-1">
                <span className="font-bold block">Motivo da Falha:</span>
                <p className="font-mono text-[11px]">{selectedMsg.failureReason}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold hover:bg-slate-200"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={() => handleRetry(selectedMsg.id)}
                disabled={isRetrying}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center gap-1.5 shadow-xs disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isRetrying ? 'Reenviando...' : 'Tentar Reenviar Mensagem'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
