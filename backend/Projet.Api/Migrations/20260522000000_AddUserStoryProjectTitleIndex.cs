using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projet.Api.Migrations
{
    public partial class AddUserStoryProjectTitleIndex : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_UserStories_ProjectId_Title",
                table: "UserStories",
                columns: new[] { "ProjectId", "Title" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_UserStories_ProjectId_Title",
                table: "UserStories");
        }
    }
}