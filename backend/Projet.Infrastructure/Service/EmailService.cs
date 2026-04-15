using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Projet.Domain.Interface;

namespace Projet.Infrastructure.Service
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;
        private readonly string _smtpHost;
        private readonly int _smtpPort;
        private readonly string _fromEmail;
        private readonly string _fromName;
        private readonly string _username;
        private readonly string _password;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
            _smtpHost = configuration["EmailSettings:SmtpHost"] ?? "smtp.gmail.com";
            _smtpPort = int.Parse(configuration["EmailSettings:SmtpPort"] ?? "587");
            _fromEmail = configuration["EmailSettings:FromEmail"] ?? "";
            _fromName = configuration["EmailSettings:FromName"] ?? "Company HR";
            _username = configuration["EmailSettings:Username"] ?? "";
            _password = configuration["EmailSettings:Password"] ?? "";
        }

        public async System.Threading.Tasks.Task SendEmployeeCredentialsAsync(
            string toEmail, 
            string employeeName, 
            string email, 
            string password, 
            CancellationToken cancellationToken = default)
        {
            var subject = "Welcome to the Company - Your Account Credentials";
            
            var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; background-color: #f9f9f9; }}
        .credentials {{ background-color: #fff; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }}
        .footer {{ text-align: center; padding: 20px; color: #666; font-size: 12px; }}
        .warning {{ color: #d32f2f; font-weight: bold; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Welcome to Our Company!</h1>
        </div>
        <div class='content'>
            <p>Dear {employeeName},</p>
            
            <p>Welcome to the team! Your employee account has been created successfully.</p>
            
            <div class='credentials'>
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Temporary Password:</strong> {password}</p>
            </div>
            
            <p class='warning'>⚠️ IMPORTANT: Please change your password after your first login for security purposes.</p>
            
              
            <p>If you have any questions or need assistance, please contact IT support.</p>
            
            <p>Best regards,<br>HR Department</p>
        </div>
        <div class='footer'>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>";

            await SendEmailAsync(toEmail, subject, body, cancellationToken);
        }

        public async System.Threading.Tasks.Task SendEmailAsync(
            string toEmail, 
            string subject, 
            string body, 
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrEmpty(_fromEmail) || string.IsNullOrEmpty(_username) || string.IsNullOrEmpty(_password))
            {
                throw new InvalidOperationException("Email configuration is not properly set up. Please configure EmailSettings in appsettings.json");
            }

            var mailMessage = new MailMessage
            {
                From = new MailAddress(_fromEmail, _fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = true
            };
            
            mailMessage.To.Add(toEmail);

            using var smtpClient = new SmtpClient(_smtpHost, _smtpPort)
            {
                Credentials = new NetworkCredential(_username, _password),
                EnableSsl = true
            };

            await smtpClient.SendMailAsync(mailMessage, cancellationToken);
        }
    }
}
