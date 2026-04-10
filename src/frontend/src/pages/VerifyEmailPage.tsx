/**
 * VerifyEmailPage — Gold Lock
 * ===========================
 * Lê o token da query string, chama GET /api/auth/verify-email
 * e mostra feedback de sucesso ou erro ao utilizador.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Lock } from 'lucide-react';
import { authApi } from '../services/api';

type Status = 'loading' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Link de verificação inválido ou incompleto.');
      return;
    }

    authApi.verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email verificado com sucesso! Já podes fazer login.');
      })
      .catch((err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? 'Token inválido ou expirado.';
        setStatus('error');
        setMessage(msg);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #f0f0ff 0%, #e8e8f8 50%, #f5f0ff 100%)' }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/60 p-10 text-center"
        style={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 40px rgba(73,62,229,0.10)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #493ee5 0%, #635bff 100%)', boxShadow: '0 4px 12px rgba(73,62,229,0.3)' }}
          >
            <Lock className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black tracking-tighter text-[#101c29]">
            Gold<span className="text-[#493ee5]">Lock</span>
          </span>
        </div>

        {/* Estado */}
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-[#493ee5] animate-spin mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#101c29] mb-2">A verificar email…</h2>
            <p className="text-sm text-[#464555]/60">Aguarda um momento.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#101c29] mb-2">Email verificado!</h2>
            <p className="text-sm text-[#464555]/70 mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #493ee5 0%, #635bff 100%)' }}
            >
              Fazer login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#101c29] mb-2">Verificação falhada</h2>
            <p className="text-sm text-[#464555]/70 mb-6">{message}</p>
            <Link
              to="/login"
              className="inline-block px-6 py-2.5 rounded-xl text-sm font-semibold text-[#493ee5] border border-[#493ee5]/30"
              style={{ background: 'rgba(73,62,229,0.06)' }}
            >
              Voltar ao login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
