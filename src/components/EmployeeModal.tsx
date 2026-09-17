import React from 'react';
import { Funcionario } from '../types';
import { formatCurrency, formatDate } from '../utils/dataParser';
import { X, User, Briefcase, Building2, Calendar, MapPin, Mail, Phone, DollarSign, FileText, CheckCircle2, AlertCircle, ShieldCheck, Lock } from 'lucide-react';

interface EmployeeModalProps {
  worker: Funcionario | null;
  assignedRep?: string;
  isClientRole?: boolean;
  onClose: () => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({ worker, assignedRep, isClientRole = false, onClose }) => {
  if (!worker) return null;

  const isLgpdProtected = isClientRole || Boolean(worker.emailCorporativo?.includes('LGPD') || worker.telefone?.includes('LGPD') || worker.celular?.includes('LGPD'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#250244]/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#e8d8f5] w-full max-w-2xl overflow-hidden relative max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#470082] to-[#6404bc] text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#9f04d4] flex items-center justify-center text-white font-extrabold text-xl shadow-md border-2 border-[#c9f545]">
              {worker.nome.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[#c9f545] font-bold">
                  #{worker.id}
                </span>
                {worker.isAtivo ? (
                  <span className="bg-[#c9f545] text-[#470082] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    ATIVO (SEM DEMISSÃO)
                  </span>
                ) : (
                  <span className="bg-[#ff27f9] text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    DESLIGADO
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-extrabold text-white mt-1 font-['Barlow']">
                {worker.nome}
              </h2>
              <p className="text-xs text-[#e0c4f8] mt-0.5">{worker.cargo}</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#330066]">
          
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Salário & Vínculo */}
            <div className="bg-[#faf6fd] p-4 rounded-2xl border border-[#f0d4fc]">
              <div className="flex items-center gap-2 text-[#9f04d4] font-bold mb-1">
                <DollarSign className="w-4 h-4" />
                <span>Informações Salariais</span>
              </div>
              <p className="text-2xl font-extrabold text-[#470082] mt-1">
                {formatCurrency(worker.salario)}
              </p>
              <p className="text-[11px] text-[#78549e] mt-1">
                Vínculo: <strong className="text-[#470082]">{worker.vinculo}</strong>
              </p>
            </div>

            {/* Datas de Admissão & Demissão */}
            <div className="bg-[#faf6fd] p-4 rounded-2xl border border-[#f0d4fc]">
              <div className="flex items-center gap-2 text-[#9f04d4] font-bold mb-1">
                <Calendar className="w-4 h-4" />
                <span>Datas do Contrato</span>
              </div>
              <p className="text-xs text-[#330066] mt-1">
                Admissão: <strong className="text-[#470082]">{formatDate(worker.dataAdmissao)}</strong>
              </p>
              <p className="text-xs text-[#330066] mt-0.5">
                Demissão: <strong className={worker.isAtivo ? 'text-[#c9f545] font-extrabold bg-[#470082] px-1.5 py-0.5 rounded' : 'text-[#ff27f9]'}>
                  {worker.isAtivo ? 'Não possui (Ativo)' : formatDate(worker.dataDemissao)}
                </strong>
              </p>
              {!worker.isAtivo && worker.motivoDesligamento && (
                <p className="text-[11px] text-[#ff27f9] font-medium mt-1">
                  Motivo: {worker.motivoDesligamento}
                </p>
              )}
            </div>

          </div>

          {/* Grupo Econômico, Cliente e Atendimento Comercial */}
          <div className="bg-[#faf6fd] p-4 rounded-2xl border border-[#f0d4fc] space-y-3">
            <div className="flex items-center gap-2 text-[#9f04d4] font-bold">
              <Building2 className="w-4 h-4" />
              <span>Alocação Empresarial & Atendimento Comercial</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <span className="text-[10px] font-bold text-[#78549e] uppercase">Grupo Econômico</span>
                <p className="text-sm font-extrabold text-[#470082]">{worker.grupoEconomico || 'Não informado'}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#78549e] uppercase">Nome do Cliente</span>
                <p className="text-sm font-bold text-[#330066]">{worker.nomeCliente || 'Não informado'}</p>
                {worker.cnpjCliente && (
                  <p className="text-[10px] text-[#78549e]">CNPJ: {worker.cnpjCliente}</p>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#78549e] uppercase">Comercial Responsável</span>
                <p className="text-sm font-extrabold text-[#401669] flex items-center gap-1">
                  {assignedRep ? (
                    <span>{assignedRep}</span>
                  ) : (
                    <span className="text-slate-400 font-normal italic text-xs">Sem comercial atribuído</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Região & Contatos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="bg-[#faf6fd] p-4 rounded-2xl border border-[#f0d4fc]">
              <div className="flex items-center gap-2 text-[#9f04d4] font-bold mb-2">
                <MapPin className="w-4 h-4" />
                <span>Localização</span>
              </div>
              <p className="text-xs font-bold text-[#470082]">{worker.regiao}</p>
              <p className="text-[11px] text-[#78549e]">Empresa Alocadora: {worker.empresa}</p>
              <p className="text-[11px] text-[#78549e]">Depto/Centro de Custo: {worker.depto}</p>
            </div>

            {isLgpdProtected ? (
              <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/90 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-900 font-extrabold text-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Contatos Protegidos (LGPD)</span>
                  </div>
                  <span className="bg-amber-200/80 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    Acesso Restrito
                  </span>
                </div>

                <div className="bg-white/90 rounded-xl p-2.5 border border-amber-200/70 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" /> E-mail Direto:
                    </span>
                    <span className="font-mono text-[10px] text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded font-bold border border-amber-200">
                      Restrito por LGPD 🔒
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" /> Telefone / Celular:
                    </span>
                    <span className="font-mono text-[10px] text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded font-bold border border-amber-200">
                      Restrito por LGPD 🔒
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-amber-900/90 leading-tight">
                  Em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>, os dados de contato pessoal direto de colaboradores terceiros são restritos para usuários do perfil cliente.
                </p>

                <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-amber-950 font-bold">Canal Oficial (RH Focal):</span>
                  <span className="font-extrabold text-[#470082]">
                    {worker.rhFocal || 'Equipe de Atendimento METARH'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[#faf6fd] p-4 rounded-2xl border border-[#f0d4fc]">
                <div className="flex items-center gap-2 text-[#9f04d4] font-bold mb-2">
                  <Mail className="w-4 h-4" />
                  <span>Contatos & RH Focal</span>
                </div>
                <p className="text-xs text-[#330066]">
                  E-mail: {worker.emailCorporativo || 'Não informado'}
                </p>
                <p className="text-xs text-[#330066] mt-0.5">
                  Telefone: {worker.telefone || worker.celular || 'Não informado'}
                </p>
                {worker.rhFocal && (
                  <p className="text-[11px] text-[#9f04d4] font-bold mt-1">
                    RH Focal: {worker.rhFocal}
                  </p>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#faf6fd] border-t border-[#f0d4fc] flex justify-end">
          <button
            onClick={onClose}
            className="bg-[#470082] hover:bg-[#9f04d4] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>

      </div>
    </div>
  );
};
