-- ===================================================================
-- WORKDAYS SCHEMA UPDATE
-- Replace days_per_week with individual day flags for better control
-- ===================================================================

-- Step 1: Add new columns for each day of the week
ALTER TABLE user_salary_settings 
ADD COLUMN works_monday BOOLEAN DEFAULT false,
ADD COLUMN works_tuesday BOOLEAN DEFAULT false,
ADD COLUMN works_wednesday BOOLEAN DEFAULT false,
ADD COLUMN works_thursday BOOLEAN DEFAULT false,
ADD COLUMN works_friday BOOLEAN DEFAULT false,
ADD COLUMN works_saturday BOOLEAN DEFAULT false,
ADD COLUMN works_sunday BOOLEAN DEFAULT false;

-- Step 2: Migrate existing data from days_per_week to individual days
-- Assume standard Monday-Friday for 5 days, Monday-Saturday for 6 days, etc.
UPDATE user_salary_settings 
SET 
  works_monday = CASE WHEN days_per_week >= 1 THEN true ELSE false END,
  works_tuesday = CASE WHEN days_per_week >= 2 THEN true ELSE false END,
  works_wednesday = CASE WHEN days_per_week >= 3 THEN true ELSE false END,
  works_thursday = CASE WHEN days_per_week >= 4 THEN true ELSE false END,
  works_friday = CASE WHEN days_per_week >= 5 THEN true ELSE false END,
  works_saturday = CASE WHEN days_per_week >= 6 THEN true ELSE false END,
  works_sunday = CASE WHEN days_per_week >= 7 THEN true ELSE false END;

-- Step 3: Keep days_per_week for now (we'll remove it later after testing)
-- ALTER TABLE user_salary_settings DROP COLUMN days_per_week;

-- Step 4: Create helper function to check if user should work on specific day
CREATE OR REPLACE FUNCTION user_works_on_day(
  user_id_param TEXT,
  work_date DATE,
  OUT should_work BOOLEAN,
  OUT is_extra_day BOOLEAN
) AS $$
DECLARE
  day_of_week INTEGER;
  salary_record RECORD;
BEGIN
  -- Get day of week (0=Sunday, 1=Monday, ... 6=Saturday)
  day_of_week := EXTRACT(DOW FROM work_date);
  
  -- Get the most recent salary settings for this user and date
  SELECT * INTO salary_record
  FROM user_salary_settings 
  WHERE user_id = user_id_param 
    AND effective_from <= work_date
  ORDER BY effective_from DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    should_work := false;
    is_extra_day := true;
    RETURN;
  END IF;
  
  -- Check if user should work on this day based on day of week
  should_work := CASE day_of_week
    WHEN 0 THEN salary_record.works_sunday     -- Sunday
    WHEN 1 THEN salary_record.works_monday     -- Monday
    WHEN 2 THEN salary_record.works_tuesday    -- Tuesday
    WHEN 3 THEN salary_record.works_wednesday  -- Wednesday
    WHEN 4 THEN salary_record.works_thursday   -- Thursday
    WHEN 5 THEN salary_record.works_friday     -- Friday
    WHEN 6 THEN salary_record.works_saturday   -- Saturday
    ELSE false
  END;
  
  -- Extra day = working when not supposed to
  is_extra_day := NOT should_work;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to calculate payroll with new logic
CREATE OR REPLACE FUNCTION calculate_user_payroll_new(
  user_id_param TEXT,
  start_date DATE,
  end_date DATE
) RETURNS TABLE(
  user_id TEXT,
  user_name TEXT,
  user_type_id INTEGER,
  total_hours DECIMAL,
  regular_hours DECIMAL,
  extra_hours DECIMAL,
  regular_pay DECIMAL,
  extra_pay DECIMAL,
  total_pay DECIMAL
) AS $$
DECLARE
  user_record RECORD;
  entry_record RECORD;
  day_info RECORD;
  hours_worked DECIMAL;
BEGIN
  -- Get user info
  SELECT u.id, u.full_name, u.user_type_id
  INTO user_record
  FROM users u 
  WHERE u.id = user_id_param AND u.is_active = true;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Initialize totals
  total_hours := 0;
  regular_hours := 0;
  extra_hours := 0;
  regular_pay := 0;
  extra_pay := 0;
  
  -- Process each time entry
  FOR entry_record IN
    SELECT 
      te.clock_in_time,
      te.clock_out_time,
      DATE(te.clock_in_time) as work_date,
      EXTRACT(EPOCH FROM (te.clock_out_time - te.clock_in_time)) / 3600.0 as hours
    FROM time_entries te
    WHERE te.user_id = user_id_param
      AND te.clock_in_time >= start_date
      AND te.clock_in_time < (end_date + INTERVAL '1 day')
      AND te.clock_out_time IS NOT NULL
  LOOP
    hours_worked := entry_record.hours;
    total_hours := total_hours + hours_worked;
    
    -- Check if this is a regular or extra workday
    SELECT * INTO day_info 
    FROM user_works_on_day(user_id_param, entry_record.work_date);
    
    IF user_record.user_type_id IN (1, 2) THEN
      -- Monthly salary employees (Type 1 & 2)
      IF day_info.is_extra_day THEN
        -- Working on off-day = extra pay
        extra_hours := extra_hours + hours_worked;
        -- Calculate extra pay based on overtime rates
        -- (We'll implement this calculation logic)
      ELSE
        -- Regular working day = no pay in weekly report (paid monthly)
        regular_hours := regular_hours + hours_worked;
        -- regular_pay stays 0 for monthly employees
      END IF;
    ELSE
      -- Hourly/daily employees (Type 3) - current logic
      regular_hours := regular_hours + hours_worked;
      -- Calculate regular pay based on current system
    END IF;
  END LOOP;
  
  -- Calculate total pay
  total_pay := regular_pay + extra_pay;
  
  -- Return results
  user_id := user_record.id;
  user_name := user_record.full_name;
  user_type_id := user_record.user_type_id;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create view for easy workday checking
CREATE OR REPLACE VIEW user_workdays AS
SELECT 
  user_id,
  effective_from,
  works_monday,
  works_tuesday,
  works_wednesday,
  works_thursday,
  works_friday,
  works_saturday,
  works_sunday,
  -- Count working days
  (works_monday::int + works_tuesday::int + works_wednesday::int + 
   works_thursday::int + works_friday::int + works_saturday::int + works_sunday::int) as total_workdays_per_week
FROM user_salary_settings;

-- ===================================================================
-- TESTING QUERIES
-- ===================================================================

-- Test the new function
-- SELECT * FROM user_works_on_day('50.00.13.1012', '2025-01-15');

-- Test payroll calculation
-- SELECT * FROM calculate_user_payroll_new('50.00.13.1012', '2025-01-13', '2025-01-19');

-- View user workdays
-- SELECT * FROM user_workdays WHERE user_id = '50.00.13.1012'; 