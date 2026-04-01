using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projet.Api.Migrations
{
    
    public partial class AutoMigration_20260324 : Migration
    {
        
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[Tasks]', N'U') IS NULL
    THROW 50000, 'Table [Tasks] was not found.', 1;

IF COL_LENGTH('Tasks', 'Name') IS NOT NULL AND COL_LENGTH('Tasks', 'Title') IS NULL
    EXEC sp_rename N'[dbo].[Tasks].[Name]', N'Title', 'COLUMN';

IF COL_LENGTH('Tasks', 'EstimationDuration') IS NOT NULL AND COL_LENGTH('Tasks', 'EstimatedHours') IS NULL
    EXEC sp_rename N'[dbo].[Tasks].[EstimationDuration]', N'EstimatedHours', 'COLUMN';

IF COL_LENGTH('Tasks', 'taskState') IS NOT NULL AND COL_LENGTH('Tasks', 'Status') IS NULL
    EXEC sp_rename N'[dbo].[Tasks].[taskState]', N'Status', 'COLUMN';

IF COL_LENGTH('Tasks', 'ActualHours') IS NULL
    ALTER TABLE [Tasks] ADD [ActualHours] int NULL;

IF COL_LENGTH('Tasks', 'CreatedAt') IS NULL
    ALTER TABLE [Tasks] ADD [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_Tasks_CreatedAt] DEFAULT (GETUTCDATE());

IF COL_LENGTH('Tasks', 'UpdatedAt') IS NULL
    ALTER TABLE [Tasks] ADD [UpdatedAt] datetime2 NULL;
");
        }

        
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[Tasks]', N'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('Tasks', 'UpdatedAt') IS NOT NULL
        ALTER TABLE [Tasks] DROP COLUMN [UpdatedAt];

    IF COL_LENGTH('Tasks', 'CreatedAt') IS NOT NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF_Tasks_CreatedAt')
            ALTER TABLE [Tasks] DROP CONSTRAINT [DF_Tasks_CreatedAt];
        ALTER TABLE [Tasks] DROP COLUMN [CreatedAt];
    END

    IF COL_LENGTH('Tasks', 'ActualHours') IS NOT NULL
        ALTER TABLE [Tasks] DROP COLUMN [ActualHours];

    IF COL_LENGTH('Tasks', 'Title') IS NOT NULL AND COL_LENGTH('Tasks', 'Name') IS NULL
        EXEC sp_rename N'[dbo].[Tasks].[Title]', N'Name', 'COLUMN';

    IF COL_LENGTH('Tasks', 'EstimatedHours') IS NOT NULL AND COL_LENGTH('Tasks', 'EstimationDuration') IS NULL
        EXEC sp_rename N'[dbo].[Tasks].[EstimatedHours]', N'EstimationDuration', 'COLUMN';

    IF COL_LENGTH('Tasks', 'Status') IS NOT NULL AND COL_LENGTH('Tasks', 'taskState') IS NULL
        EXEC sp_rename N'[dbo].[Tasks].[Status]', N'taskState', 'COLUMN';
END
");
        }
    }
}
