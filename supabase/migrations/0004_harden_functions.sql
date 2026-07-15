-- ============================================================================
-- Migration 0004: pin search_path on trigger helper functions
-- (addresses the "function_search_path_mutable" advisor for our functions)
-- ============================================================================

alter function public.set_updated_at() set search_path = public;
alter function public.normalize_candidate() set search_path = public;
alter function public.touch_candidate_activity() set search_path = public;
