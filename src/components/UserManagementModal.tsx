import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { getUsers, saveUser, deleteUser } from '../services/userService';
import { Users, UserPlus, Trash2, Shield, Building2, X, CheckCircle2, Lock, Code2, Copy, Check, Loader2 } from 'lucide-react';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableGrupos: string[];
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  availableGrupos,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showScriptInfo, setShowScriptInfo] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Colaborador');
  const [newGrupo, setNewGrupo] = useState('');

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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setMsg('Informe o nome de usuário.');
      return;
    }

    if (newRole === 'Cliente' && !newGrupo) {
      setMsg('Selecione o Grupo Econômico atribuído ao Cliente.');
      return;
    }

    setIsSaving(true);
    setMsg('Sincronizando com a planilha Google Sheets...');

    const newUser: User = {
      username: newUsername.trim(),
      password: newPassword.trim() || '123',
      role: newRole,
      grupoEconomico: newRole === 'Cliente' ? newGrupo : undefined,
    };

    try {
      const updated = await saveUser(newUser);
      setUsers(updated);
      setMsg(`Usuário "${newUsername}" cadastrado e enviado para a planilha de senhas!`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('Colaborador');
      setNewGrupo('');
    } catch (err) {
      setMsg('Erro ao salvar usuário.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (username: string) => {
    if (confirm(`Tem certeza que deseja remover o usuário "${username}"?`)) {
      setIsSaving(true);
      setMsg(`Removendo e sincronizando exclusão do usuário "${username}"...`);
      try {
        const updated = await deleteUser(username);
        setUsers(updated);
        setMsg(`Usuário "${username}" removido e sincronizado com a planilha.`);
      } catch (err) {
        setMsg('Erro ao remover usuário.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const appsScriptCode = `function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function getTargetSheet() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss.getActiveSheet();
  } catch(e) {}
  return null;
}

function handleRequest(e) {
  var params = {};
  if (e && e.parameter) {
    for (var k in e.parameter) {
      params[k] = e.parameter[k];
    }
  }
  if (e && e.postData && e.postData.contents) {
    try {
      var json = JSON.parse(e.postData.contents);
      for (var k in json) { params[k] = json[k]; }
    } catch(err) {}
  }

  var action = params.action || '';
  var sheet = getTargetSheet();

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ error: 'Nenhuma planilha ativa encontrada' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var data = sheet.getDataRange().getValues();
  if (data.length === 0) {
    sheet.appendRow(['usuario', 'senha', 'role', 'grupoEconomico']);
    data = sheet.getDataRange().getValues();
  }

  if (action === 'getUsers') {
    var users = [];
    var startRow = (data.length > 0 && String(data[0][0]).toLowerCase().indexOf('user') >= 0) ? 1 : 0;
    for (var i = startRow; i < data.length; i++) {
      if (data[i][0]) {
        users.push({
          username: String(data[i][0]).trim(),
          password: String(data[i][1] || '123').trim(),
          role: String(data[i][2] || 'Colaborador').trim(),
          grupoEconomico: String(data[i][3] || '').trim()
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(users))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'saveUser') {
    var username = String(params.username || params.usuario || params.user || '').trim();
    var password = String(params.password || params.senha || '123').trim();
    var role = String(params.role || params.nivel || 'Colaborador').trim();
    var grupo = String(params.grupoEconomico || params.grupo || '').trim();

    if (username) {
      var foundRow = -1;
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]).trim().toLowerCase() === username.toLowerCase()) {
          foundRow = i + 1;
          break;
        }
      }
      if (foundRow > 0) {
        sheet.getRange(foundRow, 1, 1, 4).setValues([[username, password, role, grupo]]);
      } else {
        sheet.appendRow([username, password, role, grupo]);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', action: 'saveUser', username: username }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'deleteUser') {
    var username = String(params.username || params.usuario || params.user || '').trim();
    if (username) {
      for (var i = data.length - 1; i >= 0; i--) {
        if (String(data[i][0]).trim().toLowerCase() === username.toLowerCase()) {
          sheet.deleteRow(i + 1);
        }
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok', action: 'deleteUser', username: username }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({ error: 'invalid action', receivedParams: params }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        
        {/* Modal Header */}
        <div className="bg-[#401669] text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Gestão de Usuários e Permissões</h2>
              <p className="text-xs text-purple-200">Painel do Administrador METARH</p>
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
            <div className={`p-3 border text-xs font-semibold rounded-xl flex items-center gap-2 ${
              isSaving ? 'bg-purple-50 border-purple-200 text-purple-900' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 text-[#401669] animate-spin flex-shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              )}
              <span>{msg}</span>
            </div>
          )}

          {/* Add New User Form */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-[#401669] mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#9c3aff]" />
              Incluir Novo Usuário
            </h3>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nome de Usuário
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: joao.silva"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    disabled={isSaving}
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
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff] disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nível de Acesso
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff] font-medium disabled:opacity-50"
                  >
                    <option value="Colaborador">Colaborador (Acesso Completo)</option>
                    <option value="Administrador">Administrador (Poderes Totais + Usuários)</option>
                    <option value="Cliente">Cliente (Apenas seu Grupo Econômico)</option>
                  </select>
                </div>

                {newRole === 'Cliente' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Grupo Econômico Atribuído
                    </label>
                    <select
                      value={newGrupo}
                      onChange={(e) => setNewGrupo(e.target.value)}
                      disabled={isSaving}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#9c3aff] font-medium disabled:opacity-50"
                    >
                      <option value="">-- Selecione o Grupo Econômico --</option>
                      {availableGrupos.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-[#401669] hover:bg-[#521c87] text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sincronizando com a Planilha...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Cadastrar Usuário</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* User List Table */}
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#401669]" />
              Usuários Cadastrados ({users.length})
            </h3>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Usuário</th>
                    <th className="p-3">Nível</th>
                    <th className="p-3">Grupo Econômico</th>
                    <th className="p-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {users.map((u) => (
                    <tr key={u.username} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 text-[#401669] flex items-center justify-center text-[10px] font-black">
                          {u.username.substring(0, 2).toUpperCase()}
                        </span>
                        {u.username}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'Administrador' ? 'bg-purple-100 text-[#401669]' :
                          u.role === 'Cliente' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {u.role === 'Cliente' ? (u.grupoEconomico || 'Não atribuído') : 'Global (Todos os Grupos)'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDelete(u.username)}
                          disabled={u.username === 'admin' || isSaving}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                          title="Remover Usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Apps Script Helper Section */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowScriptInfo(!showScriptInfo)}
              className="text-xs font-bold text-[#401669] hover:text-[#7823ce] flex items-center gap-2 cursor-pointer py-1"
            >
              <Code2 className="w-4 h-4 text-[#9c3aff]" />
              <span>{showScriptInfo ? 'Ocultar Instruções do Apps Script' : 'Instruções do Google Apps Script (Código para Planilha)'}</span>
            </button>

            {showScriptInfo && (
              <div className="mt-3 bg-slate-900 text-slate-100 p-4 rounded-2xl text-[11px] font-mono space-y-3 relative">
                <div className="flex items-center justify-between text-slate-400 font-sans text-xs pb-2 border-b border-slate-800">
                  <span>Código para Google Sheets (Extensões &gt; Apps Script)</span>
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Copiado!' : 'Copiar Código'}</span>
                  </button>
                </div>
                <p className="text-slate-400 font-sans text-xs leading-relaxed">
                  Copie este código para o seu projeto no Apps Script na planilha (Extensões &gt; Apps Script):
                </p>
                <pre className="overflow-x-auto p-3 bg-slate-950 rounded-xl text-purple-200 text-[10px] leading-relaxed max-h-48 overflow-y-auto">
                  {appsScriptCode}
                </pre>

                {/* Important step alert */}
                <div className="bg-amber-500/20 border border-amber-500/40 rounded-xl p-3 font-sans text-amber-200 text-xs space-y-1.5">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Passo Obrigatório ao Salvar no Google Apps Script:</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                    <li>Copie o código e cole no Editor do Apps Script.</li>
                    <li>Clique no botão **Implantar** (canto superior direito) &gt; **Gerenciar implantações**.</li>
                    <li>Clique no ícone de **Lápis (Editar)** ao lado da implantação Web App.</li>
                    <li>No campo **Versão**, selecione **"Nova Versão"** (New Version).</li>
                    <li>Clique em **Implantar** (Deploy).</li>
                  </ol>
                  <p className="text-[10px] text-amber-200/80 italic font-mono pt-1">
                    *Atenção: Se não selecionar "Nova Versão", o Google manterá o código antigo ativo e nenhuma alteração funcionará!
                  </p>
                </div>
              </div>
            )}
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
