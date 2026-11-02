"""Hourly refresh of data/ev_age.json UF Election Lab part (Census CPS part is static)."""
import csv,io,json,urllib.request
def get(y):
    t=urllib.request.urlopen(f'https://election.lab.ufl.edu/data-downloads/earlyvote/{y}/US.csv',timeout=60).read().decode()
    return {r['state_abbv']:r for r in csv.DictReader(io.StringIO(t))}
f=lambda r,k: float(r.get(k) or 0)
D={2026:get(2026),2024:get(2024)}
ag=lambda R,ss:[sum(f(R[s],f'voted_age_{i}') for s in ss) for i in range(1,5)]
has=lambda R:[s for s in R if sum(f(R[s],f'voted_age_{i}') for i in range(1,5))>0]
def sh(a):t=sum(a) or 1;return [round(100*x/t,1) for x in a],int(sum(a))
s26,s24=has(D[2026]),has(D[2024]);com=sorted(set(s26)&set(s24))
u={'all26':dict(zip(['pct','n'],sh(ag(D[2026],s26))),states=s26),'all24':dict(zip(['pct','n'],sh(ag(D[2024],s24))),states=s24),'com':com,'com26':sh(ag(D[2026],com)),'com24':sh(ag(D[2024],com))}
u['us26']=int(sum(f(r,'voted_all') for r in D[2026].values()));u['us24']=int(sum(f(r,'voted_all') for r in D[2024].values()))
T=D[2026]['TX'];u.update(tx26=int(f(T,'voted_all')),tx26_date=T['last_update'],tx24=int(f(D[2024]['TX'],'voted_all')),tx22=int(f(T,'turn_2022')))
u['dates26']=sorted({D[2026][s]['last_update'] for s in s26});u['nstates26']=sum(1 for r in D[2026].values() if f(r,'voted_all')>0)
u['us_turn22']=int(sum(f(r,'turn_2022') for r in D[2026].values()))
j=json.load(open('data/ev_age.json'));j['uf']=u
import datetime;j['asof']=datetime.datetime.now(datetime.timezone.utc).isoformat()
json.dump(j,open('data/ev_age.json','w'))
print('ok',u['us26'],u['tx26'])
