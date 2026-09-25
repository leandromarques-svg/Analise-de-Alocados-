ALTER TABLE [alocados].[employees] DROP COLUMN [raw_json];

ALTER TABLE [alocados].[employees] DROP COLUMN [synced_at];

ALTER TABLE [alocados].[employees] ADD [ano_admissao] INT NULL;

ALTER TABLE [alocados].[employees] ADD [ano_prorrogacao] INT NULL;

ALTER TABLE [alocados].[employees] ADD [ano_demissao] INT NULL;

ALTER TABLE [alocados].[employees] ADD CONSTRAINT [employees_is_ativo_df] DEFAULT 1 FOR [is_ativo];

ALTER TABLE [alocados].[commercial_assignments] ADD CONSTRAINT [commercial_assignments_id_df] DEFAULT CONVERT(NVARCHAR(64), NEWID()) FOR [id];
