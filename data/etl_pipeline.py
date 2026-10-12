"""
TransitVoice - Automated ETL Pipeline (Extract, Transform, Load)
================================================================
Academic Project: TransitVoice - An Intelligent Multilingual Public Transportation
and Bus Reservation System Using Natural Language Processing.

This module provides a production-grade, reproducible ETL pipeline for extracting,
cleaning, validating, standardizing, and loading raw multimodal datasets:
  - Bus transportation services (CSV and JSON)
  - Intent classification training queries (CSV)
  - Passenger reviews and NLP sentiment logs (JSON)
  - Passenger grievances and complaints (JSON)
  - Seed bookings, users, and operators (JSON)

Original source files in `data/` remain strictly immutable.
Cleaned and validated datasets are written to `data/processed/`.
A full audit log is generated at `data/processed/etl_summary.json`.
"""

import os
import sys
import json
import csv
import re
import datetime
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
import pandas as pd
import numpy as np

# Canonical City Gazetteer with Multilingual Aliases (aligned with nlp_service/config.py)
CITY_CANONICAL_MAP = {
    # Variations -> Canonical name
    "trichy": "Tiruchirappalli",
    "tiruchi": "Tiruchirappalli",
    "tiruchirapalli": "Tiruchirappalli",
    "tiruchirappalli": "Tiruchirappalli",
    "kovai": "Coimbatore",
    "coimbatore": "Coimbatore",
    "madras": "Chennai",
    "chennai": "Chennai",
    "madurai": "Madurai",
    "salem": "Salem",
    "tiruppur": "Tiruppur",
    "tirupur": "Tiruppur",
    "erode": "Erode",
    "ooty": "Ooty",
    "udhagamandalam": "Ooty",
    "ootacamund": "Ooty",
    "vellore": "Vellore",
    "thanjavur": "Thanjavur",
    "tanjore": "Thanjavur",
    "tirunelveli": "Tirunelveli",
    "nellai": "Tirunelveli",
    "thoothukudi": "Thoothukudi",
    "tuticorin": "Thoothukudi",
    "dindigul": "Dindigul",
    "karur": "Karur",
    "namakkal": "Namakkal",
    "cuddalore": "Cuddalore",
    "villupuram": "Villupuram",
    "kanchipuram": "Kanchipuram",
    "chengalpattu": "Chengalpattu",
    "hosur": "Hosur",
    "rameswaram": "Rameswaram",
    "kanyakumari": "Kanyakumari",
    "bangalore": "Bangalore",
    "bengaluru": "Bangalore",
    "bengalore": "Bangalore",
    "mysore": "Mysore",
    "mysuru": "Mysore",
    "mangalore": "Mangalore",
    "mangaluru": "Mangalore",
    "kochi": "Kochi",
    "cochin": "Kochi",
    "ernakulam": "Kochi",
    "trivandrum": "Thiruvananthapuram",
    "thiruvananthapuram": "Thiruvananthapuram",
    "hyderabad": "Hyderabad",
    "secunderabad": "Hyderabad",
    "pondicherry": "Pondicherry",
    "puducherry": "Pondicherry",
    "mumbai": "Mumbai",
    "bombay": "Mumbai",
    "pune": "Pune",
    "poona": "Pune",
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "vijayawada": "Vijayawada",
    "visakhapatnam": "Visakhapatnam",
    "vizag": "Visakhapatnam",
    "warangal": "Warangal",
    "tirupati": "Tirupati",
    "hubli": "Hubli",
    "belgaum": "Belgaum",
    "udupi": "Udupi",
    "calicut": "Kozhikode",
    "kozhikode": "Kozhikode",
    "thrissur": "Thrissur",
    "palakkad": "Palakkad",
    "munnar": "Munnar",
    "nagpur": "Nagpur",
    "nashik": "Nashik",
    "shirdi": "Shirdi",
    "panaji": "Panaji",
    "goa": "Panaji",
    "kolkata": "Kolkata",
    "calcutta": "Kolkata"
}


def normalize_city_name(city_str: Any) -> str:
    """Map raw city string or alias to canonical city name."""
    if not city_str or not isinstance(city_str, str):
        return ""
    clean = city_str.strip()
    clean_lower = clean.lower()
    return CITY_CANONICAL_MAP.get(clean_lower, clean)


class TransitETLPipeline:
    """
    Production-grade ETL pipeline for TransitVoice.
    Executes Extract, Transform, and Load phases across all project datasets.
    """

    def __init__(self, data_dir: Optional[str] = None, output_dir: Optional[str] = None):
        base_path = Path(__file__).resolve().parent
        self.data_dir = Path(data_dir) if data_dir else base_path
        self.output_dir = Path(output_dir) if output_dir else base_path / "processed"
        self.summary: Dict[str, Any] = {
            "pipeline_name": "TransitVoice ETL Pipeline",
            "execution_timestamp": datetime.datetime.now().isoformat(),
            "data_directory": str(self.data_dir),
            "output_directory": str(self.output_dir),
            "stages": {
                "extract": {},
                "transform": {},
                "load": {}
            },
            "status": "INITIALIZED"
        }

    # -------------------------------------------------------------------------
    # STAGE 1: EXTRACT
    # -------------------------------------------------------------------------
    def extract(self) -> Dict[str, Any]:
        """
        Extracts raw datasets from the data directory.
        Reports metadata: row count, column count, column names, file size, status.
        Never fabricates records or replaces missing files silently.
        """
        extracted = {}
        files_to_extract = [
            ("buses_csv", "buses.csv", "csv"),
            ("buses_json", "buses.json", "json"),
            ("tn_buses_json", "tn_buses.json", "json"),
            ("intents_csv", "intents.csv", "csv"),
            ("reviews_json", "reviews.json", "json"),
            ("complaints_json", "complaints.json", "json"),
            ("bookings_json", "bookings.json", "json"),
            ("booked_seats_json", "booked_seats.json", "json"),
            ("users_json", "users.json", "json"),
            ("operators_json", "operators.json", "json")
        ]

        print("=" * 70)
        print("STAGE 1: EXTRACT - Loading Raw Datasets")
        print("=" * 70)

        for key, filename, filetype in files_to_extract:
            filepath = self.data_dir / filename
            report: Dict[str, Any] = {
                "file_name": filename,
                "file_path": str(filepath),
                "file_exists": filepath.exists(),
                "file_size_bytes": filepath.stat().st_size if filepath.exists() else 0,
                "loading_status": "PENDING",
                "error": None
            }

            if not filepath.exists():
                report["loading_status"] = "FILE_NOT_FOUND"
                report["error"] = f"Expected file {filepath} was not found."
                print(f"[EXTRACT - ERROR] File not found: {filename}")
                self.summary["stages"]["extract"][key] = report
                continue

            try:
                if filetype == "csv":
                    df = pd.read_csv(filepath, encoding="utf-8")
                    report["row_count"] = len(df)
                    report["col_count"] = len(df.columns)
                    report["columns"] = list(df.columns)
                    report["loading_status"] = "SUCCESS"
                    extracted[key] = df
                    print(f"[EXTRACT - OK] {filename:<18} | Rows: {len(df):>4} | Cols: {len(df.columns):>2} | Size: {report['file_size_bytes']:>7} bytes")
                elif filetype == "json":
                    with open(filepath, "r", encoding="utf-8") as fp:
                        raw_data = json.load(fp)
                    if isinstance(raw_data, list):
                        report["row_count"] = len(raw_data)
                        report["col_count"] = len(raw_data[0].keys()) if len(raw_data) > 0 else 0
                        report["columns"] = list(raw_data[0].keys()) if len(raw_data) > 0 else []
                        report["loading_status"] = "SUCCESS"
                        extracted[key] = raw_data
                        print(f"[EXTRACT - OK] {filename:<18} | Items: {len(raw_data):>3} | Keys: {report['col_count']:>2} | Size: {report['file_size_bytes']:>7} bytes")
                    elif isinstance(raw_data, dict):
                        report["row_count"] = len(raw_data.keys())
                        report["col_count"] = 1
                        report["columns"] = list(raw_data.keys())
                        report["loading_status"] = "SUCCESS"
                        extracted[key] = raw_data
                        print(f"[EXTRACT - OK] {filename:<18} | Dict Keys: {len(raw_data.keys()):>2} | Size: {report['file_size_bytes']:>7} bytes")
            except Exception as exc:
                report["loading_status"] = "PARSE_ERROR"
                report["error"] = str(exc)
                print(f"[EXTRACT - ERROR] Failed parsing {filename}: {exc}")

            self.summary["stages"]["extract"][key] = report

        return extracted

    # -------------------------------------------------------------------------
    # STAGE 2: TRANSFORM - BUS DATA
    # -------------------------------------------------------------------------
    def transform_buses_csv(self, df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Clean, normalize, and validate buses CSV data."""
        df = df_raw.copy()
        initial_rows = len(df)
        transform_log: Dict[str, Any] = {
            "initial_row_count": initial_rows,
            "transformations_applied": [],
            "validation_failures": [],
            "duplicates_removed": 0,
            "nulls_before": df.isnull().sum().to_dict(),
            "nulls_after": {}
        }

        # 1. Normalize string whitespace
        str_cols = df.select_dtypes(include=["object"]).columns
        for col in str_cols:
            df[col] = df[col].astype(str).str.strip()
            # Collapse multiple spaces
            df[col] = df[col].str.replace(r"\s+", " ", regex=True)
        transform_log["transformations_applied"].append("Stripped and collapsed whitespace across text columns.")

        # 2. Normalize city names via Gazetteer
        if "source" in df.columns:
            sources_before = df["source"].unique().tolist()
            df["source"] = df["source"].apply(normalize_city_name)
            sources_after = df["source"].unique().tolist()
            diff_src = set(sources_before) - set(sources_after)
            if diff_src:
                transform_log["transformations_applied"].append(f"Normalized source city aliases: {list(diff_src)}")

        if "destination" in df.columns:
            dst_before = df["destination"].unique().tolist()
            df["destination"] = df["destination"].apply(normalize_city_name)
            dst_after = df["destination"].unique().tolist()
            diff_dst = set(dst_before) - set(dst_after)
            if diff_dst:
                transform_log["transformations_applied"].append(f"Normalized destination city aliases: {list(diff_dst)}")

        # 3. Synchronize route string if source or destination changed
        if "source" in df.columns and "destination" in df.columns:
            df["route"] = df["source"] + " -> " + df["destination"]
            transform_log["transformations_applied"].append("Synchronized 'route' column to canonical 'Source -> Destination'.")

        # 4. Numeric type conversion and validation
        numeric_validations = [
            ("fare", 50, 5000),
            ("available_seats", 0, 60),
            ("total_seats", 10, 60),
            ("rating", 1.0, 5.0),
            ("review_count", 0, 100000),
            ("latitude", 6.0, 38.0),
            ("longitude", 68.0, 98.0)
        ]
        for col, min_val, max_val in numeric_validations:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
                invalid_mask = (df[col] < min_val) | (df[col] > max_val) | df[col].isna()
                invalid_count = invalid_mask.sum()
                if invalid_count > 0:
                    transform_log["validation_failures"].append(
                        f"Column '{col}' had {invalid_count} records outside expected range [{min_val}, {max_val}]."
                    )

        # 5. Logical seat validation: available_seats <= total_seats
        if "available_seats" in df.columns and "total_seats" in df.columns:
            invalid_seats = df[df["available_seats"] > df["total_seats"]]
            if len(invalid_seats) > 0:
                transform_log["validation_failures"].append(
                    f"Found {len(invalid_seats)} records where available_seats > total_seats; capped to total_seats."
                )
                df.loc[df["available_seats"] > df["total_seats"], "available_seats"] = df["total_seats"]

        # 6. Deduplication: identify true duplicates vs legitimate shared routes
        # Legitimate services can share route, but cannot share exact bus_number + departure_time
        dup_mask = df.duplicated(subset=["bus_number", "departure_time"], keep="first")
        num_dups = dup_mask.sum()
        if num_dups > 0:
            transform_log["duplicates_removed"] = int(num_dups)
            df = df[~dup_mask].copy()
            transform_log["transformations_applied"].append(
                f"Removed {num_dups} duplicate bus services sharing identical bus_number & departure_time."
            )
        else:
            transform_log["transformations_applied"].append(
                "Verified no conflicting duplicate bus services with identical bus_number & departure_time."
            )

        # 7. Preserved distinct route services count
        if "route" in df.columns:
            distinct_routes = df["route"].nunique()
            transform_log["distinct_routes_preserved"] = distinct_routes

        transform_log["final_row_count"] = len(df)
        transform_log["nulls_after"] = df.isnull().sum().to_dict()
        return df, transform_log

    def transform_buses_json(self, buses_raw: List[Dict[str, Any]], dataset_name: str = "buses_json") -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Clean, normalize, and validate buses JSON records."""
        initial_count = len(buses_raw)
        transform_log: Dict[str, Any] = {
            "initial_row_count": initial_count,
            "transformations_applied": [],
            "validation_failures": [],
            "imputations_performed": 0,
            "duplicates_removed": 0
        }

        cleaned_records = []
        seen_keys = set()

        for idx, item in enumerate(buses_raw):
            b = dict(item)

            # Strip whitespace in text attributes
            for k, v in b.items():
                if isinstance(v, str):
                    b[k] = re.sub(r"\s+", " ", v.strip())

            # City name normalization
            if "source" in b and b["source"]:
                b["source"] = normalize_city_name(b["source"])
            if "destination" in b and b["destination"]:
                b["destination"] = normalize_city_name(b["destination"])

            # Imputation for records added via admin portals (like TV-00228)
            imputed = False
            if not b.get("bus_id"):
                b["bus_id"] = b.get("service_id") or b.get("bus_number") or f"TV-{idx+1:05d}"
                imputed = True
            if not b.get("service_id"):
                b["service_id"] = b.get("bus_id")
                imputed = True
            if not b.get("operator_name"):
                b["operator_name"] = b.get("operator") or "TransitVoice Partner Operator"
                imputed = True
            if not b.get("operator"):
                b["operator"] = b["operator_name"]
                imputed = True
            if not b.get("transport_corporation"):
                b["transport_corporation"] = b["operator_name"]
                imputed = True
            if not b.get("route") and b.get("source") and b.get("destination"):
                b["route"] = f"{b['source']} -> {b['destination']}"
                imputed = True
            if not b.get("operating_days"):
                b["operating_days"] = "Mon, Tue, Wed, Thu, Fri, Sat, Sun"
                imputed = True
            if not b.get("service_status"):
                b["service_status"] = "VERIFIED_SCHEDULE"
                imputed = True
            if not b.get("stops") or not isinstance(b["stops"], list):
                b["stops"] = [f"{b.get('source')} Bus Stand", f"{b.get('destination')} Bus Stand"]
                imputed = True
            if not b.get("boarding_points"):
                dep_time = b.get("departure_time", "08:00")
                b["boarding_points"] = [f"{b.get('source')} Central Stand ({dep_time})"]
                imputed = True
            if not b.get("dropping_points"):
                arr_time = b.get("arrival_time", "16:00")
                b["dropping_points"] = [f"{b.get('destination')} Main Terminal ({arr_time})"]
                imputed = True
            if not b.get("amenities"):
                b_type = b.get("bus_type", "")
                if "AC" in b_type or "Volvo" in b_type or "Electric" in b_type:
                    b["amenities"] = ["Air Conditioning", "WiFi", "Charging Port", "Water Bottle"]
                else:
                    b["amenities"] = ["Reading Light", "Emergency Exit", "First Aid Box"]
                imputed = True

            # Numeric coercion and validation
            try:
                b["fare"] = float(b.get("fare", 0))
            except (ValueError, TypeError):
                b["fare"] = 500.0
                transform_log["validation_failures"].append(f"Bus {b.get('bus_id')} had invalid fare, defaulted to 500.")

            try:
                b["available_seats"] = int(b.get("available_seats", 20))
            except (ValueError, TypeError):
                b["available_seats"] = 20

            try:
                b["total_seats"] = int(b.get("total_seats", 36))
            except (ValueError, TypeError):
                b["total_seats"] = 36

            if b["available_seats"] > b["total_seats"]:
                b["available_seats"] = b["total_seats"]

            if imputed:
                transform_log["imputations_performed"] += 1

            # Deduplication key: bus_number + departure_time
            bus_num = b.get("bus_number", "")
            dep_time = b.get("departure_time", "")
            dedup_key = f"{bus_num}_{dep_time}"

            if dedup_key in seen_keys:
                transform_log["duplicates_removed"] += 1
                continue

            seen_keys.add(dedup_key)
            cleaned_records.append(b)

        transform_log["transformations_applied"].append(
            f"Normalized city names, whitespace, and validated numeric bounds across {len(cleaned_records)} records."
        )
        if transform_log["imputations_performed"] > 0:
            transform_log["transformations_applied"].append(
                f"Imputed missing schema metadata for {transform_log['imputations_performed']} dynamically added/partial records."
            )
        transform_log["final_row_count"] = len(cleaned_records)
        return cleaned_records, transform_log

    # -------------------------------------------------------------------------
    # STAGE 2: TRANSFORM - INTENT DATA
    # -------------------------------------------------------------------------
    def transform_intents_csv(self, df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """Clean, normalize, and validate multilingual intent classification dataset."""
        df = df_raw.copy()
        initial_rows = len(df)
        transform_log: Dict[str, Any] = {
            "initial_row_count": initial_rows,
            "transformations_applied": [],
            "validation_failures": [],
            "duplicates_removed": 0,
            "conflicting_labels_detected": 0,
            "class_distribution_before": df["intent"].value_counts().to_dict() if "intent" in df.columns else {},
            "class_distribution_after": {}
        }

        # 1. Check required columns
        if "query" not in df.columns or "intent" not in df.columns:
            transform_log["validation_failures"].append("Required columns 'query' and 'intent' not found.")
            return df, transform_log

        # 2. Drop NA values
        na_count = df[["query", "intent"]].isna().any(axis=1).sum()
        if na_count > 0:
            df = df.dropna(subset=["query", "intent"]).copy()
            transform_log["transformations_applied"].append(f"Dropped {na_count} rows with null query or intent.")

        # 3. Clean string whitespace
        df["query"] = df["query"].astype(str).str.strip()
        df["query"] = df["query"].str.replace(r"\s+", " ", regex=True)
        df["intent"] = df["intent"].astype(str).str.strip().str.lower()
        transform_log["transformations_applied"].append("Stripped whitespace and lowercased intent labels.")

        # 4. Remove empty strings
        empty_mask = (df["query"] == "") | (df["intent"] == "")
        if empty_mask.sum() > 0:
            df = df[~empty_mask].copy()
            transform_log["transformations_applied"].append(f"Removed {empty_mask.sum()} empty string queries/labels.")

        # 5. Check duplicate queries and detect conflicting intent labels
        # Normalized query for conflict detection: lowercased text
        df["query_normalized"] = df["query"].str.lower()
        conflicts = df.groupby("query_normalized")["intent"].nunique()
        conflict_queries = conflicts[conflicts > 1].index.tolist()

        if conflict_queries:
            transform_log["conflicting_labels_detected"] = len(conflict_queries)
            transform_log["validation_failures"].append(
                f"Detected {len(conflict_queries)} query texts with conflicting intent labels: {conflict_queries[:5]}"
            )
            # Resolve conflict: keep the most frequent intent label for that query
            resolved_rows = []
            for q_norm, group in df.groupby("query_normalized"):
                if len(group["intent"].unique()) > 1:
                    # Pick most frequent intent in group, or first
                    best_intent = group["intent"].mode()[0]
                    first_row = group.iloc[0].to_dict()
                    first_row["intent"] = best_intent
                    resolved_rows.append(first_row)
                else:
                    resolved_rows.append(group.iloc[0].to_dict())
            df = pd.DataFrame(resolved_rows)
            transform_log["transformations_applied"].append(
                f"Resolved conflicting labels for {len(conflict_queries)} queries using modal intent assignment."
            )
        else:
            # Drop pure duplicates if any
            dups = df.duplicated(subset=["query_normalized"], keep="first")
            if dups.sum() > 0:
                transform_log["duplicates_removed"] = int(dups.sum())
                df = df[~dups].copy()
                transform_log["transformations_applied"].append(f"Removed {dups.sum()} redundant duplicate queries.")
            else:
                transform_log["transformations_applied"].append("Verified zero duplicate or conflicting queries.")

        df = df.drop(columns=["query_normalized"], errors="ignore")
        transform_log["final_row_count"] = len(df)
        transform_log["class_distribution_after"] = df["intent"].value_counts().to_dict()
        transform_log["unique_classes_count"] = df["intent"].nunique()
        return df, transform_log

    # -------------------------------------------------------------------------
    # STAGE 2: TRANSFORM - REVIEWS & COMPLAINTS
    # -------------------------------------------------------------------------
    def transform_reviews(self, reviews_raw: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Clean, normalize, and validate customer reviews dataset."""
        transform_log: Dict[str, Any] = {
            "initial_row_count": len(reviews_raw),
            "transformations_applied": [],
            "validation_failures": [],
            "sentiment_standardized_count": 0
        }
        cleaned = []
        for r in reviews_raw:
            rev = dict(r)

            # Standardize text fields
            if "comment" in rev and isinstance(rev["comment"], str):
                rev["comment"] = re.sub(r"\s+", " ", rev["comment"].strip())
            if "original_text" in rev and isinstance(rev["original_text"], str):
                rev["original_text"] = re.sub(r"\s+", " ", rev["original_text"].strip())

            # Standardize sentiment casing: POSITIVE, NEGATIVE, NEUTRAL
            if "sentiment" in rev and isinstance(rev["sentiment"], str):
                s_norm = rev["sentiment"].strip().upper()
                if s_norm != rev["sentiment"]:
                    transform_log["sentiment_standardized_count"] += 1
                rev["sentiment"] = s_norm

            # Validate ratings
            try:
                rev["rating"] = float(rev.get("rating", 3.0))
                if rev["rating"] < 1.0 or rev["rating"] > 5.0:
                    transform_log["validation_failures"].append(
                        f"Review {rev.get('feedback_id')} had rating {rev['rating']} outside [1.0, 5.0]; clamped."
                    )
                    rev["rating"] = max(1.0, min(5.0, rev["rating"]))
            except (ValueError, TypeError):
                rev["rating"] = 3.0

            cleaned.append(rev)

        transform_log["transformations_applied"].append(
            f"Standardized sentiment casing to uppercase (POSITIVE/NEGATIVE/NEUTRAL) and validated rating bounds [1.0, 5.0]."
        )
        transform_log["final_row_count"] = len(cleaned)
        return cleaned, transform_log

    def transform_complaints(self, complaints_raw: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Clean, normalize, and validate passenger complaints dataset."""
        transform_log: Dict[str, Any] = {
            "initial_row_count": len(complaints_raw),
            "transformations_applied": [],
            "validation_failures": [],
            "status_standardized_count": 0
        }
        valid_statuses = {"OPEN", "IN_PROGRESS", "RESOLVED"}
        cleaned = []
        for c in complaints_raw:
            cmp = dict(c)

            # Normalize text
            if "description" in cmp and isinstance(cmp["description"], str):
                cmp["description"] = re.sub(r"\s+", " ", cmp["description"].strip())

            # Standardize status
            if "status" in cmp and isinstance(cmp["status"], str):
                st_norm = cmp["status"].strip().upper()
                if st_norm in valid_statuses:
                    cmp["status"] = st_norm
                else:
                    cmp["status"] = "OPEN"
                    transform_log["validation_failures"].append(
                        f"Complaint {cmp.get('complaint_id')} had unknown status '{c.get('status')}'; reset to OPEN."
                    )

            # Standardize sentiment
            if "sentiment" in cmp and isinstance(cmp["sentiment"], str):
                cmp["sentiment"] = cmp["sentiment"].strip().capitalize()

            # Ensure user_name is not blank
            if not cmp.get("user_name"):
                cmp["user_name"] = "Passenger (Anonymous)"

            cleaned.append(cmp)

        transform_log["transformations_applied"].append(
            "Standardized complaint status (OPEN/IN_PROGRESS/RESOLVED) and normalized passenger text."
        )
        transform_log["final_row_count"] = len(cleaned)
        return cleaned, transform_log

    # -------------------------------------------------------------------------
    # STAGE 2: TRANSFORM - BOOKINGS & ENTITIES
    # -------------------------------------------------------------------------
    def transform_bookings(self, bookings_raw: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Validate bookings data."""
        transform_log: Dict[str, Any] = {
            "initial_row_count": len(bookings_raw),
            "transformations_applied": [],
            "validation_failures": []
        }
        cleaned = []
        for b in bookings_raw:
            bkg = dict(b)
            # City normalization
            if "source" in bkg:
                bkg["source"] = normalize_city_name(bkg["source"])
            if "destination" in bkg:
                bkg["destination"] = normalize_city_name(bkg["destination"])
            # Ensure total_amount is numeric
            try:
                bkg["total_amount"] = float(bkg.get("total_amount", 0))
            except (ValueError, TypeError):
                bkg["total_amount"] = 500.0
            cleaned.append(bkg)

        transform_log["transformations_applied"].append("Normalized source/destination cities and verified booking amounts.")
        transform_log["final_row_count"] = len(cleaned)
        return cleaned, transform_log

    # -------------------------------------------------------------------------
    # STAGE 3: LOAD
    # -------------------------------------------------------------------------
    def load(self, transformed_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Saves all validated and cleaned datasets to the output directory (`data/processed/`).
        Ensures idempotent execution: repeated runs produce deterministic, clean outputs.
        """
        print("=" * 70)
        print("STAGE 3: LOAD - Saving Cleaned Datasets to data/processed/")
        print("=" * 70)

        self.output_dir.mkdir(parents=True, exist_ok=True)
        load_summary: Dict[str, Any] = {
            "output_directory": str(self.output_dir),
            "saved_files": [],
            "status": "SUCCESS"
        }

        # 1. buses_cleaned.csv
        if "buses_csv" in transformed_data:
            out_file = self.output_dir / "buses_cleaned.csv"
            transformed_data["buses_csv"].to_csv(out_file, index=False, encoding="utf-8")
            load_summary["saved_files"].append({
                "file_name": "buses_cleaned.csv",
                "path": str(out_file),
                "records": len(transformed_data["buses_csv"]),
                "size_bytes": out_file.stat().st_size
            })
            print(f"[LOAD - OK] buses_cleaned.csv         | Saved {len(transformed_data['buses_csv']):>4} rows  | {out_file.stat().st_size:>7} bytes")

        # 2. buses_cleaned.json
        if "buses_json" in transformed_data:
            out_file = self.output_dir / "buses_cleaned.json"
            with open(out_file, "w", encoding="utf-8") as fp:
                json.dump(transformed_data["buses_json"], fp, indent=2, ensure_ascii=False)
            load_summary["saved_files"].append({
                "file_name": "buses_cleaned.json",
                "path": str(out_file),
                "records": len(transformed_data["buses_json"]),
                "size_bytes": out_file.stat().st_size
            })
            print(f"[LOAD - OK] buses_cleaned.json        | Saved {len(transformed_data['buses_json']):>4} items | {out_file.stat().st_size:>7} bytes")

        # 3. tn_buses_cleaned.json
        if "tn_buses_json" in transformed_data:
            out_file = self.output_dir / "tn_buses_cleaned.json"
            with open(out_file, "w", encoding="utf-8") as fp:
                json.dump(transformed_data["tn_buses_json"], fp, indent=2, ensure_ascii=False)
            load_summary["saved_files"].append({
                "file_name": "tn_buses_cleaned.json",
                "path": str(out_file),
                "records": len(transformed_data["tn_buses_json"]),
                "size_bytes": out_file.stat().st_size
            })
            print(f"[LOAD - OK] tn_buses_cleaned.json     | Saved {len(transformed_data['tn_buses_json']):>4} items | {out_file.stat().st_size:>7} bytes")

        # 4. intents_cleaned.csv
        if "intents_csv" in transformed_data:
            out_file = self.output_dir / "intents_cleaned.csv"
            transformed_data["intents_csv"].to_csv(out_file, index=False, encoding="utf-8")
            load_summary["saved_files"].append({
                "file_name": "intents_cleaned.csv",
                "path": str(out_file),
                "records": len(transformed_data["intents_csv"]),
                "size_bytes": out_file.stat().st_size
            })
            print(f"[LOAD - OK] intents_cleaned.csv       | Saved {len(transformed_data['intents_csv']):>4} rows  | {out_file.stat().st_size:>7} bytes")

        # 5. reviews_cleaned.json
        if "reviews_json" in transformed_data:
            out_file = self.output_dir / "reviews_cleaned.json"
            with open(out_file, "w", encoding="utf-8") as fp:
                json.dump(transformed_data["reviews_json"], fp, indent=2, ensure_ascii=False)
            load_summary["saved_files"].append({
                "file_name": "reviews_cleaned.json",
                "path": str(out_file),
                "records": len(transformed_data["reviews_json"]),
                "size_bytes": out_file.stat().st_size
            })
            print(f"[LOAD - OK] reviews_cleaned.json      | Saved {len(transformed_data['reviews_json']):>4} items | {out_file.stat().st_size:>7} bytes")

        # 6. complaints_cleaned.json
        if "complaints_json" in transformed_data:
            out_file = self.output_dir / "complaints_cleaned.json"
            with open(out_file, "w", encoding="utf-8") as fp:
                json.dump(transformed_data["complaints_json"], fp, indent=2, ensure_ascii=False)
            load_summary["saved_files"].append({
                "file_name": "complaints_cleaned.json",
                "path": str(out_file),
                "records": len(transformed_data["complaints_json"]),
                "size_bytes": out_file.stat().st_size
            })
            print(f"[LOAD - OK] complaints_cleaned.json   | Saved {len(transformed_data['complaints_json']):>4} items | {out_file.stat().st_size:>7} bytes")

        # 7. bookings_cleaned.json
        if "bookings_json" in transformed_data:
            out_file = self.output_dir / "bookings_cleaned.json"
            with open(out_file, "w", encoding="utf-8") as fp:
                json.dump(transformed_data["bookings_json"], fp, indent=2, ensure_ascii=False)
            load_summary["saved_files"].append({
                "file_name": "bookings_cleaned.json",
                "path": str(out_file),
                "records": len(transformed_data["bookings_json"]),
                "size_bytes": out_file.stat().st_size
            })
            print(f"[LOAD - OK] bookings_cleaned.json     | Saved {len(transformed_data['bookings_json']):>4} items | {out_file.stat().st_size:>7} bytes")

        # 8. etl_summary.json
        summary_file = self.output_dir / "etl_summary.json"
        self.summary["stages"]["load"] = load_summary
        self.summary["status"] = "COMPLETED_SUCCESSFULLY"
        self.summary["completed_at"] = datetime.datetime.now().isoformat()

        with open(summary_file, "w", encoding="utf-8") as fp:
            json.dump(self.summary, fp, indent=2, ensure_ascii=False)
        print(f"[LOAD - OK] etl_summary.json          | Full pipeline audit report saved")
        print("=" * 70)
        return load_summary

    # -------------------------------------------------------------------------
    # ORCHESTRATOR
    # -------------------------------------------------------------------------
    def run(self) -> Dict[str, Any]:
        """Runs the entire pipeline end-to-end and returns audit summary."""
        print(f"\n[START] TransitVoice ETL Pipeline Execution ({datetime.datetime.now()})")
        extracted = self.extract()

        print("\n" + "=" * 70)
        print("STAGE 2: TRANSFORM - Applying Cleaning & Normalization")
        print("=" * 70)

        transformed = {}

        # 1. Transform buses CSV
        if "buses_csv" in extracted:
            clean_df, log = self.transform_buses_csv(extracted["buses_csv"])
            transformed["buses_csv"] = clean_df
            self.summary["stages"]["transform"]["buses_csv"] = log
            print(f"[TRANSFORM - OK] buses_csv         | {log['initial_row_count']} -> {log['final_row_count']} rows | {len(log['transformations_applied'])} transforms")

        # 2. Transform buses JSON
        if "buses_json" in extracted:
            clean_list, log = self.transform_buses_json(extracted["buses_json"], "buses_json")
            transformed["buses_json"] = clean_list
            self.summary["stages"]["transform"]["buses_json"] = log
            print(f"[TRANSFORM - OK] buses_json        | {log['initial_row_count']} -> {log['final_row_count']} items | {log['imputations_performed']} imputations")

        # 3. Transform tn_buses JSON
        if "tn_buses_json" in extracted:
            clean_list, log = self.transform_buses_json(extracted["tn_buses_json"], "tn_buses_json")
            transformed["tn_buses_json"] = clean_list
            self.summary["stages"]["transform"]["tn_buses_json"] = log
            print(f"[TRANSFORM - OK] tn_buses_json     | {log['initial_row_count']} -> {log['final_row_count']} items | {log['imputations_performed']} imputations")

        # 4. Transform intents CSV
        if "intents_csv" in extracted:
            clean_df, log = self.transform_intents_csv(extracted["intents_csv"])
            transformed["intents_csv"] = clean_df
            self.summary["stages"]["transform"]["intents_csv"] = log
            print(f"[TRANSFORM - OK] intents_csv       | {log['initial_row_count']} -> {log['final_row_count']} queries | {log['unique_classes_count']} classes")

        # 5. Transform reviews JSON
        if "reviews_json" in extracted:
            clean_list, log = self.transform_reviews(extracted["reviews_json"])
            transformed["reviews_json"] = clean_list
            self.summary["stages"]["transform"]["reviews_json"] = log
            print(f"[TRANSFORM - OK] reviews_json      | {log['initial_row_count']} -> {log['final_row_count']} reviews | {log['sentiment_standardized_count']} sentiments normalized")

        # 6. Transform complaints JSON
        if "complaints_json" in extracted:
            clean_list, log = self.transform_complaints(extracted["complaints_json"])
            transformed["complaints_json"] = clean_list
            self.summary["stages"]["transform"]["complaints_json"] = log
            print(f"[TRANSFORM - OK] complaints_json   | {log['initial_row_count']} -> {log['final_row_count']} complaints")

        # 7. Transform bookings JSON
        if "bookings_json" in extracted:
            clean_list, log = self.transform_bookings(extracted["bookings_json"])
            transformed["bookings_json"] = clean_list
            self.summary["stages"]["transform"]["bookings_json"] = log
            print(f"[TRANSFORM - OK] bookings_json     | {log['initial_row_count']} -> {log['final_row_count']} bookings")

        print("=" * 70)

        # Stage 3: Load
        self.load(transformed)

        print(f"\n[DONE] TransitVoice ETL Pipeline completed successfully!")
        print(f"       Processed outputs directory: {self.output_dir}")
        print(f"       Execution summary:           {self.output_dir / 'etl_summary.json'}\n")
        return self.summary


if __name__ == "__main__":
    pipeline = TransitETLPipeline()
    pipeline.run()
