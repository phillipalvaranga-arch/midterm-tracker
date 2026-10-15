"""Rank pollsters by final national poll error (D-R margin) in 2016, 2020, 2024.
Source: Wikipedia 'Nationwide opinion polling for the YYYY United States presidential election' (final polls),
actual margins from official certified popular vote (FEC / Wikipedia results): 2016 Clinton +2.1, 2020 Biden +4.5, 2024 Trump +1.5."""
import pandas as pd,re,json,io,urllib.request,sys
ACT={2016:2.1,2020:4.5,2024:-1.5}
CFG={2016:(2,'Hillary Clinton Democratic','Donald Trump Republican'),2020:(4,'Joe Biden Democratic','Donald Trump Republican'),2024:(3,'Kamala Harris Democratic','Donald Trump Republican')}
BRANDS=[('ibd/tipp',r'tipp|\bibd\b'),('ipsos',r'ipsos'),('yougov',r'yougov'),('morning consult',r'morning consult'),('rasmussen',r'rasmussen reports'),('emerson',r'emerson'),('monmouth',r'monmouth'),('quinnipiac',r'quinnipiac'),('marist',r'marist'),('siena',r'siena'),('atlasintel',r'atlas'),('trafalgar',r'trafalgar'),('insideradvantage',r'insideradvantage'),('zogby',r'zogby'),('harrisx',r'harrisx'),('harris',r'harris'),('surveyusa',r'surveyusa'),('suffolk',r'suffolk'),('echelon',r'echelon'),('redfield',r'redfield'),('gravis',r'gravis'),('usc',r'\busc\b'),('fox news',r'fox news'),('abc/wapo',r'abc news|washington post'),('nbc/wsj',r'nbc|wall street'),('cbs news',r'cbs'),('pew',r'pew'),('surveymonkey',r'surveymonkey'),('rmg',r'\brmg\b'),('cnn',r'cnn'),('big village',r'big village'),('cygnal',r'cygnal'),('activote',r'activote')]
def norm(s):
  t=re.sub(r'\[.*?\]','',str(s)).lower()
  for k,p in BRANDS:
    if re.search(p,t): return k
  return None
def _old(s):
  s=re.sub(r'\[.*?\]','',str(s));s=re.sub(r'\(.*?\)','',s);s=s.replace('–','-').strip()
  s=re.split(r'/| for | & ',s)[0].strip();s=re.sub(r'\b(Poll|Polling|University|College|Research|Group|Inc\.?|Analytics|Insights|Strategies)\b','',s,flags=re.I)
  return re.sub(r'\s+',' ',s).strip().lower()
def pct(x):
  m=re.search(r'(\d+(\.\d+)?)',str(x));return float(m.group(1)) if m else None
def end_date(d,y):
  d=re.sub(r'\[.*?\]','',str(d));m=re.findall(r'([A-Z][a-z]{2,8})\.?\s*(\d{1,2})?\s*[–-]?\s*(\d{1,2})?',d)
  if not m: return None
  yy=re.findall(r'(20\d\d)',d)
  if yy: y=int(yy[-1])
  mon,a,b=m[-1];day=b or a or '1'
  try: return pd.to_datetime(f'{mon[:3]} {day} {y}',format='%b %d %Y')
  except Exception: return None
out={}
for y,(ti,dc,rc) in CFG.items():
  html=open(f'/tmp/nat{y}.html').read();T=[]
  for t in pd.read_html(io.StringIO(html)):
    t.columns=[c[-1] if isinstance(c,tuple) else str(c) for c in t.columns]
    if dc in t.columns and rc in t.columns and 'Poll source' in t.columns and 'Date' in t.columns: T.append(t)
  t=pd.concat(T)
  cut=pd.Timestamp(f'{y}-10-20');elec=pd.Timestamp({2016:'2016-11-08',2020:'2020-11-03',2024:'2024-11-05'}[y])
  for _,r in t.iterrows():
    e=end_date(r['Date'],y);d,rr=pct(r[dc]),pct(r[rc])
    if e is None or d is None or rr is None or not(cut<=e<=elec): continue
    k=norm(r['Poll source'])
    if not k or k=='cnn': continue  # CNN excluded per user instruction
    if k not in out: out[k]={'name':re.sub(r'\[.*?\]','',str(r['Poll source'])).strip()}
    if y not in out[k] or e>out[k][y]['end']: out[k][y]={'end':e,'margin':round(d-rr,1),'error':round(abs(d-rr-ACT[y]),1),'raw':f"{d:g}-{rr:g}"}
rows=[]
for k,v in out.items():
  if all(y in v for y in ACT):
    rows.append({'key':k,'name':v['name'],'years':{y:{'final_poll_end':str(v[y]['end'].date()),'poll_D_minus_R':v[y]['margin'],'actual_D_minus_R':ACT[y],'abs_error':v[y]['error']} for y in ACT},'mean_abs_error':round(sum(v[y]['error'] for y in ACT)/3,2)})
for r in rows:
  r['within_2_all_years']=all(r['years'][y]['abs_error']<=2.0 for y in ACT)
  r['right_winner_all_years']=all((r['years'][y]['poll_D_minus_R']>0)==(ACT[y]>0) and r['years'][y]['poll_D_minus_R']!=0 for y in ACT)
  r['qualifies']=r['within_2_all_years'] and r['right_winner_all_years']
rows.sort(key=lambda r:r['mean_abs_error'])
json.dump({'method':'Final head-to-head national poll per pollster ending Oct 20 - Election Day each year; absolute error of D-R margin vs certified popular-vote margin; pollsters must appear in all three years; ranked by mean absolute error.','actual':ACT,'ranking':rows,'rule':'Included only if the final national poll was within 2.0 points of the certified popular-vote margin in each of 2016, 2020 and 2024 AND showed the popular-vote winner ahead in each year.','sources':{y:f'https://en.wikipedia.org/wiki/Nationwide_opinion_polling_for_the_{y}_United_States_presidential_election' for y in ACT},'actual_sources':{2016:'https://www.fec.gov/resources/cms-content/documents/federalelections2016.pdf',2020:'https://www.fec.gov/resources/cms-content/documents/federalelections2020.pdf',2024:'https://en.wikipedia.org/wiki/2024_United_States_presidential_election'}},open('../data/pollster_accuracy.json','w'),indent=1)
for r in rows[:12]: print(r['mean_abs_error'],r['name'],[r['years'][y]['abs_error'] for y in ACT],r['qualifies'])
print(len(rows),'pollsters in all 3 years')
