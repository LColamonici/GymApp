-- =============================================================================
-- RPC: merge_inventory_settings
-- Merges a partial JSONB patch into user_inventory.settings using the
-- Postgres || (concat) operator, so callers only need to send changed keys.
--
-- Example: updating just the grid position without clobbering available_weights
--   SELECT merge_inventory_settings('uuid-here', '{"x": 3, "y": 5}');
-- =============================================================================

create or replace function public.merge_inventory_settings(
  p_inventory_id  uuid,
  p_patch         jsonb
)
returns void
language plpgsql
security definer   -- runs as the function owner, bypasses RLS for the update
as $$
begin
  update public.user_inventory
  set    settings   = settings || p_patch,
         updated_at = now()
  where  id = p_inventory_id
    -- RLS-equivalent guard: only the owning user may call this
    and    user_id = auth.uid();

  if not found then
    raise exception 'Inventory item % not found or access denied', p_inventory_id;
  end if;
end;
$$;

-- Grant execute to authenticated users only
revoke execute on function public.merge_inventory_settings(uuid, jsonb) from public;
grant  execute on function public.merge_inventory_settings(uuid, jsonb) to authenticated;
