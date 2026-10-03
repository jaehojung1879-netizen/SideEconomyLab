# Seoul Open Data API foundation v1

## Purpose

Validate that the repository secret `SEOUL` can authenticate against Seoul Open Data and establish the smallest reusable API client.

This is intentionally a smoke test, not a Seoul opportunity model.

## First service

`VwsmSignguWrcPopltnW`

Seoul Commercial District Analysis Service — workplace population by district.

The smoke test requests only rows 1-5.

## Security

- API key lives only in the GitHub repository secret `SEOUL`.
- The script never prints the key.
- The script never prints the full request URL because the key is embedded in the URL path.
- The uploaded artifact contains only response metadata and the five public-data rows.
- No secret value is committed to the repository.

## Usage in GitHub Actions

The workflow `.github/workflows/seoul-open-data-smoke.yml` runs on pushes to the dedicated data branch and can also be run manually after merge.

## Why this dataset

Workplace population is a useful future feature for opportunity models aimed at office-worker demand, but this test does **not** claim that workplace population predicts business success.

## Future data candidates

Only after Korea feasibility screening narrows the opportunity set:

- workplace population
- floating / street-level population
- estimated sales
- store count / opening / closure
- attractor facilities
- commercial-district polygons
- residential population
- apartment / household features

We should add only the datasets that correspond to actual candidate demand hypotheses.
