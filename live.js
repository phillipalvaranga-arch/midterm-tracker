/* ---- v7 Election-night live results (Fox News election-results feed, fetched directly in the browser) ----
   Results mode switches on automatically Tue Nov 3, 2026, 6:00 PM CT and stays on afterwards.
   Auto-refresh every 30 s until Dec 15, 2026 (covers late counts and a possible Georgia runoff on Dec 1), then every 15 min.
   Winners are shown ONLY when the source has called the race. Numbers are shown exactly as published by the source.
   URL options (for testing): ?results=1 force results view, ?results=0 force forecast,
   ?feed=stage use Fox's own TEST feed (fake numbers, clearly bannered), ?year=2024 replay the real 2024 results. */
const LV=(()=>{const u=new URLSearchParams(location.search);return{
 start:Date.parse('2026-11-03T18:00:00-06:00'),liveUntil:Date.parse('2026-12-15T23:59:00-06:00'),
 force:u.get('results'),env:['stage','dev'].includes(u.get('feed'))?u.get('feed'):'',year:/^20(22|24|26)$/.test(u.get('year')||'')?u.get('year'):'2026'}})();
LV.test=!!LV.env||LV.year!=='2026';
LV.base=`https://${LV.env?LV.env+'-':''}feeds-elections.foxnews.com/archive/politics/elections/${LV.year}/3/${LV.year}_Generals`;
LV.src='https://www.foxnews.com/elections';
const ST={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
const ctTime=ms=>ms?new Date(ms).toLocaleString('en-US',{timeZone:'America/Chicago',weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' CT':'n/a';
const ctClock=ms=>new Date(ms).toLocaleString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})+' CT';
const nf=n=>(n||0).toLocaleString('en-US');
let R=null;const RS={files:{},snap:null,fail:0,checked:0,cycle:0,busy:false};
function resultsMode(){const v=sessionStorage.getItem('mt-view');if(LV.force==='0'||v==='forecast')return false;
 if(v==='results'||LV.force==='1'||LV.test)return true;return Date.now()>=LV.start}
function setView(v){sessionStorage.setItem('mt-view',v);if(v==='results'&&!R)liveStart();route()}
/* ---------- fetching ---------- */
async function getJ(path,ms=12000){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
 try{const r=await fetch(`${LV.base}/${path}/file.json?cb=${Math.floor(Date.now()/15e3)*15e3}`,{signal:c.signal,cache:'no-store'});
  if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();return{j,lm:Date.parse(r.headers.get('last-modified')||'')||null,via:'direct'}}finally{clearTimeout(t)}}
async function snap(){if(LV.test)return null;try{const r=await fetch('data/results.json?cb='+Date.now(),{cache:'no-store'});if(!r.ok)return null;return await r.json()}catch(e){return null}}
async function file(path){try{const x=await getJ(path);RS.files[path]=x;return x}catch(e){
  if(RS.snap===null||RS.cycle%4===0)RS.snap=await snap()||false;const s=RS.snap&&RS.snap.files&&RS.snap.files[path];
  if(s&&(!RS.files[path]||RS.files[path].via!=='direct'||(s.last_modified||0)>(RS.files[path].lm||0))){RS.files[path]={j:s.data,lm:s.last_modified||null,via:'backup',at:Date.parse(RS.snap.fetched_utc)};return RS.files[path]}
  if(RS.files[path])return RS.files[path];throw e}}
async function refresh(){if(RS.busy)return;RS.busy=true;let ok=0,bad=0;const cyc=RS.cycle++;
 const jobs=['Senate/national_level_summary','Governor/national_level_summary','House/national_level_summary'];
 if(!RS.files.seat_holders)jobs.push('seat_holders');
 if(cyc%2===0)Object.keys(ST).forEach(s=>jobs.push(`House/${s}/state_level_results`));
 await Promise.all(jobs.map(p=>file(p).then(()=>ok++,()=>bad++)));
 RS.fail=bad&&!ok?RS.fail+1:0;RS.checked=Date.now();
 try{R=build()}catch(e){console.error(e)}RS.busy=false;if(resultsMode())rerender()}
let timer=null;
function liveStart(){if(timer)return;refresh();const tick=()=>{const live=Date.now()<LV.liveUntil||LV.test;
  timer=setTimeout(()=>{if(document.visibilityState==='visible')refresh();tick()},live?30e3:900e3)};tick();
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-RS.checked>20e3)refresh()})}
/* ---------- normalising the source data ---------- */
const PC=c=>c==='D'||c==='R'?c:'O';
function cand(x){const c=x.candidate||{};return{name:[c.firstName,c.lastName].filter(Boolean).join(' ').trim()||'Unknown',party:x.partyName||c.partyName||x.partyCode||'',p:PC(x.partyCode||c.partyCode),
 votes:x.votes?.count??null,pct:x.votes?.percentage??null,win:!!(x.isWinner??c.isWinner),inc:!!(x.isIncumbent??c.isIncumbent)}}
function norm(raw,kind,st,dist,exp,expLabel){const list=(raw.current||raw.results||[]).map(cand).sort((a,b)=>(b.votes||0)-(a.votes||0));
 const total=list.reduce((s,c)=>s+(c.votes||0),0),wins=list.filter(c=>c.win),called=!!raw.called;
 const special=/special/i.test(raw.raceType||'')||raw.classNumber===3;
 const id=kind==='senate'?`SEN-${st}${special?'-S':''}`:kind==='governor'?`GOV-${st}`:`H-${st}-${dist}`;
 const app=(D?.races||[]).find(r=>r.id===id);
 let status='waiting';if(wins.length>1)status='runoff';else if(called&&wins.length===1)status='called';else if(total>0)status='counting';
 const real=list.filter(c=>!/write-in/i.test(c.name));
 const lead=status==='counting'&&list.length>1&&(list[0].votes||0)>(list[1].votes||0)?list[0]:null;
 const winner=status==='called'?wins[0]:null;
 const nm=app?.name||(kind==='senate'?`${ST[st]||st} Senate${special?' (special)':''}`:kind==='governor'?`${ST[st]||st} Governor`:`${ST[st]||st} ${dist==='AL'?'At-large':+dist}`);
 return{id,kind,st,dist,name:nm,app,cands:list,real,total,status,lead,winner,exp,expLabel,flipped:!!raw.isFlipped,isRunoff:!!raw.isRunoff,
  updated:Date.parse(raw.lastUpdated||raw.winnerTime||'')||null,margin:list.length>1&&total?((list[0].votes-list[1].votes)/total*100):null}}
function build(){const F=RS.files,get=p=>F[p]?.j,races=[];
 (get('Senate/national_level_summary')||[]).forEach(r=>races.push(norm(r,'senate',r.stateCode,null,r.expectedPercentage,'of expected vote')));
 (get('Governor/national_level_summary')||[]).forEach(r=>races.push(norm(r,'governor',r.stateCode,null,r.expectedPercentage,'of expected vote')));
 const hs=get('House/national_level_summary')||[],cnt={};hs.forEach(r=>cnt[r.stateCode]=(cnt[r.stateCode]||0)+1);
 hs.forEach(r=>{const sf=get(`House/${r.stateCode}/state_level_results`),m=sf?.races?.find(x=>x.district?.districtNumber===r.districtNumber&&(x.district.raceType||'General')===(r.raceType||'General'));
  const exp=m?.districtTotals?.expectedPercentage,dist=cnt[r.stateCode]===1?'AL':String(r.districtNumber).padStart(2,'0');
  races.push(norm(r,'house',r.stateCode,dist,exp??r.precinctsReporting,exp!=null?'of expected vote':'of precincts reporting'))});
 const sh=get('seat_holders')||[],hold={senate:{D:0,R:0,O:0},governor:{D:0,R:0,O:0}};
 sh.forEach(x=>{const k=x.race==='Senate'?'senate':x.race==='Governor'?'governor':null;if(!k)return;
  const p=/^Dem/.test(x.party)?'D':/^Rep/.test(x.party)?'R':(k==='senate'&&/Indep/.test(x.party))?'D':'O';hold[k][p]++});
 const tally={};for(const k of['senate','house','governor']){const rs=races.filter(r=>r.kind===k),t={won:{D:0,R:0,O:0},lead:{D:0,R:0,O:0},runoff:0,waiting:0,counting:0,total:rs.length};
  rs.forEach(r=>{if(r.status==='called')t.won[r.winner.p]++;else if(r.status==='runoff')t.runoff++;else if(r.lead){t.lead[r.lead.p]++;t.counting++}else if(r.status==='counting')t.counting++;else t.waiting++});
  t.hold=hold[k]||{D:0,R:0,O:0};tally[k]=t}
 const lms=Object.values(F).map(f=>f.lm).filter(Boolean);const via=Object.values(F).some(f=>f.via==='backup');
 return{races,tally,lm:lms.length?Math.max(...lms):null,via,anyVotes:races.some(r=>r.total>0),sources:Object.keys(F).length}}
/* runoff (e.g. Georgia, Dec 1): the source publishes a separate county-level runoff file; summed here only when it exists */
async function runoffFor(r){const off={senate:'Senate',governor:'Governor',house:'House'}[r.kind];if(r.kind==='house')return null;
 try{const x=await getJ(`Runoffs/${off}/${r.st}/county_level_results`);const res=(x.j.results||[]).map(c=>({...cand({...c,partyCode:c.candidate?.partyCode,partyName:c.candidate?.partyName}),votes:(c.countyVotes||[]).reduce((s,v)=>s+(v.votes?.count||0),0)}));
  const tot=res.reduce((s,c)=>s+c.votes,0);res.forEach(c=>c.pct=tot?Math.round(c.votes/tot*1e4)/100:0);res.sort((a,b)=>b.votes-a.votes);return{res,tot,lm:x.lm}}catch(e){return null}}
/* ---------- rendering ---------- */
const PNm={D:'Democrats',R:'Republicans',O:'Independents/other'},PS={D:'Democratic',R:'Republican',O:'Other'};
/* last poll-closing time per state, Eastern Time (for states split across time zones, the later one) */
const PCLOSE={"AL":"2026-11-03T20:00","AK":"2026-11-04T00:00","AR":"2026-11-03T20:30","AZ":"2026-11-03T21:00","CA":"2026-11-03T23:00","CO":"2026-11-03T21:00","CT":"2026-11-03T20:00","DE":"2026-11-03T20:00","FL":"2026-11-03T20:00","GA":"2026-11-03T19:00","HI":"2026-11-04T00:00","IA":"2026-11-03T21:00","ID":"2026-11-03T23:00","IL":"2026-11-03T20:00","IN":"2026-11-03T19:00","KS":"2026-11-03T21:00","KY":"2026-11-03T19:00","LA":"2026-11-03T21:00","MA":"2026-11-03T20:00","MD":"2026-11-03T20:00","ME":"2026-11-03T20:00","MI":"2026-11-03T21:00","MN":"2026-11-03T21:00","MO":"2026-11-03T20:00","MS":"2026-11-03T20:00","MT":"2026-11-03T22:00","NC":"2026-11-03T19:30","ND":"2026-11-03T22:00","NE":"2026-11-03T21:00","NH":"2026-11-03T20:00","NJ":"2026-11-03T20:00","NM":"2026-11-03T21:00","NV":"2026-11-03T22:00","NY":"2026-11-03T21:00","OH":"2026-11-03T19:30","OK":"2026-11-03T20:00","OR":"2026-11-03T23:00","PA":"2026-11-03T20:00","RI":"2026-11-03T20:00","SC":"2026-11-03T19:00","SD":"2026-11-03T21:00","TN":"2026-11-03T20:00","TX":"2026-11-03T21:00","UT":"2026-11-03T22:00","VA":"2026-11-03T19:00","VT":"2026-11-03T19:00","WA":"2026-11-03T23:00","WI":"2026-11-03T21:00","WV":"2026-11-03T19:30","WY":"2026-11-03T21:00"};
function pollClose(st){if(LV.year!=='2026')return'';const c=PCLOSE[st];if(!c)return'';const ms=Date.parse(c+':00-05:00');return isNaN(ms)?'':(Date.now()<ms?`All polls close by ${ctClock(ms)}`:'Polls closed · no votes reported yet')}
function statusPill(r){if(r.status==='called')return`<span class="pill won">✓ CALLED</span>`;if(r.status==='runoff')return`<span class="pill ro">Headed to a runoff</span>`;
 if(r.status==='counting')return`<span class="pill cnt">Counting · ${r.exp!=null?Math.round(r.exp)+'% '+r.expLabel:'share counted not reported'}</span>`;
 if(r.cands.length===1)return`<span class="pill">Uncontested · not called yet</span>`;return`<span class="pill">${esc(pollClose(r.st)||'No votes reported yet')}</span>`}
function cRow(r,c,i){const isW=r.status==='called'&&c.win,isL=r.status==='called'&&!c.win,adv=r.status==='runoff'&&c.win,isLead=r.lead===c;
 const w=Math.max(0,Math.min(100,c.pct||0));
 return`<div class="cr ${isW?'cw':isL?'cl':isLead?'clead':''}"><div class="cn"><span class="dot ${c.p}"></span><b>${esc(c.name)}</b> <span class="muted sm">(${esc(c.party)}${c.inc?', incumbent':''})</span>
 ${isW?'<span class="badge w">WINNER</span>':adv?'<span class="badge a">ADVANCES TO RUNOFF</span>':isLead?'<span class="badge l">Leading</span>':''}</div>
 <div class="cv"><span>${c.votes!=null&&r.total?nf(c.votes)+' votes':'–'}</span><b>${r.total&&c.pct!=null?c.pct.toFixed(1)+'%':''}</b></div><div class="vb"><i class="${c.p}" style="width:${w}%"></i></div></div>`}
function resCard(r,full){const shown=full?r.cands:r.cands.filter((c,i)=>i<3||c.win),hid=r.cands.length-shown.length;
 const flip=r.status==='called'&&r.flipped?`<span class="pill flip">Flip${r.app?.inc_party&&r.app.inc_party!==r.winner.p?`: ${PS[r.app.inc_party]||''} → ${PS[r.winner.p]}`:''}</span>`:'';
 return`<div class="rc res"><div class="rh"><a class="rn" href="#/race/${r.id}">${esc(r.name)} ›</a>${statusPill(r)}${flip}</div>
 ${r.cands.length?shown.map((c,i)=>cRow(r,c,i)).join(''):'<p class="muted">No candidates listed by the source.</p>'}${hid>0?`<div class="muted sm">+ ${hid} other candidate${hid>1?'s':''}</div>`:''}
 <div class="muted sm">${r.total?`Total counted: ${nf(r.total)} votes · `:''}${r.status==='counting'&&r.lead&&r.margin!=null?`Lead: ${nf(r.cands[0].votes-r.cands[1].votes)} votes (${r.margin.toFixed(1)} pts) · `:''}${r.status==='runoff'?'No candidate won a majority; the top two advance to a runoff. ':''}Source: ${L('Fox News',LV.src,'Fox News election results')}</div></div>`}
function seatBar(t,size,need,kind){const h=t.hold,seg=[['D',h.D+t.won.D,'won'],['D',t.lead.D,'lead'],['N',size-(h.D+t.won.D+t.lead.D+h.R+t.won.R+t.lead.R+h.O+t.won.O+t.lead.O),'n'],['O',h.O+t.won.O+t.lead.O,'won'],['R',t.lead.R,'lead'],['R',h.R+t.won.R,'won']];
 return`<div class="sbar">${seg.filter(s=>s[1]>0).map(([p,n,k])=>`<i class="${p} ${k}" style="width:${100*n/size}%" title="${n}"></i>`).join('')}${need?`<b class="need" style="left:${100*need/size}%"></b>`:''}</div>`}
function chamberTally(kind){const t=R.tally[kind],size=kind==='senate'?100:kind==='house'?435:50,need=kind==='senate'?51:kind==='house'?218:null;
 const tot=p=>t.hold[p]+t.won[p],dT=tot('D'),rT=tot('R');
 let ctl='',cls='';if(kind==='senate'){if(dT>=51)ctl='D';else if(rT>=50)ctl='R'}else if(kind==='house'){if(dT>=218)ctl='D';else if(rT>=218)ctl='R'}
 const head=kind==='governor'?`<h3>Governors</h3>`:`<h3>${kind==='senate'?'Senate':'House'}</h3>`;
 const ctlLine=ctl?`<div class="big"><span class="win">✓ ${PNm[ctl]} win control of the ${kind==='senate'?'Senate':'House'}${kind==='senate'&&ctl==='R'&&rT===50?' (50 seats + the Vice President\'s tie-breaking vote)':''}</span></div><div class="lose">${PNm[ctl==='D'?'R':'D']} lose</div>`:
  kind==='governor'?'':`<div class="sm muted">Control not decided yet${need?` · ${kind==='senate'?'Democratic caucus needs 51; Republicans need 50 (the Vice President breaks ties)':'218 seats needed'}`:''}</div>`;
 const line=p=>`<div class="tl"><span class="dot ${p}"></span><b>${PNm[p]}</b><span class="tn">${tot(p)}</span><span class="sm muted">${kind!=='house'?`${t.hold[p]} not up + ${t.won[p]} won`:`${t.won[p]} won`}${t.lead[p]?` · <b>${t.lead[p]}</b> more leading`:''}${need&&p!=='O'&&!ctl?` · needs ${Math.max(0,(kind==='senate'&&p==='R'?50:need)-tot(p))} more`:''}</span></div>`;
 return`<div class="ovc">${head}${seatBar(t,size,need,kind)}${line('D')}${line('R')}${(t.hold.O+t.won.O+t.lead.O)?line('O'):''}
 ${kind==='senate'&&LV.year==='2026'?`<div class="sm muted">Not up: ${t.hold.D} Democratic caucus seats include 2 independents (King, Sanders) who caucus with Democrats.${t.won.O?' Newly elected independents are listed separately.':''}</div>`:''}<div class="sm">${t.total} races: <b>${t.won.D+t.won.R+t.won.O}</b> called · <b>${t.counting}</b> counting · <b>${t.waiting}</b> no votes yet${t.runoff?` · <b>${t.runoff}</b> runoff`:''}</div>${ctlLine}
 <a class="go" href="#/${kind}">See ${kind==='house'?'all 435':t.total} ${kind==='governor'?'governor':kind==='senate'?'Senate':'House'} results ›</a></div>`}
function liveBanner(){const st=!R?'Loading live results…':RS.fail>1?`⚠ Can't reach the results source right now. Showing the last data received (checked ${ctClock(RS.checked)}). Retrying automatically.`:'';
 const live=Date.now()<LV.liveUntil||LV.test;
 return`${LV.test?`<div class="testbar">${LV.env?'TEST DATA from Fox News\'s test feed — these numbers are NOT real results.':`Replay of the ${LV.year} election results (not 2026).`} <a href="./">Back to the real app</a></div>`:''}
 <div class="lb"><div><span class="livedot"></span><b>${Date.now()<LV.start&&!LV.test?'Results preview (no votes until polls close on Nov 3)':live?'LIVE RESULTS':'Final results'}</b> · Source: ${L('Fox News Decision Desk',LV.src,'Fox News election results')}</div>
 <div class="sm muted">${R?`Source data updated ${ctTime(R.lm)} · checked ${ctClock(RS.checked)}${live?' · refreshes every 30 seconds':''}${R.via?` · <b>Fox News could not be reached directly, so some data comes from the backup copy saved ${RS.snap&&RS.snap.fetched_utc?ctClock(Date.parse(RS.snap.fetched_utc)):''} (updated about every 10 minutes)</b>`:''}`:''}</div>${st?`<div class="sm">${st}</div>`:''}
 <div class="vt"><a class="on">Live results</a><a href="javascript:setView('forecast')">Pre-election forecast</a></div></div>`}
function resHome(q){if(!R)return liveBanner();const k=q.get('m')||'senate',my=R.races.filter(r=>r.st===MY&&(r.kind!=='house'||MYD.includes(r.id)));
 const close=R.races.filter(r=>r.kind!=='house'&&r.status==='counting').sort((a,b)=>(a.margin??99)-(b.margin??99)).slice(0,6);
 const flips=R.races.filter(r=>r.status==='called'&&r.flipped);
 return`${liveBanner()}<section class="card ov"><h2>Seat count</h2><div class="muted sm">Won = race called by the source. Leading = ahead in votes counted so far, not called. Seats not up this year are included.</div>
 <div class="ovg">${chamberTally('senate')}${chamberTally('house')}${chamberTally('governor')}</div>${legend()}</section>
 <div class="card my"><h2>My State: Texas</h2>${my.length?`<div class="rcs">${my.map(r=>resCard(r)).join('')}</div>`:'<p class="muted">No Texas results yet.</p>'}<a class="go" href="#/state/TX">All Texas results ›</a></div>
 ${close.length?`<h2>Closest Senate & governor races still counting</h2><div class="rcs">${close.map(r=>resCard(r)).join('')}</div>`:''}
 ${flips.length?`<div class="card"><h2 style="margin-top:0">Seats that changed party (${flips.length})</h2><div class="chips">${flips.map(r=>`<a href="#/race/${r.id}" class="chip"><span class="dot ${r.winner.p}"></span>${esc(r.name)}${r.app?.inc_party&&r.app.inc_party!==r.winner.p?` · ${r.app.inc_party}→${r.winner.p}`:''}</a>`).join('')}</div><div class="sm muted">Flip status as reported by the source.</div></div>`:''}
 <h2>Results map</h2><div class="tabs">${[['senate','Senate'],['governor','Governor'],['house','House']].map(([a,b])=>`<a class="${k===a?'on':''}" href="#/?m=${a}">${b}</a>`).join('')}</div>${resMap(k)}
 <details class="card"><summary>Pre-election forecast (for comparison)</summary>${typeof overall==='function'?overall():''}</details>`}
function legend(){return`<div class="legend muted sm"><span class="lg D won"></span>Dem won<span class="lg D lead"></span>Dem leading<span class="lg N n"></span>Not decided<span class="lg R lead"></span>Rep leading<span class="lg R won"></span>Rep won<span class="lg O won"></span>Other · <b>|</b> = majority line</div>`}
function resMap(kind){const by={};R.races.filter(r=>r.kind===kind).forEach(r=>(by[r.st]=by[r.st]||[]).push(r));let cells='';
 const colr=(p,k)=>p==='N'?'#3a4152':k==='won'?(p==='D'?'#3b6fd6':p==='R'?'#d63b3b':'#8b6fd6'):(p==='D'?'#8fb0f0':p==='R'?'#f0a0a0':'#b9a8f0');
 for(const[s,[y,x]]of Object.entries(TILE)){const rs=by[s];let bg='#262c38',sub='';
  if(rs){if(kind==='house'){const w={D:0,R:0,O:0};rs.forEach(r=>{if(r.winner)w[r.winner.p]++});sub=`${w.D}D–${w.R}R`;const m=w.D>w.R?'D':w.R>w.D?'R':'N';bg=w.D+w.R+w.O?colr(m,(w.D+w.R+w.O)===rs.length?'won':'lead'):'#3a4152'}
   else{const r=rs.find(r=>r.status==='counting'||r.status==='called')||rs[0];if(r.winner){bg=colr(r.winner.p,'won');sub='✓'}else if(r.lead){bg=colr(r.lead.p,'lead');sub=r.exp!=null?Math.round(r.exp)+'%':''}else{bg='#3a4152';sub=r.status==='runoff'?'runoff':''}}}
  cells+=`<a class="tile ${rs?'':'none'}" style="grid-row:${y+1};grid-column:${x+1};background:${bg}" href="#/state/${s}" title="${ST[s]||s}">${s}<small>${sub}</small></a>`}
 return`<div class="map">${cells}</div>${legend()}<div class="muted sm">Senate/Governor: ✓ = called, % = share of expected vote counted. House: districts called for each party.</div>`}
function resList(kind,q){if(!R)return liveBanner();const f=q.get('f')||'all';let rs=R.races.filter(r=>r.kind===kind);
 const ord={counting:0,runoff:1,waiting:2,called:3};rs.sort((a,b)=>ord[a.status]-ord[b.status]||(a.margin??999)-(b.margin??999)||a.name.localeCompare(b.name));
 const n={all:rs.length,counting:rs.filter(r=>r.status==='counting').length,called:rs.filter(r=>r.status==='called').length,runoff:rs.filter(r=>r.status==='runoff').length,waiting:rs.filter(r=>r.status==='waiting').length};
 const show=f==='all'?rs:rs.filter(r=>r.status===f);
 return`${liveBanner()}<h1>${kindName[kind]} results</h1><div class="ovg one">${chamberTally(kind)}</div>
 <div class="tabs">${[['all','All'],['counting','Still counting'],['called','Called'],['waiting','No votes yet'],['runoff','Runoff']].filter(([a])=>a==='all'||n[a]).map(([a,b])=>`<a class="${f===a?'on':''}" href="#/${kind}?f=${a}">${b} (${n[a]})</a>`).join('')}</div>
 <p class="muted sm">Still-counting races first, closest at the top.</p><div class="rcs">${show.map(r=>resCard(r)).join('')||'<p class="muted">None.</p>'}</div>`}
function resState(s){const rs=R?R.races.filter(r=>r.st===s):[];if(!rs.length)return'';return`<h2>Results</h2>${['senate','governor','house'].map(k=>{const x=rs.filter(r=>r.kind===k);return x.length?`<h3>${kindName[k]}</h3><div class="rcs">${x.map(r=>resCard(r)).join('')}</div>`:''}).join('')}`}
/* ---------- hooking into the existing app ---------- */
const _homeF=home,_listF=list,_stateF=state,_raceF=race,_loadF=load;
home=function(q){if(!resultsMode()){const h=_homeF(q),c=countdown();return h.startsWith(c)?c+preNote()+h.slice(c.length):preNote()+h}return resHome(q)};
const _methodF=method;method=function(){return _methodF()+`<div class="card"><h2 style="margin-top:0">Live results (election night and after)</h2><ul class="sm">
<li>From Tuesday, Nov 3, 2026 at 6:00 PM CT the app shows live results instead of the forecast. You can switch back to the forecast at any time.</li>
<li>Source: the ${L('Fox News',LV.src)} election-results data feed (Fox News Decision Desk). Vote counts, % of expected vote counted, and race calls are shown exactly as the source publishes them.</li>
<li>A candidate is marked <span class="win">WINNER</span> only after the source calls the race. Before that the candidate ahead is marked "Leading". Nothing is projected or guessed.</li>
<li>The app reads the source directly about every 30 seconds while open (through Dec 15, 2026, then every 15 minutes). A backup copy is saved about every 10 minutes and used only if the source can't be reached.</li>
<li>Seat totals = seats not up in 2026 plus races the source has called. The 2 independents not up (King, Sanders) caucus with Democrats and are counted with them. Majority: Senate 51 (Republicans control at 50 because the Vice President breaks ties), House 218.</li>
<li>Runoffs: when no candidate wins a majority (e.g. Georgia), the source marks the top two as advancing, and the race is not counted for either party until the runoff is called.</li>
<li>Results are unofficial until each state certifies them.</li></ul></div>`};
list=function(k,q){return resultsMode()?resList(k,q):_listF(k,q)};
state=function(s){if(!resultsMode())return _stateF(s);const n=ST[s]||s;return`${liveBanner()}<h1>${esc(n)}</h1>${resState(s)||'<p class="muted">No results for this state yet.</p>'}<details class="card"><summary>Pre-election forecast for ${esc(n)}</summary>${_stateF(s)}</details>`};
race=function(id){if(!resultsMode())return _raceF(id);const r=R?.races.find(x=>x.id===id);
 const ro=r&&r.status==='runoff'?`<div id="ro" class="card muted sm">Checking for runoff results…</div>`:'';
 if(r&&r.status==='runoff')setTimeout(async()=>{const x=await runoffFor(r),el=document.getElementById('ro');if(!el)return;
  el.innerHTML=x&&x.tot?`<h3>Runoff results</h3>${x.res.map(c=>`<div class="cr ${c.win?'cw':''}"><div class="cn"><span class="dot ${c.p}"></span><b>${esc(c.name)}</b> (${esc(c.party)}) ${c.win?'<span class="badge w">WINNER</span>':''}</div><div class="cv"><span>${nf(c.votes)} votes</span><b>${c.pct.toFixed(1)}%</b></div></div>`).join('')}<div class="sm muted">Summed from the source's county results · updated ${ctTime(x.lm)}</div>`:'No runoff results published by the source yet.'},0);
 const fc=D.races.find(x=>x.id===id)?_raceF(id):'';
 return`${liveBanner()}${r?`<p><a href="#/state/${r.st}">← ${esc(ST[r.st]||r.st)}</a></p><h1>${esc(r.name)}</h1>${resCard(r,true)}${ro}`:'<p class="muted">No live results for this race from the source.</p>'}${fc?`<details class="card"><summary>Pre-election forecast for this race</summary>${fc}</details>`:''}`};
function preNote(){if(LV.force==='0')return'';if(Date.now()>=LV.start||LV.test)return`<div class="note"><b>Live results are available.</b> <a href="javascript:setView('results')">Switch to live results ›</a></div>`;return`<div class="note">Live results: on <b>Tuesday, Nov 3 at 6:00 PM CT</b> this app switches automatically to live vote counts and race calls from Fox News, updating every 30 seconds. <a href="javascript:setView('results')">Preview the results page</a> (no votes yet).</div>`}
function rerender(){if(!D)return;const op=[...app.querySelectorAll('details')].map(d=>d.open),y=scrollY;const sv=scrollTo;window.scrollTo=()=>{};try{route()}finally{window.scrollTo=sv}
 app.querySelectorAll('details').forEach((d,i)=>{if(op[i])d.open=true});window.scrollTo(0,y)}
/* switch automatically at 6 PM CT on Nov 3 even if the app is left open */
const _route=route,FT=document.querySelector('footer'),FT0=FT?FT.innerHTML:'';
route=function(){const rm=resultsMode();if(rm&&!R)liveStart();_route();const U=document.getElementById('upd');if(U)U.style.display=rm?'none':'';if(FT)FT.innerHTML=rm?`Live results from ${L('Fox News',LV.src)} (Fox News Decision Desk). A race is marked WINNER only after the source calls it. Vote counts are unofficial until certified by each state. Not used: CNN, MSN, MSNBC.`:FT0};
if(resultsMode())liveStart();
setInterval(()=>{if(!timer&&resultsMode()&&D){liveStart();route()}},30e3);
