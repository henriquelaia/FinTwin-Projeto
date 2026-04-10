/**
 * TotpSetupModal — Gold Lock
 * ==========================
 * Modal para configurar autenticação TOTP (2FA).
 * 1. Chama POST /api/auth/2fa/setup → obtém QR code + secret
 * 2. Utilizador escaneia com Google Authenticator / Authy
 * 3. Introduz código de 6 dígitos para confirmar → POST /api/auth/2fa/enable
 */

import { useState, useEffect } from 'react';
import { X, Smartphone, CheckCircle } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';
import { authApi } from '../../services/api';

interface Props {
  onClose: () => void;
  onEnabled: () => void;
}

export function TotpSetupModal({ onClose, onEnabled }: Props) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret]       = useState<string | null>(null);
  const [code, setCode]           = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [step, setStep]           = useState<'qr' | 'confirm' | 'done'>('qr');

  useEffect(() => {
    authApi.setup2fa()
      .then(({ data }) => {
        setQrCodeUrl(data.data.qrCodeUrl);
        setSecret(data.data.secret);
      })
      .catch(() => setError('Erro ao gerar QR code. Tenta novamente.'));
  }, []);

  async function handleEnable() {
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await authApi.enable2fa(code);
      setStep('done');
      setTimeout(onEnabled, 1200);
    } catch {
      setError('Código inválido. Verifica o teu autenticador e tenta novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(16,28,41,0.4)', backdropFilter: 'blur(8px)' }}>
      <div
        className="w-full max-w-sm rounded-3xl border border-white/60 p-6 relative"
        style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', boxShadow: '0 24px 60px rgba(73,62,229,0.18)' }}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-[#464555]/40 hover:text-[#464555] hover:bg-[#493ee5]/05 transition-colors">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Smartphone className="w-5 h-5 text-[#493ee5]" />
          <h3 className="text-base font-bold text-[#101c29]">Configurar autenticador</h3>
        </div>

        {step === 'done' ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[#101c29]">2FA ativado!</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-3 px-3 py-2 rounded-xl text-xs text-[#ba1a1a]" style={{ background: '#ffdad6' }}>
                {error}
              </div>
            )}

            {step === 'qr' && (
              <>
                <p className="text-xs text-[#464555]/70 mb-3">
                  Abre o Google Authenticator ou Authy e escaneia o QR code abaixo.
                </p>
                {qrCodeUrl ? (
                  <div className="flex justify-center mb-3">
                    <img src={qrCodeUrl} alt="QR Code 2FA" className="w-40 h-40 rounded-xl border border-[#493ee5]/10" />
                  </div>
                ) : (
                  <div className="h-40 rounded-xl mb-3 animate-pulse" style={{ background: 'rgba(73,62,229,0.08)' }} />
                )}
                {secret && (
                  <div className="mb-4 p-2.5 rounded-xl text-center" style={{ background: 'rgba(73,62,229,0.06)' }}>
                    <p className="text-[10px] text-[#464555]/50 mb-0.5 uppercase tracking-wider">Código manual</p>
                    <p className="text-xs font-mono font-bold text-[#493ee5] break-all">{secret}</p>
                  </div>
                )}
                <GlassButton onClick={() => setStep('confirm')} className="w-full" disabled={!qrCodeUrl}>
                  Já escanei — continuar
                </GlassButton>
              </>
            )}

            {step === 'confirm' && (
              <>
                <p className="text-xs text-[#464555]/70 mb-3">
                  Introduz o código de 6 dígitos gerado pelo teu autenticador para confirmar.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl text-center text-2xl font-mono tracking-widest outline-none border border-transparent focus:border-[#493ee5]/40 mb-4"
                  style={{ background: 'rgba(73,62,229,0.05)' }}
                  autoFocus
                />
                <div className="flex gap-2">
                  <GlassButton variant="ghost" onClick={() => setStep('qr')} className="flex-1" size="sm">
                    Voltar
                  </GlassButton>
                  <GlassButton
                    onClick={handleEnable}
                    loading={loading}
                    disabled={code.length !== 6}
                    className="flex-1"
                    size="sm"
                  >
                    Confirmar
                  </GlassButton>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
