function parseStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    return value
      .split(/[,;|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function toAppUser(row: {
  id: string;
  username: string;
  password: string | null;
  role: string;
  grupoEconomico: string | null;
  gruposEconomicosJson: string | null;
  clientesAtribuidosJson: string | null;
  cnpjsAtribuidosJson: string | null;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  logs?: { id: string; timestamp: Date; author: string; action: string; details: string | null }[];
}) {
  const grupos = parseStringArray(row.gruposEconomicosJson);
  return {
    id: row.id,
    username: row.username,
    password: row.password ?? '',
    role: row.role,
    grupoEconomico: row.grupoEconomico || grupos[0] || '',
    gruposEconomicos: grupos.length > 0 ? grupos : row.grupoEconomico ? [row.grupoEconomico] : [],
    clientesAtribuidos: parseStringArray(row.clientesAtribuidosJson),
    cnpjsAtribuidos: parseStringArray(row.cnpjsAtribuidosJson),
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    logs: (row.logs ?? []).map((log) => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      author: log.author,
      action: log.action,
      details: log.details ?? '',
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : undefined,
  };
}

function dateOnly(value: Date | null | undefined): string {
  if (!value) return '';
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const day = String(value.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toFuncionario(row: {
  id: number;
  nome: string;
  vinculo: string | null;
  telefone: string | null;
  dataAdmissao: Date | null;
  anoAdmissao: number | null;
  dataVctoContrato: Date | null;
  dataVctoProrrogacao: Date | null;
  anoProrrogacao: number | null;
  dataDemissao: Date | null;
  anoDemissao: number | null;
  isAtivo: boolean;
  salario: { toString(): string } | number | null;
  cargo: string | null;
  depto: string | null;
  empresa: number | null;
  regiao: string | null;
  cidade: string | null;
  uf: string | null;
  motivoDesligamento: string | null;
  emailCorporativo: string | null;
  celular: string | null;
  codCliente: number | null;
  nomeCliente: string | null;
  cnpjCliente: string | null;
  departamento: string | null;
  rhFocal: string | null;
  grupoEconomico: string | null;
}) {
  const salario = row.salario == null ? 0 : Number(row.salario);
  return {
    id: row.id,
    nome: row.nome || 'Sem Nome',
    vinculo: row.vinculo || 'Outros',
    telefone: row.telefone || '',
    dataAdmissao: dateOnly(row.dataAdmissao),
    anoAdmissao: row.anoAdmissao,
    dataVctoContrato: dateOnly(row.dataVctoContrato),
    dataVctoProrrogacao: dateOnly(row.dataVctoProrrogacao),
    anoProrrogacao: row.anoProrrogacao,
    dataDemissao: row.dataDemissao ? dateOnly(row.dataDemissao) : null,
    anoDemissao: row.anoDemissao,
    isAtivo: row.isAtivo,
    salario: Number.isFinite(salario) ? salario : 0,
    cargo: row.cargo || 'Não especificado',
    depto: row.depto || '-',
    empresa: row.empresa == null ? 'METARH' : String(row.empresa),
    regiao: row.regiao || '',
    cidade: row.cidade || '',
    uf: row.uf || '',
    motivoDesligamento: row.motivoDesligamento || (row.isAtivo ? '-' : 'Demissão'),
    emailCorporativo: row.emailCorporativo || '',
    celular: row.celular || '',
    codCliente: row.codCliente,
    nomeCliente: row.nomeCliente || 'Cliente Não Informado',
    cnpjCliente: row.cnpjCliente || '',
    departamento: row.departamento || '',
    rhFocal: row.rhFocal || '',
    grupoEconomico: row.grupoEconomico || '',
  };
}

export function toAssignment(row: {
  grupoEconomico: string | null;
  nomeCliente: string | null;
  comercial: string;
}) {
  return {
    'Grupo Economico': row.grupoEconomico || '',
    'Nome Cliente': row.nomeCliente || '',
    Comercial: row.comercial,
  };
}
