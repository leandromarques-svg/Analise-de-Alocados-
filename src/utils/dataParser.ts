import { FuncionarioRaw, Funcionario, DashboardMetrics } from '../types';

export function safeStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export function parseYearFromDate(dateStr: any): number | null {
  if (dateStr === null || dateStr === undefined) return null;
  const str = String(dateStr).trim();
  if (!str) return null;
  
  // Check ISO format 2023-12-11T08:00:00.000Z
  const isoMatch = str.match(/^(\d{4})-\d{2}-\d{2}/);
  if (isoMatch) {
    return parseInt(isoMatch[1], 10);
  }

  // Check M/D/YYYY or D/M/YYYY or YYYY-MM-DD
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    const yearStr = slashParts[2].split('T')[0].split(' ')[0];
    const yr = parseInt(yearStr, 10);
    if (!isNaN(yr) && yr > 1900 && yr < 2100) return yr;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.getFullYear();
  }

  return null;
}

export function formatDate(dateStr: any): string {
  if (dateStr === null || dateStr === undefined) return '-';
  const str = String(dateStr).trim();
  if (!str) return '-';
  
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // ignore
  }
  return str;
}

export function parseNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

export function normalizeFuncionario(raw: FuncionarioRaw | any, idx: number): Funcionario {
  if (raw && typeof raw.id !== 'undefined' && typeof raw.isAtivo !== 'undefined' && typeof raw.grupoEconomico !== 'undefined') {
    return raw as Funcionario;
  }

  const dataDemissaoRaw = raw['Data Demissão'];
  const hasDemissao = Boolean(dataDemissaoRaw && String(dataDemissaoRaw).trim() !== '');
  
  const regiaoRaw = safeStr(raw['e ']);
  let cidade = 'Não informada';
  let uf = 'SP';
  if (regiaoRaw) {
    const parts = regiaoRaw.split(' - ');
    if (parts.length >= 2) {
      cidade = parts[0].trim();
      uf = parts[1].trim();
    } else {
      cidade = regiaoRaw;
    }
  }

  const salario = parseNumber(raw['Salário Base']);

  return {
    id: raw['Cód.Func.'] || (idx + 1),
    nome: safeStr(raw['Nome do Funcionário']) || 'Sem Nome',
    vinculo: safeStr(raw['Vínculo Empregatício']) || 'Outros',
    telefone: safeStr(raw['Telefone']) || safeStr(raw['Celular(envio SMS)']),
    dataAdmissao: safeStr(raw['Data Admissão']),
    anoAdmissao: parseYearFromDate(raw['Data Admissão']),
    dataVctoContrato: safeStr(raw['Data Vcto Contrato']),
    dataVctoProrrogacao: safeStr(raw['Data Vcto Prorrogação']),
    dataDemissao: hasDemissao ? safeStr(dataDemissaoRaw) : null,
    anoDemissao: hasDemissao ? parseYearFromDate(dataDemissaoRaw) : null,
    isAtivo: !hasDemissao,
    salario,
    cargo: safeStr(raw['Cargo ou Função']) || 'Não especificado',
    depto: safeStr(raw['Depto/Centro de Custo']) || safeStr(raw['Departamento']) || '-',
    empresa: safeStr(raw['Empresa']) || 'METARH',
    regiao: regiaoRaw || 'Outros - SP',
    cidade,
    uf,
    motivoDesligamento: safeStr(raw['Motivo do Desligamento']) || (hasDemissao ? 'Demissão' : '-'),
    emailCorporativo: safeStr(raw['E-mail Corporativo']),
    celular: safeStr(raw['Celular(envio SMS)']),
    codCliente: raw['Cod. Cliente'] || null,
    nomeCliente: safeStr(raw['Nome Cliente']) || 'Cliente Não Informado',
    cnpjCliente: safeStr(raw['CNPJ Cliente']),
    departamento: safeStr(raw['Departamento']),
    rhFocal: safeStr(raw['Nome RH Focal']),
    grupoEconomico: safeStr(raw['Grupo Econômico']) || '00000-OUTROS',
  };
}

export function calculateMetrics(data: Funcionario[]): DashboardMetrics {
  const totalRecords = data.length;
  if (totalRecords === 0) {
    return {
      totalRecords: 0,
      totalAtivos: 0,
      totalDesligados: 0,
      percentAtivos: 0,
      percentDesligados: 0,
      mediaSalariaGeral: 0,
      mediaSalariaAtivos: 0,
      mediaSalariaDesligados: 0,
      maiorSalario: 0,
      folhaSalarialTotalAtivos: 0,
      totalGruposEconomicos: 0,
      totalClientes: 0,
      totalCargos: 0,
    };
  }

  const ativos = data.filter(d => d.isAtivo);
  const desligados = data.filter(d => !d.isAtivo);

  const totalAtivos = ativos.length;
  const totalDesligados = desligados.length;
  const percentAtivos = Math.round((totalAtivos / totalRecords) * 1000) / 10;
  const percentDesligados = Math.round((totalDesligados / totalRecords) * 1000) / 10;

  const somaSalariosGeral = data.reduce((acc, curr) => acc + curr.salario, 0);
  const mediaSalariaGeral = somaSalariosGeral / totalRecords;

  const folhaSalarialTotalAtivos = ativos.reduce((acc, curr) => acc + curr.salario, 0);
  const mediaSalariaAtivos = totalAtivos > 0 ? folhaSalarialTotalAtivos / totalAtivos : 0;

  const somaSalariosDesligados = desligados.reduce((acc, curr) => acc + curr.salario, 0);
  const mediaSalariaDesligados = totalDesligados > 0 ? somaSalariosDesligados / totalDesligados : 0;

  const maiorSalario = data.reduce((max, curr) => (curr.salario > max ? curr.salario : max), 0);

  const gruposSet = new Set(data.map(d => d.grupoEconomico));
  const clientesSet = new Set(data.map(d => d.nomeCliente));
  const cargosSet = new Set(data.map(d => d.cargo));

  return {
    totalRecords,
    totalAtivos,
    totalDesligados,
    percentAtivos,
    percentDesligados,
    mediaSalariaGeral,
    mediaSalariaAtivos,
    mediaSalariaDesligados,
    maiorSalario,
    folhaSalarialTotalAtivos,
    totalGruposEconomicos: gruposSet.size,
    totalClientes: clientesSet.size,
    totalCargos: cargosSet.size,
  };
}
