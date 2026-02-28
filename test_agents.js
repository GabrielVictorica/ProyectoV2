import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGabrielsOrg() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, is_active, organization_id')
        .ilike('first_name', '%Gabriel%');

    console.log('Gabriel profiles:', JSON.stringify(profiles, null, 2));
}

checkGabrielsOrg();
