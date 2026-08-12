import { FuncionarioRaw, Funcionario, DashboardMetrics } from '../types';

export const BRAZIL_UFS: { [code: string]: string } = {
  AC: 'Acre',
  AL: 'Alagoas',
  AP: 'Amapá',
  AM: 'Amazonas',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul',
  MG: 'Minas Gerais',
  PA: 'Pará',
  PB: 'Paraíba',
  PR: 'Paraná',
  PE: 'Pernambuco',
  PI: 'Piauí',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RS: 'Rio Grande do Sul',
  RO: 'Rondônia',
  RR: 'Roraima',
  SC: 'Santa Catarina',
  SP: 'São Paulo',
  SE: 'Sergipe',
  TO: 'Tocantins',
};

export const RAW_UF_TO_CODE: { [raw: string]: string } = {
  'MINAS GERAIS': 'MG',
  'ESTADO MINAS GERAIS': 'MG',
  'SÃO PAULO': 'SP',
  'SAO PAULO': 'SP',
  'ESTADO SP': 'SP',
  'RIO DE JANEIRO': 'RJ',
  'ESTADO RJ': 'RJ',
  'PARANÁ': 'PR',
  'PARANA': 'PR',
  'RIO GRANDE DO SUL': 'RS',
  'SANTA CATARINA': 'SC',
  'BAHIA': 'BA',
  'PERNAMBUCO': 'PE',
  'CEARÁ': 'CE',
  'CEARA': 'CE',
  'GOIÁS': 'GO',
  'GOIAS': 'GO',
  'DISTRITO FEDERAL': 'DF',
  'BRASÍLIA': 'DF',
  'BRASILIA': 'DF',
  'ESPÍRITO SANTO': 'ES',
  'ESPIRITO SANTO': 'ES',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',
  'AMAZONAS': 'AM',
  'PARÁ': 'PA',
  'PARA': 'PA',
  'MARANHÃO': 'MA',
  'MARANHAO': 'MA',
  'PARAÍBA': 'PB',
  'PARAIBA': 'PB',
  'RIO GRANDE DO NORTE': 'RN',
  'PIAUÍ': 'PI',
  'PIAUI': 'PI',
  'ALAGOAS': 'AL',
  'SERGIPE': 'SE',
  'ESTADO SE': 'SE',
  'RONDÔNIA': 'RO',
  'RONDONIA': 'RO',
  'TOCANTINS': 'TO',
  'ACRE': 'AC',
  'AMAPÁ': 'AP',
  'AMAPA': 'AP',
  'RORAIMA': 'RR',
  'ESTADO RR': 'RR',
};

export function parseUFCode(rawUfInput: string): string {
  if (!rawUfInput) return 'SP';
  let str = String(rawUfInput).trim();
  if (str.toUpperCase().startsWith('ESTADO ')) {
    str = str.substring(7).trim();
  }
  const upper = str.toUpperCase();

  if (BRAZIL_UFS[upper]) return upper;
  if (RAW_UF_TO_CODE[upper]) return RAW_UF_TO_CODE[upper];

  // Check suffix like /SP, - SP, /MG, - MG, /DF, (SP), , SP, or trailing " SP"
  const suffixMatch = str.match(/[\/\-\s,\(](AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)[\)]?$/i);
  if (suffixMatch) {
    return suffixMatch[1].toUpperCase();
  }

  if (upper.includes('MINAS')) return 'MG';
  if (upper.includes('SAO PAULO') || upper.includes('SÃO PAULO')) return 'SP';
  if (upper.includes('RIO DE JANEIRO')) return 'RJ';
  if (upper.includes('PERNAMBUCO')) return 'PE';
  if (upper.includes('BAHIA')) return 'BA';
  if (upper.includes('CEARA') || upper.includes('CEARÁ')) return 'CE';
  if (upper.includes('GOIAS') || upper.includes('GOIÁS')) return 'GO';
  if (upper.includes('PARANA') || upper.includes('PARANÁ')) return 'PR';
  if (upper.includes('BRASILIA') || upper.includes('BRASÍLIA') || upper.includes('DISTRITO')) return 'DF';
  if (upper.includes('ESPIRITO') || upper.includes('ESPÍRITO')) return 'ES';
  if (upper.includes('MATO GROSSO DO SUL')) return 'MS';
  if (upper.includes('MATO GROSSO')) return 'MT';
  if (upper.includes('AMAZONAS')) return 'AM';
  if (upper.includes('SANTA CATARINA')) return 'SC';
  if (upper.includes('RIO GRANDE DO SUL')) return 'RS';
  if (upper.includes('RIO GRANDE DO NORTE')) return 'RN';
  if (upper.includes('SERGIPE')) return 'SE';
  if (upper.includes('ALAGOAS')) return 'AL';
  if (upper.includes('MARANHAO') || upper.includes('MARANHÃO')) return 'MA';
  if (upper.includes('PARAIBA') || upper.includes('PARAÍBA')) return 'PB';
  if (upper.includes('PIAUI') || upper.includes('PIAUÍ')) return 'PI';
  if (upper.includes('RONDÔNIA') || upper.includes('RONDONIA')) return 'RO';
  if (upper.includes('TOCANTINS')) return 'TO';
  if (upper.includes('RORAIMA')) return 'RR';

  if (upper.length === 2 && BRAZIL_UFS[upper]) return upper;
  return 'SP';
}

export function getUFName(ufCode: string): string {
  if (!ufCode) return 'São Paulo';
  const cleanCode = ufCode.trim().toUpperCase();
  if (BRAZIL_UFS[cleanCode]) return BRAZIL_UFS[cleanCode];
  if (RAW_UF_TO_CODE[cleanCode]) return BRAZIL_UFS[RAW_UF_TO_CODE[cleanCode]] || cleanCode;
  return ufCode;
}

export function safeStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

export interface ParsedDateDetails {
  year: number | null;
  month: number | null; // 1-12
  day: number | null;   // 1-31
  date: Date | null;
}

export function parseDateDetails(dateStr: any): ParsedDateDetails {
  if (dateStr === null || dateStr === undefined) {
    return { year: null, month: null, day: null, date: null };
  }
  const str = String(dateStr).trim();
  if (!str || str === '-') {
    return { year: null, month: null, day: null, date: null };
  }

  // 1. Check ISO format YYYY-MM-DD...
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (year > 1900 && year < 2100 && month >= 1 && month <= 12) {
      return { year, month, day, date: new Date(year, month - 1, day) };
    }
  }

  // 2. Slash/Dash formats (DD/MM/YYYY, M/D/YYYY, YYYY/MM/DD)
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    const p0 = parseInt(parts[0].trim(), 10);
    const p1 = parseInt(parts[1].trim(), 10);
    const p2Str = parts[2].trim().split('T')[0].split(' ')[0];
    const p2 = parseInt(p2Str, 10);

    // Case A: p2 is 4-digit year (e.g. MM/DD/YYYY)
    if (!isNaN(p2) && p2 >= 1900 && p2 <= 2100) {
      const year = p2;
      let month: number | null = null;
      let day: number | null = null;

      if (!isNaN(p0) && !isNaN(p1)) {
        if (p0 <= 12 && p0 >= 1 && p1 <= 31 && p1 >= 1) {
          // Strictly MM/DD/YYYY format (p0 = Month, p1 = Day)
          month = p0;
          day = p1;
        } else if (p0 > 12 && p0 <= 31 && p1 <= 12 && p1 >= 1) {
          // Fallback DD/MM/YYYY format if p0 is a day > 12
          day = p0;
          month = p1;
        }
      }

      if (month !== null && month >= 1 && month <= 12) {
        const validDay = day && day >= 1 && day <= 31 ? day : 1;
        return {
          year,
          month,
          day: validDay,
          date: new Date(year, month - 1, validDay),
        };
      }
    }

    // Case B: p0 is 4-digit year (e.g. 2024/05/15)
    if (!isNaN(p0) && p0 >= 1900 && p0 <= 2100) {
      const year = p0;
      const month = p1 >= 1 && p1 <= 12 ? p1 : null;
      const day = p2 >= 1 && p2 <= 31 ? p2 : 1;
      if (month !== null) {
        return { year, month, day, date: new Date(year, month - 1, day) };
      }
    }
  }

  // 3. Fallback to JS Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      date: d,
    };
  }

  return { year: null, month: null, day: null, date: null };
}

export function parseYearFromDate(dateStr: any): number | null {
  return parseDateDetails(dateStr).year;
}

export function isFutureAdmission(dateStr: any, currentYear = 2026, currentMonth = 8): boolean {
  const details = parseDateDetails(dateStr);
  if (!details.year || !details.month) return false;
  if (details.year > currentYear) return true;
  if (details.year === currentYear && details.month > currentMonth) return true;
  return false;
}

export function formatDate(dateStr: any): string {
  if (dateStr === null || dateStr === undefined) return '-';
  const details = parseDateDetails(dateStr);
  if (details.day && details.month && details.year) {
    const dd = String(details.day).padStart(2, '0');
    const mm = String(details.month).padStart(2, '0');
    return `${dd}/${mm}/${details.year}`;
  }
  const str = String(dateStr).trim();
  return str || '-';
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

export function parseRegionalInfo(raw: any): { cidade: string; uf: string; regiao: string } {
  let candidateStr =
    safeStr(raw['Descrição de Região']) ||
    safeStr(raw['Descrição de Regiao']) ||
    safeStr(raw['Descrição Região']) ||
    safeStr(raw['Descrição Regiao']) ||
    safeStr(raw['Descricao de Regiao']) ||
    safeStr(raw['Descricao Regiao']) ||
    safeStr(raw['Descrição da Região']) ||
    safeStr(raw['Descrição da Regiao']) ||
    safeStr(raw['Descrição do Local']) ||
    safeStr(raw['Descrição Localidade']) ||
    safeStr(raw['e ']) ||
    safeStr(raw['e']) ||
    safeStr(raw['Cidade - UF']) ||
    safeStr(raw['Cidade / UF']) ||
    safeStr(raw['Cidade-UF']) ||
    safeStr(raw['Descrição']) ||
    safeStr(raw['Descricao']) ||
    safeStr(raw['Regional']) ||
    safeStr(raw['Localidade']) ||
    safeStr(raw['regiao']);

  // If candidate is empty or pure numeric (like "276" from numeric region column M), inspect keys of raw dynamically
  if (!candidateStr || /^\d+$/.test(candidateStr.trim())) {
    const keys = Object.keys(raw || {});
    for (const k of keys) {
      const lower = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (
        (lower.includes('descri') && lower.includes('regi')) ||
        (lower.includes('descri') && lower.includes('local')) ||
        lower === 'e' ||
        lower === 'e '
      ) {
        const val = safeStr(raw[k]);
        if (val && !/^\d+$/.test(val.trim())) {
          candidateStr = val;
          break;
        }
      }
    }
  }

  // Fallback to Região / Regiao if non-numeric
  if (!candidateStr || /^\d+$/.test(candidateStr.trim())) {
    const valReg = safeStr(raw['Região']) || safeStr(raw['Regiao']) || safeStr(raw['REGIAO']);
    if (valReg && !/^\d+$/.test(valReg.trim())) {
      candidateStr = valReg;
    }
  }

  const rawCidade = safeStr(raw['Cidade']) || safeStr(raw['CIDADE']) || safeStr(raw['Municipio']) || safeStr(raw['Município']) || safeStr(raw['cidade']);
  const rawUf = safeStr(raw['UF']) || safeStr(raw['Uf']) || safeStr(raw['Estado']) || safeStr(raw['ESTADO']) || safeStr(raw['uf']);

  let foundStr = candidateStr.trim();
  if (/^\d+$/.test(foundStr)) {
    foundStr = '';
  }

  let cidade = '';
  let uf = 'SP';

  if (foundStr && foundStr !== '-' && foundStr !== 'Outros - SP') {
    uf = parseUFCode(foundStr);

    // Extract clean city name by removing state code or suffix (e.g. "ARARAQUARA SP", "ARARAS - SP", "ARATU - BA", "CAMPINAS / SP")
    let cleanCity = foundStr
      .replace(/[\s\-\/\,]+(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)[\)]?$/i, '')
      .trim();
    cleanCity = cleanCity.replace(/[\-\/]$/, '').trim();

    if (cleanCity && !/^\d+$/.test(cleanCity)) {
      cidade = cleanCity;
    }
  }

  if (!cidade && rawCidade && rawCidade !== 'Não informada') {
    cidade = rawCidade;
  }

  if (!uf || uf === 'SP') {
    if (rawUf) {
      uf = parseUFCode(rawUf);
    }
  }

  if (!cidade || cidade === 'Não informada' || cidade === 'Outros') {
    cidade = BRAZIL_UFS[uf] || 'São Paulo';
  }

  const regiao = `${cidade} - ${uf}`;
  return { cidade, uf, regiao };
}

export function normalizeFuncionario(raw: FuncionarioRaw | any, idx: number): Funcionario {
  if (raw && typeof raw.id !== 'undefined' && typeof raw.isAtivo !== 'undefined' && typeof raw.grupoEconomico !== 'undefined') {
    const f = raw as Funcionario;
    const info = parseRegionalInfo(f);
    const uf = f.uf && f.uf !== 'SP' ? parseUFCode(f.uf) : info.uf;
    const cidade = f.cidade && f.cidade !== 'Não informada' && f.cidade !== 'Outros' ? f.cidade : info.cidade;
    let regiao = f.regiao && f.regiao !== 'Outros - SP' ? f.regiao : info.regiao;
    if (regiao === 'Outros - SP' && cidade !== 'Não informada') {
      regiao = `${cidade} - ${uf}`;
    }
    return {
      ...f,
      uf,
      cidade,
      regiao,
    };
  }

  const dataDemissaoRaw = raw['Data Demissão'];
  const hasDemissao = Boolean(dataDemissaoRaw && String(dataDemissaoRaw).trim() !== '');

  const regInfo = parseRegionalInfo(raw);

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
    anoProrrogacao: parseYearFromDate(raw['Data Vcto Prorrogação']),
    dataDemissao: hasDemissao ? safeStr(dataDemissaoRaw) : null,
    anoDemissao: hasDemissao ? parseYearFromDate(dataDemissaoRaw) : null,
    isAtivo: !hasDemissao,
    salario,
    cargo: safeStr(raw['Cargo ou Função']) || 'Não especificado',
    depto: safeStr(raw['Depto/Centro de Custo']) || safeStr(raw['Departamento']) || '-',
    empresa: safeStr(raw['Empresa']) || 'METARH',
    regiao: regInfo.regiao,
    cidade: regInfo.cidade,
    uf: regInfo.uf,
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
