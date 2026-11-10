import React from 'react';
import { Database, Download, Upload, Terminal, Users } from 'lucide-react';
import { ContactsBackupPanel } from '../components/ContactsBackupPanel.js';

export const BackupPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Seção Principal: Backup de Contatos (Exportar & Importar) */}
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-5 flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emerald-950">Backup de Contatos (Exportar & Importar)</h3>
            <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
              Faça o download completo dos seus clientes em <strong>JSON</strong> (cópia fiel para restauração no sistema) ou em planilha <strong>Excel (.CSV)</strong>, e importe novos contatos ou backups salvos com apenas alguns cliques.
            </p>
          </div>
        </div>

        <ContactsBackupPanel />
      </div>

      {/* Banner de Backup Completo de Infraestrutura */}
      <div className="bg-slate-100 border border-slate-200/80 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-white text-slate-700 shrink-0 mt-0.5 shadow-2xs">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Backup Completo do Servidor (Banco + Sessões WhatsApp)</h3>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Todos os dados de clientes, histórico de mensagens, pagamentos e as sessões de WhatsApp ficam salvos em volumes persistentes Docker (<code className="font-mono bg-white px-1 py-0.5 rounded text-[11px] border border-slate-200">pgdata</code> e <code className="font-mono bg-white px-1 py-0.5 rounded text-[11px] border border-slate-200">evolution_instances</code>). Utilize os comandos abaixo caso precise clonar ou restaurar a VPS inteira via terminal.
          </p>
        </div>
      </div>

      {/* Comandos Rápidos na VPS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Como Fazer Backup */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">1. Gerar Novo Backup Completo</h4>
              <p className="text-[11px] text-slate-400">Exporta o banco PostgreSQL e sessões em arquivo compactado</p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Acesse o terminal da sua VPS Ubuntu 24.04 e execute o script incluído:
          </p>

          <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
            <code>bash ./scripts/backup.sh</code>
          </div>

          <p className="text-[11px] text-slate-500">
            ✓ O arquivo será salvo na pasta <code className="text-emerald-700 font-mono">./backups/backup_YYYYMMDD_HHMMSS.tar.gz</code> contendo o dump SQL integral e os arquivos de conexão do WhatsApp.
          </p>
        </div>

        {/* Card: Como Restaurar Backup */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">2. Restaurar um Backup</h4>
              <p className="text-[11px] text-slate-400">Restaura banco de dados e reconecta as sessões salvas</p>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            Para restaurar um arquivo de backup em caso de migração de VPS ou recuperação:
          </p>

          <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
            <code>bash ./scripts/restore.sh ./backups/backup_arquivo.tar.gz</code>
          </div>

          <p className="text-[11px] text-slate-500">
            ✓ O script reinicia os containers e reaplica todos os dados com integridade referencial garantida.
          </p>
        </div>
      </div>

      {/* Guia de Comandos Docker para Manutenção */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">Comandos Docker Úteis para o Dia a Dia na VPS</h4>
            <p className="text-[11px] text-slate-400">Operações e diagnósticos no servidor Ubuntu 24.04</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5">
            <span className="font-bold text-slate-700 block">Ver Status dos Containers:</span>
            <code className="block bg-slate-900 text-emerald-400 p-2 rounded-lg font-mono text-[11px]">docker compose ps</code>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5">
            <span className="font-bold text-slate-700 block">Visualizar Logs em Tempo Real:</span>
            <code className="block bg-slate-900 text-emerald-400 p-2 rounded-lg font-mono text-[11px]">docker compose logs -f</code>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5">
            <span className="font-bold text-slate-700 block">Reiniciar Todos os Serviços:</span>
            <code className="block bg-slate-900 text-emerald-400 p-2 rounded-lg font-mono text-[11px]">docker compose restart</code>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5">
            <span className="font-bold text-slate-700 block">Atualizar o Sistema (sem perda de dados):</span>
            <code className="block bg-slate-900 text-emerald-400 p-2 rounded-lg font-mono text-[11px]">bash ./scripts/update.sh</code>
          </div>
        </div>
      </div>
    </div>
  );
};
