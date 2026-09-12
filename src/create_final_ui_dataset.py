from pathlib import Path
import pandas as pd

# ============================================================
# FINAL UI DATASET BUILDER
# Genetic Risk Prediction project
#
# Purpose:
#   Keep the original research dataset untouched and create
#   a small, presentation-ready dataset for the UI.
# ============================================================

ROOT = Path(__file__).resolve().parents[1]

SOURCE = ROOT / "data" / "phase2" / "phase2_final_dataset.parquet"
OUT_DIR = ROOT / "data" / "ui"

OUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_PARQUET = OUT_DIR / "phase2_ui_dataset.parquet"
OUTPUT_CSV = OUT_DIR / "phase2_ui_dataset.csv"

TARGET_ROWS = 5000

# ------------------------------------------------------------
# REQUIRED AND OPTIONAL FIELDS
# ------------------------------------------------------------

REQUIRED_FIELDS = [
    "CHROM",
    "POS",
    "REF",
    "ALT",
    "Mother_GT",
    "Father_GT",
    "Child_GT",
    "Clinical_Significance",
    "Disease_Condition",
    "Gene",
    "Molecular_Consequence",
    "Mendelian_Status",
]

OPTIONAL_FIELDS = [
    "HPO_ID",
    "Phenotype_Annotation",
]

print("=" * 72)
print("FINAL UI DATASET BUILDER")
print("=" * 72)

# ------------------------------------------------------------
# 1. LOAD DATASET
# ------------------------------------------------------------

print(f"\nLoading:\n  {SOURCE}")

df = pd.read_parquet(SOURCE)

print(f"Original rows: {len(df):,}")
print(f"Original columns: {len(df.columns)}")

missing_required = [
    column for column in REQUIRED_FIELDS
    if column not in df.columns
]

if missing_required:
    raise ValueError(
        "The following required columns are missing:\n"
        + "\n".join(f"  - {column}" for column in missing_required)
    )

# ------------------------------------------------------------
# 2. NORMALIZE EMPTY STRINGS
# ------------------------------------------------------------

for column in REQUIRED_FIELDS + OPTIONAL_FIELDS:
    if column in df.columns:
        if (
            pd.api.types.is_object_dtype(df[column])
            or pd.api.types.is_string_dtype(df[column])
        ):
            df[column] = df[column].replace(
                r"^\s*$",
                pd.NA,
                regex=True
            )

# ------------------------------------------------------------
# 3. KEEP COMPLETE RECORDS
# ------------------------------------------------------------

complete = df.dropna(
    subset=REQUIRED_FIELDS
).copy()

print(
    f"Rows with all required fields: "
    f"{len(complete):,}"
)

# ------------------------------------------------------------
# 4. REMOVE DUPLICATES
# ------------------------------------------------------------

dedupe_cols = [
    "CHROM",
    "POS",
    "REF",
    "ALT",
    "Mother_GT",
    "Father_GT",
    "Child_GT",
    "Gene",
]

complete = complete.drop_duplicates(
    subset=dedupe_cols
).copy()

print(
    f"After duplicate removal: "
    f"{len(complete):,}"
)

# ------------------------------------------------------------
# 5. CALCULATE COMPLETENESS SCORE
# ------------------------------------------------------------

complete["_optional_score"] = 0

for column in OPTIONAL_FIELDS:
    if column in complete.columns:
        complete["_optional_score"] += (
            complete[column].notna().astype(int)
        )

for column in [
    "Disease_Condition",
    "Gene",
    "Molecular_Consequence",
]:
    if column in complete.columns:

        bad_values = complete[column].astype(str).str.lower().isin(
            [
                "unknown",
                "none",
                "nan",
                "not available",
                "not_provided",
            ]
        )

        complete["_optional_score"] += (
            ~bad_values
        ).astype(int)

# ------------------------------------------------------------
# 6. NORMALIZE CLINICAL SIGNIFICANCE
# ------------------------------------------------------------

clinical = (
    complete["Clinical_Significance"]
    .astype(str)
    .str.lower()
)

complete["_clinical_group"] = "Other"

complete.loc[
    clinical.str.contains("pathogenic", na=False)
    & ~clinical.str.contains(
        "likely_pathogenic",
        na=False
    ),
    "_clinical_group",
] = "Pathogenic"

complete.loc[
    clinical.str.contains(
        "likely_pathogenic",
        na=False
    ),
    "_clinical_group",
] = "Likely pathogenic"

complete.loc[
    clinical.str.contains("benign", na=False)
    & ~clinical.str.contains(
        "likely_benign",
        na=False
    ),
    "_clinical_group",
] = "Benign"

complete.loc[
    clinical.str.contains(
        "likely_benign",
        na=False
    ),
    "_clinical_group",
] = "Likely benign"

complete.loc[
    clinical.str.contains(
        "uncertain",
        na=False
    ),
    "_clinical_group",
] = "Uncertain"

# ------------------------------------------------------------
# 7. PRESERVE IMPORTANT CLINICAL GROUPS
# ------------------------------------------------------------

priority_groups = [
    "Pathogenic",
    "Likely pathogenic",
    "Uncertain",
]

priority_parts = []

for group_name in priority_groups:

    part = complete[
        complete["_clinical_group"] == group_name
    ].copy()

    if not part.empty:
        part = part.sort_values(
            by=["_optional_score"],
            ascending=[False]
        )

        part = part.drop_duplicates(
            subset=dedupe_cols
        )

        priority_parts.append(part)

priority = (
    pd.concat(
        priority_parts,
        ignore_index=True
    )
    if priority_parts
    else complete.iloc[0:0].copy()
)

# ------------------------------------------------------------
# 8. ENSURE MENDELIAN STATUS IS REPRESENTED
# ------------------------------------------------------------

mendelian_parts = []

for status in [
    "Compatible",
    "Inconsistent",
    "Undetermined",
]:

    part = complete[
        complete["Mendelian_Status"]
        .astype(str)
        .str.lower()
        == status.lower()
    ].copy()

    if not part.empty:

        part = part.sort_values(
            by=["_optional_score"],
            ascending=[False]
        ).head(500)

        mendelian_parts.append(part)

mendelian_examples = (
    pd.concat(
        mendelian_parts,
        ignore_index=True
    )
    if mendelian_parts
    else complete.iloc[0:0].copy()
)

# ------------------------------------------------------------
# 9. COMBINE IMPORTANT EXAMPLES
# ------------------------------------------------------------

seed = pd.concat(
    [
        priority,
        mendelian_examples,
    ],
    ignore_index=True
)

seed = seed.drop_duplicates(
    subset=dedupe_cols
)

# ------------------------------------------------------------
# 10. STRATIFIED SAMPLING
# ------------------------------------------------------------

remaining = complete[
    ~complete.set_index(dedupe_cols).index.isin(
        seed.set_index(dedupe_cols).index
    )
].copy()

remaining_needed = max(
    0,
    TARGET_ROWS - len(seed)
)

if remaining_needed > 0 and not remaining.empty:

    # CREATE STRATUM
    remaining["_stratum"] = (
        remaining["_clinical_group"]
        .astype(str)
        + " | "
        + remaining["Mendelian_Status"]
        .astype(str)
    )

    groups = list(
        remaining.groupby(
            "_stratum",
            dropna=False
        )
    )

    sampled_parts = []

    # MINIMUM REPRESENTATION PER STRATUM
    minimum_per_group = 10

    for _, group in groups:

        n = min(
            minimum_per_group,
            len(group)
        )

        if n > 0:

            sampled_parts.append(
                group.sample(
                    n=n,
                    random_state=42
                )
            )

    stratified_seed = (
        pd.concat(
            sampled_parts,
            ignore_index=True
        )
        if sampled_parts
        else remaining.iloc[0:0].copy()
    )

    stratified_seed = (
        stratified_seed
        .drop_duplicates(
            subset=dedupe_cols
        )
    )

    still_needed = max(
        0,
        remaining_needed - len(stratified_seed)
    )

    # FILL REMAINING SLOTS
    if still_needed > 0:

        pool = remaining[
            ~remaining.set_index(dedupe_cols).index.isin(
                stratified_seed.set_index(dedupe_cols).index
            )
        ].copy()

        extra_n = min(
            still_needed,
            len(pool)
        )

        extra = pool.sample(
            n=extra_n,
            random_state=42
        )

        sampled = pd.concat(
            [
                stratified_seed,
                extra,
            ],
            ignore_index=True
        )

    else:

        sampled = stratified_seed

    ui_df = pd.concat(
        [
            seed,
            sampled,
        ],
        ignore_index=True
    )

else:

    ui_df = seed.copy()

# ------------------------------------------------------------
# 11. FINAL SIZE AND SHUFFLE
# ------------------------------------------------------------

ui_df = ui_df.drop_duplicates(
    subset=dedupe_cols
)

# PRESERVE PRIORITY ROWS IF TARGET IS EXCEEDED
if len(ui_df) > TARGET_ROWS:

    priority_keys = set(
        map(
            tuple,
            priority[
                dedupe_cols
            ]
            .drop_duplicates()
            .itertuples(
                index=False,
                name=None
            )
        )
    )

    ui_df["_is_priority"] = list(
        map(
            tuple,
            ui_df[
                dedupe_cols
            ].itertuples(
                index=False,
                name=None
            )
        )
    )

    ui_df["_is_priority"] = (
        ui_df["_is_priority"]
        .isin(priority_keys)
    )

    priority_rows = ui_df[
        ui_df["_is_priority"]
    ].copy()

    other_rows = ui_df[
        ~ui_df["_is_priority"]
    ].copy()

    slots = max(
        0,
        TARGET_ROWS - len(priority_rows)
    )

    if len(other_rows) > slots:

        other_rows = other_rows.sample(
            n=slots,
            random_state=42
        )

    ui_df = pd.concat(
        [
            priority_rows,
            other_rows,
        ],
        ignore_index=True
    )

# SHUFFLE FINAL DATASET
ui_df = ui_df.sample(
    frac=1,
    random_state=42
).reset_index(drop=True)

# ------------------------------------------------------------
# 12. REMOVE HELPER COLUMNS
# ------------------------------------------------------------

helper_columns = [
    "_optional_score",
    "_clinical_group",
    "_stratum",
    "_is_priority",
]

ui_df = ui_df.drop(
    columns=[
        column
        for column in helper_columns
        if column in ui_df.columns
    ]
)

# ------------------------------------------------------------
# 13. SAVE UI DATASET
# ------------------------------------------------------------

ui_df.to_parquet(
    OUTPUT_PARQUET,
    index=False
)

ui_df.to_csv(
    OUTPUT_CSV,
    index=False
)

# ------------------------------------------------------------
# 14. REPORT FINAL RESULT
# ------------------------------------------------------------

print("\n" + "=" * 72)
print("FINAL UI DATASET CREATED")
print("=" * 72)

print(
    f"UI rows: {len(ui_df):,}"
)

print(
    f"UI columns: {len(ui_df.columns)}"
)

print("\nParquet:")
print(f"  {OUTPUT_PARQUET}")

print("\nCSV:")
print(f"  {OUTPUT_CSV}")

print("\nClinical significance:")
print(
    ui_df["Clinical_Significance"]
    .value_counts(dropna=False)
    .head(15)
    .to_string()
)

print("\nMendelian status:")
print(
    ui_df["Mendelian_Status"]
    .value_counts(dropna=False)
    .to_string()
)

print(
    "\nDone. Original research data was NOT modified."
)