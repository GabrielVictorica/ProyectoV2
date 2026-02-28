import { createAdminClient } from '@/lib/supabase/admin';

export async function testTypes() {
    const adminClient = createAdminClient();
    adminClient.from('organizations').insert({ name: 'Test', slug: 'test' });
}
