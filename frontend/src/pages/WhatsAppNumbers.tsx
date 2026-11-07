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
  HardDrive,
  Zap,
  Copy,
  Check,
  Edit2
} from 'lucide-react';
import { Modal } from '../components/Modal.js';
import { WhatsAppInstance } from '../types/index.js';
import api from '../services/api.js';

export const WhatsAppNumbers: React.FC = () => {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [newInstancePhone, setNewInstancePhone] = useState('');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState(false);

  // Estados de Edição da Instância
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState<WhatsAppInstance | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const defaultInstance = instances.find(i => i.isDefaultApi);
  const defaultInstanceId = defaultInstance?.id;

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText('http://147.15.81.42/send-message');
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleSetDefaultApi = async (instanceId: string) => {
    if (!instanceId) return;
    try {
      setIsSettingDefault(true);
      const res = await api.post(`/whatsapp/${instanceId}/set-default-api`);
      alert(res.data.message || 'Número ativado com sucesso para a API!');
      await fetchInstances();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao definir número ativo para a API.');
    } finally {
      setIsSettingDefault(false);
    }
  };

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
      const res = await api.post('/whatsapp', { 
        name: newInstanceName.trim(),
        phone: newInstancePhone.trim() || undefined
      });
      setNewInstanceName('');
      setNewInstancePhone('');
      await fetchInstances();
      // Abre imediatamente o modal de QR code da nova instância criada
      handleOpenQRCode(res.data.instance);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao cadastrar número de WhatsApp.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (inst: WhatsAppInstance) => {
    setEditingInstance(inst);
    setEditName(inst.name);
    setEditPhone(inst.phone || '');
    setEditModalOpen(true);
  };

  const handleUpdateInstance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInstance || !editName.trim()) return;

    try {
      setIsUpdating(true);
      await api.put(`/whatsapp/${editingInstance.id}`, {
        name: editName.trim(),
        phone: editPhone.trim() || undefined
      });
      setEditModalOpen(false);
      setEditingInstance(null);
      await fetchInstances();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao atualizar dados do WhatsApp.');
    } finally {
      setIsUpdating(false);
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
      {/* Painel de Controle do Endpoint de Envio via API */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5 shadow-xs shadow-amber-500/20">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">
                  Número Ativo para Envio via API Externa
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                  Endpoint /send-message
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Selecione abaixo qual número de WhatsApp conectado fará os disparos quando você, seus robôs ou a Alexa chamarem o link da API. Se não especificar a instância na requisição, este número será o responsável pelo envio.
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5 font-mono text-xs">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-800 font-semibold select-all shadow-2xs">
                  POST http://147.15.81.42/send-message
                </span>
                <button
                  onClick={handleCopyEndpoint}
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEndpoint ? 'Link Copiado!' : 'Copiar Endpoint'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Seletor Rápido do Número Padrão da API */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-3 rounded-xl border border-amber-200/90 shadow-2xs">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap px-1">
              WhatsApp Ativo na API:
            </label>
            <select
              value={defaultInstanceId || ''}
              onChange={(e) => handleSetDefaultApi(e.target.value)}
              disabled={isSettingDefault || instances.length === 0}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              <option value="" disabled>Selecione o número da API...</option>
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.isDefaultApi ? '⭐ ' : ''}{i.name} {i.phone ? `(${i.phone})` : ''} - {i.status === 'CONNECTED' ? '🟢 Conectado' : '⚪ ' + i.status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

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
        <div className="mb-3">
          <h3 className="text-base font-bold text-slate-800">Adicionar Novo Número WhatsApp</h3>
          <p className="text-xs text-slate-500 mt-0.5">Informe o nome do responsável ou setor e o número de WhatsApp para identificação.</p>
        </div>
        <form onSubmit={handleCreateInstance} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="relative sm:col-span-6">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Users className="w-4 h-4" />
            </div>
            <input
              type="text"
              required
              placeholder="Nome / Dono do WhatsApp (Ex: Carlos Cobrança, Financeiro...)"
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800"
            />
          </div>
          <div className="relative sm:col-span-4">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Número com DDD (Ex: 5511999999999)"
              value={newInstancePhone}
              onChange={(e) => setNewInstancePhone(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="sm:col-span-2 w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 shrink-0 transition-all disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreating ? 'Salvando...' : 'Cadastrar'}</span>
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
                    {/* Header do Card com Nome do Dono e Telefone */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-base text-slate-800 tracking-tight truncate" title={inst.name}>
                            {inst.name}
                          </h4>
                          <button
                            onClick={() => handleOpenEdit(inst)}
                            title="Editar Nome do Dono e Número"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {inst.phone ? (
                          <div className="flex items-center gap-1 text-xs font-mono font-semibold text-slate-600 mt-0.5">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{inst.phone}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenEdit(inst)}
                            className="text-[11px] text-amber-600 hover:text-amber-800 underline block mt-0.5"
                          >
                            + Informar número de telefone
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5 truncate">
                          ID: {inst.instanceName}
                        </span>
                      </div>

                      {/* Badges de Status e API */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
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

                        {inst.isDefaultApi && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                            <Zap className="w-3 h-3 fill-white" />
                            <span>Ativo na API</span>
                          </span>
                        )}
                      </div>
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
                  <div className="space-y-2 pt-4 mt-3 border-t border-slate-100">
                    {/* Botão de Ativar para API */}
                    <div className="flex items-center justify-between gap-2">
                      {inst.isDefaultApi ? (
                        <div className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                          <Check className="w-3.5 h-3.5 text-amber-700" />
                          <span>Número Padrão da API Externa</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultApi(inst.id)}
                          disabled={isSettingDefault}
                          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                          <span>Ativar este WhatsApp para a API</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
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
                        onClick={() => handleOpenEdit(inst)}
                        title="Editar Nome do Dono e Telefone"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

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
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </Modal>

      {/* Modal de Edição de Nome / Dono do WhatsApp */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Editar Identificação do WhatsApp"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateInstance} className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl text-xs text-emerald-900">
            <p className="font-semibold">Defina o nome do dono ou setor responsável por este WhatsApp.</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Este nome aparecerá para você selecionar na hora de cadastrar clientes e nos filtros de envio.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome / Dono do WhatsApp *
            </label>
            <input
              type="text"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Ex: Carlos (Comercial), Financeiro Matriz..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Número de Telefone com DDD
            </label>
            <input
              type="text"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="Ex: 5511975165281"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
