import shap
import joblib
import matplotlib.pyplot as plt
import os
import numpy as np
import base64
from io import BytesIO

class ModelExplainer:

    def __init__(self, model_path="models/best_model.pkl"):
        # Make sure the file exists before loading in production
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
        else:
            self.model = None

    def _plot_to_base64(self):
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches='tight')
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    # --------------------------------
    # 1️⃣ Global Explanation
    # --------------------------------
    def generate_global_explanation(self, X_train, feature_names):
        print("\n🔎 Generating Global SHAP Explanation...")

        explainer = shap.Explainer(self.model, X_train)
        shap_values = explainer(X_train, check_additivity=False)

        plt.figure()
        shap.summary_plot(shap_values, X_train, feature_names=feature_names, show=False)
        plt.tight_layout()
        
        base64_str = self._plot_to_base64()
        print("📊 Global SHAP Summary Plot Generated (base64)!")
        return base64_str

    # --------------------------------
    # 2️⃣ Local Explanation
    # --------------------------------
    def generate_local_explanation(self, X_sample, feature_names):
        print("\n🔎 Generating Local SHAP Explanation...")

        explainer = shap.Explainer(self.model, X_sample)
        shap_values = explainer(X_sample, check_additivity=False)

        plt.figure()
        # shap depends on structure; using waterfal
        if hasattr(shap.plots, 'waterfall'):
            shap.plots.waterfall(shap_values[0], show=False)
        else:
            # Fallback if waterfall isn't in this shap version exactly this way
            shap.plots.force(explainer.expected_value, shap_values.values[0], X_sample.iloc[0,:], feature_names=feature_names, matplotlib=True, show=False)
            
        base64_str = self._plot_to_base64()
        print("📌 Local SHAP Explanation Generated (base64)!")
        return base64_str
