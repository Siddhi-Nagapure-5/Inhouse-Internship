from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import os
import json

from data_pipeline import run_full_pipeline
from benchmark import CrossDatasetBenchmark

app = FastAPI(title="Explainable AutoML Pipeline")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("data", exist_ok=True)
os.makedirs("models", exist_ok=True)
os.makedirs("reports", exist_ok=True)
os.makedirs("logs", exist_ok=True)

# Application state for the prototype
GLOBAL_RESULTS = {}
LAST_UPLOADED_FILE_ID = None
UPLOADED_FILES = []  # Tracks all uploaded datasets: [{file_id, filename, path}]

@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    global LAST_UPLOADED_FILE_ID, UPLOADED_FILES
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    file_id = str(uuid.uuid4())
    LAST_UPLOADED_FILE_ID = file_id
    file_path = f"data/{file_id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    entry = {"file_id": file_id, "filename": file.filename, "path": file_path}
    UPLOADED_FILES.append(entry)
        
    return {"message": "File uploaded successfully", "file_id": file_id, "filename": file.filename, "path": file_path}


@app.get("/datasets")
async def list_datasets():
    """Return all datasets uploaded in this server session."""
    # Also scan data/ folder to pick up files from previous sessions
    scanned = []
    if os.path.exists("data"):
        for fname in sorted(os.listdir("data")):
            if fname.endswith(".csv") and not fname.startswith("bench_"):
                parts = fname.split("_", 1)
                file_id = parts[0] if len(parts) == 2 else fname
                filename = parts[1] if len(parts) == 2 else fname
                # Check if already tracked
                if not any(f["file_id"] == file_id for f in UPLOADED_FILES):
                    scanned.append({"file_id": file_id, "filename": filename, "path": f"data/{fname}"})
    return UPLOADED_FILES + scanned


@app.get("/dataset/{file_id}/columns")
async def get_columns(file_id: str):
    """Return column names for a given uploaded dataset."""
    import pandas as pd
    matching = [f for f in os.listdir("data") if f.startswith(file_id) and f.endswith(".csv")]
    if not matching:
        raise HTTPException(status_code=404, detail="Dataset not found")
    df = pd.read_csv(f"data/{matching[0]}", nrows=0)  # only header
    return {"columns": df.columns.tolist()}


@app.get("/dataset/{file_id}/quality")
async def get_quality(file_id: str):
    """Compute real data quality metrics from the uploaded CSV."""
    import pandas as pd
    import numpy as np

    matching = [f for f in os.listdir("data") if f.startswith(file_id) and f.endswith(".csv")]
    if not matching:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = pd.read_csv(f"data/{matching[0]}")
    total_cells = df.shape[0] * df.shape[1]

    # Completeness: % of non-null cells
    null_cells = df.isnull().sum().sum()
    completeness = round((1 - null_cells / total_cells) * 100, 1) if total_cells > 0 else 100.0

    # Uniqueness: % of non-duplicate rows
    duplicate_rows = df.duplicated().sum()
    uniqueness = round((1 - duplicate_rows / df.shape[0]) * 100, 1) if df.shape[0] > 0 else 100.0

    # Consistency: % of columns that have a single inferred dtype (no object cols with mixed content)
    consistent_cols = 0
    for col in df.columns:
        if df[col].dtype != object:
            consistent_cols += 1
        else:
            # Check if object column is consistently one parseable type
            non_null = df[col].dropna()
            if len(non_null) == 0:
                consistent_cols += 1
            else:
                try:
                    pd.to_numeric(non_null)
                    consistent_cols += 0.5  # Mixed: numeric stored as string
                except ValueError:
                    consistent_cols += 1  # Purely categorical — OK
    consistency = round((consistent_cols / df.shape[1]) * 100, 1) if df.shape[1] > 0 else 100.0

    # Overall quality score (weighted)
    overall = round(completeness * 0.4 + uniqueness * 0.3 + consistency * 0.3, 0)

    # Schema details per column
    schema = []
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        null_pct = round(null_count / df.shape[0] * 100, 1) if df.shape[0] > 0 else 0.0
        unique_count = int(df[col].nunique())
        schema.append({
            "column": col,
            "dtype": str(df[col].dtype),
            "null_count": null_count,
            "null_pct": null_pct,
            "unique_count": unique_count,
            "unique_pct": round(unique_count / df.shape[0] * 100, 1) if df.shape[0] > 0 else 0.0,
        })

    # Missing values per column (for chart)
    missing_chart = [
        {"column": col, "missing_pct": s["null_pct"]}
        for col, s in zip(df.columns, schema)
        if s["null_pct"] > 0
    ] or [{"column": "No missing values", "missing_pct": 0}]

    return {
        "rows": df.shape[0],
        "columns": df.shape[1],
        "completeness": completeness,
        "uniqueness": uniqueness,
        "consistency": consistency,
        "overall": int(overall),
        "null_cells": int(null_cells),
        "duplicate_rows": int(duplicate_rows),
        "schema": schema,
        "missing_chart": missing_chart,
    }


@app.post("/curate/{file_id}")
async def curate_data(file_id: str):
    # In this dynamic architecture we will just pass for /curate 
    # since run_full_pipeline handles curation and training together linearly.
    return {"message": f"Data curation acknowledged for file {file_id}", "status": "Ready"}

@app.post("/train/{file_id}")
async def train_automl(file_id: str, target_column: str = None):
    """Train AutoML on the specified dataset. Optionally specify which column is the target."""
    # If the frontend passes "demo123", fall back to the last uploaded file
    if file_id == "demo123" and LAST_UPLOADED_FILE_ID:
        file_id = LAST_UPLOADED_FILE_ID
        
    matching_files = [f for f in os.listdir("data") if f.startswith(file_id) and f.endswith(".csv")]
    
    if not matching_files:
        if file_id == "demo123":
            matching_files = [f for f in os.listdir("data") if f.endswith(".csv")]
        if not matching_files:
            raise HTTPException(status_code=404, detail=f"File associated with {file_id} not found")
        
    file_path = f"data/{matching_files[-1]}"
    
    try:
        results = run_full_pipeline(file_path, target_column=target_column)
        run_id = results["run_id"]
        GLOBAL_RESULTS[run_id] = results
        GLOBAL_RESULTS["latest"] = results
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/explain/{run_id}")
async def explain_model(run_id: str):
    target = GLOBAL_RESULTS.get(run_id) or GLOBAL_RESULTS.get("latest")
    if target:
        return {
            "status": "Success",
            "base64_str": target.get("global_shap"),
            "local_base64_str": target.get("local_shap"),
            "shap_data": target.get("shap_data"),
        }
    return {"status": "Error", "message": "No runs completed yet."}


@app.get("/results/latest")
async def get_latest_results():
    if "latest" in GLOBAL_RESULTS:
        return GLOBAL_RESULTS["latest"]
    return {"status": "Error", "message": "No runs completed yet."}

@app.get("/provenance")
async def get_provenance():
    try:
        with open("logs/experiment_log.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return []

@app.post("/benchmark")
async def run_benchmark(file: UploadFile = File(...)):
    """Accept a new CSV, run champion model against it, return comparison."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    bench_path = f"data/bench_{file.filename}"
    with open(bench_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    target_col = "target"
    if "latest" in GLOBAL_RESULTS and GLOBAL_RESULTS["latest"].get("target"):
        target_col = GLOBAL_RESULTS["latest"]["target"]

    try:
        benchmarker = CrossDatasetBenchmark()
        result = benchmarker.run_benchmark(
            model_file="best_model.pkl",
            original_results_file="automl_results.json",
            benchmark_csv=bench_path,
            target_column=target_col
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/benchmark/history")
async def get_benchmark_history():
    """Return all past benchmark comparison results."""
    bench_path = "reports/benchmark_comparison.json"
    if os.path.exists(bench_path):
        with open(bench_path, "r") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
