// src/server/vercelEntry.ts
import "dotenv/config";

// src/server/app.ts
import express from "express";
import compression from "compression";

// src/server/routes/alocados.ts
import { Router } from "express";

// src/server/prisma.ts
import { PrismaClient } from "@prisma/client";
var globalForPrisma = globalThis;
var prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// src/server/presenters.ts
function parseStringArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}
function toAppUser(row) {
  const grupos = parseStringArray(row.gruposEconomicosJson);
  return {
    id: row.id,
    username: row.username,
    password: row.password ?? "",
    role: row.role,
    grupoEconomico: row.grupoEconomico || grupos[0] || "",
    gruposEconomicos: grupos.length > 0 ? grupos : row.grupoEconomico ? [row.grupoEconomico] : [],
    clientesAtribuidos: parseStringArray(row.clientesAtribuidosJson),
    cnpjsAtribuidos: parseStringArray(row.cnpjsAtribuidosJson),
    email: row.email ?? void 0,
    phone: row.phone ?? void 0,
    logs: (row.logs ?? []).map((log) => ({
      id: log.id,
      timestamp: log.timestamp.toISOString(),
      author: log.author,
      action: log.action,
      details: log.details ?? ""
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : void 0
  };
}
function dateOnly(value) {
  if (!value) return "";
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function toFuncionario(row) {
  const salario = row.salario == null ? 0 : Number(row.salario);
  return {
    id: row.id,
    nome: row.nome || "Sem Nome",
    vinculo: row.vinculo || "Outros",
    telefone: row.telefone || "",
    dataAdmissao: dateOnly(row.dataAdmissao),
    anoAdmissao: row.anoAdmissao,
    dataVctoContrato: dateOnly(row.dataVctoContrato),
    dataVctoProrrogacao: dateOnly(row.dataVctoProrrogacao),
    anoProrrogacao: row.anoProrrogacao,
    dataDemissao: row.dataDemissao ? dateOnly(row.dataDemissao) : null,
    anoDemissao: row.anoDemissao,
    isAtivo: row.isAtivo,
    salario: Number.isFinite(salario) ? salario : 0,
    cargo: row.cargo || "N\xE3o especificado",
    depto: row.depto || "-",
    empresa: row.empresa == null ? "METARH" : String(row.empresa),
    regiao: row.regiao || "",
    cidade: row.cidade || "",
    uf: row.uf || "",
    motivoDesligamento: row.motivoDesligamento || (row.isAtivo ? "-" : "Demiss\xE3o"),
    emailCorporativo: row.emailCorporativo || "",
    celular: row.celular || "",
    codCliente: row.codCliente,
    nomeCliente: row.nomeCliente || "Cliente N\xE3o Informado",
    cnpjCliente: row.cnpjCliente || "",
    departamento: row.departamento || "",
    rhFocal: row.rhFocal || "",
    grupoEconomico: row.grupoEconomico || ""
  };
}
function toAssignment(row) {
  return {
    "Grupo Economico": row.grupoEconomico || "",
    "Nome Cliente": row.nomeCliente || "",
    Comercial: row.comercial
  };
}

// src/server/alocadosCache.ts
var DEFAULT_TTL_MS = 2 * 60 * 60 * 1e3;
var AUTOMATIC_UPDATE = "Atualiza\xE7\xE3o autom\xE1tica";
var memory = null;
var inflight = null;
function ttlMs() {
  const raw = Number(process.env.ALOCADOS_CACHE_TTL_MS);
  if (Number.isFinite(raw) && raw >= 0) return raw;
  return DEFAULT_TTL_MS;
}
async function readSql(updatedBy) {
  const started = Date.now();
  const rows = await prisma.employee.findMany({ orderBy: { id: "asc" } });
  const data = rows.map(toFuncionario);
  const payload = {
    success: true,
    source: "sql",
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedBy,
    cached: false,
    total: data.length,
    data
  };
  memory = { payload, storedAt: Date.now() };
  console.log(`[METARH alocados] SQL ${Date.now() - started}ms, ${data.length} linhas`);
  return payload;
}
function startRead(updatedBy) {
  if (!inflight) {
    inflight = readSql(updatedBy).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
function getAlocados(refresh, updatedBy = AUTOMATIC_UPDATE) {
  const now = Date.now();
  const fresh = memory != null && now - memory.storedAt < ttlMs();
  if (!refresh && fresh && memory) {
    const ageSec = Math.round((now - memory.storedAt) / 1e3);
    console.log(`[METARH alocados] cache hit, ${memory.payload.total} linhas, idade ${ageSec}s`);
    return Promise.resolve({ ...memory.payload, source: "cache", cached: true });
  }
  if (!refresh && memory) {
    void startRead(AUTOMATIC_UPDATE).catch((err) => console.error("[METARH alocados] atualiza\xE7\xE3o em segundo plano", err));
    console.log(`[METARH alocados] cache vencido, devolvendo ${memory.payload.total} linhas e atualizando`);
    return Promise.resolve({ ...memory.payload, source: "cache", cached: true });
  }
  return startRead(updatedBy);
}

// src/server/routes/alocados.ts
var router = Router();
var PAGE_SIZE = 4e3;
router.get("/alocados", async (req, res) => {
  try {
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    const updatedBy = String(req.query.by || "").trim() || "Atualiza\xE7\xE3o autom\xE1tica";
    const offset = Math.max(0, Number.parseInt(String(req.query.offset ?? "0"), 10) || 0);
    const requested = Number.parseInt(String(req.query.limit ?? PAGE_SIZE), 10);
    const limit = Math.min(PAGE_SIZE, Math.max(1, Number.isFinite(requested) ? requested : PAGE_SIZE));
    const payload = await getAlocados(refresh, updatedBy);
    return res.json({
      ...payload,
      offset,
      limit,
      data: payload.data.slice(offset, offset + limit)
    });
  } catch (err) {
    console.error("[SQL alocados]", err);
    const unavailable = err?.name === "PrismaClientInitializationError";
    return res.status(unavailable ? 503 : 500).json({
      success: false,
      error: unavailable ? "Banco indispon\xEDvel. Verifique DATABASE_URL e se o SQL Server est\xE1 no ar." : err?.message || "Erro ao ler alocados",
      code: unavailable ? "DB_UNAVAILABLE" : "INTERNAL"
    });
  }
});
var alocados_default = router;

// src/server/routes/users.ts
import { Router as Router2 } from "express";
var router2 = Router2();
function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function jsonOrNull(value) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
async function listUsers() {
  const rows = await prisma.user.findMany({
    orderBy: { username: "asc" },
    include: { logs: { orderBy: { timestamp: "desc" }, take: 20 } }
  });
  return rows.map(toAppUser);
}
async function findByUsername(username) {
  const needle = username.trim().toLowerCase();
  const rows = await prisma.user.findMany();
  return rows.find((row) => row.username.trim().toLowerCase() === needle) ?? null;
}
router2.all("/users", async (req, res) => {
  try {
    const action = (req.query.action || req.body?.action || "getUsers").toString();
    if (action === "saveUser" || req.body?.user) {
      const userData = req.body?.user || req.body;
      const username = String(userData?.username || "").trim();
      if (!username) {
        return res.status(400).json({ success: false, error: "username \xE9 obrigat\xF3rio" });
      }
      const existing = await findByUsername(username);
      const payload = {
        username,
        password: userData.password != null ? String(userData.password) : null,
        role: String(userData.role || "Colaborador"),
        grupoEconomico: userData.grupoEconomico ? String(userData.grupoEconomico) : null,
        gruposEconomicosJson: jsonOrNull(userData.gruposEconomicos),
        clientesAtribuidosJson: jsonOrNull(userData.clientesAtribuidos),
        cnpjsAtribuidosJson: jsonOrNull(userData.cnpjsAtribuidos),
        email: userData.email ? String(userData.email) : null,
        phone: userData.phone ? String(userData.phone) : null,
        updatedAt: /* @__PURE__ */ new Date()
      };
      const saved = existing ? await prisma.user.update({
        where: { id: existing.id },
        data: payload,
        include: { logs: { orderBy: { timestamp: "desc" }, take: 20 } }
      }) : await prisma.user.create({
        data: {
          id: String(userData.id || newId("user")),
          ...payload
        },
        include: { logs: { orderBy: { timestamp: "desc" }, take: 20 } }
      });
      if (Array.isArray(userData.logs)) {
        for (const log of userData.logs) {
          if (!log?.id || !log?.action) continue;
          await prisma.userLog.upsert({
            where: { id: String(log.id) },
            update: {},
            create: {
              id: String(log.id),
              userId: saved.id,
              timestamp: log.timestamp ? new Date(log.timestamp) : /* @__PURE__ */ new Date(),
              author: String(log.author || username),
              action: String(log.action),
              details: log.details ? String(log.details) : null
            }
          });
        }
      }
      const users2 = await listUsers();
      return res.json({ success: true, user: toAppUser(saved), users: users2 });
    }
    if (action === "deleteUser") {
      const usernameToDelete = String(req.query.username || req.body?.username || "").trim();
      const existing = usernameToDelete ? await findByUsername(usernameToDelete) : null;
      if (existing) {
        await prisma.user.delete({ where: { id: existing.id } });
      }
      const users2 = await listUsers();
      return res.json({ success: true, users: users2 });
    }
    const users = await listUsers();
    return res.json({ success: true, data: users, users });
  } catch (err) {
    console.error("[SQL users]", err);
    const unavailable = err?.name === "PrismaClientInitializationError";
    return res.status(unavailable ? 503 : 500).json({
      success: false,
      error: err?.message || "Erro ao ler usu\xE1rios",
      users: []
    });
  }
});
var users_default = router2;

// src/server/routes/commercialAssignments.ts
import { Router as Router3 } from "express";
var router3 = Router3();
function asList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}
function newId2() {
  return `asg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function cleanGroup(value) {
  const lower = value.toLowerCase().trim();
  if (!value || lower === "outros" || lower === "sem grupo") return "";
  return value.trim();
}
router3.all("/commercial-assignments", async (req, res) => {
  try {
    const action = (req.query.action || req.body?.action || "getAssignments").toString();
    const comercialFilter = String(
      req.query.comercial || req.body?.comercial || req.query.username || req.body?.username || ""
    ).trim();
    if (action === "saveAssignments" || req.method === "POST" && req.body?.comercial) {
      const comercial = String(req.body?.comercial || req.body?.username || comercialFilter).trim();
      if (!comercial) {
        return res.status(400).json({ success: false, error: "Usu\xE1rio Comercial \xE9 obrigat\xF3rio" });
      }
      const rows2 = await prisma.commercialAssignment.findMany();
      const comercialLower = comercial.toLowerCase();
      const owned = rows2.filter((row) => row.comercial.trim().toLowerCase() === comercialLower);
      if (owned.length > 0) {
        await prisma.commercialAssignment.deleteMany({
          where: { id: { in: owned.map((row) => row.id) } }
        });
      }
      const creates = [];
      const rawItems = req.body?.items;
      if (Array.isArray(rawItems) && rawItems.length > 0) {
        for (const item of rawItems) {
          creates.push({
            id: newId2(),
            grupoEconomico: cleanGroup(String(item["Grupo Economico"] || item.grupoEconomico || "")) || null,
            nomeCliente: String(item["Nome Cliente"] || item.nomeCliente || "").trim() || null,
            comercial
          });
        }
      } else {
        const clientes = asList(req.body?.clientes);
        const grupos = asList(req.body?.grupos);
        const mappings = req.body?.mappings || {};
        if (clientes.length > 0) {
          for (const cliente of clientes) {
            creates.push({
              id: newId2(),
              grupoEconomico: cleanGroup(String(mappings[cliente] || "")) || null,
              nomeCliente: cliente,
              comercial
            });
          }
        } else {
          for (const grupo of grupos) {
            const cleaned = cleanGroup(grupo);
            if (!cleaned) continue;
            creates.push({ id: newId2(), grupoEconomico: cleaned, nomeCliente: null, comercial });
          }
        }
      }
      if (creates.length > 0) {
        await prisma.commercialAssignment.createMany({ data: creates });
      }
      const allRows = await prisma.commercialAssignment.findMany({ orderBy: { comercial: "asc" } });
      const all2 = allRows.map(toAssignment);
      const data = all2.filter((item) => item.Comercial.trim().toLowerCase() === comercialLower);
      return res.json({ success: true, comercial, data, all: all2 });
    }
    const rows = await prisma.commercialAssignment.findMany({ orderBy: { comercial: "asc" } });
    const all = rows.map(toAssignment);
    if (comercialFilter) {
      const comercialLower = comercialFilter.toLowerCase();
      const data = all.filter((item) => {
        const name = item.Comercial.trim().toLowerCase();
        return name === comercialLower || name.includes(comercialLower) || comercialLower.includes(name);
      });
      return res.json({ success: true, comercial: comercialFilter, data });
    }
    return res.json({ success: true, data: all });
  } catch (err) {
    console.error("[SQL carteira]", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Erro ao ler carteira",
      data: []
    });
  }
});
var commercialAssignments_default = router3;

// src/server/routes/sql.ts
import { Router as Router4 } from "express";
import { Prisma } from "@prisma/client";
var router4 = Router4();
function newId3(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
function prismaError(res, err) {
  console.error("[SQL API]", err);
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ success: false, error: "Registro duplicado", code: err.code });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, error: "Registro n\xE3o encontrado", code: err.code });
    }
  }
  if (err?.name === "PrismaClientInitializationError") {
    return res.status(503).json({
      success: false,
      error: "Banco indispon\xEDvel. Verifique DATABASE_URL e se o SQL Server est\xE1 no ar.",
      code: "DB_UNAVAILABLE"
    });
  }
  return res.status(500).json({
    success: false,
    error: err?.message || "Erro interno",
    code: "INTERNAL"
  });
}
router4.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    return res.json({ success: true, database: "up", schema: "alocados" });
  } catch (err) {
    return prismaError(res, err);
  }
});
router4.post("/login", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password ?? "");
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: "username e password s\xE3o obrigat\xF3rios",
        code: "VALIDATION"
      });
    }
    const rows = await prisma.user.findMany({
      include: { logs: { take: 5, orderBy: { timestamp: "desc" } } }
    });
    const found = rows.find((row) => row.username.trim().toLowerCase() === username.toLowerCase());
    if (!found || (found.password ?? "") !== password) {
      return res.status(401).json({
        success: false,
        error: "Usu\xE1rio ou senha incorretos",
        code: "INVALID_CREDENTIALS"
      });
    }
    return res.json({ success: true, data: toAppUser(found) });
  } catch (err) {
    return prismaError(res, err);
  }
});
router4.get("/users", async (_req, res) => {
  try {
    const data = await prisma.user.findMany({
      orderBy: { username: "asc" },
      include: { logs: { take: 5, orderBy: { timestamp: "desc" } } }
    });
    return res.json({ success: true, total: data.length, data });
  } catch (err) {
    return prismaError(res, err);
  }
});
router4.post("/users", async (req, res) => {
  try {
    const username = String(req.body?.username || "").trim();
    const role = String(req.body?.role || "Colaborador").trim();
    if (!username) {
      return res.status(400).json({ success: false, error: "username \xE9 obrigat\xF3rio", code: "VALIDATION" });
    }
    const data = await prisma.user.create({
      data: {
        id: String(req.body?.id || newId3("user")),
        username,
        password: req.body?.password ? String(req.body.password) : null,
        role,
        grupoEconomico: req.body?.grupoEconomico ? String(req.body.grupoEconomico) : null,
        gruposEconomicosJson: req.body?.gruposEconomicos ? JSON.stringify(req.body.gruposEconomicos) : null,
        clientesAtribuidosJson: req.body?.clientesAtribuidos ? JSON.stringify(req.body.clientesAtribuidos) : null,
        cnpjsAtribuidosJson: req.body?.cnpjsAtribuidos ? JSON.stringify(req.body.cnpjsAtribuidos) : null,
        email: req.body?.email ? String(req.body.email) : null,
        phone: req.body?.phone ? String(req.body.phone) : null,
        logs: req.body?.log ? {
          create: {
            id: newId3("log"),
            author: String(req.body.log.author || "Sistema"),
            action: String(req.body.log.action || "Cria\xE7\xE3o"),
            details: req.body.log.details ? String(req.body.log.details) : null
          }
        } : void 0
      },
      include: { logs: true }
    });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return prismaError(res, err);
  }
});
router4.get("/user-logs", async (req, res) => {
  try {
    const userId = req.query.userId ? String(req.query.userId) : void 0;
    const data = await prisma.userLog.findMany({
      where: userId ? { userId } : void 0,
      orderBy: { timestamp: "desc" },
      take: 100
    });
    return res.json({ success: true, total: data.length, data });
  } catch (err) {
    return prismaError(res, err);
  }
});
router4.get("/employees", async (req, res) => {
  try {
    const take = Math.min(Number(req.query.limit || 50), 500);
    const data = await prisma.employee.findMany({
      take,
      orderBy: { id: "asc" }
    });
    const total = await prisma.employee.count();
    return res.json({ success: true, total, data });
  } catch (err) {
    return prismaError(res, err);
  }
});
router4.post("/employees", async (req, res) => {
  try {
    const id = Number(req.body?.id);
    const nome = String(req.body?.nome || "").trim();
    if (!Number.isFinite(id) || !nome) {
      return res.status(400).json({
        success: false,
        error: "id (n\xFAmero) e nome s\xE3o obrigat\xF3rios",
        code: "VALIDATION"
      });
    }
    const data = await prisma.employee.create({
      data: {
        id,
        nome,
        vinculo: req.body?.vinculo ? String(req.body.vinculo) : null,
        telefone: req.body?.telefone ? String(req.body.telefone) : null,
        dataAdmissao: req.body?.dataAdmissao ? new Date(req.body.dataAdmissao) : null,
        dataVctoContrato: req.body?.dataVctoContrato ? new Date(req.body.dataVctoContrato) : null,
        dataVctoProrrogacao: req.body?.dataVctoProrrogacao ? new Date(req.body.dataVctoProrrogacao) : null,
        dataDemissao: req.body?.dataDemissao ? new Date(req.body.dataDemissao) : null,
        anoAdmissao: req.body?.anoAdmissao != null ? Number(req.body.anoAdmissao) : null,
        anoProrrogacao: req.body?.anoProrrogacao != null ? Number(req.body.anoProrrogacao) : null,
        anoDemissao: req.body?.anoDemissao != null ? Number(req.body.anoDemissao) : null,
        isAtivo: req.body?.isAtivo !== false && req.body?.isAtivo !== "false",
        salario: req.body?.salario !== void 0 && req.body?.salario !== null ? new Prisma.Decimal(req.body.salario) : null,
        cargo: req.body?.cargo ? String(req.body.cargo) : null,
        depto: req.body?.depto ? String(req.body.depto) : null,
        empresa: req.body?.empresa !== void 0 && req.body?.empresa !== null && req.body?.empresa !== "" ? Number(req.body.empresa) : null,
        regiao: req.body?.regiao ? String(req.body.regiao) : null,
        cidade: req.body?.cidade ? String(req.body.cidade) : null,
        uf: req.body?.uf ? String(req.body.uf) : null,
        motivoDesligamento: req.body?.motivoDesligamento ? String(req.body.motivoDesligamento) : null,
        emailCorporativo: req.body?.emailCorporativo ? String(req.body.emailCorporativo) : null,
        celular: req.body?.celular ? String(req.body.celular) : null,
        codCliente: req.body?.codCliente !== void 0 && req.body?.codCliente !== null ? Number(req.body.codCliente) : null,
        nomeCliente: req.body?.nomeCliente ? String(req.body.nomeCliente) : null,
        cnpjCliente: req.body?.cnpjCliente ? String(req.body.cnpjCliente) : null,
        departamento: req.body?.departamento ? String(req.body.departamento) : null,
        rhFocal: req.body?.rhFocal ? String(req.body.rhFocal) : null,
        grupoEconomico: req.body?.grupoEconomico ? String(req.body.grupoEconomico) : null
      }
    });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return prismaError(res, err);
  }
});
router4.get("/commercial-assignments", async (_req, res) => {
  try {
    const data = await prisma.commercialAssignment.findMany({
      orderBy: { comercial: "asc" }
    });
    return res.json({ success: true, total: data.length, data });
  } catch (err) {
    return prismaError(res, err);
  }
});
router4.post("/commercial-assignments", async (req, res) => {
  try {
    const comercial = String(req.body?.comercial || "").trim();
    if (!comercial) {
      return res.status(400).json({
        success: false,
        error: "comercial \xE9 obrigat\xF3rio",
        code: "VALIDATION"
      });
    }
    const data = await prisma.commercialAssignment.create({
      data: {
        id: String(req.body?.id || newId3("ca")),
        comercial,
        grupoEconomico: req.body?.grupoEconomico ? String(req.body.grupoEconomico) : null,
        nomeCliente: req.body?.nomeCliente ? String(req.body.nomeCliente) : null
      }
    });
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return prismaError(res, err);
  }
});
var sql_default = router4;

// src/server/app.ts
function createApp(options) {
  const app2 = express();
  app2.use(compression());
  app2.use(express.json({ limit: "100mb" }));
  if (options?.normalizeApiPrefix) {
    app2.use((req, _res, next) => {
      const raw = req.url || "/";
      const qIndex = raw.indexOf("?");
      const pathname = qIndex === -1 ? raw : raw.slice(0, qIndex);
      const search = qIndex === -1 ? "" : raw.slice(qIndex);
      if (pathname === "/api" || pathname.startsWith("/api/")) {
        next();
        return;
      }
      const suffix = pathname.startsWith("/") ? pathname : `/${pathname}`;
      req.url = `/api${suffix}${search}`;
      next();
    });
  }
  app2.use("/api", alocados_default);
  app2.use("/api", users_default);
  app2.use("/api", commercialAssignments_default);
  app2.use("/api/sql", sql_default);
  return app2;
}

// src/server/vercelEntry.ts
var app = createApp({ normalizeApiPrefix: true });
var vercelEntry_default = app;
export {
  vercelEntry_default as default
};
