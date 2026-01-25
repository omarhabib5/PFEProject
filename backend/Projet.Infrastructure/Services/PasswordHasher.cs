using Microsoft.AspNetCore.Cryptography.KeyDerivation;
using Projet.Application.Interfaces;
using System.Security.Cryptography;

namespace Projet.Infrastructure.Services
{
    public class PasswordHasher : IPasswordHasher
    {
        private const int SaltSize = 128 / 8;
        private const int Iterations = 100_000;
        private const int KeySize = 256 / 8;

        public PasswordHash HashPassword(string password)
        {
            var salt = new byte[SaltSize];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(salt);

            var hash = KeyDerivation.Pbkdf2(
                password: password,
                salt: salt,
                prf: KeyDerivationPrf.HMACSHA256,
                iterationCount: Iterations,
                numBytesRequested: KeySize);

            return new PasswordHash
            {
                Hash = Convert.ToBase64String(hash),
                Salt = Convert.ToBase64String(salt)
            };
        }

        public bool VerifyPassword(string password, string storedHash, string storedSalt)
        {
            try
            {
                var salt = Convert.FromBase64String(storedSalt);
                var hashToVerify = KeyDerivation.Pbkdf2(
                    password: password,
                    salt: salt,
                    prf: KeyDerivationPrf.HMACSHA256,
                    iterationCount: Iterations,
                    numBytesRequested: KeySize);

                return CryptographicOperations.FixedTimeEquals(
                    Convert.FromBase64String(storedHash),
                    hashToVerify);
            }
            catch
            {
                return false;
            }
        }
    }
}