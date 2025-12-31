
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdfmyfntxlnaiyofvvvm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZm15Zm50eGxuYWl5b2Z2dnZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzMxNzIsImV4cCI6MjA4MjcwOTE3Mn0.g06v_O3GRmOoBryYB4jQTwTyANScm9UrPE4jUReYp-k';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const isSupabaseReady = true;
