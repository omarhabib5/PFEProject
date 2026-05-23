using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Projet.Application.Context;
using Projet.Domain.Command.TaskCRUD;
using Projet.Domain.Model;
using Projet.Domain.Querie.Task;
using Projet.Infrastructure.Service;

namespace Projet.Api.Controller
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TaskController : ControllerBase
    {
        private readonly IMediator _mediator;
        private readonly ApplicationDbContext _dbContext;
        private readonly INotificationService _notificationService;
        private readonly ILogger<TaskController> _logger;

        public TaskController(
            IMediator mediator,
            ApplicationDbContext dbContext,
            INotificationService notificationService,
            ILogger<TaskController> logger)
        {
            _mediator = mediator;
            _dbContext = dbContext;
            _notificationService = notificationService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var query = new GetAllTasksQuery();
            var tasks = await _mediator.Send(query);
            return Ok(tasks);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var query = new GetTaskById { Id = id };
                var task = await _mediator.Send(query);
                return Ok(task);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin,ProjectManager,ServiceManager")]
        public async Task<IActionResult> Create([FromBody] CreateTaskCommand command)
        {
            if (command.AssignedToId.HasValue
                && !User.IsInRole("Admin")
                && !User.IsInRole("ProjectManager"))
            {
                return Forbid();
            }

            var taskId = await _mediator.Send(command);
            await _notificationService.NotifyTaskAddedAsync(taskId);
            return CreatedAtAction(nameof(GetById), new { id = taskId }, new { id = taskId });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,ProjectManager,ServiceManager,Observer,Employee")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTaskCommand command)
        {
            if (id != command.Id)
            {
                return BadRequest(new { message = "ID in URL does not match ID in request body." });
            }

            var existingTask = await _dbContext.Tasks
                .Include(t => t.UserStory)
                    .ThenInclude(us => us.Project)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (existingTask == null)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }

            var oldStatus = existingTask.Status;
            var oldAssignedToId = existingTask.AssignedToId;

            var canManageAssignment = User.IsInRole("Admin") || User.IsInRole("ProjectManager");
            var canManageStatus = User.IsInRole("Admin") || User.IsInRole("ProjectManager");

            if (!canManageAssignment && oldAssignedToId != command.AssignedToId)
            {
                return Forbid();
            }

            if (!canManageStatus && User.IsInRole("ServiceManager") && oldStatus != command.Status)
            {
                return Forbid();
            }

            try
            {
                var shouldNotifyAssignmentChange = oldAssignedToId != command.AssignedToId && command.AssignedToId.HasValue;
                var projectManagerId = await _dbContext.UserStories
                    .Where(us => us.Id == command.UserStoryId)
                    .Select(us => (int?)us.Project.ProjectManagerId)
                    .FirstOrDefaultAsync() ?? 0;

                await _mediator.Send(command);

                var isStatusChanged = oldStatus != command.Status;
                var isNotValidatedStatus = command.Status != State.validated;
                var shouldNotifyStakeholders = isStatusChanged && isNotValidatedStatus;

                if (shouldNotifyAssignmentChange)
                {
                    await _notificationService.NotifyTaskAssignedAsync(
                        taskId: id,
                        projectManagerId: projectManagerId,
                        assignedToId: command.AssignedToId ?? 0);
                }

                if (shouldNotifyStakeholders)
                {
                    var assignedToId = command.AssignedToId ?? oldAssignedToId ?? 0;
                    await _notificationService.NotifyTaskStatusChangeAsync(
                        taskId: id,
                        projectManagerId: projectManagerId,
                        oldStatus: oldStatus.ToString(),
                        newStatus: command.Status.ToString(),
                        assignedToId: assignedToId);
                }

                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update task {TaskId}", id);
                return StatusCode(500, new { message = "An error occurred while updating task." });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,ServiceManager")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                var command = new DeleteTaskCommand { Id = id };
                await _mediator.Send(command);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = $"Task with ID {id} not found." });
            }
        }
    }
}
