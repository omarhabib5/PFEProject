# Gmail Email Setup Guide for Employee Creation Feature

## 📧 How to Configure Gmail for Sending Emails

### Step 1: Enable 2-Step Verification (if not already enabled)
1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left menu
3. Under "Signing in to Google", click **2-Step Verification**
4. Follow the steps to enable it

### Step 2: Generate an App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or Other)
3. Click **Generate**
4. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

### Step 3: Update appsettings.json

Replace the email settings in `Projet.Api\appsettings.json`:

```json
"EmailSettings": {
  "SmtpHost": "smtp.gmail.com",
  "SmtpPort": 587,
  "FromEmail": "your-email@gmail.com",
  "FromName": "Company HR Department",
  "Username": "your-email@gmail.com",
  "Password": "abcd efgh ijkl mnop"
}
```

⚠️ **Important**: 
- Use the **App Password** (16 characters from Step 2), NOT your regular Gmail password
- Remove spaces when pasting: `abcdefghijklmnop`

### Step 4: For Production - Use User Secrets or Environment Variables

**Never commit real credentials to source control!**

For development, you can use User Secrets:

```bash
cd Projet.Api
dotnet user-secrets init
dotnet user-secrets set "EmailSettings:FromEmail" "your-email@gmail.com"
dotnet user-secrets set "EmailSettings:Username" "your-email@gmail.com"
dotnet user-secrets set "EmailSettings:Password" "your-app-password"
```

## 🧪 Testing the Feature

### 1. Stop and Restart your API

### 2. Register as Admin (if not already)
```json
POST /api/auth/register
{
  "email": "admin@company.com",
  "password": "Admin123!",
  "firstName": "Admin",
  "lastName": "User",
  "role": "Admin"
}
```

### 3. Login as Admin
```json
POST /api/auth/login
{
  "email": "admin@company.com",
  "password": "Admin123!"
}
```

### 4. Authorize in Swagger
Click "Authorize" and enter: `Bearer {your-access-token}`

### 5. Create Employee
```json
POST /api/auth/create-employee
{
  "email": "employee@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "serviceId": null
}
```

### 6. Check the Employee's Email
They will receive an email with:
- Welcome message
- Login credentials (email + auto-generated password)
- Instructions to change password after first login

## 🔐 Security Features

✅ **Auto-generated passwords**:
- 12 characters long
- Contains uppercase, lowercase, digits, and special characters
- Cryptographically secure using `RandomNumberGenerator`

✅ **Password requirements**:
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 digit
- At least 1 special character (!@#$%^&*)

## 📧 Email Template

The employee will receive a professional HTML email with:
- Company branding
- Clear credentials display
- Security warning to change password
- Contact information

## ⚠️ Troubleshooting

### "Email configuration is not properly set up"
- Check that all EmailSettings are configured in appsettings.json
- Verify FromEmail, Username, and Password are not empty

### "SMTP authentication failed"
- Make sure you're using an **App Password**, not your regular Gmail password
- Verify 2-Step Verification is enabled on your Google account

### "The SMTP server requires a secure connection"
- Ensure SmtpPort is set to 587
- EnableSsl is set to true in the code

### Email not received
- Check spam/junk folder
- Verify the recipient email address is correct
- Check Gmail's "Sent" folder to confirm it was sent

## 🌐 Using Other Email Providers

### Outlook/Office 365
```json
"EmailSettings": {
  "SmtpHost": "smtp.office365.com",
  "SmtpPort": 587,
  "FromEmail": "your-email@outlook.com",
  "Username": "your-email@outlook.com",
  "Password": "your-password"
}
```

### SendGrid
```json
"EmailSettings": {
  "SmtpHost": "smtp.sendgrid.net",
  "SmtpPort": 587,
  "FromEmail": "your-email@company.com",
  "Username": "apikey",
  "Password": "your-sendgrid-api-key"
}
```

## 🚀 Next Steps

1. Configure your Gmail credentials
2. Restart the API
3. Test creating an employee
4. Check the employee's email inbox
5. Employee can login with the credentials sent via email
