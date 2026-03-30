using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace Projet.Api.Migrations
{
    [DbContext(typeof(Projet.Application.Context.ApplicationDbContext))]
    [Migration("20260325123000_SyncUserStoriesSchema")]
    public partial class SyncUserStoriesSchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[UserStory]', N'U') IS NOT NULL AND OBJECT_ID(N'[UserStories]', N'U') IS NULL
    EXEC sp_rename N'[UserStory]', N'UserStories';
");

            migrationBuilder.Sql(@"
IF OBJECT_ID(N'[UserStories]', N'U') IS NULL
    THROW 50000, 'Table [UserStories] was not found.', 1;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'Id') IS NULL AND COL_LENGTH('UserStories', 'id') IS NOT NULL
    EXEC sp_rename N'[UserStories].[id]', N'Id', 'COLUMN';
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'Title') IS NULL AND COL_LENGTH('UserStories', 'name') IS NOT NULL
    EXEC sp_rename N'[UserStories].[name]', N'Title', 'COLUMN';
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'Description') IS NULL AND COL_LENGTH('UserStories', 'description') IS NOT NULL
    EXEC sp_rename N'[UserStories].[description]', N'Description', 'COLUMN';
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'EstimatedDuration') IS NULL AND COL_LENGTH('UserStories', 'estimatedDuration') IS NOT NULL
    EXEC sp_rename N'[UserStories].[estimatedDuration]', N'EstimatedDuration', 'COLUMN';
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'Status') IS NULL AND COL_LENGTH('UserStories', 'UserStoryState') IS NOT NULL
    EXEC sp_rename N'[UserStories].[UserStoryState]', N'Status', 'COLUMN';
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'AcceptanceCriteria') IS NULL
    ALTER TABLE [UserStories] ADD [AcceptanceCriteria] nvarchar(max) NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'StoryPoints') IS NULL
    ALTER TABLE [UserStories] ADD [StoryPoints] int NOT NULL CONSTRAINT [DF_UserStories_StoryPoints] DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'Priority') IS NULL
    ALTER TABLE [UserStories] ADD [Priority] int NOT NULL CONSTRAINT [DF_UserStories_Priority] DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'Status') IS NULL
    ALTER TABLE [UserStories] ADD [Status] int NOT NULL CONSTRAINT [DF_UserStories_Status] DEFAULT (0);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'CreatedAt') IS NULL
    ALTER TABLE [UserStories] ADD [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_UserStories_CreatedAt] DEFAULT (GETUTCDATE());
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'UpdatedAt') IS NULL
    ALTER TABLE [UserStories] ADD [UpdatedAt] datetime2 NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'AssignedToId') IS NULL
    ALTER TABLE [UserStories] ADD [AssignedToId] int NULL;
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'CreatedById') IS NULL
BEGIN
    ALTER TABLE [UserStories] ADD [CreatedById] int NULL;
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'CreatedById') IS NOT NULL
BEGIN
    DECLARE @DefaultUserId int = (SELECT TOP(1) [Id] FROM [Users] ORDER BY [Id]);

    IF @DefaultUserId IS NOT NULL
    BEGIN
        DECLARE @sql nvarchar(max) = N'UPDATE [UserStories] SET [CreatedById] = ' + CAST(@DefaultUserId AS nvarchar(20)) + N' WHERE [CreatedById] IS NULL';
        EXEC(@sql);
    END
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'CreatedById') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM [UserStories] WHERE [CreatedById] IS NULL)
BEGIN
    ALTER TABLE [UserStories] ALTER COLUMN [CreatedById] int NOT NULL;
END
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'AssignedToId') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserStories_AssignedToId' AND object_id = OBJECT_ID('UserStories'))
    CREATE INDEX [IX_UserStories_AssignedToId] ON [UserStories]([AssignedToId]);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'CreatedById') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserStories_CreatedById' AND object_id = OBJECT_ID('UserStories'))
    CREATE INDEX [IX_UserStories_CreatedById] ON [UserStories]([CreatedById]);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'AssignedToId') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserStories_Users_AssignedToId')
AND NOT EXISTS (
    SELECT 1
    FROM [UserStories] us
    WHERE us.[AssignedToId] IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM [Users] u WHERE u.[Id] = us.[AssignedToId])
)
    ALTER TABLE [UserStories]
    ADD CONSTRAINT [FK_UserStories_Users_AssignedToId]
    FOREIGN KEY ([AssignedToId]) REFERENCES [Users]([Id]);
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'CreatedById') IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserStories_Users_CreatedById')
AND NOT EXISTS (
    SELECT 1
    FROM [UserStories] us
    WHERE NOT EXISTS (SELECT 1 FROM [Users] u WHERE u.[Id] = us.[CreatedById])
)
    ALTER TABLE [UserStories]
    ADD CONSTRAINT [FK_UserStories_Users_CreatedById]
    FOREIGN KEY ([CreatedById]) REFERENCES [Users]([Id]) ON DELETE CASCADE;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserStories_Users_AssignedToId')
    ALTER TABLE [UserStories] DROP CONSTRAINT [FK_UserStories_Users_AssignedToId];
");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_UserStories_Users_CreatedById')
    ALTER TABLE [UserStories] DROP CONSTRAINT [FK_UserStories_Users_CreatedById];
");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserStories_AssignedToId' AND object_id = OBJECT_ID('UserStories'))
    DROP INDEX [IX_UserStories_AssignedToId] ON [UserStories];
");

            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_UserStories_CreatedById' AND object_id = OBJECT_ID('UserStories'))
    DROP INDEX [IX_UserStories_CreatedById] ON [UserStories];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'AcceptanceCriteria') IS NOT NULL
    ALTER TABLE [UserStories] DROP COLUMN [AcceptanceCriteria];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'AssignedToId') IS NOT NULL
    ALTER TABLE [UserStories] DROP COLUMN [AssignedToId];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'CreatedAt') IS NOT NULL
    ALTER TABLE [UserStories] DROP COLUMN [CreatedAt];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'CreatedById') IS NOT NULL
    ALTER TABLE [UserStories] DROP COLUMN [CreatedById];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'Priority') IS NOT NULL
    ALTER TABLE [UserStories] DROP COLUMN [Priority];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'Status') IS NOT NULL
    ALTER TABLE [UserStories] DROP COLUMN [Status];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'StoryPoints') IS NOT NULL
    ALTER TABLE [UserStories] DROP COLUMN [StoryPoints];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'Title') IS NOT NULL
    ALTER TABLE [UserStories] DROP COLUMN [Title];
");

            migrationBuilder.Sql(@"
IF COL_LENGTH('UserStories', 'UpdatedAt') IS NOT NULL
    ALTER TABLE [UserStories] DROP COLUMN [UpdatedAt];
");
        }
    }
}
