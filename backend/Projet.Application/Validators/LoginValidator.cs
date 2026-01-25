using FluentValidation;
using Projet.Application.DTOs.Auth;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Projet.Application.Validators
{
    public class LoginValidator :AbstractValidator<LoginRequest>
    {
        public LoginValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("L'email est requis")
                .EmailAddress().WithMessage("Format d'email invalide")
                .MaximumLength(100).WithMessage("L'email ne peut pas dépasser 100 caractères");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Le mot de passe est requis")
                .MinimumLength(8).WithMessage("Le mot de passe doit contenir au moins 8 caractères");
        }
    }
    public class RegisterValidator : AbstractValidator<RegisterRequest>
    {
        public RegisterValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("Le prénom est requis")
                .MaximumLength(50).WithMessage("Le prénom ne peut pas dépasser 50 caractères");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Le nom est requis")
                .MaximumLength(50).WithMessage("Le nom ne peut pas dépasser 50 caractères");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("L'email est requis")
                .EmailAddress().WithMessage("Format d'email invalide")
                .MaximumLength(100).WithMessage("L'email ne peut pas dépasser 100 caractères");

            RuleFor(x => x.UserName)
                .NotEmpty().WithMessage("Le nom d'utilisateur est requis")
                .MinimumLength(3).WithMessage("Le nom d'utilisateur doit contenir au moins 3 caractères")
                .MaximumLength(30).WithMessage("Le nom d'utilisateur ne peut pas dépasser 30 caractères")
                .Matches(@"^[a-zA-Z0-9_]+$").WithMessage("Seuls les lettres, chiffres et underscores sont autorisés");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Le mot de passe est requis")
                .MinimumLength(8).WithMessage("Le mot de passe doit contenir au moins 8 caractères")
                .Matches(@"[A-Z]").WithMessage("Le mot de passe doit contenir au moins une majuscule")
                .Matches(@"[a-z]").WithMessage("Le mot de passe doit contenir au moins une minuscule")
                .Matches(@"[0-9]").WithMessage("Le mot de passe doit contenir au moins un chiffre")
                .Matches(@"[\W_]").WithMessage("Le mot de passe doit contenir au moins un caractère spécial");

            RuleFor(x => x.ConfirmPassword)
                .Equal(x => x.Password).WithMessage("Les mots de passe ne correspondent pas");

            RuleFor(x => x.Role)
                .IsInEnum().WithMessage("Rôle invalide");
        }
    }
}
