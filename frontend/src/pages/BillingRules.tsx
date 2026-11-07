import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Save, 
  Play, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import api from '../services/api.js';

export const BillingRules: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    DAYS_BEFORE_DUE: '3',
    SEND_ON_DUE_DATE: 'true',
    DAYS_AFTER_DUE: '2',
    SEND_START_HOUR: '08:00',
    SEND_END_HOUR: '18:00',
    MIN_DELAY_SECONDS: '15',
    MAX_DELAY_SECONDS: '35',
    DEFAULT_MESSAGE_BEFORE: '',
    DEFAULT_MESSAGE_DUE: '',
    DEFAULT_MESSAGE_AFTER: '',
    PIX_KEY: '',
    COMPANY_NAME: '',
    PAYMENT_LINK: ''
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingRun, setIsTestingRun] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ settings: Array<{ key: string; value: string }> }>('/settings');
      const map: Record<string, string> = {};
      res.data.settings.forEach(s => {
        map[s.key] = s.value;
      });
      setSettings(prev => ({ ...prev, ...map }));
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      await api.put('/settings', settings);
      setFeedback({ type: 'success', message: 'Configurações e régua de cobrança salvas com sucesso!' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Erro ao salvar configurações.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerNow = async () => {
    setIsTestingRun(true);
    setFeedback(null);
    try {
      const res = await api.post('/billing/run-now');
      const r = res.data.result;
      setFeedback({
        type: 'success',
        message: `Disparo concluído: ${r.sent} mensagens enviadas, ${r.skipped} já enviadas anteriormente, ${r.failed} falhas.`
      });
    } catch (error: any) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.error || 'Erro ao executar fila de cobrança.'
      });
    } finally {
      setIsTestingRun(false);
    }
  };

  const insertVariable = (fieldKey: string, variable: string) => {
    const currentValue = settings[fieldKey] || '';
    handleChange(fieldKey, currentValue + variable);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Feedback */}
      {feedback && (
        <div className={`p-4 rounded-2xl border text-sm font-medium flex items-center gap-3 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Seção 1: Régua de Prazos e Horários */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">Régua de Vencimento e Prazos</h3>
                <p className="text-xs text-slate-400">Defina os gatilhos automáticos para envio das mensagens</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Antes do Vencimento */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Lembrete Prévio (Dias Antes)
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={settings.DAYS_BEFORE_DUE || '3'}
                  onChange={(e) => handleChange('DAYS_BEFORE_DUE', e.target.value)}
                  className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 text-center focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500">dias antes do vencimento</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Ex: 3 dias antes alerta com valor e PIX.</p>
            </div>

            {/* No dia do Vencimento */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Envio no Dia do Vencimento
              </label>
              <div className="flex items-center gap-3 mt-3">
                <input
                  type="checkbox"
                  id="send_on_due"
                  checked={settings.SEND_ON_DUE_DATE === 'true'}
                  onChange={(e) => handleChange('SEND_ON_DUE_DATE', e.target.checked ? 'true' : 'false')}
                  className="w-5 h-5 text-emerald-600 rounded-lg focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="send_on_due" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Disparar no próprio dia
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Mensagem avisando que vence hoje.</p>
            </div>

            {/* Após o Vencimento */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Aviso de Atraso (Dias Após)
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.DAYS_AFTER_DUE || '2'}
                  onChange={(e) => handleChange('DAYS_AFTER_DUE', e.target.value)}
                  className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 text-center focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-500">dias após o vencimento</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Apenas para quem ainda constar em aberto.</p>
            </div>
          </div>

          {/* Janela de Horários e Anti-Ban */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
            {/* Janela de Horário */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800">Janela de Horário Comercial</h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Envios automáticos ocorrem exclusivamente dentro desta faixa para respeitar os clientes.
              </p>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Início</span>
                  <input
                    type="time"
                    value={settings.SEND_START_HOUR || '08:00'}
                    onChange={(e) => handleChange('SEND_START_HOUR', e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <span className="text-slate-400 mt-4">até</span>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Término</span>
                  <input
                    type="time"
                    value={settings.SEND_END_HOUR || '18:00'}
                    onChange={(e) => handleChange('SEND_END_HOUR', e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Intervalo Anti-Bloqueio */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-800">Proteção Anti-Bloqueio (Delay)</h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Intervalo aleatório em segundos entre cada mensagem enviada para simular digitação humana.
              </p>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Mínimo (s)</span>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={settings.MIN_DELAY_SECONDS || '15'}
                    onChange={(e) => handleChange('MIN_DELAY_SECONDS', e.target.value)}
                    className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center"
                  />
                </div>
                <span className="text-slate-400 mt-4">a</span>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Máximo (s)</span>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={settings.MAX_DELAY_SECONDS || '35'}
                    onChange={(e) => handleChange('MAX_DELAY_SECONDS', e.target.value)}
                    className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: Dados da Empresa e Chave PIX */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-800">Dados do Recebedor (Variáveis Dinâmicas)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chave PIX da Empresa</label>
              <input
                type="text"
                placeholder="Ex: 32115549805 ou CNPJ"
                value={settings.PIX_KEY || ''}
                onChange={(e) => handleChange('PIX_KEY', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium font-mono text-xs"
              />
              <span className="text-[11px] text-slate-400">Substitui a tag <code>{'{chave_pix}'}</code></span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Link de Pagamento / Cartão</label>
              <input
                type="text"
                placeholder="Ex: https://mpago.la/1V5t7hU"
                value={settings.PAYMENT_LINK || ''}
                onChange={(e) => handleChange('PAYMENT_LINK', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs"
              />
              <span className="text-[11px] text-slate-400">Substitui a tag <code>{'{link_pagamento}'}</code></span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Fantasia / Empresa</label>
              <input
                type="text"
                placeholder="Ex: Minha Empresa Serviços"
                value={settings.COMPANY_NAME || ''}
                onChange={(e) => handleChange('COMPANY_NAME', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-xs"
              />
              <span className="text-[11px] text-slate-400">Substitui a tag <code>{'{empresa}'}</code></span>
            </div>
          </div>
        </div>

        {/* Seção 3: Editor de Modelos de Mensagens */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800">Modelos de Mensagens Padrão</h3>
              <p className="text-xs text-slate-400">Modelos sugeridos para novos clientes ou envios que não possuem texto customizado individual</p>
            </div>
          </div>

          {/* Botões de atalho para inserção de variáveis */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Tags Dinâmicas:
            </span>
            {['{nome}', '{primeiro_nome}', '{vencimento}', '{valor}', '{chave_pix}', '{link_pagamento}', '{empresa}'].map((tag) => (
              <span key={tag} className="px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono text-[11px] text-emerald-700 font-bold shadow-2xs">
                {tag}
              </span>
            ))}
          </div>

          {/* Modelo 1: Antes do Vencimento */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">1. Mensagem: Dias Antes do Vencimento (Lembrete)</label>
              <div className="flex flex-wrap gap-1">
                {['{nome}', '{vencimento}', '{valor}', '{chave_pix}', '{link_pagamento}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable('DEFAULT_MESSAGE_BEFORE', ` ${tag} `)}
                    className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-2 py-0.5 rounded transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={5}
              value={settings.DEFAULT_MESSAGE_BEFORE || ''}
              onChange={(e) => handleChange('DEFAULT_MESSAGE_BEFORE', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* Modelo 2: No Dia do Vencimento */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">2. Mensagem: No Dia do Vencimento (Vence Hoje)</label>
              <div className="flex flex-wrap gap-1">
                {['{nome}', '{vencimento}', '{valor}', '{chave_pix}', '{link_pagamento}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable('DEFAULT_MESSAGE_DUE', ` ${tag} `)}
                    className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-2 py-0.5 rounded transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={6}
              value={settings.DEFAULT_MESSAGE_DUE || ''}
              onChange={(e) => handleChange('DEFAULT_MESSAGE_DUE', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          {/* Modelo 3: Após o Vencimento */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">3. Mensagem: Dias Após o Vencimento (Cobrança Pendente)</label>
              <div className="flex flex-wrap gap-1">
                {['{nome}', '{vencimento}', '{valor}', '{chave_pix}', '{link_pagamento}'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable('DEFAULT_MESSAGE_AFTER', ` ${tag} `)}
                    className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 px-2 py-0.5 rounded transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              rows={5}
              value={settings.DEFAULT_MESSAGE_AFTER || ''}
              onChange={(e) => handleChange('DEFAULT_MESSAGE_AFTER', e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
            />
          </div>
        </div>

        {/* Barra de Salvamento e Disparo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
          <button
            type="button"
            onClick={handleTriggerNow}
            disabled={isTestingRun}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Play className="w-4 h-4 text-emerald-600 fill-current" />
            <span>{isTestingRun ? 'Processando fila...' : 'Executar Cobranças Agora'}</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Regras e Mensagens'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
