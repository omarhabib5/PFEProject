using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projet.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddUserServiceRelationships : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Services_Users_ResponsibleId",
                table: "Services");

            migrationBuilder.DropForeignKey(
                name: "FK_Teams_Services_ServiceId",
                table: "Teams");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Services_Serviceid",
                table: "Users");

            migrationBuilder.AddForeignKey(
                name: "FK_Services_Users_ResponsibleId",
                table: "Services",
                column: "ResponsibleId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Teams_Services_ServiceId",
                table: "Teams",
                column: "ServiceId",
                principalTable: "Services",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Services_Serviceid",
                table: "Users",
                column: "Serviceid",
                principalTable: "Services",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Services_Users_ResponsibleId",
                table: "Services");

            migrationBuilder.DropForeignKey(
                name: "FK_Teams_Services_ServiceId",
                table: "Teams");

            migrationBuilder.DropForeignKey(
                name: "FK_Users_Services_Serviceid",
                table: "Users");

            migrationBuilder.AddForeignKey(
                name: "FK_Services_Users_ResponsibleId",
                table: "Services",
                column: "ResponsibleId",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Teams_Services_ServiceId",
                table: "Teams",
                column: "ServiceId",
                principalTable: "Services",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Services_Serviceid",
                table: "Users",
                column: "Serviceid",
                principalTable: "Services",
                principalColumn: "id");
        }
    }
}
