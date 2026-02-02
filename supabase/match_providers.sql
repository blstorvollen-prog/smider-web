
-- Function to match a newly created job to relevant contractors
CREATE OR REPLACE FUNCTION match_job_to_providers()
RETURNS TRIGGER AS $$
DECLARE
  mapped_category text;
  provider_record RECORD;
BEGIN
  -- 1. Map Norwegian AI categories to English DB keys
  --    AI returns: MALER, SNEKKER, RØRLEGGER, ELEKTRIKER, FLISLEGGING, HANDYMAN, TOTALRENOVERING_BAD
  --    DB expects: painter, carpenter, plumber, electrician, tiler, handyman, (etc from JobCategories.ts)
  
  CASE NEW.main_category
    WHEN 'MALER' THEN mapped_category := 'painter';
    WHEN 'SNEKKER' THEN mapped_category := 'carpenter';
    WHEN 'RØRLEGGER' THEN mapped_category := 'plumber';
    WHEN 'ELEKTRIKER' THEN mapped_category := 'electrician';
    WHEN 'FLISLEGGING' THEN mapped_category := 'tiler';
    WHEN 'HANDYMAN' THEN mapped_category := 'handyman';
    WHEN 'TOTALRENOVERING_BAD' THEN mapped_category := 'plumber'; -- Lead contractor usually
    ELSE mapped_category := lower(NEW.main_category); -- Fallback
  END CASE;

  -- 2. Find matching contractors
  --    - Must have the category in their list
  --    - Must be within service radius (using PostGIS)
  FOR provider_record IN
    SELECT id, service_radius_km
    FROM contractors
    WHERE 
      mapped_category = ANY(category)
      AND is_available = true
      AND (
        -- If job has location, check distance. If not, maybe skip or match all in "default" area?
        -- We assume job.location is set (it should be).
        NEW.location IS NULL 
        OR 
        st_dwithin(
          location, 
          NEW.location, 
          service_radius_km * 1000 -- km to meters
        )
      )
  LOOP
    -- 3. Create Job Offer
    INSERT INTO job_offers (job_id, contractor_id, status, expires_at)
    VALUES (
      NEW.id,
      provider_record.id,
      'pending',
      now() + interval '24 hours'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_job_created_match ON jobs;
CREATE TRIGGER on_job_created_match
  AFTER INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION match_job_to_providers();
