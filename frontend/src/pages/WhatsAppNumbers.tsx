import React, { useEffect, useState, useRef } from 'react';
import { 
  Smartphone, 
  Plus, 
  RefreshCw, 
  QrCode, 
  PowerOff, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  MessageSquare,
  ShieldAlert,
  HardDrive
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { WhatsAppInstance } from '../types/index.js';
import api from '../services/api.js';

export const WhatsAppNumbers: React.FC = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');

  // Estados do Modal de QR Code
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeInstance, setActiveInstance] = useState<WhatsAppInstance | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ qrcode?: string | null; pairingCode?: string } | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [qrStatusText, setQrStatusText] = useState('Carregando QR Code...');
  const pollTimerRef = useRef<any>(null);

  const fetchInstances = async () => {
    try {
      const response = await api.get<{ instances: WhatsAppInstance[] }>('/whatsapp');
      setInstances(response.data.instances);
    } catch (error) {
      console.error('Erro ao buscar instâncias de WhatsApp:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 15000); // polling suave de status a cada 15s
    return () => clearInterval(interval);
  }, []);

  // Limpeza de timer de polling de QR Code
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleCreateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstanceName.trim()) return;

    try {
      setIsCreating(true);
      const res = await api.post('/whatsapp', { name: newInstanceName.trim() });
      setNewInstanceName('');
      await fetchInstances();
      // Abre imediatamente o modal de QR code da nova instância criada
      handleOpenQRCode(res.data.instance);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao cadastrar número de WhatsApp.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenQRCode = async (instance: WhatsAppInstance) => {
    setActiveInstance(instance);
    setQrCodeData(null);
    setQrModalOpen(true);
    setIsLoadingQr(true);
    setQrStatusText('Gerando QR Code via Evolution API...');

    try {
      const res = await api.get(`/whatsapp/${instance.id}/qrcode`);
      setQrCodeData(res.data);
      setQrStatusText('Aponte seu WhatsApp para o QR Code abaixo:');
      
      // Inicia polling a cada 3 segundos para detectar quando o usuário ler o QR code
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        try {
          const checkRes = await api.get(`/whatsapp/${instance.id}`);
          if (checkRes.data.instance.status === 'CONNECTED') {
            clearInterval(pollTimerRef.current);
            setQrStatusText('WhatsApp conectado com sucesso!');
            setTimeout(() => {
              setQrModalOpen(false);
              fetchInstances();
            }, 1500);
          }
        } catch (e) {
          // Ignora falha transitória
        }
      }, 3000);

    } catch (error: any) {
      setQrStatusText(error.response?.data?.error || 'Erro ao gerar QR Code. Tente reconectar.');
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleCloseQrModal = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setQrModalOpen(false);
    setActiveInstance(null);
    setQrCodeData(null);
    fetchInstances();
  };

  const handleReconnect = async (instanceId: string) => {
    try {
      const inst = instances.find(i => i.id === instanceId);
      if (inst) {
        handleOpenQRCode(inst);
        await api.post(`/whatsapp/${instanceId}/reconnect`);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao tentar reconectar.');
    }
  };

  const handleDisconnect = async (instanceId: string) => {
    if (!confirm('Deseja realmente desconectar esta sessão de WhatsApp?')) return;
    try {
      await api.post(`/whatsapp/${instanceId}/disconnect`);
      await fetchInstances();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao desconectar WhatsApp.');
    }
  };

  const handleDelete = async (instance: WhatsAppInstance) => {
    const customerCount = instance._count?.customers || 0;
    if (customerCount > 0) {
      alert(`Não é possível excluir: existem ${customerCount} cliente(s) vinculados a este número. Altere o número responsável no cadastro dos clientes antes.`);
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o número "${instance.name}"? As mensagens e dados locais da sessão serão removidos.`)) {
      return;
    }

    try {
      await api.delete(`/whatsapp/${instance.id}`);
      await fetchInstances();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao excluir número.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de Persistência e Informações */}
      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">Sessões WhatsApp Persistentes em Volume Docker</h4>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              Cada número cadastrado possui sua própria sessão multi-device isolada e salva no volume persistente <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono text-[11px]">evolution_instances</code>. Conexões permanecem salvas mesmo após reiniciar a VPS ou os containers.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Ações: Adicionar Número */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
        <h3 className="text-base font-bold text-slate-800 mb-3">Adicionar Novo Número WhatsApp</h3>
        <form onSubmit={handleCreateInstance} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              placeholder="Ex: WhatsApp Cobrança 01, Financeiro Matriz..."
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-sm font-semibold rounded-xl shadow-xs flex items-center justify-center gap-2 shrink-0 transition-all disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreating ? 'Cadastrando...' : 'Cadastrar e Conectar'}</span>
          </button>
        </form>
      </div>

      {/* Grid de Instâncias de WhatsApp */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-800">Números Cadastrados ({instances.length})</h3>
          <button
            onClick={fetchInstances}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar Status</span>
          </button>
        </div>

        {instances.length === 0 && !isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
            <Smartphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700">Nenhum número cadastrado ainda</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Cadastre seu primeiro número de WhatsApp acima para gerar o QR Code e começar a automatizar cobranças.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {instances.map((inst) => {
              const isConnected = inst.status === 'CONNECTED';
              const isConnecting = inst.status === 'CONNECTING';

              return (
                <div 
                  key={inst.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md p-5 flex flex-col justify-between ${
                    isConnected ? 'border-emerald-200 ring-1 ring-emerald-500/10' : 'border-slate-200/80'
                  }`}
                >
                  <div>
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="font-bold text-base text-slate-800 tracking-tight">{inst.name}</h4>
                        <span className="text-[11px] font-mono text-slate-400">ID: {inst.instanceName}</span>
                      </div>

                      {/* Badge de Status */}
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isConnected
                          ? 'bg-emerald-100 text-emerald-800'
                          : isConnecting
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${
                          isConnected 
                            ? 'bg-emerald-500 animate-pulse' 
                            : isConnecting 
                            ? 'bg-amber-500 animate-spin' 
                            : 'bg-rose-500'
                        }`} />
                        <span>{isConnected ? 'Conectado' : isConnecting ? 'Conectando' : 'Desconectado'}</span>
                      </span>
                    </div>

                    {/* Informações da Instância */}
                    <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Users className="w-3.5 h-3.5" /> Clientes vinculados:
                        </span>
                        <span className="font-bold text-slate-800">{inst._count?.customers || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <MessageSquare className="w-3.5 h-3.5" /> Mensagens enviadas:
                        </span>
                        <span className="font-bold text-slate-800">{inst._count?.messages || 0}</span>
                      </div>
                      {inst.lastConnectionAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Última conexão:</span>
                          <span className="font-medium text-slate-600">
                            {new Date(inst.lastConnectionAt).toLocaleDateString('pt-BR')} às {new Date(inst.lastConnectionAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações da Instância */}
                  <div className="pt-4 mt-3 flex items-center justify-between gap-2">
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(inst.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        <PowerOff className="w-3.5 h-3.5 text-rose-500" />
                        <span>Desconectar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenQRCode(inst)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Conectar QR Code</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleReconnect(inst.id)}
                      title="Reiniciar conexão"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(inst)}
                      title="Excluir este número"
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Conexão com QR Code */}
      <Modal
        isOpen={qrModalOpen}
        onClose={handleCloseQrModal}
        title={`Conectar WhatsApp: ${activeInstance?.name || ''}`}
        maxWidth="md"
      >
        <div className="text-center py-2 space-y-4">
          <p className="text-sm font-medium text-slate-700">{qrStatusText}</p>

          <div className="flex items-center justify-center min-h-[260px] bg-slate-50 border border-slate-200 rounded-2xl p-4">
            {isLoadingQr ? (
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                <span className="text-xs text-slate-500">Comunicando com a Evolution API...</span>
              </div>
            ) : qrCodeData?.qrcode ? (
              <div className="flex flex-col items-center">
                <img
                  src={qrCodeData.qrcode.startsWith('data:image') ? qrCodeData.qrcode : `data:image/png;base64,${qrCodeData.qrcode}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain rounded-xl border border-slate-200 shadow-sm bg-white p-2"
                />
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Aguardando leitura no WhatsApp...
                </span>
              </div>
            ) : (
              <div className="text-center p-4">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-slate-600">Não foi possível carregar o QR Code no momento.</p>
                <button
                  onClick={() => activeInstance && handleReconnect(activeInstance.id)}
                  className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                >
                  Tentar Novamente
                </button>
              </div>
            )}
          </div>

          <div className="text-left bg-slate-50 rounded-xl p-3 border border-slate-200/60 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Como conectar:</p>
            <p>1. Abra o WhatsApp no seu smartphone.</p>
            <p>2. Toque em <strong>Configurações</strong> ou <strong>Menu (3 pontos)</strong>.</p>
            <p>3. Selecione <strong>Aparelhos conectados</strong> e clique em <strong>Conectar um aparelho</strong>.</p>
            <p>4. Aponte a câmera para o QR Code acima.</p>
          </div>

          <button
            onClick={handleCloseQrModal}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
          >
            Fechar Janela
          </button>
        </div>
      </Modal>
    </div>
  );
};
