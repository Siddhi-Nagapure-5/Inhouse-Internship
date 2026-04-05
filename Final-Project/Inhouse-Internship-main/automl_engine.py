import os
import json
import joblib
import numpy as np
from sklearn.model_selection import cross_val_score, RandomizedSearchCV
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.svm import SVC
from sklearn.metrics import classification_report, roc_auc_score, confusion_matrix

class CustomAutoML:

    def __init__(self):
        self.models = {
            "LogisticRegression": LogisticRegression(max_iter=1000),
            "RandomForest": RandomForestClassifier(),
            "GradientBoosting": GradientBoostingClassifier(),
            "SVM": SVC(probability=True)
        }
        
        self.param_dists = {
            "LogisticRegression": {"C": [0.1, 1, 10]},
            "RandomForest": {"n_estimators": [50, 100, 200], "max_depth": [None, 10, 20]},
            "GradientBoosting": {"n_estimators": [50, 100, 200], "learning_rate": [0.01, 0.1, 0.2]},
            "SVM": {"C": [0.1, 1, 10], "gamma": ["scale", "auto"]}
        }

        self.results = {}
        os.makedirs("models", exist_ok=True)
        os.makedirs("reports", exist_ok=True)

    def evaluate_models(self, X_train, y_train):
        print("\n🔍 Starting Cross-Validation...\n")
        for name, model in self.models.items():
            scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
            avg_score = np.mean(scores)
            self.results[name] = {"scores": scores.tolist(), "average_accuracy": avg_score}
            print(f"{name} → CV Accuracy: {avg_score:.4f}")
        return self.results

    def tune_top_models(self, X_train, y_train):
        print("\n⚙️ Tuning Top 2 Models...")
        sorted_models = sorted(self.results.items(), key=lambda x: x[1]['average_accuracy'], reverse=True)
        top_2_names = [m[0] for m in sorted_models[:2]]
        
        best_overall_model = None
        best_overall_score = 0
        best_overall_name = ""
        
        for name in top_2_names:
            print(f"Tuning {name}...")
            model = self.models[name]
            param_dist = self.param_dists[name]
            
            search = RandomizedSearchCV(model, param_dist, n_iter=5, cv=3, scoring='accuracy', random_state=42)
            search.fit(X_train, y_train)
            
            print(f"{name} best CV score after tuning: {search.best_score_:.4f}")
            if search.best_score_ >= best_overall_score:
                best_overall_score = search.best_score_
                best_overall_model = search.best_estimator_
                best_overall_name = name
                
        print(f"\n🏆 Best Overall Model Selected: {best_overall_name}")
        self.results['best_tuned_model'] = best_overall_name
        
        model_path = f"models/best_model.pkl"
        joblib.dump(best_overall_model, model_path)
        print(f"💾 Best Model Saved at: {model_path}")
        
        return best_overall_model, best_overall_name

    def evaluate_on_test(self, model, X_test, y_test):
        print("\n📈 Evaluating on Test Set...")
        y_pred = model.predict(X_test)
        
        if len(np.unique(y_test)) == 2:
            try:
                y_prob = model.predict_proba(X_test)[:, 1]
                roc_auc = roc_auc_score(y_test, y_prob)
            except:
                roc_auc = None
        else:
            roc_auc = None
            
        report = classification_report(y_test, y_pred, output_dict=True)
        conf_matrix = confusion_matrix(y_test, y_pred).tolist()
        
        test_results = {
            "classification_report": report,
            "confusion_matrix": conf_matrix,
            "roc_auc_score": roc_auc
        }
        
        self.results['test_evaluation'] = test_results
        print("Classification Report:")
        print(classification_report(y_test, y_pred))
        return test_results

    def save_results(self):
        with open("reports/automl_results.json", "w") as f:
            json.dump(self.results, f, indent=4)
        print("📊 AutoML Results Saved Successfully!")
