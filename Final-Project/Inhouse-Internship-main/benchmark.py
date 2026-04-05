import pandas as pd
import json
import os
from datetime import datetime
from data_pipeline import load_data, handle_missing_values, encode_categorical
from sklearn.metrics import roc_auc_score, f1_score, accuracy_score
from sklearn.preprocessing import StandardScaler
import joblib


class CrossDatasetBenchmark:

    def __init__(self, models_dir="models", reports_dir="reports"):
        self.models_dir = models_dir
        self.reports_dir = reports_dir
        os.makedirs(self.reports_dir, exist_ok=True)

    def _infer_target(self, df: pd.DataFrame, hint: str = None) -> str:
        """
        Try to find the target/label column in the benchmark dataset.
        Priority: hint column → common names → last column.
        """
        common_names = [hint, "target", "label", "outcome", "Outcome", "class",
                        "Target", "Label", "Class", "output", "Output", "y"]
        for name in common_names:
            if name and name in df.columns:
                print(f"🎯 Benchmark target column inferred: '{name}'")
                return name
        # Fallback: last column
        last = df.columns[-1]
        print(f"⚠️  Could not infer target — using last column: '{last}'")
        return last

    def _load_feature_meta(self):
        """Load the feature names and target saved during training."""
        meta_path = os.path.join(self.models_dir, "feature_names.json")
        if os.path.exists(meta_path):
            with open(meta_path, "r") as f:
                return json.load(f)
        return None

    def run_benchmark(self, model_file, original_results_file, benchmark_csv, target_column=None):
        print(f"\n🚀 Running Cross-Dataset Benchmark on {benchmark_csv}...")

        # 1. Load Model
        model_path = os.path.join(self.models_dir, model_file)
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model {model_path} not found. Train a model first!")
        model = joblib.load(model_path)

        # 2. Load saved training feature meta
        feature_meta = self._load_feature_meta()
        training_features = feature_meta["feature_names"] if feature_meta else None
        print(f"📋 Training features: {training_features}")

        # 3. Load and prep benchmark dataset
        df = load_data(benchmark_csv)
        df = handle_missing_values(df)
        df, _ = encode_categorical(df)

        # 4. Auto-infer target column from the BENCHMARK dataset itself
        bench_target = self._infer_target(df, hint=target_column)

        # 5. Align features
        if training_features:
            # Find which training features exist in benchmark dataset
            available = [f for f in training_features if f in df.columns]
            missing = [f for f in training_features if f not in df.columns]

            if missing:
                print(f"⚠️  Features not found in benchmark dataset: {missing}")
                print(f"   Using only {len(available)}/{len(training_features)} original features")

            if len(available) == 0:
                raise ValueError(
                    f"No overlapping features between training ({training_features}) "
                    f"and benchmark ({list(df.columns)}). "
                    "This benchmark dataset has completely different columns from the training set."
                )

            X_bench = df[available]
            y_bench = df[bench_target].dropna()
            X_bench = X_bench.loc[y_bench.index]
        else:
            # Fallback: drop the inferred target
            df = df.dropna(subset=[bench_target])
            X_bench = df.drop(columns=[bench_target])
            y_bench = df[bench_target]

        # 6. Scale (fit on benchmark to avoid leakage, same as training pipeline)
        scaler = StandardScaler()
        X_bench_scaled = scaler.fit_transform(X_bench)

        # 7. Evaluate
        y_pred = model.predict(X_bench_scaled)
        try:
            y_prob = model.predict_proba(X_bench_scaled)[:, 1]
            roc_auc_bench = roc_auc_score(y_bench, y_prob)
        except Exception:
            roc_auc_bench = None

        bench_acc = accuracy_score(y_bench, y_pred)
        bench_f1 = f1_score(y_bench, y_pred, average='weighted')

        # 8. Load original training results to compare
        orig_acc, orig_f1, orig_roc = None, None, None
        orig_path = os.path.join(self.reports_dir, original_results_file)
        if os.path.exists(orig_path):
            with open(orig_path, "r") as f:
                orig_results = json.load(f)
                if 'test_evaluation' in orig_results:
                    orig_acc = orig_results['test_evaluation']['classification_report'].get('accuracy')
                    orig_roc = orig_results['test_evaluation'].get('roc_auc_score')
                    orig_f1 = orig_results['test_evaluation']['classification_report'].get('weighted avg', {}).get('f1-score')

        # 9. Build comparison report
        comparison = {
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "dataset": benchmark_csv,
            "features_matched": len(available) if training_features else "unknown",
            "features_total": len(training_features) if training_features else "unknown",
            "original_performance": {
                "accuracy": orig_acc,
                "f1_score": orig_f1,
                "roc_auc": orig_roc
            },
            "benchmark_performance": {
                "accuracy": bench_acc,
                "f1_score": bench_f1,
                "roc_auc": roc_auc_bench
            }
        }

        bench_report_path = os.path.join(self.reports_dir, "benchmark_comparison.json")
        if os.path.exists(bench_report_path):
            with open(bench_report_path, "r") as f:
                try:
                    data = json.load(f)
                except json.JSONDecodeError:
                    data = []
        else:
            data = []

        data.append(comparison)
        with open(bench_report_path, "w") as f:
            json.dump(data, f, indent=4)

        print(f"✅ Benchmarking Complete!")
        print(f"   Original Accuracy : {orig_acc:.3f}" if orig_acc else "   Original Accuracy : N/A")
        print(f"   Benchmark Accuracy: {bench_acc:.3f}")
        return comparison


if __name__ == "__main__":
    benchmark = CrossDatasetBenchmark()
    # benchmark.run_benchmark("best_model.pkl", "automl_results.json", "data/dataset2.csv")
