using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projet.Api.Migrations
{
    /// <inheritdoc />
    public partial class addsprinttable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sprint_Projects_ProjectId",
                table: "Sprint");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Sprint_SprintId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStory_Sprint_SprintId",
                table: "UserStory");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Sprint",
                table: "Sprint");

            migrationBuilder.RenameTable(
                name: "Sprint",
                newName: "Sprints");

            migrationBuilder.RenameIndex(
                name: "IX_Sprint_ProjectId",
                table: "Sprints",
                newName: "IX_Sprints_ProjectId");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Sprints",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Sprints",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Sprints",
                table: "Sprints",
                column: "Id");

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
                name: "FK_UserStory_Sprints_SprintId",
                table: "UserStory",
                column: "SprintId",
                principalTable: "Sprints",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Sprints_Projects_ProjectId",
                table: "Sprints");

            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Sprints_SprintId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStory_Sprints_SprintId",
                table: "UserStory");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Sprints",
                table: "Sprints");

            migrationBuilder.RenameTable(
                name: "Sprints",
                newName: "Sprint");

            migrationBuilder.RenameIndex(
                name: "IX_Sprints_ProjectId",
                table: "Sprint",
                newName: "IX_Sprint_ProjectId");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "Sprint",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(200)",
                oldMaxLength: 200);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "Sprint",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(1000)",
                oldMaxLength: 1000);

            migrationBuilder.AddPrimaryKey(
                name: "PK_Sprint",
                table: "Sprint",
                column: "Id");

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
                name: "FK_UserStory_Sprint_SprintId",
                table: "UserStory",
                column: "SprintId",
                principalTable: "Sprint",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
