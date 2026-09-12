# Genetic Risk Prediction — Final UI

A five-screen React/Vite research prototype for exploring genetic variants,
parental genotypes, Mendelian inheritance, and clinical annotations using
the project's processed research dataset.

## Screens

1. **Home**
   - Research-focused landing screen
   - Genetic inheritance analysis overview
   - Navigation into the prototype workflow

2. **Import Variant**
   - Search and select a variant from the connected dataset
   - Select parental genotype information
   - Continue to variant analysis

3. **Variant Information**
   - Chromosome
   - Position
   - REF / ALT
   - Affected gene
   - Variant type
   - Clinical significance
   - Molecular consequence
   - Disease / condition association

4. **Inheritance Analysis**
   - Mother genotype
   - Father genotype
   - Possible child genotypes
   - Mendelian inheritance probabilities
   - Compatibility of the observed child genotype
   - Inheritance source

5. **Report**
   - Consolidated variant and inheritance analysis
   - Clinical annotation summary
   - Mendelian inheritance results
   - Printable research report
   - **Download Report (PDF)** using the browser print dialog

## Real Project Data

The frontend uses the project's real UI dataset:

`data/ui/phase2_ui_dataset.csv`

The dataset is generated from the processed Phase 2 research dataset and
contains a stratified 5,000-row subset for efficient browser-based exploration.

**Do not create a replacement or synthetic dataset.**

To make the dataset available to Vite, run the synchronization script from
the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-ui-data.ps1