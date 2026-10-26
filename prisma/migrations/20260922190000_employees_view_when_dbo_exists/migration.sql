-- Dev: dbo.TB_* does not exist, so alocados.employees stays a table.
-- Production: those tables exist, so the table is replaced by a view of the same name.
IF OBJECT_ID(N'dbo.TB_Funcionario', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TB_Funcao', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TB_CentroCusto', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TB_Cliente', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TB_GrupoEconomico', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TB_Depto', N'U') IS NOT NULL
BEGIN
    IF OBJECT_ID(N'alocados.employees_src', N'V') IS NOT NULL
        DROP VIEW [alocados].[employees_src];

    EXEC(N'
        CREATE VIEW [alocados].[employees_src] AS
        SELECT
            CAST(F.CodigoFuncionario AS int) AS [id],
            CAST(F.Nome AS nvarchar(255)) AS [nome],
            CAST(F.Vinculo AS nvarchar(120)) AS [vinculo],
            CAST(F.TelefoneResid AS nvarchar(64)) AS [telefone],
            CAST(F.DataAdmissao AS datetime2) AS [data_admissao],
            YEAR(F.DataAdmissao) AS [ano_admissao],
            CAST(F.DtVectoContrato AS datetime2) AS [data_vcto_contrato],
            CAST(F.MotivoProrrogacao AS nvarchar(255)) AS [motivo_prorrogacao],
            CAST(F.DtVectoProrrogacao AS datetime2) AS [data_vcto_prorrogacao],
            YEAR(F.DtVectoProrrogacao) AS [ano_prorrogacao],
            CAST(F.DataDemissao AS datetime2) AS [data_demissao],
            YEAR(F.DataDemissao) AS [ano_demissao],
            CAST(CASE WHEN F.DataDemissao IS NULL THEN 1 ELSE 0 END AS bit) AS [is_ativo],
            CAST(F.Salario AS decimal(18, 2)) AS [salario],
            CAST(Funcao.Descricao AS nvarchar(255)) AS [cargo],
            Centro.NomeCentroCusto AS [depto],
            F.CodigoEmpresa AS [empresa],
            CAST(
                CASE
                    WHEN Cliente.Cidade IS NULL OR LTRIM(RTRIM(Cliente.Cidade)) = '''' THEN NULL
                    ELSE CONCAT(Cliente.Cidade, '' - '', Cliente.UF)
                END AS nvarchar(120)
            ) AS [regiao],
            CAST(Cliente.Cidade AS nvarchar(120)) AS [cidade],
            CAST(Cliente.UF AS nvarchar(8)) AS [uf],
            CAST(MD.Descricao AS nvarchar(255)) AS [motivo_desligamento],
            CAST(F.CampoLivre_01 AS nvarchar(255)) AS [email_corporativo],
            CAST(NULL AS nvarchar(64)) AS [celular],
            CAST(F.CodigoCliente AS int) AS [cod_cliente],
            CAST(Cliente.RazaoSocial AS nvarchar(255)) AS [nome_cliente],
            CAST(Cliente.CGC AS nvarchar(32)) AS [cnpj_cliente],
            CAST(Depto.Descricao AS nvarchar(255)) AS [departamento],
            CAST(Depto.Obs AS nvarchar(255)) AS [departamento_email],
            CAST(F.CampoLivre_02 AS nvarchar(255)) AS [rh_focal],
            CAST(
                CASE
                    WHEN Cliente.CodigoGrupoEconomico IS NULL AND Grupo.Descricao IS NULL THEN NULL
                    ELSE CONCAT(CAST(Cliente.CodigoGrupoEconomico AS varchar(50)), '' - '', Grupo.Descricao)
                END AS nvarchar(255)
            ) AS [grupo_economico],
            CAST(COALESCE(F.DataAdmissao, SYSUTCDATETIME()) AS datetime2) AS [created_at],
            CAST(COALESCE(F.Dataalteracao, SYSUTCDATETIME()) AS datetime2) AS [updated_at]
        FROM [dbo].[TB_Funcionario] AS F
        LEFT JOIN [dbo].[TB_Funcao] AS Funcao
            ON Funcao.CodigoFuncao = F.CodigoFuncao
        LEFT JOIN [dbo].[TB_CentroCusto] AS Centro
            ON Centro.CodigoCentroCusto = F.CodigoCentroCusto
        AND Centro.CodigoCliente = F.CodigoCliente
        LEFT JOIN [dbo].[TB_Cliente] AS Cliente
            ON Cliente.CodigoCliente = F.CodigoCliente
        LEFT JOIN [dbo].[TB_GrupoEconomico] AS Grupo
            ON Grupo.CodigoGrupoEconomico = Cliente.CodigoGrupoEconomico
        LEFT JOIN [dbo].[TB_Depto] AS Depto
            ON Depto.CodigoDepto = F.CodigoDepto
        AND Depto.CodigoCliente = F.CodigoCliente
        LEFT JOIN [dbo].[DIM_MotivoDesligamento] AS MD
            ON MD.TipoDemissao = F.TipoDemissao
        LEFT JOIN [dbo].[DIM_Vinculo] AS V
            ON V.Vinculo = F.Vinculo;
');

    IF OBJECT_ID(N'alocados.employees_src', N'V') IS NULL
        THROW 50001, 'View alocados.employees_src was not created.', 1;

    IF OBJECT_ID(N'alocados.employees', N'U') IS NOT NULL
        DROP TABLE [alocados].[employees];

    IF OBJECT_ID(N'alocados.employees', N'V') IS NOT NULL
        DROP VIEW [alocados].[employees];

    EXEC sp_rename N'alocados.employees_src', N'employees';
END




