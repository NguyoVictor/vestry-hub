import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url);
const source = fs.readFileSync(new URL('./supabase/functions/send-invitation/index.ts', root), 'utf8');
const testable = source
  .replace('import "jsr:@supabase/functions-js/edge-runtime.d.ts";', '')
  .replace('import { createClient } from "jsr:@supabase/supabase-js@2";',
    'const createClient = (...args) => globalThis.__mockCreateClient(...args);');
fs.writeFileSync(new URL('./supabase/functions/send-invitation/index.mock.ts', root), testable);
const env = { SUPABASE_URL: 'https://fakeproject.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'fake-test-service-key', SITE_URL: 'https://vestryhub.com' };
globalThis.Deno = { env: { get: k => env[k] }, serve: h => globalThis.__handler = h };
const A = 'a6e4678b-ea42-4c55-9e32-7c30fde79058';
const B = 'cf36ddf8-ec05-4378-845a-64dc3c23df1e';
const guest = { email:'qa.person@example.com',tenant_id:A,role:'church_admin',first_name:'QA',last_name:'Person' };
let calls = [], conditions = {};
function query(table) {
  const builder = {
    _type: 'read', _q: {},
    select(fields,opts) { this._type = opts?.head ? 'head':'read'; this._fields=fields; return this; },
    eq(key,v) { this._q[key] = v; return this; },
    neq(key,v) {this._q['neq:'+key]=v;return this;},
    ilike(key,v) { this._q['ilike:'+key]=v; return this; },
    limit() { return this; },
    maybeSingle() {
      calls.push({table,method:'maybeSingle',...this._q});
      if (table==='users' && this._q.id==='actor-uid') return Promise.resolve({data: conditions.actor ?? {role:'super_admin',tenant_id:A,status:'active',is_super_admin:false},error:null});
      if (table==='users' && this._q['ilike:email']) return Promise.resolve({data:conditions.existingUser ? {id:'existing-user'}:null,error:null});
      if (table==='tenants') return Promise.resolve({data:conditions.noTenant ? null:{id:A,name:'New Test Church'},error:null});
      if (table==='tenant_subscriptions') return Promise.resolve({data:{staff_limit:conditions.staffLimit ?? 3},error:null});
      throw new Error('unexpected query '+table+JSON.stringify(this._q));
    },
    then(resolve,reject) {
      calls.push({table,method:'count',...this._q});
      return Promise.resolve({count:conditions.staffCount ?? 0,error:null}).then(resolve,reject);
    },
    insert(data) { calls.push({table,method:'insert',data});return Promise.resolve({error:conditions.insertError ? {code:'23514'}:null}); }
  };
  return builder;
}
const auth = {
  getUser: async (token) => {
    calls.push({method:'getUser',token});
    return conditions.invalidToken ? {data:{user:null},error:{}} : {data:{user:{id:'actor-uid'}},error:null};
  },
  admin: {
    inviteUserByEmail: async (email,options) => {
      calls.push({method:'inviteUserByEmail',email,options});
      return conditions.inviteError
        ? {data:{},error:{status:422}}
        : {data:{user:{id:'new-auth-uid'}},error:null};
    }
  }
};
globalThis.__mockCreateClient = () => ({from:query,auth});
await import(new URL('supabase/functions/send-invitation/index.mock.ts', root));
async function run(input=guest, token='valid') {
  calls=[];
  const req=new Request('https://fakeproject.supabase.co/functions/v1/send-invitation',{
    method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(input)
  });
  const res=await globalThis.__handler(req);
  return {status:res.status,body:await res.json(),calls};
}
function check(value,msg) { assert.ok(value,msg); num++; }
let num=0;
let r;
r=await run({...guest,role:'super_admin'});check(r.status===400,'super_admin role rejected');check(!r.calls.some(x=>x.method==='inviteUserByEmail'),'no invite before validation');
conditions={invalidToken:true};r=await run();check(r.status===401,'auth must validate');check(!r.calls.some(x=>x.method==='inviteUserByEmail'),'no invitation on invalid auth');
conditions={actor:{role:'member',status:'active',tenant_id:A,is_super_admin:false}};r=await run();check(r.status===403,'nonadmin forbidden');
conditions={actor:{role:'church_admin',status:'active',tenant_id:B,is_super_admin:false}};r=await run();check(r.status===403,'cross tenant forbidden');check(!r.calls.some(x=>x.method==='inviteUserByEmail'),'no invitation cross tenant');
conditions={noTenant:true};r=await run();check(r.status===404,'tenant must exist');
conditions={existingUser:true};r=await run();check(r.status===409,'duplicate account rejected');
conditions={staffCount:3};r=await run();check(r.status===403,'quota enforced');
conditions={inviteError:true};r=await run();check(r.status===409,'existing Auth rejected safely');check(!r.calls.some(x=>x.method==='insert'),'no row insert on auth failure');
conditions={insertError:true};r=await run();check(r.status===503,'never claim success if DB write fails');
conditions={};r=await run();check(r.status===200 && r.body.ok,'success');
check(r.calls.some(x=>x.method==='getUser'),'Auth verified');
check(r.calls.some(x=>x.method==='inviteUserByEmail'),'Supabase sends invitation');
check(r.calls.some(x=>x.method==='insert' && x.data.tenant_id===A && x.data.role==='church_admin' && x.data.is_super_admin===false),'safe tenant insert');
check(!r.calls.some(x=>x.method==='upsert'),'never upsert user');
check(r.calls.find(x=>x.method==='inviteUserByEmail').options.data.invited_by==='actor-uid','server supplies inviter');
conditions={actor:{role:'member',status:'active',tenant_id:B,is_super_admin:true}};r=await run();check(r.status===200,'verified platform admin allowed');
console.log(`PASS ${num} edge function integration mock assertions`);
fs.unlinkSync(new URL('./supabase/functions/send-invitation/index.mock.ts',root));
