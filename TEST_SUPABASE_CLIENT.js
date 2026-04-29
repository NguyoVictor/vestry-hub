// Test script to verify Supabase client can query the group members
// Run this with: node TEST_SUPABASE_CLIENT.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://crjdsxxkspvdwknrmijs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNyamRzeHhrc3B2ZHdrbnJtaWpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDUwOTUsImV4cCI6MjA4NjkyMTA5NX0.V2QDuq--RX9bekwjQV_4aD7MlQ90hKqqf1C-UFqiYCQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGroupMembersQuery() {
  console.log('Testing group members query...');
  
  const groupId = '5848d398-3e7d-44a9-a0ac-db33c088425f';
  const tenantId = '34126643-2d36-4888-9062-24c89dc61612';
  
  console.log('Group ID:', groupId);
  console.log('Tenant ID:', tenantId);
  
  // Test 1: Get group members directly
  console.log('\n--- Test 1: Direct group members query ---');
  const { data: groupMembers, error: gmError } = await supabase
    .from('group_members')
    .select('member_id')
    .eq('group_id', groupId);
  
  console.log('Group members result:', groupMembers);
  console.log('Group members error:', gmError);
  
  if (groupMembers?.length) {
    // Test 2: Get member details
    console.log('\n--- Test 2: Member details query ---');
    const memberIds = groupMembers.map(gm => gm.member_id);
    console.log('Member IDs:', memberIds);
    
    const { data: memberDetails, error: memberError } = await supabase
      .from('members')
      .select('id, first_name, last_name, avatar_url')
      .in('id', memberIds)
      .eq('tenant_id', tenantId);
    
    console.log('Member details result:', memberDetails);
    console.log('Member details error:', memberError);
  }
  
  // Test 3: Test the complex join query
  console.log('\n--- Test 3: Complex join query ---');
  const { data: joinResult, error: joinError } = await supabase
    .from('group_members')
    .select(`
      member_id,
      members!inner(id, first_name, last_name, avatar_url)
    `)
    .eq('group_id', groupId)
    .eq('members.tenant_id', tenantId);
  
  console.log('Join result:', joinResult);
  console.log('Join error:', joinError);
}

testGroupMembersQuery().catch(console.error);