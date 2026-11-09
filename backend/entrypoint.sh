#!/bin/sh
set -e
python manage.py migrate --noinput
# Carrega os dados de exemplo só numa base de dados vazia (M-07).
if ! python manage.py shell -c "from contas.models import Utilizador; import sys; sys.exit(0 if Utilizador.objects.exists() else 1)"; then
  python manage.py loaddata dados_exemplo
fi
exec "$@"
