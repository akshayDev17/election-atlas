# Import inputs committed here

The D1 import reads the atlas data of the pinned github.io commit
(`backend/atlas-source.json`). A file under this directory, at the same path
relative to `data/`, replaces that file as the import input. Atlas data no longer
lands on github.io, so a published file that changes after the move enters here.

| file | why it is here |
|---|---|
| `results/ls/{1980,1984,1989,1991,1996,2004}.json` | Rebuilt by `tools/build-ls-results.py` from each year's ECI report PDF. The rebuild was made on the github.io branch `fm/pf-atlas-ls-legacy-rebuild` (`6e5a409`), whose PR there was closed unmerged so that the fix lands here instead. The files in the pinned commit gave 2 to 8 seats a year to IND, by a winner rule the builder has since fixed. Each file names its sources with sha256 and fetched_at, and rebuilding it from those exact files reproduces it byte for byte. |

The deploy compares the D1 export against the pinned commit's data with this
directory laid over it.
