# UI dataset location

Place the real project file here before running the frontend:

`phase2_ui_dataset.csv`

Expected source in the parent project:

`../../data/ui/phase2_ui_dataset.csv`

The app does not fabricate records. It loads this connected UI dataset first and falls back only to a legacy `ui_variants.csv/json` if present.
