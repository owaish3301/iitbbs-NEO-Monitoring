import { createClient } from "@supabase/supabase-js";
import 'dotenv/config';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// You must set these environment variables or hardcode them below for testing
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'YOUR_SUPABASE_KEY';

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_KEY === 'YOUR_SUPABASE_KEY') {
    console.error('❌ Error: Missing Supabase credentials. Please check your .env file or hardcode them in this script.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    console.log('🔍 Testing Supabase Connection...');
    console.log(`URL: ${SUPABASE_URL}`);

    // 1. Test Read Access
    console.log('\n1️⃣ Testing Read Access (Select from messages)...');
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .limit(1);

        if (error) {
            console.error('❌ Read failed:', error.message);
            console.error('   Hint: Check if "messages" table exists and RLS policy allows SELECT.');
        } else {
            console.log('✅ Read successful!');
            console.log(`   Found ${data.length} messages.`);
        }
    } catch (err) {
        console.error('❌ Unexpected error during read:', err);
    }

    // 2. Test Realtime Subscription
    console.log('\n2️⃣ Testing Realtime Subscription...');
    const channel = supabase
        .channel('test-channel')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            (payload) => console.log('   📨 Realtime Event Received:', payload)
        )
        .subscribe((status) => {
            console.log(`   Subscription Status: ${status}`);
            if (status === 'SUBSCRIBED') {
                console.log('✅ Realtime connected successfully!');
                console.log('   Waiting 5 seconds for events...');
                setTimeout(() => {
                    console.log('   Closing connection.');
                    supabase.removeChannel(channel);
                    process.exit(0);
                }, 5000);
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ Realtime connection failed.');
                process.exit(1);
            }
        });
}

testConnection();
