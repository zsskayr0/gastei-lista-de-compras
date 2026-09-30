-- E-mails passam a ser sempre gravados em minúsculas (login não diferencia maiúscula).
UPDATE "users" SET "email" = lower(trim("email")) WHERE "email" <> lower(trim("email"));
