"""
TransitVoice - Pipeline Orchestrator (ETL + EDA)
================================================
Academic Project: TransitVoice - An Intelligent Multilingual Public Transportation
and Bus Reservation System Using Natural Language Processing.

This script orchestrates the complete data workflow:
  Step 1: Execute `TransitETLPipeline` (Extract, Transform, Validate, Load)
  Step 2: Execute `TransitEDAEngine` (Profile, Statistics, Charts, Markdown Report)

Ensures 100% reproducibility and strict non-destructive handling of source data.
"""

import time
import sys
from pathlib import Path

# Add project directories to path
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

from etl_pipeline import TransitETLPipeline
from eda_analysis import TransitEDAEngine


def run_full_pipeline():
    start_time = time.time()
    print("=" * 80)
    print("TRANSITVOICE: REPRODUCIBLE DATA PIPELINE (ETL + EDA ORCHESTRATOR)")
    print("=" * 80)

    # 1. Run ETL
    print("\n[PHASE 1] Executing Automated ETL Pipeline...")
    etl = TransitETLPipeline()
    etl_summary = etl.run()

    # 2. Run EDA
    print("\n[PHASE 2] Executing Automated EDA Analytics Engine...")
    eda = TransitEDAEngine(data_dir=str(etl.output_dir))
    eda_summary = eda.run()

    total_time = round(time.time() - start_time, 2)
    print("=" * 80)
    print("TRANSITVOICE PIPELINE EXECUTION COMPLETED SUCCESSFULLY")
    print(f"Elapsed Time:       {total_time} seconds")
    print(f"Cleaned Outputs:    {etl.output_dir}")
    print(f"EDA Reports/Charts: {eda.reports_dir}")
    print("=" * 80)


if __name__ == "__main__":
    run_full_pipeline()
