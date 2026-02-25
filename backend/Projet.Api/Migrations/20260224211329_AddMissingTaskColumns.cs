using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projet.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingTaskColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Services_Users_ResponsibleId",
                table: "Services");

            migrationBuilder.DropForeignKey(
                name: "FK_Sprint_Projects_ProjectId",
                table: "Sprint");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Sprint_SprintId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_UserStory_UserStoryId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Services_Serviceid",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStory_Projects_ProjectId",
                table: "UserStory");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStory_Sprint_SprintId",
                table: "UserStory");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserStory",
                table: "UserStory");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Sprint",
                table: "Sprint");

            migrationBuilder.DropColumn(
                name: "Role",
                table: "Projects");

            migrationBuilder.RenameTable(
                name: "UserStory",
                newName: "UserStories");

            migrationBuilder.RenameTable(
                name: "Sprint",
                newName: "Sprints");

            migrationBuilder.RenameColumn(
                name: "description",
                table: "Tasks",
                newName: "Description");

            migrationBuilder.RenameColumn(
                name: "complexity",
                table: "Tasks",
                newName: "Complexity");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "Tasks",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "taskState",
                table: "Tasks",
                newName: "Status");

            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Tasks",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "EstimationDuration",
                table: "Tasks",
                newName: "EstimatedHours");

            migrationBuilder.RenameColumn(
                name: "estimatedDuration",
                table: "UserStories",
                newName: "EstimatedDuration");

            migrationBuilder.RenameColumn(
                name: "description",
                table: "UserStories",
                newName: "Description");

            migrationBuilder.RenameColumn(
                name: "id",
                table: "UserStories",
                newName: "Id");

            migrationBuilder.RenameColumn(
                name: "name",
                table: "UserStories",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "UserStoryState",
                table: "UserStories",
                newName: "StoryPoints");

            migrationBuilder.RenameIndex(
                name: "IX_UserStory_SprintId",
                table: "UserStories",
                newName: "IX_UserStories_SprintId");

            migrationBuilder.RenameIndex(
                name: "IX_UserStory_ProjectId",
                table: "UserStories",
                newName: "IX_UserStories_ProjectId");

            migrationBuilder.RenameIndex(
                name: "IX_Sprint_ProjectId",
                table: "Sprints",
                newName: "IX_Sprints_ProjectId");

            migrationBuilder.AddColumn<int>(
                name: "ActualHours",
                table: "Tasks",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Tasks",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Tasks",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AcceptanceCriteria",
                table: "UserStories",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AssignedToId",
                table: "UserStories",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "UserStories",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<int>(
                name: "CreatedById",
                table: "UserStories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Priority",
                table: "UserStories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "UserStories",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "UserStories",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserStories",
                table: "UserStories",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Sprints",
                table: "Sprints",
                column: "Id");

            migrationBuilder.CreateIndex(
                name: "IX_UserStories_AssignedToId",
                table: "UserStories",
                column: "AssignedToId");

            migrationBuilder.CreateIndex(
                name: "IX_UserStories_CreatedById",
                table: "UserStories",
                column: "CreatedById");

            migrationBuilder.AddForeignKey(
                name: "FK_Services_Users_ResponsibleId",
                table: "Services",
                column: "ResponsibleId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Sprints_Projects_ProjectId",
                table: "Sprints",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Sprints_SprintId",
                table: "Tasks",
                column: "SprintId",
                principalTable: "Sprints",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_UserStories_UserStoryId",
                table: "Tasks",
                column: "UserStoryId",
                principalTable: "UserStories",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Services_Serviceid",
                table: "Users",
                column: "Serviceid",
                principalTable: "Services",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UserStories_Projects_ProjectId",
                table: "UserStories",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UserStories_Sprints_SprintId",
                table: "UserStories",
                column: "SprintId",
                principalTable: "Sprints",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UserStories_Users_AssignedToId",
                table: "UserStories",
                column: "AssignedToId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserStories_Users_CreatedById",
                table: "UserStories",
                column: "CreatedById",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Services_Users_ResponsibleId",
                table: "Services");

            migrationBuilder.DropForeignKey(
                name: "FK_Sprints_Projects_ProjectId",
                table: "Sprints");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Sprints_SprintId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_UserStories_UserStoryId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Services_Serviceid",
                table: "Users");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStories_Projects_ProjectId",
                table: "UserStories");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStories_Sprints_SprintId",
                table: "UserStories");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStories_Users_AssignedToId",
                table: "UserStories");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStories_Users_CreatedById",
                table: "UserStories");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserStories",
                table: "UserStories");

            migrationBuilder.DropIndex(
                name: "IX_UserStories_AssignedToId",
                table: "UserStories");

            migrationBuilder.DropIndex(
                name: "IX_UserStories_CreatedById",
                table: "UserStories");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Sprints",
                table: "Sprints");

            migrationBuilder.DropColumn(
                name: "ActualHours",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "AcceptanceCriteria",
                table: "UserStories");

            migrationBuilder.DropColumn(
                name: "AssignedToId",
                table: "UserStories");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "UserStories");

            migrationBuilder.DropColumn(
                name: "CreatedById",
                table: "UserStories");

            migrationBuilder.DropColumn(
                name: "Priority",
                table: "UserStories");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "UserStories");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "UserStories");

            migrationBuilder.RenameTable(
                name: "UserStories",
                newName: "UserStory");

            migrationBuilder.RenameTable(
                name: "Sprints",
                newName: "Sprint");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "Tasks",
                newName: "description");

            migrationBuilder.RenameColumn(
                name: "Complexity",
                table: "Tasks",
                newName: "complexity");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "Tasks",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "Tasks",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Tasks",
                newName: "taskState");

            migrationBuilder.RenameColumn(
                name: "EstimatedHours",
                table: "Tasks",
                newName: "EstimationDuration");

            migrationBuilder.RenameColumn(
                name: "EstimatedDuration",
                table: "UserStory",
                newName: "estimatedDuration");

            migrationBuilder.RenameColumn(
                name: "Description",
                table: "UserStory",
                newName: "description");

            migrationBuilder.RenameColumn(
                name: "Id",
                table: "UserStory",
                newName: "id");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "UserStory",
                newName: "name");

            migrationBuilder.RenameColumn(
                name: "StoryPoints",
                table: "UserStory",
                newName: "UserStoryState");

            migrationBuilder.RenameIndex(
                name: "IX_UserStories_SprintId",
                table: "UserStory",
                newName: "IX_UserStory_SprintId");

            migrationBuilder.RenameIndex(
                name: "IX_UserStories_ProjectId",
                table: "UserStory",
                newName: "IX_UserStory_ProjectId");

            migrationBuilder.RenameIndex(
                name: "IX_Sprints_ProjectId",
                table: "Sprint",
                newName: "IX_Sprint_ProjectId");

            migrationBuilder.AddColumn<int>(
                name: "Role",
                table: "Projects",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserStory",
                table: "UserStory",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Sprint",
                table: "Sprint",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Services_Users_ResponsibleId",
                table: "Services",
                column: "ResponsibleId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Sprint_Projects_ProjectId",
                table: "Sprint",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Sprint_SprintId",
                table: "Tasks",
                column: "SprintId",
                principalTable: "Sprint",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_UserStory_UserStoryId",
                table: "Tasks",
                column: "UserStoryId",
                principalTable: "UserStory",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Services_Serviceid",
                table: "Users",
                column: "Serviceid",
                principalTable: "Services",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserStory_Projects_ProjectId",
                table: "UserStory",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UserStory_Sprint_SprintId",
                table: "UserStory",
                column: "SprintId",
                principalTable: "Sprint",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
