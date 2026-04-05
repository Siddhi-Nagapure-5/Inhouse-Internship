import shap
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os
import numpy as np
import base64
from io import BytesIO
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression


class ModelExplainer:

    def __init__(self, model_path="models/best_model.pkl"):
        if os.path.exists(model_path):
            self.model = joblib.load(model_path)
        else:
            self.model = None

    def _get_explainer(self, X_background):
        """Return the correct SHAP explainer based on model type."""
        model = self.model
        if isinstance(model, (RandomForestClassifier, GradientBoostingClassifier)):
            return shap.TreeExplainer(model), "tree"
        elif isinstance(model, LogisticRegression):
            return shap.LinearExplainer(model, X_background), "linear"
        else:
            background = shap.sample(X_background, min(100, len(X_background)))
            return shap.KernelExplainer(model.predict_proba, background), "kernel"

    def _extract_single_shap(self, sv, expected_value):
        """
        Given raw shap_values output, extract a 1-D array for the first sample
        and a scalar base_value — handles all SHAP output shapes:

          - 3-D ndarray  (n_samples, n_features, n_classes)  → sv[0, :, 0]
          - 2-D ndarray  (n_samples, n_features)              → sv[0]
          - list of arrays  [class0_array, class1_array, ...]  → list[0][0]
        """
        if isinstance(sv, list):
            # Older SHAP API: list per class, each element (n_samples, n_features)
            sv_1d = np.array(sv[0][0])
            base = expected_value[0] if hasattr(expected_value, '__len__') else float(expected_value)
        elif isinstance(sv, np.ndarray):
            if sv.ndim == 3:
                # New SHAP API for tree models: (samples, features, classes)
                sv_1d = sv[0, :, 0]
                base = expected_value[0] if hasattr(expected_value, '__len__') else float(expected_value)
            elif sv.ndim == 2:
                # Binary / regression: (samples, features)
                sv_1d = sv[0]
                base = float(expected_value[0]) if hasattr(expected_value, '__len__') else float(expected_value)
            else:
                sv_1d = sv
                base = float(expected_value)
        else:
            sv_1d = np.array(sv)
            base = float(expected_value) if not hasattr(expected_value, '__len__') else float(expected_value[0])
        return sv_1d, base

    def _plot_to_base64(self):
        buf = BytesIO()
        plt.savefig(buf, format="png", bbox_inches='tight', dpi=100)
        plt.close('all')
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    # --------------------------------
    # 1️⃣ Global Explanation
    # --------------------------------
    def generate_global_explanation(self, X_train, feature_names):
        print("\n🔎 Generating Global SHAP Explanation...")
        explainer, kind = self._get_explainer(X_train)

        if kind in ("tree", "linear"):
            sv = explainer.shap_values(X_train)
        else:
            sample = X_train[:50]
            sv = explainer.shap_values(sample)
            X_train = sample  # plot against the same sample

        # For 3-D arrays (samples, features, classes), take class 0 for global summary
        if isinstance(sv, np.ndarray) and sv.ndim == 3:
            sv = sv[:, :, 0]  # (samples, features) for class 0

        plt.figure()
        shap.summary_plot(sv, X_train, feature_names=feature_names, show=False)
        plt.tight_layout()
        result = self._plot_to_base64()
        print("📊 Global SHAP Summary Plot Generated!")
        return result

    # --------------------------------
    # 2️⃣ Local Explanation
    # --------------------------------
    def generate_local_explanation(self, X_sample, feature_names):
        print("\n🔎 Generating Local SHAP Explanation...")
        explainer, kind = self._get_explainer(X_sample)

        if kind in ("tree", "linear"):
            sv = explainer.shap_values(X_sample)
        else:
            sv = explainer.shap_values(X_sample)

        sv_1d, base_val = self._extract_single_shap(sv, explainer.expected_value)

        exp = shap.Explanation(
            values=sv_1d,
            base_values=float(base_val),
            data=X_sample[0],
            feature_names=feature_names,
        )
        plt.figure()
        shap.plots.waterfall(exp, show=False)
        result = self._plot_to_base64()
        print("📌 Local SHAP Explanation Generated!")
        return result

    # --------------------------------
    # 3️⃣ Structured Local Data (JSON)
    # --------------------------------
    def generate_local_explanation_data(self, X_sample, feature_names):
        """
        Returns structured SHAP data as a dict for plain-English UI rendering.

        Returns:
          {
            base_value: float,
            predicted_value: float,
            features: [{feature, raw_value, shap_value, direction, rank}]
          }
        """
        explainer, kind = self._get_explainer(X_sample)
        sv = explainer.shap_values(X_sample)
        sv_1d, base_val = self._extract_single_shap(sv, explainer.expected_value)
        predicted_value = float(base_val) + float(sv_1d.sum())

        records = []
        for i, feat in enumerate(feature_names):
            shap_val = float(sv_1d[i])
            raw_val = float(X_sample[0][i])
            records.append({
                "feature": feat,
                "raw_value": round(raw_val, 4),
                "shap_value": round(shap_val, 4),
                "abs_shap": abs(shap_val),
                "direction": "positive" if shap_val >= 0 else "negative",
            })

        # Sort by absolute contribution (most impactful first)
        records.sort(key=lambda x: x["abs_shap"], reverse=True)
        for i, r in enumerate(records):
            r["rank"] = i + 1
            del r["abs_shap"]

        return {
            "base_value": round(float(base_val), 4),
            "predicted_value": round(predicted_value, 4),
            "features": records,
        }
