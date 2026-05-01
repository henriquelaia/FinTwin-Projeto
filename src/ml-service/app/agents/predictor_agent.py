"""
PredictorAgent — prevê o total de cada categoria de dedução no fim do ano fiscal.

Modelo: GradientBoostingRegressor (um por categoria), treinado em perfis sintéticos.
Fallback: extrapolação linear simples quando modelo não está treinado.
"""

import math
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import cross_val_score

MODELS_DIR = Path(__file__).parent.parent.parent / "models"

CATEGORIES = ["saude", "educacao", "habitacao", "restauracao", "ppr"]
# OE 2026 — limite PPR mostrado é o máximo (≤34 anos). Faixas: 35-50→€350, 51+→€300.
# O orquestrador aplica `getPprLimit(age)` ao montante final dedutível.
LIMITS = {"saude": 1000.0, "educacao": 800.0, "habitacao": 296.0, "restauracao": 250.0, "ppr": 400.0}
RATES = {"saude": 0.15, "educacao": 0.30, "habitacao": 0.15, "restauracao": 0.15, "ppr": 0.20}

MONTHS_IN_YEAR = 12


def _model_path(category: str) -> Path:
    return MODELS_DIR / f"predictor_{category}.pkl"


def _build_features(transactions: list[dict], month_of_year: int) -> dict[str, dict]:
    """Agrega transações em features por categoria."""
    monthly: dict[str, list[float]] = {cat: [0.0] * MONTHS_IN_YEAR for cat in CATEGORIES}

    for tx in transactions:
        # Usa deduction_type se já classificado, senão ignora
        dtype = tx.get("deduction_type") or ""
        amount = abs(float(tx.get("amount") or 0))
        try:
            from datetime import datetime
            date_str = str(tx.get("transaction_date") or tx.get("date") or "")
            m = datetime.fromisoformat(date_str[:10]).month - 1  # 0-based
        except Exception:
            m = month_of_year - 1

        cat_map = {
            "saude_dedutivel": "saude",
            "educacao_dedutivel": "educacao",
            "habitacao_dedutivel": "habitacao",
            "encargos_gerais_dedutivel": "restauracao",
            "ppr_dedutivel": "ppr",
        }
        if dtype in cat_map and 0 <= m < MONTHS_IN_YEAR:
            monthly[cat_map[dtype]][m] += amount

    features: dict[str, dict] = {}
    for cat in CATEGORIES:
        vals = monthly[cat][:month_of_year]
        cumulative = sum(vals)
        avg_monthly = cumulative / max(1, month_of_year)
        # slope linear dos últimos 3 meses
        last3 = vals[-3:] if len(vals) >= 3 else vals
        trend_slope = (last3[-1] - last3[0]) / max(1, len(last3) - 1) if len(last3) >= 2 else 0.0

        features[cat] = {
            "cumulative": cumulative,
            "avg_monthly": avg_monthly,
            "trend_slope": trend_slope,
            "months_remaining": MONTHS_IN_YEAR - month_of_year,
            "month_of_year": month_of_year,
        }
        for i, v in enumerate(vals, 1):
            features[cat][f"m{i:02d}"] = v

    return features


class PredictorAgent:
    def __init__(self) -> None:
        self._models: dict[str, GradientBoostingRegressor] = {}
        self._trained_categories: set[str] = set()
        self._mae: dict[str, float] = {}
        self._load()

    def _load(self) -> None:
        for cat in CATEGORIES:
            p = _model_path(cat)
            if p.exists():
                saved = joblib.load(p)
                self._models[cat] = saved["model"]
                self._mae[cat] = saved.get("mae", 0.0)
                self._trained_categories.add(cat)

    def _save(self, category: str, model: Any, mae: float) -> None:
        MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": model, "mae": mae}, _model_path(category))

    def train(self, csv_path: str) -> dict:
        df = pd.read_csv(csv_path)
        results = {}

        for cat in CATEGORIES:
            feature_cols = (
                [f"{cat}_m{i:02d}" for i in range(1, 12)]
                + [f"{cat}_cumulative", f"{cat}_avg_monthly",
                   f"{cat}_trend_slope", "month_of_year"]
            )
            available = [c for c in feature_cols if c in df.columns]
            if not available:
                continue

            X = df[available].fillna(0).values
            y = df[f"{cat}_year_end_actual"].values

            model = GradientBoostingRegressor(
                n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42
            )
            model.fit(X, y)

            cv_scores = cross_val_score(model, X, y, cv=5, scoring="neg_mean_absolute_error")
            mae = float(-cv_scores.mean())
            r2 = float(r2_score(y, model.predict(X)))

            self._models[cat] = model
            self._mae[cat] = mae
            self._trained_categories.add(cat)
            self._save(cat, model, mae)

            results[cat] = {"mae": round(mae, 2), "r2": round(r2, 4), "samples": len(y)}

        return results

    def predict(self, transactions: list[dict], month_of_year: int) -> dict[str, dict]:
        features = _build_features(transactions, month_of_year)
        predictions: dict[str, dict] = {}

        for cat in CATEGORIES:
            feats = features[cat]
            cumulative = feats["cumulative"]
            avg_monthly = feats["avg_monthly"]
            months_rem = feats["months_remaining"]
            limit = LIMITS[cat]
            rate = RATES[cat]

            # Previsão ML se disponível, senão extrapolação linear
            if cat in self._trained_categories:
                feature_cols = (
                    [f"m{i:02d}" for i in range(1, 12)]
                    + ["cumulative", "avg_monthly", "trend_slope", "month_of_year"]
                )
                x_vals = []
                for col in feature_cols:
                    if col in feats:
                        x_vals.append(feats[col])
                    else:
                        x_vals.append(0.0)
                X = np.array(x_vals).reshape(1, -1)
                predicted_year_end = float(max(0, self._models[cat].predict(X)[0]))
                method = "ml"
            else:
                # fallback: extrapolação linear com trend
                trend_factor = 1 + feats["trend_slope"] / max(1, avg_monthly) * 0.5
                predicted_year_end = cumulative + avg_monthly * months_rem * min(max(trend_factor, 0.5), 2.0)
                method = "linear_extrapolation"

            predicted_year_end = round(min(predicted_year_end, limit * 1.5), 2)
            gap = round(limit / rate - predicted_year_end, 2)
            will_reach = predicted_year_end >= (limit / rate * 0.85)

            # Alerta textual
            if predicted_year_end > limit / rate:
                alert = f"Vai ultrapassar o limite. Máximo dedutível: {limit:.0f}€"
            elif will_reach and months_rem > 0:
                months_to_limit = max(1, math.ceil(gap / max(0.01, avg_monthly)))
                alert = f"Previsto atingir o limite em {months_rem - months_to_limit + 1} meses"
            elif avg_monthly < 1 and cumulative < 1:
                alert = "Sem despesas registadas nesta categoria"
            else:
                pct = round(predicted_year_end / (limit / rate) * 100)
                alert = f"Previsto usar {pct}% do limite anual"

            predictions[cat] = {
                "cumulative_so_far": round(cumulative, 2),
                "predicted_year_end": predicted_year_end,
                "limit_expense": round(limit / rate, 2),
                "limit_deduction": limit,
                "gap_eur": gap,
                "will_reach_limit": will_reach,
                "confidence": round(1 - min(1, self._mae.get(cat, 50) / max(1, predicted_year_end + 1)), 3),
                "alert": alert,
                "method": method,
            }

        return predictions

    def is_trained(self) -> bool:
        return len(self._trained_categories) > 0

    def metrics(self) -> dict:
        return {
            "trained_categories": list(self._trained_categories),
            "mae_by_category": {k: round(v, 2) for k, v in self._mae.items()},
        }
