"""Country-neutral harvest code: fetch-and-hash plumbing, the source registry and
the per-record gate. A country's own harvesters live under countries/<CC>/harvest/
and import from here with the repository root on sys.path."""
