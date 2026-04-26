import { motion } from 'framer-motion';
import { Plus, RefreshCw, Unlink, CheckCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useAccounts } from '../hooks/useAccounts';

const eur = (v: number) =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(v);

const BANKS_AVAILABLE = [
  { name: 'Caixa Geral de Depósitos', logo: 'CGD', color: '#003B71' },
  { name: 'Millennium BCP',           logo: 'BCP', color: '#E31837' },
  { name: 'BPI',                      logo: 'BPI', color: '#004C97' },
  { name: 'Santander',                logo: 'SAN', color: '#EC0000' },
  { name: 'NovoBanco',                logo: 'NB',  color: '#FF6B00' },
  { name: 'Montepio',                 logo: 'MP',  color: '#006838' },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, delay },
});

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
} as const;

interface Account {
  id: string;
  bank_name: string;
  account_name?: string;
  iban?: string;
  balance: number;
  currency?: string;
  account_type?: string;
  last_synced_at?: string;
}

export function AccountsPage() {
  const { data: accounts = [] } = useAccounts();
  const accList = accounts as Account[];
  const totalBalance = accList.reduce((s, a) => s + Number(a.balance ?? 0), 0);

  const BANK_COLORS: Record<string, string> = {
    CGD: '#003B71', BCP: '#E31837', BPI: '#004C97',
    SAN: '#EC0000', NB: '#FF6B00', MP: '#006838',
  };

  function getBankColor(bankName: string, idx: number): string {
    const fallbacks = ['#1A56DB', '#D97706', '#059669', '#7C3AED', '#DC2626', '#0891B2'];
    const upper = bankName?.toUpperCase() ?? '';
    for (const [key, color] of Object.entries(BANK_COLORS)) {
      if (upper.includes(key)) return color;
    }
    return fallbacks[idx % fallbacks.length];
  }

  function getBankLogo(bankName: string): string {
    return (bankName ?? 'BK').slice(0, 3).toUpperCase();
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">

      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--ink-900)' }}>
            Contas Bancárias
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
            Gerir ligações via Open Banking (PSD2)
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ background: 'var(--ink-900)' }}>
          <Plus size={14} />
          Ligar Conta
        </button>
      </motion.div>

      <motion.div {...fadeUp(0.05)}
        className="rounded-2xl p-6"
        style={{ background: 'var(--ink-900)', boxShadow: '0 4px 24px rgba(0,0,0,0.12)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.35)' }}>
          Saldo Total Consolidado
        </p>
        <p className="text-[38px] font-black text-white mt-2 leading-none tabular-nums">
          {eur(totalBalance)}
        </p>
        <div className="flex items-center gap-3 mt-4">
          {accList.map((acc, i) => (
            <div key={acc.id} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: getBankColor(acc.bank_name, i) }} />
              <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {getBankLogo(acc.bank_name)}
              </span>
            </div>
          ))}
          <span className="text-[11px] ml-auto" style={{ color: 'rgba(255,255,255,0.28)' }}>
            {accList.length > 0
              ? `${accList.length} conta${accList.length > 1 ? 's' : ''} · Atualizado agora`
              : 'Sem contas ligadas'}
          </span>
        </div>
      </motion.div>

      <div>
        <motion.p {...fadeUp(0.10)}
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--ink-300)' }}>
          Contas Ligadas
        </motion.p>

        {accList.length === 0 ? (
          <motion.div {...fadeUp(0.12)} className="rounded-2xl p-8 text-center" style={card}>
            <p className="text-2xl mb-2">🏦</p>
            <p className="text-sm font-medium" style={{ color: 'var(--ink-900)' }}>
              Nenhuma conta ligada
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-400)' }}>
              Liga a tua conta bancária para ver o saldo e transações automaticamente.
            </p>
            <button className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-80"
              style={{ background: 'var(--ink-900)' }}>
              <Plus size={13} />
              Ligar Primeira Conta
            </button>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {accList.map((acc, i) => {
              const color = getBankColor(acc.bank_name, i);
              const logo = getBankLogo(acc.bank_name);
              return (
                <motion.div key={acc.id} {...fadeUp(0.12 + i * 0.05)}
                  className="rounded-2xl p-5" style={card}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                      style={{ background: color }}>
                      {logo}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[15px]" style={{ color: 'var(--ink-900)' }}>
                          {acc.bank_name}
                        </p>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600">
                          <CheckCircle size={9} />
                          Ligado
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--ink-300)' }}>
                        {acc.account_name ?? 'Conta'}
                        {acc.iban ? ` · ${acc.iban}` : ''}
                      </p>
                      {acc.last_synced_at && (
                        <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--ink-300)' }}>
                          <Clock size={9} />
                          {format(parseISO(acc.last_synced_at), "d 'de' MMMM 'às' HH:mm", { locale: pt })}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--ink-900)' }}>
                        {eur(Number(acc.balance))}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--ink-300)' }}>
                        {acc.currency ?? 'EUR'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-[var(--gold-subtle)]"
                      style={{ color: 'var(--gold)' }}>
                      <RefreshCw size={11} />
                      Sincronizar
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-red-50 hover:text-red-500"
                      style={{ color: 'var(--ink-300)' }}>
                      <Unlink size={11} />
                      Desligar
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <motion.p {...fadeUp(0.28)}
          className="text-[10px] font-semibold uppercase tracking-widest mb-3"
          style={{ color: 'var(--ink-300)' }}>
          Adicionar Novo Banco
        </motion.p>
        <motion.div {...fadeUp(0.30)} className="rounded-2xl p-5" style={card}>
          <p className="text-xs mb-4" style={{ color: 'var(--ink-300)' }}>
            Ligação segura via PSD2 — o GoldLock só lê dados, nunca movimenta dinheiro.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {BANKS_AVAILABLE.map((bank, i) => {
              const alreadyConnected = accList.some(a =>
                a.bank_name?.toUpperCase().includes(bank.logo)
              );
              return (
                <motion.button key={bank.name}
                  initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.32 + i * 0.04 }}
                  disabled={alreadyConnected}
                  className="flex items-center gap-3 p-3 rounded-xl border text-left transition-all disabled:opacity-50 disabled:cursor-default"
                  style={{
                    borderColor: alreadyConnected ? `${bank.color}25` : 'var(--border)',
                    background: alreadyConnected ? `${bank.color}07` : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (!alreadyConnected) (e.currentTarget as HTMLElement).style.background = 'var(--ink-50)';
                  }}
                  onMouseLeave={e => {
                    if (!alreadyConnected) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0"
                    style={{ background: bank.color }}>
                    {bank.logo}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink-900)' }}>
                      {bank.name.split(' ').slice(0, 2).join(' ')}
                    </p>
                    {alreadyConnected && (
                      <p className="text-[10px] text-green-600 font-medium">✓ Ligado</p>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>

      <motion.div {...fadeUp(0.48)}
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: 'var(--gold-subtle)', border: '1px solid var(--gold-border)' }}>
        <span className="text-lg shrink-0">🔒</span>
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
            Ligação 100% segura
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--ink-500)' }}>
            O GoldLock utiliza Open Banking regulado pelo Banco de Portugal (PSD2). As tuas credenciais bancárias nunca passam pelos nossos servidores.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
