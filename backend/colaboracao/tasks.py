from celery import shared_task
from django.core.mail import send_mail


@shared_task
def enviar_email(assunto, mensagem, destinatarios):
    """Corre no Worker (ADR-004): uma falha do servidor de e-mail não chega ao utilizador."""
    send_mail(assunto, mensagem, None, destinatarios, fail_silently=True)
