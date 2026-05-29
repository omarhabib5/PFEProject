-- Created by GitHub Copilot in SSMS - review carefully before executing

/* 1) Lister les utilisateurs pour choisir les IDs */
SELECT TOP (100)
    u.Id,
    u.FirstName,
    u.LastName,
    u.Email,
    u.role
FROM dbo.Users u
ORDER BY u.Id;

/* 2) Paramètres de test (remplace avec tes vrais IDs) */
DECLARE @SenderId INT = 2;       -- ex: chef projet
DECLARE @RecipientId INT = 9;    -- ex: employé

/* 3) Voir toute la conversation entre ces 2 users */
SELECT
    n.Id,
    n.UserId        AS RecipientUserId,
    n.RelatedUserId AS SenderUserId,
    n.Title,
    n.Message,
    n.OldValue      AS AttachmentName,
    CASE 
        WHEN n.NewValue IS NOT NULL AND LTRIM(RTRIM(n.NewValue)) <> '' THEN 1
        ELSE 0
    END AS HasAttachment,
    LEN(n.NewValue) AS AttachmentLength,
    n.CreatedAt,
    n.IsRead
FROM dbo.Notification n
WHERE (n.UserId = @RecipientId AND n.RelatedUserId = @SenderId)
   OR (n.UserId = @SenderId AND n.RelatedUserId = @RecipientId)
ORDER BY n.CreatedAt ASC;

/* 4) Voir uniquement les messages avec pièce jointe dans cette conversation */
SELECT
    n.Id,
    n.UserId        AS RecipientUserId,
    n.RelatedUserId AS SenderUserId,
    n.Title,
    n.Message,
    n.OldValue      AS AttachmentName,
    LEFT(n.NewValue, 120) AS AttachmentPrefix,
    LEN(n.NewValue) AS AttachmentLength,
    n.CreatedAt
FROM dbo.Notification n
WHERE ((n.UserId = @RecipientId AND n.RelatedUserId = @SenderId)
    OR (n.UserId = @SenderId AND n.RelatedUserId = @RecipientId))
  AND n.NewValue IS NOT NULL
  AND LTRIM(RTRIM(n.NewValue)) <> ''
ORDER BY n.CreatedAt DESC;

/* 5) Vérifier que c'est bien une data URL (format attendu) */
SELECT TOP (50)
    n.Id,
    n.OldValue AS AttachmentName,
    CASE WHEN n.NewValue LIKE 'data:%' THEN 'OK' ELSE 'INVALID' END AS DataUrlFormat,
    LEFT(n.NewValue, 80) AS Prefix
FROM dbo.Notification n
WHERE n.NewValue IS NOT NULL
  AND LTRIM(RTRIM(n.NewValue)) <> ''
ORDER BY n.Id DESC;

/* 6) Compter les pièces jointes par expéditeur */
SELECT
    n.RelatedUserId AS SenderUserId,
    COUNT(*) AS AttachmentsSent
FROM dbo.Notification n
WHERE n.NewValue IS NOT NULL
  AND LTRIM(RTRIM(n.NewValue)) <> ''
GROUP BY n.RelatedUserId
ORDER BY AttachmentsSent DESC;