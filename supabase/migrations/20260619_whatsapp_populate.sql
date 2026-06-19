-- Populate WhatsApp numbers for hospitals and hospital groups
-- Dummy numbers in E.164 format (91 = India country code)
-- These are placeholder numbers — replace with real clinic WhatsApp numbers before go-live

-- Hospital groups
UPDATE hospital_group SET whatsapp_number = '919444000001' WHERE id = 'b1000000-0000-0000-0000-000000000001'; -- SunHealth AYUSH Group
UPDATE hospital_group SET whatsapp_number = '919444000002' WHERE id = 'b1000000-0000-0000-0000-000000000002'; -- WestCoast Wellness Group

-- Hospitals
UPDATE hospital SET whatsapp_number = '919444000011' WHERE id = 'c1000000-0000-0000-0000-000000000001'; -- Apollo Ayurveda Chennai
UPDATE hospital SET whatsapp_number = '919444000012' WHERE id = 'c1000000-0000-0000-0000-000000000002'; -- Sri Dhanvantri Chennai
UPDATE hospital SET whatsapp_number = '919444000013' WHERE id = 'c1000000-0000-0000-0000-000000000003'; -- Kerala Ayur Center Kochi
UPDATE hospital SET whatsapp_number = '919444000014' WHERE id = 'c1000000-0000-0000-0000-000000000004'; -- Harmony Homeopathy Bengaluru

-- Verify:
-- SELECT id, name, whatsapp_number FROM hospital ORDER BY name;
-- SELECT id, name, whatsapp_number FROM hospital_group ORDER BY name;
