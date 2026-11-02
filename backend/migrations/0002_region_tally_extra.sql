-- A region of a Lok Sabha state file may carry published fields beyond seats,
-- electors and parties: the 1980-2004 files list each seat returned unopposed
-- (`unopposed`, with the report page that prints it). `extra` holds those fields as
-- JSON, with their order, so the export reproduces the file; NULL when there are none.
ALTER TABLE region_tally ADD COLUMN extra TEXT;
