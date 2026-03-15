import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';

async function run() {
    let url = '';
    let key = '';
    try {
        const env = fs.readFileSync('.env.local', 'utf8');
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
    console.log('view_agent_progress row:', v1, 'error:', e1);

    const { data: v2, error: e2 } = await supabase.from('view_team_objectives_summary').select('*').limit(1);
    console.log('view_team_objectives_summary row:', v2, 'error:', e2);
}

run();
