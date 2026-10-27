"""Midterm Tracker 2026 data pipeline. Public, freely accessible sources only; writes ../data/data.json.
Excluded sources: CNN, MSN, MSNBC (CNN-sponsored polls are dropped). Same rules applied to every race and both parties."""
import pandas as pd,re,io,json,math,random,datetime,urllib.request,concurrent.futures as cf,os,sys
from bs4 import BeautifulSoup
UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36','Accept-Language':'en-US'}
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data');os.makedirs(OUT,exist_ok=True)
UA['Accept']='text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
WUA={'User-Agent':'MidtermTracker/1.0 (https://github.com/phillipalvaranga-arch/midterm-tracker; personal non-commercial dashboard) python-urllib','Accept':'text/html'}
import time
def get(u,t=40,h=None):
  for i in range(6):
    try: return urllib.request.urlopen(urllib.request.Request(u,headers=h or UA),timeout=t).read().decode('utf-8','replace')
    except urllib.error.HTTPError as e:
      if e.code in (429,503) and i<5: time.sleep(2**i+1);continue
      raise
W='https://en.wikipedia.org/api/rest_v1/page/html/'
def wiki(p):
  time.sleep(0.3);return get(W+p,h=WUA)
def wl(p): return 'https://en.wikipedia.org/wiki/'+p
def clean(x): return re.sub(r'\s+',' ',re.sub(r'\[[^\]]*\]','',str(x))).replace('\xa0',' ').strip() if x==x else ''
def flat(t): t.columns=[clean(c[-1] if isinstance(c,tuple) else c) for c in t.columns];return t
STATES={'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS','Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC','South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'}
RMAP={'solid':20,'safe':20,'likely':10,'lean':5,'tilt':2}
def rating_val(s):
  s=clean(s).lower()
  if not s or s=='nan': return None
  if 'toss' in s: return 0.0
  m=re.match(r'(solid|safe|likely|lean|tilt)\s*([dr])',s)
  return RMAP[m.group(1)]*(1 if m.group(2)=='d' else -1) if m else None
def margin_from_last(s):
  m=re.search(r'([\d.]+)%\s*([DRI])',clean(s))
  if not m: return None,None
  mg=2*float(m.group(1))-100;p=m.group(2)
  return (mg if p=='D' else -mg if p=='R' else None),p
def pvi_val(s):
  s=clean(s)
  if s.upper().startswith('EVEN'): return 0
  m=re.match(r'([DR])\+(\d+)',s);return (int(m.group(2))*(1 if m.group(1)=='D' else -1)) if m else None
gaps=[];now=datetime.datetime.now(datetime.timezone.utc)
acc=json.load(open(os.path.join(OUT,'pollster_accuracy.json')))
GR=json.load(open(os.path.join(OUT,'pollster_grades.json')))
TOP=[r for r in GR['pollsters'] if r['err']<=1.9 and r['polls']>=10 and r['winner']>=85]  # top-accuracy rule, see data/pollster_grades.json
if len(TOP)<3: gaps.append(f'Only {len(TOP)} pollster(s) met the accuracy rule; no other pollsters are used.')
TOPPAT={r['key']:r['pat'] for r in TOP};_OLD={'ibd/tipp':r'tipp|\bibd\b','rasmussen':r'rasmussen reports','morning consult':r'morning consult','ipsos':r'ipsos','yougov':r'yougov'}
def top_key(src):
  s=clean(src).lower()
  for r in TOP:
    if re.search(TOPPAT.get(r['key'],re.escape(r['key'])),s): return r['key']
  return None
# generic ballot
GBURL='https://www.realclearpolling.com/polls/state-of-the-union/generic-congressional-vote'
gb={'polls':[],'source':GBURL}
try:
  t=pd.read_html(io.StringIO(get(GBURL)));t=t[1] if len(t)>1 else t[0]
  for _,r in t.iterrows():
    p=clean(r['pollster']);d=float(r['Democrats (D)']);rr=float(r['Republicans (R)'])
    gb['polls'].append({'pollster':p,'dates':clean(r['date']),'sample':clean(r['sample']),'D':d,'R':rr,'margin':round(d-rr,1),'top':top_key(p)})
  a=[x for x in gb['polls'] if x['pollster'].startswith('RCP Average')];gb['rcp_average']=a[0]['margin'] if a else None
  gb['polls']=[x for x in gb['polls'] if x['top']]  # only rule-qualifying pollsters are kept
  ind=gb['polls'][:5]
  gb['weighted_average']=round(sum(x['margin'] for x in ind)/len(ind),1) if ind else None
except Exception as e: gaps.append(f'Generic ballot (RealClearPolling) fetch failed: {e}')
GB=gb.get('weighted_average')
WGB=None
try:
  for t in pd.read_html(io.StringIO(wiki('2026_United_States_House_of_Representatives_elections'))):
    t=flat(t)
    if 'Source of poll aggregation' in t.columns and 'Democrats' in t.columns:
      rows=[{'source':clean(r['Source of poll aggregation']),'updated':clean(r['Dates updated']),'D':float(clean(r['Democrats']).rstrip('%')),'R':float(clean(r['Republicans']).rstrip('%'))} for _,r in t.iterrows() if clean(r['Democrats']).rstrip('%').replace('.','',1).isdigit()]
      for x in rows: x['margin']=round(x['D']-x['R'],1)
      rows=[x for x in rows if 'cnn' not in x['source'].lower()];WGB={'rows':rows,'source':wl('2026_United_States_House_of_Representatives_elections#Generic_congressional_ballot_aggregate_polls')};break
except Exception as e: gaps.append(f'Wikipedia generic-ballot aggregate fetch failed: {e}')
gb['aggregates']=WGB
gb['aggregates']=None
if GB is None: gaps.append('No 2026 generic-ballot poll from a rule-qualifying pollster was found; baselines are not adjusted for a national environment.')
ENV={2018:8.6,2020:3.1,2022:-2.8,2024:-2.6};PRES24=-1.5
def shift(ref): return (GB-ref) if GB is not None else 0.0
# 2024 presidential margins
p24={}
for x in pd.read_html(io.StringIO(wiki('2024_United_States_presidential_election'))):
  c=' | '.join(map(str,x.columns))
  if 'Margin' in c and 'State or district' in c and len(x)>50:
    for _,r in x.iterrows():
      st=re.sub(r'\[.*','',clean(r.iloc[0])).replace('†','').strip()
      for col in x.columns:
        if col[0]=='Margin' and col[1]=='%' and st in STATES: p24[STATES[st]]=-float(clean(r[col]).replace('−','-').replace('%',''))
    break
if len(p24)<50: gaps.append(f'2024 presidential margins parsed for {len(p24)} of 50 states')
# early vote
ev={}
def ufcsv(y): return pd.read_csv(io.StringIO(get(f'https://election.lab.ufl.edu/data-downloads/earlyvote/{y}/US.csv')))
try:
  e26=ufcsv(2026);e24=ufcsv(2024).set_index('state_abbv')
  for _,r in e26.iterrows():
    ab=r['state_abbv'];vd,vr,va=r['voted_dem'],r['voted_rep'],r['voted_all']
    o={'voted_all':int(va),'last_update':r['last_update'],'source':str(r['data_source']),'turnout_2022':int(r['turn_2022']) if r['turn_2022']==r['turn_2022'] else None}
    if va>0 and (vd+vr)>0:
      o.update(dem=int(vd),rep=int(vr),none=int(r['voted_none']),share_gap=round(100*(vd-vr)/va,1))
      if ab in e24.index and e24.loc[ab,'voted_all']>0 and (e24.loc[ab,'voted_dem']+e24.loc[ab,'voted_rep'])>0:
        g=100*(e24.loc[ab,'voted_dem']-e24.loc[ab,'voted_rep'])/e24.loc[ab,'voted_all'];o['share_gap_2024_final']=round(g,1);o['shift_vs_2024_final']=round(o['share_gap']-g,1)
    ev[ab]=o
except Exception as e: gaps.append(f'UF Election Lab early vote fetch failed: {e}')
def race_polls(page):
  try: ts=pd.read_html(io.StringIO(wiki(page)))
  except Exception: return None
  agg=None;polls=[];dn=rn=None
  for t in ts:
    t=flat(t);cols=list(t.columns)
    dc=[c for c in cols if re.search(r'\(D\)',c)];rc=[c for c in cols if re.search(r'\(R\)',c)]
    if not dc or not rc: continue
    dc,rc=dc[0],rc[0]
    if agg is None and any('aggregation' in c for c in cols):
      rows=[]
      for _,r in t.iterrows():
        try: d=float(clean(r[dc]).rstrip('%'));rr=float(clean(r[rc]).rstrip('%'))
        except: continue
        rows.append({'source':clean(r[cols[0]]),'updated':clean(r[cols[2]]) if len(cols)>2 else '','D':d,'R':rr,'margin':round(d-rr,1)})
      rows=[x for x in rows if 'cnn' not in x['source'].lower()]
      if rows:
        av=[x for x in rows if x['source']=='Average'];agg={'rows':rows,'margin':av[0]['margin'] if av else round(sum(x['margin'] for x in rows)/len(rows),1)}
        dn,rn=re.sub(r'\s*\(D\).*','',dc),re.sub(r'\s*\(R\).*','',rc)
      continue
    if agg is not None and 'Poll source' in cols and re.sub(r'\s*\(D\).*','',dc)==dn and re.sub(r'\s*\(R\).*','',rc)==rn:
      sc=[c for c in cols if c.startswith('Sample')]
      for _,r in t.iterrows():
        try: d=float(clean(r[dc]).rstrip('%'));rr=float(clean(r[rc]).rstrip('%'))
        except: continue
        polls.append({'pollster':clean(r['Poll source']),'dates':clean(r.get('Date(s) administered','')),'sample':clean(r[sc[0]]) if sc else '','D':d,'R':rr,'margin':round(d-rr,1),'top':top_key(r['Poll source'])})
      break
  if agg is None: return None
  agg=None  # aggregator averages include non-qualifying pollsters; not used
  return {'aggregate':agg,'polls':[p for p in polls if p['top'] and '2026' in p['dates']],'all_polls_in_table':len(polls),'D':dn,'R':rn}
def poll_avg(pr):
  if not pr: return None
  ps=pr['polls'][:4]
  if not ps: return None
  w=[0.85**i for i in range(len(ps))]
  return round(sum(p['margin']*wi for p,wi in zip(ps,w))/sum(w),1)
def phi(x): return 0.5*(1+math.erf(x/math.sqrt(2)))
def model(r,kind):
  inp={};parts=[]
  rv=[r['ratings'].get(k) for k in ('Cook','Inside Elections','Sabato') if r['ratings'].get(k) is not None]
  if rv: inp['rating']=round(sum(rv)/len(rv),1);parts.append(('rating',inp['rating'],0.35))
  if r.get('poll_avg') is not None: inp['polls']=r['poll_avg'];parts.append(('polls',r['poll_avg'],0.35))
  b=[]
  if kind=='house':
    if r.get('pvi') is not None: b.append(2*r['pvi']+(GB or 0.0))
    if r.get('last_margin') is not None: b.append(r['last_margin']+shift(ENV[2024]))
  else:
    if r['state'] in p24: b.append(p24[r['state']]+shift(PRES24))
    if r.get('last_margin') is not None and r.get('last_year') in ENV: b.append(r['last_margin']+shift(ENV[r['last_year']]))
  if b: inp['baseline']=round(sum(b)/len(b),1);parts.append(('baseline',inp['baseline'],0.25))
  e=ev.get(r['state'],{})
  if kind!='house' and 'shift_vs_2024_final' in e and e.get('turnout_2022') and e['voted_all']>=0.05*e['turnout_2022'] and 'baseline' in inp:
    adj=max(-3,min(3,0.25*e['shift_vs_2024_final']));inp['early_vote']=round(inp['baseline']+adj,1);inp['early_vote_adj']=round(adj,1);parts.append(('early_vote',inp['early_vote'],0.05))
  if not parts: return None
  tw=sum(p[2] for p in parts);m=sum(p[1]*p[2] for p in parts)/tw
  sd=(7.5 if kind=='house' else 6.5) if 'polls' in inp else 8.0
  vals=[p[1] for p in parts];spread=max(vals)-min(vals);pdm=phi(m/sd);prob=max(pdm,1-pdm)
  conf='High' if prob>=0.9 and spread<15 and len(parts)>1 else 'Medium' if prob>=0.7 else 'Low'
  return {'margin':round(m,1),'p_dem':round(pdm,3),'favored':'D' if m>0 else 'R' if m<0 else '-','confidence':conf,'sd':sd,'inputs':inp,'weights':{p[0]:round(p[2]/tw,2) for p in parts}}
RCOL={'Cook':'Cook','IE':'Inside Elections','Sabato':'Sabato'}
def ratings_row(r,cols):
  o={}
  for c in cols:
    for k,v in RCOL.items():
      if c.startswith(k+' '): o[v]=rating_val(r[c]);o[v+'_label']=clean(r[c])
  return o
def rating_dates(cols): return {RCOL[k]:re.sub(r'^\S+\s*','',c) for c in cols for k in RCOL if c.startswith(k+' ')}
races=[]
sh=wiki('2026_United_States_Senate_elections');ss=pd.read_html(io.StringIO(sh))
rt=[flat(t) for t in ss if 'Cook' in ' '.join(map(str,t.columns)) and 'Senator' in ' '.join(map(str,t.columns))][0]
cand={}
for t in ss:
  t2=flat(t.copy())
  if 'Candidates' in t2.columns and 'State' in t2.columns:
    for _,r in t2.iterrows(): cand[clean(r['State'])]=clean(r['Candidates'])
SEN_RD=rating_dates(rt.columns)
for _,r in rt.iterrows():
  st=clean(r['State']);base=re.sub(r'\s*\(.*\)','',st)
  if base not in STATES: continue
  lm,lp=margin_from_last(r[[c for c in rt.columns if c.startswith('Last election')][0]])
  special='special' in st.lower() or 'class 3' in st.lower()
  page=f"2026_United_States_Senate_{'special_' if special else ''}election_in_{base.replace(' ','_')}"
  races.append({'id':f"SEN-{STATES[base]}{'-S' if special else ''}",'kind':'senate','state':STATES[base],'state_name':base,'name':f"{base} Senate{' (special)' if special else ''}",'incumbent':clean(r['Senator']),'inc_party':lp,'pvi':pvi_val(r[[c for c in rt.columns if c.startswith('PVI')][0]]),'last_margin':lm,'last_year':2022 if special else 2020,'ratings':ratings_row(r,rt.columns),'candidates':cand.get(st,cand.get(base,'')),'page':page,'list_page':'2026_United_States_Senate_elections'})
gs=pd.read_html(io.StringIO(wiki('2026_United_States_gubernatorial_elections')))
gt=[flat(t) for t in gs if 'Cook' in ' '.join(map(str,t.columns)) and 'Governor' in ' '.join(map(str,t.columns))][0]
gc={}
for t in gs:
  t2=flat(t.copy())
  if 'Candidates' in t2.columns and 'State' in t2.columns:
    for _,r in t2.iterrows(): gc[clean(r['State'])]=clean(r['Candidates'])
GOV_RD=rating_dates(gt.columns)
for _,r in gt.iterrows():
  st=clean(r['State'])
  if st not in STATES: continue
  lm,lp=margin_from_last(r[[c for c in gt.columns if c.startswith('Last election')][0]])
  races.append({'id':f"GOV-{STATES[st]}",'kind':'governor','state':STATES[st],'state_name':st,'name':f"{st} Governor",'incumbent':clean(r['Governor']),'inc_party':lp,'pvi':pvi_val(r[[c for c in gt.columns if c.startswith('PVI')][0]]),'last_margin':lm,'last_year':2024 if st in('New Hampshire','Vermont') else 2022,'ratings':ratings_row(r,gt.columns),'candidates':gc.get(st,''),'page':f"2026_{st.replace(' ','_')}_gubernatorial_election",'list_page':'2026_United_States_gubernatorial_elections'})
hr=[flat(t) for t in pd.read_html(io.StringIO(wiki('2026_United_States_House_of_Representatives_election_ratings'))) if 'Cook' in ' '.join(map(str,t.columns))][0]
HOUSE_RD=rating_dates(hr.columns);hrat={}
for _,r in hr.iterrows():
  lm,_=margin_from_last(r[[c for c in hr.columns if c.startswith('Last result')][0]])
  hrat[clean(r['District'])]={'ratings':ratings_row(r,hr.columns),'last_margin':lm}
hs=BeautifulSoup(wiki('2026_United_States_House_of_Representatives_elections'),'lxml');seen={}
for sec in hs.find_all('section'):
  h=sec.find('h2',recursive=False)
  if not h or clean(h.get_text()) not in STATES: continue
  st=clean(h.get_text())
  tb=[t for t in sec.find_all('table') if 'Location' in t.get_text()[:800] and 'PVI' in t.get_text()[:800]]
  if not tb: continue
  t=flat(pd.read_html(io.StringIO(str(tb[0])))[0]);pc=[c for c in t.columns if 'PVI' in c][0];cc=[c for c in t.columns if c.startswith('Candidates')]
  for _,r in t.iterrows():
    loc=clean(r['Location'])
    if loc in seen or not loc.startswith(st): continue
    num=loc[len(st):].strip();dn='AL' if 'large' in num else num.zfill(2)
    party=clean(r['Party']);ip='D' if party.startswith('Dem') else 'R' if party.startswith('Rep') else (party[:1] or None)
    x=hrat.get(loc)
    if x: rat=x['ratings'];lm=x['last_margin']
    else:
      v=20 if ip=='D' else -20 if ip=='R' else None;rat={}
      if v is not None:
        for k in RCOL.values(): rat[k]=v;rat[k+'_label']=('Safe D' if v>0 else 'Safe R')+' (not on rated-competitive list)'
      lm=None
    seen[loc]=1
    races.append({'id':f"H-{STATES[st]}-{dn}",'kind':'house','state':STATES[st],'state_name':st,'name':loc.replace('at-large','At-Large'),'district':dn,'incumbent':clean(r['Member']),'inc_party':ip,'status':clean(r['Status']),'pvi':pvi_val(r[pc]),'last_margin':lm,'last_year':2024,'ratings':rat,'candidates':clean(r[cc[0]]).replace('▌',' · ').strip(' ·') if cc else '','page':None,'list_page':'2026_United_States_House_of_Representatives_elections','rating_page':'2026_United_States_House_of_Representatives_election_ratings' if x else None})
nh=sum(1 for r in races if r['kind']=='house')
if nh!=435: gaps.append(f'House district parse found {nh} districts (expected 435)')
todo=[r for r in races if r['kind']!='house']
with cf.ThreadPoolExecutor(2) as ex:
  for r,pr in zip(todo,ex.map(lambda r:race_polls(r['page']),todo)):
    r['poll_data']=pr;r['poll_avg']=poll_avg(pr)
    if pr: r['nominees']={'D':pr['D'],'R':pr['R']}
for r in races: r['model']=model(r,r['kind'])
def sim(kind,hold_d,need,n=20000):
  rs=[r for r in races if r['kind']==kind and r['model']];random.seed(42);wins=0;tot=[]
  for _ in range(n):
    nat=random.gauss(0,3.0);d=hold_d
    for r in rs:
      if r['model']['margin']+nat+random.gauss(0,math.sqrt(r['model']['sd']**2-9))>0: d+=1
    tot.append(d);wins+=d>=need
  tot.sort();return {'p_dem_control':round(wins/n,3),'p_rep_control':round(1-wins/n,3),'median_dem_seats':tot[n//2],'p10':tot[n//10],'p90':tot[9*n//10],'need_for_dem_control':need,'races_modeled':len(rs),'sims':n}
sen=[r for r in races if r['kind']=='senate'];up_dem_caucus=sum(1 for r in sen if r['inc_party'] in('D','I'))
senate=sim('senate',47-up_dem_caucus,51);senate.update(seats_up=len(sen),holdover_dem_caucus=47-up_dem_caucus,holdover_rep=53-(len(sen)-up_dem_caucus),total=100,median_rep_seats=100-senate['median_dem_seats'])
house=sim('house',0,218);house.update(total=435,median_rep_seats=435-house['median_dem_seats'])
data={'generated_utc':now.isoformat(),'election_day':'2026-11-03','generic_ballot':gb,'generic_ballot_used':GB,'env':ENV,'pres24':p24,'early_vote':ev,
 'rating_dates':{'senate':SEN_RD,'governor':GOV_RD,'house':HOUSE_RD},'pollster_accuracy':acc,'top_pollsters':[r['name'] for r in TOP],'senate':senate,'house':house,'races':races,'gaps':gaps}
json.dump(data,open(os.path.join(OUT,'data.json'),'w'),separators=(',',':'),default=lambda o:None)
print('races',len(races),{k:sum(1 for r in races if r['kind']==k) for k in ('senate','governor','house')},'with polls',sum(1 for r in races if r.get('poll_avg') is not None))
print('senate',senate);print('house',house);print('GB',GB,'gaps',gaps)
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)));import summary;summary.run()  # overall prediction (same data, recomputed every refresh)
