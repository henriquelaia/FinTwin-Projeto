"""
DeductionAgent — classifica transações como dedutíveis/não-dedutíveis
segundo o CIRS (Lei 82/2023 / OE 2024).

Modelo: RandomForestClassifier com features TF-IDF + amount + month.
"""

import math
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import classification_report
from sklearn.model_selection import cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder

MODEL_PATH = Path(__file__).parent.parent.parent / "models" / "deduction_agent.pkl"

DEDUCTION_META = {
    "saude_dedutivel":          {"article": "Art.º 78.º-C CIRS", "rate": 0.15, "limit": 1000.0},
    "educacao_dedutivel":       {"article": "Art.º 78.º-D CIRS", "rate": 0.30, "limit": 800.0},
    "habitacao_dedutivel":      {"article": "Art.º 78.º-E CIRS", "rate": 0.15, "limit": 296.0},
    "encargos_gerais_dedutivel":{"article": "Art.º 78.º-B CIRS", "rate": 0.15, "limit": 250.0},
    "ppr_dedutivel":            {"article": "Art.º 21.º EBF",   "rate": 0.20, "limit": 400.0},
    "nao_dedutivel":            {"article": "n/a",               "rate": 0.0,  "limit": 0.0},
}


def _amount_bucket(amount: float) -> str:
    if amount <= 50:
        return "baixo"
    if amount <= 200:
        return "medio"
    if amount <= 1000:
        return "alto"
    return "muito_alto"


def _normalize(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-záàâãéèêíìîóòôõúùûçñ0-9 ]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _build_features(merchants: list[str], amounts: list[float], months: list[int]) -> pd.DataFrame:
    return pd.DataFrame({
        "merchant_norm": [_normalize(m) for m in merchants],
        "amount_log": [math.log1p(a) for a in amounts],
        "amount_bucket": [_amount_bucket(a) for a in amounts],
        "month_sin": [math.sin(2 * math.pi * m / 12) for m in months],
        "month_cos": [math.cos(2 * math.pi * m / 12) for m in months],
    })


class DeductionAgent:
    def __init__(self) -> None:
        self._pipeline: Pipeline | None = None
        self._le = LabelEncoder()
        self._tfidf = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), max_features=60)
        self._is_trained = False
        self._cv_accuracy: float = 0.0
        self._load()

    # ── Persistência ──────────────────────────────────────────────────────────

    def _load(self) -> None:
        if MODEL_PATH.exists():
            saved = joblib.load(MODEL_PATH)
            self._pipeline = saved["pipeline"]
            self._le = saved["le"]
            self._tfidf = saved["tfidf"]
            self._cv_accuracy = saved.get("cv_accuracy", 0.0)
            self._is_trained = True

    def _save(self) -> None:
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "pipeline": self._pipeline,
            "le": self._le,
            "tfidf": self._tfidf,
            "cv_accuracy": self._cv_accuracy,
        }, MODEL_PATH)

    # ── Treino ────────────────────────────────────────────────────────────────

    def train(self, csv_path: str) -> dict:
        df = pd.read_csv(csv_path)
        merchants = df["merchant"].tolist()
        amounts = df["amount"].tolist()
        months = df["month"].tolist()
        labels = df["deduction_type"].tolist()

        # TF-IDF sobre merchant normalizado
        merchant_norms = [_normalize(m) for m in merchants]
        X_tfidf = self._tfidf.fit_transform(merchant_norms)

        # Features numéricas
        feats = _build_features(merchants, amounts, months)
        amount_log = feats["amount_log"].values.reshape(-1, 1)
        month_sin = feats["month_sin"].values.reshape(-1, 1)
        month_cos = feats["month_cos"].values.reshape(-1, 1)

        X = np.hstack([X_tfidf.toarray(), amount_log, month_sin, month_cos])
        y = self._le.fit_transform(labels)

        clf = RandomForestClassifier(
            n_estimators=200,
            max_depth=25,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        clf.fit(X, y)
        self._pipeline = clf

        # Cross-validation
        cv_scores = cross_val_score(clf, X, y, cv=5, scoring="accuracy")
        self._cv_accuracy = float(cv_scores.mean())

        # Relatório de classificação
        y_pred = clf.predict(X)
        report = classification_report(
            y, y_pred,
            target_names=self._le.classes_,
            output_dict=True,
        )

        self._is_trained = True
        self._save()

        return {
            "cv_accuracy": round(self._cv_accuracy, 4),
            "train_samples": len(labels),
            "classes": list(self._le.classes_),
            "classification_report": report,
        }

    # ── Inferência ────────────────────────────────────────────────────────────

    def _predict_one(self, merchant: str, amount: float, month: int) -> dict:
        merchant_norm = _normalize(merchant)
        x_tfidf = self._tfidf.transform([merchant_norm])
        x_num = np.array([[
            math.log1p(amount),
            math.sin(2 * math.pi * month / 12),
            math.cos(2 * math.pi * month / 12),
        ]])
        X = np.hstack([x_tfidf.toarray(), x_num])

        proba = self._pipeline.predict_proba(X)[0]  # type: ignore[union-attr]
        top_idx = int(np.argmax(proba))
        confidence = float(proba[top_idx])
        deduction_type = self._le.inverse_transform([top_idx])[0]

        meta = DEDUCTION_META[deduction_type]
        estimated_deduction = round(amount * meta["rate"], 2) if meta["rate"] > 0 else 0.0

        return {
            "deduction_type": deduction_type,
            "confidence": round(confidence, 4),
            "legal_article": meta["article"],
            "deduction_rate": meta["rate"],
            "limit_eur": meta["limit"],
            "estimated_deduction_eur": estimated_deduction,
            "is_deductible": deduction_type != "nao_dedutivel",
        }

    def classify_batch(self, transactions: list[dict]) -> list[dict]:
        """Classifica lista de transações — aceita qualquer formato de transação."""
        if not self._is_trained:
            return []

        results = []
        for tx in transactions:
            merchant = str(tx.get("description") or tx.get("merchant") or "")
            amount = abs(float(tx.get("amount") or 0))
            try:
                from datetime import datetime
                date_str = str(tx.get("transaction_date") or tx.get("date") or "")
                month = datetime.fromisoformat(date_str[:10]).month
            except Exception:
                month = 6

            if not merchant or amount <= 0:
                continue

            prediction = self._predict_one(merchant, amount, month)
            results.append({
                "transaction_id": tx.get("id") or tx.get("transaction_id"),
                "merchant": merchant,
                "amount": amount,
                **prediction,
            })

        # ordenar por confidence DESC, dedutíveis primeiro
        results.sort(key=lambda x: (not x["is_deductible"], -x["confidence"]))
        return results

    def is_trained(self) -> bool:
        return self._is_trained

    def metrics(self) -> dict:
        return {
            "is_trained": self._is_trained,
            "cv_accuracy": self._cv_accuracy,
            "model_path": str(MODEL_PATH),
        }
