#!/bin/sh
set -e

echo "Aplicando migraciones de base de datos..."
npx prisma migrate deploy

if [ "${SEED_DEMO:-false}" = "true" ]; then
  STATUS=$(node -e "
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.company.count()
      .then((count) => console.log(count === 0 ? 'empty' : 'ready'))
      .catch((error) => { console.error(error); process.exit(1); })
      .finally(() => prisma.\$disconnect());
  ")
  if [ "$STATUS" = "empty" ]; then
    echo "Base vacía: cargando datos de demostración..."
    npx prisma db seed
  else
    echo "Datos existentes: no se ejecuta el seed."
  fi
fi

exec npm start -- --hostname 0.0.0.0 --port "${PORT:-3000}"
