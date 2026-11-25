const crypto=require('node:crypto');const bank=require('../lib/questions.cjs');const {read,change,initial}=require('../lib/store.cjs');
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status})};
const publicQuestions=()=>bank.map(([category,question,options],id)=>({id,category,question,options}));
const rank=s=>s.students.filter(p=>p.submitted).sort((a,b)=>b.score-a.score||a.elapsed-b.elapsed||a.id.localeCompare(b.id));
function snapshot(s,admin=false){const rows=rank(s);return {phase:s.phase,expected:s.expected,minutes:s.minutes,started:s.started,now:Date.now(),joined:s.students.length,finished:rows.length,leaderboard:s.phase==='revealed'||admin?rows.map((p,i)=>({position:i+1,name:p.name,score:p.score,elapsed:p.elapsed})):[],...(admin?{students:s.students.map(({id,name,submitted,score})=>({id,name,submitted,score}))}:{})};}
function auto(s){if(s.phase==='running'&&s.students.length&&s.students.every(p=>p.submitted))s.phase='revealed';}
function grade(answers){return bank.reduce((n,q,i)=>n+(answers[i]===q[3]?1:0),0)}
async function handler(req,res){res.setHeader('Cache-Control','no-store');try{const b=req.method==='POST'?(typeof req.body==='string'?JSON.parse(req.body):req.body||{}):{};const action=b.action||'status';const secret=process.env.ADMIN_PIN;const admin=!!secret&&typeof b.pin==='string'&&b.pin===secret;if(['configure','start','reveal','reset','admin','remove'].includes(action)&&!admin)fail('Invalid instructor PIN',403);
let result;if(action==='status'||action==='admin'||action==='me'){const raw=await read();const s=raw?JSON.parse(raw):initial();result=snapshot(s,admin);if(action==='me'){const p=s.students.find(p=>p.token===b.token);if(!p)fail('Session not found',404);result={...result,student:{name:p.name,submitted:p.submitted,score:p.score,elapsed:p.elapsed},questions:s.phase==='running'&&!p.submitted?publicQuestions():[]};}}else{result=await change(s=>{switch(action){case 'configure':if(s.phase!=='registration')fail('Registration is closed');if(!Number.isInteger(b.expected)||b.expected<1||b.expected>500||b.expected<s.students.length)fail('Enter expected participants (1–500), not fewer than already joined');if(!Number.isInteger(b.minutes)||b.minutes<1||b.minutes>180)fail('Duration must be 1–180 minutes');s.expected=b.expected;s.minutes=b.minutes;break;
case 'join':{if(s.phase!=='registration')fail('Registration is closed');const name=String(b.name||'').trim().replace(/\s+/g,' ');if(name.length<2||name.length>80)fail('Enter a valid full name');if(s.students.some(p=>p.name.toLowerCase()===name.toLowerCase()))fail('This name is already registered. Ask the instructor if needed.');if(s.students.length>= (s.expected||500))fail('Registration is full');const p={id:crypto.randomUUID(),token:crypto.randomBytes(32).toString('hex'),name,submitted:false};s.students.push(p);return {...snapshot(s),token:p.token};}

case 'start':
    if (s.phase !== 'registration') {
        fail('Exam has already started');
    }

    if (s.students.length === 0) {
        fail('At least one student must register');
    }

    s.phase = 'running';
    s.started = Date.now();
    break;

case 'submit':{const p=s.students.find(p=>p.token===b.token);if(!p)fail('Invalid session',403);if(p.submitted)return {...snapshot(s),score:p.score,elapsed:p.elapsed};if(s.phase!=='running')fail('Exam is not running');if(!Array.isArray(b.answers)||b.answers.length!==bank.length||b.answers.some(x=>x!==null&&(!Number.isInteger(x)||x<0||x>3)))fail('Invalid answers');const elapsed=Date.now()-s.started; if(elapsed>s.minutes*60000+15000)fail('Time expired. Ask the instructor to close the event.');p.score=grade(b.answers);p.elapsed=Math.min(elapsed,s.minutes*60000);p.submitted=true;auto(s);return {...snapshot(s),score:p.score,elapsed:p.elapsed};}
case 'reveal':if(s.phase!=='running')fail('Exam is not running');s.phase='revealed';break;
case 'remove':if(s.phase!=='registration')fail('Can only remove students before starting');s.students=s.students.filter(p=>p.id!==b.id);break;
case 'reset':Object.assign(s,initial());break;default:fail('Unknown action');}return snapshot(s,admin);});}res.status(200).json(result);}catch(e){res.status(e.status||503).json({error:e.message});}}
module.exports=handler;module.exports.grade=grade;module.exports.rank=rank;
