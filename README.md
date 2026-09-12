# Genetic Risk Prediction Using Machine Learning

A complete end-to-end project for exploring genetic variant risk using **clinical variant annotations, population-frequency information, trio inheritance data, machine learning, and a desktop-oriented web prototype**.

The project was developed **from scratch as a data-to-application pipeline**. Raw genomic and clinical annotation sources were used as inputs, while the data cleaning, feature engineering, dataset construction, machine-learning workflow, evaluation, and application prototype were developed as part of this project.

## 🚀 Live Prototype

[Open the live prototype](https://priya-codes27.github.io/Genetic-Risk-Prediction-Using-ML-and-DL/)

---

## Project Overview

Genetic variants can differ significantly in their clinical relevance. Determining whether a variant is associated with pathogenic or benign behavior requires combining multiple types of information, including:

* Clinical significance
* Molecular consequences
* Population allele frequencies
* Variant sequence characteristics
* Family genotype information
* Mendelian inheritance patterns
* Disease and phenotype annotations

This project approaches the problem in two connected phases.

### Phase 1 — Variant Risk Prediction

Raw ClinVar variant annotations were processed and transformed into a structured machine-learning dataset. Features were engineered from molecular consequences, nucleotide sequences, and population-frequency information.

Machine-learning models were then trained to distinguish variants across the project’s clinical risk labels.

### Phase 2 — Inheritance and Clinical Interpretation

Trio genomic data from CEU, Ashkenazim, and Chinese families were processed to obtain mother, father, and child genotype information. These data were combined with clinical and phenotype annotations to construct an inheritance-oriented dataset.

The resulting information is used by the prototype to explore possible child genotypes, inheritance status, and clinical interpretation.

---

# 1. Project Pipeline

The complete workflow can be summarized as:

```text
                 RAW PUBLIC DATA SOURCES
                          │
          ┌───────────────┴────────────────┐
          │                                │
      ClinVar VCF                     Trio VCF Data
          │                                │
          ▼                                ▼
   Annotation Extraction          Genotype Extraction
          │                                │
          ▼                                ▼
 Clinical Label Cleaning          Family Genotype Analysis
          │                                │
          ▼                                ▼
  Feature Engineering             Inheritance Features
          │                                │
          ▼                                ▼
      PHASE 1 DATASET                PHASE 2 DATASET
          │                                │
          ▼                                ▼
   Machine Learning              Clinical Interpretation
          │                                │
          └───────────────┬────────────────┘
                          ▼
                   APPLICATION PROTOTYPE
```

---

# 2. Dataset Creation — Built From Scratch

A major objective of this project was to avoid treating a pre-built machine-learning table as the starting point.

The project starts from raw genomic and clinical information and constructs the working datasets through a series of processing and engineering steps.

The underlying biological sources are established public resources. However, the following parts were developed within this project:

* Data extraction
* Data cleaning
* Clinical-label processing
* Variant-level feature engineering
* Population-frequency feature engineering
* Genotype processing
* Inheritance analysis
* Clinical annotation integration
* Final dataset construction
* Prototype dataset preparation

Therefore, the project is a **from-scratch data engineering and machine-learning pipeline**, rather than simply training a model on a downloaded ready-made dataset.

---

# 3. Phase 1 — Population and Variant Risk Dataset

## Raw Source

Phase 1 begins with the **ClinVar VCF**, which provides variant-level clinical annotations.

The raw ClinVar information contains fields such as:

* Chromosome
* Position
* Reference allele
* Alternate allele
* Variant identifiers
* Clinical significance
* Review status
* Molecular consequences
* Gene information
* Disease information
* Population allele frequencies

The raw source was processed to construct the project's own machine-learning dataset.

---

## Phase 1 Data Construction

The process was:

```text
Raw ClinVar VCF
      ↓
Extract variant-level annotations
      ↓
Clean and normalize clinical significance
      ↓
Parse molecular consequences
      ↓
Process nucleotide information
      ↓
Process population-frequency annotations
      ↓
Engineer derived features
      ↓
Validate the resulting feature table
      ↓
Construct Phase 1 dataset
```

The resulting Phase 1 dataset contains:

**1,396,114 variants × 40 columns**

---

# 4. Phase 1 Feature Engineering

The engineered features were derived from information contained in the raw variant annotations.

The goal was to convert biological information into structured numerical or binary signals that could be used by machine-learning models.

## 4.1 Sequence-Based Features

Information from the reference and alternate alleles was transformed into additional features.

### Transition

The `transition` feature identifies whether the nucleotide substitution represents a transition-type change.

### GC Content

Two features were derived from the nucleotide sequences:

* `ref_gc`
* `alt_gc`

These represent GC composition in the reference and alternate alleles.

---

## 4.2 Molecular Consequence Features

The molecular consequence annotation was converted into interpretable binary indicators.

Features include:

* `is_missense`
* `is_synonymous`
* `is_nonsense`
* `is_splice`
* `is_intronic`
* `is_utr`
* `is_noncoding`
* `is_protein_altering`
* `is_high_impact`

A combined feature,

`consequence_count`

was also generated to represent the number of consequence annotations associated with a variant.

This transforms textual biological annotations into structured signals that can be directly used by machine-learning models.

---

## 4.3 Population-Frequency Features

Population allele-frequency information was collected from the available population annotations.

The dataset includes:

* `af_tgp`
* `af_exac`
* `af_esp`

From the available frequency values, additional features were engineered:

* `population_frequency_count`
* `has_population_frequency`
* `max_population_af`
* `min_population_af`
* `mean_population_af`

These features allow the model to distinguish variants based not only on whether population information exists, but also on the distribution of observed allele frequencies.

---

## 4.4 Rare and Population-Absent Variants

Additional indicators were generated to represent population rarity:

* `is_rare_variant`
* `is_absent_from_population`

These features provide additional signals for variants that occur at low frequency or are not observed in the available population-frequency annotations.

---

## 4.5 Clinical Labels

Clinical significance information from ClinVar was cleaned and standardized before being used for the machine-learning target.

The processed clinical information was used to construct the project's prediction label.

This produced a structured dataset containing both:

**Original biological annotations + engineered machine-learning features**

rather than relying on a pre-existing feature table.

---

# 5. Phase 1 Machine Learning

Several machine-learning approaches were evaluated.

The final tuned **HistGradientBoosting** model achieved:

| Metric    |  Score |
| --------- | -----: |
| Accuracy  | 0.9610 |
| Precision | 0.8768 |
| Recall    | 0.7722 |
| F1 Score  | 0.8212 |
| ROC-AUC   | 0.9856 |
| PR-AUC    | 0.9192 |

The project also includes an MLP-based model and the corresponding trained model artifacts.

The repository contains the trained models and evaluation figures used during the final analysis.

---

# 6. Phase 2 — Trio Inheritance and Clinical Interpretation

Phase 2 extends the project from individual variant prediction toward **family-based inheritance analysis**.

The project uses trio genomic data representing:

* CEU families
* Ashkenazim families
* Chinese families

The raw trio information provides genotype information for:

```text
Mother
Father
Child
```

---

## Phase 2 Data Construction

The trio data were processed to obtain:

* Mother genotype
* Father genotype
* Child genotype
* Allele dosage
* Genotype class
* Alternate-allele carriage
* Family identification
* Variant identification

The variants were then matched with available clinical annotations.

The processing pipeline was:

```text
Raw Trio VCF Data
        ↓
Extract family genotype information
        ↓
Identify Mother / Father / Child
        ↓
Calculate allele dosage
        ↓
Determine genotype classes
        ↓
Determine alternate-allele carriage
        ↓
Evaluate Mendelian consistency
        ↓
Determine possible inheritance source
        ↓
Match clinical annotations
        ↓
Integrate disease / phenotype information
        ↓
Construct Phase 2 dataset
```

---

# 7. Phase 2 Inheritance Features

The Phase 2 dataset contains features describing the relationship between parental and child genotypes.

Examples include:

* Mother allele dosage
* Father allele dosage
* Child allele dosage
* Mother genotype class
* Father genotype class
* Child genotype class
* Mother alternate-allele carriage
* Father alternate-allele carriage
* Child alternate-allele carriage
* Whether both parents carry the alternate allele
* Mendelian status
* Inheritance source
* Possible child dosages

These features allow the application to reason about possible inheritance outcomes instead of treating the child as an isolated genotype.

---

# 8. Clinical and Phenotype Integration

Where available, clinical information was incorporated into Phase 2.

The dataset includes information such as:

* Clinical significance
* Disease/condition
* Gene
* Molecular consequence
* HPO identifier
* Phenotype annotation
* HPO availability
* HPO count

This information supports the clinical interpretation portion of the prototype.

---

# 9. Prototype UI Dataset

The complete Phase 2 dataset is larger than what is necessary for a lightweight application prototype.

Therefore, a separate UI-oriented dataset was generated from the Phase 2 data.

The process was:

```text
Phase 2 Dataset
      ↓
Select fields required by the application
      ↓
Filter records with required information
      ↓
Remove duplicate records
      ↓
Create representative prototype subset
      ↓
5,000-row UI dataset
```

The UI dataset is intended for **application demonstration and interaction**, while the larger processed datasets remain part of the project's data-processing workflow.

This separation keeps the prototype responsive without requiring the complete research-scale data to be loaded into the browser.

---

# 10. Application Prototype

The project includes a desktop-oriented web prototype built using:

* **React**
* **Vite**
* JavaScript
* CSS
* Python backend components

The application is designed around a simple workflow:

```text
Home
  ↓
Analyze Inheritance
  ↓
Enter / Select Parent Variant Information
  ↓
Generate Possible Child Genotypes
  ↓
View Genotype Probabilities
  ↓
Review Variant Risk
  ↓
View Clinical Interpretation
```

The interface focuses on presenting genetic inheritance information in an understandable way rather than exposing the underlying data-processing complexity to the user.

---

# 11. Project Structure

```text
Genetic-Risk-Prediction/
│
├── app/
│   ├── frontend/
│   │   ├── public/
│   │   └── src/
│   ├── README.md
│   └── start.bat
│
├── data/
│   ├── phase1/
│   ├── phase2/
│   └── ui/
│
├── models/
│   └── phase1/
│
├── notebooks/
│   ├── Genetic_Risk_Prediction_Phase_1.ipynb
│   ├── Genetic_Risk_Prediction_Phase_2.ipynb
│   └── Genetic_Risk_Prediction_Final_Integration.ipynb
│
├── results/
│   └── figures/
│
├── src/
│   └── create_final_ui_dataset.py
│
├── .gitignore
├── package-lock.json
├── sync-ui-data.ps1
└── README.md
```

---

# 12. Reproducibility and Data Handling

Large raw genomic files and intermediate files are intentionally excluded from the Git repository where appropriate.

In particular:

* Raw genomic data are not committed.
* Virtual environments are not committed.
* Large generated Phase 1 data files are excluded where appropriate.
* Processed datasets required for understanding and demonstrating the project are included where practical.
* The notebooks document the major analysis and modeling stages.
* The source scripts document important data-generation steps.

This keeps the repository manageable while preserving the project's methodology and reproducibility structure.

---

# 13. Limitations

This project is a research and educational prototype and should **not** be interpreted as a clinical diagnostic system.

Important limitations include:

* Clinical significance annotations can be uncertain or conflicting.
* Genetic risk cannot be determined reliably from a single feature or model prediction alone.
* Population-frequency databases do not represent every population equally.
* Trio data availability varies across populations.
* HPO and phenotype annotations are incomplete for some variants.
* The prototype UI uses a smaller demonstration dataset rather than the complete underlying datasets.
* Model performance on ClinVar-derived data does not automatically translate into clinical diagnostic performance.

---

# 14. Future Scope

Potential future improvements include:

* Larger and more diverse family datasets
* Additional population-frequency resources
* More comprehensive phenotype integration
* Improved handling of conflicting clinical annotations
* Additional genomic and functional prediction features
* External validation on independent datasets
* More advanced inheritance-pattern detection
* Improved model calibration and interpretability
* Expansion toward a clinically validated decision-support workflow

---

# 15. Conclusion

This project demonstrates a complete pipeline from **raw genomic information to a working genetic-risk and inheritance-analysis prototype**.

Rather than beginning with a ready-made machine-learning dataset, the project was developed from the ground up by:

1. Processing raw clinical variant annotations
2. Cleaning and structuring clinical labels
3. Engineering biologically meaningful Phase 1 features
4. Constructing a large variant-level machine-learning dataset
5. Training and evaluating machine-learning models
6. Processing trio genotype information
7. Engineering inheritance-related features
8. Integrating clinical and phenotype annotations
9. Creating a prototype-oriented dataset
10. Building a user-facing application

The final result combines **data engineering, feature engineering, machine learning, genomic inheritance analysis, and application development** into one end-to-end project.

---

## Disclaimer

This project is intended for **research, educational, and demonstration purposes only**. It is not a medical diagnostic tool and should not be used to make clinical decisions without appropriate professional validation.
