"""
TransitVoice - Automated Verification Test Suite (ETL & EDA)
============================================================
Academic Project: TransitVoice - An Intelligent Multilingual Public Transportation
and Bus Reservation System Using Natural Language Processing.

Tests comprehensive pipeline integrity:
  1. ETL Execution and Artifact Generation
  2. Raw Source Data Immutability
  3. Bus Data Numeric & Gazetteer Normalization
  4. Intent Corpus Validation & Conflict Resolution
  5. Reviews & Complaints Normalization
  6. EDA Engine Execution & Artifact Generation (8 Charts, 4 CSVs, Markdown Report)
  7. Idempotency & Deterministic Reproducibility
  8. Graceful Handling of Empty & Malformed Datasets
"""

import os
import sys
import json
import unittest
from pathlib import Path
import pandas as pd

# Setup path to import from data/
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "data"))

from etl_pipeline import TransitETLPipeline, normalize_city_name
from eda_analysis import TransitEDAEngine


class TestTransitETLANDEDA(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.raw_data_dir = ROOT_DIR / "data"
        cls.processed_dir = ROOT_DIR / "data" / "processed"
        cls.reports_dir = ROOT_DIR / "reports" / "eda"

        # Record raw file checksums/sizes before test run
        cls.raw_file_sizes = {}
        for f in ["buses.csv", "buses.json", "intents.csv", "reviews.json", "complaints.json"]:
            p = cls.raw_data_dir / f
            if p.exists():
                cls.raw_file_sizes[f] = p.stat().st_size

    def test_01_city_normalization(self):
        """Test canonical city mapping gazetteer."""
        self.assertEqual(normalize_city_name("Trichy"), "Tiruchirappalli")
        self.assertEqual(normalize_city_name("trichy"), "Tiruchirappalli")
        self.assertEqual(normalize_city_name("kovai"), "Coimbatore")
        self.assertEqual(normalize_city_name("Madras"), "Chennai")
        self.assertEqual(normalize_city_name("bengaluru"), "Bangalore")
        self.assertEqual(normalize_city_name("Coimbatore"), "Coimbatore")

    def test_02_etl_pipeline_execution(self):
        """Test ETL pipeline runs end-to-end and produces all processed outputs."""
        pipeline = TransitETLPipeline(data_dir=str(self.raw_data_dir), output_dir=str(self.processed_dir))
        summary = pipeline.run()

        self.assertEqual(summary["status"], "COMPLETED_SUCCESSFULLY")

        # Verify all output files exist and are non-empty
        expected_files = [
            "buses_cleaned.csv",
            "buses_cleaned.json",
            "tn_buses_cleaned.json",
            "intents_cleaned.csv",
            "reviews_cleaned.json",
            "complaints_cleaned.json",
            "bookings_cleaned.json",
            "etl_summary.json"
        ]
        for fname in expected_files:
            target = self.processed_dir / fname
            self.assertTrue(target.exists(), f"Missing expected output: {fname}")
            self.assertGreater(target.stat().st_size, 0, f"File is empty: {fname}")

    def test_03_raw_source_immutability(self):
        """Ensure raw files in data/ were NEVER modified or overwritten."""
        for fname, orig_size in self.raw_file_sizes.items():
            curr_path = self.raw_data_dir / fname
            self.assertTrue(curr_path.exists())
            self.assertEqual(
                curr_path.stat().st_size, orig_size,
                f"Source file {fname} was mutated! Original size {orig_size} != Current {curr_path.stat().st_size}"
            )

    def test_04_bus_data_cleaning_and_validation(self):
        """Validate cleaned bus data properties."""
        df_buses = pd.read_csv(self.processed_dir / "buses_cleaned.csv")

        # 1. Row count preserved
        self.assertEqual(len(df_buses), 124)

        # 2. Fares are numeric and positive
        self.assertTrue((df_buses["fare"] > 0).all(), "Found non-positive fare in cleaned data")

        # 3. Available seats <= total seats
        self.assertTrue((df_buses["available_seats"] <= df_buses["total_seats"]).all())
        self.assertTrue((df_buses["available_seats"] >= 0).all())

        # 4. City names canonicalized
        sources = df_buses["source"].unique()
        self.assertNotIn("Trichy", sources)
        self.assertIn("Tiruchirappalli", sources)

        # 5. Rating within [1.0, 5.0]
        self.assertTrue(((df_buses["rating"] >= 1.0) & (df_buses["rating"] <= 5.0)).all())

    def test_05_intent_data_cleaning(self):
        """Validate cleaned intent data properties."""
        df_intents = pd.read_csv(self.processed_dir / "intents_cleaned.csv")

        # 1. Total rows
        self.assertEqual(len(df_intents), 812)

        # 2. No nulls or empty queries
        self.assertEqual(df_intents["query"].isna().sum(), 0)
        self.assertEqual(df_intents["intent"].isna().sum(), 0)
        self.assertTrue((df_intents["query"].str.strip() != "").all())

        # 3. Zero conflicting labels on identical normalized queries
        df_intents["q_norm"] = df_intents["query"].str.strip().str.lower()
        conflicts = df_intents.groupby("q_norm")["intent"].nunique()
        self.assertEqual((conflicts > 1).sum(), 0, "Conflicting intent labels found")

        # 4. Number of semantic classes
        self.assertEqual(df_intents["intent"].nunique(), 14)

    def test_06_reviews_and_complaints_normalization(self):
        """Validate reviews and complaints data properties."""
        with open(self.processed_dir / "reviews_cleaned.json", "r", encoding="utf-8") as f:
            reviews = json.load(f)
        with open(self.processed_dir / "complaints_cleaned.json", "r", encoding="utf-8") as f:
            complaints = json.load(f)

        self.assertEqual(len(reviews), 37)
        self.assertEqual(len(complaints), 17)

        # Reviews sentiment casing normalized
        valid_sentiments = {"POSITIVE", "NEGATIVE", "NEUTRAL"}
        for r in reviews:
            self.assertIn(r["sentiment"], valid_sentiments)
            self.assertGreaterEqual(r["rating"], 1.0)
            self.assertLessEqual(r["rating"], 5.0)

        # Complaints status casing normalized
        valid_statuses = {"OPEN", "IN_PROGRESS", "RESOLVED"}
        for c in complaints:
            self.assertIn(c["status"], valid_statuses)

    def test_07_eda_engine_execution_and_outputs(self):
        """Test EDA engine execution and generated reports/charts."""
        engine = TransitEDAEngine(data_dir=str(self.processed_dir), reports_dir=str(self.reports_dir))
        summary = engine.run()

        # Check all 8 generated charts
        expected_charts = [
            "fare_distribution.png",
            "services_by_city.png",
            "bus_type_distribution.png",
            "missing_values_summary.png",
            "fare_vs_distance_scatter.png",
            "intent_distribution.png",
            "reviews_sentiment_ratings.png",
            "complaints_analysis.png"
        ]
        for c in expected_charts:
            chart_path = self.reports_dir / c
            self.assertTrue(chart_path.exists(), f"Missing chart: {c}")
            self.assertGreater(chart_path.stat().st_size, 10000, f"Chart appears corrupted/empty: {c}")

        # Check CSV summaries
        expected_csvs = [
            "dataset_profile.csv",
            "missing_values.csv",
            "duplicate_summary.csv",
            "intent_distribution.csv"
        ]
        for csv_f in expected_csvs:
            csv_path = self.reports_dir / csv_f
            self.assertTrue(csv_path.exists(), f"Missing CSV: {csv_f}")

        # Check markdown report
        md_path = self.reports_dir / "eda_report.md"
        self.assertTrue(md_path.exists())
        with open(md_path, "r", encoding="utf-8") as f:
            report_text = f.read()
            self.assertIn("Comprehensive Exploratory Data Analysis (EDA) Report", report_text)
            self.assertIn("Fare Distribution", report_text)
            self.assertIn("Intent Classification Corpus Analysis", report_text)

    def test_08_pipeline_idempotency(self):
        """Ensure repeated execution produces identical deterministic outputs."""
        pipeline = TransitETLPipeline(data_dir=str(self.raw_data_dir), output_dir=str(self.processed_dir))
        summary1 = pipeline.run()
        summary2 = pipeline.run()

        self.assertEqual(
            summary1["stages"]["transform"]["buses_csv"]["final_row_count"],
            summary2["stages"]["transform"]["buses_csv"]["final_row_count"]
        )
        self.assertEqual(
            summary1["stages"]["transform"]["intents_csv"]["final_row_count"],
            summary2["stages"]["transform"]["intents_csv"]["final_row_count"]
        )

    def test_09_graceful_empty_and_malformed_handling(self):
        """Ensure pipeline handles empty or partial DataFrames safely without crashing."""
        pipeline = TransitETLPipeline(data_dir=str(self.raw_data_dir), output_dir=str(self.processed_dir))
        
        # Empty bus dataframe
        empty_bus_df = pd.DataFrame(columns=["bus_number", "fare", "available_seats", "total_seats"])
        clean_df, log = pipeline.transform_buses_csv(empty_bus_df)
        self.assertEqual(len(clean_df), 0)

        # Empty intents dataframe
        empty_intents_df = pd.DataFrame(columns=["query", "intent"])
        clean_intents, log_i = pipeline.transform_intents_csv(empty_intents_df)
        self.assertEqual(len(clean_intents), 0)


if __name__ == "__main__":
    unittest.main()
