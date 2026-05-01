"""
ScoreAgent — calcula o Score Fiscal do utilizador (0-100).

Score composto de 5 sub-scores (0-20 cada), pesos justificados pelo CIRS:
  1. Cobertura de deduções (categorias usadas / disponíveis)
  2. Utilização de limites (% cada limite — óptimo 70-90%)
  3. PPR status (contribuindo? % do benefício máximo)
  4. Eficiência efectiva (taxa efectiva vs marginal)
  5. Sensibilidade ao escalão (proximidade ao limite do escalão)
"""

from typing import Any

LIMITS = {"saude": 1000.0, "educacao": 800.0, "habitacao": 296.0, "restauracao": 250.0, "ppr": 400.0}
RATES = {"saude": 0.15, "educacao": 0.30, "habitacao": 0.15, "restauracao": 0.15, "ppr": 0.20}

BRACKETS_2024 = [
    {"min": 0,      "max": 7703,    "rate": 0.1325},
    {"min": 7703,   "max": 11623,   "rate": 0.18},
    {"min": 11623,  "max": 16472,   "rate": 0.23},
    {"min": 16472,  "max": 21321,   "rate": 0.26},
    {"min": 21321,  "max": 27146,   "rate": 0.3275},
    {"min": 27146,  "max": 39791,   "rate": 0.37},
    {"min": 39791,  "max": 51997,   "rate": 0.435},
    {"min": 51997,  "max": 81199,   "rate": 0.45},
    {"min": 81199,  "max": None,    "rate": 0.48},
]

BADGE_THRESHOLDS = [
    (86, "Expert"),
    (66, "Otimizado"),
    (40, "Em Progresso"),
    (0,  "Não Otimizado"),
]


def _badge(score: int) -> str:
    for threshold, label in BADGE_THRESHOLDS:
        if score >= threshold:
            return label
    return "Não Otimizado"


def _bracket_for(income: float) -> dict:
    for b in BRACKETS_2024:
        if b["max"] is None or income <= b["max"]:
            return b
    return BRACKETS_2024[-1]


class ScoreAgent:
    def score(
        self,
        fiscal_profile: dict[str, Any] | None,
        deduction_results: list[dict],
        predictions: dict[str, dict],
    ) -> dict:
        if not fiscal_profile:
            return self._empty_score()

        gross = float(fiscal_profile.get("gross_income_annual") or 0)
        if gross <= 0:
            return self._empty_score()

        ss = float(fiscal_profile.get("social_security_contributions") or gross * 0.11)
        ppr_contrib = float(fiscal_profile.get("ppr_contributions") or 0)
        collectable = max(0.0, gross - max(ss, 4104.0))
        bracket = _bracket_for(collectable)
        marginal_rate = bracket["rate"]

        # ── Sub-score 1: Cobertura de deduções (0-20) ────────────────────────
        # Categorias com alguma despesa classificada
        categories_used: set[str] = set()
        for d in deduction_results:
            dt = d.get("deduction_type", "")
            cat_map = {
                "saude_dedutivel": "saude",
                "educacao_dedutivel": "educacao",
                "habitacao_dedutivel": "habitacao",
                "encargos_gerais_dedutivel": "restauracao",
                "ppr_dedutivel": "ppr",
            }
            if dt in cat_map:
                categories_used.add(cat_map[dt])

        coverage_score = min(20, round(len(categories_used) / 5 * 20))

        # ── Sub-score 2: Utilização de limites (0-20) ────────────────────────
        # Óptimo: 70-90% do limite. Penalizar se muito baixo ou se ultrapassar.
        if predictions:
            util_scores = []
            for cat, pred in predictions.items():
                year_end = pred.get("predicted_year_end", 0)
                limit_exp = pred.get("limit_expense", 1)
                pct = year_end / max(1, limit_exp)
                if 0.70 <= pct <= 1.0:
                    util_scores.append(20)
                elif 0.40 <= pct < 0.70:
                    util_scores.append(12)
                elif 0.10 <= pct < 0.40:
                    util_scores.append(6)
                else:
                    util_scores.append(0)
            limit_score = round(sum(util_scores) / len(util_scores)) if util_scores else 0
        else:
            limit_score = 0

        # ── Sub-score 3: PPR status (0-20) ───────────────────────────────────
        ppr_max_benefit = LIMITS["ppr"] / RATES["ppr"]  # 2000€ em despesa para 400€ dedução
        ppr_pct = min(1.0, ppr_contrib / max(1, ppr_max_benefit))
        if ppr_pct >= 0.90:
            ppr_score = 20
        elif ppr_pct >= 0.50:
            ppr_score = 12
        elif ppr_pct >= 0.10:
            ppr_score = 6
        else:
            ppr_score = 0

        # ── Sub-score 4: Eficiência efectiva (0-20) ──────────────────────────
        # Calculamos proxy: quanto das deduções disponíveis está a ser aproveitado
        total_possible_ded = sum(LIMITS.values())  # 2746€ máximo em deduções à coleta
        total_used_ded = sum(
            min(pred.get("predicted_year_end", 0) * RATES[cat], LIMITS[cat])
            for cat, pred in predictions.items()
        ) if predictions else 0
        efficiency_pct = total_used_ded / max(1, total_possible_ded)
        effective_score = min(20, round(efficiency_pct * 20))

        # ── Sub-score 5: Sensibilidade ao escalão (0-20) ─────────────────────
        # Utilizadores perto do limite de escalão ganham mais ao otimizar
        bracket_max = bracket.get("max")
        if bracket_max:
            gap_to_next = bracket_max - collectable
            # Se a 2.000€ do próximo escalão, PPR pode fazer diferença
            if gap_to_next < 2000 and ppr_contrib > 0:
                bracket_score = 20
            elif gap_to_next < 5000:
                bracket_score = 12
            else:
                bracket_score = 8
        else:
            # No escalão mais alto — sempre máximo score de consciência
            bracket_score = 16

        total = coverage_score + limit_score + ppr_score + effective_score + bracket_score

        # Potencial de otimização estimado (simplificado)
        optimization_potential = round(
            (total_possible_ded - total_used_ded) * 0.6 +
            (ppr_max_benefit - ppr_contrib) * RATES["ppr"]
        )

        return {
            "score": total,
            "badge": _badge(total),
            "breakdown": {
                "deduction_coverage": coverage_score,
                "limit_utilization": limit_score,
                "ppr_status": ppr_score,
                "effective_rate": effective_score,
                "bracket_proximity": bracket_score,
            },
            "optimization_potential_eur": max(0, optimization_potential),
            "marginal_rate_pct": round(marginal_rate * 100, 2),
            "categories_used": list(categories_used),
        }

    def _empty_score(self) -> dict:
        return {
            "score": 0,
            "badge": "Não Otimizado",
            "breakdown": {
                "deduction_coverage": 0,
                "limit_utilization": 0,
                "ppr_status": 0,
                "effective_rate": 0,
                "bracket_proximity": 0,
            },
            "optimization_potential_eur": 0,
            "marginal_rate_pct": 0,
            "categories_used": [],
        }
