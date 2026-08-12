import React from 'react';
import { Funcionario } from '../types';
import { formatCurrency, formatDate, formatCPF } from '../utils/dataParser';
import { X, User, Briefcase, Building2, Calendar, MapPin, Mail, Phone, DollarSign, FileText, CheckCircle2, AlertCircle, CreditCard } from 'lucide-react';

interface EmployeeModalProps {
  worker: Funcionario | null;
  onClose: () => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({ worker, onClose }) => {
  if (!worker) return null;

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

          {/* Identificação e Contatos Direct Card */}
          <div className="bg-[#faf6fd] p-4 rounded-2xl border border-[#f0d4fc] space-y-2">
            <div className="flex items-center gap-2 text-[#9f04d4] font-bold">
              <CreditCard className="w-4 h-4" />
              <span>Identificação do Colaborador</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <span className="text-[10px] font-bold text-[#78549e] uppercase">CPF</span>
                <p className="text-sm font-mono font-extrabold text-[#470082]">{formatCPF(worker.cpf, worker.id)}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#78549e] uppercase">E-mail Corporativo</span>
                <p className="text-xs font-semibold text-[#330066] truncate" title={worker.emailCorporativo || '-'}>
                  {worker.emailCorporativo || 'Não informado'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#78549e] uppercase">Telefone / Celular</span>
                <p className="text-xs font-semibold text-[#330066]">
                  {worker.telefone || worker.celular || 'Não informado'}
                </p>
              </div>
            </div>
          </div>

          {/* Grupo Econômico e Cliente */}
          <div className="bg-[#faf6fd] p-4 rounded-2xl border border-[#f0d4fc] space-y-2">
            <div className="flex items-center gap-2 text-[#9f04d4] font-bold">
              <Building2 className="w-4 h-4" />
              <span>Alocação Empresarial</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <span className="text-[10px] font-bold text-[#78549e] uppercase">Grupo Econômico</span>
                <p className="text-sm font-extrabold text-[#470082]">{worker.grupoEconomico}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-[#78549e] uppercase">Nome do Cliente</span>
                <p className="text-sm font-bold text-[#330066]">{worker.nomeCliente}</p>
                {worker.cnpjCliente && (
                  <p className="text-[10px] text-[#78549e]">CNPJ: {worker.cnpjCliente}</p>
                )}
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

            <div className="bg-[#faf6fd] p-4 rounded-2xl border border-[#f0d4fc]">
              <div className="flex items-center gap-2 text-[#9f04d4] font-bold mb-2">
                <Mail className="w-4 h-4" />
                <span>RH Focal</span>
              </div>
              {worker.rhFocal ? (
                <p className="text-xs text-[#330066] font-bold">
                  {worker.rhFocal}
                </p>
              ) : (
                <p className="text-xs text-[#78549e]">
                  Não especificado
                </p>
              )}
            </div>

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
