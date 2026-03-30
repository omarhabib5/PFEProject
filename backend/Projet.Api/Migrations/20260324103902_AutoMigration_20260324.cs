using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Projet.Api.Migrations
{
    /// <inheritdoc />
    public partial class AutoMigration_20260324 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Tasks",
                newName: "Title");

            migrationBuilder.RenameColumn(
                name: "EstimationDuration",
                table: "Tasks",
                newName: "EstimatedHours");

            migrationBuilder.RenameColumn(
                name: "taskState",
                table: "Tasks",
                newName: "Status");

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
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Tasks",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ActualHours",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Tasks");

            migrationBuilder.RenameColumn(
                name: "Title",
                table: "Tasks",
                newName: "Name");

            migrationBuilder.RenameColumn(
                name: "EstimatedHours",
                table: "Tasks",
                newName: "EstimationDuration");

            migrationBuilder.RenameColumn(
                name: "Status",
                table: "Tasks",
                newName: "taskState");
        }
    }
}
