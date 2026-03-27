using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Projet.Application.DTOs.NotificationDto
{
    public class NotificationDto
    {
            public int Id { get; set; }
            public string Message { get; set; } = string.Empty;
            public bool IsRead { get; set; }
            public DateTime CreatedAt { get; set; }
            public int UserId { get; set; }
    }
}