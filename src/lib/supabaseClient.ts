import { createClient } from "@supabase/supabase-js";
 
const supabaseUrl = "https://moliabvuugraoecrirjf.supabase.co";
const supaAnone = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vbGlhYnZ1dWdyYW9lY3JpcmpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4ODkzODYsImV4cCI6MjA4OTQ2NTM4Nn0.uiSZBlgWDK3bXPZ7klywW5WLKjNbAniMvrRRf6035YI";
 
export const supabase = createClient(supabaseUrl, supaAnone);