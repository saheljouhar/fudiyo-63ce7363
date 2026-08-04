CREATE POLICY "Staff can read dish photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'dish-photos');
CREATE POLICY "Staff can upload dish photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dish-photos');
CREATE POLICY "Staff can update dish photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dish-photos') WITH CHECK (bucket_id = 'dish-photos');
CREATE POLICY "Staff can delete dish photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dish-photos');