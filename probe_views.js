import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJh...'; // I will use the service_role key to bypass RLS

async function run() {
    // Read the supabase keys from .env.local
    const fs = require('fs');
    const path = require('path');
    let url = '';
    let key = '';
    try {
        const env = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
        const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
        const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
        if (urlMatch) url = urlMatch[1].trim();
        if (keyMatch) key = keyMatch[1].trim();
    } catch(e) {}
    
    if (!url || !key) {
        console.log('Needs keys');
        return;
    }
    const supabase = createClient(url, key);
    
    const { data: v1, error: e1 } = await supabase.from('view_agent_progress').select('*').limit(1);
    console.log('view_agent_progress:', v1, e1);

    const { data: v2, error: e2 } = await supabase.from('view_team_objectives_summary').select('*').limit(1);
    console.log('view_team_objectives_summary:', v2, e2);
}

run();
