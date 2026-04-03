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

@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    global LAST_UPLOADED_FILE_ID
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
    
    file_id = str(uuid.uuid4())
    LAST_UPLOADED_FILE_ID = file_id
    file_path = f"data/{file_id}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"message": "File uploaded successfully", "file_id": file_id, "filename": file.filename, "path": file_path}

@app.post("/curate/{file_id}")
async def curate_data(file_id: str):
    # In this dynamic architecture we will just pass for /curate 
    # since run_full_pipeline handles curation and training together linearly.
    return {"message": f"Data curation acknowledged for file {file_id}", "status": "Ready"}

@app.post("/train/{file_id}")
async def train_automl(file_id: str):
    # If the frontend passes "demo123", we fall back to the last uploaded file to make testing easy
    if file_id == "demo123" and LAST_UPLOADED_FILE_ID:
        file_id = LAST_UPLOADED_FILE_ID
        
    matching_files = [f for f in os.listdir("data") if f.startswith(file_id)]
    
    # If not found via prefix, try just loading whatever is in data/ directly if it's just one file for demo purposes.
    if not matching_files:
        if file_id == "demo123":
            matching_files = [f for f in os.listdir("data") if f.endswith(".csv")]
        if not matching_files:
            raise HTTPException(status_code=404, detail=f"File associated with {file_id} not found")
        
    file_path = f"data/{matching_files[-1]}"  # Take the most recent/relevant
    
    try:
        results = run_full_pipeline(file_path)
        run_id = results["run_id"]
        GLOBAL_RESULTS[run_id] = results
        # Set a latest pointer
        GLOBAL_RESULTS["latest"] = results
        
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/explain/{run_id}")
async def explain_model(run_id: str):
    if run_id in GLOBAL_RESULTS:
        return {
            "status": "Success", 
            "base64_str": GLOBAL_RESULTS[run_id]["global_shap"],
            "local_base64_str": GLOBAL_RESULTS[run_id]["local_shap"]
        }
    elif "latest" in GLOBAL_RESULTS:
        return {
            "status": "Success", 
            "base64_str": GLOBAL_RESULTS["latest"]["global_shap"],
            "local_base64_str": GLOBAL_RESULTS["latest"]["local_shap"]
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
