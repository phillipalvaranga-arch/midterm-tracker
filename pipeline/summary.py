"""Overall prediction summary for Midterm Tracker 2026. Reads data/data.json, adds data['summary'], writes it back.
Uses only what the pipeline already gathered: each race's model (ratings, qualifying-pollster polls, past results, early vote)
and the chamber simulations. Identical rules for both parties. No numbers are invented: a race without model inputs is
counted as 'no data', and a race whose leader is under the toss-up threshold is counted as 'too close'."""
import json,os,re,io,urllib.request,time
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','data')
TOSS=0.55   # same threshold the app already uses to label a race "(toss-up)"
W='https://en.wikipedia.org/wiki/'
def bucket(rs):
  o={'D':0,'R':0,'close':0,'nodata':0,'close_races':[],'nodata_races':[]}
  for r in rs:
    m=r.get('model')
    if not m: o['nodata']+=1;o['nodata_races'].append(r['name']);continue
    p=max(m['p_dem'],1-m['p_dem'])
    if p<TOSS: o['close']+=1;o['close_races'].append(r['name'])
    else: o['D' if m['p_dem']>0.5 else 'R']+=1
  return o
def conf(p):
  return 'High' if p>=0.9 else 'Medium' if p>=0.7 else 'Low' if p>=TOSS else 'Toss-up'
def control(sim):
  pd,pr=sim['p_dem_control'],sim['p_rep_control'];w='D' if pd>pr else 'R' if pr>pd else None;pw=max(pd,pr)
  return {'likely':w if pw>=TOSS else None,'leader':w,'probability':pw,'confidence':conf(pw),'p_dem':pd,'p_rep':pr,
          'median_dem':sim['median_dem_seats'],'median_rep':sim['total']-sim['median_dem_seats'],
          'range80_dem':[sim['p10'],sim['p90']],'range80_rep':[sim['total']-sim['p90'],sim['total']-sim['p10']],'sims':sim['sims']}
def gov_holdovers(up_states,gaps):
  try:
    import pandas as pd
    h={'User-Agent':'MidtermTracker/1.0 (https://github.com/phillipalvaranga-arch/midterm-tracker; personal non-commercial dashboard) python-urllib'}
    html=urllib.request.urlopen(urllib.request.Request('https://en.wikipedia.org/api/rest_v1/page/html/List_of_current_United_States_governors',headers=h),timeout=40).read().decode()
    for t in pd.read_html(io.StringIO(html)):
      cols=[str(c) for c in t.columns]
      if not cols or not cols[0].startswith('State') or len(t)!=50: continue
      pc=[c for c in t.columns if str(c).startswith('Party')]
      o={'D':0,'R':0,'other':0,'states':{}}
      for _,r in t.iterrows():
        st=re.sub(r'\s*\(list\).*|\[.*','',str(r.iloc[0])).strip()
        if st in up_states: continue
        party=' '.join(str(r[c]) for c in pc if str(r[c])!='nan')
        k='D' if 'Democratic' in party else 'R' if 'Republican' in party else 'other'
        o[k]+=1;o['states'][st]=k
      if o['D']+o['R']+o['other']==50-len(up_states): return o
      gaps.append(f"Governors not up in 2026: parsed {o['D']+o['R']+o['other']} of {50-len(up_states)}; total-governorship count not shown.");return None
  except Exception as e: gaps.append(f'Current-governors list fetch failed: {e}; total-governorship count not shown.')
  return None
def build(d):
  gaps=[]
  rs=lambda k:[r for r in d['races'] if r['kind']==k]
  s=d['senate'];sb=bucket(rs('senate'))
  sen={'need':51,'total':100,'seats_up':s['seats_up'],'holdover_D':s['holdover_dem_caucus'],'holdover_R':s['holdover_rep'],'races':sb,
       'projected_D':s['holdover_dem_caucus']+sb['D'],'projected_R':s['holdover_rep']+sb['R'],'control':control(s),
       'tiebreak':'The Vice President (JD Vance, Republican) casts tie-breaking votes, so Republicans control a 50–50 Senate; Democrats need 51.'}
  h=d['house'];hb=bucket(rs('house'))
  hou={'need':218,'total':435,'races':hb,'projected_D':hb['D'],'projected_R':hb['R'],'control':control(h)}
  g=rs('governor');gb=bucket(g)
  gov={'races_total':len(g),'races':gb}
  ho=gov_holdovers({r['state_name'] for r in g},gaps)
  if ho: gov.update(holdover=ho,projected_D_total=ho['D']+gb['D'],projected_R_total=ho['R']+gb['R'])
  return {'generated_utc':d['generated_utc'],'toss_threshold':TOSS,'senate':sen,'house':hou,'governor':gov,
    'nodata_total':sb['nodata']+hb['nodata']+gb['nodata'],'close_total':sb['close']+hb['close']+gb['close'],'gaps':gaps,
    'sources':[['Race ratings, candidates, Senate seats not up (Wikipedia, citing Cook, Inside Elections, Sabato)',W+'2026_United_States_elections'],
               ['Senate seats not up',W+'2026_United_States_Senate_elections'],['House races',W+'2026_United_States_House_of_Representatives_elections'],
               ['Governor races',W+'2026_United_States_gubernatorial_elections'],['Current governors (seats not up)',W+'List_of_current_United_States_governors'],
               ['Early vote: UF Election Lab','https://election.lab.ufl.edu/2026-general-election-early-vote/'],
               ['Polls: only pollsters meeting the accuracy rule ('+', '.join(d.get('top_pollsters') or ['none'])+')','#/pollsters']]}
def run():
  p=os.path.join(OUT,'data.json');d=json.load(open(p))
  d['summary']=build(d)
  json.dump(d,open(p,'w'),separators=(',',':'),default=lambda o:None)
  x=d['summary'];print('summary senate D',x['senate']['projected_D'],'R',x['senate']['projected_R'],'close',x['senate']['races']['close'],'nodata',x['senate']['races']['nodata'],
    '| house D',x['house']['projected_D'],'R',x['house']['projected_R'],'close',x['house']['races']['close'],'nodata',x['house']['races']['nodata'],
    '| gov',x['governor']['races'],x['governor'].get('projected_D_total'),x['governor'].get('projected_R_total'),x['gaps'])
if __name__=='__main__': run()
