-- Atomic Coupon Increment with Quota Check
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id UUID)
RETURNS VOID AS $$
DECLARE
    v_usage_limit INTEGER;
    v_used_count INTEGER;
BEGIN
    -- Select with Row Level Lock
    SELECT usage_limit, used_count INTO v_usage_limit, v_used_count
    FROM public.coupons
    WHERE id = p_coupon_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Coupon not found.';
    END IF;

    -- Check Quota
    IF v_usage_limit > 0 AND v_used_count >= v_usage_limit THEN
        RAISE EXCEPTION 'Coupon quota reached.';
    END IF;

    -- Atomic Increment
    UPDATE public.coupons
    SET used_count = used_count + 1
    WHERE id = p_coupon_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
