"""
ScenarioAgent — otimizador greedy de cenários fiscais.

Testa 8 cenários baseados no perfil fiscal do utilizador,
re-implementando a lógica de irsCalculator.ts em Python
(mesmos brackets OE 2024, Lei 82/2023).
"""

import math
from typing import Any

# ── Motor IRS OE 2024 (espelho de irsCalculator.ts) ─────────────────────────

BRACKETS_2024 = [
    {"min": 0,      "max": 7703,    "rate": 0.1325, "parcel": 0.0},
    {"min": 7703,   "max": 11623,   "rate": 0.18,   "parcel": 365.89},
    {"min": 11623,  "max": 16472,   "rate": 0.23,   "parcel": 947.28},
    {"min": 16472,  "max": 21321,   "rate": 0.26,   "parcel": 1441.20},
    {"min": 21321,  "max": 27146,   "rate": 0.3275, "parcel": 2880.47},
    {"min": 27146,  "max": 39791,   "rate": 0.37,   "parcel": 4034.17},
    {"min": 39791,  "max": 51997,   "rate": 0.435,  "parcel": 6620.43},
    {"min": 51997,  "max": 81199,   "rate": 0.45,   "parcel": 7400.21},
    {"min": 81199,  "max": None,    "rate": 0.48,   "parcel": 9836.45},
]

DEDUCTION_LIMITS = {
    "saude":       {"rate": 0.15, "limit": 1000.0},
    "educacao":    {"rate": 0.30, "limit": 800.0},
    "habitacao":   {"rate": 0.15, "limit": 296.0},
    "restauracao": {"rate": 0.15, "limit": 250.0},
    "ppr":         {"rate": 0.20, "limit": 400.0},
}

SPECIFIC_DEDUCTION = 4104.0
DEPENDENTS_BASE = 600.0
DEPENDENTS_EXTRA = 126.0


def _find_bracket(income: float) -> dict:
    for b in BRACKETS_2024:
        if b["max"] is None or income <= b["max"]:
            return b
    return BRACKETS_2024[-1]


def _calc_deduction_value(amount: float, rate: float, limit: float) -> float:
    return min(amount * rate, limit)


def _calculate_irs(
    gross_income: float,
    social_security: float,
    marital_status: str,
    dependents: int,
    withholding: float,
    deductions: dict[str, float],
    joint_income: float = 0.0,
) -> dict:
    """Calcula IRS — lógica idêntica a irsCalculator.ts."""

    # Deduções específicas
    specific_ded = max(social_security, SPECIFIC_DEDUCTION)
    collectable = max(0.0, gross_income - specific_ded)

    # Se casado em conjunto, usa quociente conjugal
    if marital_status == "married" and joint_income > 0:
        total = gross_income + joint_income
        collectable_total = max(0.0, total - specific_ded * 2)
        base = collectable_total / 2
    else:
        base = collectable

    bracket = _find_bracket(base)
    gross_tax_base = base * bracket["rate"] - bracket["parcel"]
    gross_tax = gross_tax_base * (2 if marital_status == "married" and joint_income > 0 else 1)
    gross_tax = max(0.0, gross_tax)

    # Deduções à coleta
    dep_ded = DEPENDENTS_BASE * dependents + (DEPENDENTS_EXTRA * max(0, dependents - 1))

    ded_values = {k: _calc_deduction_value(v, DEDUCTION_LIMITS[k]["rate"], DEDUCTION_LIMITS[k]["limit"])
                  for k, v in deductions.items() if k in DEDUCTION_LIMITS}
    total_ded = dep_ded + sum(ded_values.values())

    net_tax = max(0.0, gross_tax - total_ded)
    result = net_tax - withholding
    effective_rate = (net_tax / gross_income * 100) if gross_income > 0 else 0.0
    marginal_rate = bracket["rate"] * 100

    return {
        "gross_tax": round(gross_tax, 2),
        "net_tax": round(net_tax, 2),
        "result": round(result, 2),
        "effective_rate": round(effective_rate, 2),
        "marginal_rate": round(marginal_rate, 2),
        "bracket_rate": bracket["rate"],
        "bracket_min": bracket["min"],
        "bracket_max": bracket["max"],
        "collectable_income": round(collectable, 2),
    }


# ── ScenarioAgent ─────────────────────────────────────────────────────────────

class ScenarioAgent:
    """Testa 8 cenários fiscais e ordena por poupança máxima."""

    def optimize(self, fiscal_profile: dict[str, Any] | None) -> list[dict]:
        if not fiscal_profile:
            return []

        gross = float(fiscal_profile.get("gross_income_annual") or 0)
        if gross <= 0:
            return []

        ss = float(fiscal_profile.get("social_security_contributions") or gross * 0.11)
        status = fiscal_profile.get("marital_status") or "single"
        dependents = int(fiscal_profile.get("dependents") or 0)
        withholding = float(fiscal_profile.get("withholding_tax") or 0)
        ppr_contrib = float(fiscal_profile.get("ppr_contributions") or 0)

        # Deduções actuais estimadas (podem vir do perfil ou serem zero)
        current_deductions = {
            "saude": float(fiscal_profile.get("saude") or 0),
            "educacao": float(fiscal_profile.get("educacao") or 0),
            "habitacao": float(fiscal_profile.get("habitacao") or 0),
            "restauracao": float(fiscal_profile.get("restauracao") or 0),
            "ppr": ppr_contrib,
        }

        baseline = _calculate_irs(gross, ss, status, dependents, withholding, current_deductions)
        scenarios: list[dict] = []

        def _scenario(sid: str, label: str, deductions: dict, actions: list[str],
                       override_status: str | None = None,
                       joint_income: float = 0.0) -> dict | None:
            calc_status = override_status or status
            calc = _calculate_irs(gross, ss, calc_status, dependents, withholding,
                                   deductions, joint_income)
            saving = round(baseline["result"] - calc["result"], 2)
            if saving <= 0:
                return None
            return {
                "scenario_id": sid,
                "label": label,
                "tax_saving_eur": saving,
                "tax_saving_pct": round(saving / max(1, abs(baseline["result"])) * 100, 1),
                "new_result": calc["result"],
                "new_effective_rate": calc["effective_rate"],
                "actions": actions,
                "status": "recomendado" if saving > 50 else "possível",
            }

        # ── Cenário 1: PPR máximo para o escalão actual ──────────────────────
        bracket = _find_bracket(max(0.0, gross - max(ss, SPECIFIC_DEDUCTION)))
        # PPR óptimo: quanto reduz o rendimento colectável para maximizar o benefício
        ppr_max_benefit = DEDUCTION_LIMITS["ppr"]["limit"] / DEDUCTION_LIMITS["ppr"]["rate"]
        ppr_additional = max(0.0, ppr_max_benefit - ppr_contrib)
        if ppr_additional > 50:
            ded_ppr = {**current_deductions, "ppr": ppr_max_benefit}
            ppr_tax_saving = ppr_max_benefit * DEDUCTION_LIMITS["ppr"]["rate"]
            s = _scenario(
                "ppr_max",
                f"Contribuir {round(ppr_additional):,}€ para PPR".replace(",", "."),
                ded_ppr,
                [f"Efectuar contribuição PPR de {round(ppr_additional, 0):,.0f}€ até 31/12".replace(",", "."),
                 f"Benefício fiscal máximo: {DEDUCTION_LIMITS['ppr']['limit']:.0f}€ em deduções à coleta"],
            )
            if s:
                scenarios.append(s)

        # ── Cenário 2 & 3: Declaração conjunta vs separada ───────────────────
        if status == "married":
            # Estimativa de rendimento do cônjuge (se não disponível, assumir 70% do próprio)
            joint_est = gross * 0.70
            s_joint = _scenario(
                "married_joint",
                "Declaração conjunta",
                current_deductions,
                ["Declarar IRS em conjunto com cônjuge",
                 "Verificar rendimento conjunto no AT"],
                override_status="married",
                joint_income=joint_est,
            )
            if s_joint:
                scenarios.append(s_joint)

            s_sep = _scenario(
                "married_separate",
                "Declaração separada",
                current_deductions,
                ["Declarar IRS separadamente do cônjuge",
                 "Cada cônjuge apresenta a sua própria declaração"],
            )
            if s_sep:
                scenarios.append(s_sep)

        # ── Cenário 4: Maximizar saúde ───────────────────────────────────────
        saude_gap = DEDUCTION_LIMITS["saude"]["limit"] / DEDUCTION_LIMITS["saude"]["rate"] - current_deductions["saude"]
        if saude_gap > 50:
            ded_saude = {**current_deductions, "saude": DEDUCTION_LIMITS["saude"]["limit"] / DEDUCTION_LIMITS["saude"]["rate"]}
            s = _scenario(
                "max_saude",
                f"Maximizar dedução de saúde (+{round(saude_gap):,}€)".replace(",", "."),
                ded_saude,
                [f"Guardar faturas de saúde: farmácia, médicos, dentista",
                 f"Faltam {round(saude_gap, 0):,.0f}€ para atingir o limite de 1.000€ dedução".replace(",", ".")],
            )
            if s:
                scenarios.append(s)

        # ── Cenário 5: Maximizar educação ────────────────────────────────────
        educ_gap = DEDUCTION_LIMITS["educacao"]["limit"] / DEDUCTION_LIMITS["educacao"]["rate"] - current_deductions["educacao"]
        if educ_gap > 50:
            ded_educ = {**current_deductions, "educacao": DEDUCTION_LIMITS["educacao"]["limit"] / DEDUCTION_LIMITS["educacao"]["rate"]}
            s = _scenario(
                "max_educacao",
                f"Maximizar dedução de educação (+{round(educ_gap):,}€)".replace(",", "."),
                ded_educ,
                ["Guardar faturas de propinas, explicações, creche",
                 f"Faltam {round(educ_gap, 0):,.0f}€ para atingir o limite de 800€ dedução".replace(",", ".")],
            )
            if s:
                scenarios.append(s)

        # ── Cenário 6: PPR + saúde combinado ────────────────────────────────
        if ppr_additional > 50 and saude_gap > 50:
            ded_combo = {
                **current_deductions,
                "ppr": ppr_max_benefit,
                "saude": DEDUCTION_LIMITS["saude"]["limit"] / DEDUCTION_LIMITS["saude"]["rate"],
            }
            s = _scenario(
                "ppr_plus_saude",
                "PPR máximo + Saúde máxima",
                ded_combo,
                ["Contribuir para PPR até ao máximo fiscal",
                 "Guardar todas as faturas de saúde do ano"],
            )
            if s:
                scenarios.append(s)

        # ── Cenário 7: Optimização total (todas as deduções ao máximo) ───────
        ded_optimal = {k: v["limit"] / v["rate"] for k, v in DEDUCTION_LIMITS.items()}
        s_opt = _scenario(
            "optimal",
            "Otimização total (todos os limites)",
            ded_optimal,
            ["Maximizar todas as categorias de dedução",
             "PPR + Saúde + Educação + Habitação + Restauração ao limite"],
        )
        if s_opt:
            scenarios.append(s_opt)

        # Ordenar por poupança DESC
        scenarios.sort(key=lambda x: -x["tax_saving_eur"])

        # Adicionar sempre a baseline como primeiro item para contexto
        scenarios.insert(0, {
            "scenario_id": "baseline",
            "label": "Situação actual",
            "tax_saving_eur": 0.0,
            "tax_saving_pct": 0.0,
            "new_result": baseline["result"],
            "new_effective_rate": baseline["effective_rate"],
            "actions": [],
            "status": "baseline",
        })

        return scenarios[:8]  # máximo 8 cenários
