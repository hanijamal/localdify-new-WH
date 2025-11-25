CREATE OR REPLACE FUNCTION public.get_public_location_data(p_business_slug TEXT, p_location_slug TEXT)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    result json;
BEGIN
    SELECT
        json_build_object(
            'business', jsonb_strip_nulls(jsonb_build_object(
                'id', b.id,
                'user_id', b.user_id,
                'name', b.name,
                'slug', b.slug,
                'description', b.description,
                'image_url', b.image_url,
                'gallery_images', b.gallery_images,
                'currency', b.currency,
                'calendar_settings', b.calendar_settings,
                'html_content', b.html_content,
                'css_content', b.css_content,
                'theme_settings', b.theme_settings,
                'enabled_email_languages', b.enabled_email_languages,
                'default_language', b.default_language,
                'socials', b.socials
            )),
            'location', jsonb_strip_nulls(jsonb_build_object(
                'id', l.id,
                'business_id', l.business_id,
                'name', l.name,
                'slug', l.slug,
                'address', l.address,
                'working_hours', l.working_hours,
                'closed_days', l.closed_days
            )),
            'services', (
                SELECT COALESCE(json_agg(jsonb_strip_nulls(jsonb_build_object(
                    'id', s.id,
                    'business_id', s.business_id,
                    'name', s.name,
                    'duration', s.duration,
                    'price', s.price,
                    'description', s.description,
                    'image_url', s.image_url,
                    'category_id', s.category_id,
                    'location_ids', COALESCE((SELECT json_agg(sl_sub.location_id) FROM service_locations sl_sub WHERE sl_sub.service_id = s.id), '[]'::json)
                ))), '[]'::json)
                FROM services s
                JOIN service_locations sl ON s.id = sl.service_id
                WHERE s.business_id = b.id AND sl.location_id = l.id
            ),
            'staff', (
                 SELECT COALESCE(json_agg(jsonb_strip_nulls(jsonb_build_object(
                    'id', sm.id,
                    'business_id', sm.business_id,
                    'name', sm.name,
                    'email', sm.email,
                    'image_url', sm.image_url,
                    'working_hours', sm.working_hours,
                    'closed_days', sm.closed_days,
                    'service_ids', COALESCE((SELECT json_agg(ss_sub.service_id) FROM staff_services ss_sub WHERE ss_sub.staff_id = sm.id), '[]'::json),
                    'location_ids', COALESCE((SELECT json_agg(sl_sub.location_id) FROM staff_locations sl_sub WHERE sl_sub.staff_id = sm.id), '[]'::json)
                 ))), '[]'::json)
                FROM staff_members sm
                JOIN staff_locations sl ON sm.id = sl.staff_id
                WHERE sm.business_id = b.id AND sl.location_id = l.id
            ),
            'categories', (
                SELECT COALESCE(json_agg(sc), '[]'::json)
                FROM service_categories sc
                WHERE sc.business_id = b.id
            )
        )
    INTO result
    FROM businesses b
    JOIN locations l ON b.id = l.business_id
    WHERE b.slug = p_business_slug AND l.slug = p_location_slug;

    RETURN result;
END;
$$;
