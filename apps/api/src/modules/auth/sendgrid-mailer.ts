import { Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class SendGridMailer {
  validateConfiguration(): void {
    this.getConfiguration();
  }

  async sendAccountActivation(email: string, accountName: string, token: string): Promise<void> {
    await this.sendLink(
      email,
      accountName,
      token,
      '/activate',
      'Activation de votre compte FIVONDRONANA',
      'définissez votre mot de passe',
    );
  }

  async sendPasswordReset(email: string, accountName: string, token: string): Promise<void> {
    await this.sendLink(
      email,
      accountName,
      token,
      '/reset-password',
      'Réinitialisation de votre mot de passe FIVONDRONANA',
      'réinitialisez votre mot de passe',
    );
  }

  private async sendLink(
    email: string,
    accountName: string,
    token: string,
    route: string,
    subject: string,
    instruction: string,
  ): Promise<void> {
    const { apiKey, fromEmail, activationBaseUrl } = this.getConfiguration();
    const activationUrl = new URL(route, activationBaseUrl);
    activationUrl.hash = new URLSearchParams({ token }).toString();
    let response: Response;
    try {
      response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: fromEmail },
          subject,
          content: [
            {
              type: 'text/plain',
              value: `Bonjour ${accountName}, ${instruction} via ce lien à usage unique :\n${activationUrl.toString()}\n`,
            },
          ],
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('Impossible d’envoyer le courriel d’activation.');
    }
    if (!response.ok) throw new ServiceUnavailableException('Impossible d’envoyer le courriel d’activation.');
  }

  private getConfiguration(): { apiKey: string; fromEmail: string; activationBaseUrl: URL } {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;
    const backofficeUrl = process.env.BACKOFFICE_URL;
    if (!apiKey || !fromEmail || !backofficeUrl) {
      throw new ServiceUnavailableException('Le service de courriel n’est pas configuré.');
    }

    try {
      const baseUrl = new URL(backofficeUrl);
      if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error('Unsupported portal protocol.');
      if (process.env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:')
        throw new Error('Production activation links require HTTPS.');
      return { apiKey, fromEmail, activationBaseUrl: baseUrl };
    } catch {
      throw new ServiceUnavailableException('L’adresse du portail web est invalide.');
    }
  }
}
