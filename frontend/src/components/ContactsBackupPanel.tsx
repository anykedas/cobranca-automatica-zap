import React, { useEffect, useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  X
} from 'lucide-react';
import { WhatsAppInstance } from '../types/index.js';
import api from '../services/api.js';

interface ImportResult {
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ row: number; name?: string; reason: string }>;
}

interface ContactsBackupPanelProps {
  whatsapps?: WhatsAppInstance[];
  onImportSuccess?: () => void;
  compact?: boolean;
}

export const ContactsBackupPanel: React.FC<ContactsBackupPanelProps> = ({
  whatsapps: propWhatsapps,
  onImportSuccess,
  compact = false
}) => {
  const [whatsapps, setWhatsapps] = useState<WhatsAppInstance[]>(propWhatsapps || []);
  const [exportWhatsappId, setExportWhatsappId] = useState<string>('ALL');
  const [exportStatus, setExportStatus] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState<'json' | 'csv' | null>(null);

  // Import state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [rawContent, setRawContent] = useState<string>('');
  const [detectedFormat, setDetectedFormat] = useState<'json' | 'csv'>('json');
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [assignMode, setAssignMode] = useState<'preserve' | 'override'>('preserve');
  const [defaultWhatsappId, setDefaultWhatsappId] = useState<string>('');
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update'>('skip');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string>('');

  useEffect(() => {
    if (propWhatsapps && propWhatsapps.length > 0) {
      setWhatsapps(propWhatsapps);
      setDefaultWhatsappId((prev) => prev || propWhatsapps[0].id);
      return;
    }

    const loadWhatsapps = async () => {
      try {
        const res = await api.get<{ instances: WhatsAppInstance[] }>('/whatsapp');
        const list = res.data.instances || [];
        setWhatsapps(list);
        if (list.length > 0) {
          setDefaultWhatsappId((prev) => prev || list[0].id);
        }
      } catch (err) {
        console.error('Erro ao carregar instâncias de WhatsApp:', err);
      }
    };
    loadWhatsapps();
  }, [propWhatsapps]);

  const formatWhatsappLabel = (w: WhatsAppInstance) => {
    const phonePart = w.phone && w.phone !== w.name ? ` (${w.phone})` : '';
    return `${w.name}${phonePart}`;
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      setIsExporting(format);
      const params = new URLSearchParams({ format });
      if (exportWhatsappId !== 'ALL') params.append('whatsappId', exportWhatsappId);
      if (exportStatus !== 'ALL') params.append('status', exportStatus);

      const response = await api.get(`/customers/export?${params.toString()}`, {
        responseType: 'blob'
      });

      const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-contatos-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao exportar backup de contatos.');
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadCsvTemplate = () => {
    const today = new Date().toISOString().split('T')[0];
    const template =
      '\uFEFF' +
      [
        'nome;telefone;vencimento;recorrencia;valor;status;observacoes',
        `João da Silva;5511999999999;${today};MENSAL;150.00;ACTIVE;Exemplo de contato`
      ].join('\r\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-importacao-contatos.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');
    setImportResult(null);

    try {
      const text = (await file.text()).replace(/^\uFEFF/, '').trim();
      const isJson = file.name.toLowerCase().endsWith('.json') || text.startsWith('{') || text.startsWith('[');
      let count = 0;

      if (isJson) {
        const parsed = JSON.parse(text);
        const list = Array.isArray(parsed) ? parsed : parsed?.contacts || parsed?.customers;
        if (!Array.isArray(list)) {
          throw new Error('Arquivo JSON inválido. Certifique-se de que seja um backup válido de contatos.');
        }
        count = list.length;
        setDetectedFormat('json');
      } else {
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          throw new Error('Planilha CSV vazia ou sem contatos abaixo do cabeçalho.');
        }
        count = lines.length - 1;
        setDetectedFormat('csv');
      }

      setSelectedFileName(file.name);
      setRawContent(text);
      setPreviewCount(count);
    } catch (err: any) {
      setImportError(err.message || 'Não foi possível ler o arquivo selecionado.');
      setSelectedFileName('');
      setRawContent('');
      setPreviewCount(0);
    }
  };

  const handleClearFile = () => {
    setSelectedFileName('');
    setRawContent('');
    setPreviewCount(0);
    setImportError('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!rawContent) {
      setImportError('Selecione um arquivo .JSON ou .CSV primeiro.');
      return;
    }

    try {
      setIsImporting(true);
      setImportError('');
      setImportResult(null);

      const res = await api.post('/customers/import', {
        rawContent,
        format: detectedFormat,
        defaultWhatsappId: defaultWhatsappId || undefined,
        assignMode,
        duplicateMode
      });

      setImportResult(res.data.result);
      onImportSuccess?.();
    } catch (error: any) {
      setImportError(error.response?.data?.error || 'Erro ao importar contatos.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className={compact ? 'space-y-5' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
      {/* Card 1: Exportar Contatos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-5">
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Exportar Backup de Contatos</h4>
              <p className="text-[11px] text-slate-400">
                Baixe todos os clientes e configurações em JSON ou planilha Excel (CSV)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Filtrar por WhatsApp
              </label>
              <select
                value={exportWhatsappId}
                onChange={(e) => setExportWhatsappId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Todos os WhatsApps</option>
                {whatsapps.map((w) => (
                  <option key={w.id} value={w.id}>
                    {formatWhatsappLabel(w)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status dos Contatos
              </label>
              <select
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Ativos e Inativos</option>
                <option value="ACTIVE">Apenas Ativos</option>
                <option value="INACTIVE">Apenas Inativos</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">Qual formato escolher?</p>
            <p>
              • <strong>Backup JSON:</strong> Ideal para segurança e restauração completa (preserva vínculo exato do WhatsApp e mensagens).
            </p>
            <p>
              • <strong>Planilha CSV:</strong> Abre direto no Excel / Google Planilhas com acentuação perfeita para editar ou conferir.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            disabled={isExporting !== null}
            onClick={() => handleExport('json')}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isExporting === 'json' ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>{isExporting === 'json' ? 'Gerando...' : 'Exportar Backup (.JSON)'}</span>
          </button>

          <button
            type="button"
            disabled={isExporting !== null}
            onClick={() => handleExport('csv')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isExporting === 'csv' ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>{isExporting === 'csv' ? 'Gerando...' : 'Exportar Excel (.CSV)'}</span>
          </button>
        </div>
      </div>

      {/* Card 2: Importar Contatos */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Importar / Restaurar Contatos</h4>
                <p className="text-[11px] text-slate-400">
                  Suba um arquivo .JSON de backup ou planilha .CSV
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadCsvTemplate}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer"
            >
              Baixar Modelo CSV
            </button>
          </div>

          {/* Seletor de Arquivo */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,application/json,text/csv"
              onChange={handleFileChange}
              className="hidden"
              id="contacts-backup-file-input"
            />
            {!selectedFileName ? (
              <label
                htmlFor="contacts-backup-file-input"
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-xl p-5 cursor-pointer transition-all text-center"
              >
                <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                <span className="text-xs font-bold text-slate-700">
                  Clique para escolher arquivo (.json ou .csv)
                </span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Aceita backups exportados do sistema ou planilhas CSV
                </span>
              </label>
            ) : (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-emerald-900 truncate">{selectedFileName}</p>
                  <p className="text-[11px] text-emerald-700">
                    Formato {detectedFormat.toUpperCase()} • {previewCount} registro(s) detectado(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClearFile}
                  title="Remover arquivo"
                  className="p-1 text-emerald-700 hover:bg-emerald-100 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Opções de Importação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vínculo de WhatsApp
              </label>
              <select
                value={assignMode}
                onChange={(e) => setAssignMode(e.target.value as 'preserve' | 'override')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="preserve">Manter do arquivo (ou usar padrão)</option>
                <option value="override">Vincular todos ao WhatsApp abaixo</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {assignMode === 'override' ? 'WhatsApp de Destino *' : 'WhatsApp Padrão (Fallback)'}
              </label>
              <select
                value={defaultWhatsappId}
                onChange={(e) => setDefaultWhatsappId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {whatsapps.length === 0 ? (
                  <option value="">Nenhum WhatsApp cadastrado</option>
                ) : (
                  whatsapps.map((w) => (
                    <option key={w.id} value={w.id}>
                      {formatWhatsappLabel(w)}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Se o telefone já estiver cadastrado:
            </label>
            <select
              value={duplicateMode}
              onChange={(e) => setDuplicateMode(e.target.value as 'skip' | 'update')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="skip">Ignorar duplicados (Manter cadastro atual)</option>
              <option value="update">Atualizar dados do cliente existente</option>
            </select>
          </div>

          {importError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {importResult && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Importação finalizada ({importResult.totalProcessed} linhas lidas)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                  <span className="text-slate-500 block">Criados</span>
                  <strong className="text-emerald-700 text-sm">{importResult.created}</strong>
                </div>
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                  <span className="text-slate-500 block">Atualizados</span>
                  <strong className="text-blue-700 text-sm">{importResult.updated}</strong>
                </div>
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                  <span className="text-slate-500 block">Ignorados</span>
                  <strong className="text-slate-700 text-sm">{importResult.skipped}</strong>
                </div>
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                  <span className="text-slate-500 block">Erros</span>
                  <strong className="text-rose-700 text-sm">{importResult.failed}</strong>
                </div>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="max-h-24 overflow-y-auto bg-white/90 p-2 rounded-lg border border-rose-200 text-[11px] text-rose-700 space-y-0.5">
                  {importResult.errors.map((err, i) => (
                    <p key={i}>
                      Linha {err.row} {err.name ? `(${err.name})` : ''}: {err.reason}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!rawContent || isImporting || whatsapps.length === 0}
          onClick={handleImport}
          className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isImporting ? <RotateCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>{isImporting ? 'Importando contatos...' : 'Importar Contatos Agora'}</span>
        </button>
      </div>
    </div>
  );
};
