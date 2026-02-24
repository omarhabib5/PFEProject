using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projet.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserStoriesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_UserStory_UserStoryId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStory_Projects_ProjectId",
                table: "UserStory");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStory_Sprints_SprintId",
                table: "UserStory");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserStory",
                table: "UserStory");

            migrationBuilder.RenameTable(
                name: "UserStory",
                newName: "UserStories");

            migrationBuilder.RenameIndex(
                name: "IX_UserStory_SprintId",
                table: "UserStories",
                newName: "IX_UserStories_SprintId");

            migrationBuilder.RenameIndex(
                name: "IX_UserStory_ProjectId",
                table: "UserStories",
                newName: "IX_UserStories_ProjectId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserStories",
                table: "UserStories",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_UserStories_UserStoryId",
                table: "Tasks",
                column: "UserStoryId",
                principalTable: "UserStories",
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
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_UserStories_UserStoryId",
                table: "Tasks");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStories_Projects_ProjectId",
                table: "UserStories");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStories_Sprints_SprintId",
                table: "UserStories");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserStories",
                table: "UserStories");

            migrationBuilder.RenameTable(
                name: "UserStories",
                newName: "UserStory");

            migrationBuilder.RenameIndex(
                name: "IX_UserStories_SprintId",
                table: "UserStory",
                newName: "IX_UserStory_SprintId");

            migrationBuilder.RenameIndex(
                name: "IX_UserStories_ProjectId",
                table: "UserStory",
                newName: "IX_UserStory_ProjectId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserStory",
                table: "UserStory",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_UserStory_UserStoryId",
                table: "Tasks",
                column: "UserStoryId",
                principalTable: "UserStory",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UserStory_Projects_ProjectId",
                table: "UserStory",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_UserStory_Sprints_SprintId",
                table: "UserStory",
                column: "SprintId",
                principalTable: "Sprints",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
