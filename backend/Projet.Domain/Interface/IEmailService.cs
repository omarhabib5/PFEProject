namespace Projet.Domain.Interface
{
    public interface IEmailService
    {
        System.Threading.Tasks.Task SendEmployeeCredentialsAsync(
            string toEmail, 
            string employeeName, 
            string email, 
            string password, 
            CancellationToken cancellationToken = default);
        
        System.Threading.Tasks.Task SendEmailAsync(
            string toEmail, 
            string subject, 
            string body, 
            CancellationToken cancellationToken = default);
    }
}
