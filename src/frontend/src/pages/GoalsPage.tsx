/**
 * GoalsPage — Gold Lock
 * =====================
 * Metas de poupança — implementação no Sprint 6.
 */

import { Target } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { GlassCard } from '../components/ui/GlassCard';
import { EmptyState } from '../components/ui/EmptyState';

export function GoalsPage() {
  return (
    <div className="p-6">
      <PageHeader
        title="Metas de Poupança"
        subtitle="Define objetivos financeiros e acompanha o teu progresso"
      />
      <GlassCard>
        <EmptyState
          icon={Target}
          title="Sem metas criadas"
          description="Cria a tua primeira meta de poupança — férias, fundo de emergência, novo portátil."
          action={{ label: 'Criar meta', onClick: () => {} }}
        />
      </GlassCard>
    </div>
  );
}
