using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Projet.Application.Interfaces;

namespace Projet.Infrastructure.Services
{
    public class SmtpEmailSender : IEmailSender
    {
        private readonly EmailSettings _settings;
        private readonly ILogger<SmtpEmailSender> _logger;

        public SmtpEmailSender(IOptions<EmailSettings> settings, ILogger<SmtpEmailSender> logger)
        {
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task SendAsync(string toEmail, string subject, string htmlBody)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                throw new ArgumentException("Recipient email is required", nameof(toEmail));
            }

            var fromAddress = new MailAddress(_settings.FromEmail, _settings.FromName);
            var toAddress = new MailAddress(toEmail);

            using var message = new MailMessage(fromAddress, toAddress)
            {
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };

            using var client = new SmtpClient(_settings.SmtpHost, _settings.SmtpPort)
            {
                EnableSsl = _settings.EnableSsl,
                Credentials = new NetworkCredential(_settings.UserName, _settings.Password)
            };

            try
            {
                await client.SendMailAsync(message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email sending failed to {Email}", toEmail);
                throw;
            }
        }
    }
}
