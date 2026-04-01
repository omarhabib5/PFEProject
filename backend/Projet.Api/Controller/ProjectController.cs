using MediatR;
using Microsoft.AspNetCore.Mvc;
using Projet.Domain.Command;
using Projet.Domain.Command.Project;
using Projet.Domain.Model;
using Projet.Domain.Querie;
using Projet.Domain.Querie.User;
using Projet.Infrastructure.Service;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Projet.Api.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly INotificationService _notificationService;

        public ProjectController(IMediator mediator, INotificationService notificationService)
        {
            _mediator = mediator;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllProjectsQuery();
            var projects = await _mediator.Send(query);
            return Ok(projects);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var query = new GetProjectByIdQuery(id);
                var project = await _mediator.Send(query);
                return Ok(project);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Project with ID {id} not found." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProjectCommand command)
        {
            var projectId = await _mediator.Send(command);

            try
            {
                var users = await _mediator.Send(new GetAllUsersQuery());
                var serviceManagerId = users.FirstOrDefault(u => u.role == UserRole.ServiceManager)?.Id;
                var adminUserId = users.FirstOrDefault(u => u.role == UserRole.Admin)?.Id;
                var creatorClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                var createdByUserId = int.TryParse(creatorClaim, out var parsedCreatorId) ? parsedCreatorId : (int?)null;

                await _notificationService.NotifyProjectAddedAsync(
                    projectId: projectId,
                    projectManagerId: command.ProjectManagerId,
                    serviceManagerId: serviceManagerId,
                    adminUserId: adminUserId,
                    createdByUserId: createdByUserId);
            }
            catch
            {
                
            }

            return CreatedAtAction(nameof(GetById), new { id = projectId }, new { message="projet creer", id = projectId });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectCommand command)
        {
            try
            {
                command.id = id;
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Project with ID {id} not found." });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var command = new DeleteProjectCommand(id);
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Project with ID {id} not found." });
            }
        }
    }
}
