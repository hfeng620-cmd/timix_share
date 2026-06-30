CREATE OR REPLACE FUNCTION get_database_size()
RETURNS TEXT AS $$
BEGIN
  RETURN pg_size_pretty(pg_database_size(current_database()));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
