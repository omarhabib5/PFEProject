using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Common
{
    public abstract class BaseEntity
    {
        public Guid Id { get; protected set; }
        public DateTime CreatAt { get; protected set; }
        public DateTime? UpdatedAt { get; protected set; }
        public bool IsActive { get; set; } = true;

        private readonly List<BaseEntity> _domainEvents = new();
        public IReadOnlyCollection<BaseEntity> DomainEvents => _domainEvents.AsReadOnly();
        public void AddDomainEvent(BaseEntity eventItem)
        {
            _domainEvents.Add(eventItem);
        }
        public void RemoveDomainEvent(BaseEntity eventItem)
        {
            _domainEvents.Remove(eventItem);
        }
        public void ClearDomainEvents()
        {
            _domainEvents.Clear();
        }
        public abstract class BaseEnt
        {
            public DateTime OccuredOn { get; protected set; } = DateTime.UtcNow;

        }

    }
}
