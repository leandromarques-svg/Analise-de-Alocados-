export type UserRole = 'Administrador' | 'Colaborador' | 'Cliente';

export interface User {
  id?: string;
  username: string;
  password?: string;
  role: UserRole;
  grupoEconomico?: string;
  createdAt?: string;
}

export interface FuncionarioRaw {
  'Cód.Func.'?: number;
  'Nome do Funcionário'?: string;
  'Vínculo Empregatício'?: string;
  'Telefone'?: string;
  'Data Admissão'?: string;
  'Data Vcto Contrato'?: string;
  'Data Vcto Prorrogação'?: string;
  'Data Demissão'?: string;
  'Salário Base'?: number | string;
  'Cargo ou Função'?: string;
  'Depto/Centro de Custo'?: string | number;
  'Empresa'?: string;
  'Região'?: number | string;
  'e '?: string;
  'Motivo do Desligamento'?: string;
  'E-mail Corporativo'?: string;
  'Celular(envio SMS)'?: string;
  'Cod. Cliente'?: number;
  'Nome Cliente'?: string;
  'CNPJ Cliente'?: string;
  'Departamento'?: string;
  'Obs. Departamento'?: string;
  'Nome RH Focal'?: string;
  'E-mail RH Focal'?: string;
  'Quarterização'?: string;
  'Divisao'?: string;
  'Grupo Econômico'?: string;
}

export interface Funcionario {
  id: number;
  nome: string;
  vinculo: string;
  telefone: string;
  dataAdmissao: string;
  anoAdmissao: number | null;
  dataVctoContrato: string;
  dataVctoProrrogacao: string;
  dataDemissao: string | null;
  anoDemissao: number | null;
  isAtivo: boolean;
  salario: number;
  cargo: string;
  depto: string;
  empresa: string;
  regiao: string;
  cidade: string;
  uf: string;
  motivoDesligamento: string;
  emailCorporativo: string;
  celular: string;
  codCliente: number | null;
  nomeCliente: string;
  cnpjCliente: string;
  departamento: string;
  rhFocal: string;
  grupoEconomico: string;
}

export interface FilterOptions {
  status: 'all' | 'ativo' | 'desligado';
  grupoEconomico: string;
  vinculo: string;
  ano: string;
  regiao: string;
  uf: string;
  cliente: string;
  cargo: string;
  searchQuery: string;
  minSalario: number | '';
  maxSalario: number | '';
}

export interface DashboardMetrics {
  totalRecords: number;
  totalAtivos: number;
  totalDesligados: number;
  percentAtivos: number;
  percentDesligados: number;
  mediaSalariaGeral: number;
  mediaSalariaAtivos: number;
  mediaSalariaDesligados: number;
  maiorSalario: number;
  folhaSalarialTotalAtivos: number;
  totalGruposEconomicos: number;
  totalClientes: number;
  totalCargos: number;
}
