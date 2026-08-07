import React, { useState, useEffect } from 'react';
import { User, UserRole, UserLog, Funcionario } from '../types';
import { getUsers, saveUser, deleteUser, addUserLog } from '../services/userService';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  Building2,
  X,
  CheckCircle2,
  Lock,
  Code2,
  Copy,
  Check,
  Loader2,
  Edit2,
  History,
  ChevronDown,
  ChevronUp,
  Plus,
  Briefcase,
  Search,
} from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGrupos: string[];
  availableClientes?: string[];
  data?: Funcionario[];
  currentUser: User;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  availableGrupos,
  availableClientes = [],
  data = [],
  currentUser,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showScriptInfo, setShowScriptInfo] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [expandedLogsUser, setExpandedLogsUser] = useState<string | null>(null);

  // Edit or Add Mode
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('Colaborador');
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([]);
  const [selectedClientes, setSelectedClientes] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [grupoSearch, setGrupoSearch] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const list = await getUsers();
      setUsers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setMsg('');
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormRole('Colaborador');
    setSelectedGrupos([]);
    setSelectedClientes([]);
    setClientSearch('');
    setGrupoSearch('');
  };

  const handleStartEdit = (user: User) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormPassword(user.password || '123');
    setFormRole(user.role);
    setSelectedGrupos(user.gruposEconomicos || (user.grupoEconomico ? [user.grupoEconomico] : []));
    setSelectedClientes(user.clientesAtribuidos || []);
  };

  const toggleGrupoSelection = (grupo: string) => {
    const isSel = selectedGrupos.includes(grupo);
    let updatedGrupos: string[];
    if (isSel) {
      updatedGrupos = selectedGrupos.filter((g) => g !== grupo);
    } else {
      updatedGrupos = [...selectedGrupos, grupo];
    }
    setSelectedGrupos(updatedGrupos);

    // Auto-select clients belonging to this group if selecting
    if (!isSel && data && data.length > 0) {
      const gLower = grupo.toLowerCase().trim();
      const clientsInGroup: string[] = Array.from(
        new Set(
          data
            .filter((w) => {
              const itemGroup = w.grupoEconomico.toLowerCase().trim();
              return itemGroup.includes(gLower) || gLower.includes(itemGroup);
            })
            .map((w) => w.nomeCliente)
            .filter(Boolean)
        )
      );
      if (clientsInGroup.length > 0) {
        setSelectedClientes((prev) => Array.from(new Set([...prev, ...clientsInGroup])));
      }
    }
  };

  const toggleClienteSelection = (cliente: string) => {
    if (selectedClientes.includes(cliente)) {
      setSelectedClientes(selectedClientes.filter((c) => c !== cliente));
    } else {
      setSelectedClientes([...selectedClientes, cliente]);
    }
  };

  if (!isOpen) return null;

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      setMsg('Informe o nome de usuário.');
      return;
    }

    if (formRole === 'Cliente' && selectedGrupos.length === 0 && selectedClientes.length === 0) {
      setMsg('Selecione ao menos um Grupo Econômico ou Cliente para o perfil Cliente.');
      return;
    }

    setIsSaving(true);
    setMsg('Sincronizando com a base de dados...');

    const now = new Date().toISOString();
    const actionText = editingUser ? 'Edição de Perfil e Permissões' : 'Criação de Usuário';
    const logDetail = editingUser
      ? `Permissões do usuário "${formUsername}" alteradas para ${formRole} por ${currentUser.username}.`
      : `Novo usuário "${formUsername}" criado com nível ${formRole} por ${currentUser.username}.`;

    const newLog: UserLog = {
      id: String(Date.now()),
      timestamp: now,
      author: currentUser.username,
      action: actionText,
      details: logDetail,
    };

    const targetUser: User = {
      ...(editingUser || {}),
      username: formUsername.trim(),
      password: formPassword.trim() || '123',
      role: formRole,
      grupoEconomico: selectedGrupos[0] || '',
      gruposEconomicos: selectedGrupos,
      clientesAtribuidos: selectedClientes,
      logs: [newLog, ...(editingUser?.logs || [])],
      updatedAt: now,
    };

    try {
      const updated = await saveUser(targetUser);
      setUsers(updated);
      setMsg(
        editingUser
          ? `Usuário "${formUsername}" atualizado com sucesso!`
          : `Usuário "${formUsername}" cadastrado com sucesso!`
      );
      resetForm();
    } catch (err) {
      setMsg('Erro ao salvar informações do usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (username: string) => {
    if (confirm(`Tem certeza que deseja remover o usuário "${username}"?`)) {
      setIsSaving(true);
      setMsg(`Removendo usuário "${username}"...`);
      try {
        const updated = await deleteUser(username);
        setUsers(updated);
        setMsg(`Usuário "${username}" removido.`);
      } catch (err) {
        setMsg('Erro ao remover usuário.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const appsScriptCode = `function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  var params = e ? e.parameter || {} : {};
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok', params: params }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-[#401669] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Painel de Gestão de Usuários e Permissões</h2>
              <p className="text-xs text-purple-200">Administração METARH & Controle de Acesso</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {msg && (
            <div
              className={`p-3 border text-xs font-semibold rounded-xl flex items-center gap-2 ${
                isSaving
                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 text-[#401669] animate-spin flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
              <span>{msg}</span>
            </div>
          )}

          {/* Form Section: Add or Edit User */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[#401669] flex items-center gap-2">
                {editingUser ? (
                  <>
                    <Edit2 className="w-4 h-4 text-[#9c3aff]" />
                    Editar Usuário: <span className="underline">{editingUser.username}</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-[#9c3aff]" />
                    Cadastrar Novo Usuário
                  </>
                )}
              </h3>

              {editingUser && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-rose-600 hover:underline font-bold"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome de Usuário
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: joao.silva"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    disabled={isSaving || (editingUser !== null && editingUser.username === 'admin')}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff] disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Senha
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 123456"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff] disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Perfil de Acesso / Nível de Permissão
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  disabled={isSaving}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff] font-bold disabled:opacity-50"
                >
                  <option value="Administrador">Administrador (Visão geral e total + Gestão de Usuários)</option>
                  <option value="Colaborador">Colaborador (Visualizações padrões atuais)</option>
                  <option value="Cliente">Cliente (Filtro restrito por Grupo Econômico ou CNPJ/Cliente)</option>
                  <option value="RH">RH (Acesso exclusivo à aba Banco de Talentos)</option>
                  <option value="Comercial">Comercial (Análise de Carteira &amp; Alertas de Ativos)</option>
                  <option value="Gerencial Comercial">Gerencial Comercial (Gestão da Equipe &amp; Atribuição de Inativos)</option>
                </select>
              </div>

              {/* Multi-selection of Economic Groups & Clients */}
              {formRole !== 'Administrador' && (
                <div className="space-y-3">
                  {/* Grupos Econômicos Selection with Search Filter */}
                  <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#401669]" />
                        <span>Grupos Econômicos Atribuídos</span>
                        {selectedGrupos.length > 0 && (
                          <span className="px-2 py-0.5 bg-purple-100 text-[#401669] rounded-full text-[10px] font-extrabold">
                            {selectedGrupos.length} selecionados
                          </span>
                        )}
                      </label>

                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                        <input
                          type="text"
                          placeholder="Filtrar grupo..."
                          value={grupoSearch}
                          onChange={(e) => setGrupoSearch(e.target.value)}
                          className="pl-7 pr-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9c3aff]"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1 pr-1">
                      {availableGrupos
                        .filter((g) => !grupoSearch || g.toLowerCase().includes(grupoSearch.toLowerCase()))
                        .map((g) => {
                          const isSel = selectedGrupos.includes(g);
                          return (
                            <button
                              type="button"
                              key={g}
                              onClick={() => toggleGrupoSelection(g)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer transition-all ${
                                isSel
                                  ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {isSel ? '✓ ' : '+ '}
                              {g}
                            </button>
                          );
                        })}
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      * Dica: Ao selecionar um Grupo Econômico, todos os CNPJs do grupo são vinculados.
                    </p>
                  </div>

                  {/* Clientes / CNPJs Selection with Search Filter */}
                  <div className="space-y-2 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#401669]" />
                        <span>Clientes / CNPJs Específicos (Sem ou Com Grupo)</span>
                        {selectedClientes.length > 0 && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[10px] font-extrabold">
                            {selectedClientes.length} selecionados
                          </span>
                        )}
                      </label>

                      <div className="relative">
                        <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                        <input
                          type="text"
                          placeholder="Filtrar cliente/CNPJ..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="pl-7 pr-2 py-1 text-[10px] bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#9c3aff]"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-500">
                      Útil para clientes independentes que não pertencem a um Grupo Econômico cadastrado.
                    </p>

                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pt-1 pr-1">
                      {availableClientes
                        .filter((c) => !clientSearch || c.toLowerCase().includes(clientSearch.toLowerCase()))
                        .slice(0, 80)
                        .map((c) => {
                          const isSel = selectedClientes.includes(c);
                          return (
                            <button
                              type="button"
                              key={c}
                              onClick={() => toggleClienteSelection(c)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border cursor-pointer transition-all ${
                                isSel
                                  ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {isSel ? '✓ ' : '+ '}
                              {c}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-[#401669] hover:bg-[#521c87] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Salvando Alterações...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{editingUser ? 'Salvar Edição de Usuário' : 'Cadastrar Usuário'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* User List & Logs Section */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#401669]" />
                Usuários Cadastrados no Sistema ({users.length})
              </span>
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Usuário</th>
                    <th className="p-3">Perfil de Acesso</th>
                    <th className="p-3">Grupos / Carteira</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((u) => (
                    <React.Fragment key={u.username}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-purple-100 text-[#401669] flex items-center justify-center text-[10px] font-black">
                            {u.username.substring(0, 2).toUpperCase()}
                          </span>
                          {u.username}
                        </td>

                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'Administrador'
                                ? 'bg-purple-100 text-[#401669]'
                                : u.role === 'Gerencial Comercial'
                                ? 'bg-indigo-100 text-indigo-900'
                                : u.role === 'Comercial'
                                ? 'bg-amber-100 text-amber-900'
                                : u.role === 'RH'
                                ? 'bg-emerald-100 text-emerald-900'
                                : u.role === 'Cliente'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="p-3 text-slate-600 font-medium">
                          {u.role === 'Administrador' ? (
                            <span className="text-slate-500 font-semibold text-[11px]">Acesso Geral Master</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {u.gruposEconomicos && u.gruposEconomicos.length > 0 && (
                                <span className="text-[10px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 inline-block">
                                  Grupos ({u.gruposEconomicos.length}): {u.gruposEconomicos.slice(0, 2).join(', ')}{u.gruposEconomicos.length > 2 ? '...' : ''}
                                </span>
                              )}
                              {u.clientesAtribuidos && u.clientesAtribuidos.length > 0 && (
                                <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 inline-block">
                                  Clientes ({u.clientesAtribuidos.length}): {u.clientesAtribuidos.slice(0, 2).join(', ')}{u.clientesAtribuidos.length > 2 ? '...' : ''}
                                </span>
                              )}
                              {(!u.gruposEconomicos || u.gruposEconomicos.length === 0) &&
                                (!u.clientesAtribuidos || u.clientesAtribuidos.length === 0) && (
                                  <span className="text-slate-400 text-[11px] italic">
                                    {u.grupoEconomico ? `Grupo: ${u.grupoEconomico}` : 'Nenhum atrelado'}
                                  </span>
                                )}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-right space-x-1">
                          {/* Logs button */}
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedLogsUser(expandedLogsUser === u.username ? null : u.username)
                            }
                            className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition-all cursor-pointer"
                            title="Ver Histórico de Logs do Usuário"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(u)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="Editar Informações do Usuário"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(u.username)}
                            disabled={u.username.toLowerCase() === currentUser.username.toLowerCase() || isSaving}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                            title={
                              u.username.toLowerCase() === currentUser.username.toLowerCase()
                                ? 'Você não pode excluir sua própria conta em uso'
                                : 'Remover Usuário'
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable User Audit Log Drawer */}
                      {expandedLogsUser === u.username && (
                        <tr>
                          <td colSpan={4} className="bg-slate-900 text-slate-100 p-4 text-xs">
                            <div className="font-bold text-purple-300 flex items-center justify-between mb-2">
                              <span>Histórico de Auditoria &amp; Permissões de "{u.username}"</span>
                              <button
                                onClick={() => setExpandedLogsUser(null)}
                                className="text-slate-400 hover:text-white"
                              >
                                Fechar
                              </button>
                            </div>

                            {!u.logs || u.logs.length === 0 ? (
                              <p className="text-slate-400 italic">Nenhum log registrado até o momento.</p>
                            ) : (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {u.logs.map((log) => (
                                  <div
                                    key={log.id}
                                    className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-[11px] font-mono space-y-0.5"
                                  >
                                    <div className="text-purple-300 font-bold flex justify-between">
                                      <span>{log.action}</span>
                                      <span className="text-slate-400 text-[10px]">
                                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                                      </span>
                                    </div>
                                    <p className="text-slate-200">{log.details}</p>
                                    <p className="text-slate-400 text-[10px]">Autor: {log.author}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
