import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Check,
  Dna,
  FileText,
  Home as HomeIcon,
  Info,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
  AlertTriangle,
} from 'lucide-react';

const STEPS = [
  ['input', 'Import Variant'],
  ['variant', 'Variant Information'],
  ['inheritance', 'Inheritance Analysis'],
  ['report', 'Report'],
];

const GENOTYPES = ['0/0', '0/1', '1/1'];

function clean(value) {
  if (value === null || value === undefined) return '';

  const text = String(value).trim();

  if (
    !text ||
    /^nan$/i.test(text) ||
    /^none$/i.test(text) ||
    /^null$/i.test(text)
  ) {
    return '';
  }

  return text;
}

function display(value, fallback = 'Not available') {
  const text = clean(value);
  return text || fallback;
}

function normalizeChromosome(value) {
  const text = clean(value);

  if (!text) return '';

  return /^chr/i.test(text) ? text : `chr${text}`;
}

function chromosomeNumber(value) {
  const chromosome = normalizeChromosome(value)
    .replace(/^chr/i, '')
    .toUpperCase();

  if (chromosome === 'X') return 23;
  if (chromosome === 'Y') return 24;

  const number = Number(chromosome);

  return Number.isFinite(number) ? number : 999;
}

function chromosomeSort(a, b) {
  return chromosomeNumber(a) - chromosomeNumber(b);
}

function formatPosition(value) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number.toLocaleString('en-US')
    : display(value);
}

function canonicalGt(value) {
  const genotype = clean(value).replace(/\\/g, '/');

  if (genotype === '1/0') return '0/1';

  return genotype;
}

function genotypeMeaning(genotype) {
  const gt = canonicalGt(genotype);

  if (gt === '0/0') return 'Homozygous reference';
  if (gt === '0/1') return 'Heterozygous (Carrier)';
  if (gt === '1/1') return 'Homozygous alternate';

  return 'Genotype unavailable';
}

function clinicalLabel(value) {
  const text = display(value);

  return text.replaceAll('_', ' ');
}

function clinicalTone(value) {
  const text = clean(value).toLowerCase();

  if (
    text.includes('pathogenic') &&
    !text.includes('benign')
  ) {
    return 'danger';
  }

  if (text.includes('benign')) {
    return 'safe';
  }

  return 'neutral';
}

function inferVariantType(ref, alt) {
  const reference = clean(ref);
  const alternate = clean(alt);

  if (!reference || !alternate) return 'Variant';

  if (
    reference.length === 1 &&
    alternate.length === 1
  ) {
    return 'SNV';
  }

  if (reference.length < alternate.length) {
    return 'Insertion';
  }

  if (reference.length > alternate.length) {
    return 'Deletion';
  }

  return 'MNV';
}

function parseCsv(text) {
  const rows = [];

  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    const nextCharacter = text[i + 1];

    if (quoted) {
      if (
        character === '"' &&
        nextCharacter === '"'
      ) {
        field += '"';
        i += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  if (!rows.length) return [];

  const headers = rows[0].map((header) => header.trim());

  return rows
    .slice(1)
    .filter((currentRow) =>
      currentRow.some((value) => clean(value))
    )
    .map((currentRow) => {
      const object = {};

      headers.forEach((header, index) => {
        object[header] = currentRow[index] ?? '';
      });

      return object;
    });
}

async function loadUiData() {
  const datasetUrl = '/data/ui/phase2_ui_dataset.csv';

  const response = await fetch(
    `${datasetUrl}?v=${Date.now()}`,
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error(
      `UI dataset could not be loaded (${response.status}).`
    );
  }

  const text = await response.text();
  const loadedRows = parseCsv(text);

  if (!loadedRows.length) {
    throw new Error(
      'The UI dataset was loaded but contains no records.'
    );
  }

  return {
    rows: loadedRows,
    source: datasetUrl,
  };
}

function getField(row, names) {
  for (const name of names) {
    const value = clean(row?.[name]);

    if (value) return value;
  }

  return '';
}

function probabilityMap(mother, father) {
  const motherGt = canonicalGt(mother);
  const fatherGt = canonicalGt(father);

  const result = {
    '0/0': 0,
    '0/1': 0,
    '1/1': 0,
  };

  if (
    !GENOTYPES.includes(motherGt) ||
    !GENOTYPES.includes(fatherGt)
  ) {
    return result;
  }

  const motherAlleles = motherGt
    .split('/')
    .map(Number);

  const fatherAlleles = fatherGt
    .split('/')
    .map(Number);

  for (const motherAllele of motherAlleles) {
    for (const fatherAllele of fatherAlleles) {
      const sum = motherAllele + fatherAllele;

      const childGt =
        sum === 0
          ? '0/0'
          : sum === 1
            ? '0/1'
            : '1/1';

      result[childGt] += 0.25;
    }
  }

  return result;
}

function possibleGenotypes(mother, father) {
  const probabilities = probabilityMap(
    mother,
    father
  );

  return GENOTYPES.filter(
    (genotype) => probabilities[genotype] > 0
  );
}

function isMendelianCompatible(child, probabilities) {
  const genotype = canonicalGt(child);

  return (
    GENOTYPES.includes(genotype) &&
    probabilities[genotype] > 0
  );
}

function statusExplanation(status) {
  const text = clean(status).toLowerCase();

  if (text.includes('compatible')) {
    return 'The entered parental genotypes are compatible with Mendelian inheritance rules.';
  }

  if (text.includes('inconsistent')) {
    return 'The observed child genotype is not among the genotypes expected from the entered parental genotypes.';
  }

  return 'A complete Mendelian compatibility conclusion is not available for this record.';
}

function calculateInheritanceStatus(
  child,
  mother,
  father
) {
  const observedChild = canonicalGt(child);
  const probabilities = probabilityMap(
    mother,
    father
  );

  if (!observedChild) {
    return 'Undetermined';
  }

  return isMendelianCompatible(
    observedChild,
    probabilities
  )
    ? 'Compatible'
    : 'Inconsistent';
}

function App() {
  const [page, setPage] = useState('home');

  const [rows, setRows] = useState([]);
  const [source, setSource] = useState('');

  const [dataError, setDataError] = useState('');
  const [loadingData, setLoadingData] = useState(true);

  const [selectedRow, setSelectedRow] = useState(null);

  const [chromosome, setChromosome] = useState('');
  const [position, setPosition] = useState('');

  const [motherGt, setMotherGt] = useState('0/1');
  const [fatherGt, setFatherGt] = useState('0/1');

  const [reportGenerated, setReportGenerated] =
    useState(false);

  useEffect(() => {
    loadUiData()
      .then(({ rows: loadedRows, source: dataSource }) => {
        setRows(loadedRows);
        setSource(dataSource);

        const chromosomeList = [
          ...new Set(
            loadedRows
              .map((row) =>
                normalizeChromosome(row.CHROM)
              )
              .filter(Boolean)
          ),
        ].sort(chromosomeSort);

        if (chromosomeList.length) {
          setChromosome(chromosomeList[0]);
        }
      })
      .catch((error) => {
        setDataError(
          error?.message ||
          'Unable to load the UI dataset.'
        );
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, []);

  const chromosomes = useMemo(
    () =>
      [
        ...new Set(
          rows
            .map((row) =>
              normalizeChromosome(row.CHROM)
            )
            .filter(Boolean)
        ),
      ].sort(chromosomeSort),
    [rows]
  );

  const positions = useMemo(() => {
    const values = rows
      .filter(
        (row) =>
          normalizeChromosome(row.CHROM) ===
          chromosome
      )
      .map((row) => clean(row.POS))
      .filter(Boolean);

    return [...new Set(values)].sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [rows, chromosome]);

  useEffect(() => {
    if (!chromosome) return;

    if (!positions.includes(position)) {
      setPosition(positions[0] || '');
    }
  }, [chromosome, positions, position]);

  const rowForSelection = useMemo(() => {
    const matches = rows.filter(
      (row) =>
        normalizeChromosome(row.CHROM) ===
          chromosome &&
        clean(row.POS) === clean(position)
    );

    return matches[0] || null;
  }, [rows, chromosome, position]);

  function begin() {
    setPage('input');
  }

  function analyze() {
    if (!rowForSelection) return;

    setSelectedRow(rowForSelection);

    const datasetMother = canonicalGt(
      getField(rowForSelection, ['Mother_GT'])
    );

    const datasetFather = canonicalGt(
      getField(rowForSelection, ['Father_GT'])
    );

    if (GENOTYPES.includes(datasetMother)) {
      setMotherGt(datasetMother);
    }

    if (GENOTYPES.includes(datasetFather)) {
      setFatherGt(datasetFather);
    }

    setReportGenerated(false);
    setPage('variant');
  }

  function newAnalysis() {
    setSelectedRow(null);
    setReportGenerated(false);
    setPage('input');
  }

  const workspace = page !== 'home';

  return (
    <div
      className={`app ${
        workspace ? 'workspace' : 'landing'
      }`}
    >
      {workspace && (
        <Sidebar
          page={page}
          setPage={setPage}
          hasSelection={!!selectedRow}
        />
      )}

      <main className="main">
        {dataError && (
          <div className="dataset-alert">
            <AlertTriangle size={17} />

            <span>{dataError}</span>

            <button
              onClick={() => setDataError('')}
              aria-label="Close error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {page === 'home' && (
          <Home onStart={begin} />
        )}

        {page === 'input' && (
          <InputPage
            loading={loadingData}
            chromosomes={chromosomes}
            chromosome={chromosome}
            setChromosome={setChromosome}
            positions={positions}
            position={position}
            setPosition={setPosition}
            mother={motherGt}
            setMother={setMotherGt}
            father={fatherGt}
            setFather={setFatherGt}
            onAnalyze={analyze}
          />
        )}

        {page === 'variant' && (
          <VariantPage
            row={selectedRow}
            onBack={() => setPage('input')}
            onNext={() => setPage('inheritance')}
          />
        )}

        {page === 'inheritance' && (
          <InheritancePage
            row={selectedRow}
            mother={motherGt}
            father={fatherGt}
            onMother={setMotherGt}
            onFather={setFatherGt}
            onBack={() => setPage('variant')}
            onNext={() => {
              setReportGenerated(true);
              setPage('report');
            }}
          />
        )}

        {page === 'report' && (
          <ReportPage
            row={selectedRow}
            mother={motherGt}
            father={fatherGt}
            reportGenerated={reportGenerated}
            source={source}
            onBack={() => setPage('inheritance')}
            onNew={newAnalysis}
          />
        )}
      </main>
    </div>
  );
}

function Sidebar({
  page,
  setPage,
  hasSelection,
}) {
  return (
    <aside className="sidebar">
      <button
        className="brand"
        onClick={() => setPage('home')}
      >
        <span className="brand-icon">
          <Dna size={25} />
        </span>

        <span>
          <b>Genetic Risk</b>
          <strong>Prediction</strong>
        </span>
      </button>

      <nav>
        <NavItem
          active={page === 'home'}
          icon={<HomeIcon />}
          label="Home"
          onClick={() => setPage('home')}
        />

        <NavItem
          active={page === 'input'}
          icon={<Dna />}
          label="Import Variant"
          onClick={() => setPage('input')}
        />

        <NavItem
          active={page === 'variant'}
          icon={<FileText />}
          label="Variant Information"
          onClick={() =>
            hasSelection && setPage('variant')
          }
          disabled={!hasSelection}
        />

        <NavItem
          active={page === 'inheritance'}
          icon={<UsersRound />}
          label="Inheritance Analysis"
          onClick={() =>
            hasSelection &&
            setPage('inheritance')
          }
          disabled={!hasSelection}
        />

        <NavItem
          active={page === 'report'}
          icon={<FileText />}
          label="Report"
          onClick={() =>
            hasSelection && setPage('report')
          }
          disabled={!hasSelection}
        />
      </nav>
    </aside>
  );
}

function NavItem({
  active,
  icon,
  label,
  onClick,
  disabled,
}) {
  return (
    <button
      disabled={disabled}
      className={`nav-item ${
        active ? 'active' : ''
      }`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function Home({ onStart }) {
  return (
    <section className="home-page">
      <div className="home-top">
        <div className="mini-brand" />

        <div className="status-pill">
          <i />
          Research Prototype
        </div>
      </div>

      <div className="hero">
        <div className="hero-copy">
          <h1 className="hero-title">
            <Dna
              className="hero-title-dna"
              size={92}
            />

            <span>
              Genetic Risk
              <br />
              <strong>Prediction</strong>
            </span>
          </h1>

          <div className="hero-rule" />

          <p>
            Analyze potential genetic inheritance
            using parental genotypes, curated variant
            annotations and Mendelian inheritance
            principles.
          </p>

          <button
            className="hero-button"
            onClick={onStart}
          >
            Start Analysis
            <ArrowRight size={19} />
          </button>

          <div className="hero-note">
            <ShieldCheck size={15} />
            For research and informational purposes
            only.
          </div>
        </div>

        <div className="family-art">
          <div className="art-halo" />
          <div className="art-ring ring1" />
          <div className="art-ring ring2" />

          <div className="dna-art">
            <Dna size={205} />
          </div>

          <div className="family-line mother-line" />
          <div className="family-line father-line" />
          <div className="family-line child-line" />

          <FamilyNode
            cls="mother"
            icon={<UserRound />}
            label="MOTHER"
          />

          <FamilyNode
            cls="father"
            icon={<UserRound />}
            label="FATHER"
          />

          <FamilyNode
            cls="child"
            icon={<Baby />}
            label="CHILD"
          />
        </div>
      </div>

      <div className="home-features">
        <Feature
          icon={<Dna />}
          title="Variant Information"
          text="Clinical and molecular annotation for the selected variant."
        />

        <Feature
          icon={<UsersRound />}
          title="Inheritance Analysis"
          text="Mendelian child-genotype probabilities from parental inputs."
        />

        <Feature
          icon={<FileText />}
          title="Research Report"
          text="A clean summary of findings, evidence and interpretation."
        />
      </div>
    </section>
  );
}

function FamilyNode({
  cls,
  icon,
  label,
}) {
  return (
    <div className={`family-node ${cls}`}>
      <div>{icon}</div>
      <b>{label}</b>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}) {
  return (
    <div className="feature">
      <div className="feature-icon">
        {icon}
      </div>

      <div>
        <b>{title}</b>
        <span>{text}</span>
      </div>
    </div>
  );
}

function Stepper({ active }) {
  return (
    <div className="stepper">
      {STEPS.map(
        ([id, label], index) => {
          const number = index + 1;

          return (
            <React.Fragment key={id}>
              <div
                className={`step ${
                  number === active
                    ? 'active'
                    : ''
                } ${
                  number < active
                    ? 'done'
                    : ''
                }`}
              >
                <span>
                  {number < active ? (
                    <Check size={15} />
                  ) : (
                    number
                  )}
                </span>

                {label}
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={`step-separator ${
                    number < active
                      ? 'done'
                      : ''
                  }`}
                />
              )}
            </React.Fragment>
          );
        }
      )}
    </div>
  );
}

function WorkspaceHeader({
  active,
  title,
  subtitle,
}) {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">
            STEP {String(active).padStart(2, '0')}
          </div>

          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        <button
          className="home-button"
          onClick={() =>
            window.location.reload()
          }
        >
          <HomeIcon size={17} />
          Home
        </button>
      </div>

      <Stepper active={active} />
    </>
  );
}

function InputPage({
  loading,
  chromosomes,
  chromosome,
  setChromosome,
  positions,
  position,
  setPosition,
  mother,
  setMother,
  father,
  setFather,
  onAnalyze,
}) {
  return (
    <section className="workspace-page">
      <WorkspaceHeader
        active={1}
        title="Import Variant"
        subtitle="Select a genomic location and provide the genotypes of both parents."
      />

      <div className="panel large-panel">
        <SectionHead
          icon={<Dna />}
          title="Variant Selection"
          text="Choose a chromosome first. The position list is populated from the connected UI dataset."
        />

        <div className="field-grid">
          <Field label="Chromosome">
            <select
              value={chromosome}
              disabled={
                loading ||
                !chromosomes.length
              }
              onChange={(event) =>
                setChromosome(
                  event.target.value
                )
              }
            >
              {loading ? (
                <option>
                  Loading…
                </option>
              ) : (
                chromosomes.map(
                  (chrom) => (
                    <option
                      key={chrom}
                      value={chrom}
                    >
                      {chrom}
                    </option>
                  )
                )
              )}
            </select>
          </Field>

          <Field label="Variant Position">
            <select
              value={position}
              disabled={
                loading ||
                !positions.length
              }
              onChange={(event) =>
                setPosition(
                  event.target.value
                )
              }
            >
              {positions.map(
                (pos) => (
                  <option
                    key={pos}
                    value={pos}
                  >
                    {formatPosition(pos)}
                  </option>
                )
              )}
            </select>
          </Field>
        </div>

        <div className="dataset-note">
          <Info size={15} />

          Position options are limited to
          variants available for the selected
          chromosome.
        </div>

        <div className="divider" />

        <SectionHead
          icon={<UsersRound />}
          title="Parental Genotypes"
          text="Enter the genotype of each parent for the selected variant."
        />

        <div className="parents-input">
          <ParentInput
            gender="mother"
            label="MOTHER"
            value={mother}
            setValue={setMother}
          />

          <ParentInput
            gender="father"
            label="FATHER"
            value={father}
            setValue={setFather}
          />
        </div>

        <button
          className="primary full"
          disabled={
            !position ||
            !chromosome ||
            loading
          }
          onClick={onAnalyze}
        >
          Analyze Inheritance
          <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

function SectionHead({
  icon,
  title,
  text,
}) {
  return (
    <div className="section-head">
      <div className="section-icon">
        {icon}
      </div>

      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function ParentInput({
  gender,
  label,
  value,
  setValue,
}) {
  return (
    <div
      className={`parent-input ${gender}`}
    >
      <div className="parent-label">
        <div className="parent-avatar">
          <UserRound size={19} />
        </div>

        <div>
          <b>{label}</b>
          <span>
            Parental genotype
          </span>
        </div>
      </div>

      <select
        value={value}
        onChange={(event) =>
          setValue(event.target.value)
        }
      >
        {GENOTYPES.map((genotype) => (
          <option
            key={genotype}
            value={genotype}
          >
            {genotype}
          </option>
        ))}
      </select>
    </div>
  );
}

function VariantPage({
  row,
  onBack,
  onNext,
}) {
  if (!row) {
    return <EmptyState />;
  }

  const ref = getField(row, ['REF']);
  const alt = getField(row, ['ALT']);
  const gene = getField(row, ['Gene']);

  const consequence = getField(
    row,
    [
      'Molecular_Consequence',
      'Consequence',
    ]
  );

  const clinical = getField(
    row,
    [
      'Clinical_Significance',
      'CLNSIG',
    ]
  );

  const disease = getField(
    row,
    ['Disease_Condition']
  );

  const variantType = inferVariantType(
    ref,
    alt
  );

  return (
    <section className="workspace-page">
      <WorkspaceHeader
        active={2}
        title="Variant Information"
        subtitle="Review the selected variant and its available research annotations."
      />

      <div className="variant-hero">
        <Metric
          label="CHROMOSOME"
          value={normalizeChromosome(
            row.CHROM
          )}
        />

        <Metric
          label="POSITION (GRCh38)"
          value={formatPosition(
            row.POS
          )}
        />

        <Metric
          label="REF / ALT"
          value={`${display(ref)} / ${display(alt)}`}
        />

        <Metric
          label="AFFECTED GENE"
          value={display(gene)}
        />

        <Metric
          label="VARIANT TYPE"
          value={variantType}
          sub={
            variantType === 'SNV'
              ? 'Single nucleotide variant'
              : ''
          }
        />
      </div>

      <div className="two-col top-gap">
        <div className="panel">
          <div className="panel-title">
            MOLECULAR CONSEQUENCE
          </div>

          <div className="single-data-card molecular-data">
            <span>
              Molecular Consequence
            </span>

            <strong>
              {display(consequence)}
            </strong>
          </div>
        </div>

        <div className="panel clinical-panel">
          <div className="panel-title">
            CLINICAL SIGNIFICANCE
          </div>

          <div
            className={`verdict ${clinicalTone(
              clinical
            )}`}
          >
            <div className="verdict-icon">
              <ShieldCheck size={25} />
            </div>

            <div>
              <h3>
                {clinicalLabel(clinical)}
              </h3>

              <p>
                The selected record contains
                the clinical classification
                available in the connected
                dataset.
              </p>
            </div>
          </div>

          <div className="mini-info">
            <Info size={15} />

            <span>
              Clinical significance is shown
              from the selected research record.
              It is not a medical diagnosis.
            </span>
          </div>
        </div>
      </div>

      <div className="panel disease-panel top-gap">
        <div className="panel-title">
          DISEASE / CONDITION ASSOCIATION
        </div>

        <div className="disease-table">
          <div className="disease-row">
            <b>
              Associated Condition
            </b>

            <span>
              {display(disease)}
            </span>
          </div>
        </div>
      </div>

      <div className="bottom-actions">
        <button
          className="secondary"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <button
          className="primary"
          onClick={onNext}
        >
          Proceed to Inheritance Analysis
          <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>

      {sub && (
        <small>{sub}</small>
      )}
    </div>
  );
}

function InheritancePage({
  row,
  mother,
  father,
  onMother,
  onFather,
  onBack,
  onNext,
}) {
  if (!row) {
    return <EmptyState />;
  }

  const probabilities =
    probabilityMap(
      mother,
      father
    );

  const possible =
    possibleGenotypes(
      mother,
      father
    );

  const observedChild =
    canonicalGt(
      getField(row, ['Child_GT'])
    );

  const status =
    calculateInheritanceStatus(
      observedChild,
      mother,
      father
    );

  return (
    <section className="workspace-page">
      <WorkspaceHeader
        active={3}
        title="Inheritance Analysis"
        subtitle="Evaluate how the selected variant may be inherited by the child based on the provided parental genotypes."
      />

      <div
        className={`compatibility ${
          status === 'Inconsistent'
            ? 'bad'
            : ''
        }`}
      >
        <div className="compat-icon">
          {status ===
          'Inconsistent' ? (
            <AlertTriangle size={24} />
          ) : (
            <Check size={25} />
          )}
        </div>

        <div>
          <b>{status}</b>

          <span>
            MENDELIAN COMPATIBILITY
          </span>

          <p>
            {statusExplanation(status)}
          </p>
        </div>
      </div>

      <div className="two-col top-gap">
        <div className="panel inheritance-panel">
          <div className="panel-title large">
            PARENT → CHILD INHERITANCE
          </div>

          <p className="panel-sub">
            Transmission of the selected
            variant from each parent to the
            child.
          </p>

          <div className="transmission">
            <ParentCard
              gender="mother"
              gt={mother}
            />

            <div className="arrow-flow">
              →
            </div>

            <div className="child-card">
              <div>
                <Baby size={27} />
              </div>

              <b>CHILD</b>

              <span>
                Possible genotypes
              </span>
            </div>

            <div className="arrow-flow">
              ←
            </div>

            <ParentCard
              gender="father"
              gt={father}
            />
          </div>

          <div className="possible">
            Possible child genotypes:{' '}
            <b>
              {possible.join(', ') ||
                'None'}
            </b>
          </div>

          <div className="dataset-note">
            <Info size={15} />

            Possible child genotypes are
            calculated using Mendelian
            inheritance rules.
          </div>
        </div>

        <div className="panel probabilities">
          <div className="panel-title large">
            CHILD GENOTYPE PROBABILITIES
          </div>

          <p className="panel-sub">
            Probability of each possible
            genotype for the child.
          </p>

          {GENOTYPES.map(
            (genotype) => (
              <div
                className="prob"
                key={genotype}
              >
                <div>
                  <b>{genotype}</b>

                  <span>
                    {genotypeMeaning(
                      genotype
                    )}
                  </span>
                </div>

                <div className="prob-track">
                  <i
                    style={{
                      width: `${
                        probabilities[
                          genotype
                        ] * 100
                      }%`,
                    }}
                  />
                </div>

                <strong>
                  {Math.round(
                    probabilities[
                      genotype
                    ] * 100
                  )}
                  %
                </strong>
              </div>
            )
          )}

          <div className="dataset-note">
            <Info size={15} />

            These probabilities indicate the
            chance of each genotype outcome,
            not disease risk.
          </div>
        </div>
      </div>

      <div className="panel interpretation top-gap">
        <div className="panel-title large">
          VARIANT INTERPRETATION
        </div>

        <div className="interpret-grid">
          <div>
            <span>
              Variant Classification
            </span>

            <b>
              {clinicalLabel(
                row.Clinical_Significance
              )}
            </b>
          </div>

          <div>
            <span>
              Observed Child Genotype
            </span>

            <b>
              {display(
                observedChild,
                'Not available'
              )}
            </b>
          </div>

          <p>
            The entered parental genotypes
            determine the possible child
            genotype distribution. Clinical
            significance describes the selected
            variant record and does not by
            itself establish whether a child
            will develop a condition.
          </p>
        </div>
      </div>

      <div className="panel evidence top-gap">
        <div className="panel-title large">
          INHERITANCE EVIDENCE
        </div>

        <div className="evidence-grid">
          <Evidence
            icon={<UserRound />}
            title="Mother alternate-allele status"
            value={alternateAlleleStatus(
              mother
            )}
          />

          <Evidence
            icon={<UserRound />}
            title="Father alternate-allele status"
            value={alternateAlleleStatus(
              father
            )}
          />

          <Evidence
            icon={<Baby />}
            title="Possible child genotypes"
            value={
              possible.join(', ') ||
              'None'
            }
          />

          <Evidence
            icon={<ShieldCheck />}
            title="Inheritance status"
            value={status}
          />
        </div>
      </div>

      <div className="bottom-actions">
        <button
          className="secondary"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <button
          className="primary"
          onClick={onNext}
        >
          Generate Report
          <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}

function alternateAlleleStatus(
  genotype
) {
  const gt = canonicalGt(genotype);

  if (gt === '0/0') {
    return 'No alternate allele';
  }

  if (gt === '0/1') {
    return 'One alternate allele (Carrier)';
  }

  if (gt === '1/1') {
    return 'Two alternate alleles';
  }

  return 'Genotype unavailable';
}

function ParentCard({
  gender,
  gt,
}) {
  return (
    <div
      className={`transmission-parent ${gender}`}
    >
      <div className="gender-icon">
        <UserRound size={23} />
      </div>

      <span>
        {gender.toUpperCase()}
      </span>

      <b>{gt}</b>

      <small>
        {genotypeMeaning(gt)}
      </small>
    </div>
  );
}

function Evidence({
  icon,
  title,
  value,
}) {
  return (
    <div className="evidence-item">
      <div>{icon}</div>

      <span>{title}</span>

      <b>{value}</b>
    </div>
  );
}

function ReportPage({
  row,
  mother,
  father,
  reportGenerated,
  source,
  onBack,
  onNew,
}) {
  if (!row) {
    return <EmptyState />;
  }

  const probabilities =
    probabilityMap(
      mother,
      father
    );

  const possible =
    possibleGenotypes(
      mother,
      father
    );

  const observedChild =
    canonicalGt(
      getField(row, ['Child_GT'])
    );

  const status =
    calculateInheritanceStatus(
      observedChild,
      mother,
      father
    );

  const reportId =
    `GRP-${String(
      row.POS || '000000'
    ).padStart(6, '0')}`;

  function printReport() {
    window.print();
  }

  return (
    <section className="workspace-page report-page">
      <WorkspaceHeader
        active={4}
        title="Report"
        subtitle="Summary of the variant, inheritance analysis and available clinical annotation."
      />

      <div className="report-meta">
        <div>
          <span>REPORT ID</span>
          <b>{reportId}</b>
        </div>

        <div>
          <span>Generated</span>
          <b>
            {new Date().toLocaleString()}
          </b>
        </div>

        <button
          className="primary"
          onClick={printReport}
        >
          <FileText size={17} />
          Print / Save Report
        </button>
      </div>

      <div className="report-paper">
        <div className="report-title">
          <div>
            <span>
              GENETIC INHERITANCE ANALYSIS
            </span>

            <h2>
              Research Analysis Report
            </h2>
          </div>

          <div className="report-logo">
            <Dna size={27} />
          </div>
        </div>

        <div className="report-divider" />

        <section>
          <h3>VARIANT SUMMARY</h3>

          <div className="report-variant-grid">
            <Metric
              label="Chromosome"
              value={normalizeChromosome(
                row.CHROM
              )}
            />

            <Metric
              label="Position (GRCh38)"
              value={formatPosition(
                row.POS
              )}
            />

            <Metric
              label="REF / ALT"
              value={`${display(
                row.REF
              )} / ${display(row.ALT)}`}
            />

            <Metric
              label="Affected Gene"
              value={display(row.Gene)}
            />

            <Metric
              label="Variant Type"
              value={inferVariantType(
                row.REF,
                row.ALT
              )}
            />
          </div>
        </section>

        <section>
          <h3>
            PARENTAL GENOTYPES & INHERITANCE
          </h3>

          <div className="report-parent-grid">
            <ReportParent
              label="Mother"
              gt={mother}
              gender="mother"
            />

            <div className="report-arrow">
              →
            </div>

            <ReportParent
              label="Father"
              gt={father}
              gender="father"
            />

            <div className="report-arrow">
              ←
            </div>

            <div className="report-child">
              <Baby size={24} />

              <b>
                Child possibilities
              </b>

              <span>
                {possible.join(', ') ||
                  'None'}
              </span>
            </div>
          </div>

          <div className="report-probs">
            {GENOTYPES.map(
              (genotype) => (
                <div key={genotype}>
                  <b>{genotype}</b>

                  <span>
                    {genotypeMeaning(
                      genotype
                    )}
                  </span>

                  <strong>
                    {Math.round(
                      probabilities[
                        genotype
                      ] * 100
                    )}
                    %
                  </strong>
                </div>
              )
            )}
          </div>

          <div className="report-status">
            <span>
              Mendelian compatibility
            </span>

            <b
              className={
                status === 'Inconsistent'
                  ? 'danger'
                  : status ===
                      'Compatible'
                    ? 'safe'
                    : 'neutral'
              }
            >
              {status}
            </b>
          </div>
        </section>

        <section>
          <h3>
            CLINICAL INTERPRETATION
          </h3>

          <div className="report-clinical">
            <div>
              <span>
                Clinical significance
              </span>

              <b
                className={clinicalTone(
                  row.Clinical_Significance
                )}
              >
                {clinicalLabel(
                  row.Clinical_Significance
                )}
              </b>
            </div>

            <div>
              <span>
                Disease / condition
              </span>

              <b>
                {display(
                  row.Disease_Condition
                )}
              </b>
            </div>

            <div>
              <span>
                Molecular consequence
              </span>

              <b>
                {display(
                  row.Molecular_Consequence
                )}
              </b>
            </div>
          </div>
        </section>

        <section>
          <h3>
            INHERITANCE SUMMARY
          </h3>

          <div className="report-summary-box">
            <div>
              <span>Mother genotype</span>
              <b>{mother}</b>
            </div>

            <div>
              <span>Father genotype</span>
              <b>{father}</b>
            </div>

            <div>
              <span>
                Observed child genotype
              </span>

              <b>
                {display(
                  observedChild
                )}
              </b>
            </div>

            <div>
              <span>
                Possible child genotypes
              </span>

              <b>
                {possible.join(', ') ||
                  'None'}
              </b>
            </div>
          </div>
        </section>

        <section>
          <h3>
            DATA SOURCE
          </h3>

          <div className="report-source">
            <Info size={17} />

            <span>
              This analysis uses the connected
              Phase 2 UI dataset generated from
              the project's research dataset.
              {source
                ? ` Source: ${source}`
                : ''}
            </span>
          </div>
        </section>

        <div className="report-disclaimer">
          <ShieldCheck size={18} />

          <p>
            <b>DISCLAIMER:</b>{' '}
            This report is generated by an
            in-silico research prototype for
            educational and research use only.
            It is not a substitute for
            professional medical advice,
            diagnosis, or treatment.
          </p>
        </div>

        <div className="report-footer">
          <span>
            Genetic Risk Prediction · Research
            Prototype
          </span>

          <span>
            {reportGenerated
              ? 'Analysis generated'
              : 'Research analysis'}
          </span>
        </div>
      </div>

      <div className="bottom-actions">
        <button
          className="secondary"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <button
          className="primary"
          onClick={onNew}
        >
          Start New Analysis
          <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}

function ReportParent({
  label,
  gt,
  gender,
}) {
  return (
    <div
      className={`report-parent ${gender}`}
    >
      <div className="gender-icon">
        <UserRound size={20} />
      </div>

      <span>{label}</span>

      <b>{gt}</b>

      <small>
        {genotypeMeaning(gt)}
      </small>
    </div>
  );
}

function EmptyState() {
  return (
    <section className="empty-state">
      <Dna size={34} />

      <h2>
        No variant selected
      </h2>

      <p>
        Return to Import Variant and select
        a record from the connected UI dataset.
      </p>
    </section>
  );
}

export default App;