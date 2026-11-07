import React, { useState } from 'react';
import { Settings as SettingsIcon, KeyRound, ShieldAlert, CheckCircle2, Server, Terminal, HardDrive } from 'lucide-react';
import api from '../services/api.js';

export const SettingsPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'A nova senha e a confirmação não coincidem.' });
      return;
    }

    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'A nova senha deve possuir pelo menos 6 caracteres.' });
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setFeedback({ type: 'success', message: res.data.message || 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setFeedback({ type: 'error', message: error.response?.data?.error || 'Erro ao alterar senha.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
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
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Alteração de Senha */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Segurança da Conta do Administrador</h3>
            <p className="text-xs text-slate-400">Atualize sua senha de acesso ao painel de controle</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Senha Atual *</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nova Senha *</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Pelo menos 6 caracteres"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirme a Nova Senha *</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a mesma nova senha"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-60"
          >
            {isLoading ? 'Atualizando...' : 'Atualizar Senha de Acesso'}
          </button>
        </form>
      </div>

      {/* Informações Técnicas e Ambiente */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Informações do Servidor e Docker</h3>
            <p className="text-xs text-slate-400">Diagnóstico da infraestrutura VPS Ubuntu 24.04</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
            <span className="text-slate-400 block font-medium">Sistema Operacional Alvo</span>
            <span className="font-bold text-slate-800">Ubuntu Server 24.04 LTS</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
            <span className="text-slate-400 block font-medium">Orquestração de Containers</span>
            <span className="font-bold text-slate-800">Docker & Docker Compose</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
            <span className="text-slate-400 block font-medium">Banco de Dados Relacional</span>
            <span className="font-bold text-slate-800">PostgreSQL 16 (Volume pgdata)</span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
            <span className="text-slate-400 block font-medium">Engine WhatsApp Open Source</span>
            <span className="font-bold text-slate-800">Evolution API v2 (Baileys Engine)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
