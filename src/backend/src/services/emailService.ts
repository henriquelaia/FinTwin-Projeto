import { Resend } from 'resend';

// ── Prevenção de HTML injection ────────────────────────────────────────────

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Cliente Resend (lazy init) ─────────────────────────────────────────────

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada no .env');
  }
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = () =>
  process.env.EMAIL_FROM ?? 'GoldLock <noreply@goldlock.pt>';

const FRONTEND_URL = () =>
  process.env.FRONTEND_URL ?? 'http://localhost:3000';

// ── Templates ─────────────────────────────────────────────────────────────

function baseEmailHtml(title: string, bodyHtml: string): string {
  return `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8f9ff;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9ff;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 8px 32px rgba(73,62,229,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#493ee5,#635bff);padding:32px 40px;">
              <p style="margin:0;font-size:22px;font-weight:900;color:#ffffff;
                        letter-spacing:-0.5px;">Gold<span style="color:#c3c0ff;">Lock</span></p>
              <p style="margin:4px 0 0;font-size:10px;color:rgba(255,255,255,0.6);
                        text-transform:uppercase;letter-spacing:2px;">High-End Finance</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#f8f9ff;border-top:1px solid #eef4ff;">
              <p style="margin:0;font-size:11px;color:#777587;text-align:center;">
                © ${new Date().getFullYear()} Gold Lock · Se não reconheces esta ação,
                <a href="mailto:${process.env.EMAIL_FROM ?? 'suporte@goldlock.pt'}"
                   style="color:#493ee5;">contacta o suporte</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Funções públicas ───────────────────────────────────────────────────────

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const verifyUrl = `${FRONTEND_URL()}/verify-email?token=${token}`;

  const bodyHtml = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#101c29;
               letter-spacing:-0.5px;">Verifica o teu email</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#464555;line-height:1.6;">
      Olá <strong>${escapeHtml(name)}</strong>, bem-vindo/a à Gold Lock.<br/>
      Clica no botão abaixo para confirmar o teu email e ativar a conta.
      O link é válido durante <strong>24 horas</strong>.
    </p>
    <a href="${verifyUrl}"
       style="display:inline-block;background:linear-gradient(135deg,#493ee5,#635bff);
              color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;
              border-radius:12px;text-decoration:none;letter-spacing:-0.2px;">
      Verificar Email
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#777587;">
      Ou copia este link: <br/>
      <a href="${verifyUrl}" style="color:#493ee5;word-break:break-all;">${verifyUrl}</a>
    </p>`;

  await getResend().emails.send({
    from:    FROM(),
    to:      email,
    subject: 'Verifica o teu email — Gold Lock',
    html:    baseEmailHtml('Verificação de Email', bodyHtml),
  });
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${FRONTEND_URL()}/reset-password?token=${token}`;

  const bodyHtml = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#101c29;
               letter-spacing:-0.5px;">Recuperar password</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#464555;line-height:1.6;">
      Olá <strong>${escapeHtml(name)}</strong>, recebemos um pedido de recuperação de password.<br/>
      Clica no botão abaixo para definir uma nova password.
      O link expira em <strong>1 hora</strong> e é de uso único.
    </p>
    <a href="${resetUrl}"
       style="display:inline-block;background:linear-gradient(135deg,#493ee5,#635bff);
              color:#ffffff;font-weight:700;font-size:15px;padding:14px 32px;
              border-radius:12px;text-decoration:none;letter-spacing:-0.2px;">
      Redefinir Password
    </a>
    <p style="margin:24px 0 0;font-size:13px;color:#ba1a1a;background:#ffdad6;
              padding:12px 16px;border-radius:8px;">
      ⚠️ Se não pediste esta recuperação, ignora este email.
      A tua password permanece inalterada.
    </p>
    <p style="margin:16px 0 0;font-size:12px;color:#777587;">
      Ou copia este link: <br/>
      <a href="${resetUrl}" style="color:#493ee5;word-break:break-all;">${resetUrl}</a>
    </p>`;

  await getResend().emails.send({
    from:    FROM(),
    to:      email,
    subject: 'Recuperação de password — Gold Lock',
    html:    baseEmailHtml('Recuperação de Password', bodyHtml),
  });
}
