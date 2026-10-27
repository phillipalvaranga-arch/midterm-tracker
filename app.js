const W='https://en.wikipedia.org/wiki/',UF='https://election.lab.ufl.edu/2026-general-election-early-vote/',app=document.getElementById('app');let D;
const TILE={AK:[0,0],ME:[0,11],VT:[1,10],NH:[1,11],WA:[2,1],ID:[2,2],MT:[2,3],ND:[2,4],MN:[2,5],WI:[2,6],MI:[2,8],NY:[2,9],MA:[2,10],RI:[2,11],OR:[3,1],NV:[3,2],WY:[3,3],SD:[3,4],IA:[3,5],IL:[3,6],IN:[3,7],OH:[3,8],PA:[3,9],NJ:[3,10],CT:[3,11],CA:[4,1],UT:[4,2],CO:[4,3],NE:[4,4],MO:[4,5],KY:[4,6],WV:[4,7],VA:[4,8],MD:[4,9],DE:[4,10],AZ:[5,2],NM:[5,3],KS:[5,4],AR:[5,5],TN:[5,6],NC:[5,7],SC:[5,8],OK:[6,4],LA:[6,5],MS:[6,6],AL:[6,7],GA:[6,8],HI:[7,0],TX:[7,4],FL:[7,9]};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const L=(v,u,t)=>`<a href="${u}" target="_blank" rel="noopener" title="${esc(t||'Source')}">${v}</a>`;
const M=(v)=>`<a href="#/method" title="Model output: see Method">${v}</a>`;
const mg=m=>m==null?'n/a':m===0?'Even':(m>0?'D+':'R+')+Math.abs(m).toFixed(1);
const pct=p=>(p=Math.round(p*1000)/1000)>=.995?'>99%':p<=.005?'<1%':(100*p).toFixed(0)+'%';
function col(p){if(p==null)return'#262c38';const t=Math.min(1,Math.abs(p-.5)*2),g=[138,143,153],c=p>.5?[59,111,214]:[214,59,59];return`rgb(${g.map((x,i)=>Math.round(x+(c[i]-x)*t)).join(',')})`}
const fav=r=>{const m=r.model;if(!m)return'No model inputs';const pd=m.p_dem,p=Math.max(pd,1-pd);return `${pd>=.5?'<b class=D>Dem</b>':'<b class=R>Rep</b>'} ${M(pct(p))} · ${M(m.confidence)} confidence`};
function names(r){const o={};if(r.nominees){o.D=r.nominees.D;o.R=r.nominees.R}
 const re=/([^·▌|]+?)\s*\((Democratic|Republican)[^)]*\)/g;let m;while((m=re.exec(r.candidates||''))){const k=m[2][0];if(!o[k])o[k]=m[1].replace(/^[\s,;]+/,'').trim()}
 if(r.incumbent&&(r.inc_party==='D'||r.inc_party==='R')&&!o[r.inc_party])o[r.inc_party]=r.incumbent.replace(/\s*\(.*$/,'').replace(/\s*Redistricted.*$/,'').trim();
 return o}
function outcome(r,inline){const m=r.model;if(!m)return'<span class=muted>No model inputs</span>';const n=names(r),w=m.p_dem>=.5?'D':'R',l=w==='D'?'R':'D',pw=w==='D'?m.p_dem:1-m.p_dem;
 const nm=k=>`${esc(n[k]||(k==='D'?'Democratic':'Republican')+' candidate')} (${k==='D'?'Democratic':'Republican'})`,t=pw<.55?' (toss-up)':'';
 return `<span class="win">Likely to win: ${nm(w)}, ${M(pct(pw))}${t}</span>${inline?'<br>':' · '}<span class="lose">Likely to lose: ${nm(l)}, ${M(pct(1-pw))}</span>`}
const ratingURL=r=>W+(r.rating_page||r.list_page);
async function load(){D=await (await fetch('data/data.json',{cache:'no-cache'})).json();
 const t=new Date(D.generated_utc).toLocaleString('en-US',{timeZone:'America/Chicago',dateStyle:'medium',timeStyle:'short'});
 const days=Math.ceil((new Date('2026-11-03T06:00:00-06:00')-Date.now())/864e5);
 document.getElementById('upd').innerHTML=`Last updated: ${t} CT · ${days>0?days+' days until Election Day':'Election Day'}`;route()}
function chamber(k,c){const d=c.median_dem_seats,r=c.total-d;return `<div class="card"><h2 style="margin-top:0">${k} control (model)</h2>
 <div class="bar"><div style="background:var(--d);width:${100*c.p_dem_control}%">Dem ${pct(c.p_dem_control)}</div><div style="background:var(--r);width:${100*c.p_rep_control}%">Rep ${pct(c.p_rep_control)}</div></div>
 <div style="margin-bottom:4px">${(()=>{const w=c.p_dem_control>=.5?'Democrats':'Republicans',l=w==='Democrats'?'Republicans':'Democrats',pw=Math.max(c.p_dem_control,c.p_rep_control);return `<span class="win">Projected to win ${k} control: ${w}, ${M(pct(pw))}${pw<.55?' (toss-up)':''}</span> · <span class="lose">Projected to lose: ${l}, ${M(pct(1-pw))}</span>`})()}</div><div>Median outcome: <span class=D>Dem ${d}</span> – <span class=R>Rep ${r}</span> seats (80% range Dem ${c.p10}–${c.p90}). ${M('Method')}</div>
 <div class="muted">${k==='Senate'?`${c.seats_up} seats up; not up: Dem caucus ${c.holdover_dem_caucus}, Rep ${c.holdover_rep} (${L('source',W+'2026_United_States_Senate_elections')}). Control requires 51 Dem-caucus seats (the Vice President, a Republican, breaks 50–50 ties).`:`All 435 seats up; 218 needed for a majority (${L('source',W+'2026_United_States_House_of_Representatives_elections')}).`} ${c.sims.toLocaleString()} simulations.</div></div>`}
function map(kind){const by={};D.races.filter(r=>r.kind===kind).forEach(r=>(by[r.state]=by[r.state]||[]).push(r));
 let cells='';for(const[s,[y,x]]of Object.entries(TILE)){const rs=by[s];let p=null,sub='';
  if(rs){if(kind==='house'){const dn=rs.filter(r=>r.model&&r.model.p_dem>.5).length;p=dn/rs.length;sub=`${dn}D–${rs.length-dn}R`}else{const r=rs[0];p=r.model?.p_dem;sub=r.model?pct(Math.max(p,1-p)):''}}
  cells+=`<a class="tile ${rs?'':'none'}" style="grid-row:${y+1};grid-column:${x+1};background:${col(p)}" href="#/state/${s}" title="${s}">${s}<small>${sub}</small></a>`}
 return `<div class="map">${cells}</div><div class="legend muted" style="margin-top:6px">Color = model probability${kind==='house'?' share of districts favored':''}:<span style="background:var(--d)"></span>Dem<span style="background:#8a8f99"></span>50/50<span style="background:var(--r)"></span>Rep<span style="background:#262c38"></span>No race</div>`}
function home(q){const k=q.get('m')||'senate';
 return `${chamber('Senate',D.senate)}${chamber('House',D.house)}<div class="tabs">${[['senate','Senate'],['governor','Governor'],['house','House']].map(([a,b])=>`<a class="${k===a?'on':''}" href="#/?m=${a}">${b} map</a>`).join('')}</div>${map(k)}
 <div class="note">Early-vote numbers count ballots returned by registered party. They are not counted vote choices; ballots are not tabulated until Election Day. ${L('UF Election Lab',UF)}</div>${gapsBox()}`}
function gapsBox(){return D.gaps.length?`<div class="card"><b>Data gaps this update</b><ul>${D.gaps.map(g=>`<li>${esc(g)}</li>`).join('')}</ul></div>`:''}
function row(r){return `<tr><td><a href="#/race/${r.id}">${esc(r.name)}</a></td><td>${esc(r.incumbent)}</td><td>${r.ratings.Cook_label?L(esc(r.ratings.Cook_label),ratingURL(r),'Cook Political Report via Wikipedia ratings table'):'–'}</td><td>${r.model?M(mg(r.model.margin)):'–'}</td><td>${fav(r)}</td></tr><tr class=oc><td colspan=5>${outcome(r)}</td></tr>`}
function list(kind,q){let rs=D.races.filter(r=>r.kind===kind);if(kind==='house'&&q.get('all')!=='1')rs=rs.filter(r=>r.model&&Math.max(r.model.p_dem,1-r.model.p_dem)<.9);
 rs.sort((a,b)=>Math.abs((a.model?.p_dem??1)-.5)-Math.abs((b.model?.p_dem??1)-.5));
 return `${kind==='senate'?chamber('Senate',D.senate):kind==='house'?chamber('House',D.house):''}<h1>${{senate:'Senate',house:'House',governor:'Governor'}[kind]} races (${rs.length}${kind==='house'&&q.get('all')!=='1'?' with model probability under 90% · <a href="#/house?all=1">show all 435</a>':''})</h1>
 <div class="tw"><table><tr><th>Race</th><th>Incumbent</th><th>Cook rating</th><th>Model margin</th><th>Model</th></tr>${rs.map(row).join('')}</table></div>`}
function state(s){const rs=D.races.filter(r=>r.state===s),n=rs[0]?.state_name||s,e=D.early_vote[s];
 return `<h1>${esc(n)}</h1>${evBox(s,e)}<div class="tw"><table><tr><th>Race</th><th>Incumbent</th><th>Cook rating</th><th>Model margin</th><th>Model</th></tr>${['senate','governor','house'].flatMap(k=>rs.filter(r=>r.kind===k)).map(row).join('')}</table></div>`}
function evBox(s,e){if(!e)return'';const src=/^https?:/.test(e.source)?L('state source',e.source):esc(e.source);
 return `<div class="card"><b>Early vote (ballots returned)</b>: ${L(e.voted_all.toLocaleString(),UF,'UF Election Lab')} as of ${esc(e.last_update)}${e.turnout_2022?` (${L((100*e.voted_all/e.turnout_2022).toFixed(1)+'%',UF,'UF Election Lab')} of 2022 total turnout)`:''}.
 ${e.dem!=null?`By party registration: ${L('Dem '+e.dem.toLocaleString(),UF)}, ${L('Rep '+e.rep.toLocaleString(),UF)}, ${L('Other/none '+e.none.toLocaleString(),UF)}. Registration gap: ${L(mg(e.share_gap)+' pts',UF)}${e.shift_vs_2024_final!=null?`; 2024 final early-vote gap ${L(mg(e.share_gap_2024_final),'https://election.lab.ufl.edu/data-downloads/earlyvote/2024/US.csv')} (change ${L((e.shift_vs_2024_final>0?'+':'')+e.shift_vs_2024_final,UF)} toward ${e.shift_vs_2024_final>0?'Dem':'Rep'} registrants)`:''}.`:'This state does not report party registration of early voters (or has no data yet).'}
 Source: ${src}. <span class="muted">These are not counted vote choices.</span></div>`}
function raceFull(id){const r=D.races.find(x=>x.id===id);if(!r)return'Not found';const m=r.model,i=m?.inputs||{},rd=D.rating_dates[r.kind]||{},pu=r.page?W+r.page:W+r.list_page;
 const rat=['Cook','Inside Elections','Sabato'].map(k=>`<tr><td>${k}${rd[k]?` <span class=muted>(${esc(rd[k])})</span>`:''}</td><td>${r.ratings[k+'_label']?L(esc(r.ratings[k+'_label']),ratingURL(r)):'not available'}</td><td>${r.ratings[k]!=null?mg(r.ratings[k]):'–'}</td></tr>`).join('');
 const polls=(r.poll_data?.polls||[]);
 const inp=[['Race ratings average','rating',`${L('ratings table',ratingURL(r))}; Solid/Safe=20, Likely=10, Lean=5, Tilt=2, Toss-up=0 points`],['Qualifying-pollster average','polls',`${L('polls',pu+'#Polling')} from ${esc(D.top_pollsters.join(', ')||'none')}`],['Baseline','baseline',r.kind==='house'?`${L('PVI',W+r.list_page)} ${r.pvi!=null?mg(r.pvi):''} ×2${r.last_margin!=null?` and ${L('2024 result',ratingURL(r))} ${mg(r.last_margin)}`:''}`:`${L('2024 presidential',W+'2024_United_States_presidential_election#Results_by_state')} ${mg(D.pres24[r.state])} and ${L(r.last_year+' result',W+r.list_page)} ${mg(r.last_margin)}`],['Early-vote adjustment','early_vote',`${L('UF Election Lab',UF)} registration-gap change vs. 2024 final, ×0.25, capped ±3 (${i.early_vote_adj!=null?mg(i.early_vote_adj):'n/a'})`]];
 return `<p><a href="#/state/${r.state}">← ${esc(r.state_name)}</a></p><h1>${esc(r.name)}</h1>
 <div class="card"><div>Incumbent: <b>${esc(r.incumbent)}</b>${r.inc_party?` (${esc(r.inc_party)})`:''} · ${L('source',W+r.list_page)}</div>
 ${r.nominees?`<div>Matchup in polling tables: <span class=D>${esc(r.nominees.D)} (D)</span> vs <span class=R>${esc(r.nominees.R)} (R)</span> · ${L('source',pu)}</div>`:''}
 ${r.candidates?`<div class="muted">Candidates listed: ${esc(r.candidates)} · ${L('source',W+r.list_page)}</div>`:''}${r.status?`<div class=muted>Status: ${esc(r.status)}</div>`:''}</div>
 ${m?`<div class="card"><h2 style="margin-top:0">Model</h2><div class="bar"><div style="background:var(--d);width:${100*m.p_dem}%">Dem ${pct(m.p_dem)}</div><div style="background:var(--r);width:${100-100*m.p_dem}%">Rep ${pct(1-m.p_dem)}</div></div>
 <p style="margin:4px 0 8px">${outcome(r)}</p>Projected margin ${M(mg(m.margin))} · win probability ${M(pct(Math.max(m.p_dem,1-m.p_dem)))} · confidence ${M(m.confidence)} (uncertainty σ = ${m.sd} pts)
 <div class="tw"><table><tr><th>Input</th><th>Value</th><th>Weight</th><th>Source / basis</th></tr>${inp.map(([n,k,s])=>`<tr><td>${n}</td><td>${i[k]!=null?mg(i[k]):'not available'}</td><td>${m.weights[k]!=null?pct(m.weights[k]):'0%'}</td><td>${s}</td></tr>`).join('')}</table></div></div>`:''}
 <h2>Ratings</h2><div class="tw"><table><tr><th>Rater</th><th>Rating</th><th>Points</th></tr>${rat}</table></div>
 <h2>Polls from qualifying pollsters</h2>${polls.length?`<div class="tw"><table><tr><th>Pollster</th><th>Dates</th><th>Sample</th><th>Dem</th><th>Rep</th><th>Margin</th></tr>${polls.map(p=>`<tr><td>${esc(p.pollster)}</td><td>${esc(p.dates)}</td><td>${esc(p.sample)}</td><td>${L(p.D+'%',pu+'#Polling')}</td><td>${L(p.R+'%',pu+'#Polling')}</td><td>${mg(p.margin)}</td></tr>`).join('')}</table></div>`:`<p class="muted">No poll from a rule-qualifying pollster (${esc(D.top_pollsters.join(', '))}) was found for this race. The model uses ratings and baselines only. ${r.poll_data?`(${r.poll_data.all_polls_in_table} polls by other pollsters are listed at the ${L('source',pu+'#Polling')} and are excluded by the rule.)`:''}</p>`}
 ${['senate','governor'].includes(r.kind)?evBox(r.state,D.early_vote[r.state]):''}`}
function pollsters(){const a=D.pollster_accuracy,q=a.ranking.filter(r=>r.qualifies);const yrs=['2016','2020','2024'];
 const gp=D.generic_ballot.polls;const rp=D.races.flatMap(r=>(r.poll_data?.polls||[]).map(p=>({...p,race:r})));
 return `<h1>Pollster accuracy rule</h1><div class="note">${esc(a.rule)}</div><p>${q.length} pollster(s) meet the rule${q.length<3?` (fewer than 3; no other pollster is used)`:''}: <b>${esc(q.map(r=>r.name).join(', ')||'none')}</b>.</p>
 <p class="muted">Method: ${esc(a.method)} Actual margins (D–R): ${yrs.map(y=>`${y} ${L(mg(a.actual[y]),a.actual_sources[y])}`).join(', ')}. Only pollsters with a listed final national poll in all three years can be evaluated.</p>
 <div class="tw"><table><tr><th>Pollster</th>${yrs.map(y=>`<th>${y} final poll (error)</th>`).join('')}<th>Mean error</th><th>Meets rule</th></tr>${a.ranking.map(r=>`<tr><td>${esc(r.name)}</td>${yrs.map(y=>{const v=r.years[y];return `<td>${L(mg(v.poll_D_minus_R),a.sources[y])} (${v.abs_error})<br><span class=muted>${v.final_poll_end}</span></td>`}).join('')}<td>${r.mean_abs_error}</td><td>${r.qualifies?'Yes':'No'}</td></tr>`).join('')}</table></div>
 <h2>2026 generic congressional ballot (qualifying pollsters)</h2>${gp.length?`<table><tr><th>Pollster</th><th>Dates</th><th>Dem</th><th>Rep</th><th>Margin</th></tr>${gp.map(p=>`<tr><td>${esc(p.pollster)}</td><td>${esc(p.dates)}</td><td>${L(p.D,D.generic_ballot.source)}</td><td>${L(p.R,D.generic_ballot.source)}</td><td>${mg(p.margin)}</td></tr>`).join('')}</table>`:`<p class="muted">None found in the ${L('RealClearPolling generic-ballot list',D.generic_ballot.source)} this update.</p>`}
 <h2>2026 race polls (qualifying pollsters)</h2>${rp.length?`<div class="tw"><table><tr><th>Race</th><th>Pollster</th><th>Dates</th><th>Dem</th><th>Rep</th><th>Margin</th></tr>${rp.map(p=>`<tr><td><a href="#/race/${p.race.id}">${esc(p.race.name)}</a></td><td>${esc(p.pollster)}</td><td>${esc(p.dates)}</td><td>${L(p.D+'%',W+p.race.page+'#Polling')}</td><td>${L(p.R+'%',W+p.race.page+'#Polling')}</td><td>${mg(p.margin)}</td></tr>`).join('')}</table></div>`:'<p class=muted>None found.</p>'}`}
function method(){return `<h1>Method & sources</h1><div class="card"><p><a href="#/pollsters">See the pollster accuracy rule and its data ›</a></p><p>Every race uses the same formula. Margins are Dem minus Rep, in points.</p><ol>
<li><b>Ratings</b> (weight 35%): the average of Cook Political Report, Inside Elections and Sabato's Crystal Ball, converted to points (Solid/Safe 20, Likely 10, Lean 5, Tilt 2, Toss-up 0), identical for both parties. They're read from the ratings tables on ${L('Senate',W+'2026_United_States_Senate_elections')}, ${L('Governor',W+'2026_United_States_gubernatorial_elections')} and ${L('House',W+'2026_United_States_House_of_Representatives_election_ratings')} pages, which cite each rater. House seats not on the rated-competitive list are treated as Safe for the incumbent party.</li>
<li><b>Polls</b> (weight 35%): only polls from pollsters meeting the ${'<a href="#/pollsters">accuracy rule</a>'}. Recency-weighted average of the latest 4 (weights 1, .85, .72, .61). If none exist, this input is omitted and the other weights are rescaled.</li>
<li><b>Baseline</b> (weight 25%): Senate/Governor = average of the 2024 presidential margin in the state and the seat's last result. House = 2× Cook PVI, plus the 2024 House result where listed. Prior results are shifted by (current generic-ballot margin − national House margin that year: ${Object.entries(D.env).map(([y,v])=>L(y+' '+mg(v),W+y+'_United_States_House_of_Representatives_elections')).join(', ')}) only when a qualifying generic-ballot poll exists. Currently: ${D.generic_ballot_used==null?'none, so no shift is applied':mg(D.generic_ballot_used)}. Last-result margins are derived from the winner's share (2×share−100).</li>
<li><b>Early vote</b> (weight 5%, statewide races only, once returns reach 5% of 2022 turnout): the change in the party-registration gap of returned ballots vs. the 2024 final early vote (${L('UF Election Lab',UF)}), ×0.25, capped at ±3. A same-point-in-time 2022/2024 comparison is not published in machine-readable form, so the 2024 final figure is used. Early votes are not counted vote choices.</li></ol>
<p>Win probability = Normal(margin / σ), σ = 6.5 (statewide with polls), 7.5 (House with polls), 8 (no polls). Confidence: High if probability ≥ 90%, inputs within 15 pts and more than one input; Medium if ≥ 70%; otherwise Low. Chamber control: ${D.senate.sims.toLocaleString()} simulations with a shared national error (σ 3) plus race-level error.</p>
<p>Not used: CNN, MSN, MSNBC. Sources: ${L('Wikipedia election pages (ratings, candidates, polls)',W+'2026_United_States_elections')}, ${L('UF Election Lab early vote',UF)} and state election offices it cites, ${L('RealClearPolling',D.generic_ballot.source)}.</p></div>${gapsBox()}`}
function search(v){v=v.trim().toLowerCase();if(!v)return;const st=D.races.find(r=>r.state.toLowerCase()===v||r.state_name.toLowerCase()===v);if(st)return location.hash='#/state/'+st.state;
 const hits=D.races.filter(r=>(r.name+' '+r.id+' '+r.incumbent).toLowerCase().includes(v)).slice(0,60);app.innerHTML=`<h1>Results for “${esc(v)}”</h1><div class=tw><table><tr><th>Race</th><th>Incumbent</th><th>Cook rating</th><th>Model margin</th><th>Model</th></tr>${hits.map(row).join('')||'<tr><td>No matches</td></tr>'}</table></div>`}
document.getElementById('q').addEventListener('keydown',e=>{if(e.key==='Enter')search(e.target.value)});
document.getElementById('q').addEventListener('input',e=>{if(e.target.value.length>=3)search(e.target.value)});
function route(){if(!D)return;const[p,qs]=location.hash.slice(1).split('?'),q=new URLSearchParams(qs||''),s=(p||'/').split('/').filter(Boolean);
 app.innerHTML=!s.length?home(q):s[0]==='state'?state(s[1]):s[0]==='race'?race(s[1]):s[0]==='pollsters'?pollsters():s[0]==='method'?method():['senate','house','governor'].includes(s[0])?list(s[0],q):home(q);scrollTo(0,0)}
addEventListener('hashchange',route);load().catch(e=>app.textContent='Could not load data: '+e.message);
if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
/* ---- v4 friendly UI (overrides earlier definitions) ---- */
const MY='TX',MYD=['H-TX-03','H-TX-04'];
const kindName={senate:'Senate',house:'House',governor:'Governor'};
function plainRating(r){const l=r.ratings.Cook_label;return l?`Expert rating (Cook): ${L(esc(l.replace(' (not on rated-competitive list)','')),ratingURL(r),'Cook Political Report via Wikipedia ratings table')}`:''}
function row(r){return `<div class="rc"><a class="rn" href="#/race/${r.id}">${esc(r.name)} ›</a><div class="muted">Incumbent: ${esc(r.incumbent)}</div><div class="oline">${outcome(r,1)}</div><div class="muted sm">${plainRating(r)}</div></div>`}
function cards(rs){return `<div class="rcs">${rs.map(row).join('')||'<p class=muted>No races.</p>'}</div>`}
function ctrl(k,c){const w=c.p_dem_control>=.5?'Democrats':'Republicans',l=w==='Democrats'?'Republicans':'Democrats',pw=Math.max(c.p_dem_control,c.p_rep_control);
 return `<div class="win big">${w} favored to control the ${k}: ${M(pct(pw))}${pw<.55?' (toss-up)':''}</div><div class="lose">${l}: ${M(pct(1-pw))}</div>`}
function chamber(k,c){return `<div class="card">${ctrl(k,c)}<details><summary>Details</summary><div class="bar"><div style="background:var(--d);width:${100*c.p_dem_control}%">Dem ${pct(c.p_dem_control)}</div><div style="background:var(--r);width:${100*c.p_rep_control}%">Rep ${pct(c.p_rep_control)}</div></div>
 Most likely seat count: Democrats ${c.median_dem_seats}, Republicans ${c.total-c.median_dem_seats} (80% range for Democrats: ${c.p10}–${c.p90}). ${k==='Senate'?`${c.seats_up} seats are up this year; seats not up: Democratic caucus ${c.holdover_dem_caucus}, Republican ${c.holdover_rep} (${L('source',W+'2026_United_States_Senate_elections')}). Majority = 51 Democratic-caucus seats, or 50 Republican seats plus the Vice President's tie-break.`:`All 435 seats are up; 218 is a majority (${L('source',W+'2026_United_States_House_of_Representatives_elections')}).`} ${M('How this is calculated')}</details></div>`}
function countdown(){const ms=new Date('2026-11-03T00:00:00-06:00')-Date.now(),d=Math.max(0,Math.ceil(ms/864e5));return d>0?`<div class="cd"><b>${d}</b> day${d===1?'':'s'} until Election Day · Tuesday, Nov 3, 2026</div>`:`<div class="cd"><b>Election Day</b> · Tuesday, Nov 3, 2026</div>`}
function help(){return `<details class="card help"><summary>How to read this</summary><ul>
<li><span class="win">Green</span> = the candidate or party the model expects to win. <span class="lose">Red</span> = the one it expects to lose. The same colors apply to both parties.</li>
<li>The percentage is the model's chance of winning. 50% would be a coin flip. Races where the leader is under 55% are marked <b>(toss-up)</b>.</li>
<li>The model combines expert ratings, polls from the one pollster that meets the accuracy rule, and past results. Tap <b>Details</b> on any race to see each input and its source.</li>
<li>Early-vote counts show ballots returned by party registration. They are not counted votes.</li>
<li>These are estimates, not results. See <a href="#/method">Method & sources</a> and the <a href="#/pollsters">pollster accuracy rule</a>.</li></ul></details>`}
function home(q){const sen=D.races.filter(r=>r.kind==='senate'),gov=D.races.filter(r=>r.kind==='governor');
 const gw=gov.filter(r=>r.model&&r.model.p_dem>=.5).length,gr=gov.length-gw;
 const my=D.races.filter(r=>r.state===MY&&(r.kind!=='house'||MYD.includes(r.id)));
 const tiles=`<div class="big3"><div class="bc" onclick="location.hash='#/senate'"><h2>Senate</h2>${ctrl('Senate',D.senate)}<a class="go" href="#/senate">See ${sen.length} races ›</a></div>
 <div class="bc" onclick="location.hash='#/house'"><h2>House</h2>${ctrl('House',D.house)}<a class="go" href="#/house">See all 435 races ›</a></div>
 <div class="bc" onclick="location.hash='#/governor'"><h2>Governors</h2><div class="big">${gov.length} races</div><div>Model favors: Democrats in ${gw}, Republicans in ${gr} ${M('(method)')}</div><a class="go" href="#/governor">See races ›</a></div></div>`;
 return `${countdown()}<div class="card my"><h2>My State: Texas</h2><div class="muted">Frisco is in the TX-3 / TX-4 area. ${L('District map source',W+'2026_United_States_House_of_Representatives_elections#Texas')}</div>${cards(my)}<a class="go" href="#/state/TX">All Texas races ›</a></div>
 ${tiles}${help()}<h2>Map</h2><div class="tabs">${[['senate','Senate'],['governor','Governor'],['house','House']].map(([a,b])=>`<a class="${(q.get('m')||'senate')===a?'on':''}" href="#/?m=${a}">${b}</a>`).join('')}</div>${map(q.get('m')||'senate')}
 <div class="note">Early-vote numbers are ballots returned by party registration, not counted vote choices. ${L('UF Election Lab',UF)}</div>${gapsBox()}`}
function list(kind,q){let rs=D.races.filter(r=>r.kind===kind);const all=q.get('all')==='1';if(kind==='house'&&!all)rs=rs.filter(r=>r.model&&Math.max(r.model.p_dem,1-r.model.p_dem)<.9);
 rs.sort((a,b)=>Math.abs((a.model?.p_dem??1)-.5)-Math.abs((b.model?.p_dem??1)-.5));
 return `<h1>${kindName[kind]}</h1>${kind!=='governor'?chamber(kindName[kind],D[kind]):''}<p class="muted">Closest races first.${kind==='house'&&!all?` Showing ${rs.length} races where the leader is under 90%. <a href="#/house?all=1">Show all 435</a>`:''}</p>${cards(rs)}`}
function state(s){const rs=D.races.filter(r=>r.state===s),n=rs[0]?.state_name||s;
 return `<h1>${esc(n)}</h1>${['senate','governor','house'].map(k=>{const x=rs.filter(r=>r.kind===k);return x.length?`<h2>${kindName[k]}</h2>${cards(x)}`:''}).join('')}<details class="card"><summary>Early vote in ${esc(n)}</summary>${evBox(s,D.early_vote[s])||'<p class=muted>No data.</p>'}</details>`}
const _race=raceFull;
function race(id){const r=D.races.find(x=>x.id===id);if(!r)return'Not found';const h=_race(id);
 const i=h.indexOf('<div class="card"><h2 style="margin-top:0">Model</h2>');if(i<0)return h;
 const head=h.slice(0,i);const rest=h.slice(i);
 return head+`<div class="card"><div class="oline big">${outcome(r,1)}</div><div class="muted">${plainRating(r)}</div></div><details class="card"><summary>Details: model inputs, ratings, polls and sources</summary>${rest}</details>`}
function search(v){v=v.trim().toLowerCase();if(!v)return;const st=D.races.find(r=>r.state.toLowerCase()===v||r.state_name.toLowerCase()===v);if(st)return location.hash='#/state/'+st.state;
 const t=v.replace(/^tx-?/,'texas ').replace(/\s+/g,' ');const hits=D.races.filter(r=>(r.name+' '+r.id+' '+r.incumbent).toLowerCase().includes(v)||r.name.toLowerCase().includes(t)).slice(0,60);
 app.innerHTML=`<h1>Results for “${esc(v)}”</h1>${cards(hits)}`}
/* ---- v6 overall prediction (data from pipeline/summary.py, recomputed every daily refresh) ---- */
const PN={D:'Democrats',R:'Republicans'};
function pline(w,dN,rN,unit){const o=w==='D'?'R':'D',n={D:dN,R:rN};
 if(!w)return `<div class="pv"><span class="D">${PN.D} ${dN}</span> · <span class="R">${PN.R} ${rN}</span></div><div class="sm muted">${unit}</div>`;
 return `<div class="pv"><span class="win">${PN[w]} ${n[w]}</span> · <span class="lose">${PN[o]} ${n[o]}</span></div><div class="sm muted">${unit}</div>`}
function bucketLine(b,label){return `<div class="sm">Undecided ${label}: <b>${b.close}</b> too close (leader under ${Math.round(100*D.summary.toss_threshold)}%) · <b>${b.nodata}</b> no data${b.close_races.length&&b.close_races.length<=8?` <span class="muted">(${esc(b.close_races.join(', '))})</span>`:''}</div>`}
function ctrlLine(c,k){const w=c.leader;if(!w)return `<div class="big">${k} control: tied</div>`;const o=w==='D'?'R':'D',t=!c.likely;
 return `<div class="big"><span class="win">${t?`Slight edge for ${k} control: ${PN[w]} (toss-up)`:`Likely to control the ${k}: ${PN[w]}`}</span></div><div class="sm"><span class="win">${PN[w]} ${pct(c.probability)}</span> · <span class="lose">${PN[o]} ${pct(1-c.probability)}</span> chance of control · <b>${c.confidence}</b> confidence</div>`}
function overall(){const S=D.summary;if(!S)return'';const s=S.senate,h=S.house,g=S.governor;
 const sw=s.control.leader,hw=h.control.leader;
 const sR=c=>`80% range: Democrats ${c.range80_dem[0]}–${c.range80_dem[1]}, Republicans ${c.range80_rep[0]}–${c.range80_rep[1]} · most likely result Democrats ${c.median_dem}, Republicans ${c.median_rep}`;
 const gT=g.projected_D_total!=null,gd=gT?g.projected_D_total:g.races.D,gr=gT?g.projected_R_total:g.races.R,gw=gd>gr?'D':gr>gd?'R':null;
 const gLead=Math.abs(gd-gr),gU=g.races.close+g.races.nodata;
 return `<section class="card ov"><h2>Overall prediction</h2><div class="muted sm">Based on all ${D.races.length} races in this app · updated ${new Date(S.generated_utc).toLocaleDateString('en-US',{timeZone:'America/Chicago',weekday:'long',month:'short',day:'numeric'})}</div>
 <div class="ovg"><div class="ovc"><h3>Senate</h3>${ctrlLine(s.control,'Senate')}${pline(sw,s.projected_D,s.projected_R,'projected seats of 100 · 51 needed')}
  <div class="sm muted">${s.tiebreak}</div><div class="sm">Seats not up: Democratic caucus ${s.holdover_D}, Republicans ${s.holdover_R}. Projected wins of the ${s.seats_up} races: Democrats ${s.races.D}, Republicans ${s.races.R}.</div>${bucketLine(s.races,'Senate races')}<div class="sm muted">${sR(s.control)}</div><a class="go" href="#/senate">See ${s.seats_up} Senate races ›</a></div>
 <div class="ovc"><h3>House</h3>${ctrlLine(h.control,'House')}${pline(hw,h.projected_D,h.projected_R,'projected seats of 435 · 218 needed')}
  ${bucketLine(h.races,'House races')}<div class="sm">${(()=>{const L2=h.control.leader||(h.projected_D>=h.projected_R?'D':'R'),n=L2==='D'?h.projected_D:h.projected_R;return n>=218?`${PN[L2]} reach 218 without any undecided race.`:`Neither party reaches 218 from projected seats alone; ${PN[L2]} need ${218-n} of the ${h.races.close+h.races.nodata} undecided races.`})()}</div><div class="sm muted">${sR(h.control)}</div><a class="go" href="#/house">See all 435 House races ›</a></div>
 <div class="ovc"><h3>Governors</h3>${gw?`<div class="big"><span class="win">Projected majority of governorships: ${PN[gw]}</span></div>`:'<div class="big">Projected governorships: tied</div>'}${pline(gw,gd,gr,gT?'projected governorships of 50':`projected wins of ${g.races_total} races`)}
  ${gT?`<div class="sm">Not up in 2026: Democrats ${g.holdover.D}, Republicans ${g.holdover.R}${g.holdover.other?`, other ${g.holdover.other}`:''}. Projected wins of the ${g.races_total} races: Democrats ${g.races.D}, Republicans ${g.races.R}.</div>`:''}${bucketLine(g.races,'governor races')}
  <div class="sm"><b>${gU>=gLead?'Low':'Medium'}</b> confidence: lead of ${gLead} ${gU>=gLead?'is not larger than':'is larger than'} the ${gU} undecided race${gU===1?'':'s'}.</div><a class="go" href="#/governor">See ${g.races_total} governor races ›</a></div></div>
 <details><summary>How this was calculated</summary><ul class="sm">
 <li>Each race uses the app's same formula for both parties: expert ratings, polls only from pollsters meeting the accuracy rule (${esc(D.top_pollsters.join(', ')||'none')}), past results, and early-vote returns. See <a href="#/method">Method</a>.</li>
 <li>A race counts for a party when that party's chance is ${Math.round(100*S.toss_threshold)}% or more. Under ${Math.round(100*S.toss_threshold)}% = "too close". A race with no inputs = "no data"; it is never guessed. This update: ${S.close_total} too close, ${S.nodata_total} with no data.</li>
 <li>Projected seats = seats not up for election + races counted for each party. Undecided races are not given to either party.</li>
 <li>Chance of control and the 80% range come from ${s.control.sims.toLocaleString()} simulations of every race (including the too-close ones), with a shared national error. Confidence: High = 90%+, Medium = 70–89%, Low = 55–69%, under 55% = Toss-up.</li>
 <li>Governors have no simulation; confidence compares the lead to the number of undecided races.</li>
 <li>Estimates, not results. Updated automatically every morning with the rest of the data.</li></ul>
 <div class="sm">Sources: ${S.sources.map(([t,u])=>u.startsWith('#')?`<a href="${u}">${esc(t)}</a>`:L(esc(t),u)).join(' · ')}</div>${S.gaps.length?`<div class="sm muted">${S.gaps.map(esc).join(' ')}</div>`:''}</details></section>`}
const _homeV4=home;
home=function(q){let h=_homeV4(q);const c=countdown();const a=h.indexOf('<div class="big3">'),b=h.indexOf('<details class="card help">');if(D.summary&&a>=0&&b>a)h=h.slice(0,a)+h.slice(b);return h.startsWith(c)?c+overall()+h.slice(c.length):overall()+h};
/* ---- v8 Key races: the 5 closest Senate and House races (model), recomputed from each daily data refresh ---- */
function keyRaces(){if(!D||!D.races)return'';const top=k=>D.races.filter(r=>r.kind===k&&r.model).sort((a,b)=>Math.abs(a.model.p_dem-.5)-Math.abs(b.model.p_dem-.5)).slice(0,5);
 const li=r=>{const pr=1-r.model.p_dem,c=r.ratings.Cook_label;return `<li><a href="#/race/${r.id}">${esc(r.name)}</a> <span class="muted">(${esc(r.incumbent)})</span> · GOP win chance ${M(pct(pr))}${c?` · Cook: ${esc(c.replace(' (not on rated-competitive list)',''))}`:''}</li>`};
 const s=D.senate,needR=50-s.holdover_rep;
 return `<div class="card"><h2 style="margin-top:0">Key races for Republican control</h2>
 <h3>Senate</h3><p class="sm">Republicans need 50 seats (VP Vance breaks ties). ${s.holdover_rep} GOP seats are not up, so they need ${needR} of the ${s.seats_up} races. These 5 are the closest:</p><ol>${top('senate').map(li).join('')}</ol>
 <h3>House</h3><p class="sm">218 seats needed for a majority. These 5 are the closest:</p><ol>${top('house').map(li).join('')}</ol>
 <p class="sm muted">Closest = model win chance nearest 50/50; updates with each daily data refresh. See <a href="#/method">Method</a>.</p></div>`}
const _homeV7=home;home=function(q){const h=_homeV7(q),k=keyRaces(),i=h.indexOf('<div class="card my">');return i>=0?h.slice(0,i)+k+h.slice(i):k+h};
