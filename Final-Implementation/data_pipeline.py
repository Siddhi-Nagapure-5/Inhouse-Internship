import pandas as pd
import numpy as np
import json
import os
from datetime import datetime
from provenance import ProvenanceTracker
from explainability import ModelExplainer
from automl_engine import CustomAutoML
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.impute import KNNImputer
from sklearn.feature_selection import mutual_info_classif
from imblearn.over_sampling import SMOTE


# ----------------------------
# 1️⃣ DATA REPORT
# ----------------------------
def generate_data_report(df, target_column):
    report = {
        "total_rows": df.shape[0],
        "total_columns": df.shape[1],
        "missing_values": df.isnull().sum().to_dict(),
        "class_distribution": df[target_column].value_counts().to_dict()
    }

    print("\n📊 Data Report:")
    print(report)

    # Save report to file
    os.makedirs("reports", exist_ok=True)
    with open("reports/data_report.json", "w") as f:
        json.dump(report, f, indent=4)

    return report


# ----------------------------
# 2️⃣ LOAD DATA
# ----------------------------
def load_data(file_path):
    df = pd.read_csv(file_path)
    print("✅ Dataset Loaded Successfully")
    print(df.head())
    return df


# ----------------------------
# 3️⃣ REMOVE DUPLICATES
# ----------------------------
def remove_duplicates(df):
    initial_rows = df.shape[0]
    df = df.drop_duplicates()
    final_rows = df.shape[0]
    print(f"🧹 Removed {initial_rows - final_rows} duplicate rows")
    return df


# ----------------------------
# 4️⃣ HANDLE MISSING VALUES
# ----------------------------
def handle_missing_values(df):
    print("🔍 Handling Missing Values using KNNImputer...")

    numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
    if len(numeric_cols) > 0:
        imputer = KNNImputer(n_neighbors=5)
        df[numeric_cols] = imputer.fit_transform(df[numeric_cols])

    cat_cols = df.select_dtypes(exclude=['int64', 'float64']).columns
    for col in cat_cols:
        if df[col].isnull().sum() > 0:
            df[col].fillna(df[col].mode()[0], inplace=True)

    return df


# ----------------------------
# 5️⃣ REMOVE OUTLIERS (IQR)
# ----------------------------
def remove_outliers(df, target_column):
    print("📉 Removing Outliers...")
    initial_rows = df.shape[0]

    numeric_cols = df.drop(columns=[target_column]).select_dtypes(include=np.number).columns

    for col in numeric_cols:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1

        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR

        df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]

    final_rows = df.shape[0]
    print(f"📉 Removed {initial_rows - final_rows} outlier rows")

    return df


# ----------------------------
# 6️⃣ ENCODE CATEGORICAL
# ----------------------------
def encode_categorical(df):
    print("🔤 Encoding Categorical Columns...")
    label_encoders = {}

    for column in df.select_dtypes(include=['object']).columns:
        le = LabelEncoder()
        df[column] = le.fit_transform(df[column])
        label_encoders[column] = le

    return df, label_encoders


# ----------------------------
# 6.5️⃣ FEATURE SELECTION
# ----------------------------
def select_features(df, target_column, threshold=0.01):
    print("🧠 Selecting Features using Mutual Information...")
    X = df.drop(columns=[target_column])
    y = df[target_column]
    
    mi_scores = mutual_info_classif(X, y, random_state=42)
    features_to_keep = X.columns[mi_scores > threshold].tolist()
    
    features_to_keep.append(target_column)
    print(f"📉 Dropped {X.shape[1] - (len(features_to_keep) - 1)} features with low mutual info.")
    
    return df[features_to_keep]


# ----------------------------
# 6.6️⃣ BALANCE CLASSES (SMOTE)
# ----------------------------
def balance_classes(X_train, y_train):
    class_counts = pd.Series(y_train).value_counts()
    min_class_ratio = class_counts.min() / class_counts.sum()
    
    if min_class_ratio < 0.3:
        print(f"⚖️ Minority class ratio is {min_class_ratio:.2f} (< 0.3). Applying SMOTE...")
        smote = SMOTE(random_state=42)
        X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
        return X_train_res, y_train_res
    else:
        print(f"✅ Class distribution is balanced (ratio {min_class_ratio:.2f}). Skipping SMOTE.")
        return X_train, pd.Series(y_train)


# ----------------------------
# 7️⃣ SPLIT + SCALE (NO LEAKAGE)
# ----------------------------
def split_data(df, target_column):
    print("✂ Splitting Dataset...")

    X = df.drop(target_column, axis=1)
    y = df[target_column]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y  # Important for classification
    )

    scaler = StandardScaler()

    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    print("📏 Scaling Completed (No Data Leakage)")

    return X_train, X_test, y_train, y_test, scaler



# ----------------------------
# 8️⃣ MAIN EXECUTION
# ----------------------------
# ----------------------------
# 8️⃣ MAIN EXECUTION
# ----------------------------
def run_full_pipeline(file_path="data/heart.csv", target_column=None):

    tracker = ProvenanceTracker()
    dataset_name = os.path.basename(file_path)
    tracker.start_experiment(dataset_name=dataset_name)

    print("\n🚀 Starting Full ML Pipeline...\n")

    # ----------------------------
    # 🔹 DATA LOADING
    # ----------------------------
    df = load_data(file_path)
    
    if target_column is None:
        target_column = df.columns[-1]
        print(f"🎯 Automatically inferred target column: {target_column}")

    tracker.log_row_counts(before=df.shape[0], after=None)

    generate_data_report(df, target_column)

    # ----------------------------
    # 🔹 DATA CLEANING
    # ----------------------------
    df = remove_duplicates(df)
    tracker.log_cleaning_step("Removed Duplicates")

    df = handle_missing_values(df)
    tracker.log_cleaning_step("Handled Missing Values")

    rows_before_outliers = df.shape[0]
    df = remove_outliers(df, target_column)
    tracker.log_cleaning_step("Removed Outliers")
    tracker.log_row_counts(rows_before_outliers, df.shape[0])

    df, label_encoders = encode_categorical(df)
    tracker.log_cleaning_step("Encoded Categorical Variables")
    
    num_features_before = df.shape[1] - 1
    df = select_features(df, target_column)
    tracker.log_cleaning_step(f"Feature Selection (kept {df.shape[1]-1}/{num_features_before})")

    # ----------------------------
    # 🔹 SPLIT + SCALE
    # ----------------------------
    X_train, X_test, y_train, y_test, scaler = split_data(df, target_column)
    
    # ----------------------------
    # 🔹 BALANCE CLASSES (SMOTE)
    # ----------------------------
    X_train, y_train = balance_classes(X_train, y_train)
    
    tracker.log_split_shapes(X_train.shape, X_test.shape)

    # ----------------------------
    # 🔹 AUTO ML PHASE
    # ----------------------------
    automl = CustomAutoML()

    results = automl.evaluate_models(X_train, y_train)

    best_model, best_model_name = automl.tune_top_models(X_train, y_train)

    test_results = automl.evaluate_on_test(best_model, X_test, y_test)

    # Log advanced metadata
    if 'accuracy' in test_results['classification_report']:
        tracker.log_test_accuracy(test_results['classification_report']['accuracy'])

    automl.save_results()

    # ----------------------------
    # 🔎 EXPLAINABILITY PHASE
    # ----------------------------
    from explainability import ModelExplainer

    explainer = ModelExplainer()

    feature_names = df.drop(target_column, axis=1).columns.tolist()

    # Save feature names for benchmark.py to reference later
    import json as _json
    feature_meta = {"feature_names": list(feature_names), "target": target_column}
    with open("models/feature_names.json", "w") as _f:
        _json.dump(feature_meta, _f)

    global_shap_b64 = explainer.generate_global_explanation(X_train, feature_names)
    local_shap_b64 = explainer.generate_local_explanation(X_train[:1], feature_names)

    # Save to tracker so the UI can fetch it later if needed (optional)
    # Or we just let Explainability load models. 
    # Actually, the ModelExplainer saves its own state or reads from disk.

    # ----------------------------
    # 🔹 SAVE PROVENANCE
    # ----------------------------
    tracker.save_experiment()

    print("\n📦 Final Shapes:")
    print("Train:", X_train.shape)
    print("Test :", X_test.shape)

    print("\n🎉 FULL PIPELINE EXECUTED SUCCESSFULLY!")
    
    return {
        "run_id": tracker.experiment_data["run_id"],
        "dataset": dataset_name,
        "target": target_column,
        "results": test_results,
        "best_model": best_model_name,
        "global_shap": global_shap_b64,
        "local_shap": local_shap_b64,
        "automl_leaderboard": results
    }

if __name__ == "__main__":
    run_full_pipeline("data/heart.csv")
