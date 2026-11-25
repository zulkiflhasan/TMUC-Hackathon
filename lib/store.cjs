const url=process.env.UPSTASH_REDIS_REST_URL, token=process.env.UPSTASH_REDIS_REST_TOKEN;
const key='hackathon:'+ (process.env.EVENT_KEY || 'arena-v1');
let memory=null;
async function cmd(...args){const r=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args)});if(!r.ok)throw Error('Database unavailable');const j=await r.json();if(j.error)throw Error('Database command failed');return j.result;}
const initial=()=>({phase:'registration',expected:0,minutes:60,started:0,students:[]});
async function read(){if(process.env.LOCAL_DEMO==='1')return memory; if(!url||!token)throw Error('Configure Redis environment variables');return cmd('GET',key);}
async function change(fn){for(let i=0;i<16;i++){const old=await read();const s=old?JSON.parse(old):initial();const result=fn(s);const next=JSON.stringify(s);if(process.env.LOCAL_DEMO==='1'){if(memory!==old)continue;memory=next;return result;}const ok=await cmd('EVAL',"local v=redis.call('GET',KEYS[1]); if (not v and ARGV[1]=='') or v==ARGV[1] then redis.call('SET',KEYS[1],ARGV[2]); return 1 end; return 0",1,key,old||'',next);if(ok===1)return result;}throw Error('Server busy, retry');}
module.exports={read,change,initial};
