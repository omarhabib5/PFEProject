using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Domain.Enums
{
    public enum UserRole
    {
        ProdectOwner =1,
        ScrumMaster=2,
        Developer= 3,
        Tester= 4,
        Observer= 5
    }
    public static class UserRoleExtensions
    {
        public static string GetDisplayName(this UserRole role)
        {
            return role switch
            {
                UserRole.ProdectOwner => "Product Owner",
                UserRole.ScrumMaster => "Scrum Master",
                UserRole.Developer => "Developer",
                UserRole.Tester => "Tester",
                UserRole.Observer => "Observer",
                _ => "Unknown Role"
            };
        }
        public static bool CanModifyProject(this UserRole role)
        {
            return role == UserRole.ProdectOwner || role == UserRole.ScrumMaster;
        }
        public static bool CanManageTasks(this UserRole role)
        {
            return role == UserRole.ProdectOwner || role == UserRole.ScrumMaster || role == UserRole.Developer;
        }
        public static bool CanViewReports(this UserRole role)
        {
            return role != UserRole.Observer;
        }
        public static bool CanTestFeatures(this UserRole role)
        {
            return role == UserRole.Tester || role == UserRole.Developer;
        }
        public static bool CanObserveProject(this UserRole role)
        {
            return true; 
        }


    }

}
