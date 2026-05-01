"""
Gold Lock ML Service
==================
API Flask para categorização automática de transações financeiras
usando TF-IDF + Random Forest.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os

from app.categorizer import TransactionCategorizer
from app.fiscal_orchestrator import FiscalOrchestrator

app = Flask(__name__)
CORS(app)

# Inicializar o categorizador
categorizer = TransactionCategorizer()

# Inicializar o orquestrador fiscal (carrega modelos se existirem)
fiscal_orchestrator = FiscalOrchestrator()


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'goldlock-ml-service',
        'model_loaded': categorizer.is_loaded(),
    })


@app.route('/categorize', methods=['POST'])
def categorize():
    """
    Categorizar uma ou mais transações.

    Body:
        transactions: list of { description: str, amount: float }

    Returns:
        predictions: list of { category: str, confidence: float }
    """
    data = request.get_json()

    if not data or 'transactions' not in data:
        return jsonify({'error': 'Campo "transactions" é obrigatório'}), 400

    transactions = data['transactions']

    try:
        predictions = categorizer.predict(transactions)
        return jsonify({'predictions': predictions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/retrain', methods=['POST'])
def retrain():
    """
    Re-treinar o modelo com dados corrigidos pelo utilizador.

    Body:
        corrections: list of { description: str, amount: float, category: str }
    """
    data = request.get_json()

    if not data or 'corrections' not in data:
        return jsonify({'error': 'Campo "corrections" é obrigatório'}), 400

    try:
        metrics = categorizer.retrain(data['corrections'])
        return jsonify({
            'status': 'model retrained',
            'metrics': metrics,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/fiscal-assistant/analyze', methods=['POST'])
def fiscal_analyze():
    """
    Análise fiscal completa: classifica deduções, otimiza cenários,
    prevê totais de fim-de-ano e calcula score fiscal.

    Body:
        fiscal_profile: dict | null
        transactions: list[dict]
        current_month: int (1-12)
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Body JSON obrigatório'}), 400

    try:
        result = fiscal_orchestrator.analyze(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/fiscal-assistant/train', methods=['POST'])
def fiscal_train():
    """Re-treina todos os modelos do assistente fiscal com os dados de treino."""
    try:
        result = fiscal_orchestrator.train_all()
        return jsonify({'status': 'trained', 'results': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/fiscal-assistant/metrics', methods=['GET'])
def fiscal_metrics():
    """Métricas dos modelos treinados (CV accuracy, MAE, etc.)."""
    return jsonify(fiscal_orchestrator.metrics())


@app.route('/fiscal-assistant/health', methods=['GET'])
def fiscal_health():
    """Estado dos modelos do assistente fiscal."""
    m = fiscal_orchestrator.metrics()
    return jsonify({
        'status': 'ok',
        'deduction_agent_trained': m['deduction_agent']['is_trained'],
        'predictor_trained': m['predictor_agent']['trained_categories'],
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)
