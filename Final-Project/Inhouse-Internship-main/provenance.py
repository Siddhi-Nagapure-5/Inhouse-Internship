import json
import os
from datetime import datetime


import uuid

class ProvenanceTracker:

    def __init__(self, log_file="logs/experiment_log.json"):
        self.log_file = log_file
        self.experiment_data = {}

        os.makedirs("logs", exist_ok=True)

    # ----------------------------
    # 1️⃣ Initialize Experiment
    # ----------------------------
    def start_experiment(self, dataset_name):
        self.experiment_data = {
            "run_id": str(uuid.uuid4()),
            "dataset": dataset_name,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data_cleaning_steps": [],
            "rows_before_cleaning": None,
            "rows_after_cleaning": None,
            "train_shape": None,
            "test_shape": None,
            "test_accuracy": None
        }

    # ----------------------------
    # 2️⃣ Log Cleaning Step
    # ----------------------------
    def log_cleaning_step(self, step_name):
        self.experiment_data["data_cleaning_steps"].append(step_name)

    # ----------------------------
    # 3️⃣ Log Row Counts
    # ----------------------------
    def log_row_counts(self, before, after):
        self.experiment_data["rows_before_cleaning"] = before
        self.experiment_data["rows_after_cleaning"] = after

    # ----------------------------
    # 4️⃣ Log Train/Test Shapes
    # ----------------------------
    def log_split_shapes(self, train_shape, test_shape):
        self.experiment_data["train_shape"] = train_shape
        self.experiment_data["test_shape"] = test_shape

    # ----------------------------
    # 4.5️⃣ Log Test Accuracy
    # ----------------------------
    def log_test_accuracy(self, accuracy):
        self.experiment_data["test_accuracy"] = accuracy

    # ----------------------------
    # 5️⃣ Save Experiment
    # ----------------------------
    def save_experiment(self):

        # If file exists → append
        if os.path.exists(self.log_file):
            with open(self.log_file, "r") as f:
                data = json.load(f)
        else:
            data = []

        data.append(self.experiment_data)

        with open(self.log_file, "w") as f:
            json.dump(data, f, indent=4)

        print("📁 Experiment Logged Successfully!")
