IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'alocados')
BEGIN
    EXEC('CREATE SCHEMA [alocados]');
END;

CREATE TABLE [alocados].[users] (
    [id] NVARCHAR(64) NOT NULL,
    [username] NVARCHAR(120) NOT NULL,
    [password] NVARCHAR(255) NULL,
    [role] NVARCHAR(64) NOT NULL,
    [grupo_economico] NVARCHAR(255) NULL,
    [grupos_economicos_json] NVARCHAR(max) NULL,
    [clientes_atribuidos_json] NVARCHAR(max) NULL,
    [cnpjs_atribuidos_json] NVARCHAR(max) NULL,
    [email] NVARCHAR(255) NULL,
    [phone] NVARCHAR(64) NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_username_key] UNIQUE NONCLUSTERED ([username])
);

CREATE TABLE [alocados].[user_logs] (
    [id] NVARCHAR(64) NOT NULL,
    [user_id] NVARCHAR(64) NOT NULL,
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [user_logs_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    [author] NVARCHAR(120) NOT NULL,
    [action] NVARCHAR(120) NOT NULL,
    [details] NVARCHAR(max) NULL,
    CONSTRAINT [user_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [alocados].[commercial_assignments] (
    [id] NVARCHAR(64) NOT NULL,
    [grupo_economico] NVARCHAR(255) NULL,
    [nome_cliente] NVARCHAR(255) NULL,
    [comercial] NVARCHAR(120) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [commercial_assignments_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NULL,
    CONSTRAINT [commercial_assignments_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [alocados].[employees] (
    [id] INT NOT NULL,
    [nome] NVARCHAR(255) NOT NULL,
    [vinculo] NVARCHAR(120) NULL,
    [telefone] NVARCHAR(64) NULL,
    [data_admissao] DATETIME2 NULL,
    [data_vcto_contrato] DATETIME2 NULL,
    [data_vcto_prorrogacao] DATETIME2 NULL,
    [data_demissao] DATETIME2 NULL,
    [is_ativo] BIT NOT NULL,
    [salario] DECIMAL(18,2) NULL,
    [cargo] NVARCHAR(255) NULL,
    [depto] NVARCHAR(255) NULL,
    [empresa] NVARCHAR(255) NULL,
    [regiao] NVARCHAR(120) NULL,
    [cidade] NVARCHAR(120) NULL,
    [uf] NVARCHAR(8) NULL,
    [motivo_desligamento] NVARCHAR(255) NULL,
    [email_corporativo] NVARCHAR(255) NULL,
    [celular] NVARCHAR(64) NULL,
    [cod_cliente] INT NULL,
    [nome_cliente] NVARCHAR(255) NULL,
    [cnpj_cliente] NVARCHAR(32) NULL,
    [departamento] NVARCHAR(255) NULL,
    [rh_focal] NVARCHAR(255) NULL,
    [grupo_economico] NVARCHAR(255) NULL,
    [raw_json] NVARCHAR(max) NULL,
    [synced_at] DATETIME2 NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [employees_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NULL,
    CONSTRAINT [employees_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE NONCLUSTERED INDEX [user_logs_user_id_idx] ON [alocados].[user_logs]([user_id]);

CREATE NONCLUSTERED INDEX [commercial_assignments_comercial_idx] ON [alocados].[commercial_assignments]([comercial]);

CREATE NONCLUSTERED INDEX [employees_grupo_economico_idx] ON [alocados].[employees]([grupo_economico]);

CREATE NONCLUSTERED INDEX [employees_cnpj_cliente_idx] ON [alocados].[employees]([cnpj_cliente]);

CREATE NONCLUSTERED INDEX [employees_is_ativo_idx] ON [alocados].[employees]([is_ativo]);

ALTER TABLE [alocados].[user_logs] ADD CONSTRAINT [user_logs_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [alocados].[users]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;
