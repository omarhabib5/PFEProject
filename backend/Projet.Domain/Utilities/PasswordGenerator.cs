using System.Security.Cryptography;
using System.Text;

namespace Projet.Domain.Utilities
{
    public static class PasswordGenerator
    {
        private const string LowercaseChars = "abcdefghijklmnopqrstuvwxyz";
        private const string UppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        private const string DigitChars = "0123456789";
        private const string SpecialChars = "!@#$%^&*";
        
        public static string GenerateSecurePassword(int length = 12)
        {
            if (length < 8)
                throw new ArgumentException("Password length must be at least 8 characters", nameof(length));

            var allChars = LowercaseChars + UppercaseChars + DigitChars + SpecialChars;
            var password = new StringBuilder(length);

            password.Append(GetRandomChar(LowercaseChars));
            password.Append(GetRandomChar(UppercaseChars));
            password.Append(GetRandomChar(DigitChars));
            password.Append(GetRandomChar(SpecialChars));

            for (int i = 4; i < length; i++)
            {
                password.Append(GetRandomChar(allChars));
            }

            return ShuffleString(password.ToString());
        }

        private static char GetRandomChar(string chars)
        {
            var randomIndex = RandomNumberGenerator.GetInt32(0, chars.Length);
            return chars[randomIndex];
        }

        private static string ShuffleString(string input)
        {
            var array = input.ToCharArray();
            var n = array.Length;
            
            for (int i = n - 1; i > 0; i--)
            {
                var j = RandomNumberGenerator.GetInt32(0, i + 1);
                (array[i], array[j]) = (array[j], array[i]);
            }
            
            return new string(array);
        }
    }
}
